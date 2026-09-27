import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const SELECT_ID = 'c4a75d49-19e5-4983-8757-d5caf473627b';
const weapons = [
  { id: 7002, name: 'Gnome Flickmace', category: 'advanced' },
  { id: 7059, name: 'Katana', category: 'martial' },
  { id: 7797, name: 'Spear', category: 'simple' },
];

let engine;
let content;
let classArchetype;
let migration;

/** Read the class archetype's relevant fields without parsing its unrelated feature adjustments. */
async function readVindicatorRow() {
  const dump = await readFile(new URL('../../data/data.sql', import.meta.url), 'utf8');
  const block = dump.split('COPY public.class_archetype ')[1].split('\n\\.')[0];
  const line = block.split('\n').find((entry) => entry.startsWith('30\t'));
  assert.ok(line, 'War of Immortals Vindicator class archetype fixture exists');
  const cells = line.split('\t');
  const raw = cells[7];
  const escaped = { '\\': '\\', n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v' };
  const array = raw.replace(/\\([\\ntrbfv])/g, (_, code) => escaped[code]);
  return {
    operations: JSON.parse(`[${array.slice(1, -1)}]`).map(JSON.parse),
    meta_data: cells[17] === '\\N' ? null : JSON.parse(cells[17]),
  };
}

before(async () => {
  engine = await createOperationEngine();
  const rows = await readContentRows([
    { table: 'class', id: 24 },
    { table: 'ability_block', id: 20038 },
    ...weapons.map(({ id }) => ({ table: 'item', id })),
  ]);
  const originalClassArchetype = await readVindicatorRow();
  classArchetype = {
    id: 30,
    name: 'Vindicator',
    class_id: 24,
    content_source_id: 400,
    operations: originalClassArchetype.operations,
    feature_adjustments: [],
  };
  migration = await readFile(
    new URL('../../supabase/migrations/20260927040000_war_of_immortals_vindicator.sql', import.meta.url),
    'utf8'
  );
  const oldFilter = JSON.parse(migration.match(/old_filter constant jsonb := '([^']+)'::jsonb/)[1]);
  const newFilter = JSON.parse(migration.match(/new_filter constant jsonb := '([^']+)'::jsonb/)[1]);
  const classCitation = JSON.parse(migration.match(/class_citation constant jsonb := '([^']+)'::jsonb/)[1]);
  assert.equal(originalClassArchetype.meta_data, null);
  assert.deepEqual(classCitation, {
    url: 'https://2e.aonprd.com/Archetypes.aspx?ID=285',
    book: 'War of Immortals',
    page: '64',
  });
  classArchetype.meta_data = { source: classCitation };
  const selection = classArchetype.operations.find(({ id }) => id === SELECT_ID);
  assert.deepEqual(selection.data.optionsFilters, oldFilter);
  selection.data.optionsFilters = newFilter;
  const ranger = rows.find(({ table }) => table === 'class').row;
  content = {
    abilityBlocks: rows.filter(({ table }) => table === 'ability_block').map(({ row }) => row),
    classes: [ranger],
    classArchetypes: [classArchetype],
    items: rows.filter(({ table }) => table === 'item').map(({ row }) => row),
    traits: [],
    ancestries: [],
    backgrounds: [],
    languages: [],
    spells: [],
    archetypes: [],
    versatileHeritages: [],
    sources: [],
    defaultSources: { PAGE: [1, 400], INFO: [1, 400] },
  };
  engine.setFixtures(rows);
});

after(async () => engine?.cleanup());

/** Extract a single guarded SQL literal so the test checks the migration's actual values. */
function migrationLiteral(name) {
  const text = migration.match(new RegExp(`${name} constant text := '([^']+)'`))?.[1];
  assert.ok(text, `${name} exists`);
  return text;
}

/** Calculate the Ranger class archetype with a favored-weapon selection and distinct category ranks. */
async function selectedWeapon(
  item,
  { level = 5, martialRank = 'E', simpleRank = 'T', archetype = classArchetype } = {}
) {
  const character = {
    id: 1,
    level,
    details: { class: { id: 24 }, class_archetype: archetype, conditions: [] },
    inventory: { items: [] },
    operation_data: {
      selections: { [`class_${SELECT_ID}`]: `WEAPON_${engine.labelToVariable(item.name)}` },
    },
    content_sources: { enabled: [1, 400] },
    options: { custom_operations: true, ignore_bulk_limit: true },
    custom_operations: [
      {
        id: 'test-martial-rank',
        type: 'setValue',
        data: { variable: 'MARTIAL_WEAPONS', value: { value: martialRank } },
      },
      { id: 'test-simple-rank', type: 'setValue', data: { variable: 'SIMPLE_WEAPONS', value: { value: simpleRank } } },
      { id: 'test-strength', type: 'setValue', data: { variable: 'ATTRIBUTE_STR', value: { value: 0 } } },
    ],
  };
  const { errors, store } = await engine._executeCharacterOperations({
    character,
    content,
    context: 'CHARACTER-SHEET',
  });
  assert.deepEqual(errors, []);
  return { store, attack: engine.getWeaponStats('CHARACTER', item).attack_bonus.total[0] };
}

test('advanced favored weapon follows martial rank while martial and simple weapons keep theirs', async () => {
  const selection = classArchetype.operations.find(({ id }) => id === SELECT_ID);
  assert.equal(selection.type, 'select');
  assert.equal(selection.data.optionsFilters.group, 'WEAPON');
  const scenarios = [
    { level: 1, martialRank: 'T', simpleRank: 'T' },
    { level: 5, martialRank: 'E', simpleRank: 'T' },
    { level: 13, martialRank: 'M', simpleRank: 'E' },
  ];
  for (const scenario of scenarios) {
    for (const { id, category } of weapons) {
      const item = content.items.find((entry) => entry.id === id);
      assert.equal(item.meta_data.category, category);
      const { store, attack } = await selectedWeapon(item, scenario);
      const expectedRank = category === 'simple' ? scenario.simpleRank : scenario.martialRank;
      assert.ok(['T', 'E', 'M'].includes(expectedRank));
      assert.equal(store.variables[`WEAPON_${engine.labelToVariable(item.name)}`].value.value, 'T');
      const familiarity = store.variables.WEAPON_FAMILIARITY.value;
      assert.equal(familiarity.includes(item.name), category === 'advanced', item.name);
      assert.equal(attack, scenario.level + { T: 2, E: 4, M: 6 }[expectedRank], `${item.name} level ${scenario.level}`);
    }
  }
});

test('unrestricted familiarity selections still accept martial weapons', async () => {
  const legacyArchetype = structuredClone(classArchetype);
  const selection = legacyArchetype.operations.find(({ id }) => id === SELECT_ID);
  delete selection.data.optionsFilters.familiarityCategories;
  const item = content.items.find(({ id }) => id === 7059);
  const { store } = await selectedWeapon(item, { archetype: legacyArchetype });
  assert.ok(store.variables.WEAPON_FAMILIARITY.value.includes(item.name));
});

test('Vindicator reaction keeps its ID and archetype identity while replacing obsolete rules', async () => {
  const rows = await readContentRows([
    { table: 'ability_block', id: 39273 },
    { table: 'ability_block', id: 39141 },
  ]);
  const original = rows.find(({ row }) => row.id === 39273).row;
  const avenger = rows.find(({ row }) => row.id === 39141).row;
  assert.equal(original.name, 'Disrupt Opposed Magic');
  assert.equal(original.uuid, '2300543738305504');
  assert.equal(original.meta_data?.source, undefined);
  assert.equal(avenger.name, 'Silence the Profane');
  assert.deepEqual(original.traits, [4140]);
  assert.deepEqual(avenger.traits, [4090]);
  const updated = structuredClone(original);
  updated.name = migrationLiteral('updated_name');
  updated.trigger = migrationLiteral('updated_trigger');
  updated.requirements = migrationLiteral('updated_requirements');
  updated.description = migrationLiteral('updated_description');
  updated.special = migrationLiteral('updated_special');
  updated.uuid = '2351793770437190';
  updated.meta_data.source = JSON.parse(migration.match(/updated_citation constant jsonb := '([^']+)'::jsonb/)[1]);
  assert.equal(updated.name, 'Silence the Profane (Vindicator)');
  assert.notEqual(updated.uuid, avenger.uuid);
  assert.equal(updated.trigger, avenger.trigger);
  assert.equal(updated.requirements, `${avenger.requirements}.`);
  assert.equal(
    updated.description,
    avenger.description.replace('your hunted prey', 'your [hunted prey](link_feat_19728)')
  );
  assert.equal(updated.special, avenger.special);
  assert.equal(updated.meta_data.source.url, 'https://2e.aonprd.com/Feats.aspx?ID=7258');
  assert.equal(updated.meta_data.source.book, 'War of Immortals');
  assert.equal(updated.meta_data.source.page, '65');
  assert.equal(updated.id, original.id);
  assert.deepEqual(updated.operations, original.operations);
  assert.deepEqual(updated.traits, original.traits);
  assert.deepEqual(updated.prerequisites, original.prerequisites);
});
