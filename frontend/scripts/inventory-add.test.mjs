import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createOperationEngine } from './operation-test-harness.mjs';

test('adding an item updates inventory without a premature success notice', async (t) => {
  const engine = await createOperationEngine();
  t.after(() => engine.cleanup());
  const item = { id: 42, name: 'Test item', meta_data: { hp: 0, hp_max: 5 } };
  let entity = { inventory: { coins: { cp: 0, sp: 0, gp: 0, pp: 0 }, items: [] } };
  await engine.handleAddItem(
    (update) => {
      entity = update(entity);
    },
    item,
    false
  );

  assert.equal(entity.inventory.items.length, 1);
  assert.equal(entity.inventory.items[0].item.name, 'Test item');
  assert.equal(entity.inventory.items[0].item.meta_data.hp, 5);
  assert.equal(item.meta_data.hp, 0, 'the catalog item remains unchanged');
  assert.equal(entity.inventory.items[0].is_formula, false);
  assert.deepEqual(entity.inventory.items[0].container_contents, []);

  const source = await readFile(new URL('../src/process/items/inv-handlers.tsx', import.meta.url), 'utf8');
  const addHandler = source.split('export const handleAddItem')[1].split('/**')[0];
  assert.doesNotMatch(addHandler, /showNotification/);

  const panel = await readFile(
    new URL('../src/pages/character_sheet/panels/InventoryPanel.tsx', import.meta.url),
    'utf8'
  );
  assert.match(panel, /<VisuallyHidden role='status' aria-live='polite'>/);
  assert.match(panel, /Added \$\{item\.name\} to inventory\./);
  assert.equal([...panel.matchAll(/await addItemToInventory\(/g)].length, 3);
});

test('derived inventory and bulk promises settle only after removals reach the entity', async (t) => {
  const engine = await createOperationEngine();
  t.after(() => engine.cleanup());
  engine.resetVariables('CHARACTER');
  let entity = {
    id: 1,
    level: 1,
    inventory: { coins: { cp: 0, sp: 0, gp: 0, pp: 0 }, items: [{ id: 'old-grant', item: { id: 42 } }] },
    meta_data: { given_item_ids: [42] },
    details: { conditions: [{ name: 'Encumbered', value: 1, source: 'Over Bulk Limit' }] },
  };
  const update = (change) => {
    entity = typeof change === 'function' ? change(entity) : change;
  };
  let inventorySettled = false;
  const inventory = engine.addExtraItems('CHARACTER', [], entity, update);
  assert.equal(typeof inventory?.then, 'function');
  inventory.then(() => (inventorySettled = true));
  await new Promise((resolve) => setTimeout(resolve, 130));
  assert.equal(inventorySettled, false, 'the addition timer cannot report removal completion');
  assert.equal(entity.inventory.items.length, 1);
  await inventory;
  assert.deepEqual(entity.inventory.items, []);
  assert.deepEqual(entity.meta_data.given_item_ids, []);

  let bulkSettled = false;
  const bulk = engine.checkBulkLimit('CHARACTER', entity, update, false);
  assert.equal(typeof bulk?.then, 'function');
  bulk.then(() => (bulkSettled = true));
  await new Promise((resolve) => setTimeout(resolve, 130));
  assert.equal(bulkSettled, false);
  await bulk;
  assert.deepEqual(entity.details.conditions, []);
});
