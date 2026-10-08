import { readReviewedHistoricalSql } from './treasure-vault-historical-test-support.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { before, after, test } from 'node:test';
import {
  ItemSchema,
  InventorySchema,
  SpellSchema,
  AbilityBlockSchema,
  TraitSchema,
  ContentSourceSchema,
} from '../src/schemas/content.ts';
import uploadUtils from '../../supabase/functions/_shared/upload-utils.ts';
import { createOperationEngine, readHistoricalContentRows } from './operation-test-harness.mjs';
import { content as emptyContent, inventoryItem, summoner } from './fixtures/eidolon.mjs';

const { uniqueId } = uploadUtils;
const migration = await readReviewedHistoricalSql(
  new URL('../../supabase/migrations/20261001170000_treasure_vault_wand_family_repairs.sql', import.meta.url),
  'utf8'
);
const release = await readReviewedHistoricalSql(
  new URL('../../supabase/release/treasure-vault-wand-family-repairs.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$wandfamilies$')[1]);
const rows = await readHistoricalContentRows([
  ...spec.items.map(({ id }) => ({ table: 'item', id })),
  ...spec.dependencies.map(({ table, id }) => ({ table: table.replace('-', '_'), id })),
  ...spec.sources.map(({ id }) => ({ table: 'content_source', id })),
]);
const get = (table, id) => {
  const row = rows.find((entry) => entry.table === table && entry.row.id === id)?.row;
  assert.ok(row, `${table}:${id} missing`);
  return row;
};
const md5 = (text) => createHash('md5').update(text).digest('hex');
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const equal = (a, b) => {
  try {
    assert.deepEqual(a, b);
    return true;
  } catch {
    return false;
  }
};
/** Accept decimal stable identities without rounding unsafe numeric input. */
function uuidText(value) {
  assert.ok(typeof value === 'string' || (typeof value === 'number' && Number.isSafeInteger(value)));
  assert.match(String(value), /^[1-9]\d*$/);
  return String(value);
}
/** Check only reviewed fields; unrelated metadata remains a preserved sibling. */
function fields(row, expected) {
  assert.ok(row);
  for (const [key, value] of Object.entries(expected))
    assert.deepEqual(key === 'uuid' ? uuidText(row[key]) : row[key], value, `${row.id}/${key}`);
}
function projection(row) {
  return {
    description: row.description,
    craft_requirements: row.craft_requirements,
    traits: row.traits,
    source: row.meta_data.source,
  };
}
/** The description, crafting clause, traits and citation are one complete reviewed state. */
function ownerState(row, patch, terminal = false) {
  fields(row, patch.expected);
  assert.ok(isObject(row.meta_data));
  const current = projection(row);
  if (equal(current, patch.after)) return 'after';
  if (!terminal && equal(current, patch.before)) return 'before';
  assert.fail(`Unreviewed ${patch.id} complete leaf state`);
}
/** Reconstruct both exact states from a future sanitized before or after dump. */
function ownerAt(row, patch, state) {
  ownerState(row, patch);
  const result = structuredClone(row);
  const { source, ...leaves } = patch[state];
  Object.assign(result, structuredClone(leaves));
  result.meta_data.source = structuredClone(source);
  ItemSchema.parse(result);
  assert.equal(ownerState(result, patch), state);
  return result;
}
function dependencyValid(row, dependency) {
  fields(row, dependency.expected);
  assert.ok(isObject(row.meta_data));
  assert.equal(md5(row.description), dependency.description_md5);
  assert.deepEqual(Object.hasOwn(row.meta_data, 'source') ? { source: row.meta_data.source } : {}, dependency.citation);
}
/** Mirror the SQL's exact ref/data-id/UUID and queue-or-payload source-name guard. */
function relevant(update) {
  if (['APPROVED', 'REJECTED'].includes(update.status?.state)) return false;
  const payload = update.data;
  if (update.type === 'content-source')
    return spec.sources.some(
      (source) =>
        update.ref_id === source.id || String(payload?.id) === String(source.id) || payload?.name === source.name
    );
  const identities =
    update.type === 'item'
      ? spec.items.map((p) => ({
          id: p.id,
          name: p.expected.name,
          source: p.expected.content_source_id,
          uuid: p.expected.uuid,
        }))
      : spec.dependencies
          .filter((d) => d.table === update.type)
          .map((d) => ({ id: d.id, name: d.name, source: d.source, uuid: d.expected.uuid }));
  return identities.some(
    (entry) =>
      update.ref_id === entry.id ||
      String(payload?.id) === String(entry.id) ||
      String(payload?.uuid) === entry.uuid ||
      ((update.content_source_id === entry.source || String(payload?.content_source_id) === String(entry.source)) &&
        payload?.name === entry.name)
  );
}
function sourcesValid(sourceRows) {
  assert.equal(sourceRows.length, 4);
  for (const expected of spec.sources)
    fields(
      sourceRows.find((s) => s.id === expected.id),
      expected
    );
}
/** Atomic clone model for guards and preservation; the SQL is rehearsed separately in real PostgreSQL. */
function applyBatch(input, sourceRows = sources, deps = dependencyRows, queue = [], failedCasId) {
  sourcesValid(sourceRows);
  assert.ok(!queue.some(relevant), 'pending or malformed owner/dependency/source submission');
  assert.equal(deps.length, 12);
  for (const dependency of spec.dependencies)
    dependencyValid(
      deps.find((entry) => entry.table === dependency.table && entry.row.id === dependency.id)?.row,
      dependency
    );
  assert.equal(input.length, 13);
  for (const patch of spec.items)
    ownerState(
      input.find((row) => row.id === patch.id),
      patch
    );
  const output = structuredClone(input);
  for (const patch of spec.items) {
    const index = output.findIndex((row) => row.id === patch.id);
    if (ownerState(output[index], patch) === 'after') continue;
    assert.notEqual(patch.id, failedCasId, 'leaf compare-and-set failed');
    output[index] = ownerAt(output[index], patch, 'after');
  }
  return output;
}
function terminal(input, sourceRows = sources, deps = dependencyRows, queue = []) {
  try {
    applyBatch(input, sourceRows, deps, queue);
    spec.items.forEach((patch) =>
      ownerState(
        input.find((row) => row.id === patch.id),
        patch,
        true
      )
    );
    return true;
  } catch {
    return false;
  }
}
const originals = spec.items.map((patch) => ownerAt(get('item', patch.id), patch, 'before'));
const proposed = spec.items.map((patch, index) => ownerAt(originals[index], patch, 'after'));
const sources = spec.sources.map((s) => get('content_source', s.id));
const dependencyRows = spec.dependencies.map((d) => ({ table: d.table, row: get(d.table.replace('-', '_'), d.id) }));
const spells = dependencyRows.filter((d) => d.table === 'spell').map((d) => d.row);
let engine;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true });
  engine.setFixtures(rows);
});
after(async () => engine?.cleanup());

test('exact 13 independent remaster tiers retain IDs, UUIDs, ranks, levels, prices and citation pages; no Noisome or shared-spell edits', () => {
  assert.deepEqual(spec, JSON.parse(release.split('$wandfamilies$')[1]));
  const families = [
    ['rime', [12600, 12601, 12602], [7, 8, 9], [16, 18, 20], [10000, 24000, 70000], 8891, 4808, 2274, '139'],
    [
      'flames',
      [12677, 12678, 12679, 12680, 12681, 12682, 12683, 12684],
      [2, 3, 4, 5, 6, 7, 8, 9],
      [6, 8, 10, 12, 14, 16, 18, 20],
      [250, 500, 1000, 2000, 4500, 10000, 24000, 70000],
      4627,
      4823,
      2289,
      '142',
    ],
    ['chromatic', [12598, 12599], [4, 7], [10, 16], [1000, 10000], 5139, 4807, 2273, '138'],
  ];
  assert.equal(spec.items.length, 13);
  for (const [family, ids, ranks, levels, prices, spell, legacy, remaster, page] of families) {
    const patches = spec.items.filter((p) => p.family === family);
    assert.deepEqual(
      patches.map((p) => p.id),
      ids
    );
    for (const [index, patch] of patches.entries()) {
      assert.equal(patch.rank, ranks[index]);
      assert.equal(patch.spell_id, spell);
      assert.equal(patch.expected.level, levels[index]);
      assert.deepEqual(patch.expected.price, { gp: prices[index] });
      assert.equal(patch.expected.content_source_id, 16);
      assert.equal(patch.expected.uuid, String(uniqueId(patch.expected.name, 'item', levels[index], 16)));
      assert.deepEqual(patch.before.source, {
        url: `https://2e.aonprd.com/Equipment.aspx?ID=${legacy}`,
        book: 'Treasure Vault',
        page,
      });
      assert.deepEqual(patch.after.source, {
        url: `https://2e.aonprd.com/Equipment.aspx?ID=${remaster}`,
        book: 'Treasure Vault (Remastered)',
        page,
      });
    }
  }
  assert.deepEqual(
    spec.sources.map((s) => s.id),
    [3, 13, 16, 842]
  );
  assert.ok(spec.items.every((p) => ![12658, 12659, 12660, 12661].includes(p.id)));
});

test('26 complete public-schema clones change only exact description/craft/citation leaves and two canonical Light arrays', () => {
  for (const [index, patch] of spec.items.entries()) {
    const old = originals[index],
      next = proposed[index];
    ItemSchema.parse(old);
    ItemSchema.parse(next);
    assert.deepEqual(
      {
        ...next,
        description: old.description,
        craft_requirements: old.craft_requirements,
        traits: old.traits,
        meta_data: { ...next.meta_data, source: old.meta_data.source },
      },
      old
    );
    assert.deepEqual(next.operations, old.operations);
    assert.equal(next.operations, null);
    assert.equal(next.bulk, old.bulk);
    assert.equal(next.usage, 'held-in-one-hand');
    for (const leaf of ['description', 'craft_requirements'])
      for (const state of ['before', 'after']) assert.equal(md5(patch[state][leaf]), patch.hashes[leaf][state]);
    assert.deepEqual(ownerAt(next, patch, 'before'), old);
    assert.deepEqual(ownerAt(old, patch, 'after'), next);
    if (patch.family === 'chromatic') {
      assert.deepEqual(old.traits, [1504, 1665]);
      assert.deepEqual(next.traits, [1517, 1504, 1665]);
    } else assert.deepEqual(next.traits, old.traits);
  }
});

test('all 12 actual official dependency schemas, subtype, cast/rank/traditions and captured citation states remain exact', () => {
  for (const source of sources) ContentSourceSchema.parse(source);
  sourcesValid(sources);
  for (const [index, dependency] of spec.dependencies.entries()) {
    const row = dependencyRows[index].row;
    dependencyValid(row, dependency);
    ({ spell: SpellSchema, trait: TraitSchema, 'ability-block': AbilityBlockSchema })[dependency.table].parse(row);
    const source = sources.find((s) => s.id === row.content_source_id);
    assert.equal(source.user_id, null);
    assert.equal(source.is_published, true);
  }
  assert.deepEqual(
    spells.map((s) => [s.id, s.rank, s.cast, s.content_source_id]),
    [
      [4627, 2, 'TWO-ACTIONS', 3],
      [5139, 4, 'TWO-TO-THREE-ACTIONS', 13],
      [8891, 7, 'TWO-ACTIONS', 842],
    ]
  );
  assert.equal(get('ability_block', 19611).type, 'action');
  assert.equal(get('ability_block', 19858).name, 'Sustain');
  assert.equal(get('trait', 1584).name, 'Water');
  assert.deepEqual(
    get('spell', 8891).meta_data,
    {},
    'missing shared Frigid Flurry citation is preserved, not certified or invented'
  );
  assert.match(
    get('spell', 4627).description,
    /link_action_20948/,
    'separate stale shared Sustain anchors are not written by this item batch'
  );
});

test('actual helper/parser resolves every tier rank and all repeated spell/action/trait/self references without widening spells', () => {
  for (const [index, row] of proposed.entries()) {
    const patch = spec.items[index],
      spell = get('spell', patch.spell_id);
    const linked = engine.convertToHardcodedLink('spell', spell.name, spell.name.toLowerCase());
    assert.ok(row.description.includes(`*${linked}*`));
    assert.ok(row.craft_requirements.includes(`*${linked}*`));
    assert.ok(row.description.includes(engine.convertToHardcodedLink('action', 'Cast a Spell')));
    assert.deepEqual(engine.detectSpells(originals[index].description, spells, true), []);
    const found = engine.detectSpells(row.description, spells, true);
    assert.equal(found[0].spell.id, patch.spell_id);
    assert.equal(found[0].rank, patch.rank);
    assert.equal(found[0].spell.rank, patch.rank);
    assert.equal(found.length, patch.family === 'chromatic' ? 3 : 1);
    assert.equal(engine.detectSpells(row.craft_requirements, spells, true)[0].spell.id, patch.spell_id);
    if (patch.family === 'flames') {
      assert.ok(row.description.includes(engine.convertToHardcodedLink('action', 'Sustain')));
      assert.ok(row.description.includes(engine.convertToHardcodedLink('trait', 'fire')));
    }
    if (patch.family === 'chromatic') {
      assert.ok(row.description.includes(engine.convertToHardcodedLink('item', row.name, 'wand of chromatic burst')));
      for (const name of ['concentrate', 'light', 'magical'])
        assert.ok(row.description.includes(engine.convertToHardcodedLink('trait', name)));
    }
    for (const match of row.description.matchAll(/link_(spell|action|trait|item)_(\d+)/g)) {
      const [, type, id] = match;
      const target = get(type === 'action' ? 'ability_block' : type, Number(id));
      assert.match(engine.convertToHardcodedLink(type, target.name), new RegExp(`link_${type}_${id}\\)`));
    }
  }
});

test('26 real RichText renders retain canonical restrictions, frequency, persistent dice and one-action requirements', () => {
  for (const [index, row] of proposed.entries()) {
    const patch = spec.items[index];
    for (const field of ['description', 'craft_requirements']) {
      const html = engine.renderRichText(row[field]);
      assert.doesNotMatch(html, /\[\[|@UUID|\/r |persistent,cold|link_condition_/);
      assert.match(html, /<em><a\b[^>]*>/);
      if (field === 'craft_requirements') {
        assert.match(html, /appropriate rank/);
        continue;
      }
      assert.match(html, /<a\b[^>]*>Cast a Spell<\/a>/);
      assert.match(html, /once per day, plus overcharge/);
      if (patch.family === 'rime') {
        assert.match(html, /<a\b[^>]*>persistent cold damage<\/a>/);
        assert.ok(html.includes(`${patch.rank - 6}d6`));
        assert.doesNotMatch(row.description, /link_condition_|link_trait_1519/);
      }
      if (patch.family === 'flames') {
        assert.match(html, /If you create the flame on the ground/);
        assert.match(html, /provided it(?:'|&#x27;)s on the ground\./);
        assert.match(html, /<a\b[^>]*>Sustain<\/a>/);
        assert.ok(html.includes(`${patch.rank - 1} `));
      }
      if (patch.family === 'chromatic') {
        assert.match(html, /<abbr class="action-symbol">1<\/abbr>/);
        assert.match(html, /Requirements/);
        assert.match(html, /created by the/);
        assert.ok(html.includes(patch.rank === 4 ? '4d6' : '8d6'));
        assert.doesNotMatch(html, /evocation/);
      }
    }
  }
});

test('complete per-owner pairs reject every mixed leaf state; mixed batches apply, replay and reconstruct after-dump fixtures', () => {
  for (const [index, patch] of spec.items.entries())
    for (let mask = 0; mask < 16; mask++) {
      const candidate = structuredClone(originals[index]);
      for (const [bit, leaf] of ['description', 'craft_requirements', 'traits', 'source'].entries()) {
        const state = mask & (1 << bit) ? patch.after : patch.before;
        if (leaf === 'source') candidate.meta_data.source = structuredClone(state.source);
        else candidate[leaf] = structuredClone(state[leaf]);
      }
      const reviewed = equal(projection(candidate), patch.before) || equal(projection(candidate), patch.after);
      if (reviewed) ownerState(candidate, patch);
      else assert.throws(() => ownerState(candidate, patch));
    }
  const masks = new Set([
    0,
    8191,
    2730,
    5461,
    ...spec.items.map((_, index) => 1 << index),
    ...spec.items.map((_, index) => 8191 ^ (1 << index)),
  ]);
  for (const mask of masks) {
    const input = spec.items.map((p, index) => ownerAt(proposed[index], p, mask & (1 << index) ? 'after' : 'before'));
    const saved = structuredClone(input);
    const result = applyBatch(input);
    assert.deepEqual(result, proposed);
    assert.deepEqual(applyBatch(result), result);
    assert.ok(terminal(result));
    assert.deepEqual(input, saved);
    assert.equal(terminal(input), mask === 8191);
  }
  const extended = originals.map((row) => ({
    ...structuredClone(row),
    meta_data: { ...structuredClone(row.meta_data), future_key: { nested: [null, 'keep', 42] } },
  }));
  const result = applyBatch(extended);
  for (const [index, row] of result.entries()) {
    ItemSchema.parse(row);
    assert.deepEqual(ownerAt(row, spec.items[index], 'before'), extended[index]);
  }
  assert.deepEqual(applyBatch(result), result);
});

test('identity/prose/craft/citation/trait drift, late missing row and forced CAS fail without any half edit', () => {
  for (const baseline of [originals, proposed])
    for (const [index, patch] of spec.items.entries()) {
      const changes = [
        ...Object.keys(patch.expected).map((key) => ({ [key]: baseline[index][key] === null ? 'drift' : null })),
        { description: 'drift' },
        { craft_requirements: null },
        { traits: [] },
        ...[null, [], 1, 'bad', { source: null }, { source: {} }].map((meta_data) => ({ meta_data })),
      ];
      for (const change of changes) {
        const input = structuredClone(baseline);
        Object.assign(input[index], change);
        const saved = structuredClone(input);
        assert.throws(() => applyBatch(input));
        assert.equal(terminal(input), false);
        assert.deepEqual(input, saved);
      }
    }
  const saved = structuredClone(originals);
  assert.throws(() => applyBatch(originals, sources, dependencyRows, [], 12599), /compare-and-set/);
  assert.deepEqual(originals, saved);
  assert.throws(() => applyBatch(originals.slice(0, -1)));
  assert.equal(terminal(proposed.slice(0, -1)), false);
});

test('every exact official source and dependency guard remains enforced before and after, including missing/wrong type/citation', () => {
  for (const baseline of [originals, proposed]) {
    for (const [index, source] of spec.sources.entries())
      for (const key of Object.keys(source)) {
        const changed = structuredClone(sources);
        changed[index][key] = source[key] === null ? 'drift' : null;
        assert.throws(() => applyBatch(baseline, changed));
        assert.equal(terminal(proposed, changed), false);
      }
    for (const [index, dependency] of spec.dependencies.entries()) {
      for (const key of Object.keys(dependency.expected)) {
        const changed = structuredClone(dependencyRows);
        changed[index].row[key] = dependency.expected[key] === null ? 'drift' : null;
        assert.throws(() => applyBatch(baseline, sources, changed));
        assert.equal(terminal(proposed, sources, changed), false);
      }
      for (const meta_data of [null, [], { source: null }, { source: { url: 'https://example.invalid/' } }]) {
        const changed = structuredClone(dependencyRows);
        changed[index].row.meta_data = meta_data;
        assert.throws(() => applyBatch(baseline, sources, changed));
        assert.equal(terminal(proposed, sources, changed), false);
      }
    }
    assert.throws(() => applyBatch(baseline, sources, dependencyRows.slice(1)));
    assert.equal(terminal(proposed, sources.slice(1)), false);
  }
});

test('relevant pending or unknown-status UPDATE/DELETE {}, CREATE payload source, identity and source data.id block before replay', () => {
  const identities = [
    ...spec.items.map((p) => ({ type: 'item', id: p.id, name: p.expected.name, source: 16, uuid: p.expected.uuid })),
    ...spec.dependencies.map((d) => ({
      type: d.table,
      id: d.id,
      name: d.name,
      source: d.source,
      uuid: d.expected.uuid,
    })),
  ];
  const updates = [];
  for (const entry of identities) {
    for (const action of ['UPDATE', 'DELETE'])
      updates.push({ type: entry.type, ref_id: entry.id, action, data: {}, content_source_id: 0 });
    updates.push({
      type: entry.type,
      ref_id: null,
      action: 'CREATE',
      data: { name: entry.name },
      content_source_id: entry.source,
    });
    updates.push({
      type: entry.type,
      ref_id: null,
      action: 'CREATE',
      data: { name: entry.name, content_source_id: entry.source },
      content_source_id: 0,
    });
    updates.push({ type: entry.type, ref_id: 999999, action: 'UPDATE', data: { id: entry.id }, content_source_id: 0 });
    updates.push({
      type: entry.type,
      ref_id: null,
      action: 'CREATE',
      data: { uuid: entry.uuid },
      content_source_id: 0,
    });
  }
  for (const source of spec.sources)
    for (const data of [{}, { id: source.id }, { name: source.name }])
      updates.push({
        type: 'content-source',
        ref_id: Object.keys(data).length ? null : source.id,
        action: 'UPDATE',
        data,
        content_source_id: 0,
      });
  for (const update of updates)
    for (const status of [
      { state: 'PENDING' },
      null,
      {},
      [],
      false,
      'APPROVED',
      { state: 'UNKNOWN' },
      { state: null },
      { state: [] },
    ]) {
      const queue = [{ ...update, status }];
      assert.throws(() => applyBatch(originals, sources, dependencyRows, queue));
      assert.throws(() => applyBatch(proposed, sources, dependencyRows, queue));
      assert.equal(terminal(proposed, sources, dependencyRows, queue), false);
    }
  for (const update of updates)
    for (const state of ['APPROVED', 'REJECTED'])
      assert.ok(terminal(proposed, sources, dependencyRows, [{ ...update, status: { state } }]));
  assert.ok(
    terminal(proposed, sources, dependencyRows, [
      { type: 'spell', ref_id: 4579, content_source_id: 3, data: {}, status: { state: 'PENDING' } },
    ]),
    'captured unrelated Divine Wrath submission is not a target'
  );
});

/** Compare complete real-controller stores, excluding only fresh wall-clock history timestamps. */
const stableStore = (store) => ({
  ...store,
  history: Object.fromEntries(
    Object.entries(store.history).map(([key, entries]) => [key, entries.map(({ timestamp, ...entry }) => entry)])
  ),
});
async function calculate(items, kind = 'character') {
  const actor = {
    ...summoner(items),
    companions: { list: [] },
    content_sources: { enabled: [16] },
    operation_data: { selections: { unchanged: 'saved-selection' } },
  };
  const content = {
    ...emptyContent,
    items: proposed,
    spells,
    traits: dependencyRows.filter((d) => d.table === 'trait').map((d) => d.row),
    sources,
    abilityBlocks: [],
  };
  engine.clearOperationErrorNotifications();
  let result;
  if (kind === 'character')
    result = await engine._executeCharacterOperations({ character: actor, content, context: 'CHARACTER-SHEET' });
  else {
    const owner = await engine._executeCharacterOperations({
      character: { ...summoner([]), companions: { list: [] } },
      content,
      context: 'CHARACTER-SHEET',
    });
    result = await engine._executeCreatureOperations({
      id: 'wand-family-companion',
      creature: { name: 'Wand companion', level: 1, operations: [], inventory: actor.inventory },
      content,
      charStore: owner.store,
    });
  }
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  return result;
}
test('actual character/companion controller before/after/repeat/reorder/remove/container states and saved full inventory stay unchanged', async () => {
  for (const kind of ['character', 'companion'])
    for (const flags of [{}, { is_equipped: true }, { is_formula: true }]) {
      const oldItems = originals.map((row) => inventoryItem(structuredClone(row), flags));
      const items = proposed.map((row) => inventoryItem(structuredClone(row), flags));
      const saved = {
        inventory: { items, coins: { cp: 1, sp: 2, gp: 3, pp: 4 } },
        selections: { unchanged: 'saved-selection' },
        spells: structuredClone(spells),
      };
      InventorySchema.parse(saved.inventory);
      const frozen = structuredClone(saved);
      const a = await calculate(oldItems, kind),
        b = await calculate(items, kind);
      assert.deepEqual(stableStore(b.store), stableStore(a.store));
      assert.deepEqual(b.ors, a.ors);
      assert.deepEqual(b.errors, a.errors);
      const container = inventoryItem({ ...structuredClone(proposed[0]), traits: [] }, { container_contents: items });
      for (const contents of [items, [...items].reverse(), [], [container]]) {
        const result = await calculate(contents, kind);
        assert.deepEqual(stableStore(result.store), stableStore(b.store));
        assert.deepEqual(result.ors, b.ors);
        assert.deepEqual(result.errors, b.errors);
      }
      assert.deepEqual(saved, frozen);
      InventorySchema.parse(saved.inventory);
    }
});

test('actual wand eligibility and explicit dependency supplementation stay top-level, deduplicated and source-scoped', () => {
  const expected = [4627, 5139, 8891];
  const untouched = structuredClone(spells);
  for (const flags of [{}, { is_equipped: true }, { is_formula: true }, { is_invested: true }]) {
    const entries = proposed.map((row) => inventoryItem(structuredClone(row), flags));
    assert.equal(engine.filterByTraitType(entries, 'WAND').length, 13);
    assert.deepEqual(engine.getInventorySpellIds(entries), expected);
    assert.deepEqual(engine.getInventorySpellIds([...entries].reverse()), expected);
  }
  const entries = proposed.map((row) => inventoryItem(row));
  const container = inventoryItem({ ...structuredClone(proposed[0]), traits: [] }, { container_contents: entries });
  assert.deepEqual(engine.getInventorySpellIds([container]), []);
  assert.deepEqual(engine.getInventorySpellIds([]), []);
  const ordinary = spells.filter((spell) => spell.content_source_id === 16);
  assert.deepEqual(ordinary, []);
  assert.deepEqual(engine.getMissingSpellIds(ordinary, expected), expected);
  assert.equal(engine.mergeSpellDependencies(ordinary, spells, []), ordinary);
  const supplemented = engine.mergeSpellDependencies(ordinary, [...spells, ...spells], expected);
  assert.deepEqual(
    supplemented.map((s) => s.id).sort((a, b) => a - b),
    expected
  );
  assert.deepEqual(
    engine.filterSpellCatalog(supplemented, 'floating flame', 'TWO-ACTIONS', () => []).map((s) => s.id),
    [4627]
  );
  assert.deepEqual(
    engine.filterSpellCatalog(supplemented, 'floating flame', 'THREE-ACTIONS', () => []),
    []
  );
  assert.deepEqual(spells, untouched);
});

test('SQL uses sorted locks, pending before replay, row_count=1 full-state leaf CAS and fail-closed terminal release only', () => {
  const childPrelockStart = migration.indexOf('-- Acquire reviewed content rows before source cache locks.');
  const childPrelockEnd = migration.indexOf('-- End reviewed content row prelocks.');
  assert.ok(migration.indexOf('lock table public.content_update') < childPrelockStart);
  assert.ok(
    childPrelockStart < childPrelockEnd &&
      childPrelockEnd < migration.indexOf('from public.content_source', migration.indexOf('\nbegin\n'))
  );
  const childPrelocks = migration.slice(childPrelockStart, childPrelockEnd);
  assert.doesNotMatch(childPrelocks, /\b(?:update|insert|delete)\s+public\.|\b(?:continue|return)\b/i);
  assert.match(
    childPrelocks,
    /public\.item i[\s\S]*?jsonb_array_elements\(spec->'items'\)[\s\S]*?order by i\.id for update/
  );
  for (const [table, type, alias] of [
    ['ability_block', 'ability-block', 'a'],
    ['spell', 'spell', 's'],
    ['trait', 'trait', 't'],
  ]) {
    assert.match(
      childPrelocks,
      new RegExp(
        `public\\.${table} ${alias}[\\s\\S]*?jsonb_array_elements\\(spec->'dependencies'\\)[\\s\\S]*?where d->>'table' = '${type}'[\\s\\S]*?order by ${alias}\\.id for share;`
      )
    );
  }
  const body = migration.split('$wandfamilies$')[2],
    predicate = release.split('$wandfamilies$')[2];
  assert.match(body, /lock table public\.content_update in share mode/);
  assert.match(body, /jsonb_array_elements\(spec->'sources'\) order by \(value->>'id'\)::bigint/);
  assert.match(body, /order by value->>'table',\(value->>'id'\)::bigint/);
  assert.match(body, /public\.item where id=\(patch->>'id'\)::bigint for update/);
  assert.ok(body.indexOf('pending or malformed') < body.indexOf("if current_state=patch->'after'"));
  assert.ok(body.indexOf('unreviewed complete leaf state') < body.indexOf('update public.item'));
  assert.match(body, /get diagnostics affected=row_count/);
  assert.match(body, /if affected<>1 then/);
  assert.match(body, /jsonb_set\(i\.meta_data::jsonb,'\{source\}',patch#>'\{after,source\}',true\)/);
  assert.match(body, /case when patch->>'family'='chromatic'/);
  for (const sql of [body, predicate]) {
    assert.match(sql, /coalesce\(u\.status->>'state','PENDING'\) not in \('APPROVED','REJECTED'\)/);
    assert.match(sql, /u\.data->>'id'=s->>'id'/);
    assert.match(sql, /u\.data->>'content_source_id'/);
    assert.match(sql, /u\.ref_id=\(p->>'id'\)::bigint/);
    assert.doesNotMatch(
      sql,
      /update public\.(?:spell|ability_block|trait|content_source|character)|insert into|delete from/i
    );
  }
  assert.equal((body.match(/update public\.item /g) ?? []).length, 1);
  assert.doesNotMatch(body, /set (?:name|uuid|operations|level|price|usage|bulk|content_source_id)\s*=/);
  assert.match(predicate, /is not true/);
  assert.match(predicate, /is distinct from p->'after'/);
  assert.match(predicate, /false\) passed/);
});
