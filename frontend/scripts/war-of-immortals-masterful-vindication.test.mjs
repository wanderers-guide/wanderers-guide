import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260927170000_war_of_immortals_masterful_vindication.sql', import.meta.url),
  'utf8'
);
const rows = await readContentRows([
  { table: 'ability_block', id: 43770 },
  { table: 'ability_block', id: 43769 },
]);
const original = rows.find(({ row }) => row.id === 43770).row;
const edge = rows.find(({ row }) => row.id === 43769).row;
let engine;

before(async () => {
  engine = await createOperationEngine();
});
after(async () => {
  await engine?.cleanup();
});

test('the visibility repair targets only the reviewed War of Immortals feat', () => {
  assert.equal(original.name, 'Masterful Vindication');
  assert.equal(original.type, 'feat');
  assert.equal(original.level, 17);
  assert.equal(original.content_source_id, 400);
  assert.equal(original.uuid, '2857467541034763');
  assert.deepEqual(original.meta_data, {});
  assert.deepEqual(original.operations, [
    {
      id: '413eeb0e-bac6-408f-8ab2-c571cf48ec79',
      type: 'addBonusToValue',
      data: { variable: 'SPELL_ATTACK', value: '2', type: 'status', text: '' },
    },
  ]);
  assert.match(migration, /id = 43770 and name = 'Masterful Vindication'/);
  assert.match(migration, /type = 'feat' and level = 17 and content_source_id = 400/);
  assert.match(migration, /uuid = '2857467541034763'/);
  assert.match(migration, /ref_id = 43770 and status->>'state' = 'PENDING'/);
  assert.match(
    migration,
    /set meta_data = jsonb_set\(coalesce\(meta_data, '\{\}'::jsonb\), '\{unselectable\}', 'true'::jsonb, true\)/
  );
  assert.doesNotMatch(migration, /set operations\s*=/);
});

test('Vindication Edge already grants the level-17 upgrade before the duplicate feat is hidden', () => {
  assert.equal(edge.name, 'Vindication Edge');
  assert.equal(edge.type, 'feat');
  assert.equal(edge.content_source_id, 400);
  assert.equal(edge.meta_data.unselectable, true);
  const upgrade = edge.operations[1];
  assert.equal(upgrade.type, 'conditional');
  assert.equal(upgrade.data.conditions[0].value, 17);
  assert.equal(upgrade.data.trueOperations[0].data.value, '2');
  assert.match(upgrade.data.trueOperations[1].data.text, /-2 status penalty/);
  assert.match(migration, /id = 43769 and name = 'Vindication Edge'/);
  assert.match(migration, /Vindication Edge does not contain the level-17 upgrade/);
});

test('Masterful Vindication is hidden from new feat choices while an existing selection still resolves', async () => {
  const hidden = { ...original, meta_data: { ...original.meta_data, unselectable: true } };
  assert.deepEqual(hidden.operations, original.operations);
  assert.equal(hidden.id, original.id);
  assert.equal(hidden.uuid, original.uuid);
  engine.setFixtures([{ table: 'ability_block', row: hidden }]);
  engine.resetVariables('CHARACTER');

  const filter = { type: 'ABILITY_BLOCK', abilityBlockType: 'feat', level: { max: 20 } };
  const choices = await engine.determineFilteredSelectionList('CHARACTER', 'choose-feat', filter);
  assert.deepEqual(choices, []);

  const result = await engine.runOperations(
    'CHARACTER',
    { path: 'saved-feat', node: { value: null, children: { 'choose-feat': { value: '43770', children: {} } } } },
    [
      {
        id: 'choose-feat',
        type: 'select',
        data: { title: 'Feat', modeType: 'FILTERED', optionType: 'ABILITY_BLOCK', optionsFilters: filter },
      },
    ]
  );
  assert.deepEqual(result[0].selection.options, []);
  assert.equal(result[0].result.source.id, 43770);
  assert.deepEqual(result[0].result.source.operations, original.operations);
  assert.deepEqual(engine.getVariable('CHARACTER', 'FEAT_IDS')?.value, ['43770']);
});
