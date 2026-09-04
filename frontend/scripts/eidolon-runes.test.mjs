import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import {
  content,
  eidolon,
  handwraps,
  inventoryItem,
  magicWeapon,
  summoner,
  unarmedAttack,
} from './fixtures/eidolon.mjs';

let engine;
before(async () => {
  engine = await createOperationEngine();
  engine.setFixtures([
    ...content.items.map((row) => ({ table: 'item', row })),
    ...content.traits.map((row) => ({ table: 'trait', row })),
  ]);
});
after(async () => engine?.cleanup());

/** Run both real operation pipelines, as the character and companion workers do. */
async function calculate(items, creature = eidolon, attack = unarmedAttack, storeId = 'COMPANION_0') {
  const character = summoner(items);
  character.inventory.eidolon_weapon_id = items
    .flatMap((entry) => [entry, ...entry.container_contents])
    .find((entry) => entry.is_invested && entry.item.id === magicWeapon.id)?.id;
  const { store } = await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-SHEET' });
  await engine._executeCreatureOperations({ id: storeId, creature, content, charStore: store });
  const stats = engine.getWeaponStats(storeId, attack);
  return { attack: stats.attack_bonus.total[0], dice: stats.damage.dice };
}

test('equipped weapon shares fundamental runes only when invested', async () => {
  assert.deepEqual(await calculate([inventoryItem(magicWeapon, { is_equipped: true })]), { attack: 7, dice: 1 });
  assert.deepEqual(await calculate([inventoryItem(magicWeapon, { is_equipped: true, is_invested: true })]), {
    attack: 9,
    dice: 2,
  });
  assert.deepEqual(await calculate([inventoryItem(magicWeapon, { is_invested: true })]), { attack: 7, dice: 1 });
});

test('stowed weapons and formulas never share runes', async () => {
  const staleEquipped = inventoryItem(magicWeapon, { is_equipped: true, is_invested: true });
  const container = inventoryItem(
    { id: 900, name: 'Backpack', group: 'GENERAL', meta_data: { bulk: { capacity: 4 } } },
    { container_contents: [staleEquipped] }
  );
  assert.deepEqual(await calculate([container]), { attack: 7, dice: 1 });
  assert.deepEqual(await calculate([{ ...staleEquipped, is_formula: true }]), { attack: 7, dice: 1 });
});

test('stowed handwraps with a stale investment flag do not share runes', async () => {
  const wraps = inventoryItem(handwraps, { is_invested: true });
  const container = inventoryItem(
    { id: 900, name: 'Backpack', group: 'GENERAL', meta_data: { bulk: { capacity: 4 } } },
    { container_contents: [wraps] }
  );
  assert.deepEqual(await calculate([container]), { attack: 7, dice: 1 });
});

test('invested handwraps share runes without a weapon equip flag', async () => {
  assert.deepEqual(await calculate([inventoryItem(handwraps, { is_invested: true })]), { attack: 8, dice: 2 });
  assert.deepEqual(await calculate([inventoryItem(handwraps)]), { attack: 7, dice: 1 });
  const derived = {
    ...handwraps,
    id: 901,
    name: 'Personal wraps',
    meta_data: { ...handwraps.meta_data, base_item: 'Handwraps of Mighty Blows' },
  };
  assert.deepEqual(await calculate([inventoryItem(derived, { is_invested: true })]), { attack: 8, dice: 2 });
});

test('active weapon replaces handwrap benefits without mixing or stacking sources', async () => {
  const inventory = [
    inventoryItem(handwraps, { is_invested: true }),
    inventoryItem(magicWeapon, { is_invested: true, is_equipped: true }),
  ];
  assert.deepEqual(await calculate(inventory), { attack: 9, dice: 2 });
  inventory[1].is_equipped = false;
  assert.deepEqual(await calculate(inventory), { attack: 8, dice: 2 });
});

test('ordinary companions and independent creatures receive no shared runes', async () => {
  const equipped = [inventoryItem(magicWeapon, { is_equipped: true, is_invested: true })];
  const animal = { ...eidolon, operations: eidolon.operations.filter((op) => op.type !== 'giveTrait') };
  assert.deepEqual(await calculate(equipped, animal), { attack: 7, dice: 1 });
  assert.deepEqual(await calculate(equipped, eidolon, unarmedAttack, 'CREATURE_1'), { attack: 7, dice: 1 });
});

test('own runes and shared runes use the greater value and never mutate saved attacks', async () => {
  const attack = structuredClone(unarmedAttack);
  attack.meta_data.runes = { potency: 3, striking: 2, property: [] };
  const before = structuredClone(attack);
  assert.deepEqual(
    await calculate([inventoryItem(magicWeapon, { is_invested: true, is_equipped: true })], eidolon, attack),
    { attack: 10, dice: 3 }
  );
  assert.deepEqual(attack, before);
  assert.deepEqual(unarmedAttack.meta_data.runes, { potency: 0, striking: 0, property: [] });
});

test('new character computation clears the previous owner equipment values', async () => {
  const equipped = [inventoryItem(magicWeapon, { is_equipped: true, is_invested: true })];
  assert.deepEqual(await calculate(equipped), { attack: 9, dice: 2 });
  assert.deepEqual(await calculate([]), { attack: 7, dice: 1 });
});

test('special investment is limited to owners and held-capable magic weapons', async () => {
  await calculate([]);
  assert.equal(engine.canInvestEidolonWeapon('CHARACTER', magicWeapon), true);
  assert.equal(engine.canInvestEidolonWeapon('COMPANION_0', magicWeapon), false);
  assert.equal(engine.canInvestEidolonWeapon('CHARACTER', unarmedAttack), false);
  const nonOwner = { ...summoner([]), companions: { list: [] } };
  await engine._executeCharacterOperations({ character: nonOwner, content, context: 'CHARACTER-SHEET' });
  assert.equal(engine.canInvestEidolonWeapon('CHARACTER', magicWeapon), false);
  engine.setVariable('CHARACTER', 'CLASS_NAMES', ['SUMMONER']);
  assert.equal(engine.canInvestEidolonWeapon('CHARACTER', magicWeapon), true);
});

test('choosing one weapon preserves invested armor and handwraps and can be undone', () => {
  const first = inventoryItem(magicWeapon, { is_invested: true });
  const second = inventoryItem({ ...magicWeapon, id: 805, name: 'Second spear' });
  const wraps = inventoryItem(handwraps, { is_invested: true });
  const armor = inventoryItem(
    { id: 806, name: 'Armor', group: 'ARMOR', meta_data: { runes: { potency: 2 } } },
    { is_invested: true }
  );
  const inventory = {
    coins: { cp: 0, sp: 0, gp: 0, pp: 0 },
    items: [first, second, wraps, armor],
    eidolon_weapon_id: first.id,
  };
  const switched = engine.setEidolonWeaponInvestment(inventory, second.id, true);
  assert.deepEqual(
    switched.items.map((item) => item.is_invested),
    [false, true, true, true]
  );
  assert.deepEqual(
    inventory.items.map((item) => item.is_invested),
    [true, false, true, true]
  );
  assert.deepEqual(
    engine.setEidolonWeaponInvestment(switched, second.id, false).items.map((item) => item.is_invested),
    [false, false, true, true]
  );
});

test('invalid investment targets do not clear the currently invested weapon', () => {
  const weapon = inventoryItem(magicWeapon, { is_invested: true });
  const wraps = inventoryItem(handwraps);
  const formula = inventoryItem({ ...magicWeapon, id: 999 }, { is_formula: true });
  const inventory = {
    coins: { cp: 0, sp: 0, gp: 0, pp: 0 },
    items: [weapon, wraps, formula],
    eidolon_weapon_id: weapon.id,
  };
  for (const id of ['missing', wraps.id, formula.id]) {
    assert.deepEqual(engine.setEidolonWeaponInvestment(inventory, id, true), inventory);
  }
});

test('ranged eidolon attacks share runes; carried weapons do not', async () => {
  const equipped = [inventoryItem(magicWeapon, { is_equipped: true, is_invested: true })];
  const ranged = { ...unarmedAttack, meta_data: { ...unarmedAttack.meta_data, range: 30 } };
  assert.deepEqual(await calculate(equipped, eidolon, ranged), { attack: 5, dice: 2 });
  const carried = { ...unarmedAttack, meta_data: { ...unarmedAttack.meta_data, category: 'simple' } };
  assert.deepEqual(await calculate(equipped, eidolon, carried), { attack: 4, dice: 1 });
});

test('ordinary invested staff stays invested when the selected eidolon weapon changes', async () => {
  const rows = await readContentRows([
    { table: 'item', id: 12723 },
    { table: 'item', id: 16270 },
  ]);
  const staffRow = rows.find(({ row }) => row.id === 12723).row;
  const weaponRow = rows.find(({ row }) => row.id === 16270).row;
  const staff = inventoryItem(staffRow, { is_invested: true, is_equipped: true });
  const weapon = inventoryItem(weaponRow, { is_equipped: true });
  assert.equal(engine.isItemInvestable(staff.item), true);
  const inventory = { coins: { cp: 0, sp: 0, gp: 0, pp: 0 }, items: [staff, weapon], eidolon_weapon_id: staff.id };
  const next = engine.setEidolonWeaponInvestment(inventory, weapon.id, true);
  assert.equal(next.items[0].is_invested, true);
  assert.equal(next.items[1].is_invested, true);
  assert.equal(next.eidolon_weapon_id, weapon.id);
  const back = engine.setEidolonWeaponInvestment(next, staff.id, true);
  assert.equal(back.items[0].is_invested, true);
  assert.equal(back.items[1].is_invested, true);
  assert.equal(back.eidolon_weapon_id, staff.id);
  const stopped = engine.setEidolonWeaponInvestment(back, staff.id, false);
  assert.equal(stopped.items[0].is_invested, true);
  assert.equal(stopped.eidolon_weapon_id, undefined);
});

test('an unselected ordinary investment never overrides handwraps; stale source falls back', () => {
  const weapon = inventoryItem(magicWeapon, { is_invested: true, is_equipped: true });
  const wraps = inventoryItem(handwraps, { is_invested: true });
  const inventory = { coins: { cp: 0, sp: 0, gp: 0, pp: 0 }, items: [weapon, wraps] };
  assert.deepEqual(engine.getEidolonRunes(inventory), { potency: 1, striking: 1 });
  assert.deepEqual(engine.getEidolonRunes({ ...inventory, eidolon_weapon_id: 'deleted' }), { potency: 1, striking: 1 });
  assert.deepEqual(engine.getEidolonRunes({ ...inventory, eidolon_weapon_id: weapon.id }), { potency: 2, striking: 1 });
});

test('actual Dragon Handwraps share their fundamental runes', async () => {
  const [{ row }] = await readContentRows([{ table: 'item', id: 11933 }]);
  assert.match(row.description, /handwraps of mighty blows/);
  const wraps = inventoryItem(row, { is_invested: true });
  assert.deepEqual(await calculate([wraps]), { attack: 10, dice: 4 });
});

test('ordinary divest and item deletion clear the saved source reference', () => {
  for (const action of ['divest', 'delete', 'delete-container']) {
    const weapon = inventoryItem(magicWeapon, { is_invested: true, is_equipped: true });
    const container = inventoryItem(
      { id: 900, name: 'Backpack', group: 'GENERAL', meta_data: { bulk: { capacity: 4 } } },
      { container_contents: [weapon] }
    );
    let entity = summoner(action === 'delete-container' ? [container] : [weapon]);
    entity.inventory.eidolon_weapon_id = weapon.id;
    const update = (change) => {
      entity = typeof change === 'function' ? change(entity) : change;
    };
    if (action === 'divest') engine.handleUpdateItem(update, { ...weapon, is_invested: false });
    else engine.handleDeleteItem(update, action === 'delete-container' ? container : weapon);
    assert.equal(entity.inventory.eidolon_weapon_id, undefined, action);
  }
});

test('moving a selected weapon preserves selection but stowing it suspends shared runes', async () => {
  const weapon = inventoryItem(magicWeapon, { is_invested: true, is_equipped: true });
  const container = inventoryItem({
    id: 900,
    name: 'Backpack',
    group: 'GENERAL',
    meta_data: { bulk: { capacity: 4 } },
  });
  let entity = summoner([weapon, container]);
  entity.inventory.eidolon_weapon_id = weapon.id;
  let resolveMove;
  const moved = new Promise((resolve) => {
    resolveMove = resolve;
  });
  const update = (change) => {
    entity = typeof change === 'function' ? change(entity) : change;
    if (engine.getFlatInvItems(entity.inventory).some((entry) => entry.id === weapon.id)) resolveMove();
  };
  engine.handleMoveItem(update, weapon, container);
  await moved;
  assert.equal(entity.inventory.eidolon_weapon_id, weapon.id);
  assert.deepEqual(engine.getEidolonRunes(entity.inventory), { potency: 0, striking: 0 });
  assert.equal(entity.inventory.items[0].container_contents[0].is_equipped, false);
});
