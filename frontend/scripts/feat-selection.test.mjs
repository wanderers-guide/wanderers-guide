import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';

// Official record IDs, levels, and traits from data/data.sql. Only the fields
// consumed by selection are needed; these fixtures do not replace schema tests.
const inspiredMemory = { id: 58076, name: 'Inspired Memory', type: 'feat', level: 3, traits: [5146, 1438] };
const flexibleNexus = { id: 58080, name: 'Flexible Nexus', type: 'feat', level: 6, traits: [5146] };
const reincarnatedRidiculer = {
  id: 39244,
  name: 'Reincarnated Ridiculer',
  type: 'feat',
  level: 5,
  traits: [4037, 2969],
};
const dwarfFeat = { id: -1, name: 'Dwarf test feat', type: 'feat', level: 1, traits: [1467] };
const elfFeat = { id: -2, name: 'Elf test feat', type: 'feat', level: 1, traits: [1348] };
const animistFeat = { id: -3, name: 'Animist test feat', type: 'feat', level: 2, traits: [4078] };
const wanderingFeat = { id: -4, name: 'Wandering test feat', type: 'feat', level: 2, traits: [4078, 4076] };
const higherAnimistFeat = { id: -5, name: 'Higher animist test feat', type: 'feat', level: 6, traits: [4078] };
const highestAnimistFeat = { id: -6, name: 'Highest animist test feat', type: 'feat', level: 10, traits: [4078] };
const feats = [inspiredMemory, flexibleNexus, reincarnatedRidiculer, dwarfFeat, elfFeat];
const traitRows = [
  { id: 1438, name: 'Skill' },
  { id: 2969, name: 'All Ancestries' },
  { id: 1467, name: 'Dwarf' },
  { id: 4076, name: 'Wandering' },
  { id: 4078, name: 'Animist' },
  { id: 4079, name: 'Exemplar' },
];
let engine;

/** Replace only the content boundary; selection and variable storage stay real. */
function setContent(rows) {
  engine.setFixtures([
    ...rows.map((row) => ({ table: 'ability_block', row })),
    ...traitRows.map((row) => ({ table: 'trait', row })),
  ]);
}

/** Run the same filtered-selection entry point used by character operations. */
async function select(overrides = {}) {
  const options = await engine.determineFilteredSelectionList('CHARACTER', 'test-operation', {
    id: 'test-filter',
    type: 'ABILITY_BLOCK',
    abilityBlockType: 'feat',
    traits: [],
    level: { max: 6 },
    ...overrides,
  });
  return options.map((option) => option.id);
}

before(async () => {
  engine = await createOperationEngine();
});
after(async () => {
  await engine?.cleanup();
});
beforeEach(() => {
  engine.resetVariables('CHARACTER');
  engine.addVariable('CHARACTER', 'num', 'TRAIT_ARCHETYPE_LIVING_NEXUS', 5146);
  engine.addVariable('CHARACTER', 'num', 'TRAIT_ANCESTRY_DWARF', 1467);
  setContent(feats);
});

test('the class-feat tab predicate excludes archetype skill feats', () => {
  assert.equal(engine.hasArchetypeClassFeatTraits(inspiredMemory.traits, [5146]), false);
  assert.equal(engine.hasArchetypeClassFeatTraits(flexibleNexus.traits, [5146]), true);
  assert.equal(engine.hasArchetypeClassFeatTraits(flexibleNexus.traits, []), false);
  assert.equal(engine.hasArchetypeClassFeatTraits(null, [5146]), false);
});

test('Free Archetype offers class feats from acquired archetypes within its level cap', async () => {
  assert.deepEqual(await select({ isFromArchetype: true }), [flexibleNexus.id]);
  assert.deepEqual(await select({ isFromArchetype: true, level: { max: 4 } }), []);
  engine.removeVariable('CHARACTER', 'TRAIT_ARCHETYPE_LIVING_NEXUS');
  assert.deepEqual(await select({ isFromArchetype: true }), []);
});

test('ordinary and explicitly archetype-scoped skill selections retain Inspired Memory', async () => {
  for (const skillTrait of ['Skill', 1438]) {
    assert.deepEqual(await select({ traits: [skillTrait] }), [inspiredMemory.id]);
    assert.deepEqual(await select({ traits: [skillTrait], isFromArchetype: true }), [inspiredMemory.id]);
  }
});

test('non-feat archetype origin filters do not inherit the class-feat restriction', async () => {
  const action = { ...inspiredMemory, type: 'action' };
  setContent([action]);
  assert.deepEqual(await select({ abilityBlockType: 'action', isFromArchetype: true }), [action.id]);
});

test('ancestry selections include All Ancestries feats alongside the selected ancestry', async () => {
  assert.deepEqual(await select({ isFromAncestry: true }), [reincarnatedRidiculer.id, dwarfFeat.id]);
  assert.deepEqual(await select({ isFromAncestry: true, level: { max: 4 } }), [dwarfFeat.id]);
  assert.deepEqual(await select({ isFromAncestry: true, traits: ['Dwarf'] }), [dwarfFeat.id]);
  engine.removeVariable('CHARACTER', 'TRAIT_ANCESTRY_DWARF');
  engine.addVariable('CHARACTER', 'num', 'TRAIT_ANCESTRY_ELF', 1348);
  assert.deepEqual(await select({ isFromAncestry: true }), [reincarnatedRidiculer.id, elfFeat.id]);
});

test('All Ancestries does not grant access to unrelated heritages or hidden feats', async () => {
  const universalHeritage = { ...reincarnatedRidiculer, type: 'heritage' };
  const dwarfHeritage = { ...dwarfFeat, type: 'heritage' };
  setContent([universalHeritage, dwarfHeritage, { ...reincarnatedRidiculer, meta_data: { unselectable: true } }]);
  assert.deepEqual(await select({ abilityBlockType: 'heritage', isFromAncestry: true }), [dwarfHeritage.id]);
  assert.deepEqual(await select({ isFromAncestry: true }), []);
});

test('half-level feat choices exclude Wandering feats without affecting other choices', async () => {
  setContent([animistFeat, wanderingFeat, higherAnimistFeat, highestAnimistFeat]);
  const filters = {
    traits: ['Animist'],
    excludedTraits: [4076],
    level: { max: '{{LEVEL/2}}' },
  };

  engine.setVariable('CHARACTER', 'LEVEL', 6);
  assert.equal(engine.getVariable('CHARACTER', 'LEVEL')?.value, 6);
  assert.deepEqual(await select({ traits: ['Animist'], level: { max: 6 } }), [
    animistFeat.id,
    wanderingFeat.id,
    higherAnimistFeat.id,
  ]);
  assert.deepEqual(await select(filters), [animistFeat.id]);

  engine.setVariable('CHARACTER', 'LEVEL', 12);
  assert.deepEqual(await select(filters), [animistFeat.id, higherAnimistFeat.id]);

  engine.setVariable('CHARACTER', 'LEVEL', 20);
  assert.deepEqual(await select(filters), [animistFeat.id, higherAnimistFeat.id, highestAnimistFeat.id]);
  assert.deepEqual(await select({ ...filters, excludedTraits: ['Wandering'] }), [
    animistFeat.id,
    higherAnimistFeat.id,
    highestAnimistFeat.id,
  ]);
  assert.deepEqual(
    engine.OperationSelectFiltersAbilityBlockSchema.parse({
      id: 'animist-feat-choice',
      type: 'ABILITY_BLOCK',
      abilityBlockType: 'feat',
      ...filters,
    }).excludedTraits,
    [4076]
  );
});

test('a saved Wandering feat remains selected but is unavailable for new choices', async () => {
  setContent([animistFeat, wanderingFeat]);
  engine.setVariable('CHARACTER', 'LEVEL', 12);
  const operation = {
    id: 'saved-animist-choice',
    type: 'select',
    data: {
      title: 'Select a Feat',
      modeType: 'FILTERED',
      optionType: 'ABILITY_BLOCK',
      optionsFilters: {
        id: 'saved-animist-filter',
        type: 'ABILITY_BLOCK',
        abilityBlockType: 'feat',
        traits: ['Animist'],
        excludedTraits: [4076],
        level: { max: '{{LEVEL/2}}' },
      },
    },
  };
  const track = {
    path: 'saved-animist',
    node: { value: null, children: { [operation.id]: { value: `${wanderingFeat.id}`, children: {} } } },
  };
  const [result] = await engine.runOperations('CHARACTER', track, [operation]);
  assert.ok(!result.selection.options.some(({ id }) => id === wanderingFeat.id));
  assert.equal(result.result.source.id, wanderingFeat.id);
  assert.ok(engine.getVariable('CHARACTER', 'FEAT_IDS')?.value.includes(`${wanderingFeat.id}`));
});

test('War of Immortals archetype choices use their guarded half-level filters', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20260929050000_war_of_immortals_archetype_choices.sql', import.meta.url),
    'utf8'
  );
  const repairs = JSON.parse(migration.split('$choices$')[1]);
  assert.deepEqual(
    repairs.map(({ id }) => id),
    [39210, 39205]
  );
  assert.match(migration, /status->>'state' = 'PENDING'/);
  const rows = await readContentRows(
    [39210, 39205, 38747, 38754, 38763, 38783, 38791, 38798].map((id) => ({ table: 'ability_block', id }))
  );
  const sourceRows = rows.map(({ row }) => row);
  const contentRows = structuredClone(sourceRows);
  setContent(contentRows);

  for (const repair of repairs) {
    const feat = contentRows.find(({ id }) => id === repair.id);
    assert.equal(feat.name, repair.name);
    assert.equal(feat.content_source_id, 400);
    const operations = feat.operations.filter(({ id }) => id === repair.operation_id);
    assert.equal(operations.length, 1);
    const filters = operations[0].data.optionsFilters;
    assert.equal(filters.id, repair.filter_id);
    assert.deepEqual(filters.traits, [repair.trait]);
    assertReviewedTransition(filters.level.max, 10, '{{LEVEL/2}}', `${feat.name} level filter`);
    assertReviewedTransition(filters.excludedTraits, undefined, repair.excluded_traits, `${feat.name} trait exclusion`);
    filters.level.max = '{{LEVEL/2}}';
    if (repair.excluded_traits) filters.excludedTraits = repair.excluded_traits;
  }
  assert.deepEqual(
    sourceRows,
    rows.map(({ row }) => row),
    'the checked-in content fixture is not modified'
  );

  const animist = contentRows.find(({ id }) => id === 39210).operations[0].data.optionsFilters;
  const exemplar = contentRows.find(({ id }) => id === 39205).operations[0].data.optionsFilters;
  for (const [level, animistExpected, exemplarExpected] of [
    [6, [38747], [38783]],
    [12, [38747], [38783, 38791]],
    [20, [38747, 38763], [38783, 38791, 38798]],
  ]) {
    engine.setVariable('CHARACTER', 'LEVEL', level);
    assert.deepEqual(
      (await select(animist)).sort((a, b) => a - b),
      animistExpected,
      `Animist's Power at level ${level}`
    );
    assert.deepEqual(
      (await select(exemplar)).sort((a, b) => a - b),
      exemplarExpected,
      `Advanced Glory at level ${level}`
    );
  }
});
