import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createOperationEngine } from './operation-test-harness.mjs';

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
const feats = [inspiredMemory, flexibleNexus, reincarnatedRidiculer, dwarfFeat, elfFeat];
const traitRows = [
  { id: 1438, name: 'Skill' },
  { id: 2969, name: 'All Ancestries' },
  { id: 1467, name: 'Dwarf' },
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
