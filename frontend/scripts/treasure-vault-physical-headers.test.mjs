import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { ItemSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readHistoricalContentRows } from './operation-test-harness.mjs';
import { content as emptyContent, inventoryItem, summoner } from './fixtures/eidolon.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261002040000_treasure_vault_physical_headers.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-physical-headers.sql', import.meta.url),
  'utf8'
);
const patches = JSON.parse(migration.split('$patches$')[1]);
const predecessor = JSON.parse(
  (
    await readFile(
      new URL('../../supabase/migrations/20261001130000_treasure_vault_condition_references.sql', import.meta.url),
      'utf8'
    )
  ).split('$patches$')[1]
);
const dependencies = JSON.parse(migration.split('$dependencies$')[1]);
const ignored = new Set(['search_tsv', 'updated_at', 'description', 'craft_requirements', 'bulk', 'usage', 'traits']);
const md5 = (text) => (text === null ? null : createHash('md5').update(text).digest('hex'));
const projection = (row) =>
  Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => !ignored.has(key))
      .map(([key, value]) => [
        key,
        key === 'uuid'
          ? Number(value)
          : key === 'created_at'
            ? value.replace(' ', 'T').replace(/\+00$/, '+00:00')
            : value,
      ])
  );
const tuple = (row) => ({ bulk: row.bulk, usage: row.usage, traits: row.traits });
const equal = (a, b) => {
  try {
    assert.deepEqual(a, b);
    return true;
  } catch {
    return false;
  }
};

/** Mirror exact catalog guards; SQL atomicity is verified independently in native PostgreSQL. */
function repair(row, patch) {
  assert.deepEqual(projection(row), patch.anchor);
  assert.equal(md5(row.description), patch.description_md5);
  assert.equal(md5(row.craft_requirements), patch.craft_requirements_md5);
  const isSuccessor = patch.successor_after !== undefined && equal(tuple(row), patch.successor_after);
  assert.ok(equal(tuple(row), patch.before) || equal(tuple(row), patch.after) || isSuccessor);
  return isSuccessor ? structuredClone(row) : { ...structuredClone(row), ...structuredClone(patch.after) };
}

let originals, proposed, rows, engine;
before(async () => {
  rows = await readHistoricalContentRows([
    ...patches.map(({ id }) => ({ table: 'item', id })),
    { table: 'trait', sourceIds: [3, 16] },
    { table: 'content_source', id: 16 },
  ]);
  originals = patches.map((patch) => {
    const row = structuredClone(rows.find((x) => x.table === 'item' && x.row.id === patch.id).row);
    // The checked-in dump can precede the exact reviewed 013 wrapper repair.
    if (md5(row.description) !== patch.description_md5) {
      const previous = predecessor.find((p) => p.id === row.id);
      assert.ok(previous && md5(row.description) === previous.description.before, `${row.id}/known predecessor`);
      for (const replacement of previous.description.replacements) {
        assert.equal(row.description.split(replacement.from).length - 1, replacement.count);
        row.description = row.description.replaceAll(replacement.from, replacement.to);
      }
    }
    row.uuid = Number(row.uuid);
    assert.ok(equal(tuple(row), patch.before) || equal(tuple(row), patch.after), `${row.id}/exact reviewed dump state`);
    // Construct the known before fixture from either complete accepted dump state.
    Object.assign(row, structuredClone(patch.before));
    repair(row, patch);
    return row;
  });
  proposed = originals.map((row, index) => repair(row, patches[index]));
  engine = await createOperationEngine();
});
after(async () => engine?.cleanup());

test('36 complete schemas change only41 reviewed header leaves and retain exact existing citations and mechanics', () => {
  assert.equal(patches.length, 36);
  assert.equal(
    patches.reduce((n, p) => n + Object.keys(p.after).filter((key) => !equal(p.before[key], p.after[key])).length, 0),
    41
  );
  assert.deepEqual(JSON.parse(release.split('$patches$')[1]), patches);
  assert.deepEqual(JSON.parse(release.split('$dependencies$')[1]), dependencies);
  for (const expected of dependencies) {
    const row = rows.find((x) => x.table === 'trait' && x.row.id === expected.id)?.row;
    assert.ok(row);
    for (const [key, value] of Object.entries(expected))
      assert.deepEqual(key === 'uuid' ? Number(row[key]) : row[key], value);
  }
  for (const [index, row] of originals.entries()) {
    const next = proposed[index];
    ItemSchema.parse(row);
    ItemSchema.parse(next);
    assert.deepEqual(repair(next, patches[index]), next);
    assert.deepEqual({ ...next, ...patches[index].before }, row);
    assert.deepEqual(next.meta_data, row.meta_data);
    assert.deepEqual(next.operations, row.operations);
    assert.equal(next.description, row.description);
    assert.equal(next.craft_requirements, row.craft_requirements);
  }
});

test('unknown complete states, hybrid tuples, identities, citations and sibling fields fail closed without mutating inputs', () => {
  for (const baseline of [originals, proposed])
    for (const [index, row] of baseline.entries()) {
      const patch = patches[index];
      for (const change of [
        { id: null },
        { uuid: null },
        { name: 'Changed' },
        { bulk: null },
        { usage: 'Changed' },
        { traits: null },
        { traits: [-1] },
        { operations: [] },
        { description: 'Changed' },
        { price: {} },
        { meta_data: null },
      ]) {
        if (Object.entries(change).every(([key, value]) => equal(row[key], value))) continue;
        const candidate = { ...structuredClone(row), ...change },
          frozen = structuredClone(candidate);
        assert.throws(() => repair(candidate, patch));
        assert.deepEqual(candidate, frozen);
      }
      const extra = structuredClone(row);
      extra.meta_data.unreviewed = true;
      assert.throws(() => repair(extra, patch));
      const changed = Object.keys(patch.after).filter((key) => !equal(patch.before[key], patch.after[key]));
      if (changed.length > 1)
        for (const key of changed) {
          const hybrid = structuredClone(row);
          hybrid[key] = equal(tuple(row), patch.before) ? patch.after[key] : patch.before[key];
          assert.throws(() => repair(hybrid, patch));
        }
    }
});

test('only the complete reviewed Mindlight scalar successor survives replay without reverting its light bulk', () => {
  const successors = patches.filter((patch) => patch.successor_after !== undefined);
  assert.equal(successors.length, 1);
  const patch = successors[0];
  assert.equal(patch.id, 12212);
  assert.equal(patch.successor_migration, '20261002095000_treasure_vault_scalar_mechanics.sql');
  assert.deepEqual(patch.successor_after, {
    bulk: '0.1',
    usage: 'wornheadwear',
    traits: [1526, 1527, 1504, 1517, 1514],
  });
  const original = originals.find((row) => row.id === patch.id);
  const successor = { ...structuredClone(original), ...structuredClone(patch.successor_after) };
  const saved = structuredClone(successor);
  assert.deepEqual(repair(successor, patch), saved);
  assert.deepEqual(successor, saved);
  ItemSchema.parse(successor);
  for (const change of [
    { bulk: '0.2' },
    { traits: original.traits },
    { description: 'Unreviewed prose' },
    { price: { gp: 1 } },
    { usage: 'worn' },
  ])
    assert.throws(() => repair({ ...structuredClone(successor), ...change }, patch));
});

test('actual bulk helpers use the corrected physical mass for single items, stacks, containers and formulas', () => {
  for (const [index, row] of proposed.entries()) {
    for (const quantity of [1, 10, 11]) {
      const copy = { ...structuredClone(row), meta_data: { ...structuredClone(row.meta_data), quantity } };
      const entry = inventoryItem(copy, { is_equipped: true, is_invested: true });
      const raw = Number(copy.bulk) * quantity;
      const expected = raw >= 0.1 && raw < 1 ? 0.1 : Math.floor(raw);
      assert.equal(engine.getItemBulk(entry), expected, `${row.id}/${quantity}`);
      assert.equal(engine.getItemBulk({ ...entry, is_formula: true }), 0);
      const pack = inventoryItem(
        { ...copy, id: -404, name: 'Synthetic pack', bulk: '1', meta_data: { bulk: { capacity: 100 } } },
        { container_contents: [entry] }
      );
      assert.equal(engine.getInvBulk({ items: [pack] }), 1 + expected);
    }
    if (row.bulk !== originals[index].bulk) {
      assert.notEqual(
        engine.getItemBulk(inventoryItem(row)),
        engine.getItemBulk(inventoryItem(originals[index])),
        `${row.id}/red control`
      );
    }
  }
});

const stableStore = (store) => ({
  ...store,
  history: Object.fromEntries(
    Object.entries(store.history).map(([key, values]) => [key, values.map(({ timestamp, ...value }) => value)])
  ),
  bonuses: Object.fromEntries(
    Object.entries(store.bonuses).map(([key, values]) => [key, values.map(({ timestamp, ...value }) => value)])
  ),
});
/** Exercise the actual operation controller for both physical owners, not a reimplemented bonus calculator. */
async function calculate(items, kind, enabled) {
  const content = {
    ...emptyContent,
    items: proposed,
    traits: rows.filter((x) => x.table === 'trait').map((x) => x.row),
    abilityBlocks: [],
    sources: [],
    defaultSources: { PAGE: enabled, INFO: enabled },
  };
  engine.setFixtures(rows.filter((x) => x.table !== 'item').concat(proposed.map((row) => ({ table: 'item', row }))));
  engine.clearOperationErrorNotifications();
  const character = {
    ...summoner(items),
    companions: { list: [] },
    content_sources: { enabled },
    options: { custom_operations: true, ignore_bulk_limit: true },
  };
  let result;
  if (kind === 'character')
    result = await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-SHEET' });
  else {
    const parent = await engine._executeCharacterOperations({
      character: { ...summoner([]), companions: { list: [] } },
      content,
      context: 'CHARACTER-SHEET',
    });
    result = await engine._executeCreatureOperations({
      id: 'COMPANION_0',
      creature: { name: 'Physical-header fixture', level: 1, operations: [], inventory: character.inventory },
      content,
      charStore: parent.store,
    });
  }
  assert.deepEqual(result.errors, []);
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  const comparable = { ...result, store: stableStore(result.store) };
  // Result provenance deliberately contains the repaired catalog header, not changed mechanics.
  if (comparable.ors?.itemResults)
    comparable.ors = {
      ...comparable.ors,
      itemResults: comparable.ors.itemResults.map((entry) => {
        const patch = patches.find((p) => p.id === entry.baseSource?.id);
        if (!patch) return entry;
        return { ...entry, baseSource: { ...entry.baseSource, ...patch.before } };
      }),
    };
  return comparable;
}

test('actual character and companion bonuses, spells and selections are unchanged across flags, sources and saved snapshots', async () => {
  for (const kind of ['character', 'companion'])
    for (const enabled of [[16], [3, 16], [3]])
      for (const flags of [
        {},
        { is_equipped: true, is_invested: true },
        { is_equipped: true, is_invested: true, is_formula: true },
      ]) {
        const oldItems = originals.map((row) => inventoryItem(structuredClone(row), flags));
        const nextItems = proposed.map((row) => inventoryItem(structuredClone(row), flags));
        const frozen = structuredClone(oldItems);
        const previous = await calculate(oldItems, kind, enabled);
        assert.deepEqual(await calculate(nextItems, kind, enabled), previous);
        assert.deepEqual(oldItems, frozen, 'saved snapshots untouched');
        const pack = (items) =>
          inventoryItem(
            {
              ...structuredClone(originals[0]),
              id: -405,
              name: 'Synthetic pack',
              bulk: '0',
              usage: 'worn',
              operations: [],
              traits: [],
              meta_data: { bulk: { capacity: 100 } },
            },
            { container_contents: items }
          );
        const stowedOld = await calculate([pack(oldItems)], kind, enabled);
        assert.deepEqual(await calculate([pack(nextItems)], kind, enabled), stowedOld);
      }
});
