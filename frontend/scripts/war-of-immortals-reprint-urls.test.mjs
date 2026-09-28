import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readContentRows } from './operation-test-harness.mjs';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';

const expected = [
  [38746, 'Conceal Spell', 2, 4997],
  [38792, 'Reactive Strike', 6, 5832],
  [39146, 'Twin Riposte', 12, 4831],
  [39271, 'Inviolable', 18, 4701],
  [39270, 'Premonition of Clarity', 16, 4691],
  [39277, 'Instructive Strike', 4, 8364],
  [38785, 'Lightning Swap', 2, 4783],
  [39148, 'Improved Twin Riposte', 16, 4844],
  [39145, 'Twin Parry', 6, 4796],
  [39144, 'Twin Takedown', 4, 4864],
  [39147, 'Second Sting', 14, 4895],
  [39158, 'Energy Ward', 12, 6101],
  [39278, 'Ongoing Investigation', 4, 5949],
  [39269, 'Martyr', 10, 4669],
].map(([id, name, level, aonId]) => ({
  id,
  name,
  level,
  cite: { url: `https://2e.aonprd.com/Feats.aspx?ID=${aonId}` },
}));

const migration = await readFile(
  new URL('../../supabase/migrations/20260927190000_war_of_immortals_reprint_urls.sql', import.meta.url),
  'utf8'
);
const citations = JSON.parse(migration.split('$citations$')[1]);

test('War reprint feats receive only their verified AoN URLs', async () => {
  assert.deepEqual(citations, expected);
  assert.equal(new Set(citations.map(({ id }) => id)).size, 14);

  const rows = await readContentRows(expected.map(({ id }) => ({ table: 'ability_block', id })));
  for (const citation of citations) {
    const row = rows.find(({ row: entry }) => entry.id === citation.id)?.row;
    assert.ok(row, `feat ${citation.id}`);
    assert.equal(row.name, citation.name);
    assert.equal(row.type, 'feat');
    assert.equal(row.level, citation.level);
    assert.equal(row.content_source_id, 400);
    assertReviewedTransition(row.meta_data?.source, undefined, citation.cite, `${row.name} citation`);
  }
});

test('War reprint URL migration guards identity, curator work, and existing citations', () => {
  assert.match(migration, /current_name is distinct from citation->>'name'/);
  assert.match(migration, /current_type is distinct from 'feat'/);
  assert.match(migration, /current_level is distinct from \(citation->>'level'\)::integer/);
  assert.match(migration, /current_source is distinct from 400/);
  assert.match(migration, /existing = citation->'cite'/);
  assert.match(migration, /existing is not null and existing <> 'null'::jsonb/);
  assert.match(migration, /status->>'state' = 'PENDING'/);
  assert.match(
    migration,
    /set meta_data = jsonb_set\(coalesce\(meta_data, '\{\}'::jsonb\), '\{source\}', citation->'cite', true\)/
  );
});
