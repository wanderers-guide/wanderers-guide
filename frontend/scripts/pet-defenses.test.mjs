/** Public Pet calculations and runtime snapshot controls against complete native content rows. */
import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { writeFileSync } from 'node:fs';
import { CharacterSchema, CreatureSchema, OperationExecutionSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { inventoryItem } from './fixtures/eidolon.mjs';

const DEFENSE_NAMES = ['AC_BONUS', 'SAVE_FORT', 'SAVE_REFLEX', 'SAVE_WILL'];
const ORIGINAL_DEFENSES = { ac: 17, SAVE_FORT: 6, SAVE_REFLEX: 8, SAVE_WILL: 5 };
const OTHER_DEFENSES = { ac: 15, SAVE_FORT: 8, SAVE_REFLEX: 6, SAVE_WILL: 9 };
const UNBOUND_DEFENSES = { ac: 10, SAVE_FORT: 0, SAVE_REFLEX: 0, SAVE_WILL: 0 };
const ZERO_CONTEXT = { AC_BONUS: 10, SAVE_FORT: 0, SAVE_REFLEX: 0, SAVE_WILL: 0 };
const observations = [];
const counts = {
  public_attempted: 0,
  public_completed: 0,
  public_cancelled: 0,
  public_failed: 0,
  direct_attempted: 0,
  direct_completed: 0,
  worker_handler_calls: 0,
  json_v4_public_calls: 0,
};
const originalGlobals = Object.fromEntries(
  ['window', 'Worker', 'FileReader', 'fetch', 'navigator'].map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key),
  ])
);
/** Restore original descriptors, including exact absence rather than an own undefined property. */
function restoreGlobals(descriptors) {
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}
let engine,
  workerEngine,
  rows,
  baseRows,
  armorBase,
  nativeBefore,
  networkAttempts = 0;
const op = (id, type, data) => ({ id, type, data });
const originalSet = (variable, value) => op(`private-pet-diagnostic-set-${variable}`, 'setValue', { variable, value });
let fixtureOperationId = 0;
const set = (variable, value) =>
  op(`pet-acceptance-set-${variable}-${++fixtureOperationId}`, 'setValue', { variable, value });
const bonus = (id, variable, value, type, text = '') => op(id, 'addBonusToValue', { variable, value, type, text });

/** Exact original red/green owner operations, with no saved calculated-stat dependency. */
const ORIGINAL_OWNER_OPERATIONS = [
  originalSet('ATTRIBUTE_DEX', { value: 3 }),
  originalSet('ATTRIBUTE_CON', { value: 2 }),
  originalSet('ATTRIBUTE_WIS', { value: 1 }),
  originalSet('UNARMORED_DEFENSE', { value: 'T' }),
  originalSet('SAVE_FORT', { value: 'T', attribute: 'ATTRIBUTE_CON' }),
  originalSet('SAVE_REFLEX', { value: 'T', attribute: 'ATTRIBUTE_DEX' }),
  originalSet('SAVE_WILL', { value: 'T', attribute: 'ATTRIBUTE_WIS' }),
  bonus('private-pet-diagnostic-item-AC_BONUS-1', 'AC_BONUS', 1, 'item'),
  bonus('private-pet-diagnostic-item-SAVE_FORT-1', 'SAVE_FORT', 1, 'item'),
  bonus('private-pet-diagnostic-item-SAVE_REFLEX-2', 'SAVE_REFLEX', 2, 'item'),
  bonus('private-pet-diagnostic-untyped-SAVE_WILL-1', 'SAVE_WILL', 1, 'untyped'),
];
const exact = (table, id) => {
  const matches = rows.filter((entry) => entry.table === table && entry.row.id === id);
  assert.equal(matches.length, 1, `${table}:${id}`);
  return matches[0].row;
};
const coins = () => ({ cp: 1, sp: 7, gp: 0, pp: 0 });
const inventory = (items = []) => ({ coins: coins(), items });

/** The original complete owner envelope; overrides are explicit local acceptance fixtures. */
function owner(overrides = {}) {
  return CharacterSchema.parse({
    id: -990811,
    name: 'Private Pet diagnostic owner',
    level: 1,
    experience: 0,
    inventory: inventory(),
    hp_current: 1,
    hp_temp: 0,
    stamina_current: 0,
    resolve_current: 0,
    details: {},
    notes: null,
    roll_history: null,
    spells: null,
    operation_data: { selections: {} },
    meta_data: {},
    created_at: 'private-fixture-only',
    campaign_id: null,
    user_id: '00000000-0000-4000-8000-000000000001',
    hero_points: 1,
    custom_operations: structuredClone(ORIGINAL_OWNER_OPERATIONS),
    options: { custom_operations: true },
    variants: {},
    content_sources: { enabled: [1, 3] },
    companions: { list: [] },
    ...overrides,
  });
}

/** Preserve the full native Pet row and every operation, adding only saved entity defaults. */
function pet(id = 12086, overrides = {}) {
  const row = exact('creature', id);
  return CreatureSchema.parse({
    ...structuredClone(row),
    experience: 0,
    inventory: inventory(),
    hp_current: 1,
    hp_temp: 0,
    stamina_current: 0,
    resolve_current: 0,
    notes: null,
    roll_history: null,
    spells: null,
    operation_data: { selections: {} },
    abilities_added: [],
    ...overrides,
  });
}
function content(extraRows = []) {
  const available = [...baseRows, ...extraRows];
  const ofType = (table) =>
    available.filter((entry) => entry.table === table).map((entry) => structuredClone(entry.row));
  return {
    ancestries: [],
    backgrounds: [],
    classes: [],
    abilityBlocks: ofType('ability_block'),
    items: ofType('item'),
    languages: [],
    spells: [],
    traits: ofType('trait'),
    creatures: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    defaultSources: { PAGE: [1, 3], INFO: [1, 3] },
  };
}
const ownerInput = (character = owner(), packageContent = content()) => ({
  type: 'CHARACTER',
  data: { character, content: packageContent, context: 'CHARACTER-SHEET' },
});
const petInput = (creature = pet(), id = 'PRIVATE_PET_MINIMAL_DEFENSES', packageContent = content()) => ({
  type: 'CREATURE',
  data: { id, creature, content: packageContent },
});
const contextFor = ({ ac, ...saves }) => ({ AC_BONUS: ac, ...saves });
function defenses(target, id, inv) {
  return {
    ac: target.getFinalAcValue(id, target.getBestArmor(id, inv)?.item),
    SAVE_FORT: Number(target.getFinalProfValue(id, 'SAVE_FORT')),
    SAVE_REFLEX: Number(target.getFinalProfValue(id, 'SAVE_REFLEX')),
    SAVE_WILL: Number(target.getFinalProfValue(id, 'SAVE_WILL')),
  };
}
function assertParts(target, id, inherited) {
  assert.equal(target.getAcParts(id).isInheritedDefense, inherited);
  for (const name of DEFENSE_NAMES.slice(1)) {
    const parts = target.getProfValueParts(id, name);
    assert.equal(parts.isInheritedDefense, inherited, name);
    if (inherited) assert.deepEqual([parts.profValue, parts.level, parts.attributeMod], [0, 0, null], name);
  }
}

/** Capture actual inputs, ORS and committed stores before assertions, including expected cancellation. */
async function calculate(input, options = { directExecution: true }) {
  const execution = OperationExecutionSchema.parse(input);
  const beforeInput = structuredClone(execution);
  const id = execution.type === 'CHARACTER' ? 'CHARACTER' : execution.data.id;
  counts.public_attempted++;
  if (options.directExecution) counts.direct_attempted++;
  let ors;
  try {
    ors = await engine.executeOperations(execution, options);
  } catch (error) {
    if (error.name === 'AbortError') counts.public_cancelled++;
    else counts.public_failed++;
    observations.push({
      kind: 'public-error',
      input: beforeInput,
      name: error.name,
      message: error.message,
      store: engine.exportVariableStore(id),
      captured_before_assertions: true,
    });
    throw error;
  }
  counts.public_completed++;
  if (options.directExecution) counts.direct_completed++;
  const store = engine.exportVariableStore(id);
  const actual = defenses(engine, id, (execution.data.character ?? execution.data.creature).inventory);
  observations.push({
    kind: 'public',
    input: beforeInput,
    options: { directExecution: !!options.directExecution },
    ors,
    store,
    actual,
    operation_errors: engine.getOperationErrorNotifications(),
    captured_before_assertions: true,
  });
  assert.deepEqual(execution, beforeInput, 'calculation must not mutate its input');
  assert.deepEqual(rows, nativeBefore, 'calculation must not mutate native content');
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  assert.equal(networkAttempts, 0);
  return { ors, store, actual };
}

/** Drive the real isolated worker handler through a cloned external port, never stub its arithmetic. */
async function workerResponse(request) {
  const posted = [];
  workerEngine.workerPort.postMessage = (message) => posted.push(structuredClone(message));
  const beforeRequest = structuredClone(request);
  counts.worker_handler_calls++;
  await workerEngine.workerPort.onmessage({ data: structuredClone(request) });
  observations.push({
    kind: 'actual-worker-handler',
    request: beforeRequest,
    responses: structuredClone(posted),
    captured_before_assertions: true,
  });
  assert.equal(posted.length, 1);
  assert.equal(posted[0].status, 'success', posted[0].message);
  assert.deepEqual(posted[0].data.errors, []);
  assert.equal(workerEngine.VariableStoreSchema.safeParse(posted[0].data.store).success, true);
  assert.deepEqual(workerEngine.getOperationErrorNotifications(), []);
  assert.equal(networkAttempts, 0);
  return posted[0];
}

before(async () => {
  globalThis.window = {};
  globalThis.fetch = async () => {
    networkAttempts++;
    throw new Error('Pet regressions deny every network request');
  };
  rows = await readContentRows([
    { table: 'creature', id: 12086 },
    { table: 'creature', id: 12109 },
    { table: 'ability_block', id: 20407 },
    { table: 'ability_block', id: 19330 },
    ...[4265, 2409, 2429, 3843, 2937, 1527, 1504].map((id) => ({ table: 'trait', id })),
    { table: 'item', id: 6985 },
  ]);
  nativeBefore = structuredClone(rows);
  baseRows = rows.filter(
    (entry) =>
      (entry.table === 'trait' && [4265, 2409, 2429].includes(entry.row.id)) ||
      (entry.table === 'ability_block' && entry.row.id === 19330)
  );
  armorBase = exact('item', 6985);
  assert.equal(exact('creature', 12086).operations.length, 12);
  assert.equal(exact('creature', 12109).operations.length, 13);
  assert.equal(exact('creature', 12086).content_source_id, 1);
  assert.equal(exact('trait', 4265).name, 'Pet');
  assert(
    exact('ability_block', 20407).description.includes('before applying circumstance or status bonuses or penalties')
  );
  engine = await createOperationEngine({ exportJson: true, importJson: true });
  workerEngine = await createOperationEngine({ workerEntry: true });
});
beforeEach(() => {
  for (const target of [engine, workerEngine]) {
    target.resetVariables();
    target.clearDeferredOperations();
    target.clearOperationErrorNotifications();
    target.setFixtures(rows.filter((entry) => entry.table !== 'ability_block' || entry.row.id === 19330));
  }
  engine.clearJsonDownload();
  engine.clearJsonImportRequests();
});
after(async () => {
  try {
    if (process.env.WG_PET_ACCEPTANCE_WITNESS) {
      writeFileSync(
        process.env.WG_PET_ACCEPTANCE_WITNESS,
        JSON.stringify(
          { counts, network_attempts: networkAttempts, observations },
          (_key, value) =>
            typeof value === 'number' && !Number.isFinite(value) ? { nonfinite_number: String(value) } : value,
          2
        ) + '\n',
        { flag: 'wx', mode: 0o600 }
      );
    }
    assert.equal(networkAttempts, 0);
  } finally {
    await engine?.cleanup();
    await workerEngine?.cleanup();
    restoreGlobals(originalGlobals);
  }
});

test('native Normal Pet inherits the exact original fresh owner four defenses', async () => {
  const first = ownerInput(),
    second = petInput();
  assert.deepEqual(second.data.creature.operations, exact('creature', 12086).operations);
  assert.deepEqual(first.data.character.custom_operations, ORIGINAL_OWNER_OPERATIONS);
  assert.deepEqual((await calculate(first)).actual, ORIGINAL_DEFENSES);
  const result = await calculate(second);
  assert.deepEqual(result.actual, ORIGINAL_DEFENSES);
  assert.deepEqual(result.store.petOwnerDefenses, contextFor(ORIGINAL_DEFENSES));
  assertParts(engine, second.data.id, true);
});

test('native Aquatic Pet retains all operations and inherits level-five owner defenses', async () => {
  const expected = { ac: 21, SAVE_FORT: 10, SAVE_REFLEX: 12, SAVE_WILL: 9 };
  await calculate(ownerInput(owner({ level: 5 })));
  const aquatic = petInput(pet(12109), 'AQUATIC_PET');
  assert.deepEqual(aquatic.data.creature.operations, exact('creature', 12109).operations);
  assert.deepEqual((await calculate(aquatic)).actual, expected);
  assertParts(engine, aquatic.data.id, true);
});

/**
 * Consumer compatibility witness for existing convertGranularCreature residual operations.
 * This is not an importer execution: the producer at creature-import.ts:153-173
 * stores absolute AC/save residuals in the same shapes as direct manual adjustments.
 * Preserve the old stat block totals, rather than blessing double-counted inheritance.
 */
test('existing custom imported Pet residuals preserve their absolute stat block defenses', async () => {
  await calculate(ownerInput());
  const operations = [
    ...['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map((name) => set(`ATTRIBUTE_${name}`, { value: 0, partial: false })),
    op('converted-pet-trait', 'giveTrait', { traitId: 4265 }),
    op('converted-ac-residual', 'adjValue', { variable: 'AC_BONUS', value: 2 }),
    ...[
      ['SAVE_FORT', '+2'],
      ['SAVE_REFLEX', '+3'],
      ['SAVE_WILL', '+1'],
    ].map(([variable, value]) =>
      op(`converted-${variable}-residual`, 'addBonusToValue', { variable, text: '', value })
    ),
  ];
  const imported = pet(12086, {
    id: -1,
    name: 'Existing converted custom Pet',
    operations,
    abilities_base: [],
    abilities_added: [],
    details: { description: '' },
    meta_data: null,
  });
  const result = await calculate(petInput(imported, 'EXISTING_CONVERTED_PET'));
  assert.deepEqual(
    result.actual,
    { ac: 12, SAVE_FORT: 2, SAVE_REFLEX: 3, SAVE_WILL: 1 },
    'producer-generated residuals must not be added on top of owner defenses'
  );
});

test('raw direct and indirect owner circumstance/status effects do not transfer but Pet direct modifiers remain', async () => {
  const character = owner({
    custom_operations: [
      ...ORIGINAL_OWNER_OPERATIONS,
      bonus('owner-ac-circ', 'AC_BONUS', 4, 'circumstance'),
      bonus('owner-ref-status', 'SAVE_REFLEX', 8, 'status'),
      bonus('owner-dex-status', 'ATTRIBUTE_DEX', 2, ' Status '),
      bonus('owner-con-status', 'ATTRIBUTE_CON', -1, 'status'),
      bonus('owner-wis-circ', 'ATTRIBUTE_WIS', 3, 'circumstance'),
    ],
  });
  const ownerResult = await calculate(ownerInput(character));
  assert.deepEqual(ownerResult.actual, { ac: 23, SAVE_FORT: 5, SAVE_REFLEX: 18, SAVE_WILL: 8 });
  assert.deepEqual(ownerResult.store.petOwnerDefenses, contextFor(ORIGINAL_DEFENSES));
  const creature = pet();
  creature.operations.push(
    bonus('pet-ac-circ', 'AC_BONUS', -1, 'circumstance'),
    bonus('pet-fort-status', 'SAVE_FORT', 2, 'status'),
    bonus('pet-ref-untyped', 'SAVE_REFLEX', -3, 'untyped'),
    bonus('pet-will-conditional', 'SAVE_WILL', 2, 'status', 'against test effects')
  );
  assert.deepEqual((await calculate(petInput(creature))).actual, {
    ac: 16,
    SAVE_FORT: 8,
    SAVE_REFLEX: 5,
    SAVE_WILL: 5,
  });
  assert.equal(engine.getProfValueParts('PRIVATE_PET_MINIMAL_DEFENSES', 'SAVE_WILL').hasConditionals, true);
});

/** A validated local armor clone, with independent literal AC and penalty values. */
function armor(id, ac, dexCap, checkPenalty, speedPenalty, runes = {}) {
  return engine.ItemSchema.parse({
    ...structuredClone(armorBase),
    id,
    name: `Pet regression armor ${id}`,
    operations: [],
    traits: [1527],
    meta_data: {
      bulk: {},
      quantity: 1,
      category: 'medium',
      group: 'plate',
      ac_bonus: ac,
      dex_cap: dexCap,
      strength: 100,
      check_penalty: checkPenalty,
      speed_penalty: speedPenalty,
      runes: { potency: 0, resilient: 0, property: [], ...runes },
    },
  });
}
test('owner armor Dex cap and invested potency/resilient arithmetic transfer exactly once', async () => {
  for (const invested of [true, false]) {
    const worn = armor(-990821, 4, 1, -2, -10, { potency: 2, resilient: 1 });
    const character = owner({
      inventory: inventory([inventoryItem(worn, { is_equipped: true, is_invested: invested })]),
      custom_operations: [
        ...ORIGINAL_OWNER_OPERATIONS,
        set('MEDIUM_ARMOR', { value: 'T' }),
        set('ATTRIBUTE_DEX', { value: 5 }),
      ],
    });
    const expected = invested
      ? { ac: 20, SAVE_FORT: 6, SAVE_REFLEX: 10, SAVE_WILL: 6 }
      : { ac: 18, SAVE_FORT: 6, SAVE_REFLEX: 10, SAVE_WILL: 5 };
    assert.deepEqual((await calculate(ownerInput(character))).actual, expected);
    assert.deepEqual((await calculate(petInput())).actual, expected);
  }
});

/** Bound Pet Dex tests concern only the four-defense replacement, not attribute-wide immunity. */
async function calculateArmoredPet(items) {
  await calculate(ownerInput());
  const creature = pet(12086, {
    inventory: inventory(items),
    operations: [...exact('creature', 12086).operations, set('ATTRIBUTE_DEX', { value: 4 })],
  });
  const input = petInput(creature);
  const result = await calculate(input);
  assert.deepEqual(result.actual, ORIGINAL_DEFENSES);
  return { creature, id: input.data.id };
}
test('higher intrinsic second armor wins without changing inherited AC or its physical penalties', async () => {
  const first = armor(-990831, 1, 0, -1, -5),
    second = armor(-990832, 3, 1, -3, -15);
  const { creature, id } = await calculateArmoredPet([
    inventoryItem(first, { is_equipped: true }),
    inventoryItem(second, { is_equipped: true }),
  ]);
  assert.equal(engine.getFinalAcValue(id, first, { useIntrinsicArmor: true }), 11);
  assert.equal(engine.getFinalAcValue(id, second, { useIntrinsicArmor: true }), 14);
  assert.equal(engine.getBestArmor(id, creature.inventory).item.id, second.id);
  assert.equal(engine.getFinalAcValue(id, first), 17);
  assert.equal(engine.getFinalAcValue(id, second), 17);
  assert.deepEqual([engine.getAcParts(id, second).checkPenalty, engine.getAcParts(id, second).speedPenalty], [-3, -15]);
  assert.equal(engine.getAcParts(id, second, { useIntrinsicArmor: true }).isInheritedDefense, false);
  engine.applyEquipmentPenalties(id, creature);
  assert.equal(Number(engine.getFinalProfValue(id, 'SKILL_ACROBATICS')), 5);
  assert.equal(engine.getSpeedValue(id, engine.getVariable(id, 'SPEED'), creature).total, 10);
  const negativeCap = armor(-990833, 1, -4, 0, 0);
  assert.equal(engine.getFinalAcValue(id, negativeCap), 17);
  assert.equal(engine.getFinalAcValue(id, negativeCap, { useIntrinsicArmor: true }), 7);
});
test('exact intrinsic ties preserve first armor and ignore higher formulas and unequipped armor', async () => {
  const first = armor(-990841, 3, 1, -1, -5),
    tie = armor(-990842, 3, 1, -3, -15),
    ignored = armor(-990843, 10, 4, -9, -30);
  const { creature, id } = await calculateArmoredPet([
    inventoryItem(first, { is_equipped: true }),
    inventoryItem(tie, { is_equipped: true }),
    inventoryItem(ignored, { is_equipped: true, is_formula: true }),
    inventoryItem(ignored),
  ]);
  assert.equal(engine.getBestArmor(id, creature.inventory).item.id, first.id);
  engine.applyEquipmentPenalties(id, creature);
  assert.equal(Number(engine.getFinalProfValue(id, 'SKILL_ACROBATICS')), 7);
  assert.equal(engine.getSpeedValue(id, engine.getVariable(id, 'SPEED'), creature).total, 20);
});
test('no eligible armor retains inherited unarmored display without equipment penalties', async () => {
  const ignored = armor(-990851, 10, 4, -9, -30);
  const { creature, id } = await calculateArmoredPet([
    inventoryItem(ignored, { is_equipped: true, is_formula: true }),
    inventoryItem(ignored),
  ]);
  assert.equal(engine.getBestArmor(id, creature.inventory), null);
  engine.applyEquipmentPenalties(id, creature);
  assert.equal(Number(engine.getFinalProfValue(id, 'SKILL_ACROBATICS')), 8);
  assert.equal(engine.getSpeedValue(id, engine.getVariable(id, 'SPEED'), creature).total, 25);
});

test('PWL trained and untrained owners transfer once, with zero saves and unbound fallback preserved', async () => {
  for (const trained of [true, false]) {
    const character = owner({
      level: 5,
      variants: { proficiency_without_level: true },
      custom_operations: trained
        ? ORIGINAL_OWNER_OPERATIONS
        : ORIGINAL_OWNER_OPERATIONS.map((entry) =>
            entry.type === 'setValue' && ['UNARMORED_DEFENSE', ...DEFENSE_NAMES.slice(1)].includes(entry.data.variable)
              ? { ...entry, data: { ...entry.data, value: { ...entry.data.value, value: 'U' } } }
              : entry
          ),
    });
    const expected = trained
      ? { ac: 16, SAVE_FORT: 5, SAVE_REFLEX: 7, SAVE_WILL: 4 }
      : { ac: 12, SAVE_FORT: 1, SAVE_REFLEX: 3, SAVE_WILL: 0 };
    const result = await calculate(ownerInput(character));
    assert.deepEqual(
      result.store.petOwnerDefenses,
      contextFor(expected),
      'requested PWL applies before completion caller sets its flag'
    );
    engine.setVariable('CHARACTER', 'PROF_WITHOUT_LEVEL', true);
    assert.deepEqual((await calculate(petInput())).actual, expected);
    assertParts(engine, 'PRIVATE_PET_MINIMAL_DEFENSES', true);
    if (!trained) {
      const unbound = engine.exportVariableStore('CHARACTER');
      delete unbound.petOwnerDefenses;
      engine.importVariableStore('CHARACTER', unbound);
      assert.deepEqual((await calculate(petInput())).actual, { ac: 8, SAVE_FORT: -2, SAVE_REFLEX: -2, SAVE_WILL: -2 });
      assertParts(engine, 'PRIVATE_PET_MINIMAL_DEFENSES', false);
    }
  }
});
test('legitimate zero owner saving throws still activate complete inheritance', async () => {
  const zeroOps = [
    set('ATTRIBUTE_DEX', { value: 0 }),
    set('ATTRIBUTE_CON', { value: 0 }),
    set('ATTRIBUTE_WIS', { value: 0 }),
    set('UNARMORED_DEFENSE', { value: 'U' }),
    ...DEFENSE_NAMES.slice(1).map((name) =>
      set(name, {
        value: 'U',
        attribute: { SAVE_FORT: 'ATTRIBUTE_CON', SAVE_REFLEX: 'ATTRIBUTE_DEX', SAVE_WILL: 'ATTRIBUTE_WIS' }[name],
      })
    ),
  ];
  const result = await calculate(ownerInput(owner({ custom_operations: zeroOps })));
  assert.deepEqual(result.store.petOwnerDefenses, ZERO_CONTEXT);
  assert.deepEqual((await calculate(petInput())).actual, UNBOUND_DEFENSES);
  assertParts(engine, 'PRIVATE_PET_MINIMAL_DEFENSES', true);
});
test('absent partial and nonfinite context are not defaulted or inherited', async () => {
  for (const invalid of [
    undefined,
    { AC_BONUS: 99 },
    { AC_BONUS: Infinity, SAVE_FORT: 99, SAVE_REFLEX: 99, SAVE_WILL: 99 },
  ]) {
    engine.resetVariables('CHARACTER');
    const store = engine.exportVariableStore('CHARACTER');
    if (invalid !== undefined) store.petOwnerDefenses = invalid;
    assert.equal(engine.VariableStoreSchema.safeParse(store).success, invalid === undefined);
    engine.importVariableStore('CHARACTER', store);
    const result = await calculate(petInput());
    assert.deepEqual(result.actual, UNBOUND_DEFENSES);
    assert.equal(result.store.petOwnerDefenses, undefined);
    assertParts(engine, 'PRIVATE_PET_MINIMAL_DEFENSES', false);
  }
});
test('authored numeric or wrong-type context-like keys stay untouched and cannot manufacture a baseline', async () => {
  const magic = DEFENSE_NAMES.flatMap((name) => [
    op(`numeric-${name}`, 'createValue', { variable: `PET_OWNER_${name}`, type: 'num', value: 999 }),
    op(`string-${name}`, 'createValue', { variable: `PET:OWNER_${name}`, type: 'str', value: 'authored value' }),
  ]);
  await calculate(ownerInput(owner({ custom_operations: [...ORIGINAL_OWNER_OPERATIONS, ...magic] })));
  const creature = pet(12086, { operations: [...exact('creature', 12086).operations, ...magic] });
  assert.deepEqual((await calculate(petInput(creature))).actual, ORIGINAL_DEFENSES);
  for (const id of ['CHARACTER', 'PRIVATE_PET_MINIMAL_DEFENSES'])
    for (const name of DEFENSE_NAMES) {
      assert.equal(engine.getVariable(id, `PET_OWNER_${name}`).value, 999);
      assert.equal(engine.getVariable(id, `PET:OWNER_${name}`).value, 'authored value');
    }
  engine.resetVariables('CHARACTER');
  for (const name of DEFENSE_NAMES) engine.addVariable('CHARACTER', 'num', `PET_OWNER_${name}`, 999);
  assert.deepEqual((await calculate(petInput(creature))).actual, UNBOUND_DEFENSES);
  assertParts(engine, 'PRIVATE_PET_MINIMAL_DEFENSES', false);
});

function otherOwner() {
  return owner({
    custom_operations: [
      ...ORIGINAL_OWNER_OPERATIONS,
      set('ATTRIBUTE_DEX', { value: 1 }),
      set('ATTRIBUTE_CON', { value: 4 }),
      set('ATTRIBUTE_WIS', { value: 5 }),
    ],
  });
}
test('saved calculated stats and later owner resets cannot rewrite a previously calculated Pet snapshot', async () => {
  const saved = {
    calculated_stats: {
      ac: 999,
      profs: Object.fromEntries(DEFENSE_NAMES.slice(1).map((name) => [name, { total: 999, type: 'L' }])),
    },
  };
  await calculate(ownerInput(owner({ meta_data: saved })));
  await calculate(petInput(pet(12086, { meta_data: saved }), 'PET_A'));
  assert.equal(engine.getVariable('PET_A', 'CS:AC').value, 999);
  await calculate(ownerInput(otherOwner()));
  assert.deepEqual(
    defenses(engine, 'PET_A'),
    ORIGINAL_DEFENSES,
    'old child is job-local, not a lazy live-owner lookup'
  );
  await calculate(petInput(pet(), 'PET_B'));
  assert.deepEqual(defenses(engine, 'PET_B'), OTHER_DEFENSES);
  engine.resetVariables('CHARACTER');
  assert.deepEqual(defenses(engine, 'PET_A'), ORIGINAL_DEFENSES);
  assert.deepEqual((await calculate(petInput(pet(), 'PET_A'))).actual, UNBOUND_DEFENSES);
  assert.deepEqual(defenses(engine, 'PET_B'), OTHER_DEFENSES);
});
test('ordinary name-only Pet Familiar and Eidolon controls keep their own defense formula', async () => {
  await calculate(ownerInput());
  for (const traitId of [null, 3843, 2937]) {
    const creature = pet(12086, {
      name: traitId ? `Control ${traitId}` : 'Normal Pet',
      level: 2,
      operations: [
        set('ATTRIBUTE_DEX', { value: 1 }),
        set('ATTRIBUTE_CON', { value: 0 }),
        set('ATTRIBUTE_WIS', { value: -1 }),
        set('UNARMORED_DEFENSE', { value: 'T' }),
        ...DEFENSE_NAMES.slice(1).map((name) =>
          set(name, {
            value: 'T',
            attribute: { SAVE_FORT: 'ATTRIBUTE_CON', SAVE_REFLEX: 'ATTRIBUTE_DEX', SAVE_WILL: 'ATTRIBUTE_WIS' }[name],
          })
        ),
        ...(traitId ? [op(`control-trait-${traitId}`, 'giveTrait', { traitId })] : []),
      ],
    });
    const packageContent = content(traitId ? [{ table: 'trait', row: exact('trait', traitId) }] : []);
    const id = `ORDINARY_CONTROL_${traitId ?? 'NAME'}`;
    const result = await calculate(petInput(creature, id, packageContent));
    assert.deepEqual(result.actual, { ac: 15, SAVE_FORT: 4, SAVE_REFLEX: 5, SAVE_WILL: 3 });
    assert.equal(result.store.petOwnerDefenses, undefined);
    assertParts(engine, id, false);
  }
});

test('synchronous filtered views restore exact live identity and replayable grants on success and throw', async () => {
  engine.beginVariableEffects('CHARACTER');
  try {
    await engine.withVariableEffectScope('CHARACTER', 'keep', 'keep-source', false, async () =>
      engine.adjVariable('CHARACTER', 'MAX_HEALTH_BONUS', 2, 'keep')
    );
    await engine.withVariableEffectScope('CHARACTER', 'drop', 'drop-source', false, async () => {
      engine.adjVariable('CHARACTER', 'MAX_HEALTH_BONUS', 5, 'drop');
      await engine.withSkillEffectContext('CHARACTER', 'view-skill', 1, async () => {
        const variables = engine.getVariables('CHARACTER'),
          scope = engine.getVariableEffectScopes('CHARACTER')[0],
          skill = engine.getSkillEffectContext('CHARACTER');
        const view = engine.exportVariableStore('CHARACTER');
        view.variables.MAX_HEALTH_BONUS.value = 88;
        assert.equal(
          engine.readVariableStoreView('CHARACTER', view, () => {
            assert.notEqual(engine.getVariables('CHARACTER'), variables);
            return engine.getVariable('CHARACTER', 'MAX_HEALTH_BONUS').value;
          }),
          88
        );
        assert.equal(engine.getVariables('CHARACTER'), variables);
        assert.equal(engine.getVariableEffectScopes('CHARACTER')[0], scope);
        assert.equal(engine.getSkillEffectContext('CHARACTER'), skill);
        const sentinel = new Error('read-view sentinel');
        assert.throws(
          () =>
            engine.readVariableStoreView('CHARACTER', view, () => {
              throw sentinel;
            }),
          (error) => error === sentinel
        );
        assert.equal(engine.getVariables('CHARACTER'), variables);
        assert.equal(engine.getVariableEffectScopes('CHARACTER')[0], scope);
        assert.equal(engine.getSkillEffectContext('CHARACTER'), skill);
      });
    });
    assert.equal(engine.getVariable('CHARACTER', 'MAX_HEALTH_BONUS').value, 7);
    engine.removeVariableEffects('CHARACTER', 'drop-source');
    assert.equal(engine.getVariable('CHARACTER', 'MAX_HEALTH_BONUS').value, 2);
  } finally {
    engine.finishVariableEffects('CHARACTER');
  }
});
test('workerless supersession and abort preserve committed defenses and unrelated child state', async () => {
  await calculate(ownerInput());
  engine.addVariable('CANCELLED_PET', 'num', 'KEEP_SENTINEL', 77);
  const old = calculate(ownerInput(otherOwner()));
  const oldRejected = assert.rejects(old, { name: 'AbortError' });
  const current = calculate(ownerInput());
  await Promise.all([oldRejected, current]);
  assert.deepEqual(engine.getPetOwnerDefenses('CHARACTER'), contextFor(ORIGINAL_DEFENSES));
  const controller = new AbortController();
  const cancelled = calculate(petInput(pet(), 'CANCELLED_PET'), { directExecution: true, signal: controller.signal });
  const rejected = assert.rejects(cancelled, { name: 'AbortError' });
  controller.abort();
  await rejected;
  assert.equal(engine.getVariable('CANCELLED_PET', 'KEEP_SENTINEL').value, 77);
  assert.deepEqual(defenses(engine, 'CHARACTER'), ORIGINAL_DEFENSES);
});

test('actual reused worker handler replaces posted owner context instead of retaining prior child or owner cache', async () => {
  const a = await workerResponse({ id: 1, execution: ownerInput() });
  const b = await workerResponse({ id: 2, execution: ownerInput(otherOwner()) });
  const input = petInput(pet(), 'REUSED_HANDLER_PET');
  const bound = await workerResponse({ id: 3, execution: input, charStore: a.data.store });
  assert.deepEqual(bound.data.store.petOwnerDefenses, contextFor(ORIGINAL_DEFENSES));
  assert.deepEqual(defenses(workerEngine, input.data.id), ORIGINAL_DEFENSES);
  for (const [index, runtimeContext] of [
    undefined,
    { AC_BONUS: 99 },
    { AC_BONUS: Infinity, SAVE_FORT: 99, SAVE_REFLEX: 99, SAVE_WILL: 99 },
    ZERO_CONTEXT,
  ].entries()) {
    const store = structuredClone(a.data.store);
    delete store.petOwnerDefenses;
    if (runtimeContext !== undefined) store.petOwnerDefenses = runtimeContext;
    const result = await workerResponse({ id: 4 + index, execution: input, charStore: store });
    assert.deepEqual(defenses(workerEngine, input.data.id), UNBOUND_DEFENSES);
    assert.deepEqual(result.data.store.petOwnerDefenses, runtimeContext === ZERO_CONTEXT ? ZERO_CONTEXT : undefined);
    assertParts(workerEngine, input.data.id, runtimeContext === ZERO_CONTEXT);
  }
  const rebound = await workerResponse({ id: 8, execution: input, charStore: b.data.store });
  assert.deepEqual(rebound.data.store.petOwnerDefenses, contextFor(OTHER_DEFENSES));
  assert.deepEqual(defenses(workerEngine, input.data.id), OTHER_DEFENSES);
});

/**
 * Only external transport is controlled; responses come from the actual isolated handler.
 * A late response is held after its handler completes, not aborted while that handler awaits.
 */
class PortWorker {
  static instances = [];
  requests = [];
  terminated = false;
  constructor() {
    PortWorker.instances.push(this);
  }
  postMessage(message) {
    this.requests.push(structuredClone(message));
  }
  terminate() {
    this.terminated = true;
  }
  reply(message) {
    this.onmessage({ data: structuredClone(message) });
  }
}
test('public worker transport rejects late or malformed context packets and safely reuses a child store', async () => {
  const beforeTransport = Object.fromEntries(
    ['window', 'Worker', 'navigator'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)])
  );
  globalThis.Worker = PortWorker;
  globalThis.window = { Worker: PortWorker };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { hardwareConcurrency: 1 } });
  PortWorker.instances = [];
  const currentWorker = () => PortWorker.instances.at(-1);
  const replyActual = async () => {
    const worker = currentWorker();
    const response = await workerResponse(worker.requests.at(-1));
    worker.reply(response);
    return response;
  };
  try {
    let pending = calculate(ownerInput(), {});
    await replyActual();
    await pending;
    pending = calculate(petInput(pet(), 'PORT_PET'), {});
    assert.deepEqual(currentWorker().requests.at(-1).charStore.petOwnerDefenses, contextFor(ORIGINAL_DEFENSES));
    await replyActual();
    await pending;
    assert.equal(PortWorker.instances.length, 1, 'successful jobs reuse the slot');
    engine.resetVariables('CHARACTER');
    pending = calculate(petInput(pet(), 'PORT_PET'), {});
    assert.equal(currentWorker().requests.at(-1).charStore.petOwnerDefenses, undefined);
    await replyActual();
    await pending;
    assert.deepEqual(defenses(engine, 'PORT_PET'), UNBOUND_DEFENSES);
    pending = calculate(ownerInput(otherOwner()), {});
    await replyActual();
    await pending;
    const controller = new AbortController();
    const obsolete = calculate(petInput(pet(), 'PORT_PET'), { signal: controller.signal });
    const rejected = assert.rejects(obsolete, { name: 'AbortError' });
    const staleWorker = currentWorker();
    const late = await workerResponse(staleWorker.requests.at(-1));
    controller.abort();
    await rejected;
    staleWorker.reply(late);
    assert.equal(staleWorker.terminated, true);
    assert.deepEqual(defenses(engine, 'PORT_PET'), UNBOUND_DEFENSES);
    assert.deepEqual(engine.getPetOwnerDefenses('CHARACTER'), contextFor(OTHER_DEFENSES));
    pending = calculate(petInput(pet(), 'PORT_PET'), {});
    const valid = await replyActual();
    await pending;
    assert.equal(PortWorker.instances.length, 2);
    assert.deepEqual(defenses(engine, 'PORT_PET'), OTHER_DEFENSES);
    const malformed = structuredClone(valid);
    malformed.data.store.petOwnerDefenses = { AC_BONUS: 99 };
    const invalid = calculate(petInput(pet(), 'PORT_PET'), {});
    const invalidRejected = assert.rejects(invalid, /Invalid calculation response/);
    malformed.id = currentWorker().requests.at(-1).id;
    currentWorker().reply(malformed);
    await invalidRejected;
    assert.deepEqual(defenses(engine, 'PORT_PET'), OTHER_DEFENSES);
    pending = calculate(petInput(pet(), 'PORT_PET'), {});
    await replyActual();
    await pending;
    assert.deepEqual(defenses(engine, 'PORT_PET'), OTHER_DEFENSES);
  } finally {
    restoreGlobals(beforeTransport);
  }
});

test('version-four derived runtime dump never becomes saved character import data', async () => {
  const character = owner({ companions: { list: [pet()] } });
  const saved = structuredClone(character);
  counts.json_v4_public_calls += 2; // Actual exporter calculates one owner and its one child through the public controller.
  await engine.jsonV4(character);
  const document = engine.getJsonDownload().value;
  observations.push({
    kind: 'json-v4',
    character: saved,
    document: structuredClone(document),
    owner_store: engine.exportVariableStore('CHARACTER'),
    child_store: engine.exportVariableStore('COMPANION_0'),
    captured_before_assertions: true,
  });
  assert.deepEqual(character, saved);
  assert.deepEqual(document.content.raw_data_dump.petOwnerDefenses, contextFor(ORIGINAL_DEFENSES));
  assert.deepEqual(
    document.content.companions[0].content.raw_data_dump.petOwnerDefenses,
    contextFor(ORIGINAL_DEFENSES)
  );
  assert.equal(document.character.petOwnerDefenses, undefined);
  assert.equal(document.character.companions.list[0].petOwnerDefenses, undefined);
  document.content.raw_data_dump.petOwnerDefenses = contextFor({
    ac: 999,
    SAVE_FORT: 999,
    SAVE_REFLEX: 999,
    SAVE_WILL: 999,
  });
  const previousReader = Object.getOwnPropertyDescriptor(globalThis, 'FileReader');
  globalThis.FileReader = class {
    readAsText(file) {
      this.result = file.contents;
      queueMicrotask(() => this.onload());
    }
  };
  try {
    const imported = await engine.importJsonV4({ name: 'pet-regression.json', contents: JSON.stringify(document) });
    assert.ok(imported, 'actual importer must reach its external create-character boundary');
    const requests = engine.getJsonImportRequests();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].type, 'create-character');
    assert.deepEqual(requests[0].character, { ...saved, id: undefined });
    assert.equal(requests[0].character.petOwnerDefenses, undefined);
    assert.equal(requests[0].character.content, undefined);
  } finally {
    restoreGlobals({ FileReader: previousReader });
  }
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  assert.equal(networkAttempts, 0);
});

/**
 * Edited saved-consumer witness: rebuilding a native Pet can replace operations
 * while retaining its catalog ID and source. This does not execute the editor
 * or converter; it preserves the producer-shaped absolute residual totals.
 */
test('edited native-ID Pet residuals preserve their absolute stat block defenses', async () => {
  await calculate(ownerInput());
  const operations = [
    ...['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map((name) => set(`ATTRIBUTE_${name}`, { value: 0, partial: false })),
    op('edited-native-pet-trait', 'giveTrait', { traitId: 4265 }),
    op('edited-native-ac-residual', 'adjValue', { variable: 'AC_BONUS', value: 2 }),
    ...[
      ['SAVE_FORT', '+2'],
      ['SAVE_REFLEX', '+3'],
      ['SAVE_WILL', '+1'],
    ].map(([variable, value]) =>
      op(`edited-native-${variable}-residual`, 'addBonusToValue', { variable, text: '', value })
    ),
  ];
  const edited = pet(12086, {
    id: 12086,
    content_source_id: 1,
    name: 'Edited native-ID Pet',
    operations,
    abilities_base: [],
    abilities_added: [],
    details: { description: '' },
    meta_data: null,
  });
  const result = await calculate(petInput(edited, 'EDITED_NATIVE_RESIDUAL_PET'));
  assert.deepEqual(
    result.actual,
    { ac: 12, SAVE_FORT: 2, SAVE_REFLEX: 3, SAVE_WILL: 1 },
    'a retained native catalog ID must not reinterpret absolute stat-block residuals as relative bonuses'
  );
});

test('retained IDs without either native baseline marker stay standalone', async () => {
  await calculate(ownerInput());
  for (const id of [12086, 12109])
    for (const variable of ['UNTRAINED_IMPROVISATION', 'MAX_HEALTH_CLASS_PER_LEVEL']) {
      const creature = pet(id);
      creature.operations = creature.operations.filter(
        (entry) => !(entry.type === 'setValue' && entry.data.variable === variable)
      );
      const result = await calculate(petInput(creature, `NO_BASELINE_${id}_${variable}`));
      assert.deepEqual(result.actual, UNBOUND_DEFENSES);
      assert.equal(result.store.petOwnerDefenses, undefined);
    }
});

test('renames and regenerated operation IDs preserve complete native inheritance', async () => {
  await calculate(ownerInput());
  for (const id of [12086, 12109]) {
    const creature = pet(id, { name: 'Renamed saved companion' });
    creature.operations = creature.operations.map((entry) => ({ ...entry, id: crypto.randomUUID() }));
    assert.deepEqual((await calculate(petInput(creature, `RENAMED_${id}`))).actual, ORIGINAL_DEFENSES);
  }
});

test('absolute combatant-editor blocks appended to native templates stay standalone', async () => {
  await calculate(ownerInput());
  for (const id of [12086, 12109]) {
    const creature = pet(id);
    creature.operations.push(
      op('absolute-ac', 'adjValue', { variable: 'AC_BONUS', value: 2 }),
      ...[
        ['SAVE_FORT', '+2'],
        ['SAVE_REFLEX', '+3'],
        ['SAVE_WILL', '+1'],
      ].map(([variable, value]) => op(`absolute-${variable}`, 'addBonusToValue', { variable, value, text: '' }))
    );
    const result = await calculate(petInput(creature, `ABSOLUTE_BLOCK_${id}`));
    assert.deepEqual(result.actual, { ac: 12, SAVE_FORT: 2, SAVE_REFLEX: 3, SAVE_WILL: 1 });
    assert.equal(result.store.petOwnerDefenses, undefined);
  }
});

test('a native ID copied into homebrew does not activate owner inheritance', async () => {
  await calculate(ownerInput());
  for (const id of [12086, 12109]) {
    const result = await calculate(petInput(pet(id, { content_source_id: 900 }), `HOMEBREW_SOURCE_${id}`));
    assert.deepEqual(result.actual, UNBOUND_DEFENSES);
    assert.equal(result.store.petOwnerDefenses, undefined);
  }
});

test('finite coverage guard records all declared public calculations and expected terminal controls', () => {
  assert.deepEqual(counts, {
    public_attempted: 68,
    public_completed: 64,
    public_cancelled: 3,
    public_failed: 1,
    direct_attempted: 60,
    direct_completed: 58,
    worker_handler_calls: 15,
    json_v4_public_calls: 2,
  });
  assert.deepEqual(rows, nativeBefore);
  assert.equal(networkAttempts, 0);
});
