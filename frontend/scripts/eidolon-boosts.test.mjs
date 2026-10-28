import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { content as emptyContent, eidolon, summoner } from './fixtures/eidolon.mjs';

let engine;
let content;
const advancementId = 46369;
const boostIds = [25743, 25744, 25745, 25746];

before(async () => {
  const fixtures = await readContentRows([advancementId, ...boostIds].map((id) => ({ table: 'ability_block', id })));
  content = { ...emptyContent, abilityBlocks: fixtures.map(({ row }) => row) };
  engine = await createOperationEngine();
  engine.setFixtures([...fixtures, ...content.traits.map((row) => ({ table: 'trait', row }))]);
});
after(async () => engine?.cleanup());

/** Follow the same saved selection paths used by the companion's advancement controls. */
function choices(result) {
  const found = [];
  function walk(results, prefix, level) {
    for (const entry of results ?? []) {
      if (!entry) continue;
      const source = entry.result?.source;
      if (entry.selection) {
        found.push({
          ...entry.selection,
          key: `${prefix}_${entry.selection.id}`,
          level,
          selected: source?.variable,
        });
      }
      walk(
        entry.result?.results,
        source?._select_uuid
          ? `${prefix}_${entry.selection?.id ? `${entry.selection.id}_` : ''}${source._select_uuid}`
          : prefix,
        source?.level ?? level
      );
    }
  }
  for (const group of result.ors.abilityResults) {
    walk(group.baseResults, `ability-${group.baseSource.id}`);
  }
  return found;
}

/** Calculate a synthetic companion with the catalog's actual Eidolon Advancement grants. */
async function setup(level) {
  const { store } = await engine._executeCharacterOperations({
    character: { ...summoner([]), level },
    content,
    context: 'CHARACTER-SHEET',
  });
  const creature = {
    ...structuredClone(eidolon),
    level,
    operations: [],
    abilities_added: [advancementId],
    inventory: { items: [] },
    operation_data: { selections: {} },
  };
  const calculate = async () => {
    const result = await engine._executeCreatureOperations({
      id: 'COMPANION_0',
      creature: structuredClone(creature),
      content,
      charStore: store,
    });
    assert.deepEqual(result.errors, []);
    return result;
  };
  return { creature, calculate };
}

test('Eidolon boosts remain independent at levels 5, 10, 15 and 20 and survive reload', async () => {
  const { creature, calculate } = await setup(20);
  let result = await calculate();
  for (const level of [5, 10, 15, 20]) {
    const group = choices(result).filter((choice) => choice.level === level);
    assert.equal(group.length, 4);
    assert.ok(
      group[0].options.some((option) => option.variable === 'ATTRIBUTE_STR'),
      `Strength missing at ${level}`
    );
    creature.operation_data.selections[group[0].key] = 'ATTRIBUTE_STR';
    result = await calculate();
    const selectedGroup = choices(result).filter((choice) => choice.level === level);
    assert.equal(selectedGroup[0].selected, 'ATTRIBUTE_STR');
    assert.ok(
      selectedGroup.slice(1).every((choice) => !choice.options.some((option) => option.variable === 'ATTRIBUTE_STR'))
    );
  }
  const saved = structuredClone(creature.operation_data.selections);
  result = await calculate();
  assert.deepEqual(creature.operation_data.selections, saved);
  assert.equal(choices(result).filter((choice) => choice.selected === 'ATTRIBUTE_STR').length, 4);
  assert.deepEqual(engine.getVariable('COMPANION_0', 'ATTRIBUTE_STR').value, { value: 4, partial: false });
});

test('deselecting an earlier boost restores only that group and retains a later partial boost', async () => {
  const { creature, calculate } = await setup(10);
  const initial = choices(await calculate());
  // Start from +4 so the two legal Strength boosts exercise partial-boost arithmetic.
  creature.operations = [
    { id: 'base-strength', type: 'setValue', data: { variable: 'ATTRIBUTE_STR', value: { value: 4 } } },
  ];
  const earlier = initial.find((choice) => choice.level === 5);
  const later = initial.find((choice) => choice.level === 10);
  creature.operation_data.selections[earlier.key] = 'ATTRIBUTE_STR';
  creature.operation_data.selections[later.key] = 'ATTRIBUTE_STR';
  let result = await calculate();
  assert.equal(choices(result).filter((choice) => choice.selected === 'ATTRIBUTE_STR').length, 2);
  assert.deepEqual(engine.getVariable('COMPANION_0', 'ATTRIBUTE_STR').value, { value: 5, partial: false });
  delete creature.operation_data.selections[earlier.key];
  result = await calculate();
  assert.ok(
    choices(result)
      .filter((choice) => choice.level === 5)
      .every((choice) => choice.options.some((option) => option.variable === 'ATTRIBUTE_STR'))
  );
  assert.equal(choices(result).find((choice) => choice.key === later.key).selected, 'ATTRIBUTE_STR');
  assert.deepEqual(engine.getVariable('COMPANION_0', 'ATTRIBUTE_STR').value, { value: 4, partial: true });
});
