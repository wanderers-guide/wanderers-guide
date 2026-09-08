import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createOperationEngine } from './operation-test-harness.mjs';

let engine;
const condition = (name, value) => ({ ...engine.getConditionByName(name), ...(value === undefined ? {} : { value }) });
const entity = (conditions = [], hp = 20) => ({
  id: 1,
  name: 'Health fixture',
  level: 5,
  hp_current: hp,
  details: { conditions },
  meta_data: { reset_hp: false },
});
const names = (data) => data.details.conditions.map((c) => c.name);
before(async () => {
  engine = await createOperationEngine();
});
after(async () => engine?.cleanup());
beforeEach(() => {
  engine.resetVariables();
  engine.setVariable('CHARACTER', 'LEVEL', 5);
  engine.setVariable('CHARACTER', 'MAX_HEALTH_ANCESTRY', 8);
  engine.setVariable('CHARACTER', 'MAX_HEALTH_CLASS_PER_LEVEL', 6);
  engine.setVariable('CHARACTER', 'ATTRIBUTE_CON', { value: 2 });
});

test('damage uses the strongest existing Wounded rank regardless of explicit condition order', () => {
  for (const conditions of [
    [condition('Wounded', 1), condition('Wounded', 2)],
    [condition('Wounded', 2), condition('Wounded', 1)],
  ]) {
    const result = engine.confirmHealth('0', 48, entity(conditions));
    assert.equal(result.entity.details.conditions.find((entry) => entry.name === 'Dying').value, 3);
  }
});

test('adding Drained loses current HP once in the same entity update as the condition', () => {
  const before = entity();
  const after = engine.changeEntityConditions('CHARACTER', before, [condition('Drained', 1)]);
  assert.equal(after.hp_current, 15);
  assert.deepEqual(names(after), ['Drained']);
  assert.equal(after.meta_data.reset_hp, false);
  assert.equal(before.hp_current, 20);
  assert.deepEqual(names(before), []);
  assert.equal(engine.changeEntityConditions('CHARACTER', after, after.details.conditions).hp_current, 15);
});

test('increasing Drained charges only the effective increase, including duplicate sources', () => {
  const before = entity([condition('Drained', 1)], 15);
  const after = engine.changeEntityConditions('CHARACTER', before, [condition('Drained', 1), condition('Drained', 3)]);
  assert.equal(after.hp_current, 5);
  assert.equal(
    engine.changeEntityConditions('CHARACTER', after, [condition('Drained', 2), condition('Drained', 3)]).hp_current,
    5
  );
});

test('decreasing/removing Drained does not heal, and an unrelated condition edit does not reapply it', () => {
  const before = entity([condition('Drained', 2)]);
  for (const conditions of [[], [condition('Drained', 1)], [condition('Drained', 2), condition('Frightened', 1)]]) {
    assert.equal(engine.changeEntityConditions('CHARACTER', before, conditions).hp_current, 20);
  }
});

test('Drained HP loss clamps at zero without fabricating a damage event', () => {
  const after = engine.changeEntityConditions('CHARACTER', entity([], 3), [condition('Drained', 2)]);
  assert.equal(after.hp_current, 0);
  assert.deepEqual(names(after), ['Drained']);
});

test('an uninitialized HP pool captures the old maximum and cannot refill after Drained', () => {
  const after = engine.changeEntityConditions('CHARACTER', { ...entity([], -1), meta_data: { reset_hp: true } }, [
    condition('Drained', 1),
  ]);
  assert.equal(after.hp_current, 43);
  assert.equal(after.meta_data.reset_hp, false);
});

test('level-zero creatures use a minimum of one HP per Drained value', () => {
  const after = engine.changeEntityConditions('CREATURE_1', { ...entity(), level: 0 }, [condition('Drained', 2)]);
  assert.equal(after.hp_current, 18);
});

test('a companion inheriting owner level uses that level for Drained loss', () => {
  const after = engine.changeEntityConditions('COMPANION_0', { ...entity(), level: -100 }, [condition('Drained', 2)]);
  assert.equal(after.hp_current, 10);
});

test('normalizing existing Drained never retroactively subtracts HP or changes conditions', () => {
  const before = entity([condition('Drained', 1)]);
  assert.equal(engine.confirmHealth('20', 43, before, undefined, false, 'normalize'), undefined);
  const clamped = engine.confirmHealth('48', 43, entity([condition('Drained', 1)], 48), undefined, false, 'normalize');
  assert.equal(clamped.entity.hp_current, 43);
  assert.deepEqual(names(clamped.entity), ['Drained']);
});

test('HP initialization and clamps cannot increase Wounded or fabricate Dying', () => {
  const initialized = engine.confirmHealth(
    '48',
    48,
    { ...entity([condition('Wounded', 1)], 0), meta_data: { reset_hp: true } },
    undefined,
    false,
    'normalize'
  );
  assert.equal(initialized.entity.details.conditions.find((c) => c.name === 'Wounded').value, 1);
  const clamped = engine.confirmHealth('0', 5, entity([], 20), undefined, false, 'normalize');
  assert.deepEqual(names(clamped.entity), []);
});

test('healing while dying removes Dying and increases Wounded once', () => {
  const healed = engine.confirmHealth('1', 48, entity([condition('Dying', 2), condition('Wounded', 1)], 0));
  assert.deepEqual(names(healed.entity), ['Wounded']);
  assert.equal(healed.entity.details.conditions[0].value, 2);
  assert.equal(engine.confirmHealth('1', 48, healed.entity), undefined);
});

test('stabilize then heal does not increase Wounded twice and wakes the character', () => {
  const stabilized = engine.changeEntityConditions('CHARACTER', entity([condition('Dying', 1)], 0), []);
  assert.deepEqual(names(stabilized).sort(), ['Unconscious', 'Wounded']);
  assert.equal(stabilized.details.conditions.find((c) => c.name === 'Wounded').value, 1);
  const healed = engine.confirmHealth('1', 48, stabilized);
  assert.deepEqual(names(healed.entity), ['Wounded']);
  assert.equal(healed.entity.details.conditions[0].value, 1);
});

test('healing a nonlethal knockout wakes it without adding Wounded', () => {
  const healed = engine.confirmHealth('1', 48, entity([condition('Unconscious')], 0));
  assert.deepEqual(names(healed.entity), []);
});

test('ordinary damage to zero retains the existing Dying/Wounded behavior', () => {
  const damaged = engine.confirmHealth('0', 48, entity([condition('Wounded', 2)], 15));
  assert.equal(damaged.entity.details.conditions.find((c) => c.name === 'Dying').value, 3);
});
