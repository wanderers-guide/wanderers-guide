import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readContentRows } from './operation-test-harness.mjs';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';

const expected = [
  [39036, 'Crafter in the Vault - Primary', 3, '17'],
  [39037, 'Custodian of Groves and Gardens - Primary', 4, '18'],
  [39038, 'Echo of Lost Moments - Primary', 5, '18'],
  [39039, 'Impostor in Hidden Places - Primary', 6, '18'],
  [39040, 'Lurker in Devouring Dark - Primary', 7, '19'],
  [39041, 'Monarch of the Fey Courts - Primary', 8, '19'],
  [39042, 'Reveler in Lost Glee - Primary', 9, '19'],
  [39043, 'Stalker in Darkened Boughs - Primary', 10, '20'],
  [39044, 'Steward of Stone and Fire - Primary', 11, '20'],
  [39045, 'Vanguard of Roaring Waters - Primary', 12, '21'],
  [39046, 'Witness to Ancient Battles - Primary', 13, '21'],
].map(([id, name, aonId, page]) => ({
  table: 'ability_block',
  id,
  name,
  type: 'mode',
  cite: {
    url: `https://2e.aonprd.com/Apparitions.aspx?ID=${aonId}`,
    book: 'War of Immortals',
    page,
  },
}));
expected.push({
  table: 'trait',
  id: 4092,
  name: 'Animist Apparition',
  cite: {
    url: 'https://2e.aonprd.com/Traits.aspx?ID=837',
    book: 'War of Immortals',
    page: '216',
  },
});

const migration = await readFile(
  new URL('../../supabase/migrations/20260927150000_war_of_immortals_apparition_citations.sql', import.meta.url),
  'utf8'
);
const citations = JSON.parse(migration.split('$citations$')[1]);

test('apparition citations match the verified War entries and preserve their other fields', async () => {
  assert.equal(citations.length, 12);
  assert.equal(new Set(citations.map(({ table, id }) => `${table}:${id}`)).size, 12);
  assert.deepEqual(
    citations.map(({ table, id, name, type, cite }) => ({ table, id, name, ...(type ? { type } : {}), cite })),
    expected
  );

  const rows = await readContentRows(expected.map(({ table, id }) => ({ table, id })));
  for (const citation of citations) {
    const row = rows.find(({ table, row }) => table === citation.table && row.id === citation.id)?.row;
    assert.ok(row, `${citation.table}:${citation.id}`);
    assert.equal(row.name, citation.name);
    assert.equal(row.content_source_id, 400);
    if (citation.table === 'ability_block') assert.equal(row.type, 'mode');
    assert.ok(row.description.startsWith(citation.opening), `${row.name} description`);
    assertReviewedTransition(row.meta_data?.source, undefined, citation.cite, `${row.name} citation`);

    const copy = structuredClone(row);
    copy.meta_data = { ...(copy.meta_data ?? {}), source: citation.cite };
    assert.deepEqual(Object.keys(copy), Object.keys(row));
    assert.deepEqual({ ...copy, meta_data: row.meta_data }, row);
  }
});

test('apparition citation migration rejects changed rows, changed metadata, and curator submissions', () => {
  assert.match(migration, /current_name is distinct from citation->>'name'/);
  assert.match(migration, /current_type is distinct from citation->>'type'/);
  assert.match(migration, /current_source is distinct from 400/);
  assert.match(
    migration,
    /left\(current_description, length\(citation->>'opening'\)\) is distinct from citation->>'opening'/
  );
  assert.match(migration, /existing is not null and existing <> 'null'::jsonb/);
  assert.match(migration, /status->>'state' = 'PENDING'/);
  assert.match(
    migration,
    /set meta_data = jsonb_set\(coalesce\(meta_data, '\{\}'::jsonb\), '\{source\}', citation->'cite', true\)/
  );
});
