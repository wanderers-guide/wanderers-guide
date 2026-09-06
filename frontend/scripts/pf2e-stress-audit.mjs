/**
 * Opt-in PF2e audit repros: node --test scripts/pf2e-stress-audit.mjs
 * These assert the published rules, and intentionally fail for unresolved audit findings.
 * Not part of test:rules until the corresponding application fixes land.
 * Full character/browser stress evidence is retained locally under .scratch/pf2e-stress-2026-09-06.
 */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

let engine;
let content;
let fixtures;
let sequence = 0;
const set = (variable, value) => ({ id: `audit-${++sequence}`, type: 'setValue', data: { variable, value } });
const condition = (name, value) => ({ ...engine.getConditionByName(name), ...(value === undefined ? {} : { value }) });
const bonus = (variable, amount, type, source) =>
  engine.addVariableBonus('CHARACTER', variable, amount, type, '', source);
const character = () => ({
  id: 1,
  level: 5,
  hp_current: 20,
  details: { conditions: [] },
  inventory: { items: [] },
  operation_data: { selections: {} },
  content_sources: { enabled: [1] },
  meta_data: { reset_hp: false },
  options: { custom_operations: true, ignore_bulk_limit: true },
  // Explicit control operations isolate modifier composition from optional class/feat choices.
  custom_operations: [
    ...Object.entries({ STR: 0, DEX: 3, CON: 2, INT: 4, WIS: 0, CHA: 0 }).map(([name, value]) =>
      set(`ATTRIBUTE_${name}`, { value })
    ),
    set('SPELL_ATTACK', { value: 'T' }),
    set('SPELL_DC', { value: 'T' }),
    set('MARTIAL_WEAPONS', { value: 'T' }),
    set('UNARMORED_DEFENSE', { value: 'T' }),
    set('MEDIUM_ARMOR', { value: 'T' }),
    set('MAX_HEALTH_ANCESTRY', 8),
    set('MAX_HEALTH_CLASS_PER_LEVEL', 6),
    set('SPEED', 25),
  ],
});
async function calculate(conditions = [], configure, data = character()) {
  engine.clearOperationErrorNotifications();
  await engine.executeOperations(
    { type: 'CHARACTER', data: { character: data, content, context: 'CHARACTER-SHEET' } },
    { directExecution: true }
  );
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  engine.applyEquipmentPenalties('CHARACTER', data);
  engine.applyConditions('CHARACTER', conditions);
  configure?.();
  return data;
}
const spell = () => engine.getSpellStats('CHARACTER', null, 'ARCANE', 'ATTRIBUTE_INT').spell_attack.total[0];
const speed = (data) => engine.getSpeedValue('CHARACTER', engine.getVariable('CHARACTER', 'SPEED'), data).total;

before(async () => {
  engine = await createOperationEngine();
  fixtures = await readContentRows([
    { table: 'item', id: 7088 }, // Longbow
    { table: 'item', id: 6765 }, // Breastplate
    { table: 'ability_block', id: 20661 }, // Unburdened Iron
  ]);
  engine.setFixtures(fixtures);
  content = {
    abilityBlocks: fixtures.filter((row) => row.table === 'ability_block').map(({ row }) => row),
    items: fixtures.filter((row) => row.table === 'item').map(({ row }) => row),
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
    defaultSources: { PAGE: [1], INFO: [1] },
  };
});
after(async () => engine?.cleanup());

test('control: level-5 trained Intelligence spell attack is +11', async () => {
  await calculate();
  assert.equal(spell(), 11);
});

test('Clumsy does not penalize Intelligence spell attacks (Player Core p. 442)', async () => {
  await calculate([condition('Clumsy', 2)]);
  assert.equal(spell(), 11);
});

test('Enfeebled does not penalize Dexterity bow attacks (Player Core p. 444)', async () => {
  await calculate([condition('Enfeebled', 2)]);
  assert.equal(
    engine.getWeaponStats(
      'CHARACTER',
      content.items.find((row) => row.id === 7088)
    ).attack_bonus.total[0],
    10
  );
});

test('Frightened and Stupefied status penalties use the worst one (Player Core p. 400)', async () => {
  await calculate([condition('Frightened', 1), condition('Stupefied', 2)]);
  assert.equal(spell(), 9);
});

test('status bonuses share one limit across general and spell attack categories', async () => {
  await calculate([], () => {
    bonus('ATTACK_ROLLS_BONUS', 1, 'status', 'General status');
    bonus('SPELL_ATTACK', 2, 'status', 'Spell status');
  });
  assert.equal(spell(), 13);
});

test('Encumbered never suppresses an existing higher Clumsy value', async () => {
  const conditions = [condition('Encumbered'), condition('Clumsy', 3)];
  await calculate(conditions);
  assert.equal(engine.compiledConditions(conditions).find((row) => row.name === 'Clumsy').value, 3);
  assert.equal(engine.getFinalAcValue('CHARACTER'), 17);
});

test('armor and other item bonuses to AC do not stack', async () => {
  const data = character();
  data.inventory.items = [
    {
      id: 'audit-armor',
      item: content.items.find((row) => row.id === 6765),
      is_equipped: true,
      container_contents: [],
    },
  ];
  await calculate([], () => bonus('AC_BONUS', 1, 'item', 'Another item'), data);
  assert.equal(engine.getFinalAcValue('CHARACTER', data.inventory.items[0].item), 22);
});

for (const [name, penalties, expected] of [
  ['cancels a 5-foot penalty', [[-5, 'status']], 25],
  [
    'reduces only one of two different penalties',
    [
      [-10, 'status'],
      [-10, 'circumstance'],
    ],
    10,
  ],
  [
    'does not over-credit penalties already suppressed by stacking',
    [
      [-10, 'status'],
      [-15, 'status'],
    ],
    15,
  ],
]) {
  test(`Unburdened Iron ${name} (Player Core p. 44)`, async () => {
    const data = character();
    data.custom_operations.push({
      id: `audit-${++sequence}`,
      type: 'giveAbilityBlock',
      data: { type: 'feat', abilityBlockId: 20661 },
    });
    await calculate(
      [],
      () => penalties.forEach(([amount, type], index) => bonus('SPEED', amount, type, `Penalty ${index}`)),
      data
    );
    assert.equal(speed(data), expected);
  });
}

test('healing a stable character does not add Wounded a second time (Player Core p. 447)', () => {
  const data = character();
  data.hp_current = 0;
  data.details.conditions = [condition('Unconscious'), condition('Wounded', 1)];
  const result = engine.confirmHealth('1', 48, data);
  assert.equal(result.entity.details.conditions.find((row) => row.name === 'Wounded').value, 1);
});

test('control: removing all conditions restores spell attack without accumulating effects', async () => {
  await calculate([condition('Frightened', 1), condition('Stupefied', 2)]);
  await calculate();
  assert.equal(spell(), 11);
});
