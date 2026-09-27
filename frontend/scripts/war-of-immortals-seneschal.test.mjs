import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const sourceIds = [1, 185, 400, 420, 493];
const tables = {
  abilityBlocks: 'ability_block',
  classes: 'class',
  traits: 'trait',
  ancestries: 'ancestry',
  backgrounds: 'background',
  languages: 'language',
  items: 'item',
  spells: 'spell',
  archetypes: 'archetype',
  versatileHeritages: 'versatile_heritage',
};
const featureId = 4615129260014645;
const patronSelectionId = '5bb6ce93-064a-43fa-b51a-911d7561ba95';
const spellSelectionId = 'bbeee74e-5424-471f-b1d7-8c74b3b12e14';

let engine;
let content;
let originalFilter;
let correctedFilter;

before(async () => {
  const [rows, [{ row: seneschal }], sources] = await Promise.all([
    readContentRows(Object.values(tables).map((table) => ({ table, sourceIds }))),
    readContentRows([{ table: 'class_archetype', id: 14 }]),
    readContentRows(sourceIds.map((id) => ({ table: 'content_source', id }))),
  ]);
  const migration = await readFile(
    new URL('../../supabase/migrations/20260927110000_war_of_immortals_seneschal_spells.sql', import.meta.url),
    'utf8'
  );
  correctedFilter = JSON.parse(migration.match(/corrected_filter constant jsonb := '([^']+)'::jsonb/)[1]);
  const replacement = seneschal.feature_adjustments.find((entry) => entry.data?.id === featureId);
  assert.equal(replacement.type, 'REPLACE');
  assert.equal(replacement.prev_id, 21164);
  const selectedSpell = replacement.data.operations.find((entry) => entry.id === spellSelectionId);
  originalFilter = structuredClone(selectedSpell.data.optionsFilters);
  assert.deepEqual(originalFilter.level, { max: 1 });
  assert.deepEqual(originalFilter.traditions, []);
  assert.equal(originalFilter.spellData.castingSource, 'WITCH');
  assert.deepEqual(correctedFilter, {
    ...originalFilter,
    level: { min: 1, max: 1 },
    rarity: 'COMMON',
    traditionFromSelection: {
      key: `class-feature-${featureId}_${patronSelectionId}`,
      castingSource: 'WITCH',
    },
  });
  selectedSpell.data.optionsFilters = correctedFilter;

  content = Object.fromEntries(
    Object.entries(tables).map(([key, table]) => [
      key,
      rows.filter((entry) => entry.table === table).map((entry) => entry.row),
    ])
  );
  content.sources = sources.map((entry) => entry.row);
  content.classArchetypes = [seneschal];
  content.defaultSources = { PAGE: sourceIds, INFO: sourceIds };
  engine = await createOperationEngine();
  engine.setFixtures(rows);
});

after(async () => {
  await engine?.cleanup();
});

function witch(patronId, spellId) {
  const selections = {
    [`class-feature-${featureId}_${patronSelectionId}`]: String(patronId),
  };
  if (spellId !== undefined) {
    selections[`class-feature-${featureId}_${spellSelectionId}`] = String(spellId);
  }
  return {
    id: 1,
    level: 1,
    hp_current: 12,
    details: {
      class: content.classes.find((row) => row.id === 27),
      class_archetype: content.classArchetypes[0],
      conditions: [],
    },
    inventory: { items: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
    content_sources: { enabled: sourceIds },
    meta_data: { reset_hp: false, active_modes: [] },
    operation_data: { selections },
    options: { custom_operations: true, ignore_bulk_limit: true },
    custom_operations: [],
  };
}

async function spellSelection(patronId, spellId) {
  const result = await engine._executeCharacterOperations({
    character: witch(patronId, spellId),
    content,
    context: 'CHARACTER-SHEET',
  });
  const feature = result.ors.classFeatureResults.find((entry) => entry.baseSource.id === featureId);
  assert.ok(feature, 'Seneschal Knowledge must replace Patron');
  const selection = feature.baseResults.find((entry) => entry?.selection?.id === spellSelectionId);
  assert.ok(selection, 'Seneschal spell choice must render');
  return { result, selection };
}

test('Seneschal Knowledge offers common 1st-rank spells from the selected patron tradition', async () => {
  for (const [patronId, tradition] of [
    [34028, 'arcane'],
    [34027, 'divine'],
    [34031, 'occult'],
    [34030, 'primal'],
    [34036, 'primal'],
    [34035, 'primal'],
    [40530, 'divine'],
    [40527, 'occult'],
    [40526, 'primal'],
    [40529, 'divine'],
    [34032, 'occult'],
    [40528, 'occult'],
    [34033, 'primal'],
    [41047, 'occult'],
    [34037, 'primal'],
    [34029, 'occult'],
  ]) {
    const { result, selection } = await spellSelection(patronId);
    assert.deepEqual(result.errors, []);
    assert.ok(selection.selection.options.length > 0, tradition);
    for (const spell of selection.selection.options) {
      assert.equal(spell.rank, 1, spell.name);
      assert.equal(spell.rarity, 'COMMON', spell.name);
      assert.ok(
        spell.traditions.some((entry) => entry.toLowerCase() === tradition),
        spell.name
      );
      assert.equal(spell._meta_data.castingSource, 'WITCH');
    }
  }
});

test('Seneschal Knowledge keeps a saved legal spell selection and its operation IDs', async () => {
  const choice = content.spells.find(
    (spell) => spell.rank === 1 && spell.rarity === 'COMMON' && spell.traditions.includes('arcane')
  );
  assert.ok(choice);
  const { result, selection } = await spellSelection(34028, choice.id);
  assert.deepEqual(result.errors, []);
  assert.equal(selection.result?.source?.id, choice.id);
  const knownSpells = (result.store.variables.SPELL_DATA?.value ?? []).map((entry) => JSON.parse(entry));
  assert.ok(knownSpells.some((entry) => entry.spellId === choice.id && entry.castingSource === 'WITCH'));
});

test('unmodified spell filters retain their prior all-tradition and cantrip behavior', async () => {
  await spellSelection(34028);
  const originalOptions = await engine.determineFilteredSelectionList('CHARACTER', spellSelectionId, originalFilter);
  assert.ok(originalOptions.some((spell) => spell.rank === 0));
  assert.ok(originalOptions.some((spell) => spell.rank === 1 && !spell.traditions.includes('arcane')));
});
