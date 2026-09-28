import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readContentRows } from './operation-test-harness.mjs';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260927200000_war_of_immortals_bespell_fields.sql', import.meta.url),
  'utf8'
);
const requirement = 'Your most recent action was to cast a non-cantrip spell';

test('Bloodrager Bespell Strikes displays the published action cost, frequency, and requirement', async () => {
  const rows = (await readContentRows([39157, 19948, 31445].map((id) => ({ table: 'ability_block', id })))).map(
    ({ row }) => row
  );
  const bloodrager = rows.find(({ id }) => id === 39157);
  assert.equal(bloodrager.name, 'Bespell Strikes');
  assert.equal(bloodrager.type, 'feat');
  assert.equal(bloodrager.level, 8);
  assert.equal(bloodrager.content_source_id, 400);
  assert.deepEqual(bloodrager.operations, []);

  for (const peer of rows.filter(({ id }) => id !== 39157)) {
    assert.equal(peer.actions, 'FREE-ACTION');
    assert.equal(peer.frequency, 'once per turn');
    assert.equal(peer.requirements.replace(/\s+/g, ' ').replace(/\.$/, ''), requirement);
  }

  assertReviewedTransition(bloodrager.actions, null, 'FREE-ACTION', 'Bloodrager action cost');
  assertReviewedTransition(bloodrager.frequency, '', 'once per turn', 'Bloodrager frequency');
  assertReviewedTransition(bloodrager.requirements, '', requirement, 'Bloodrager requirement');
});

test('Bloodrager field repair is scoped and preserves the feat description and operations', () => {
  assert.match(migration, /where id = 39157\s+for update/);
  assert.match(migration, /existing\.name is distinct from 'Bespell Strikes'/);
  assert.match(migration, /existing\.type is distinct from 'feat'/);
  assert.match(migration, /existing\.level is distinct from 8/);
  assert.match(migration, /existing\.content_source_id is distinct from 400/);
  assert.match(migration, /existing\.actions is null\s+and existing\.frequency = ''\s+and existing\.requirements = ''/);
  assert.match(migration, /type = 'ability-block' and ref_id = 39157 and status->>'state' = 'PENDING'/);
  assert.match(
    migration,
    /update public\.ability_block\s+set actions = 'FREE-ACTION',\s+frequency = 'once per turn',\s+requirements = 'Your most recent action was to cast a non-cantrip spell'\s+where id = 39157/
  );
  assert.match(migration, /and actions is null\s+and frequency = ''\s+and requirements = ''/);
});
