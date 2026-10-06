import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { after, before, test } from 'node:test';
import { createOperationEngine } from './operation-test-harness.mjs';
import { content as emptyContent, inventoryItem, summoner } from './fixtures/eidolon.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261002100000_treasure_vault_complete_catalog.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$completion100$')[1]);
const row = (value) => ({ ...structuredClone(value), uuid: Number(value.uuid) });
const catalog = new Map(
  [...spec.patches, ...spec.dependencies].map((entry) => [
    `${entry.table}:${entry.id}`,
    { table: entry.table, row: row(entry.final ?? entry.anchor) },
  ])
);
let engine;
before(async () => {
  engine = await createOperationEngine();
});
after(async () => engine?.cleanup());

for (const [parentId, profileId, level, potency, dice] of [
  [11853, 15900, 11, 2, 2],
  [11852, 15901, 18, 3, 3],
]) {
  test(`Clockwork Macuahuitl ${parentId} grants and removes exactly one correctly equipped attack`, async () => {
    const parent = catalog.get(`item:${parentId}`).row;
    const patch = spec.patches.find((entry) => entry.table === 'item' && entry.id === profileId);
    assert.ok(patch);
    assert.equal(patch.anchor.group, 'SHIELD');
    assert.equal(patch.final.group, 'WEAPON');
    assert.equal(patch.final.meta_data.unselectable, true);
    assert.deepEqual(parent.operations, [{ ...parent.operations[0], data: { itemId: profileId } }]);
    const originalParent = structuredClone(parent);

    for (const corrected of [false, true]) {
      const fixtures = [...catalog.values()].map((entry) =>
        entry.table === 'item' && entry.row.id === profileId
          ? { table: 'item', row: row(corrected ? patch.final : patch.anchor) }
          : entry
      );
      engine.setFixtures(fixtures);
      const content = {
        ...emptyContent,
        items: fixtures.filter((entry) => entry.table === 'item').map((entry) => entry.row),
        traits: fixtures.filter((entry) => entry.table === 'trait').map((entry) => entry.row),
        abilityBlocks: fixtures.filter((entry) => entry.table === 'ability_block').map((entry) => entry.row),
        defaultSources: { PAGE: [16, 1, 3, 7], INFO: [1, 3, 7] },
      };
      let character = {
        ...summoner([inventoryItem(structuredClone(parent), { is_equipped: true })]),
        level,
        companions: { list: [] },
        content_sources: { enabled: [16, 1, 3, 7] },
        options: { custom_operations: true, ignore_bulk_limit: true },
        custom_operations: [
          { id: 'clockwork-str', type: 'setValue', data: { variable: 'ATTRIBUTE_STR', value: { value: 4 } } },
          { id: 'clockwork-prof', type: 'setValue', data: { variable: 'MARTIAL_WEAPONS', value: { value: 'T' } } },
        ],
      };
      const saved = structuredClone(character);
      const calculate = async () => {
        const untouched = structuredClone(character);
        const result = await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-SHEET' });
        assert.deepEqual(result.errors, []);
        assert.deepEqual(character, untouched);
        engine.importVariableStore('CHARACTER', result.store);
      };
      const reconcile = async () => {
        engine.addExtraItems('CHARACTER', content.items, character, (update) => {
          character = update(character);
        });
        await delay(240);
      };

      await calculate();
      assert.ok(engine.getVariable('CHARACTER', 'EXTRA_ITEM_IDS').value.includes(String(profileId)));
      await reconcile();
      const profile = character.inventory.items.find((entry) => entry.item.id === profileId);
      assert.ok(profile);
      assert.equal(profile.is_equipped, corrected);
      assert.equal(
        engine.getEquippedWeapons(character.inventory.items).filter((entry) => entry.item.id === profileId).length,
        corrected ? 1 : 0
      );
      assert.deepEqual(
        character.inventory.items.find((entry) => entry.item.id === parentId),
        saved.inventory.items[0]
      );
      const itemCount = character.inventory.items.length;
      await calculate();
      await reconcile();
      assert.equal(character.inventory.items.length, itemCount);
      if (corrected) {
        const stats = engine.getWeaponStats('CHARACTER', profile.item);
        assert.equal(stats.attack_bonus.total[0], level + 2 + 4 + potency);
        assert.equal(stats.damage.dice, dice);
        assert.equal(stats.damage.die, 'd6');
        assert.equal(stats.damage.damageType, 'P');
      }

      character.inventory.items.find((entry) => entry.item.id === parentId).is_equipped = false;
      await calculate();
      assert.ok(!engine.getVariable('CHARACTER', 'EXTRA_ITEM_IDS').value.includes(String(profileId)));
      await reconcile();
      assert.ok(!character.inventory.items.some((entry) => entry.item.id === profileId));
      assert.ok(!character.meta_data.given_item_ids.includes(profileId));

      character.inventory.items[0].is_equipped = true;
      character.inventory.items[0].is_formula = true;
      await calculate();
      await reconcile();
      assert.ok(!character.inventory.items.some((entry) => entry.item.id === profileId));
      character.inventory.items[0].is_formula = false;
      await calculate();
      await reconcile();
      assert.equal(character.inventory.items.filter((entry) => entry.item.id === profileId).length, 1);
      character.inventory.items = character.inventory.items.filter((entry) => entry.item.id !== parentId);
      await calculate();
      await reconcile();
      assert.equal(character.inventory.items.length, 0);
      assert.deepEqual(parent, originalParent);
      assert.equal(saved.inventory.items.length, 1);
    }
  });
}
