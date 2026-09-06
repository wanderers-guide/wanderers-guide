import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createOperationEngine } from './operation-test-harness.mjs';

let engine;
const track = { path: 'removal', node: { value: null, children: {} } };
const op = (id, type, data) => ({ id, type, data });
const give = (id, operationId = `give-${id}`) =>
  op(operationId, 'giveAbilityBlock', { type: 'feat', abilityBlockId: id });
const remove = (id) => op(`remove-${id}`, 'removeAbilityBlock', { type: 'feat', abilityBlockId: id });
const adj = (id, variable, value) => op(id, 'adjValue', { variable, value });
const set = (id, variable, value) => op(id, 'setValue', { variable, value });
const feat = (id, operations, name = `Fixture ${id}`) => ({ id, name, type: 'feat', level: 1, operations });
const spell = (id, name = `Spell ${id}`) => ({ id, name, rank: 1 });
const giveSpell = (id, operationId = `spell-${id}`) =>
  op(operationId, 'giveSpell', {
    spellId: id,
    type: 'INNATE',
    rank: 1,
    tradition: 'ARCANE',
    casts: 1,
  });
const removeSpell = (id) => op(`remove-spell-${id}`, 'removeSpell', { spellId: id });
const value = (name, store = 'CHARACTER') => engine.getVariable(store, name)?.value;
const run = (operations, options) => engine.runOperations('CHARACTER', track, operations, options, 'Fixture');
const fixtures = (abilities = [], spells = [], languages = []) =>
  engine.setFixtures([
    ...abilities.map((row) => ({ table: 'ability_block', row })),
    ...spells.map((row) => ({ table: 'spell', row })),
    ...languages.map((row) => ({ table: 'language', row })),
  ]);
const emptyContent = {
  abilityBlocks: [],
  classes: [],
  ancestries: [],
  backgrounds: [],
  spells: [],
  items: [],
  traits: [],
  languages: [],
  archetypes: [],
  versatileHeritages: [],
  classArchetypes: [],
  sources: [],
  defaultSources: { INFO: [], PAGE: [] },
};

before(async () => {
  engine = await createOperationEngine();
});
after(async () => {
  await engine?.cleanup();
});
beforeEach(() => {
  engine.resetVariables();
  engine.clearDeferredOperations();
  fixtures();
});

test('removing a spell clears every casting record and its innate proficiency, preserving independent spells', async () => {
  fixtures([], [spell(1), spell(2)]);
  await run([giveSpell(1), giveSpell(1, 'second-casting-source'), giveSpell(2), removeSpell(1)]);
  assert.deepEqual(value('SPELL_IDS'), ['2']);
  assert.deepEqual(value('SPELL_NAMES'), ['SPELL 2']);
  assert.deepEqual(
    value('SPELL_DATA')
      .map(JSON.parse)
      .map((data) => data.spellId),
    [2]
  );
  assert.equal(value('SPELL_ATTACK').value, 'T');
  await run([removeSpell(2)]);
  assert.deepEqual(value('SPELL_DATA'), []);
  assert.equal(value('SPELL_ATTACK').value, 'U');
  assert.equal(value('SPELL_DC').value, 'U');
});

test('removing innate spells preserves class proficiency and another spell with the same name', async () => {
  fixtures([], [spell(1, 'Shared Name'), spell(2, 'Shared Name')]);
  await run([adj('class-casting', 'SPELL_ATTACK', { value: 'M' }), giveSpell(1), giveSpell(2), removeSpell(1)]);
  assert.deepEqual(value('SPELL_NAMES'), ['SHARED NAME']);
  assert.equal(value('SPELL_ATTACK').value, 'M');
});

test('ability removal replays independent adjustments and assignments without arithmetic inversion', async () => {
  fixtures([
    feat(1, [set('assigned-hp', 'MAX_HEALTH_BONUS', 10), set('speed', 'SPEED', 40)]),
    feat(2, [adj('other-hp', 'MAX_HEALTH_BONUS', 3), set('other-speed', 'SPEED', 30)]),
  ]);
  await run([give(1), give(2), remove(1)]);
  assert.equal(value('MAX_HEALTH_BONUS'), 3);
  assert.equal(value('SPEED'), 30);
  assert.deepEqual(value('FEAT_IDS'), ['2']);
});

test('independent redundant ranks, bonuses, list entries and partial attribute boosts survive removal', async () => {
  engine.setVariable('CHARACTER', 'ATTRIBUTE_STR', { value: 4, partial: false });
  const effects = (rank) => [
    adj('rank', 'SAVE_REFLEX', { value: rank }),
    adj('boost', 'ATTRIBUTE_STR', { value: 1 }),
    adj('resist', 'RESISTANCES', 'fire, 5'),
    op('bonus', 'addBonusToValue', { variable: 'AC_BONUS', value: 2, type: 'item', text: '' }),
  ];
  fixtures([feat(1, effects('E'), 'Same source label'), feat(2, effects('T'), 'Same source label')]);
  await run([give(1), give(2), remove(1)]);
  assert.equal(value('SAVE_REFLEX').value, 'T');
  assert.deepEqual(value('ATTRIBUTE_STR'), { value: 4, partial: true });
  assert.deepEqual(value('RESISTANCES'), ['fire, 5']);
  assert.equal(engine.getVariableBonuses('CHARACTER', 'AC_BONUS').length, 1);
  assert.equal(engine.getVariableBonuses('CHARACTER', 'AC_BONUS')[0].value, 2);
});

test('independent creation of a custom variable survives removal of its first creator', async () => {
  const a = feat(1, [op('create-a', 'createValue', { variable: 'FIXTURE_NUMBER', type: 'num', value: 5 })]);
  const b = feat(2, [
    op('create-b', 'createValue', { variable: 'FIXTURE_NUMBER', type: 'num', value: 7 }),
    adj('plus', 'FIXTURE_NUMBER', 3),
  ]);
  fixtures([a, b]);
  const operations = [give(1), give(2), remove(1)];
  await run(operations, { doOnlyValueCreation: true });
  await run(operations);
  assert.equal(value('FIXTURE_NUMBER'), 10);
});

test('removing a parent revokes nested grants while retaining an independent grant of the same child', async () => {
  const child = feat(3, [
    adj('hp', 'MAX_HEALTH_BONUS', 5),
    giveSpell(1),
    op('language', 'giveLanguage', { languageId: 1 }),
  ]);
  fixtures([feat(1, [give(3)]), feat(2, [give(3)]), child], [spell(1)], [{ id: 1, name: 'Common' }]);
  await run([give(1), give(2), remove(1)]);
  assert.deepEqual(value('FEAT_IDS'), ['2', '3']);
  assert.equal(value('MAX_HEALTH_BONUS'), 5);
  assert.deepEqual(value('SPELL_IDS'), ['1']);
  assert.deepEqual(value('LANGUAGE_NAMES'), ['COMMON']);
  await run([remove(2)]);
  assert.deepEqual(value('FEAT_IDS'), []);
  assert.equal(value('MAX_HEALTH_BONUS'), 0);
  assert.deepEqual(value('SPELL_DATA'), []);
  assert.deepEqual(value('LANGUAGE_IDS'), []);
});

test('removal filters do not resurrect older snapshots when another grant is removed later', async () => {
  fixtures([feat(1, [giveSpell(1)]), feat(2, [giveSpell(2)])], [spell(1), spell(2)]);
  await run([give(1), give(2), removeSpell(1), remove(2)]);
  assert.deepEqual(value('SPELL_IDS'), []);
  assert.deepEqual(value('SPELL_NAMES'), []);
  assert.deepEqual(value('SPELL_DATA'), []);
});

test('removal revokes deferred bindings and language overrides, including conditional-pass effects', async () => {
  engine.setVariable('CHARACTER', 'SPEED', 25);
  const a = feat(1, [
    op('bind', 'bindValue', { variable: 'SPEED_CLIMB', value: { storeId: 'CHARACTER', variable: 'SPEED' } }),
    set('clear-languages', 'LANGUAGE_NAMES', []),
    op('conditional', 'conditional', { conditions: [], trueOperations: [adj('hp', 'MAX_HEALTH_BONUS', 5)] }),
  ]);
  fixtures([a], [], [{ id: 1, name: 'Common' }]);
  const operations = [op('language', 'giveLanguage', { languageId: 1 }), give(1), remove(1)];
  await run(operations, { doOnlyValueCreation: true });
  await run(operations);
  await run(operations, { doOnlyConditionals: true });
  await engine.resolveDeferredOperations();
  assert.equal(value('SPEED_CLIMB'), 0);
  assert.deepEqual(value('LANGUAGE_NAMES'), ['COMMON']);
  assert.equal(value('MAX_HEALTH_BONUS'), 0);
});

test('a later explicit grant is new; old removed effects never return on replay', async () => {
  fixtures([feat(1, [adj('hp', 'MAX_HEALTH_BONUS', 5)]), feat(2, [adj('hp-2', 'MAX_HEALTH_BONUS', 3)])]);
  await run([give(1), remove(1), give(1), give(2), remove(2)]);
  assert.equal(value('MAX_HEALTH_BONUS'), 5);
});

test('removing a source also revokes its removal operation, restoring independent earlier grants', async () => {
  fixtures([feat(1, [adj('hp', 'MAX_HEALTH_BONUS', 5)]), feat(2, [remove(1)])]);
  await run([give(1), give(2)]);
  assert.equal(value('MAX_HEALTH_BONUS'), 0);
  await run([remove(2)]);
  assert.equal(value('MAX_HEALTH_BONUS'), 5);
  assert.deepEqual(value('FEAT_IDS'), ['1']);
});

test('selected abilities share the same effect-removal path as direct grants', async () => {
  fixtures([feat(1, [adj('hp', 'MAX_HEALTH_BONUS', 5)])]);
  const selectTrack = { path: 'selection', node: { value: null, children: { select: { value: '1', children: {} } } } };
  await engine.runOperations('CHARACTER', selectTrack, [
    op('select', 'select', {
      title: 'Pick',
      modeType: 'PREDEFINED',
      optionType: 'ABILITY_BLOCK',
      optionsPredefined: [],
    }),
    remove(1),
  ]);
  assert.equal(value('MAX_HEALTH_BONUS'), 0);
  assert.deepEqual(value('FEAT_IDS'), []);
});

test('controller-granted creature abilities are also revoked, including their conditional effects', async () => {
  const first = feat(1, [
    adj('hp', 'MAX_HEALTH_BONUS', 5),
    op('conditional', 'conditional', {
      conditions: [],
      trueOperations: [adj('conditional-hp', 'MAX_HEALTH_BONUS', 2)],
    }),
  ]);
  const second = feat(2, [remove(1)]);
  fixtures([first, second]);
  const result = await engine._executeCreatureOperations({
    id: 'CREATURE',
    creature: {
      id: 123,
      name: 'Fixture creature',
      level: 1,
      operations: [],
      abilities_base: [first, second],
      inventory: { items: [] },
    },
    content: { ...emptyContent, abilityBlocks: [first, second] },
    charStore: engine.exportVariableStore('CHARACTER'),
  });
  assert.equal(result.store.variables.MAX_HEALTH_BONUS.value, 0);
  assert.deepEqual(result.store.variables.FEAT_IDS.value, ['2']);
});

test('self-grants and mutual cycles stop with a content path, while independent reuse remains valid', async () => {
  fixtures([feat(1, [give(1)])]);
  await assert.rejects(run([give(1)]), /Cyclic content grant: ability-block:1 -> ability-block:1/);
  engine.resetVariables();
  fixtures([feat(1, [give(2)]), feat(2, [give(1)])]);
  await assert.rejects(run([give(1)]), /ability-block:1 -> ability-block:2 -> ability-block:1/);
  engine.resetVariables();
  fixtures([feat(1, [adj('hp', 'MAX_HEALTH_BONUS', 5)])]);
  await run([give(1, 'branch-a'), give(1, 'branch-b')]);
  assert.equal(value('MAX_HEALTH_BONUS'), 10);
});

test('long acyclic chains are bounded before stack exhaustion', async () => {
  fixtures(Array.from({ length: 70 }, (_, index) => feat(index + 1, index < 69 ? [give(index + 2)] : [])));
  await assert.rejects(run([give(1)]), /maximum nesting depth/);
});

test('wide operation work is bounded across independent root sources', async () => {
  const operations = Array.from({ length: 50_001 }, (_, index) =>
    op(`noop-${index}`, 'createValue', {
      type: 'num',
      variable: 'UNUSED',
      value: 0,
    })
  );
  await run(operations);
  await assert.rejects(run(operations), /execution work limit/);
});

test('language removals also replay filters without reviving a later removed source', async () => {
  fixtures(
    [
      feat(1, [op('first', 'giveLanguage', { languageId: 1 })]),
      feat(2, [op('second', 'giveLanguage', { languageId: 2 })]),
    ],
    [],
    [
      { id: 1, name: 'Common' },
      { id: 2, name: 'Elven' },
    ]
  );
  await run([give(1), give(2), op('remove-language', 'removeLanguage', { languageId: 1 }), remove(2)]);
  assert.deepEqual(value('LANGUAGE_IDS'), []);
  assert.deepEqual(value('LANGUAGE_NAMES'), []);
});

test('failed cyclic workerless calculations retain the last committed store and permit corrected retry', async () => {
  const previousWindow = globalThis.window;
  globalThis.window = {};
  try {
    engine.setVariable('CHARACTER', 'MAX_HEALTH_BONUS', 17);
    fixtures([feat(1, [give(1)])]);
    const character = {
      id: 1,
      level: 1,
      details: {},
      inventory: { items: [] },
      options: { custom_operations: true },
      custom_operations: [give(1)],
      operation_data: { selections: {} },
    };
    const execution = { type: 'CHARACTER', data: { character, content: emptyContent, context: 'CHARACTER-SHEET' } };
    await assert.rejects(engine.executeOperations(execution, { directExecution: true }), /Cyclic content grant/);
    assert.equal(value('MAX_HEALTH_BONUS'), 17);
    fixtures([feat(1, [adj('hp', 'MAX_HEALTH_BONUS', 5)])]);
    await engine.executeOperations(execution, { directExecution: true });
    assert.equal(value('MAX_HEALTH_BONUS'), 5);
  } finally {
    globalThis.window = previousWindow;
  }
});

test('repeated removals have a reconstruction budget instead of unbounded quadratic replay', async () => {
  fixtures([feat(1, [adj('hp', 'MAX_HEALTH_BONUS', 1)])]);
  const operations = Array.from({ length: 1200 }, (_, index) => [give(1, `grant-${index}`), remove(1)]).flat();
  await assert.rejects(run(operations), /effect reconstruction work limit/);
});

test('selected innate spells revoke casting metadata and proficiency together', async () => {
  fixtures([], [spell(1)]);
  const selectTrack = {
    path: 'spell-selection',
    node: { value: null, children: { select: { value: 'spell-choice', children: {} } } },
  };
  await engine.runOperations('CHARACTER', selectTrack, [
    op('select', 'select', {
      title: 'Pick',
      modeType: 'PREDEFINED',
      optionType: 'SPELL',
      optionsPredefined: [{ id: 'spell-choice', type: 'SPELL', operation: giveSpell(1) }],
    }),
    removeSpell(1),
  ]);
  assert.deepEqual(value('SPELL_DATA'), []);
  assert.deepEqual(value('SPELL_IDS'), []);
  assert.equal(value('SPELL_ATTACK').value, 'U');
});

test('removing an active mode prevents its later controller pass from applying effects', async () => {
  const mode = { ...feat(1, [adj('hp', 'MAX_HEALTH_BONUS', 5)], 'Power Mode'), type: 'mode' };
  fixtures([mode]);
  const character = {
    id: 1,
    level: 1,
    details: {},
    inventory: { items: [] },
    operation_data: { selections: {} },
    meta_data: { active_modes: ['POWER_MODE'] },
    options: { custom_operations: true },
    custom_operations: [op('remove-mode', 'removeAbilityBlock', { type: 'mode', abilityBlockId: 1 })],
  };
  const result = await engine._executeCharacterOperations({
    character,
    content: { ...emptyContent, abilityBlocks: [mode] },
    context: 'CHARACTER-SHEET',
  });
  assert.equal(result.store.variables.MAX_HEALTH_BONUS.value, 0);
  assert.deepEqual(result.store.variables.ACTIVE_MODES.value, []);
});

test('completed controllers release provenance and exports never transfer it between entities', async () => {
  fixtures([feat(1, [adj('hp', 'MAX_HEALTH_BONUS', 5)])]);
  const character = {
    id: 1,
    level: 1,
    details: {},
    inventory: { items: [] },
    options: { custom_operations: true },
    custom_operations: [give(1)],
    operation_data: { selections: {} },
  };
  await engine._executeCharacterOperations({ character, content: emptyContent, context: 'CHARACTER-SHEET' });
  // Revocation has no journal to replay after the controller's finally block.
  engine.removeVariableEffects('CHARACTER', 'ability-block:1');
  assert.equal(value('MAX_HEALTH_BONUS'), 5);
  const snapshot = engine.exportVariableStore('CHARACTER');
  assert.deepEqual(Object.keys(snapshot).sort(), ['bonuses', 'history', 'variables']);
  assert.doesNotThrow(() => structuredClone(snapshot));
  engine.importVariableStore('COMPANION', snapshot);
  engine.removeVariableEffects('COMPANION', 'ability-block:1');
  assert.equal(value('MAX_HEALTH_BONUS', 'COMPANION'), 5);
  assert.equal(value('MAX_HEALTH_BONUS'), 5);
});

test('failed controllers also release journals and pending deferred writes', async () => {
  fixtures([feat(1, [set('override', 'LANGUAGE_NAMES', []), give(1)])]);
  const character = {
    id: 1,
    level: 1,
    details: {},
    inventory: { items: [] },
    options: { custom_operations: true },
    custom_operations: [give(1)],
    operation_data: { selections: {} },
  };
  await assert.rejects(
    engine._executeCharacterOperations({ character, content: emptyContent, context: 'CHARACTER-SHEET' }),
    /Cyclic content grant/
  );
  engine.setVariable('CHARACTER', 'MAX_HEALTH_BONUS', 7);
  engine.removeVariableEffects('CHARACTER', 'ability-block:1');
  assert.equal(value('MAX_HEALTH_BONUS'), 7);
  assert.deepEqual(await engine.resolveDeferredOperations(), []);
});

test('standalone variable journals have a hard entry cap even outside the controller', () => {
  engine.beginVariableEffects('CHARACTER');
  for (let index = 0; index < 200_000; index++) engine.adjVariable('CHARACTER', 'UNDEFINED_FIXTURE_VARIABLE', 1);
  assert.throws(() => engine.adjVariable('CHARACTER', 'UNDEFINED_FIXTURE_VARIABLE', 1), /variable effect limit/);
  engine.finishVariableEffects('CHARACTER');
  assert.doesNotThrow(() => engine.adjVariable('CHARACTER', 'UNDEFINED_FIXTURE_VARIABLE', 1));
});
