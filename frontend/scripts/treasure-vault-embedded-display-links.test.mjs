import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { ItemSchema, InventoryItemSchema } from '../src/schemas/content.ts';
import { createOperationEngine } from './operation-test-harness.mjs';
import { content as emptyContent, inventoryItem, summoner } from './fixtures/eidolon.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261002099000_treasure_vault_embedded_display_links.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-embedded-display-links.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$display099$')[1]);
const toItem = (row) => ({ ...structuredClone(row), uuid: Number(row.uuid) });
const stable = (value) => {
  const row = structuredClone(value);
  delete row.updated_at;
  delete row.search_tsv;
  row.uuid = String(row.uuid);
  return row;
};
const getPath = (value, path) => path.split('.').reduce((row, key) => row[key], value);
const setPath = (value, path, after) => {
  const keys = path.split('.');
  let row = value;
  for (const key of keys.slice(0, -1)) row = row[key];
  row[keys.at(-1)] = after;
};
const equal = (a, b) => {
  try {
    assert.deepEqual(a, b);
    return true;
  } catch {
    return false;
  }
};
const stripTimestamps = (value) => {
  if (Array.isArray(value)) return value.map(stripTimestamps);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'timestamp')
      .map(([key, child]) => [key, stripTimestamps(child)])
  );
};

/** Model only the exact complete states accepted by the migration's owner CAS. */
function repair(value, patch) {
  const current = stable(value);
  assert.ok(equal(current, patch.anchor) || equal(current, patch.final), 'only complete reviewed states are accepted');
  return toItem(patch.final);
}

let engine;
let content;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true });
  const fixtures = spec.dependencies.map(({ table, anchor }) => ({ table, row: toItem(anchor) }));
  engine.setFixtures(fixtures);
  content = {
    ...emptyContent,
    items: spec.patches.map(({ anchor }) => toItem(anchor)),
    traits: fixtures.filter(({ table }) => table === 'trait').map(({ row }) => row),
    spells: fixtures.filter(({ table }) => table === 'spell').map(({ row }) => row),
    abilityBlocks: fixtures.filter(({ table }) => table === 'ability_block').map(({ row }) => row),
    defaultSources: { PAGE: [1, 3, 16], INFO: [1, 3, 16] },
  };
});
after(async () => engine?.cleanup());

/** Run the actual controller on an independent saved inventory snapshot and unchanged selections. */
async function calculate(row, selection, flags = {}, removed = false) {
  const operation = row.operations?.find((operation) => operation.type === 'select');
  const selections = operation && selection != null ? { [`item-${row.id}_${operation.id}`]: selection } : {};
  const character = {
    ...summoner(removed ? [] : [inventoryItem(row, { is_equipped: true, is_invested: true, ...flags })]),
    id: 990099,
    name: 'Embedded display fixture',
    level: 20,
    companions: { list: [] },
    options: { custom_operations: true, ignore_bulk_limit: true },
    content_sources: { enabled: [1, 3, 16] },
    operation_data: { selections, untouched: 'saved sibling' },
  };
  const saved = structuredClone(character);
  const result = await engine._executeCharacterOperations({
    character,
    content: { ...content, items: content.items.map((item) => (item.id === row.id ? row : item)) },
    context: 'CHARACTER-SHEET',
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(character, saved, 'neither saved item text nor selection identities are rewritten');
  return stripTimestamps(result.store);
}

test('migration and release share exactly four embedded display leaves at the pre100 count tuple', () => {
  assert.deepEqual(spec, JSON.parse(release.split('$display099$')[1]));
  assert.deepEqual(
    spec.patches.map(({ id }) => id),
    [11726, 12125, 12126, 12127]
  );
  assert.deepEqual(spec.source16_counts, { item: 1119, trait: 24, creature: 2 });
  assert.equal(
    spec.patches.reduce((sum, patch) => sum + patch.leaves.length, 0),
    4
  );
  for (const patch of spec.patches) {
    assert.equal(patch.table, 'item');
    const leaf = patch.leaves[0];
    const original = toItem(patch.anchor),
      next = repair(original, patch),
      expected = structuredClone(original);
    setPath(expected, leaf.path, leaf.after);
    assert.deepEqual(next, expected, 'no undeclared owner field changes');
    assert.equal(getPath(original, leaf.path), leaf.before);
    assert.equal(getPath(next, leaf.path), leaf.after);
    ItemSchema.parse(original);
    ItemSchema.parse(next);
    InventoryItemSchema.parse(inventoryItem(next));
    assert.deepEqual(repair(next, patch), next, 'known terminal replay is a no-op');
    assert.deepEqual(patch.changed_columns, [leaf.path.split('.')[0]]);
    assert.deepEqual(next.description, original.description, 'top-level prose is reserved for100');
    const restored = structuredClone(next);
    setPath(restored, leaf.path, leaf.before);
    assert.deepEqual(
      restored,
      original,
      'operation semantics and all UUIDs are byte-identical except the declared display leaf'
    );
  }
});

test('whole-owner guards reject every relevant sibling, operation, metadata and creation identity drift', () => {
  for (const patch of spec.patches)
    for (const accepted of [patch.anchor, patch.final]) {
      for (const [key, value] of [
        ['id', -1],
        ['uuid', -1],
        ['name', 'Changed'],
        ['content_source_id', -1],
        ['created_at', '2000-01-01T00:00:00+00:00'],
        ['description', 'Changed'],
        ['craft_requirements', 'Changed'],
        ['usage', 'Changed'],
        ['traits', [-1]],
        ['price', { cp: -1 }],
        ['bulk', '-1'],
        ['operations', []],
      ]) {
        const changed = { ...toItem(accepted), [key]: value },
          saved = structuredClone(changed);
        assert.throws(() => repair(changed, patch), `${patch.id}/${key}`);
        assert.deepEqual(changed, saved);
      }
      const metadata = toItem(accepted);
      metadata.meta_data.unreviewed = true;
      assert.throws(() => repair(metadata, patch));
      const brokenLeaf = toItem(accepted);
      setPath(brokenLeaf, patch.leaves[0].path, 'Unreviewed text');
      assert.throws(() => repair(brokenLeaf, patch));
      if (patch.id !== 11726) {
        const brokenOperation = toItem(accepted);
        brokenOperation.operations[0].data.optionsPredefined[0].operations[0].data.value = 'electricity, 99';
        assert.throws(() => repair(brokenOperation, patch));
      }
    }
});

test('the four-owner atomic domain rejects all partial terminal mixtures', () => {
  const accepts = (rows) =>
    spec.patches.every((patch, index) => equal(stable(rows[index]), patch.anchor)) ||
    spec.patches.every((patch, index) => equal(stable(rows[index]), patch.final));
  for (let mask = 0; mask < 16; mask++) {
    const rows = spec.patches.map((patch, index) => toItem(mask & (1 << index) ? patch.final : patch.anchor));
    assert.equal(accepts(rows), mask === 0 || mask === 15, `partial terminal mask ${mask}`);
  }
});

test('normalized pending states, subtype, source identities and both printed citation URLs preserve curator routing', () => {
  const normalized = (value) =>
    String(value ?? '')
      .trim()
      .toLowerCase();
  const matchesIdentity = (update, anchor, aliases) =>
    update.ref_id === anchor.id ||
    String(update.data?.id ?? '') === String(anchor.id) ||
    (anchor.uuid != null && String(update.data?.uuid ?? '') === String(anchor.uuid)) ||
    aliases.some((url) => normalized(url) === normalized(update.data?.meta_data?.source?.url)) ||
    ((update.content_source_id === anchor.content_source_id ||
      String(update.data?.content_source_id ?? '') === String(anchor.content_source_id)) &&
      normalized(update.data?.name) === normalized(anchor.name));
  const blocks = (update) => {
    if (
      ['APPROVED', 'REJECTED'].includes(
        String(update.status?.state ?? 'PENDING')
          .trim()
          .toUpperCase()
      )
    )
      return false;
    if (
      update.type === 'item' &&
      spec.patches.some((patch) => matchesIdentity(update, patch.anchor, patch.url_aliases))
    )
      return true;
    if (
      spec.dependencies.some(
        (dependency) =>
          (update.type === dependency.table.replaceAll('_', '-') ||
            (dependency.table === 'ability_block' && update.type === dependency.anchor.type)) &&
          matchesIdentity(update, dependency.anchor, dependency.url_aliases)
      )
    )
      return true;
    return (
      update.type === 'content-source' &&
      spec.sources.some(
        (source) =>
          update.ref_id === source.id ||
          String(update.data?.id ?? '') === String(source.id) ||
          normalized(update.data?.name) === normalized(source.name) ||
          (source.url != null &&
            [update.data?.url, update.data?.meta_data?.source?.url].some(
              (url) => normalized(url) === normalized(source.url)
            ))
      )
    );
  };
  for (const patch of spec.patches) {
    const data = { name: ` ${patch.anchor.name.toUpperCase()} ` };
    for (const state of [undefined, null, 'pending', ' PENDING ', 'unreviewed'])
      assert.ok(blocks({ type: 'item', content_source_id: 16, data, status: { state } }));
    for (const state of ['APPROVED', ' approved ', 'REJECTED', ' rejected '])
      assert.equal(blocks({ type: 'item', ref_id: patch.id, data: {}, status: { state } }), false);
    for (const alias of patch.url_aliases)
      for (const url of [alias, ` ${alias.toUpperCase()} `])
        assert.ok(blocks({ type: 'item', data: { meta_data: { source: { url } } } }));
    assert.ok(blocks({ type: 'item', data: { id: patch.id } }));
    assert.ok(blocks({ type: 'item', data: { uuid: patch.anchor.uuid } }));
    assert.equal(blocks({ type: 'spell', ref_id: patch.id, data: {} }), false);
  }
  for (const dependency of spec.dependencies) {
    const types = [
      dependency.table.replaceAll('_', '-'),
      ...(dependency.table === 'ability_block' ? [dependency.anchor.type] : []),
    ];
    for (const type of types) {
      assert.ok(blocks({ type, ref_id: dependency.id, data: {} }));
      assert.ok(blocks({ type, data: { uuid: dependency.anchor.uuid } }));
      assert.ok(
        blocks({
          type,
          content_source_id: dependency.anchor.content_source_id,
          data: { name: ` ${dependency.anchor.name.toUpperCase()} ` },
        })
      );
      for (const alias of dependency.url_aliases)
        for (const url of [alias, ` ${alias.toUpperCase()} `])
          assert.ok(blocks({ type, data: { meta_data: { source: { url } } } }));
    }
  }
  for (const source of spec.sources) {
    assert.ok(blocks({ type: 'content-source', ref_id: source.id, data: {} }));
    assert.ok(blocks({ type: 'content-source', data: { name: ` ${source.name.toUpperCase()} ` } }));
    if (source.url)
      for (const url of [source.url, ` ${source.url.toUpperCase()} `]) {
        assert.ok(blocks({ type: 'content-source', data: { url } }));
        assert.ok(blocks({ type: 'content-source', data: { meta_data: { source: { url } } } }));
      }
  }
  assert.equal(blocks({ type: 'item', ref_id: -1, content_source_id: -1, data: { name: 'Unrelated' } }), false);
});

test('the actual helper and RichText resolve exact published identities without changing embedded spell grants', () => {
  for (const patch of spec.patches) {
    const leaf = patch.leaves[0];
    const html = engine.renderRichText(leaf.after);
    assert.ok(html.length > 0);
    for (const match of leaf.after.matchAll(/\[([^\]]+)\]\(link_([^_]+(?:-[^_]+)?)_(\d+)\)/g)) {
      const type = match[2],
        id = Number(match[3]);
      const table = ['action', 'feat'].includes(type) ? 'ability_block' : type;
      const target = spec.dependencies.find((dependency) => dependency.table === table && dependency.id === id);
      assert.ok(target, `${type}/${id} has an exact guarded dependency`);
      const helper = engine.convertToHardcodedLink(type, target.anchor.name, match[1]);
      assert.equal(helper, match[0]);
    }
    const spells = content.spells;
    const before = engine.detectSpells(leaf.before, spells, true).map(({ spell, rank }) => [spell.id, rank]);
    const after = engine.detectSpells(leaf.after, spells, true).map(({ spell, rank }) => [spell.id, rank]);
    assert.deepEqual(after, before);
    if (patch.id === 11726) {
      assert.match(html, /<em>/);
      assert.deepEqual(after, [[4689, 2]]);
    }
  }
});

test('all three real Jolt Coil tier choices, reloads, investment and removal preserve actual controller math', async () => {
  for (const patch of spec.patches.filter(({ id }) => id !== 11726)) {
    const original = toItem(patch.anchor),
      next = toItem(patch.final);
    const options = original.operations[0].data.optionsPredefined;
    for (const selection of [undefined, ...options.map((option) => option.id)])
      for (const flags of [{}, { is_equipped: false }, { is_invested: false }]) {
        const before = await calculate(original, selection, flags);
        const after = await calculate(next, selection, flags);
        assert.deepEqual(after, before, `${patch.id}/${selection}/controller`);
        assert.deepEqual(
          await calculate(structuredClone(next), selection, flags),
          after,
          'reload retains selection and math'
        );
      }
    assert.deepEqual(
      await calculate(next, options[0].id, {}, true),
      await calculate(original, options[0].id, {}, true)
    );
    const armor = await calculate(next, options[0].id);
    assert.ok(
      armor.variables.RESISTANCES.value.includes(options[0].operations[0].data.value),
      'Armor selection actually executes its original resistance operation'
    );
  }
});

test('Autumn embedded rune styling preserves equipment, investment, removal and reload behavior', async () => {
  const patch = spec.patches.find(({ id }) => id === 11726);
  const original = toItem(patch.anchor),
    next = toItem(patch.final);
  for (const flags of [{}, { is_equipped: false }, { is_invested: false }]) {
    const before = await calculate(original, undefined, flags),
      after = await calculate(next, undefined, flags);
    assert.deepEqual(after, before);
    assert.deepEqual(await calculate(structuredClone(next), undefined, flags), after);
  }
  assert.deepEqual(await calculate(next, undefined, {}, true), await calculate(original, undefined, {}, true));
});

test('SQL retains atomic full owner and dependency CAS, normalized pending guards, complete queue and source readback', () => {
  assert.match(migration, /lock table public\.content_update in share mode/);
  assert.match(migration, /actual is distinct from patch->'anchor' and actual is distinct from patch->'final'/);
  assert.match(migration, /captured CAS failed/);
  assert.match(migration, /immediate readback drift/);
  assert.match(migration, /final owner readback drift/);
  assert.match(migration, /final dependency drift/);
  assert.match(migration, /source baseline drift/);
  assert.match(migration, /queue_after is distinct from queue_before/);
  assert.match(migration, /baseline_count<>4 and terminal_count<>4/);
  assert.match(migration, /upper\(btrim\(coalesce\(u.status->>'state','PENDING'\)\)\)/);
  assert.match(migration, /u.type=d#>>'\{anchor,type\}'/);
  assert.match(migration, /jsonb_array_elements_text\(d->'url_aliases'\)/);
  assert.match(migration, /jsonb_array_elements_text\(p->'url_aliases'\)/);
  assert.match(migration, /lower\(btrim\(u.data#>>'\{meta_data,source,url\}'\)\)=lower\(btrim\(url\)\)/);
  assert.match(release, /lower\(btrim\(u.data#>>'\{meta_data,source,url\}'\)\)=lower\(btrim\(url\)\)/);
  assert.equal((migration.match(/lower\(btrim\(u\.data->>'name'\)\)/g) ?? []).length, 6);
  assert.match(release, /count\(\*\)=4/);
  assert.match(release, /count\(\*\)=3/);
  assert.match(release, /is true/);
  assert.doesNotMatch(migration, /update public\.(character|creature|content_update|content_source)\b/i);
  assert.doesNotMatch(migration, /created_at,updated_at/);
});
