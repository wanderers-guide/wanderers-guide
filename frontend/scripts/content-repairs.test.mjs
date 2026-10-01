import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { isDeepStrictEqual } from 'node:util';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

async function readPatches(name) {
  const sql = await readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8');
  return JSON.parse(sql.split('$patches$')[1]);
}

const grants = await readPatches('20260926000000_repair_content_grants.sql');
const metadata = await readPatches('20260926010000_repair_item_metadata.sql');
const healCompanion = await readPatches('20261001000000_repair_heal_companion.sql');
const weapons = await readPatches('20261001010000_repair_weapon_stat_fields.sql');
let engine;
let rows;
let originals;
let content;

before(async () => {
  engine = await createOperationEngine();
  rows = await readContentRows([
    ...grants.map(({ id }) => ({ table: 'ability_block', id })),
    { table: 'ability_block', id: 58078 },
    { table: 'ability_block', id: healCompanion.id },
    ...[8319, 6759, 8835, 4397, 4716, 4977].map((id) => ({ table: 'spell', id })),
    ...metadata.map(({ id }) => ({ table: 'item', id })),
    ...weapons.map(({ id }) => ({ table: 'item', id })),
  ]);
  originals = structuredClone(rows);
  const legacyFeat = rows.find(({ table, row }) => table === 'ability_block' && row.id === healCompanion.id).row;
  const legacyFields = { operations: legacyFeat.operations, description: legacyFeat.description };
  assert.ok([healCompanion.before, healCompanion.after].some((fields) => isDeepStrictEqual(legacyFields, fields)));
  Object.assign(legacyFeat, structuredClone(healCompanion.after));
  for (const patch of grants) {
    const feat = rows.find(({ table, row }) => table === 'ability_block' && row.id === patch.id).row;
    assert.equal(feat.name, patch.name);
    assert.equal(feat.content_source_id, patch.source);
    const operations = feat.operations.filter(({ id }) => id === patch.operation);
    assert.equal(operations.length, 1);
    assert.equal(operations[0].type, patch.type);
    assert.ok([patch.before, patch.after].some((data) => isDeepStrictEqual(operations[0].data, data)));
    operations[0].data = structuredClone(patch.after);
  }
  for (const patch of metadata) {
    const item = rows.find(({ table, row }) => table === 'item' && row.id === patch.id).row;
    assert.equal(item.name, patch.name);
    assert.equal(item.content_source_id, patch.source);
    const parent = patch.path.slice(0, -1).reduce((value, key) => value[key], item.meta_data);
    const key = patch.path.at(-1);
    assert.ok([patch.before, patch.after].includes(parent[key]));
    if (patch.remove) delete parent[key];
    else parent[key] = patch.after;
  }
  for (const patch of weapons) {
    const item = rows.find(({ table, row }) => table === 'item' && row.id === patch.id).row;
    assert.equal(item.name, patch.name);
    assert.equal(item.content_source_id, patch.source);
    assert.equal(item.hands, patch.hands);
    assert.equal(item.group, 'WEAPON');
    const fields = {
      usage: item.usage,
      ...('reload' in patch.before ? { reload: item.meta_data.reload } : {}),
    };
    assert.ok([patch.before, patch.after].some((value) => isDeepStrictEqual(fields, value)));
    item.usage = patch.after.usage;
    if ('reload' in patch.after) item.meta_data.reload = patch.after.reload;
  }
  engine.setFixtures(rows);
  content = {
    abilityBlocks: rows.filter(({ table }) => table === 'ability_block').map(({ row }) => row),
    spells: rows.filter(({ table }) => table === 'spell').map(({ row }) => row),
    items: [],
    classes: [],
    ancestries: [],
    backgrounds: [],
    languages: [],
    traits: [],
    sources: [],
    defaultSources: { PAGE: [1, 18, 24, 256, 579, 842], INFO: [1, 18, 24, 256, 579, 842] },
  };
});
after(async () => engine?.cleanup());

const cases = [
  { id: 58079, name: 'The Taste of Magic', variable: 'SENSE_IDS', expected: ['58078'] },
  { id: 47102, name: 'Synthetic Speech', expected: ['8319'], rank: 4, tradition: 'ARCANE', casts: 1 },
  { id: 23103, name: "Tree's Ward", expected: ['6759'], rank: 1, tradition: 'PRIMAL', casts: 1 },
  { id: 23111, name: 'Violent Vines', expected: ['8835'], rank: 4, tradition: 'PRIMAL' },
  { id: 23336, name: 'Bone Caller', expected: ['4397', '4716'], rank: 2, tradition: 'PRIMAL', casts: 1 },
];

for (const fixture of cases)
  test(`${fixture.name} grants its intended ability through character calculation`, async () => {
    const feat = content.abilityBlocks.find(({ id }) => id === fixture.id);
    const original = originals.find(({ table, row }) => table === 'ability_block' && row.id === fixture.id).row;
    const patch = grants.find(({ id }) => id === fixture.id);
    const expected = structuredClone(original);
    expected.operations.find(({ id }) => id === patch.operation).data = structuredClone(patch.after);
    assert.deepEqual(feat, expected, 'only the guarded operation data may change');
    const { store, errors } = await engine._executeCharacterOperations({
      character: {
        id: 1,
        level: 20,
        details: {},
        inventory: { items: [] },
        operation_data: { selections: {} },
        options: { custom_operations: true },
        custom_operations: [
          { id: 'grant-fixture', type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: fixture.id } },
        ],
      },
      content,
      context: 'CHARACTER-SHEET',
    });
    assert.deepEqual(errors, []);
    assert.deepEqual([...store.variables[fixture.variable ?? 'SPELL_IDS'].value].sort(), [...fixture.expected].sort());
    if (fixture.variable) {
      assert.ok(store.variables.SENSES_IMPRECISE.value.includes('magic scent,30'));
    } else {
      const spells = store.variables.SPELL_DATA.value.map(JSON.parse);
      assert.equal(spells.length, fixture.expected.length);
      for (const data of spells) {
        assert.equal(data.rank, fixture.rank);
        assert.equal(data.tradition, fixture.tradition);
        assert.equal(data.casts, fixture.casts);
        assert.equal(data.type, 'INNATE');
      }
    }
    if (fixture.id === 23111) {
      assert.match(feat.description, /once per hour/i);
      assert.equal(feat.operations[0].data.casts, undefined, 'hourly use must not become a daily limit');
    }
  });

test('item cleanup changes only the three malformed leaves', () => {
  for (const patch of metadata) {
    const expected = structuredClone(originals.find(({ table, row }) => table === 'item' && row.id === patch.id).row);
    const parent = patch.path.slice(0, -1).reduce((value, key) => value[key], expected.meta_data);
    if (patch.remove) delete parent[patch.path.at(-1)];
    else parent[patch.path.at(-1)] = 'WEAPON';
    assert.deepEqual(rows.find(({ table, row }) => table === 'item' && row.id === patch.id).row, expected);
  }
});

test('legacy Heal Companion grants its ranger focus spell, training, and spell tab without replacing the feat', async () => {
  const feat = content.abilityBlocks.find(({ id }) => id === healCompanion.id);
  const original = originals.find(({ table, row }) => table === 'ability_block' && row.id === healCompanion.id).row;
  assert.deepEqual(feat, { ...original, ...healCompanion.after });
  assert.equal(feat.content_source_id, 14);
  assert.match(feat.description, /\[Heal Companion\]\(link_spell_4977\)/);
  const { store, errors } = await engine._executeCharacterOperations({
    character: {
      id: 1,
      level: 1,
      details: {},
      inventory: { items: [] },
      operation_data: { selections: {} },
      options: { custom_operations: true },
      custom_operations: [
        { id: 'legacy-feat', type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: 22108 } },
      ],
    },
    content,
    context: 'CHARACTER-SHEET',
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(store.variables.FEAT_IDS.value, ['22108']);
  assert.deepEqual(store.variables.SPELL_IDS.value, ['4977']);
  assert.deepEqual(store.variables.SPELL_DATA.value.map(JSON.parse), [
    { spellId: 4977, type: 'FOCUS', castingSource: 'RANGER' },
  ]);
  assert.ok(store.variables.CASTING_SOURCES.value.includes('RANGER:::-:::PRIMAL:::ATTRIBUTE_WIS'));
  assert.equal(store.variables.SPELL_ATTACK.value.value, 'T');
  assert.equal(store.variables.SPELL_DC.value.value, 'T');
  assert.ok(store.variables.PRIMARY_SHEET_TABS.value.includes('spells'));
});

test('mundane weapon repairs preserve Hands, attacks, operations, and all unrelated item fields', () => {
  assert.equal(weapons.length, 43);
  for (const patch of weapons) {
    const original = originals.find(({ table, row }) => table === 'item' && row.id === patch.id).row;
    const expected = structuredClone(original);
    expected.usage = '';
    if (patch.id === 7056) expected.meta_data.reload = '—';
    const item = rows.find(({ table, row }) => table === 'item' && row.id === patch.id).row;
    assert.deepEqual(item, expected);
    assert.equal(item.hands, patch.hands);
  }
});
