import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

let engine;
let flash;
let longsword;
let flaming;

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
