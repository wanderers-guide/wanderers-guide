/** Run authored homebrew graphs through the same controller used by the worker. */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createOperationEngine } from './operation-test-harness.mjs';

let engine;
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
const op = (id, type, data) => ({ id, type, data });
const create = (variable, value = 0) => op(`create-${variable}`, 'createValue', { variable, type: 'num', value });
const bind = (variable, source, id = `bind-${variable}`) =>
  op(id, 'bindValue', { variable, value: { storeId: 'CHARACTER', variable: source } });
const set = (variable, value) => op(`set-${variable}`, 'setValue', { variable, value });
const adjust = (variable, value) => op(`adjust-${variable}`, 'adjValue', { variable, value });
const character = (operations, level = 5) => ({
  id: 1,
  level,
  details: {},
  inventory: { items: [] },
  operation_data: { selections: {} },
  options: { custom_operations: true },
  custom_operations: operations,
});
const calculate = (operations, level) =>
  engine._executeCharacterOperations({ character: character(operations, level), content, context: 'CHARACTER-SHEET' });

before(async () => {
  engine = await createOperationEngine();
});
after(async () => {
  await engine?.cleanup();
});

test('an active conditional creates its custom counter before its adjustments and final HP binding', async () => {
  const packet = await calculate([
    op('active-branch', 'conditional', {
      conditions: [],
      trueOperations: [create('BREW_COUNTER', 2), adjust('BREW_COUNTER', 3), bind('MAX_HEALTH_BONUS', 'BREW_COUNTER')],
    }),
  ]);
  assert.deepEqual(packet.errors, []);
  assert.equal(packet.store.variables.BREW_COUNTER?.value, 5);
  assert.equal(packet.store.variables.MAX_HEALTH_BONUS.value, 5);
});

test('a binding chain follows the final source value in either authoring order', async () => {
  const linkOperations = [bind('MAX_HEALTH_BONUS', 'BREW_COUNTER'), bind('BREW_COUNTER', 'SPEED')];
  for (const links of [linkOperations, [...linkOperations].reverse()]) {
    const packet = await calculate([create('BREW_COUNTER'), set('SPEED', 25), ...links]);
    assert.deepEqual(packet.errors, []);
    assert.equal(packet.store.variables.BREW_COUNTER.value, 25);
    assert.equal(packet.store.variables.MAX_HEALTH_BONUS.value, 25);
  }
});

test('switching a level-gated branch removes its custom variable and permits a clean regrant', async () => {
  const operations = [
    op('level-branch', 'conditional', {
      conditions: [{ id: 'level-five', name: 'LEVEL', type: 'num', operator: 'GREATER_THAN_OR_EQUALS', value: '5' }],
      trueOperations: [create('BREW_COUNTER', 2), adjust('BREW_COUNTER', 3), bind('MAX_HEALTH_BONUS', 'BREW_COUNTER')],
      falseOperations: [set('MAX_HEALTH_BONUS', 1)],
    }),
  ];
  for (const [level, expected] of [
    [5, 5],
    [1, 1],
    [5, 5],
  ]) {
    const packet = await calculate(operations, level);
    assert.equal(packet.store.variables.MAX_HEALTH_BONUS.value, expected);
    assert.equal(packet.store.variables.BREW_COUNTER?.value, level === 5 ? 5 : undefined);
  }
});

test('the last applicable binding wins and downstream bindings see that value', async () => {
  const packet = await calculate([
    create('BREW_COUNTER'),
    create('BREW_FIRST', 3),
    create('BREW_SECOND', 7),
    bind('MAX_HEALTH_BONUS', 'BREW_COUNTER'),
    bind('BREW_COUNTER', 'BREW_FIRST', 'earlier-binding'),
    bind('BREW_COUNTER', 'BREW_SECOND', 'later-binding'),
    bind('BREW_COUNTER', 'MISSING_OPTIONAL_SOURCE', 'missing-binding'),
  ]);
  assert.equal(packet.store.variables.BREW_COUNTER.value, 7);
  assert.equal(packet.store.variables.MAX_HEALTH_BONUS.value, 7);
});

test('cyclic bindings reject without replacing the committed sheet and a corrected graph can retry', async () => {
  const previousWindow = globalThis.window;
  globalThis.window = {};
  const execute = (operations) =>
    engine.executeOperations(
      { type: 'CHARACTER', data: { character: character(operations), content, context: 'CHARACTER-SHEET' } },
      { directExecution: true }
    );
  try {
    await execute([set('MAX_HEALTH_BONUS', 17)]);
    const cycle = [create('BREW_A', 1), create('BREW_B', 2), bind('BREW_A', 'BREW_B'), bind('BREW_B', 'BREW_A')];
    await assert.rejects(
      execute(cycle),
      /Cyclic variable binding: CHARACTER.BREW_A -> CHARACTER.BREW_B -> CHARACTER.BREW_A/
    );
    assert.equal(engine.getVariable('CHARACTER', 'MAX_HEALTH_BONUS').value, 17);
    await execute([
      create('BREW_A', 1),
      create('BREW_B', 2),
      bind('MAX_HEALTH_BONUS', 'BREW_A'),
      bind('BREW_A', 'BREW_B'),
    ]);
    assert.equal(engine.getVariable('CHARACTER', 'MAX_HEALTH_BONUS').value, 2);
  } finally {
    globalThis.window = previousWindow;
  }
});

test('self-bindings preserve the final value and do not make dependent bindings cyclic', async () => {
  const packet = await calculate([set('SPEED', 25), bind('MAX_HEALTH_BONUS', 'SPEED'), bind('SPEED', 'SPEED')]);
  assert.equal(packet.store.variables.MAX_HEALTH_BONUS.value, 25);
  assert.equal(packet.store.variables.SPEED.value, 25);
});

test('long homebrew binding chains resolve without depending on recursive call-stack depth', async () => {
  const variables = Array.from({ length: 256 }, (_, index) => `BREW_${index}`);
  const links = variables.map((variable, index) => bind(variable, variables[index + 1] ?? 'SPEED'));
  const packet = await calculate([...variables.map((variable) => create(variable)), set('SPEED', 31), ...links]);
  for (const variable of variables) assert.equal(packet.store.variables[variable].value, 31, variable);
});

test('companion binding chains read their current owner without changing the owner store', async () => {
  const parent = await calculate([set('SPEED', 25)]);
  const parentSnapshot = structuredClone(parent.store);
  const packet = await engine._executeCreatureOperations({
    id: 'brew-companion',
    creature: {
      name: 'Homebrew companion',
      level: 1,
      inventory: { items: [] },
      operations: [
        create('BREW_COUNTER'),
        op('child-target', 'bindValue', {
          variable: 'MAX_HEALTH_BONUS',
          value: { storeId: 'brew-companion', variable: 'BREW_COUNTER' },
        }),
        bind('BREW_COUNTER', 'SPEED'),
      ],
    },
    content,
    charStore: parent.store,
  });
  assert.equal(packet.store.variables.BREW_COUNTER.value, 25);
  assert.equal(packet.store.variables.MAX_HEALTH_BONUS.value, 25);
  assert.deepEqual(parent.store, parentSnapshot);
});

test('duplicate speed bindings preserve the existing strongest-speed rule', async () => {
  const packet = await calculate([
    create('BREW_FAST', 40),
    create('BREW_SLOW', 15),
    set('SPEED', 25),
    bind('MAX_HEALTH_BONUS', 'SPEED'),
    bind('SPEED', 'BREW_FAST', 'bind-fast'),
    bind('SPEED', 'BREW_SLOW', 'bind-slow'),
  ]);
  assert.equal(packet.store.variables.SPEED.value, 40);
  assert.equal(packet.store.variables.MAX_HEALTH_BONUS.value, 40);
});

test('trailing self-binding cannot erase an earlier applicable binding', async () => {
  const packet = await calculate([
    create('BREW_A', 1),
    create('BREW_B', 7),
    bind('BREW_A', 'BREW_B', 'bind-other'),
    bind('BREW_A', 'BREW_A', 'bind-self'),
    bind('MAX_HEALTH_BONUS', 'BREW_A'),
  ]);
  assert.equal(packet.store.variables.BREW_A.value, 7);
  assert.equal(packet.store.variables.MAX_HEALTH_BONUS.value, 7);
});

test('nested skill guards can read a variable created earlier in their active branch', async () => {
  const packet = await calculate([
    op('outer-branch', 'conditional', {
      conditions: [],
      trueOperations: [
        op('create-lore', 'createValue', {
          variable: 'SKILL_LORE_BREW',
          type: 'prof',
          value: { value: 'T', increases: 0, attribute: 'ATTRIBUTE_INT' },
        }),
        op('self-guarded-rank', 'conditional', {
          conditions: [{ id: 'rank-check', name: 'SKILL_LORE_BREW', type: 'prof', operator: 'LESS_THAN', value: 'E' }],
          trueOperations: [op('expert-lore', 'adjValue', { variable: 'SKILL_LORE_BREW', value: { value: 'E' } })],
        }),
      ],
    }),
  ]);
  assert.equal(packet.store.variables.SKILL_LORE_BREW.value.value, 'E');
});

test('all proficiency assignments preserve attribute metadata before downstream copies', async () => {
  const packet = await calculate([
    op('create-first-prof', 'createValue', {
      variable: 'BREW_FIRST_PROF',
      type: 'prof',
      value: { value: 'T', attribute: 'ATTRIBUTE_STR' },
    }),
    op('create-second-prof', 'createValue', { variable: 'BREW_SECOND_PROF', type: 'prof', value: { value: 'E' } }),
    bind('SAVE_FORT', 'SAVE_REFLEX', 'downstream-reflex'),
    bind('SAVE_REFLEX', 'BREW_FIRST_PROF', 'initial-proficiency'),
    bind('SAVE_REFLEX', 'BREW_SECOND_PROF', 'final-proficiency'),
  ]);
  assert.equal(packet.store.variables.SAVE_REFLEX.value.value, 'E');
  assert.equal(packet.store.variables.SAVE_REFLEX.value.attribute, 'ATTRIBUTE_STR');
  assert.equal(packet.store.variables.SAVE_FORT.value.value, 'E');
  assert.equal(packet.store.variables.SAVE_FORT.value.attribute, 'ATTRIBUTE_STR');
});

test('removed cyclic grants do not enter the remaining binding graph', async () => {
  const feat = {
    id: 92001,
    name: 'Removed cyclic grant',
    type: 'feat',
    level: 1,
    operations: [bind('BREW_A', 'BREW_B', 'removed-forward'), bind('BREW_B', 'BREW_A', 'removed-backward')],
  };
  engine.setFixtures([{ table: 'ability_block', row: feat }]);
  try {
    const packet = await calculate([
      create('BREW_A', 3),
      create('BREW_B', 7),
      op('give-cyclic-feat', 'giveAbilityBlock', { type: 'feat', abilityBlockId: 92001 }),
      op('remove-cyclic-feat', 'removeAbilityBlock', { type: 'feat', abilityBlockId: 92001 }),
      bind('MAX_HEALTH_BONUS', 'BREW_A'),
      bind('BREW_A', 'BREW_B', 'remaining-link'),
    ]);
    assert.equal(packet.store.variables.BREW_A.value, 7);
    assert.equal(packet.store.variables.MAX_HEALTH_BONUS.value, 7);
  } finally {
    engine.setFixtures([]);
  }
});

test('removing a later assignment preserves an independent earlier binding', async () => {
  const feat = {
    id: 92002,
    name: 'Removed later binding',
    type: 'feat',
    level: 1,
    operations: [bind('BREW_A', 'BREW_SECOND', 'removed-assignment')],
  };
  engine.setFixtures([{ table: 'ability_block', row: feat }]);
  try {
    const packet = await calculate([
      create('BREW_A'),
      create('BREW_FIRST', 3),
      create('BREW_SECOND', 7),
      bind('MAX_HEALTH_BONUS', 'BREW_A'),
      bind('BREW_A', 'BREW_FIRST', 'independent-assignment'),
      op('give-later-assignment', 'giveAbilityBlock', { type: 'feat', abilityBlockId: 92002 }),
      op('remove-later-assignment', 'removeAbilityBlock', { type: 'feat', abilityBlockId: 92002 }),
    ]);
    assert.equal(packet.store.variables.BREW_A.value, 3);
    assert.equal(packet.store.variables.MAX_HEALTH_BONUS.value, 3);
  } finally {
    engine.setFixtures([]);
  }
});
