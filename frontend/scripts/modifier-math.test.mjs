import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createOperationEngine } from './operation-test-harness.mjs';

let engine;
let sequence = 0;
const set = (variable, value) => ({ id: `math-${++sequence}`, type: 'setValue', data: { variable, value } });
const weapon = (traits = [], meta = {}) => ({
  id: 990001,
  name: 'Synthetic weapon',
  description: '',
  group: 'WEAPON',
  traits,
  hands: '1',
  operations: [],
  meta_data: { category: 'martial', group: 'sword', damage: { dice: 1, die: 'd6', damageType: 'piercing' }, ...meta },
});
const armor = (meta = {}, traits = []) => ({
  id: 990002,
  name: 'Synthetic armor',
  description: '',
  group: 'ARMOR',
  traits,
  operations: [],
  meta_data: { category: 'medium', group: 'plate', ac_bonus: 4, dex_cap: 1, strength: 3, speed_penalty: -10, ...meta },
});
const inventoryItem = (item, invested = false) => ({
  id: `entry-${item.id}`,
  item,
  is_equipped: true,
  is_invested: invested,
  container_contents: [],
});
const bonus = (name, value, type = 'status', source = name, text = '') =>
  engine.addVariableBonus('CHARACTER', name, value, type, text, source);
const stats = (item) => engine.getWeaponStats('CHARACTER', item);
const spell = (attribute = 'ATTRIBUTE_INT', range = '30 feet') =>
  engine.getSpellStats('CHARACTER', { range }, 'ARCANE', attribute).spell_attack;
const speed = (character) => engine.getSpeedValue('CHARACTER', engine.getVariable('CHARACTER', 'SPEED'), character);
const sumParts = (result) => [...result.parts.values()].reduce((total, value) => total + value, 0);

async function calculate({ attributes = {}, operations = [], items = [] } = {}) {
  const character = {
    id: 990000,
    level: 5,
    hp_current: 40,
    details: { conditions: [] },
    inventory: { items },
    operation_data: { selections: {} },
    content_sources: { enabled: [] },
    meta_data: { reset_hp: false },
    options: { custom_operations: true, ignore_bulk_limit: true },
    custom_operations: [
      ...Object.entries({ STR: 3, DEX: 4, CON: 2, INT: 4, WIS: 1, CHA: 0, ...attributes }).map(([name, value]) =>
        set(`ATTRIBUTE_${name}`, { value })
      ),
      ...['MARTIAL_WEAPONS', 'MEDIUM_ARMOR', 'UNARMORED_DEFENSE', 'SPELL_ATTACK', 'SPELL_DC'].map((name) =>
        set(name, { value: 'T' })
      ),
      set('SPEED', 25),
      ...operations,
    ],
  };
  const content = {
    classes: [],
    ancestries: [],
    backgrounds: [],
    abilityBlocks: [],
    languages: [],
    spells: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    traits: [],
    items: items.map((entry) => entry.item),
    defaultSources: { PAGE: [], INFO: [] },
  };
  engine.setFixtures(content.items.map((row) => ({ table: 'item', row })));
  engine.clearOperationErrorNotifications();
  await engine.executeOperations(
    { type: 'CHARACTER', data: { character, content, context: 'CHARACTER-SHEET' } },
    { directExecution: true }
  );
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  return character;
}

before(async () => {
  engine = await createOperationEngine();
});
after(async () => engine?.cleanup());

test('typed bonus and penalty limits span categories while numeric baselines and untyped adjustments add', async () => {
  await calculate({ operations: [set('ATTACK_ROLLS_BONUS', 1), set('NON_SPELL_ATTACK_ROLLS_BONUS', 2)] });
  bonus('ATTACK_ROLLS_BONUS', 1);
  bonus('MELEE_ATTACK_ROLLS_BONUS', 2);
  bonus('MARTIAL_WEAPONS', -1);
  bonus('STR_ATTACK_ROLLS_BONUS', -3);
  bonus('ATTACK_ROLLS_BONUS', 2, 'circumstance', 'Circumstance');
  bonus('MELEE_ATTACK_ROLLS_BONUS', -1, 'circumstance', 'Circumstance penalty');
  bonus('ATTACK_ROLLS_BONUS', 1, '', 'Untyped one');
  bonus('MELEE_ATTACK_ROLLS_BONUS', 2, 'untyped', 'Untyped two');
  bonus('MARTIAL_WEAPONS', 9, 'status', 'Situational', 'against giants');
  const result = stats(weapon()).attack_bonus;
  assert.deepEqual(result.total, [16, 11, 6]); // 7 prof + 3 STR + 3 baseline + 2 - 3 + 2 - 1 + 3
  assert.equal(sumParts(result), 16);
  assert.deepEqual(result.conditionals, [{ text: '+9 status bonus against giants', source: 'Situational' }]);
});

test('same-type identical penalties do not stack, but a same-type bonus still applies', async () => {
  await calculate();
  bonus('ATTACK_ROLLS_BONUS', -2);
  bonus('STR_ATTACK_ROLLS_BONUS', -2);
  bonus('MARTIAL_WEAPONS', 3);
  assert.equal(stats(weapon()).attack_bonus.total[0], 11);
});

test('finesse chooses the best complete legal attribute total and preserves agile MAP', async () => {
  await calculate();
  bonus('DEX_ATTACK_ROLLS_BONUS', -3);
  const result = stats(weapon([1570, 1569])).attack_bonus;
  assert.deepEqual(result.total, [10, 6, 2]);
  assert.ok([...result.parts.keys()].some((key) => key.includes('Strength')));
  await calculate();
  bonus('STR_ATTACK_ROLLS_BONUS', -3);
  assert.deepEqual(stats(weapon([1570, 1569])).attack_bonus.total, [11, 7, 3]);
});

test('brutal uses only Strength; ordinary ranged attacks use only Dexterity and non-spell categories', async () => {
  await calculate();
  bonus('STR_ATTACK_ROLLS_BONUS', -2);
  bonus('DEX_ATTACK_ROLLS_BONUS', -1);
  bonus('NON_SPELL_ATTACK_ROLLS_BONUS', 2, 'circumstance');
  assert.equal(stats(weapon([4182], { range: 30 })).attack_bonus.total[0], 10);
  assert.equal(stats(weapon([], { range: 30 })).attack_bonus.total[0], 12);
});

test('spell attacks use the casting attribute and combine spell, range, and general modifiers once', async () => {
  await calculate();
  bonus('STR_ATTACK_ROLLS_BONUS', -3);
  bonus('DEX_ATTACK_ROLLS_BONUS', -2);
  bonus('ATTACK_ROLLS_BONUS', -1);
  bonus('SPELL_ATTACK', -2);
  bonus('SPELL_ATTACK', 2, 'circumstance');
  bonus('RANGED_ATTACK_ROLLS_BONUS', 1, 'circumstance');
  bonus('MELEE_ATTACK_ROLLS_BONUS', 3, 'circumstance');
  bonus('NON_SPELL_ATTACK_ROLLS_BONUS', 20);
  assert.deepEqual(spell().total, [11, 6, 1]);
  assert.equal(spell('ATTRIBUTE_INT', 'Touch').total[0], 12);
  assert.equal(spell('ATTRIBUTE_STR').total[0], 9);
  assert.equal(spell('ATTRIBUTE_DEX').total[0], 11);
  assert.equal(sumParts(spell()), spell().total[0]);
});

test('weapon potency, intrinsic attack bonus, tracking, and other item bonuses share the item limit', async () => {
  await calculate();
  bonus('ATTACK_ROLLS_BONUS', 1, 'item');
  const item = weapon([4682], { attack_bonus: 3, runes: { potency: 2, striking: 1, property: [] } });
  const original = structuredClone(item);
  assert.equal(stats(item).attack_bonus.total[0], 13);
  bonus('MARTIAL_WEAPONS', 4, 'item');
  assert.equal(stats(item).attack_bonus.total[0], 14);
  assert.deepEqual(item, original);
});

test('finesse does not change damage attribute without the enabling ability', async () => {
  await calculate();
  bonus('STR_ATTACK_DAMAGE_BONUS', -2);
  bonus('DEX_ATTACK_DAMAGE_BONUS', -3);
  assert.equal(stats(weapon([1570])).damage.bonus.total, 1);
  engine.setVariable('CHARACTER', 'USE_DEX_FOR_MELEE_FINESSE', true);
  assert.equal(stats(weapon([1570])).damage.bonus.total, 1);
  bonus('STR_ATTACK_DAMAGE_BONUS', -3, 'circumstance');
  assert.equal(stats(weapon([1570])).damage.bonus.total, 1);
  await calculate({ operations: [set('USE_DEX_FOR_MELEE_FINESSE', true)] });
  bonus('DEX_ATTACK_DAMAGE_BONUS', -3);
  assert.equal(stats(weapon([1570])).damage.bonus.total, 3);
});

test('thrown, propulsive, splash, and ordinary ranged damage use only applicable Strength modifiers', async () => {
  await calculate({ attributes: { STR: 5 } });
  bonus('STR_ATTACK_DAMAGE_BONUS', -2);
  bonus('DEX_ATTACK_DAMAGE_BONUS', -4);
  bonus('ATTACK_DAMAGE_BONUS', 2, 'circumstance');
  bonus('NON_SPELL_ATTACK_DAMAGE_BONUS', 1, 'circumstance');
  assert.equal(stats(weapon([], { range: 30 })).damage.bonus.total, 2);
  assert.equal(stats(weapon([1575], { range: 30 })).damage.bonus.total, 5);
  assert.equal(stats(weapon([1579], { range: 30 })).damage.bonus.total, 2);
  assert.equal(stats(weapon([1575, 1532], { range: 30 })).damage.bonus.total, 2);
  await calculate({ attributes: { STR: -2 } });
  assert.equal(stats(weapon([1579], { range: 30 })).damage.bonus.total, -2);
});

test('damage keeps specialization, striking/property runes, and custom damage without mutating the weapon', async () => {
  await calculate({ operations: [set('MARTIAL_WEAPONS', { value: 'E' }), set('WEAPON_SPECIALIZATION', true)] });
  bonus('ATTACK_DAMAGE_BONUS', 2);
  bonus('STR_ATTACK_DAMAGE_BONUS', 3);
  bonus('MELEE_ATTACK_DAMAGE_BONUS', -1);
  const item = weapon([], {
    damage: { dice: 1, die: 'd6', damageType: 'piercing', extra: '+ 2 + 1d4 persistent bleed' },
    runes: {
      potency: 1,
      striking: 2,
      property: [
        {
          name: 'Flaming',
          rune: { description: 'Flame.', meta_data: { damage: { dice: 1, die: 'd6', damageType: 'fire' } } },
        },
      ],
    },
  });
  const original = structuredClone(item);
  const result = stats(item).damage;
  assert.equal(result.dice, 3);
  assert.equal(result.bonus.total, 9); // STR3 + status3 - status1 + specialization2 + custom2
  assert.equal(sumParts(result.bonus), 9);
  assert.equal(result.other[0].damageType, 'fire');
  assert.equal(result.other[0].dice, 1);
  assert.equal(result.extra, '1d4 persistent bleed');
  engine.setVariable('CHARACTER', 'WEAPON_SPECIALIZATION_GREATER', true);
  assert.equal(stats(item).damage.bonus.total, 11);
  assert.deepEqual(item, original);
});

function assertAcEquation(item, expected) {
  const result = engine.getAcParts('CHARACTER', item);
  assert.equal(engine.getFinalAcValue('CHARACTER', item), expected);
  assert.equal(
    10 +
      result.profBonus +
      result.dexBonus +
      result.armorBonus +
      result.breakdown.baseValue +
      [...result.breakdown.bonuses.values()].reduce((total, group) => total + group.value, 0),
    expected
  );
  return result;
}

test('armor item AC competes with other item bonuses while different types, penalties, and baselines remain', async () => {
  const item = armor();
  await calculate({ items: [inventoryItem(item)], operations: [set('AC_BONUS', 1)] });
  bonus('AC_BONUS', 2, 'item');
  bonus('AC_BONUS', -1, 'item', 'Damaged');
  bonus('AC_BONUS', -1);
  bonus('MEDIUM_ARMOR', -2);
  bonus('MEDIUM_ARMOR', 2, 'circumstance');
  bonus('AC_BONUS', 1, 'circumstance', 'Shield');
  assert.equal(assertAcEquation(item, 22).armorBonus, 4);
  bonus('AC_BONUS', 6, 'item', 'Stronger item');
  assert.equal(assertAcEquation(item, 24).armorBonus, 0);
  assertAcEquation(item, 24); // Repeated reads must not consume grants.
});

test('invested armor potency increases armor item AC before stacking; uninvested runes stay inactive', async () => {
  const item = armor({ runes: { potency: 2, resilient: 0, property: [] } }, [1504, 1527]);
  await calculate({ items: [inventoryItem(item, true)] });
  bonus('AC_BONUS', 5, 'item', 'Other item');
  assert.equal(assertAcEquation(item, 24).armorBonus, 6);
  assertAcEquation(item, 24);
  bonus('AC_BONUS', 7, 'item', 'Stronger item');
  assert.equal(assertAcEquation(item, 25).armorBonus, 0);
  await calculate({ items: [inventoryItem(item, false)] });
  assertAcEquation(item, 22);
});

test('unarmored proficiency modifiers use the same AC pool and negative Dexterity is not capped away', async () => {
  await calculate({ attributes: { DEX: -2 } });
  bonus('UNARMORED_DEFENSE', 2);
  bonus('AC_BONUS', 1);
  assertAcEquation(undefined, 17);
  assertAcEquation(armor(), 20);
});

for (const [name, penalties, expected] of [
  ['one short penalty', [[-3, 'status']], 25],
  [
    'identical typed penalties',
    [
      [-10, 'status'],
      [-10, 'status'],
    ],
    15,
  ],
  [
    'different typed penalties',
    [
      [-10, 'status'],
      [-10, 'circumstance'],
    ],
    10,
  ],
  [
    'suppressed typed penalties',
    [
      [-10, 'status'],
      [-15, 'status'],
    ],
    15,
  ],
  [
    'untyped penalties',
    [
      [-10, 'untyped'],
      [-10, 'untyped'],
    ],
    10,
  ],
  [
    'penalty plus same-type bonus',
    [
      [-10, 'status'],
      [5, 'status'],
    ],
    25,
  ],
]) {
  test(`Unburdened Iron chooses one legal reduction: ${name}`, async () => {
    const character = await calculate({ operations: [set('UNBURDENED_IRON', true)] });
    penalties.forEach(([amount, type], index) => bonus('SPEED', amount, type, `Source ${index}`));
    assert.equal(speed(character).total, expected);
    assert.equal(speed(character).total, expected);
  });
}

test('Unburdened Iron ignores eligible armor separately; hindering armor remains eligible only for the single reduction', async () => {
  for (const hindering of [false, true]) {
    const item = armor({}, hindering ? [2865] : []);
    const character = await calculate({
      attributes: { STR: 0 },
      operations: [set('UNBURDENED_IRON', true)],
      items: [inventoryItem(item)],
    });
    engine.applyEquipmentPenalties('CHARACTER', character);
    bonus('SPEED', -10, 'status', 'Slowing effect');
    assert.equal(speed(character).total, hindering ? 10 : 20);
  }
});
