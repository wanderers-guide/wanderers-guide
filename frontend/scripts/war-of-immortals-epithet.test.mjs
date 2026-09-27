import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readContentRows } from './operation-test-harness.mjs';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';

const sql = await readFile(
  new URL('../../supabase/migrations/20260927090000_war_of_immortals_epithet_labels.sql', import.meta.url),
  'utf8'
);
const patches = JSON.parse(sql.split('$patches$')[1]);

test('Epithet label corrections retain every selection and option identifier', async () => {
  assert.equal(patches.length, 2);
  assert.equal(new Set(patches.map(({ id }) => id)).size, patches.length);
  assert.match(sql, /operations\[1\] = jsonb_set\(operation, '\{data,title\}', '"Select an Epithet"'::jsonb/);
  assert.match(sql, /status->>'state' = 'PENDING'/);

  const rows = await readContentRows(patches.map(({ id }) => ({ table: 'ability_block', id })));
  for (const patch of patches) {
    const row = rows.find((entry) => entry.row.id === patch.id)?.row;
    assert.ok(row, patch.name);
    assert.equal(row.name, patch.name);
    assert.equal(row.type, 'class-feature');
    assert.equal(row.content_source_id, 400);
    assert.equal(row.operations.length, 1);
    const [original] = row.operations;
    assert.equal(original.id, patch.operation_id);
    assert.equal(original.type, 'select');
    assert.equal(original.data.modeType, 'PREDEFINED');
    assert.equal(original.data.optionType, 'CUSTOM');
    assertReviewedTransition(original.data.title, 'Select an Epither', 'Select an Epithet', `${row.name} title`);
    assert.equal(original.data.optionsPredefined.length, patch.options);

    const updated = structuredClone(original);
    updated.data.title = 'Select an Epithet';
    assert.deepEqual(updated.data.optionsPredefined, original.data.optionsPredefined);
    assert.deepEqual({ ...updated, data: { ...updated.data, title: original.data.title } }, original);
  }
});
