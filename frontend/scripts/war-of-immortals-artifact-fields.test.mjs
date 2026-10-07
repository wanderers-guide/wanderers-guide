import assert from 'node:assert/strict';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260929070000_war_of_immortals_artifact_fields.sql', import.meta.url),
  'utf8'
);
const correction = await readFile(
  new URL('../../supabase/migrations/20260929070001_war_of_immortals_worldforge_preservation.sql', import.meta.url),
  'utf8'
);
const release = await readFile(new URL('../../supabase/release/war-of-immortals.sql', import.meta.url), 'utf8');
const patches = JSON.parse(migration.split('$patches$')[1]);

test('War artifact fields match their cited entries without changing other item data', async () => {
  assert.deepEqual(
    patches.map(({ id, field, before, after }) => ({ id, field, before, after })),
    [
      { id: 16929, field: 'bulk', before: '0.1', after: '1' },
      { id: 17101, field: 'bulk', before: '1', after: '0.1' },
      { id: 16930, field: 'bulk', before: '15', after: '1' },
      { id: 16930, field: 'usage', before: '', after: 'held in 1 hand' },
    ]
  );
  const rows = await readContentRows([...new Set(patches.map(({ id }) => id))].map((id) => ({ table: 'item', id })));
  const originals = rows.map(({ row }) => structuredClone(row));
  const updated = rows.map(({ row }) => structuredClone(row));
  for (const patch of patches) {
    const item = updated.find(({ id }) => id === patch.id);
    assert.ok(item, patch.name);
    assert.equal(item.name, patch.name);
    assert.equal(item.content_source_id, 400);
    assert.equal(item.meta_data.source.url, patch.url);
    assertReviewedTransition(item[patch.field], patch.before, patch.after, `${patch.name}/${patch.field}`);
    item[patch.field] = patch.after;
  }
  for (const { row } of rows) {
    const item = updated.find(({ id }) => id === row.id);
    const expected = structuredClone(row);
    for (const patch of patches.filter(({ id }) => id === row.id)) expected[patch.field] = patch.after;
    assert.deepEqual(item, expected);
  }
  assert.deepEqual(
    rows.map(({ row }) => row),
    originals,
    'the checked-in content remains unchanged'
  );
  assert.match(migration, /status->>'state' = 'PENDING'/);
  assert.match(migration, /original is distinct from patch->>'before'/);
});

test('Worldforge correction restores only its reviewed bulk and usage', async () => {
  const [{ row }] = await readContentRows([{ table: 'item', id: 16930 }]);
  assert.equal(row.name, 'Worldforge');
  assert.equal(row.uuid, '5574690037466395');
  assert.equal(row.content_source_id, 400);
  assert.equal(row.bulk, '15');
  assert.equal(row.usage, '');
  assert.equal(row.meta_data.source.url, 'https://2e.aonprd.com/Equipment.aspx?ID=3511');

  assert.match(correction, /select \* into worldforge from public\.item where id = 16930 for update/);
  assert.match(correction, /worldforge\.uuid is distinct from 5574690037466395/);
  assert.match(correction, /worldforge\.meta_data #>> '\{source,book\}' is distinct from 'War of Immortals'/);
  assert.match(correction, /worldforge\.meta_data #>> '\{source,page\}' is distinct from '152'/);
  assert.match(correction, /if worldforge\.bulk = '15' and worldforge\.usage = '' then\s+return;/);
  assert.match(correction, /worldforge\.bulk is distinct from '1'\s+or worldforge\.usage is distinct from 'held in 1 hand'/);
  assert.match(correction, /type = 'item' and ref_id = 16930 and status->>'state' = 'PENDING'/);
  assert.ok(correction.indexOf("status->>'state' = 'PENDING'") < correction.indexOf("if worldforge.bulk = '15'"));
  const update = correction.match(/update public\.item\s+set (.*?)\s+where /s);
  assert.ok(update);
  assert.equal(update[1], "bulk = '15', usage = ''");
  assert.match(correction, /content_source_id = 400 and bulk = '1' and usage = 'held in 1 hand'/);
  assert.match(correction, /if not found then\s+raise exception 'Worldforge changed before its bulk and usage could be preserved'/);
  assert.match(release, /select 'war-worldforge-preservation',[\s\S]*?bulk = '15' and usage = ''/);
});
