import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readContentRows } from './operation-test-harness.mjs';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260929100000_war_of_immortals_spell_details.sql', import.meta.url),
  'utf8'
);

test('War spell and ritual details match their cited rules', async () => {
  const rows = (await readContentRows([7288, 7293, 7311, 7313].map((id) => ({ table: 'spell', id })))).map(
    ({ row }) => row
  );
  const expected = [
    [7288, "Rainbow's End", 'https://2e.aonprd.com/MythicSpells.aspx?ID=2160', '156'],
    [7293, "Trickster's Feathers", 'https://2e.aonprd.com/MythicSpells.aspx?ID=2165', '157'],
    [7311, 'Spellsurge', 'https://2e.aonprd.com/MythicSpells.aspx?ID=2150', '141'],
    [7313, 'Embodied Font', 'https://2e.aonprd.com/Rituals.aspx?ID=187', '141'],
  ];
  for (const [id, name, url, page] of expected) {
    const row = rows.find((entry) => entry.id === id);
    assert.equal(row.name, name);
    assert.equal(row.content_source_id, 400);
    assert.deepEqual(row.meta_data.source, { url, book: 'War of Immortals', page });
  }

  assertReviewedTransition(
    rows.find(({ id }) => id === 7288).area,
    '10-foot burst',
    '10-foot emanation',
    "Rainbow's End area"
  );
  assertReviewedTransition(
    rows.find(({ id }) => id === 7293).traits,
    [1432, 1447, 1433, 4072, 1479],
    [1432, 1447, 1433, 4072],
    "Trickster's Feathers traits"
  );
  assertReviewedTransition(
    rows.find(({ id }) => id === 7311).traits,
    [1432, 4072],
    [1439, 1432, 4072],
    'Spellsurge traits'
  );

  const ritual = rows.find(({ id }) => id === 7313);
  const cost = 'magic items with a value of at least 2,000 gp';
  const prefix = `**Cost** ${cost}; `;
  const state = assertReviewedTransition(ritual.cost, '', cost, 'Embodied Font cost');
  assert.ok(ritual.description.startsWith(state === 'before' ? `${prefix}**Primary Check**` : '**Primary Check**'));

  const traits = (await readContentRows([1439, 1479].map((id) => ({ table: 'trait', id })))).map(({ row }) => row);
  assert.equal(traits.find(({ id }) => id === 1439).name, 'Archetype');
  assert.equal(traits.find(({ id }) => id === 1479).name, 'Visual');
});

test('War spell detail repair is guarded against concurrent curator changes', () => {
  for (const id of [7288, 7293, 7311, 7313]) {
    assert.match(migration, new RegExp(`where id = ${id} for update`));
    assert.match(migration, new RegExp(`ref_id = ${id} and status->>'state' = 'PENDING'`));
  }
  assert.match(migration, /current_source is distinct from 400/g);
  assert.match(migration, /current_metadata #>> '\{source,url\}' is distinct from/g);
  assert.match(migration, /where id = 7288 and area = '10-foot burst'/);
  assert.match(migration, /where id = 7293 and traits = array\[1432,1447,1433,4072,1479\]::bigint\[\]/);
  assert.match(migration, /where id = 7311 and traits = array\[1432,4072\]::bigint\[\]/);
  assert.match(migration, /where id = 7313 and cost = '' and description = current_description/);
});
