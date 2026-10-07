import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readContentRows } from './operation-test-harness.mjs';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';

const sql = await readFile(
  new URL('../../supabase/migrations/20260927220000_treasure_vault_sankeit_armor.sql', import.meta.url),
  'utf8'
);

test('Sankeit is cataloged as armor without changing its identity or saved-item data', async () => {
  const [{ row }] = await readContentRows([{ table: 'item', id: 12366 }]);
  assert.equal(row.name, 'Sankeit');
  assert.equal(row.content_source_id, 16);
  assert.equal(row.uuid, '8906569033590767');
  assert.equal(row.meta_data.source.url, 'https://2e.aonprd.com/Armor.aspx?ID=74');
  assert.equal(row.meta_data.category, 'light');
  assert.equal(row.meta_data.group, 'wood');
  assertReviewedTransition(row.group, 'WEAPON', 'ARMOR', 'Sankeit item classification');

  const savedItem = structuredClone({ id: 'existing-inventory-entry', item_id: row.id, item: row });
  // Model a character saved before the classification repair, regardless of dump age.
  savedItem.item.group = 'WEAPON';
  const corrected = structuredClone(row);
  corrected.group = 'ARMOR';
  assert.deepEqual({ ...corrected, group: row.group }, row);
  assert.equal(corrected.id, savedItem.item_id);
  assert.equal(corrected.uuid, savedItem.item.uuid);
  assert.equal(savedItem.item.group, 'WEAPON', 'a saved inventory snapshot is not rewritten');

  assert.match(sql, /type = 'item' and ref_id = 12366 and status->>'state' = 'PENDING'/);
  assert.match(sql, /if entry\."group" = 'ARMOR' then\s+return;/);
  assert.match(
    sql,
    /update public\.item\s+set "group" = 'ARMOR'\s+where id = 12366 and content_source_id = 16 and "group" = 'WEAPON'/
  );
  assert.doesNotMatch(sql, /update public\.(character|creature)/);
});
