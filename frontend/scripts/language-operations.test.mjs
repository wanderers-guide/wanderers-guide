import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

let engine;
let fixtures;
let content;
const row = (table, id) => fixtures.find((fixture) => fixture.table === table && fixture.row.id === id).row;
const track = { path: 'test', node: { value: null, children: {} } };
const override = (variable, value) => ({ id: 'override-languages', type: 'setValue', data: { variable, value } });
const languageState = () => ({
  ids: engine.getVariable('CHARACTER', 'LANGUAGE_IDS').value,
  names: engine.getVariable('CHARACTER', 'LANGUAGE_NAMES').value,
});
const character = (custom_operations = []) => ({
  id: 1,
  level: 1,
  details: { ancestry: row('ancestry', 3) },
  inventory: { items: [] },
  content_sources: { enabled: [1] },
  options: { custom_operations: true },
  custom_operations,
  operation_data: { selections: {} },
});
const execute = (char = character(), packageContent = content) =>
  engine._executeCharacterOperations({ character: char, content: packageContent, context: 'CHARACTER-BUILDER' });

before(async () => {
  fixtures = await readContentRows([
    ...[19330, 30908, 33021, 33023, 33056, 33057, 33058].map((id) => ({ table: 'ability_block', id })),
    { table: 'ancestry', id: 3 },
    { table: 'class', id: 114 },
    { table: 'trait', id: 2399 },
    { table: 'language', id: 81 },
    { table: 'language', id: 84 },
  ]);
  engine = await createOperationEngine();
  content = {
    abilityBlocks: fixtures.filter((f) => f.table === 'ability_block').map((f) => f.row),
    classes: [],
    ancestries: [row('ancestry', 3)],
    languages: [row('language', 81), row('language', 84)],
    traits: [row('trait', 2399)],
    items: [],
    spells: [],
    backgrounds: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    defaultSources: { INFO: [], PAGE: [] },
  };
});
after(async () => engine?.cleanup());
beforeEach(() => {
  engine.resetVariables();
  engine.setFixtures(fixtures);
  engine.clearOperationErrorNotifications();
});

test('explicit empty names override clears exact Elf ancestry grants after all rounds', async () => {
  await execute(character([override('LANGUAGE_NAMES', '[]')]));
  assert.deepEqual(languageState(), { ids: [], names: [] });
});

test('native name lists replace ancestry languages and synchronize membership IDs', async () => {
  await execute(character([override('LANGUAGE_NAMES', ['elven'])]));
  assert.deepEqual(languageState(), { ids: ['84'], names: ['ELVEN'] });
});

test('ID lists replace ancestry languages and synchronize names', async () => {
  await execute(character([override('LANGUAGE_IDS', '["81"]')]));
  assert.deepEqual(languageState(), { ids: ['81'], names: ['COMMON'] });
});

test('absent overrides retain ordinary ancestry grants', async () => {
  await execute();
  assert.deepEqual(languageState(), { ids: ['81', '84'], names: ['COMMON', 'ELVEN'] });
});

test('ordinary give/remove operations keep both lists synchronized', async () => {
  await engine.runOperations('CHARACTER', track, [
    { id: 'common', type: 'giveLanguage', data: { languageId: 81 } },
    { id: 'elven', type: 'giveLanguage', data: { languageId: 84 } },
    { id: 'remove', type: 'removeLanguage', data: { languageId: 81 } },
  ]);
  assert.deepEqual(languageState(), { ids: ['84'], names: ['ELVEN'] });
});

test('bad lists and unresolved names report errors while completing the editable character result', async () => {
  for (const value of [null, false, '[broken', '[123]', '["Not a known language"]']) {
    const result = await execute(character([override('LANGUAGE_NAMES', value)]));
    assert.equal(result.errors.length, 1);
    assert.ok(result.errors[0].includes('Language override'));
    assert.ok(result.ors.ancestryResults);
    assert.ok(result.store);
    assert.deepEqual(languageState(), { ids: ['81', '84'], names: ['COMMON', 'ELVEN'] });
  }
});

test('content-source overrides also apply after ancestry grants', async () => {
  const sourceContent = {
    ...content,
    sources: [{ id: 999, name: 'Setting', operations: [override('LANGUAGE_IDS', [])] }],
  };
  await execute(character(), sourceContent);
  assert.deepEqual(languageState(), { ids: [], names: [] });
});

test("a previous execution's override does not suppress later ordinary grants", async () => {
  await execute(character([override('LANGUAGE_NAMES', [])]));
  await execute();
  assert.deepEqual(languageState(), { ids: ['81', '84'], names: ['COMMON', 'ELVEN'] });
});

test('the last explicit override replaces the complete language pair', async () => {
  const sourceContent = {
    ...content,
    sources: [{ id: 999, name: 'Setting', operations: [override('LANGUAGE_NAMES', [])] }],
  };
  await execute(character([override('LANGUAGE_IDS', ['84'])]), sourceContent);
  assert.deepEqual(languageState(), { ids: ['84'], names: ['ELVEN'] });
});

test('creature overrides apply after ability grants without replacing character languages', async () => {
  await execute();
  const charStore = engine.exportVariableStore('CHARACTER');
  const creature = {
    id: 999,
    name: 'Language test creature',
    level: 1,
    operations: [override('LANGUAGE_NAMES', [])],
    inventory: { items: [] },
    abilities_base: [
      {
        id: 998,
        name: 'Granted language',
        operations: [{ id: 'common', type: 'giveLanguage', data: { languageId: 81 } }],
      },
    ],
  };
  await engine._executeCreatureOperations({ id: 'TEST_CREATURE', creature, content, charStore });
  assert.deepEqual(engine.getVariable('TEST_CREATURE', 'LANGUAGE_IDS').value, []);
  assert.deepEqual(engine.getVariable('TEST_CREATURE', 'LANGUAGE_NAMES').value, []);
  assert.deepEqual(languageState(), { ids: ['81', '84'], names: ['COMMON', 'ELVEN'] });
});

test('bindings read final overridden language names and retain their original order', async () => {
  engine.addVariable('CHARACTER', 'list-str', 'COPIED_LANGUAGES');
  engine.addVariable('CHARACTER', 'list-str', 'COPIED_AGAIN');
  engine.clearDeferredOperations();
  await engine.runOperations('CHARACTER', track, [
    { id: 'give-common', type: 'giveLanguage', data: { languageId: 81 } },
    override('LANGUAGE_NAMES', ['Elven']),
    {
      id: 'bind-first',
      type: 'bindValue',
      data: { variable: 'COPIED_LANGUAGES', value: { storeId: 'CHARACTER', variable: 'LANGUAGE_NAMES' } },
    },
    {
      id: 'bind-second',
      type: 'bindValue',
      data: { variable: 'COPIED_AGAIN', value: { storeId: 'CHARACTER', variable: 'COPIED_LANGUAGES' } },
    },
  ]);
  await engine.resolveDeferredOperations();
  assert.deepEqual(engine.getVariable('CHARACTER', 'COPIED_LANGUAGES').value, ['ELVEN']);
  assert.deepEqual(engine.getVariable('CHARACTER', 'COPIED_AGAIN').value, ['ELVEN']);
});

test('invalid replacements preserve grants, complete bindings, and recover after the user edits them', async () => {
  const broken = character([
    { id: 'create-copy', type: 'createValue', data: { variable: 'COPIED_LANGUAGES', type: 'list-str', value: [] } },
    { ...override('LANGUAGE_NAMES', ['Unknown']), id: 'broken' },
    {
      id: 'bind-copy',
      type: 'bindValue',
      data: { variable: 'COPIED_LANGUAGES', value: { storeId: 'CHARACTER', variable: 'LANGUAGE_NAMES' } },
    },
  ]);
  const result = await execute(broken);
  assert.match(result.errors[0], /could not be resolved/);
  assert.deepEqual(languageState(), { ids: ['81', '84'], names: ['COMMON', 'ELVEN'] });
  assert.deepEqual(engine.getVariable('CHARACTER', 'COPIED_LANGUAGES').value, ['COMMON', 'ELVEN']);
  const corrected = await execute(character([override('LANGUAGE_NAMES', ['Elven'])]));
  assert.deepEqual(corrected.errors, []);
  assert.deepEqual(languageState(), { ids: ['84'], names: ['ELVEN'] });
});

test('a bad replacement does not prevent a later valid override', async () => {
  const result = await execute(
    character([{ ...override('LANGUAGE_NAMES', ['Unknown']), id: 'broken' }, override('LANGUAGE_IDS', ['84'])])
  );
  assert.equal(result.errors.length, 1);
  assert.deepEqual(languageState(), { ids: ['84'], names: ['ELVEN'] });
});

test('the execution boundary surfaces invalid overrides and resolves results for the loading lifecycle', async () => {
  const result = await engine.executeOperations(
    {
      type: 'CHARACTER',
      data: { character: character([override('LANGUAGE_NAMES', null)]), content, context: 'CHARACTER-BUILDER' },
    },
    { directExecution: true }
  );
  assert.ok(result.ancestryResults);
  assert.equal(engine.getOperationErrorNotifications().length, 1);
  assert.match(engine.getOperationErrorNotifications()[0], /Language override.*was not applied/);
  assert.deepEqual(languageState(), { ids: ['81', '84'], names: ['COMMON', 'ELVEN'] });
});

test('name overrides resolve against the current execution source scope', async () => {
  const language = row('language', 84);
  engine.setFixtures([
    ...fixtures.filter((fixture) => fixture.table !== 'language' || fixture.row.id !== 84),
    { table: 'language', row: { ...language, content_source_id: 11 } },
    { table: 'language', row: { ...language, id: 99984, content_source_id: 12 } },
  ]);
  for (const [source, expectedId] of [
    [11, '84'],
    [12, '99984'],
  ]) {
    const result = await execute(character([override('LANGUAGE_NAMES', ['Elven'])]), {
      ...content,
      defaultSources: { INFO: [], PAGE: [source] },
    });
    assert.deepEqual(result.errors, []);
    assert.deepEqual(languageState(), { ids: [expectedId], names: ['ELVEN'] });
  }
});

test('the operation editor preserves native lists as editable JSON', () => {
  assert.equal(engine.getListStringInputValue(['Elven']), '["Elven"]');
  assert.equal(engine.getListStringInputValue([]), '[]');
  assert.equal(engine.getListStringInputValue('["Common"]'), '["Common"]');
});

test('exact Rascal and Stylish Tricks data progresses through the complete class controller', async () => {
  const swashbucklerContent = { ...content, classes: [row('class', 114)] };
  for (const [level, expected] of [
    [1, 'T'],
    [3, 'E'],
    [7, 'M'],
    [15, 'L'],
  ]) {
    engine.resetVariables();
    const char = character();
    char.level = level;
    char.details.class = row('class', 114);
    const selections = char.operation_data.selections;
    selections['class-feature-33023_aadbe03b-dda1-44a7-ba22-0883c58f80ae'] = '33021';
    const skills = ['SKILL_ARCANA', 'SKILL_ATHLETICS', 'SKILL_SOCIETY', 'SKILL_STEALTH'];
    engine
      .getClassSkillTrainings('CHARACTER', 4)
      .forEach((operation, index) => (selections[`class_${operation.id}`] = skills[index]));
    for (const feature of [33056, 33057, 33058]
      .map((id) => row('ability_block', id))
      .filter((feature) => feature.level <= level)) {
      selections[`class-feature-${feature.id}_${feature.operations[0].id}`] = 'SKILL_THIEVERY';
    }
    await execute(char, swashbucklerContent);
    engine.normalizeProficiencies('CHARACTER');
    assert.equal(
      engine.compileProficiencyType(engine.getVariable('CHARACTER', 'SKILL_THIEVERY').value),
      expected,
      `Rascal at level ${level}`
    );
  }
});
