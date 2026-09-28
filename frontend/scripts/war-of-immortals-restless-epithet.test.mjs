import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readContentRows } from './operation-test-harness.mjs';

const sql = await readFile(
  new URL('../../supabase/migrations/20260927240000_war_of_immortals_restless_epithet.sql', import.meta.url),
  'utf8'
);

test('Restless epithet matches its War of Immortals title without changing saved choice IDs', async () => {
  const [{ row }] = await readContentRows([{ table: 'ability_block', id: 38691 }]);
  assert.equal(row.name, 'Dominion Epithet');
  assert.equal(row.type, 'class-feature');
  assert.equal(row.content_source_id, 400);
  assert.equal(row.operations.length, 1);
  const original = structuredClone(row.operations[0]);
  const choices = original.data.optionsPredefined;
  assert.equal(choices.length, 6);
  const choice = choices.find(({ id }) => id === '18a731d1-6507-461d-9f40-3081ee17e04c');
  assert.ok(choice);
  assert.equal(choice.title, 'Restless as the Tide');
  assert.equal(choice.operations[1].id, '6b05ec0d-238b-45b7-bebc-27f25dc460f1');
  const before = '**Dominion Epithet—Restless as the Tide**';
  const after = '**Dominion Epithet—Restless as the Tides**';
  assert.ok(choice.operations[1].data.text.startsWith(before));

  const savedChoiceId = choice.id;
  choice.title = 'Restless as the Tides';
  choice.operations[1].data.text = choice.operations[1].data.text.replace(before, after);
  assert.equal(choices.find(({ id }) => id === savedChoiceId)?.title, 'Restless as the Tides');
  assert.equal(original.id, row.operations[0].id);
  assert.equal(original.data.optionsPredefined[4].operations[1].data.id, 38705);
  assert.deepEqual(
    { ...original, data: { ...original.data, optionsPredefined: row.operations[0].data.optionsPredefined } },
    row.operations[0]
  );

  assert.match(sql, /where type = 'ability-block' and ref_id = 38691 and status->>'state' = 'PENDING'/);
  assert.match(sql, /set operations\[1\] = operation::json/);
  assert.match(sql, /18a731d1-6507-461d-9f40-3081ee17e04c/);
  assert.match(sql, /to_jsonb\(after_label\)/);
});
