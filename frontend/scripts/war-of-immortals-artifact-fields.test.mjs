import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260929070000_war_of_immortals_artifact_fields.sql', import.meta.url),
  'utf8'
);
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
    assert.equal(item[patch.field], patch.before);
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
