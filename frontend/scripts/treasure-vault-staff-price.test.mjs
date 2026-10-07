import { readReviewedHistoricalSql } from './treasure-vault-historical-test-support.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ItemSchema } from '../src/schemas/content.ts';
import { readContentRows } from './operation-test-harness.mjs';

const migration = await readReviewedHistoricalSql(
  new URL('../../supabase/migrations/20261001040000_treasure_vault_staff_price.sql', import.meta.url),
  'utf8'
);
const predicate = await readReviewedHistoricalSql(
  new URL('../../supabase/release/treasure-vault-staff-price.sql', import.meta.url),
  'utf8'
);
const [{ row }] = await readContentRows([{ table: 'item', id: 12183 }]);
const citation = {
  url: 'https://2e.aonprd.com/Equipment.aspx?ID=4789',
  book: 'Treasure Vault',
  page: '133',
};

/** Rehearse only the reviewed price leaf on either the original or repaired row. */
function repairPrice(original) {
  assert.deepEqual(
    [original.id, original.name, String(original.uuid), original.content_source_id, original.level],
    [12183, 'Lyrakien Staff', '2395682957455828', 16, 6]
  );
  assert.deepEqual(original.meta_data.source, citation);
  assert.ok(
    JSON.stringify(original.price) === JSON.stringify({ gp: 255 }) ||
      JSON.stringify(original.price) === JSON.stringify({ gp: 225 }),
    'Staff price differs from reviewed before/after values'
  );
  return { ...original, price: { gp: 225 } };
}

test('Lyrakien Staff correction changes only price on a complete valid item row', () => {
  assert.ok(ItemSchema.safeParse(row).success, 'stored row');
  const repaired = repairPrice(structuredClone(row));
  assert.ok(ItemSchema.safeParse(repaired).success, 'proposed row');
  assert.deepEqual(repairPrice(repaired), repaired, 'idempotent replay');
  assert.deepEqual({ ...repaired, price: row.price }, row, 'all unrelated fields preserved');
  assert.deepEqual(repaired.price, { gp: 225 });
});

test('unreviewed and NULL price values are rejected without a fallback', () => {
  for (const price of [{ gp: 254 }, null, {}, { gp: 225, sp: 1 }]) {
    assert.throws(() => repairPrice({ ...row, price }), /Staff price differs/);
  }
});

test('database repair and release predicate pin the original source and fail closed', () => {
  assert.match(migration, /lock table public\.content_update in share mode/);
  // The child lock must precede the cache-parent lock and price mutation.
  const queueLock = migration.indexOf('lock table public.content_update in share mode;');
  const sourceLock = migration.indexOf('perform id from public.content_source');
  assert.ok(sourceLock > queueLock);
  assert.ok(migration.search(/\n\s+update public\./) > sourceLock);
  const childLocks = migration.slice(queueLock, sourceLock);
  assert.deepEqual(
    [...childLocks.matchAll(/perform (?:[a-z]\.)?id from public\.(\w+)/g)].map((match) => match[1]),
    ['item']
  );
  assert.match(childLocks, /perform id from public\.item where id = 12183 for update;/);
  assert.match(migration, /item_row\.name is distinct from 'Lyrakien Staff'/);
  assert.match(migration, /item_row\.uuid is distinct from 2395682957455828/);
  assert.match(migration, /item_row\.price::jsonb = '\{"gp":255\}'::jsonb/);
  assert.match(migration, /item_row\.price::jsonb = '\{"gp":225\}'::jsonb/);
  assert.match(migration, /\) is not true then/);
  assert.match(migration, /status->>'state' = 'PENDING'/);
  assert.ok(migration.indexOf("status->>'state' = 'PENDING'") < migration.indexOf('update public.item set price'));
  assert.match(migration, /update public\.item set price = '\{"gp":225\}'::json/);
  assert.doesNotMatch(migration, /update public\.(character|inventory|content_update)/);
  assert.match(predicate, /select 'treasure-vault-staff-price'::text as id/);
  assert.match(predicate, /exists \(select 1 from public\.item i join public\.content_source s/);
  assert.match(predicate, /i\.price::jsonb = '\{"gp":225\}'::jsonb/);
  assert.match(predicate, /s\.user_id is null and s\.is_published is true/);
  assert.ok(migration.includes(citation.url));
  assert.ok(predicate.includes(citation.url));
});
