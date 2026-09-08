import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createOperationEngine } from './operation-test-harness.mjs';

let engine;
const condition = (name, value, source) => ({
  ...engine.getConditionByName(name, source),
  ...(value === undefined ? {} : { value }),
});
const find = (conditions, name) => conditions.find((entry) => entry.name === name);

/** Exercise every ordering of explicit conditions, as saved lists have no rule priority. */
function permutations(values) {
  if (values.length === 0) return [[]];
  return values.flatMap((value, index) =>
    permutations(values.filter((_, otherIndex) => index !== otherIndex)).map((rest) => [value, ...rest])
  );
}

before(async () => {
  engine = await createOperationEngine();
});
after(async () => engine?.cleanup());
beforeEach(() => {
  engine.resetVariables();
  engine.setFixtures([]);
});

test('duplicate conditions use the highest severity in every input order', () => {
  for (const input of permutations([
    condition('Frightened', 1),
    condition('Frightened', 3),
    condition('Frightened', 2),
  ])) {
    const result = engine.compiledConditions(input);
    assert.equal(result.length, 1);
    assert.equal(result[0].value, 3);
  }
});

test('Encumbered cannot lower explicit Clumsy or take ownership of an equally strong explicit condition', () => {
  for (const severity of [1, 3]) {
    for (const input of permutations([condition('Encumbered'), condition('Clumsy', severity)])) {
      const clumsy = find(engine.compiledConditions(input), 'Clumsy');
      assert.equal(clumsy.value, severity);
      assert.equal(clumsy.source, undefined, 'an independent condition remains editable');
    }
  }
});

test('severities from independent sources are merged without losing their winning source', () => {
  for (const input of permutations([
    condition('Encumbered'),
    condition('Clumsy', 2, 'Poison'),
    condition('Clumsy', 3, 'Curse'),
  ])) {
    const clumsy = find(engine.compiledConditions(input), 'Clumsy');
    assert.equal(clumsy.value, 3);
    assert.equal(clumsy.source, 'Curse');
  }
});

test('removing a source recalculates derived conditions and preserves independent conditions', () => {
  const explicit = [condition('Encumbered'), condition('Clumsy', 3)];
  for (let index = 0; index < 3; index += 1) {
    assert.equal(find(engine.compiledConditions(explicit), 'Clumsy').value, 3);
    assert.equal(find(engine.compiledConditions(explicit.slice(1)), 'Clumsy').value, 3);
    const derived = find(engine.compiledConditions(explicit.slice(0, 1)), 'Clumsy');
    assert.equal(derived.value, 1);
    assert.equal(derived.source, 'Encumbered');
    assert.deepEqual(engine.compiledConditions([]), []);
  }
});

test('Dying cascades completely and its derived Blinded consistently overrides Dazzled', () => {
  for (const input of permutations([condition('Dying', 2), condition('Dazzled')])) {
    const result = engine.compiledConditions(input);
    assert.deepEqual(
      result.map(({ name }) => name),
      ['Blinded', 'Dying', 'Off-guard', 'Prone', 'Unconscious']
    );
    assert.equal(find(result, 'Unconscious').source, 'Dying');
    assert.equal(find(result, 'Blinded').source, 'Unconscious');
  }
  assert.deepEqual(
    engine.compiledConditions([condition('Dazzled')]).map(({ name }) => name),
    ['Dazzled']
  );
});

test('Restrained overrides Grabbed without retaining derived conditions owned by the suppressed condition', () => {
  for (const input of permutations([condition('Restrained'), condition('Grabbed')])) {
    const result = engine.compiledConditions(input);
    assert.deepEqual(
      result.map(({ name }) => name),
      ['Immobilized', 'Off-guard', 'Restrained']
    );
    assert.equal(find(result, 'Immobilized').source, 'Restrained');
    assert.equal(find(result, 'Off-guard').source, 'Restrained');
  }
  const afterRemoval = engine.compiledConditions([condition('Grabbed')]);
  assert.equal(find(afterRemoval, 'Immobilized').source, 'Grabbed');
  assert.equal(find(afterRemoval, 'Off-guard').source, 'Grabbed');
});

test('existing overrides are order independent and do not delete the explicit suppressed inputs', () => {
  const explicit = [condition('Blinded'), condition('Dazzled'), condition('Stunned', 1), condition('Slowed', 2)];
  for (const input of permutations(explicit)) {
    assert.deepEqual(
      engine.compiledConditions(input).map(({ name }) => name),
      ['Blinded', 'Stunned']
    );
  }
  assert.deepEqual(
    engine.compiledConditions([explicit[1], explicit[3]]).map(({ name }) => name),
    ['Dazzled', 'Slowed']
  );
  assert.equal(explicit[3].value, 2);
});

test('multiple cascades select deterministic origins and prefer a directly applied Off-guard', () => {
  const sources = [condition('Unconscious'), condition('Confused'), condition('Paralyzed'), condition('Unnoticed')];
  const expected = engine.compiledConditions(sources);
  for (const input of permutations(sources)) {
    const result = engine.compiledConditions(input);
    assert.deepEqual(result, expected);
    assert.equal(find(result, 'Undetected').source, 'Unnoticed');
    assert.equal(find(engine.compiledConditions([...input, condition('Off-guard')]), 'Off-guard').source, undefined);
  }
});

test('compilation leaves frozen inputs intact and returns detached condition values', () => {
  const explicit = Object.freeze([Object.freeze(condition('Encumbered')), Object.freeze(condition('Clumsy', 3))]);
  const before = structuredClone(explicit);
  const result = engine.compiledConditions(explicit);
  assert.deepEqual(explicit, before);
  find(result, 'Clumsy').value = 99;
  find(result, 'Encumbered').description = 'modified output';
  assert.deepEqual(explicit, before);
  assert.equal(find(engine.compiledConditions(explicit), 'Clumsy').value, 3);
  assert.notEqual(engine.getConditionByName('Encumbered').description, 'modified output');
});

test('conditions without cascade rules remain intact and repeated compilation is stable', () => {
  const explicit = [condition('Wounded', 2), condition('Sickened', 3), condition('Dying')];
  const result = engine.compiledConditions(explicit);
  assert.equal(find(result, 'Wounded').value, 2);
  assert.equal(find(result, 'Sickened').value, 3);
  assert.deepEqual(engine.compiledConditions(result), result);
  const custom = { ...condition('Sickened'), name: 'constructor' };
  assert.deepEqual(engine.compiledConditions([custom]), [custom]);
});

test('actual condition effects use the strongest Clumsy once after every rebuild', () => {
  for (const input of permutations([condition('Encumbered'), condition('Clumsy', 3), condition('Clumsy', 2)])) {
    engine.resetVariables();
    engine.setVariable('CHARACTER', 'LEVEL', 5);
    engine.setVariable('CHARACTER', 'ATTRIBUTE_DEX', { value: 3 });
    engine.setVariable('CHARACTER', 'UNARMORED_DEFENSE', { value: 'T' });
    assert.equal(engine.getFinalAcValue('CHARACTER'), 20);
    assert.equal(engine.getFinalProfValue('CHARACTER', 'SAVE_REFLEX'), '+3');
    engine.applyConditions('CHARACTER', input);
    assert.equal(engine.getFinalAcValue('CHARACTER'), 17);
    assert.equal(engine.getFinalProfValue('CHARACTER', 'SAVE_REFLEX'), '+0');
  }
});
