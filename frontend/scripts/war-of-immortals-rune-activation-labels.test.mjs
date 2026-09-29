import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { ItemSchema } from '../src/schemas/content.ts';
import { readContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260929120000_war_of_immortals_rune_activation_labels.sql', import.meta.url),
  'utf8'
);
const releaseGate = await readFile(
  new URL('../../supabase/release/war-of-immortals-rune-activation-labels.sql', import.meta.url),
  'utf8'
);
const patches = JSON.parse(migration.split('$patches$')[1]);

test('four mythic rune activations use the correct trait label without changing the link or rules', async () => {
  assert.deepEqual(patches, [
    {
      id: 16924,
      name: 'Armor Potency (Mythic)',
      activation: 'Survive Devastation',
      url: 'https://2e.aonprd.com/Equipment.aspx?ID=3498',
    },
    {
      id: 16925,
      name: 'Resilient (Mythic)',
      activation: 'Defy Obliteration',
      url: 'https://2e.aonprd.com/Equipment.aspx?ID=3499',
    },
    {
      id: 16926,
      name: 'Striking (Mythic)',
      activation: 'Unstoppable Devastation',
      url: 'https://2e.aonprd.com/Equipment.aspx?ID=3500',
    },
    {
      id: 16927,
      name: 'Weapon Potency (Mythic)',
      activation: 'Unerring Blow',
      url: 'https://2e.aonprd.com/Equipment.aspx?ID=3501',
    },
  ]);
  const [{ row: trait }] = await readContentRows([{ table: 'trait', id: 1432 }]);
  assert.equal(trait.name, 'Concentrate');
  const rows = await readContentRows(patches.map(({ id }) => ({ table: 'item', id })));
  const originals = rows.map(({ row }) => structuredClone(row));
  for (const patch of patches) {
    const original = rows.find(({ row }) => row.id === patch.id).row;
    assert.equal(original.name, patch.name);
    assert.equal(original.content_source_id, 400);
    const prefix = `**Activate—${patch.activation}** <abbr cost="REACTION" class="action-symbol">5</abbr> `;
    const before = `${prefix}([concentration](link_trait_1432))`;
    const after = `${prefix}([concentrate](link_trait_1432))`;
    assert.equal(original.description.split(before).length - 1, 1);
    const updated = structuredClone(original);
    updated.description = original.description.replace(before, after);
    assert.equal(updated.description.split(after).length - 1, 1);
    assert.ok(!updated.description.includes('[concentration](link_trait_1432)'));
    assert.equal(ItemSchema.safeParse(updated).success, true);
    assert.deepEqual(updated, { ...original, description: updated.description });
  }
  assert.deepEqual(
    rows.map(({ row }) => row),
    originals,
    'the checked-in content remains unchanged'
  );
});

test('rune label repair is guarded and has a release check', () => {
  assert.match(migration, /for update/);
  assert.match(migration, /content_source_id is distinct from 400/);
  assert.match(migration, /meta_data #>> '\{source,url\}' is distinct from patch->>'url'/);
  assert.match(migration, /status->>'state' = 'PENDING'/);
  assert.match(migration, /where id = item_row\.id and description = item_row\.description/);
  assert.match(releaseGate, /count\(\*\) = 4/);
  assert.match(releaseGate, /\[concentrate\]\(link_trait_1432\)/);
});
