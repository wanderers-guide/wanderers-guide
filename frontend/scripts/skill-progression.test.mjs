import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

let engine;
let fixtures;
let content;
const official = (id) => fixtures.find(({ table, row }) => table === 'ability_block' && row.id === id).row;
const rank = (name) => engine.compileProficiencyType(engine.getVariable('CHARACTER', name).value);

/** Exercise the real class controller and its public normalization boundary with official rows. */
async function calculate(character, packageContent = content) {
  const result = await engine._executeCharacterOperations({
    character,
    content: packageContent,
    context: 'CHARACTER-BUILDER',
  });
  engine.normalizeProficiencies('CHARACTER');
  assert.deepEqual(result.errors, []);
  return result;
}

/** Persist the same namespaced selection paths used by the builder, including repeated feat occurrences. */
function chooseFeature(character, featureId, value) {
  const path = `class-feature-${featureId}_${official(featureId).operations[0].id}`;
  character.operation_data.selections[path] = `${value}`;
  return `${path}_${value}`;
}

function chooseMastery(character, featureId, masteryId, master, expert) {
  const path = chooseFeature(character, featureId, masteryId);
  const [masterOperation, expertOperation] = official(masteryId).operations;
  character.operation_data.selections[`${path}_${masterOperation.id}`] = master;
  character.operation_data.selections[`${path}_${expertOperation.id}`] = expert;
}

function fighter(level, trained = ['SKILL_MEDICINE', 'SKILL_ARCANA', 'SKILL_NATURE']) {
  const character = {
    id: 1,
    level,
    details: { class: fixtures.find(({ table, row }) => table === 'class' && row.id === 20).row },
    inventory: { items: [] },
    content_sources: { enabled: [1, 14, 256] },
    operation_data: { selections: {} },
  };
  engine.getClassSkillTrainings('CHARACTER', 3).forEach((operation, index) => {
    character.operation_data.selections[`class_${operation.id}`] = trained[index];
  });
  return character;
}

before(async () => {
  engine = await createOperationEngine();
  fixtures = await readContentRows([
    { table: 'class', id: 20 },
    { table: 'trait', id: 1339 },
    ...[19297, 19298, 19301, 19302, 19379, 19380, 19381, 19385, 31987, 22191, 20544, 33685, 22339].map((id) => ({
      table: 'ability_block',
      id,
    })),
  ]);
  content = {
    abilityBlocks: fixtures.filter(({ table }) => table === 'ability_block').map(({ row }) => row),
    classes: fixtures.filter(({ table }) => table === 'class').map(({ row }) => row),
    traits: fixtures.filter(({ table }) => table === 'trait').map(({ row }) => row),
    ancestries: [],
    backgrounds: [],
    languages: [],
    items: [],
    spells: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    defaultSources: { INFO: [1, 14, 256], PAGE: [1, 14, 256] },
  };
});
after(async () => engine?.cleanup());
beforeEach(() => {
  engine.resetVariables();
  engine.setFixtures(fixtures);
});

test('Medic Dedication plus the level-7 increase reaches master in both official versions', async () => {
  for (const medicId of [31987, 22191]) {
    const character = fighter(7);
    chooseFeature(character, 19297, medicId);
    chooseFeature(character, 19381, 'SKILL_MEDICINE');
    await calculate(character);
    assert.equal(rank('SKILL_MEDICINE'), 'M', official(medicId).name);
  }
});

test('Medic Dedication Battle Medicine text agrees with the final master proficiency', async () => {
  const character = fighter(7);
  chooseFeature(character, 19297, 31987);
  chooseFeature(character, 19381, 'SKILL_MEDICINE');
  await calculate(character);
  assert.equal(rank('SKILL_MEDICINE'), 'M');
  const injections = engine.getVariable('CHARACTER', 'INJECT_TEXT').value.map(JSON.parse);
  const battleMedicine = injections.filter(({ type, id }) => type === 'feat' && id === 19946);
  assert.equal(battleMedicine.length, 1);
  assert.match(battleMedicine[0].text, /Once per hour/);
});

test('an early expert increase is not spent again when Skill Mastery reaches level 15', async () => {
  for (const masteryId of [20544, 33685, 22339]) {
    const character = fighter(10);
    chooseFeature(character, 19379, 'SKILL_MEDICINE');
    chooseMastery(character, 19301, masteryId, 'SKILL_MEDICINE', 'SKILL_ARCANA');
    await calculate(character);
    assert.equal(rank('SKILL_MEDICINE'), 'M', `${official(masteryId).name}, level 10`);
    assert.equal(rank('SKILL_ARCANA'), 'E');

    character.level = 15;
    await calculate(character);
    assert.equal(rank('SKILL_MEDICINE'), 'M', `${official(masteryId).name}, no new Medicine increase`);

    chooseFeature(character, 19385, 'SKILL_MEDICINE');
    await calculate(character);
    assert.equal(rank('SKILL_MEDICINE'), 'L', 'an actual level-15 increase still reaches legendary');
  }
});

test('Skill Mastery raises a skill trained by an earlier increase to expert, not master', async () => {
  const character = fighter(10, ['SKILL_MEDICINE', 'SKILL_NATURE', 'SKILL_SOCIETY']);
  chooseFeature(character, 19297, 22191);
  chooseFeature(character, 19379, 'SKILL_ARCANA');
  chooseMastery(character, 19301, 20544, 'SKILL_MEDICINE', 'SKILL_ARCANA');
  await calculate(character);
  assert.equal(rank('SKILL_MEDICINE'), 'M');
  assert.equal(rank('SKILL_ARCANA'), 'E');
});

test('repeated Skill Mastery selections retain independent choices and recalculate after removal', async () => {
  const character = fighter(12, ['SKILL_MEDICINE', 'SKILL_ARCANA', 'SKILL_NATURE']);
  chooseFeature(character, 19297, 22191);
  chooseMastery(character, 19301, 20544, 'SKILL_MEDICINE', 'SKILL_ARCANA');
  chooseMastery(character, 19302, 20544, 'SKILL_ARCANA', 'SKILL_NATURE');
  await calculate(character);
  assert.deepEqual(['SKILL_MEDICINE', 'SKILL_ARCANA', 'SKILL_NATURE'].map(rank), ['M', 'M', 'E']);

  const secondSelection = `class-feature-19302_${official(19302).operations[0].id}`;
  for (const path of Object.keys(character.operation_data.selections)) {
    if (path.startsWith(secondSelection)) delete character.operation_data.selections[path];
  }
  await calculate(character);
  assert.deepEqual(['SKILL_MEDICINE', 'SKILL_ARCANA', 'SKILL_NATURE'].map(rank), ['M', 'E', 'T']);
});

test('an earlier skill selector shows its historical transition after later feats and level changes', async () => {
  const character = fighter(15);
  chooseFeature(character, 19379, 'SKILL_MEDICINE');
  chooseMastery(character, 19301, 20544, 'SKILL_MEDICINE', 'SKILL_ARCANA');
  const result = await calculate(character);
  const earlyIncrease = result.ors.classFeatureResults.find(({ baseSource }) => baseSource.id === 19379);
  const medicine = earlyIncrease.baseResults[0].selection.options.find(({ variable }) => variable === 'SKILL_MEDICINE');
  assert.deepEqual(medicine._skill_preview, { from: 'T', to: 'E', limitedByLevel: false });
  const masteryFeature = result.ors.classFeatureResults.find(({ baseSource }) => baseSource.id === 19301);
  const masteryMedicine = masteryFeature.baseResults[0].result.results[0].selection.options.find(
    ({ variable }) => variable === 'SKILL_MEDICINE'
  );
  assert.deepEqual(masteryMedicine._skill_preview, { from: 'E', to: 'M', limitedByLevel: false });
});

test('saved early choices cannot become master merely because the character later reaches level 7', async () => {
  const character = fighter(7);
  chooseFeature(character, 19379, 'SKILL_MEDICINE');
  chooseFeature(character, 19380, 'SKILL_MEDICINE');
  const result = await calculate(character);
  assert.equal(rank('SKILL_MEDICINE'), 'E');
  const unavailableIncrease = result.ors.classFeatureResults.find(({ baseSource }) => baseSource.id === 19380);
  const medicine = unavailableIncrease.baseResults[0].selection.options.find(
    ({ variable }) => variable === 'SKILL_MEDICINE'
  );
  assert.deepEqual(medicine._skill_preview, { from: 'E', to: 'E', limitedByLevel: true });
  chooseFeature(character, 19381, 'SKILL_MEDICINE');
  await calculate(character);
  assert.equal(rank('SKILL_MEDICINE'), 'M');
});

test('removing a later rank grant reconstructs only the still-owned increases', async () => {
  const track = { path: 'progression', node: { value: null, children: {} } };
  const increase = { id: 'increase', type: 'adjValue', data: { variable: 'SKILL_MEDICINE', value: { value: '1' } } };
  const training = { id: 'training', type: 'adjValue', data: { variable: 'SKILL_MEDICINE', value: { value: 'T' } } };
  const give = { id: 'medic', type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: 22191 } };
  const remove = { id: 'remove', type: 'removeAbilityBlock', data: { type: 'feat', abilityBlockId: 22191 } };
  engine.setVariable('CHARACTER', 'LEVEL', 15);
  await engine.runOperations('CHARACTER', track, [training], { sourceLevel: 1 });
  await engine.runOperations('CHARACTER', track, [give], { sourceLevel: 2 });
  await engine.runOperations('CHARACTER', track, [increase], { sourceLevel: 7 });
  assert.equal(rank('SKILL_MEDICINE'), 'M');
  await engine.runOperations('CHARACTER', track, [remove], { sourceLevel: 10 });
  assert.equal(rank('SKILL_MEDICINE'), 'E');
  await engine.runOperations('CHARACTER', track, [give], { sourceLevel: 12 });
  assert.equal(rank('SKILL_MEDICINE'), 'E', 're-acquiring expert does not spend the level-7 increase twice');
  await engine.runOperations('CHARACTER', track, [{ ...increase, id: 'later-increase' }], { sourceLevel: 15 });
  assert.equal(rank('SKILL_MEDICINE'), 'M');
});

test('repeated full rebuilds preserve the same ranks, previews, and selected occurrence count', async () => {
  const character = fighter(15);
  chooseFeature(character, 19379, 'SKILL_MEDICINE');
  chooseMastery(character, 19301, 20544, 'SKILL_MEDICINE', 'SKILL_ARCANA');
  chooseMastery(character, 19302, 20544, 'SKILL_ARCANA', 'SKILL_NATURE');
  const first = await calculate(character);
  for (let index = 0; index < 10; index++) {
    const next = await calculate(character);
    assert.deepEqual(next.ors, first.ors);
    assert.deepEqual(['SKILL_MEDICINE', 'SKILL_ARCANA', 'SKILL_NATURE'].map(rank), ['M', 'M', 'E']);
  }
});

test('explicit grants above the normal cap and penalties retain their intended effects', async () => {
  const track = { path: 'exception', node: { value: null, children: {} } };
  engine.setVariable('CHARACTER', 'LEVEL', 1);
  await engine.runOperations('CHARACTER', track, [
    { id: 'exceptional-grant', type: 'adjValue', data: { variable: 'SKILL_MEDICINE', value: { value: 'M' } } },
    { id: 'bounded-increase', type: 'adjValue', data: { variable: 'SKILL_MEDICINE', value: { value: '1' } } },
  ]);
  assert.equal(rank('SKILL_MEDICINE'), 'M');
  await engine.runOperations('CHARACTER', track, [
    { id: 'penalty', type: 'adjValue', data: { variable: 'SKILL_MEDICINE', value: { value: '-1' } } },
  ]);
  assert.equal(rank('SKILL_MEDICINE'), 'E');
});

test('creature skill choices use their own level and lore variables, never their owner store', async () => {
  engine.setVariable('CHARACTER', 'LEVEL', 1);
  engine.addVariable('CHARACTER', 'prof', 'SKILL_LORE_OWNER_ONLY', { value: 'T', attribute: 'ATTRIBUTE_INT' });
  const choice = official(19381).operations[0];
  const creature = {
    id: 2,
    name: 'Progression fixture',
    level: 7,
    abilities_base: [],
    abilities_added: [],
    operations: [
      { id: 'expert', type: 'adjValue', data: { variable: 'SKILL_MEDICINE', value: { value: 'E' } } },
      {
        id: 'own-lore',
        type: 'createValue',
        data: { variable: 'SKILL_LORE_CREATURE_ONLY', type: 'prof', value: { value: 'T', attribute: 'ATTRIBUTE_INT' } },
      },
      choice,
    ],
    operation_data: { selections: { [`creature_${choice.id}`]: 'SKILL_MEDICINE' } },
  };
  const result = await engine._executeCreatureOperations({
    id: 'creature-fixture',
    creature,
    content,
    charStore: engine.exportVariableStore('CHARACTER'),
  });
  assert.equal(engine.compileProficiencyType(result.store.variables.SKILL_MEDICINE.value), 'M');
  const choices = result.ors.creatureResults.find((entry) => entry?.selection?.id === choice.id).selection.options;
  assert.ok(choices.some(({ variable }) => variable === 'SKILL_LORE_CREATURE_ONLY'));
  assert.ok(!choices.some(({ variable }) => variable === 'SKILL_LORE_OWNER_ONLY'));
  assert.deepEqual(choices.find(({ variable }) => variable === 'SKILL_MEDICINE')._skill_preview, {
    from: 'E',
    to: 'M',
    limitedByLevel: false,
  });
  assert.equal(engine.getVariable('CHARACTER', 'SKILL_MEDICINE').value.value, 'U');
});

test('full skill progression crosses the public calculation boundary without losing previews', async () => {
  const character = fighter(15);
  chooseFeature(character, 19379, 'SKILL_MEDICINE');
  chooseMastery(character, 19301, 20544, 'SKILL_MEDICINE', 'SKILL_ARCANA');
  const results = await engine.executeOperations(
    { type: 'CHARACTER', data: { character, content, context: 'CHARACTER-BUILDER' } },
    { directExecution: true }
  );
  assert.equal(rank('SKILL_MEDICINE'), 'M');
  assert.ok(!JSON.stringify(results).includes('_skill_context'));
  assert.ok(!JSON.stringify(engine.exportVariableStore('CHARACTER')).includes('skillContexts'));
  const earlyIncrease = results.classFeatureResults.find(({ baseSource }) => baseSource.id === 19379);
  assert.deepEqual(
    earlyIncrease.baseResults[0].selection.options.find(({ variable }) => variable === 'SKILL_MEDICINE')._skill_preview,
    { from: 'T', to: 'E', limitedByLevel: false }
  );
});

test('root content with level-gated increases uses the activation level, preserving custom progression', async () => {
  const increaseAt = (level) => ({
    id: `at-${level}`,
    type: 'conditional',
    data: {
      conditions: [{ id: `level-${level}`, name: 'LEVEL', operator: 'GREATER_THAN_OR_EQUALS', value: level }],
      trueOperations: [
        { id: `increase-${level}`, type: 'adjValue', data: { variable: 'SKILL_MEDICINE', value: { value: '1' } } },
      ],
      falseOperations: [],
    },
  });
  const packageContent = {
    ...content,
    sources: [
      {
        id: 999,
        name: 'Custom progression',
        operations: [
          { id: 'training', type: 'adjValue', data: { variable: 'SKILL_MEDICINE', value: { value: 'E' } } },
          increaseAt(7),
          increaseAt(15),
        ],
      },
    ],
  };
  for (const [level, expected] of [
    [6, 'E'],
    [7, 'M'],
    [14, 'M'],
    [15, 'L'],
  ]) {
    await calculate(fighter(level), packageContent);
    assert.equal(rank('SKILL_MEDICINE'), expected, `level ${level}`);
  }
});
