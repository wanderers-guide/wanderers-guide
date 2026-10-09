import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { CreatureSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

let engine;
let fixtures;
let tech;
const content = {
  abilityBlocks: [],
  items: [],
  classes: [],
  traits: [],
  ancestries: [],
  backgrounds: [],
  languages: [],
  spells: [],
  archetypes: [],
  versatileHeritages: [],
  classArchetypes: [],
  sources: [],
  defaultSources: { PAGE: [], INFO: [] },
};
const grant = (traitId) => ({ id: `grant-${traitId}`, type: 'giveTrait', data: { traitId } });
const character = (operations, selections = {}) => ({
  id: 990401,
  name: 'Actor trait fixture',
  level: 1,
  details: {},
  inventory: { items: [] },
  operation_data: { selections },
  options: { custom_operations: true },
  custom_operations: operations,
});

before(async () => {
  engine = await createOperationEngine({ exportJson: true });
  fixtures = await readContentRows([
    ...[4506, 1630, 1846, 4213, 2937, 1467, 1339, 2410, 2411].map((id) => ({ table: 'trait', id })),
    { table: 'ability_block', id: 21091 },
    { table: 'item', id: 21284 },
  ]);
  tech = fixtures.find(({ row }) => row.id === 4506).row;
  assert.equal(tech.name, 'Tech');
  assert.equal(tech.meta_data.creature_trait, false);
  content.traits = fixtures.filter(({ table }) => table === 'trait').map(({ row }) => row);
});
after(async () => {
  await engine?.cleanup();
});
beforeEach(() => {
  engine.resetVariables();
  engine.clearDeferredOperations();
  engine.setFixtures(fixtures);
});

test('an explicitly granted ordinary Tech trait survives builder and sheet calculation', async () => {
  const entity = character([grant(tech.id)]);
  const original = structuredClone({ entity, fixtures });
  for (const context of ['CHARACTER-BUILDER', 'CHARACTER-SHEET']) {
    const result = await engine._executeCharacterOperations({ character: entity, content, context });
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.store.variables.TRAIT_NAMES.value, ['TECH']);
  }
  assert.deepEqual({ entity, fixtures }, original, 'grants do not rewrite saved operations or shared traits');
});

test('calculated JSON exports include explicitly granted Tech without changing the saved character', async () => {
  const entity = character([grant(tech.id)]);
  const original = structuredClone(entity);
  const result = await engine._executeCharacterOperations({ character: entity, content, context: 'CHARACTER-SHEET' });
  engine.importVariableStore('CHARACTER', result.store);
  const exported = await engine.getJsonV4Content(entity, 'CHARACTER', content);
  assert.deepEqual(
    exported.character_traits.map(({ id }) => id),
    [tech.id]
  );
  assert.deepEqual(entity, original);
});

/** Run a complete character and load exactly the returned calculation store. */
async function calculate(entity, context = 'CHARACTER-SHEET') {
  const result = await engine._executeCharacterOperations({ character: entity, content, context });
  assert.deepEqual(result.errors, []);
  engine.importVariableStore('CHARACTER', result.store);
  return result;
}

test('filtered trait choices retain saved IDs and do not turn ordinary traits into ancestry origins', async () => {
  const choice = {
    id: 'choose-trait',
    type: 'select',
    data: {
      title: 'Trait',
      modeType: 'FILTERED',
      optionType: 'TRAIT',
      optionsFilters: { id: 'traits', type: 'TRAIT' },
    },
  };
  const entity = character([choice], { 'character_choose-trait': String(tech.id) });
  const original = structuredClone(entity);
  for (const context of ['CHARACTER-BUILDER', 'CHARACTER-SHEET']) {
    await calculate(entity, context);
    assert.deepEqual(engine.getVariable('CHARACTER', 'TRAIT_NAMES').value, ['TECH']);
    assert.deepEqual(
      engine.getAllActorTraitVariables('CHARACTER').map(({ value }) => value),
      [tech.id]
    );
    assert.deepEqual(engine.getAllAncestryTraitVariables('CHARACTER'), []);
  }
  assert.deepEqual(entity, original);
});

test('legacy category memberships and origin-filtered feat lists stay separate from ordinary actor traits', async () => {
  const feats = [
    { id: 990402, name: 'Dwarf fixture feat', type: 'feat', level: 1, traits: [1467] },
    { id: 990403, name: 'Fighter fixture feat', type: 'feat', level: 1, traits: [1339] },
    { id: 990404, name: 'Tech fixture feat', type: 'feat', level: 1, traits: [4506] },
  ];
  engine.setFixtures([...fixtures, ...feats.map((row) => ({ table: 'ability_block', row }))]);
  await calculate(character([grant(1467), grant(1339), grant(4506)]));
  assert.deepEqual(
    engine.getAllAncestryTraitVariables('CHARACTER').map(({ value }) => value),
    [1467]
  );
  assert.deepEqual(
    engine.getAllClassTraitVariables('CHARACTER').map(({ value }) => value),
    [1339]
  );
  assert.deepEqual(
    engine.getAllActorTraitVariables('CHARACTER').map(({ value }) => value),
    [1467, 4506]
  );
  const filter = { id: 'feats', type: 'ABILITY_BLOCK', abilityBlockType: 'feat', level: { max: 1 } };
  const ancestry = await engine.determineFilteredSelectionList('CHARACTER', 'ancestry', {
    ...filter,
    isFromAncestry: true,
  });
  const classes = await engine.determineFilteredSelectionList('CHARACTER', 'class', { ...filter, isFromClass: true });
  assert.deepEqual(
    ancestry.map(({ id }) => id),
    [990402]
  );
  assert.deepEqual(
    classes.map(({ id }) => id),
    [990403]
  );
});

test('Divine Disciple retains its real saved Holy and Unholy choices and grants the exact general traits', async () => {
  const disciple = fixtures.find(({ row }) => row.id === 21091).row;
  const choice = disciple.operations.find(({ data }) => data.title === 'Select Holy or Unholy');
  const original = structuredClone(disciple);
  for (const [id, name] of [
    [1630, 'HOLY'],
    [1846, 'UNHOLY'],
  ]) {
    const option = choice.data.optionsPredefined.find(({ operations }) => operations[0].data.traitId === id);
    const entity = character([choice], { [`character_${choice.id}`]: option.id });
    await calculate(entity);
    assert.deepEqual(engine.getVariable('CHARACTER', 'TRAIT_NAMES').value, [name]);
    assert.deepEqual(
      engine.getAllActorTraitVariables('CHARACTER').map(({ value }) => value),
      [id]
    );
    assert.deepEqual(engine.getAllAncestryTraitVariables('CHARACTER'), []);
    const exported = await engine.getJsonV4Content(entity, 'CHARACTER', content);
    assert.deepEqual(
      exported.character_traits.map(({ id }) => id),
      [id]
    );
  }
  assert.deepEqual(disciple, original);
});

test('companion-only direct grants keep their legacy membership while filtered selections stay unchanged', async () => {
  await calculate(character([grant(2937)]));
  assert.deepEqual(
    engine.getAllAncestryTraitVariables('CHARACTER').map(({ value }) => value),
    [2937]
  );
  const choice = {
    id: 'companion-trait',
    type: 'select',
    data: {
      title: 'Trait',
      modeType: 'FILTERED',
      optionType: 'TRAIT',
      optionsFilters: { id: 'traits', type: 'TRAIT' },
    },
  };
  await calculate(character([choice], { 'character_companion-trait': '2937' }));
  assert.deepEqual(engine.getVariable('CHARACTER', 'TRAIT_NAMES').value, []);
  assert.deepEqual(engine.getAllActorTraitVariables('CHARACTER'), []);
});

test('duplicate grants deduplicate display and export without colliding ordinary IDs', async () => {
  const first = { ...tech, id: 990405, name: 'Trait-1' };
  const second = { ...tech, id: 990406, name: 'Trait1' };
  engine.setFixtures([...fixtures, ...[first, second].map((row) => ({ table: 'trait', row }))]);
  const entity = character([
    grant(first.id),
    grant(second.id),
    grant(tech.id),
    { ...grant(tech.id), id: 'independent-tech' },
  ]);
  await calculate(entity);
  assert.deepEqual(
    engine.getAllActorTraitVariables('CHARACTER').map(({ value }) => value),
    [first.id, second.id, tech.id]
  );
  assert.equal(engine.getVariable('CHARACTER', `TRAIT_ACTOR_${first.id}_IDS`).value, first.id);
  assert.equal(engine.getVariable('CHARACTER', `TRAIT_ACTOR_${second.id}_IDS`).value, second.id);
  assert.equal(engine.getVariable('CHARACTER', 'TRAIT_NAMES').value.filter((name) => name === 'TECH').length, 1);
  engine.addVariable('CHARACTER', 'num', 'TRAIT_ANCESTRY_LEGACY_ALIAS', tech.id);
  const exported = await engine.getJsonV4Content(entity, 'CHARACTER', {
    ...content,
    traits: [...content.traits, first, second],
  });
  assert.deepEqual(
    exported.character_traits.map(({ id }) => id),
    [first.id, second.id, tech.id]
  );
});

test('removing one owner preserves an independent Tech grant and final removal clears it', async () => {
  const template = fixtures.find(({ row }) => row.id === 21091).row;
  const parent = { ...template, id: 990407, name: 'Trait grant fixture', operations: [grant(tech.id)] };
  engine.setFixtures([...fixtures, { table: 'ability_block', row: parent }]);
  const give = { id: 'parent', type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: parent.id } };
  const remove = { id: 'remove-parent', type: 'removeAbilityBlock', data: { type: 'feat', abilityBlockId: parent.id } };
  await calculate(character([give, { ...grant(tech.id), id: 'independent-tech' }, remove]));
  assert.deepEqual(
    engine.getAllActorTraitVariables('CHARACTER').map(({ value }) => value),
    [tech.id]
  );
  assert.deepEqual(engine.getVariable('CHARACTER', 'TRAIT_NAMES').value, ['TECH']);
  await calculate(character([give, remove]));
  assert.deepEqual(engine.getAllActorTraitVariables('CHARACTER'), []);
  assert.deepEqual(engine.getVariable('CHARACTER', 'TRAIT_NAMES').value, []);
});

test('ordinary granted trait names are available to later conditionals, but item traits are not actor grants', async () => {
  const condition = {
    id: 'tech-check',
    type: 'conditional',
    data: {
      conditions: [{ id: 'has-tech', name: 'TRAIT_NAMES', type: 'list-str', operator: 'INCLUDES', value: 'Tech' }],
      trueOperations: [{ id: 'true', type: 'setValue', data: { variable: 'MAX_HEALTH_BONUS', value: 7 } }],
      falseOperations: [{ id: 'false', type: 'setValue', data: { variable: 'MAX_HEALTH_BONUS', value: 1 } }],
    },
  };
  const granted = await calculate(character([grant(tech.id), condition]));
  assert.equal(granted.store.variables.MAX_HEALTH_BONUS.value, 7);
  const ungranted = await calculate(character([condition]));
  assert.equal(ungranted.store.variables.MAX_HEALTH_BONUS.value, 1);
  const flash = fixtures.find(({ table }) => table === 'item').row;
  assert(flash.traits.includes(tech.id));
  const equipped = character([condition]);
  equipped.inventory.items = [{ id: 'equipped-tech-item', item: flash, is_equipped: true, is_invested: true }];
  const carrying = await calculate(equipped);
  assert.equal(carrying.store.variables.MAX_HEALTH_BONUS.value, 1);
  assert.deepEqual(engine.getAllActorTraitVariables('CHARACTER'), []);
});

test('creature calculations retain the ordinary Tech trait alongside legacy Construct and Mindless traits', async () => {
  const creature = CreatureSchema.parse({
    id: 990408,
    name: 'Tech creature fixture',
    level: 4,
    rarity: 'COMMON',
    created_at: '',
    version: '1.0',
    content_source_id: 990408,
    deprecated: false,
    details: { description: '', conditions: [] },
    experience: 0,
    hp_current: 1,
    hp_temp: 0,
    stamina_current: 0,
    resolve_current: 0,
    notes: null,
    roll_history: null,
    spells: null,
    meta_data: {},
    operation_data: { selections: {} },
    inventory: { items: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
    abilities_base: [],
    abilities_added: [],
    operations: [grant(2410), grant(2411), grant(4506)],
  });
  const original = structuredClone(creature);
  engine.setVariable('CHARACTER', 'STARFINDER', true);
  engine.setVariable('CHARACTER', 'PATHFINDER', false);
  const result = await engine._executeCreatureOperations({
    id: 'ACTOR_TRAIT_CREATURE',
    creature,
    content,
    charStore: engine.exportVariableStore('CHARACTER'),
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(engine.getVariable('ACTOR_TRAIT_CREATURE', 'TRAIT_NAMES').value, ['CONSTRUCT', 'MINDLESS', 'TECH']);
  assert.deepEqual(
    engine.getAllActorTraitVariables('ACTOR_TRAIT_CREATURE').map(({ value }) => value),
    [2410, 2411, 4506]
  );
  assert.deepEqual(
    engine.getAllAncestryTraitVariables('ACTOR_TRAIT_CREATURE').map(({ value }) => value),
    [2410, 2411]
  );
  assert.deepEqual(creature, original);
});
