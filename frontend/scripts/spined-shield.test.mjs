import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

let engine;
let shield;
let attacks;
let content;
before(async () => {
  engine = await createOperationEngine();
  const rows = await readContentRows([
    { table: 'item', id: 15411 },
    { table: 'item', id: 7754 },
    { table: 'trait', id: 1704 },
  ]);
  shield = rows.find(({ table, row }) => table === 'item' && row.id === 15411).row;
  const base = rows.find(({ table, row }) => table === 'item' && row.id === 7754).row;
  const sql = await readFile(
    new URL('../../supabase/migrations/20260926020000_restore_spined_shield_attacks.sql', import.meta.url),
    'utf8'
  );
  const profiles = JSON.parse(sql.split('$profiles$')[1]);
  attacks = profiles.map((profile, index) => {
    const metadata = {
      ...structuredClone(base.meta_data),
      unselectable: true,
      runes: { potency: 1, striking: 1, property: [] },
      source: shield.meta_data.source,
      range: profile.range,
    };
    for (const key of ['hp', 'hp_max', 'hardness', 'broken_threshold', 'base_item_content']) delete metadata[key];
    return {
      ...structuredClone(base),
      id: index ? 990001 : 15412,
      name: profile.name,
      uuid: profile.uuid,
      bulk: '0',
      level: 7,
      rarity: shield.rarity,
      description: profile.description,
      craft_requirements: null,
      usage: '',
      meta_data: metadata,
      operations: index
        ? []
        : [{ id: '194d7d21-edf2-43d6-9131-b81da973c098', type: 'giveItem', data: { itemId: 990001 } }],
      content_source_id: 7,
      version: '1.0',
      price: {},
      availability: null,
    };
  });
  content = {
    items: [shield, base, ...attacks],
    traits: rows.filter(({ table }) => table === 'trait').map(({ row }) => row),
    classes: [],
    ancestries: [],
    backgrounds: [],
    abilityBlocks: [],
    spells: [],
    languages: [],
    sources: [],
    defaultSources: { PAGE: [1, 7], INFO: [1, 7] },
  };
  engine.setFixtures([...rows, ...attacks.map((row) => ({ table: 'item', row }))]);
});
after(async () => engine?.cleanup());

test('existing shield snapshots gain both attacks and lose both when the shield is unequipped', async () => {
  let character = {
    id: 1,
    level: 7,
    details: {},
    meta_data: {},
    options: { custom_operations: true, ignore_bulk_limit: true },
    inventory: { items: [{ id: 'shield', item: structuredClone(shield), is_equipped: true, container_contents: [] }] },
    custom_operations: [
      { id: 'strength', type: 'setValue', data: { variable: 'ATTRIBUTE_STR', value: { value: 4 } } },
      { id: 'dexterity', type: 'setValue', data: { variable: 'ATTRIBUTE_DEX', value: { value: 2 } } },
      { id: 'training', type: 'setValue', data: { variable: 'MARTIAL_WEAPONS', value: { value: 'T' } } },
    ],
  };
  const settle = async () => {
    for (let pass = 0; pass < 3; pass++) {
      const { errors } = await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-SHEET' });
      assert.deepEqual(errors, []);
      engine.addExtraItems('CHARACTER', content.items, character, (update) => {
        character = update(character);
      });
      await delay(230);
    }
  };
  await settle();
  assert.deepEqual(character.inventory.items.map((entry) => entry.item.id).sort(), [15411, 15412, 990001]);
  const melee = engine.getWeaponStats('CHARACTER', attacks[0]);
  const ranged = engine.getWeaponStats('CHARACTER', attacks[1]);
  assert.equal(melee.attack_bonus.total[0], 14); // Level 7 + trained 2 + Strength 4 + potency 1.
  assert.equal(ranged.attack_bonus.total[0], 12); // Dexterity 2, not Strength 4.
  for (const stats of [melee, ranged]) {
    assert.equal(stats.damage.dice, 2);
    assert.equal(stats.damage.die, 'd6');
    assert.equal(stats.damage.damageType, 'P');
  }
  for (const attack of attacks) {
    assert.ok(attack.description.includes('(link_item_15411)'), 'profile links back to the owning shield');
    assert.ok(!attack.description.includes('<abbr'), 'profiles must not duplicate item activation entries');
  }
  assert.equal(melee.damage.bonus.total, 4);
  assert.equal(ranged.damage.bonus.total, 0, 'fired spines are not thrown weapons');
  character.inventory.items.find((entry) => entry.id === 'shield').is_equipped = false;
  await settle();
  assert.deepEqual(
    character.inventory.items.map((entry) => entry.item.id),
    [15411]
  );
  assert.deepEqual(character.meta_data.given_item_ids, []);
  character.inventory.items[0].is_equipped = true;
  await settle();
  assert.equal(character.inventory.items.length, 3, 're-equipping restores exactly one of each profile');
});
