import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readContentRows } from './operation-test-harness.mjs';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';

const sql = await readFile(
  new URL('../../supabase/migrations/20260927130000_war_of_immortals_dreamweb_bolt.sql', import.meta.url),
  'utf8'
);

test('Dreamweb Bolt is reclassified as material stock without changing its item data', async () => {
  const [{ row }] = await readContentRows([{ table: 'item', id: 17480 }]);
  assert.equal(row.name, 'Dreamweb Bolt');
  assert.equal(row.content_source_id, 400);
  assert.equal(row.meta_data.source.url, 'https://2e.aonprd.com/Equipment.aspx?ID=3517');
  assertReviewedTransition(
    { group: row.group, itemGroup: row.meta_data.group },
    { group: 'WEAPON', itemGroup: 'crossbow' },
    { group: 'GENERAL', itemGroup: '' },
    'Dreamweb Bolt classification'
  );
  assert.deepEqual(row.price, { gp: 50 });
  assert.deepEqual(row.operations, []);
  assert.equal(row.meta_data.damage.die, '');

  assert.match(sql, /name = 'Dreamweb Bolt' and content_source_id = 400/);
  assert.match(sql, /if entry\."group" = 'GENERAL' and entry\.meta_data->>'group' = '' then\s+return;/);
  assert.match(
    sql,
    /if entry\."group" is distinct from 'WEAPON' or entry\.meta_data->>'group' is distinct from 'crossbow'/
  );
  assert.match(sql, /type = 'item' and ref_id = 17480 and status->>'state' = 'PENDING'/);
  assert.match(sql, /set "group" = 'GENERAL',\s+meta_data = jsonb_set\(meta_data, '\{group\}', '""'::jsonb, false\)/);

  const changed = structuredClone(row);
  changed.group = 'GENERAL';
  changed.meta_data.group = '';
  assert.equal(changed.group, 'GENERAL');
  assert.equal(changed.meta_data.group, '');
  assert.deepEqual({ ...changed, group: row.group, meta_data: row.meta_data }, row);
});
