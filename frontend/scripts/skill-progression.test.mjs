import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

let engine;
let fixtures;
let content;
let skillChoices;
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
    { table: 'ancestry', id: 8 },
    { table: 'language', id: 81 },
    { table: 'trait', id: 1339 },
    { table: 'trait', id: 1436 },
    { table: 'trait', id: 2399 },
    { table: 'ability_block', id: 20753 },
    { table: 'ability_block', id: 22505 },
    { table: 'ability_block', id: 26793 },
    ...[19297, 19298, 19301, 19302, 19379, 19380, 19381, 19385, 31987, 22191, 20544, 33685, 22339].map((id) => ({
      table: 'ability_block',
      id,
    })),
  ]);
  content = {
    abilityBlocks: fixtures.filter(({ table }) => table === 'ability_block').map(({ row }) => row),
    classes: fixtures.filter(({ table }) => table === 'class').map(({ row }) => row),
    traits: fixtures.filter(({ table }) => table === 'trait').map(({ row }) => row),
    ancestries: fixtures.filter(({ table }) => table === 'ancestry').map(({ row }) => row),
    backgrounds: [],
    languages: fixtures.filter(({ table }) => table === 'language').map(({ row }) => row),
    items: [],
    spells: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    defaultSources: { INFO: [1, 14, 256], PAGE: [1, 14, 256] },
  };
  const migration = await readFile(
    new URL('../../supabase/migrations/20261118000000_shared_skill_choices.sql', import.meta.url),
    'utf8'
  );
  skillChoices = JSON.parse(migration.split('$skill_choices$')[1]);
  for (const record of skillChoices) {
    const row = official(record.id);
    const gate = row.operations[0];
    assert.equal(gate.id, record.gate);
    for (const branch of [gate.data.trueOperations, gate.data.falseOperations]) {
      for (const { index, identity } of record.choices) {
        assert.ok(identity.previousIds.includes(branch[index].id));
        branch[index].data.skillChoice = identity;
        assert.deepEqual(engine.OperationSchema.parse(branch[index]).data.skillChoice, identity);
      }
    }
  }
});
after(async () => engine?.cleanup());
beforeEach(() => {
  engine.resetVariables();
  engine.setFixtures(fixtures);
});

/** Build the actual saved paths for the Common Core heritage and both of its rank branches. */
function skilledHuman() {
  const ancestry = content.ancestries[0];
  const heritage = official(20753);
  const section = engine.getAncestrySections('CHARACTER', ancestry, false)[0];
  const sectionPath = `ancestry-section-${section.id}_${section.operations[0].id}`;
  const skillPath = `${sectionPath}_${heritage.id}`;
  const { falseOperations, trueOperations } = heritage.operations[0].data;
  const character = {
    id: 1,
    level: 4,
    details: { ancestry },
    inventory: { items: [] },
    content_sources: { enabled: [3] },
    operation_data: { selections: { [sectionPath]: String(heritage.id) } },
  };
  return {
    character,
    skillPath,
    trainedId: falseOperations[0].id,
    expertId: trueOperations[0].id,
    stableId: trueOperations[0].data.skillChoice.id,
  };
}

test('Skilled Human keeps the trained skill at level 5 after reloading a saved character', async () => {
  const { character, skillPath, trainedId } = skilledHuman();
  character.operation_data.selections[`${skillPath}_${trainedId}`] = 'SKILL_MEDICINE';
  await calculate(character);
  assert.equal(rank('SKILL_MEDICINE'), 'T');

  character.level = 5;
  const saved = JSON.stringify(character);
  for (let load = 0; load < 2; load++) {
    engine.resetVariables();
    const reloaded = JSON.parse(saved);
    await calculate(reloaded);
    assert.equal(rank('SKILL_MEDICINE'), 'E');
    assert.equal(JSON.stringify(reloaded), saved);
  }
});

test('Skilled Human retains an existing Expert choice across levels and clears both saved paths', async () => {
  const { character, skillPath, stableId, trainedId, expertId } = skilledHuman();
  const selections = character.operation_data.selections;
  selections[`${skillPath}_${expertId}`] = 'SKILL_MEDICINE';
  await calculate(character);
  assert.equal(rank('SKILL_MEDICINE'), 'T', 'Expert-only saves also work below level 5');

  selections[`${skillPath}_${trainedId}`] = 'SKILL_ARCANA';
  for (const [level, expectedRank] of [
    [5, 'E'],
    [4, 'T'],
    [5, 'E'],
  ]) {
    engine.resetVariables();
    character.level = level;
    const result = await calculate(character);
    assert.equal(rank('SKILL_MEDICINE'), expectedRank);
    assert.equal(rank('SKILL_ARCANA'), 'U');
    const skill = result.ors.ancestrySectionResults[0].baseResults[0].result.results[0].result.results[0].selection;
    assert.deepEqual(skill.aliases, [stableId, expertId, trainedId]);
    assert.equal(skill.id, stableId);
  }

  selections[`${skillPath}_${stableId}`] = 'SKILL_NATURE';
  await calculate(JSON.parse(JSON.stringify(character)));
  assert.equal(rank('SKILL_NATURE'), 'E');
  assert.equal(rank('SKILL_MEDICINE'), 'U', 'the current stable choice wins over legacy keys');

  character.operation_data.selections = engine.clearSelectionPaths(
    [stableId, expertId, trainedId].map((id) => `${skillPath}_${id}`),
    selections
  );
  await calculate(character);
  assert.equal(rank('SKILL_MEDICINE'), 'U');
  assert.equal(rank('SKILL_ARCANA'), 'U');
  assert.equal(rank('SKILL_NATURE'), 'U');
});

/** Run a real catalog operation through both ranks with the same stored selector and option. */
async function calculateSharedSkills(row, level, selections) {
  engine.resetVariables();
  engine.setVariable('CHARACTER', 'LEVEL', level);
  engine.addVariable('CHARACTER', 'prof', 'SKILL_LORE_SAILING', { value: 'U', attribute: 'ATTRIBUTE_INT' });
  const owner = `fixture-${row.id}`;
  const saved = JSON.parse(JSON.stringify(selections));
  engine.setSelections(Object.entries(saved).map(([id, value]) => ({ key: `${owner}_${id}`, value })));
  const root = engine.getRootSelection();
  const results = await engine.runOperations(
    'CHARACTER',
    { path: owner, node: root.children[owner], choiceOwner: owner },
    row.operations,
    { doConditionals: true, sourceLevel: 1 }
  );
  await engine.resolveFinalSkillSelections();
  engine.normalizeProficiencies('CHARACTER');
  return results[0].result.results;
}

test('Dual Studies keeps its skill across the level-7 rule and writes a stable selector', async () => {
  const row = official(22505);
  const { id, previousIds } = skillChoices.find((record) => record.id === row.id).choices[0].identity;
  const [expertId, trainedId] = previousIds;
  const old = { [trainedId]: 'SKILL_MEDICINE' };
  const [trained] = await calculateSharedSkills(row, 6, old);
  assert.equal(trained.selection.id, id);
  assert.equal(rank('SKILL_MEDICINE'), 'T');
  await calculateSharedSkills(row, 7, old);
  assert.equal(rank('SKILL_MEDICINE'), 'E');
  await calculateSharedSkills(row, 7, { [expertId]: 'SKILL_ARCANA' });
  assert.equal(rank('SKILL_ARCANA'), 'E');
  await calculateSharedSkills(row, 6, { [id]: 'SKILL_NATURE', ...old });
  assert.equal(rank('SKILL_NATURE'), 'T');
  assert.equal(rank('SKILL_MEDICINE'), 'U');
});

test('Lorekeeper Shisk retains both separate choices and reads old predefined option IDs', async () => {
  const row = official(26793);
  const [lore, skill] = skillChoices.find((record) => record.id === row.id).choices.map(({ identity }) => identity);
  const { trueOperations, falseOperations } = row.operations[0].data;
  const old = {
    [lore.previousIds[1]]: 'SKILL_LORE_SAILING',
    [skill.previousIds[1]]: falseOperations[1].data.optionsPredefined[0].operation.id,
  };
  await calculateSharedSkills(row, 4, old);
  assert.equal(rank('SKILL_LORE_SAILING'), 'T');
  assert.equal(rank('SKILL_ARCANA'), 'T');
  const [loreResult, skillResult] = await calculateSharedSkills(row, 5, old);
  assert.equal(loreResult.selection.id, lore.id);
  assert.equal(skillResult.selection.id, skill.id);
  assert.equal(skillResult.result.source._select_uuid, 'SKILL_ARCANA');
  assert.equal(rank('SKILL_LORE_SAILING'), 'E');
  assert.equal(rank('SKILL_ARCANA'), 'E');

  await calculateSharedSkills(row, 5, {
    [skill.previousIds[0]]: trueOperations[1].data.optionsPredefined[0].operation.id,
  });
  assert.equal(rank('SKILL_ARCANA'), 'E');
  await calculateSharedSkills(row, 5, { ...old, [skill.id]: '' });
  assert.equal(rank('SKILL_ARCANA'), 'U', 'an explicit clear takes precedence over a saved legacy option');
  assert.equal(rank('SKILL_LORE_SAILING'), 'E', 'clearing one choice does not affect the other');
});

test('a stable skill choice is scoped to its owner and refuses ambiguous options', async () => {
  const row = official(26793);
  const { trueOperations, falseOperations } = row.operations[0].data;
  const expert = trueOperations[1];
  const trained = falseOperations[1];
  const id = expert.data.skillChoice.id;
  const oldArcana = trained.data.optionsPredefined[0].operation.id;
  const entity = {
    operation_data: {
      selections: {
        [`first_${trained.id}`]: oldArcana,
        [`second_${id}`]: 'SKILL_NATURE',
        [`third_${trained.id}`]: oldArcana,
        [`third_${id}`]: '',
      },
    },
  };
  const selected = await engine.getSelectedOptions(entity, expert);
  assert.deepEqual(selected.map((option) => option._select_uuid).sort(), ['SKILL_ARCANA', 'SKILL_NATURE']);
  const invalid = structuredClone(expert);
  invalid.data.optionsPredefined[1].operation.data.variable = invalid.data.optionsPredefined[0].operation.data.variable;
  assert.equal(engine.OperationSchema.safeParse(invalid).success, false);
  assert.throws(() => engine.resolveSelectionNode(undefined, invalid), /requires a skill or Lore selector/);
  const mismatched = structuredClone(expert);
  const nativeArcana = mismatched.data.optionsPredefined[0].operation.id;
  mismatched.data.skillChoice.previousOptions[nativeArcana] = 'SKILL_NATURE';
  assert.equal(engine.OperationSchema.safeParse(mismatched).success, false);
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
