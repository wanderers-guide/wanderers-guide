import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { ItemSchema, SpellSchema } from '../src/schemas/content.ts';
import { readContentRows } from './operation-test-harness.mjs';

const { uniqueId } = createRequire(import.meta.url)('../../supabase/functions/_shared/upload-utils.ts');

const migration = await readFile(
  new URL('../../supabase/migrations/20261001030000_treasure_vault_wand_fields.sql', import.meta.url),
  'utf8'
);
const predicate = await readFile(
  new URL('../../supabase/release/treasure-vault-wand-fields.sql', import.meta.url),
  'utf8'
);
const patches = JSON.parse(migration.split('$patches$')[1]);
const rows = await readContentRows([...patches.map(({ id }) => ({ table: 'item', id })), { table: 'spell', id: 5322 }]);
const row = (table, id) => rows.find((entry) => entry.table === table && entry.row.id === id).row;
const md5 = (value) => createHash('md5').update(value).digest('hex');

/** Rehearse only the guarded item leaves, preserving all other parsed content fields. */
function applyPatch(original, patch) {
  const proposed = structuredClone(original);
  assert.ok(
    proposed.meta_data !== null && typeof proposed.meta_data === 'object' && !Array.isArray(proposed.meta_data),
    `${patch.id} metadata is not an object`
  );
  assert.deepEqual(
    [proposed.id, proposed.content_source_id, proposed.level, proposed.price],
    [patch.id, patch.source, patch.level, patch.price]
  );
  assert.ok(
    (md5(proposed.name) === patch.before_name_md5 && String(proposed.uuid) === patch.before_uuid) ||
      (md5(proposed.name) === patch.after_name_md5 && String(proposed.uuid) === patch.after_uuid),
    `${patch.id} name and UUID identity differ`
  );
  assert.equal(md5(patch.before_name), patch.before_name_md5);
  assert.equal(md5(patch.after_name), patch.after_name_md5);
  proposed.name = patch.after_name;
  proposed.uuid = patch.after_uuid;
  if (patch.add_citation) {
    if (proposed.meta_data.source != null) assert.deepEqual(proposed.meta_data.source, patch.citation);
    proposed.meta_data.source = patch.citation;
  } else {
    assert.deepEqual(proposed.meta_data.source, patch.citation);
  }
  for (const [key, spec] of [
    ['description', patch.description],
    ['craft_requirements', patch.craft],
  ]) {
    if (!spec) continue;
    const initialHash = md5(proposed[key]);
    assert.ok([spec.before, spec.after].includes(initialHash), `${patch.id} ${key} differs`);
    if (initialHash === spec.after) continue;
    for (const replacement of spec.replacements) {
      assert.equal(proposed[key].split(replacement.from).length - 1, replacement.count);
      proposed[key] = proposed[key].replaceAll(replacement.from, replacement.to);
    }
    assert.equal(md5(proposed[key]), spec.after);
  }
  return proposed;
}

test('four guarded wand patches match complete official rows and preserve all unrelated fields', () => {
  assert.deepEqual(
    patches.map(({ id }) => id),
    [12659, 12675, 12676, 12702]
  );
  for (const patch of patches) {
    assert.equal(String(uniqueId(patch.after_name, 'item', patch.level, patch.source)), patch.after_uuid);
    const before = row('item', patch.id);
    assert.ok(ItemSchema.safeParse(before).success, `stored item ${patch.id}`);
    const proposed = applyPatch(before, patch);
    assert.ok(ItemSchema.safeParse(proposed).success, `proposed item ${patch.id}`);
    const replay = applyPatch(proposed, patch);
    assert.deepEqual(replay, proposed, `replay ${patch.id}`);
    assert.deepEqual(
      {
        ...proposed,
        name: before.name,
        uuid: before.uuid,
        description: before.description,
        craft_requirements: before.craft_requirements,
        meta_data: before.meta_data,
      },
      before,
      `unrelated fields ${patch.id}`
    );
    assert.deepEqual(
      { ...proposed.meta_data, source: before.meta_data.source },
      { ...before.meta_data, source: before.meta_data.source },
      `metadata siblings ${patch.id}`
    );
  }
});

test('sixth-rank Refracting Rays resolves the existing official Chromatic Ray link in both tiers', () => {
  const spell = row('spell', 5322);
  assert.ok(SpellSchema.safeParse(spell).success);
  assert.deepEqual(
    [spell.name, String(spell.uuid), spell.rank, spell.content_source_id, spell.meta_data.source],
    [
      'Chromatic Ray',
      '8318806142210311',
      4,
      13,
      {
        url: 'https://2e.aonprd.com/Spells.aspx?ID=883',
        book: 'Secrets of Magic',
        page: '95',
      },
    ]
  );
  for (const [id, rank] of [
    [12675, 4],
    [12676, 6],
  ]) {
    const patch = patches.find((entry) => entry.id === id);
    const proposed = applyPatch(row('item', id), patch);
    assert.match(
      proposed.description,
      new RegExp(`You cast ${rank}th-rank \\*\\[Chromatic Ray\\]\\(link_spell_5322\\)\\*`)
    );
    assert.match(proposed.craft_requirements, /\*\[Chromatic Ray\]\(link_spell_5322\)\*/);
    assert.doesNotMatch(proposed.description + proposed.craft_requirements, /\\?\[\\?\[Chromatic Ray/);
  }
  assert.equal(
    applyPatch(
      row('item', 12676),
      patches.find(({ id }) => id === 12676)
    ).name,
    'Wand of Refracting Rays (6th-level)'
  );
});

test('canonical title and citation repairs are constrained to the original Treasure Vault source', () => {
  const noisome = applyPatch(
    row('item', 12659),
    patches.find(({ id }) => id === 12659)
  );
  const wearying = applyPatch(
    row('item', 12702),
    patches.find(({ id }) => id === 12702)
  );
  assert.equal(noisome.name, 'Wand of Noisome Acid (4th-Level Spell)');
  assert.equal(wearying.name, 'Wand of Wearying Dance');
  assert.deepEqual(wearying.meta_data.source, {
    url: 'https://2e.aonprd.com/Equipment.aspx?ID=4832',
    book: 'Treasure Vault',
    page: '143',
  });
  if (row('item', 12702).meta_data.source != null)
    assert.deepEqual(row('item', 12702).meta_data.source, wearying.meta_data.source);
  for (const patch of patches) {
    assert.equal(patch.citation.book, 'Treasure Vault');
    assert.ok(predicate.includes(patch.after_name_md5));
    assert.ok(predicate.includes(patch.after_uuid));
    if (patch.description) assert.ok(predicate.includes(patch.description.after));
    if (patch.craft) assert.ok(predicate.includes(patch.craft.after));
  }
});

test('migration checks pending curator edits before replay and release fails closed on missing rows', () => {
  assert.match(migration, /lock table public\.content_update in share mode/);
  assert.match(migration, /item_row\.uuid = \(patch->>'before_uuid'\)::bigint/);
  assert.match(migration, /item_row\.uuid = \(patch->>'after_uuid'\)::bigint/);
  assert.match(migration, /\) is not true then/);
  assert.match(migration, /Corrected wand UUID collides with another item/);
  assert.match(migration, /item_row\.price::jsonb is distinct from/);
  assert.match(migration, /jsonb_typeof\(item_row\.meta_data\) is distinct from 'object'/);
  assert.match(migration, /spell_row\.uuid is distinct from 8318806142210311/);
  assert.match(migration, /status->>'state' = 'PENDING'/);
  assert.ok(migration.indexOf("where type = 'item'") < migration.indexOf('next_name := item_row.name'));
  assert.match(migration, /meta_data is not distinct from item_row\.meta_data/);
  assert.doesNotMatch(migration, /update public\.(character|inventory|content_update)/);
  assert.match(predicate, /select 'treasure-vault-wand-fields'::text as id/);
  assert.match(predicate, /coalesce\(\(select count\(\*\) = 4 and bool_and/);
  assert.match(predicate, /i\.id is not null/);
  assert.match(predicate, /i\.price::jsonb = e\.price/);
  assert.match(predicate, /\) is true\)/);
  assert.match(predicate, /\), false\)/);
  assert.throws(
    () =>
      applyPatch(
        { ...row('item', 12702), meta_data: null },
        patches.find(({ id }) => id === 12702)
      ),
    /metadata is not an object/
  );
  assert.throws(
    () =>
      applyPatch(
        { ...row('item', 12676), uuid: '0' },
        patches.find(({ id }) => id === 12676)
      ),
    /name and UUID identity differ/
  );
  assert.throws(
    () =>
      applyPatch(
        { ...row('item', 12676), uuid: null },
        patches.find(({ id }) => id === 12676)
      ),
    /name and UUID identity differ/
  );
});
