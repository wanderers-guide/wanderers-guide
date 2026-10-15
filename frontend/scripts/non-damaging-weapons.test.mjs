import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

let engine;
let flash;
let longsword;
let flaming;

const weaponGrades = [
  ['COMMERCIAL', 0, 0, 0, 0, 1, null],
  ['TACTICAL', 2, 350, 350, 0, 1, 4681],
  ['ADVANCED', 4, 1000, 650, 1, 2, 4681],
  ['SUPERIOR', 10, 10000, 9000, 1, 2, 4682],
  ['ELITE', 12, 20000, 10000, 2, 3, 4682],
  ['ULTIMATE', 16, 100000, 80000, 2, 3, 4685],
  ['PARAGON', 19, 400000, 300000, 3, 4, 4685],
];

/** Model the printed starting profile, not a downgraded Commercial approximation. */
function printedWeapon(base = 'SUPERIOR', grade = base) {
  const [, level, price, , slots, dice, tracking] = weaponGrades.find(([name]) => name === base);
  const item = structuredClone(longsword);
  item.name = 'Synthetic printed weapon';
  item.level = level;
  item.price = { sp: price + 5002 };
  item.traits = [4506, ...(tracking ? [tracking] : [])];
  item.meta_data.damage = { dice, die: 'd4', damageType: 'slashing', extra: '' };
  item.meta_data.starfinder = { grade, base_grade: base, base_upgrade_slots: slots, slots: [] };
  return item;
}

before(async () => {
  const rows = await readContentRows([21284, 7090, 6961].map((id) => ({ table: 'item', id })));
  flash = rows.find((entry) => entry.row.id === 21284).row;
  longsword = rows.find((entry) => entry.row.id === 7090).row;
  flaming = rows.find((entry) => entry.row.id === 6961).row;
  assert.equal(flash.name, 'Flash Grenade (Commercial)');
  engine = await createOperationEngine();
  engine.setFixtures(rows);
});

test('explicit zero-dice no-damage profiles stay empty in either game and retain their existing classification', () => {
  for (const starfinder of [true, false]) {
    engine.resetVariables('CHARACTER');
    engine.setVariable('CHARACTER', 'STARFINDER', starfinder);
    engine.setVariable('CHARACTER', 'PATHFINDER', !starfinder);
    engine.setVariable('CHARACTER', 'MINIMUM_WEAPON_DAMAGE_DICE', 4);
    for (const damage of [
      flash.meta_data.damage,
      { dice: 0, die: null, damageType: '', extra: '' },
      { dice: '0', die: '', damageType: '', extra: '' },
    ]) {
      const item = {
        ...structuredClone(flash),
        meta_data: {
          ...structuredClone(flash.meta_data),
          damage,
          runes: { striking: 3 },
          starfinder: { grade: 'PARAGON' },
        },
      };
      const saved = structuredClone(item);
      const stats = engine.getWeaponStats('CHARACTER', item);
      assert.deepEqual([stats.damage.dice, stats.damage.die, stats.damage.damageType], [0, '', '']);
      assert.equal(engine.isItemWeapon(item), false);
      assert.deepEqual(item, saved);
    }
  }
});

test('real damage profiles retain their minimum dice and ordinary striking improvements', () => {
  engine.resetVariables('CHARACTER');
  const striking = structuredClone(longsword);
  striking.meta_data.runes.striking = 1;
  assert.deepEqual(
    [engine.getWeaponStats('CHARACTER', striking).damage.dice, engine.getWeaponStats('CHARACTER', striking).damage.die],
    [2, 'd8']
  );
  engine.setVariable('CHARACTER', 'MINIMUM_WEAPON_DAMAGE_DICE', 4);
  assert.equal(engine.getWeaponStats('CHARACTER', longsword).damage.dice, 4);
  assert.equal(engine.getWeaponStats('CHARACTER', striking).damage.dice, 4);
});

test('real Starfinder graded weapon profiles retain their additional damage dice', () => {
  engine.resetVariables('CHARACTER');
  engine.setVariable('CHARACTER', 'STARFINDER', true);
  engine.setVariable('CHARACTER', 'PATHFINDER', false);
  for (const [grade, expected] of [
    ['TACTICAL', 1],
    ['ADVANCED', 2],
    ['ELITE', 3],
    ['PARAGON', 4],
  ]) {
    const item = structuredClone(longsword);
    item.meta_data.starfinder = { grade };
    assert.deepEqual(
      [engine.getWeaponStats('CHARACTER', item).damage.dice, engine.getWeaponStats('CHARACTER', item).damage.die],
      [expected, 'd8']
    );
  }
});

test('a printed Superior Blast Knife keeps its 2d4 starting damage without charging for its grade twice', () => {
  engine.resetVariables('CHARACTER');
  const item = printedWeapon();
  item.name = 'Blast Knife';
  const saved = structuredClone(item);
  assert.equal(engine.ItemSchema.safeParse(item).success, true);
  assert.equal(engine.getWeaponStats('CHARACTER', item).damage.dice, 2);
  assert.equal(engine.getGradeImprovements(item).total_price, 0);
  assert.equal(engine.getEffectiveItemPrice(item).sp, 15002);
  assert.deepEqual(item, saved);
});

test('every permitted starting/selected grade pair applies only its printed damage, price and capacity delta', () => {
  engine.resetVariables('CHARACTER');
  for (const [baseIndex, [base, , basePrice, , baseSlots]] of weaponGrades.entries()) {
    for (const [grade, level, price, upgradePrice, slots, dice, tracking] of weaponGrades.slice(baseIndex)) {
      const item = printedWeapon(base, grade);
      const saved = JSON.stringify(item);
      assert.equal(engine.ItemSchema.safeParse(item).success, true, `${base} -> ${grade}`);
      const improvement = engine.getGradeImprovements(item);
      assert.deepEqual(
        [improvement.level, improvement.total_price, improvement.upgrade_price, improvement.upgrade_slots],
        [level, price - basePrice, grade === base ? 0 : upgradePrice, slots]
      );
      assert.equal(engine.getWeaponStats('CHARACTER', item).damage.dice, dice);
      assert.equal(engine.getEffectiveItemPrice(item).sp, price + 5002);
      assert.equal(engine.getEffectiveItemLevel(item), level);
      const compiled = engine.compileTraits(item);
      assert.deepEqual(
        compiled.filter((id) => [4681, 4682, 4685].includes(id)),
        tracking ? [tracking] : []
      );
      assert.ok(compiled.includes(4506));
      assert.equal(JSON.stringify(item), saved, 'grade reads never rewrite the printing');
      assert.equal(item.meta_data.starfinder.base_upgrade_slots, baseSlots);
    }
  }
});

test('missing or null selection uses the printed baseline without modifying saved inventory or store serialization', async () => {
  for (const grade of [undefined, null]) {
    engine.resetVariables('CHARACTER');
    const item = printedWeapon();
    if (grade === undefined) delete item.meta_data.starfinder.grade;
    else item.meta_data.starfinder.grade = grade;
    let entity = { inventory: { coins: { sp: 123 }, items: [] } };
    const saved = JSON.stringify(item);
    await engine.handleAddItem(
      (update) => {
        entity = update(entity);
      },
      item,
      false
    );
    const inventory = JSON.parse(JSON.stringify(entity.inventory));
    assert.equal(engine.InventoryItemSchema.safeParse(inventory.items[0]).success, true);
    const before = engine.getWeaponStats('CHARACTER', inventory.items[0].item);
    const store = JSON.parse(JSON.stringify(engine.exportVariableStore('CHARACTER')));
    engine.resetVariables('CHARACTER');
    engine.importVariableStore('CHARACTER', store);
    assert.deepEqual(engine.getWeaponStats('CHARACTER', inventory.items[0].item), before);
    assert.equal(before.damage.dice, 2);
    assert.equal(engine.getGradeImprovements(inventory.items[0].item).upgrade_slots, 1);
    assert.equal(engine.getEffectiveItemPrice(inventory.items[0].item).sp, 15002);
    assert.deepEqual(entity.inventory, inventory);
    assert.equal(JSON.stringify(item), saved);
  }
});

test('unmarked saved weapons retain their complete legacy grade outputs, including previously stored multi-dice profiles', () => {
  engine.resetVariables('CHARACTER');
  for (const [grade, level, price, upgradePrice, slots, dice, tracking] of weaponGrades) {
    const item = printedWeapon();
    item.meta_data.starfinder = { grade };
    const saved = JSON.stringify(item);
    assert.deepEqual(engine.getGradeImprovements(item), {
      grade,
      level,
      upgrade_price: upgradePrice,
      total_price: price,
      upgrade_slots: slots,
      ac_bonus: 0,
      damage_dice: dice,
      hardness_bonus: 0,
      hp_bonus: 0,
      bt_bonus: 0,
      trait_ids: tracking ? [tracking] : [],
    });
    assert.equal(engine.getWeaponStats('CHARACTER', item).damage.dice, 2 + dice - 1);
    assert.equal(engine.getEffectiveItemPrice(item).sp, item.price.sp);
    assert.equal(engine.getEffectiveItemLevel(item), item.level);
    assert.equal(JSON.stringify(item), saved);
  }
  const legacy = printedWeapon();
  legacy.meta_data.starfinder = { grade: 'UNKNOWN' };
  assert.equal(engine.getWeaponStats('CHARACTER', legacy).damage.dice, 2);
});

test('partial, downgraded and malformed opt-ins are rejected without falling back to Commercial-based bonuses', () => {
  for (const change of [
    (item) => {
      delete item.meta_data.starfinder.base_grade;
    },
    (item) => {
      delete item.meta_data.starfinder.base_upgrade_slots;
    },
    (item) => {
      item.meta_data.starfinder.grade = 'ADVANCED';
    },
    (item) => {
      item.meta_data.starfinder.grade = 'UNKNOWN';
    },
    (item) => {
      item.meta_data.starfinder.base_grade = '__proto__';
    },
    (item) => {
      item.meta_data.starfinder.base_upgrade_slots = -1;
    },
    (item) => {
      item.meta_data.starfinder.base_upgrade_slots = 0.5;
    },
    (item) => {
      item.meta_data.starfinder.built_in_upgrades = [];
    },
    (item) => {
      item.meta_data.starfinder = { grade: 'PARAGON', built_in_upgrades: [] };
    },
    (item) => {
      delete item.meta_data.damage;
    },
    (item) => {
      item.meta_data.damage.dice = 0;
    },
    (item) => {
      item.meta_data.damage.die = '';
    },
  ]) {
    const item = printedWeapon('SUPERIOR', 'PARAGON');
    change(item);
    const saved = JSON.stringify(item);
    assert.equal(engine.ItemSchema.safeParse(item).success, false);
    assert.equal(engine.getGradeImprovements(item).damage_dice, 1);
    assert.deepEqual(engine.getEffectiveItemPrice(item), item.price);
    assert.equal(JSON.stringify(item), saved);
  }
  for (const group of ['SHIELD', 'GENERAL', 'RUNE', 'UPGRADE']) {
    const item = printedWeapon();
    item.group = group;
    assert.equal(engine.ItemSchema.safeParse(item).success, false);
  }
});

test('printed price, level, custom dice and ordinary installed-upgrade operations remain intact', () => {
  const item = printedWeapon('SUPERIOR', 'ELITE');
  item.level = 15;
  item.price = { sp: 15002, gp: 7 };
  item.meta_data.damage.dice = 3;
  assert.equal(engine.getWeaponStats('CHARACTER', item).damage.dice, 4);
  assert.deepEqual(engine.getEffectiveItemPrice(item), { sp: 25002, gp: 7 });
  assert.equal(engine.getEffectiveItemLevel(item), 15);
  item.price = null;
  assert.equal(engine.getEffectiveItemPrice(item), null);
  const operation = { id: 'weapon-grade-upgrade-test', type: 'adjValue', data: { variable: 'SPEED', value: 5 } };
  const upgrade = {
    ...structuredClone(longsword),
    id: 990998,
    group: 'UPGRADE',
    meta_data: {},
    operations: [operation],
  };
  item.meta_data.starfinder.slots = [{ id: upgrade.id, name: upgrade.name, upgrade }];
  assert.deepEqual(engine.getItemOperations(item, { items: [upgrade] }), [operation]);
});

test('flat and property-rune damage remain unchanged even when the base explicitly has no damage', () => {
  engine.resetVariables('CHARACTER');
  engine.setVariable('CHARACTER', 'ATTACK_DAMAGE_BONUS', 3);
  for (const base of [flash, longsword]) {
    const item = structuredClone(base);
    item.meta_data.damage.extra = '+ 2';
    item.meta_data.runes = {
      ...item.meta_data.runes,
      property: [{ id: flaming.id, name: flaming.name, rune: flaming }],
    };
    const stats = engine.getWeaponStats('CHARACTER', item);
    assert.equal(stats.damage.dice, base === flash ? 0 : 1);
    assert.equal(stats.damage.bonus.total, 5);
    assert.deepEqual(
      stats.damage.other.map(({ dice, die, damageType, bonus }) => ({ dice, die, damageType, bonus })),
      [{ dice: 1, die: 'd6', damageType: 'fire', bonus: 0 }]
    );
  }
});

test('missing or malformed profiles retain their existing visible calculation result instead of becoming no damage', () => {
  engine.resetVariables('CHARACTER');
  for (const [damage, expected] of [
    [undefined, 1],
    [null, 1],
    [{}, 1],
    [{ dice: 0, damageType: '' }, 1],
    [{ dice: 0, die: '' }, 1],
    [{ dice: 2, die: '', damageType: '' }, 2],
    [{ dice: 0, die: 'd6', damageType: '' }, 1],
    [{ dice: 0, die: '', damageType: 'fire' }, 1],
    [{ dice: 0, die: 6, damageType: '' }, 1],
  ]) {
    const item = structuredClone(flash);
    item.meta_data.damage = damage;
    assert.equal(engine.getWeaponStats('CHARACTER', item).damage.dice, expected);
  }
  const malformed = structuredClone(flash);
  malformed.meta_data.damage.dice = 'invalid';
  assert.equal(Number.isNaN(engine.getWeaponStats('CHARACTER', malformed).damage.dice), true);
});
after(async () => engine?.cleanup());

test('a printed non-damaging grenade does not gain a damage die', () => {
  engine.resetVariables('CHARACTER');
  engine.setVariable('CHARACTER', 'STARFINDER', true);
  engine.setVariable('CHARACTER', 'PATHFINDER', false);
  const saved = structuredClone(flash);
  const stats = engine.getWeaponStats('CHARACTER', flash);
  assert.deepEqual(
    { dice: stats.damage.dice, die: stats.damage.die, type: stats.damage.damageType, bonus: stats.damage.bonus.total },
    { dice: 0, die: '', type: '', bonus: 0 }
  );
  assert.deepEqual(flash, saved);
});
