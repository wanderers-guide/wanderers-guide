import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readContentRows } from './operation-test-harness.mjs';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260929110000_war_of_immortals_shift_frequency.sql', import.meta.url),
  'utf8'
);

test('Shift Immanence has no per-round frequency limit', async () => {
  const [{ row }] = await readContentRows([{ table: 'ability_block', id: 38584 }]);
  assert.equal(row.name, 'Shift Immanence');
  assert.equal(row.type, 'feat');
  assert.equal(row.content_source_id, 400);
  assert.equal(row.actions, 'ONE-ACTION');
  assert.deepEqual(row.meta_data.source, {
    url: 'https://2e.aonprd.com/Actions.aspx?ID=3030',
    book: 'War of Immortals',
    page: '25',
  });
  assertReviewedTransition(row.frequency, 'once per round', '', 'Shift Immanence frequency');
  assert.match(row.special, /free action triggered when you roll initiative/);
});

test('Shift Immanence repair leaves pending curator changes untouched', () => {
  assert.match(migration, /from public\.ability_block where id = 38584 for update/);
  assert.match(migration, /current_type is distinct from 'feat'/);
  assert.match(migration, /current_source is distinct from 400/);
  assert.match(migration, /current_actions is distinct from 'ONE-ACTION'/);
  assert.match(
    migration,
    /current_metadata #>> '\{source,url\}' is distinct from 'https:\/\/2e\.aonprd\.com\/Actions\.aspx\?ID=3030'/
  );
  assert.match(migration, /where type = 'ability-block' and ref_id = 38584 and status->>'state' = 'PENDING'/);
  assert.match(migration, /where id = 38584 and frequency = 'once per round'/);
});
