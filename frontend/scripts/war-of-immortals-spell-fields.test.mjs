import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readContentRows } from './operation-test-harness.mjs';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260927160000_war_of_immortals_spell_fields.sql', import.meta.url),
  'utf8'
);
const castPatches = JSON.parse(migration.split('$casts$')[1]);
const oldLink = '[plant](link_trait_2445)';
const newLink = '[plant](link_trait_1654)';

test('War spell and ritual fields match their cited rules', async () => {
  assert.deepEqual(castPatches, [
    {
      id: 7314,
      name: 'City of Sin',
      cast: '7 days',
      remove: 'Cast 7 days; ',
      opening: 'Secondary Casters 2',
      cite: {
        url: 'https://2e.aonprd.com/MythicRituals.aspx?ID=190',
        book: 'War of Immortals',
        page: '159',
      },
    },
    {
      id: 7316,
      name: 'Curse of Calamity',
      cast: '3 days',
      remove: '**Cast** 3 days; ',
      opening: '**Secondary Casters** 3',
      cite: {
        url: 'https://2e.aonprd.com/MythicRituals.aspx?ID=192',
        book: 'War of Immortals',
        page: '160',
      },
    },
  ]);

  const rows = (await readContentRows([7314, 7316, 7323].map((id) => ({ table: 'spell', id })))).map(({ row }) => row);
  for (const patch of castPatches) {
    const row = rows.find(({ id }) => id === patch.id);
    assert.equal(row.name, patch.name);
    assert.equal(row.content_source_id, 400);
    assert.ok(row.description.startsWith(patch.remove + patch.opening) || row.description.startsWith(patch.opening));
    assert.deepEqual(row.meta_data.source, patch.cite);
    assertReviewedTransition(row.cast, null, patch.cast, `${patch.name} cast time`);
    if (row.cast === null) {
      const moved = row.description.slice(patch.remove.length);
      assert.ok(moved.startsWith(patch.opening), `${patch.name} remaining description`);
      assert.ok(!moved.startsWith(patch.remove), `${patch.name} cast line moved only once`);
    }
  }

  const feast = rows.find(({ id }) => id === 7323);
  assert.equal(feast.name, 'Wild Feast');
  assert.equal(feast.content_source_id, 400);
  assert.deepEqual(feast.meta_data.source, {
    url: 'https://2e.aonprd.com/MythicRituals.aspx?ID=199',
    book: 'War of Immortals',
    page: '163',
  });
  assertReviewedTransition(feast.description.split(oldLink).length - 1, 3, 0, 'Wild Feast old plant links');
  assertReviewedTransition(feast.description.split(newLink).length - 1, 0, 3, 'Wild Feast corrected plant links');

  const traits = (
    await readContentRows([
      { table: 'trait', id: 1654 },
      { table: 'trait', id: 2445 },
    ])
  ).map(({ row }) => row);
  const plant = traits.find(({ id }) => id === 1654);
  const fungus = traits.find(({ id }) => id === 2445);
  assert.equal(plant.name, 'Plant (creature)');
  assert.equal(fungus.name, 'Fungus');

  const [{ row: manifest }] = await readContentRows([{ table: 'spell', id: 7267 }]);
  assert.equal(manifest.name, 'Manifest Will');
  assert.equal(manifest.content_source_id, 400);
  assert.equal(manifest.rank, 0);
  assert.deepEqual(manifest.meta_data.source, {
    url: 'https://2e.aonprd.com/Spells.aspx?ID=2147',
    book: 'War of Immortals',
    page: '63',
  });
  assertReviewedTransition(
    manifest.traits,
    [1492, 1432, 1898, 1347, 1858],
    [1492, 1432, 1898, 1347, 1858, 1899],
    'Manifest Will traits'
  );
  const [{ row: subtle }] = await readContentRows([{ table: 'trait', id: 1899 }]);
  assert.equal(subtle.name, 'Subtle');
});

test('War spell repair checks the exact rows and pending curator submissions', () => {
  assert.match(migration, /current_name is distinct from patch->>'name'/);
  assert.match(migration, /current_source is distinct from 400/);
  assert.match(migration, /current_metadata->'source' is distinct from patch->'cite'/);
  assert.match(migration, /current_cast is not null/);
  assert.match(migration, /description = substr\(description, length\(patch->>'remove'\) \+ 1\)/);
  assert.match(migration, /old_count is distinct from 3 or new_count is distinct from 0/);
  assert.match(
    migration,
    /where type = 'spell' and ref_id = \(patch->>'id'\)::bigint and status->>'state' = 'PENDING'/
  );
  assert.match(migration, /where type = 'spell' and ref_id = 7323 and status->>'state' = 'PENDING'/);
  assert.match(migration, /where id = 7323 and description = current_description/);
  assert.match(migration, /current_traits is distinct from array\[1492,1432,1898,1347,1858\]::bigint\[\]/);
  assert.match(migration, /where type = 'spell' and ref_id = 7267 and status->>'state' = 'PENDING'/);
  assert.match(migration, /where id = 7267 and traits = array\[1492,1432,1898,1347,1858\]::bigint\[\]/);
});
