import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AbilityBlockSchema, InventorySchema, TraitSchema } from '../src/schemas/content.ts';
import uploadUtils from '../../supabase/functions/_shared/upload-utils.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';

const { uniqueId } = uploadUtils;
const migration = await readFile(
  new URL('../../supabase/migrations/20261001090000_treasure_vault_harnessed_trait.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-harnessed-trait.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$harnessed$')[1]);
const rows = await readContentRows([
  { table: 'trait', id: 2886 },
  ...spec.dependencies.map(({ table, id }) => ({ table: table.replaceAll('-', '_'), id })),
  { table: 'content_source', id: 3 },
  { table: 'content_source', id: 16 },
  { table: 'item', id: 12068 },
]);
const getRow = (table, id) => {
  const row = rows.find((entry) => entry.table === table && entry.row.id === id)?.row;
  assert.ok(row, table + ':' + id + ' fixture missing');
  return row;
};
const storedHarnessed = getRow('trait', 2886);
const harnessed = reviewedBefore(storedHarnessed);
const canonical =
  "This shield features a special brace or opening designed to hold lances or other jousting weapons. Jousters often use these shields as a backup in narrow passages and other places where they're unable to ride a mount. You can Interact to lock a weapon with the jousting trait in place in the shield, enabling you to use two hands to wield the shield and weapon simultaneously. If you're not wielding the combined unit with both hands, you can use neither the weapon nor the shield.\n\nWhile you have the shield raised, you can gain the jousting benefit of a weapon as if you were mounted. Because a significant portion of the weapon needs to be braced behind the shield, the weapon's reach is reduced by 5 feet if it is greater than 5 feet.";
const stripLinks = (text) => text.replace(/\[([^\]]+)\]\(link_[^)]+\)/g, '$1');
const md5 = (text) => createHash('md5').update(text).digest('hex');

/** Accept exact complete snapshots from either side of a sanitized dump refresh. */
function reviewedBefore(row) {
  assertReviewedTransition(
    { description: row.description, source: row.meta_data?.source },
    { description: spec.description_before, source: spec.source_before },
    { description: spec.description_after, source: spec.source_after },
    'Stored Harnessed description/citation pair'
  );
  const result = structuredClone(row);
  result.description = spec.description_before;
  result.meta_data.source = structuredClone(spec.source_before);
  return result;
}

/** Change only the two reviewed leaves on a full, otherwise unchanged trait clone. */
function proposed(row = harnessed) {
  const result = structuredClone(row);
  result.description = spec.description_after;
  result.meta_data.source = structuredClone(spec.source_after);
  return result;
}
let engine;
before(async () => {
  engine = await createOperationEngine();
  engine.setFixtures(rows);
});
after(async () => engine?.cleanup());

test('Harnessed has the complete canonical rule and exact guarded remaster citation, without invented mechanics', () => {
  assert.equal(harnessed.id, 2886);
  assert.equal(harnessed.name, 'Harnessed');
  assert.equal(Number(harnessed.uuid), 6134123836252393);
  assert.equal(Number(harnessed.uuid), uniqueId('Harnessed', 'trait', 0, 16));
  assert.equal(harnessed.content_source_id, 16);
  assert.equal(harnessed.description, '');
  assert.equal(md5(harnessed.description), 'd41d8cd98f00b204e9800998ecf8427e');
  assert.deepEqual(harnessed.meta_data.source, {
    url: 'https://2e.aonprd.com/Traits.aspx?ID=930',
    book: 'Treasure Vault',
    page: '219',
  });
  assert.deepEqual(spec.source_before, harnessed.meta_data.source);
  assert.deepEqual(spec.source_after, {
    url: 'https://2e.aonprd.com/Traits.aspx?ID=477',
    book: 'Treasure Vault (Remastered)',
    page: '219',
  });
  assert.equal(stripLinks(spec.description_after), canonical);
  assert.equal(spec.description_after.split('\n\n').length, 2);
  assert.doesNotMatch(spec.description_after, /implementation|manual|automation|GM note|@UUID|\\\[\\\[/i);
  TraitSchema.parse(storedHarnessed);
  TraitSchema.parse(harnessed);
  TraitSchema.parse(proposed());
});

test('all three existing link targets have table-correct identities, official sources and reviewed citations', () => {
  assert.equal(spec.dependencies.length, 3);
  for (const dependency of spec.dependencies) {
    const row = getRow(dependency.table.replaceAll('-', '_'), dependency.id);
    for (const field of ['id', 'name', 'content_source_id']) assert.equal(row[field], dependency[field]);
    assert.equal(Number(row.uuid), dependency.uuid);
    if (dependency.type) {
      assert.equal(row.type, dependency.type);
      AbilityBlockSchema.parse(row);
    } else TraitSchema.parse(row);
    if (dependency.citation) assert.deepEqual(row.meta_data.source, dependency.citation);
    const source = getRow('content_source', row.content_source_id);
    assert.equal(source.user_id, null);
    assert.equal(source.is_published, true);
  }
  assert.equal(getRow('content_source', 16).name, 'Treasure Vault');
});

test('the actual content helper resolves every occurrence, including raised, without inventing lance or reach targets', () => {
  let expected = canonical.replaceAll('jousting', engine.convertToHardcodedLink('trait', 'jousting'));
  expected = expected.replace('Interact', engine.convertToHardcodedLink('action', 'Interact'));
  expected = expected.replace(
    'shield raised,',
    'shield ' + engine.convertToHardcodedLink('action', 'Raise a Shield', 'raised') + ','
  );
  assert.equal(expected, spec.description_after);
  const matches = [...expected.matchAll(/\[([^\]]+)\]\(link_([a-z-]+)_(\d+)\)/g)];
  assert.equal(matches.length, 5);
  for (const [, display, type, id] of matches) {
    const table = type === 'action' ? 'ability_block' : type;
    const target = getRow(table, Number(id));
    if (table === 'ability_block') assert.equal(target.type, type);
    assert.equal(
      engine.convertToHardcodedLink(type, target.name, display),
      '[' + display + '](' + engine.buildHrefFromContentData(type, target.id) + ')'
    );
  }
  assert.equal((expected.match(/\[jousting\]/g) ?? []).length, 3);
  assert.match(expected, /hold lances or other/);
  assert.match(expected, /weapon's reach is reduced by 5 feet if it is greater than 5 feet\./);
  assert.doesNotMatch(expected, /\[lances\]|\[reach\]|link_item_/);
});

test('canonical prose renders as two paragraphs and five working Markdown content links', () => {
  const html = renderToStaticMarkup(
    React.createElement(Markdown, { remarkPlugins: [remarkGfm] }, spec.description_after)
  );
  assert.equal((html.match(/<p>/g) ?? []).length, 2);
  assert.equal((html.match(/href="link_trait_2748"/g) ?? []).length, 3);
  assert.match(html, /href="link_action_19733">Interact<\/a>/);
  assert.match(html, /href="link_action_19750">raised<\/a>/);
  assert.match(html, /you can use neither the weapon nor the shield/);
  assert.match(html, /reduced by 5 feet if it is greater than 5 feet/);
  assert.doesNotMatch(html, /\[\[|@UUID|implementation|GM note/i);
});

test('two-leaf clones preserve IDs, every unrelated metadata field, source counts and saved equipment/selections', () => {
  const full = structuredClone(harnessed);
  full.meta_data.important = true;
  full.meta_data.unselectable = false;
  full.meta_data.custom = { keep: ['nested', 7], enabled: true };
  const repaired = proposed(full);
  TraitSchema.parse(full);
  TraitSchema.parse(repaired);
  const restore = structuredClone(repaired);
  restore.description = full.description;
  restore.meta_data.source = structuredClone(full.meta_data.source);
  assert.deepEqual(restore, full);
  assert.equal(repaired.uuid, full.uuid);
  assert.equal(repaired.id, full.id);
  const shield = getRow('item', 12068);
  assert.equal(shield.name, 'Harnessed Shield');
  assert.ok(shield.traits.includes(2886));
  const snapshot = {
    inventory: {
      items: [
        {
          id: 'saved-harnessed-shield',
          item: structuredClone(shield),
          is_equipped: true,
          is_invested: false,
          is_formula: false,
          is_implanted: false,
          container_contents: [],
        },
      ],
      coins: { cp: 1, sp: 2, gp: 3, pp: 4 },
    },
    selections: { shield: { value: '12068' }, traits: ['2886'] },
    sources: structuredClone(rows.filter(({ table }) => table === 'content_source')),
  };
  InventorySchema.parse(snapshot.inventory);
  const before = structuredClone(snapshot);
  proposed(full);
  assert.deepEqual(snapshot, before);
  InventorySchema.parse(snapshot.inventory);
});

test('only the complete reviewed before/after pair is accepted, not mixed or unknown descriptions/citations', () => {
  const before = { description: spec.description_before, source: spec.source_before };
  const after = { description: spec.description_after, source: spec.source_after };
  assert.equal(assertReviewedTransition(before, before, after, 'Harnessed pair'), 'before');
  assert.equal(assertReviewedTransition(after, before, after, 'Harnessed pair'), 'after');
  for (const input of [structuredClone(harnessed), proposed(harnessed)]) {
    TraitSchema.parse(input);
    const savedInput = structuredClone(input);
    assert.deepEqual(reviewedBefore(input), harnessed);
    assert.deepEqual(proposed(reviewedBefore(input)), proposed(harnessed));
    assert.deepEqual(input, savedInput, 'normalizing either full dump state must not mutate its fixture');
  }
  for (const actual of [
    { ...before, source: spec.source_after },
    { ...after, source: spec.source_before },
    { ...before, description: 'Unreviewed rule text' },
    { ...after, source: { ...spec.source_after, page: '220' } },
    { ...after, source: null },
  ]) {
    assert.throws(() => assertReviewedTransition(actual, before, after, 'Harnessed pair'));
    const row = structuredClone(harnessed);
    row.description = actual.description;
    row.meta_data.source = actual.source;
    assert.throws(() => reviewedBefore(row));
  }
});

test('SQL guards pending refs before replay and changes only the two reviewed leaves with exact dependency/source checks', () => {
  assert.match(migration, /lock table public\.content_update in share mode/);
  // Keep mixed trait modes and every dependency ahead of cache-parent locks.
  const queueLock = migration.indexOf('lock table public.content_update in share mode;');
  const sourceLock = migration.indexOf('perform id from public.content_source');
  assert.ok(sourceLock > queueLock);
  assert.ok(migration.search(/\n\s+update public\./) > sourceLock);
  const childLocks = migration.slice(queueLock, sourceLock);
  assert.deepEqual(
    [...childLocks.matchAll(/perform (?:[a-z]\.)?id from public\.(\w+)/g)].map((match) => match[1]),
    ['ability_block', 'trait', 'trait']
  );
  assert.match(
    childLocks,
    /perform a\.id from public\.ability_block a where a\.id in \(\s*select \(value->>'id'\)::bigint from jsonb_array_elements\(spec->'dependencies'\)\s*where value->>'table' = 'ability-block'\s*\) order by a\.id for share;/
  );
  assert.match(
    childLocks,
    /perform t\.id from public\.trait t where t\.id in \(\s*select \(value->>'id'\)::bigint from jsonb_array_elements\(spec->'dependencies'\)\s*where value->>'table' = 'trait'\s*\) order by t\.id for share;/
  );
  assert.match(childLocks, /perform id from public\.trait where id = \(spec->>'id'\)::bigint for update;/);
  assert.match(migration, /user_id is null and is_published is true/);
  assert.match(migration, /id <> 16 or name = 'Treasure Vault'/);
  assert.match(migration, /u\.type = 'trait' and u\.ref_id in \(2886,2748\)/);
  assert.match(migration, /u\.type = 'ability-block' and u\.ref_id in \(19733,19750\)/);
  assert.match(migration, /u\.type = 'content-source' and u\.ref_id in \(3,16\)/);
  assert.ok(migration.indexOf("u.status->>'state' = 'PENDING'") < migration.indexOf('then return;'));
  assert.match(migration, /actual\.name is distinct from spec->>'name'/);
  assert.match(migration, /actual\.uuid is distinct from \(spec->>'uuid'\)::bigint/);
  assert.match(migration, /actual\.content_source_id is distinct from/);
  assert.match(migration, /description\/citation differs from reviewed pair/);
  assert.match(migration, /dependency_row #> '\{meta_data,source\}' is distinct from dependency->'citation'/);
  assert.match(
    migration,
    /set description = spec->>'description_after',\s*meta_data = jsonb_set\(meta_data, '\{source\}', spec->'source_after', false\)/
  );
  assert.match(migration, /affected <> 1/);
  assert.equal((migration.match(/update public\./g) ?? []).length, 1);
  assert.doesNotMatch(
    migration,
    /insert into|delete from|set name|set uuid|set content_source_id|set updated_at|nextval|setval|jsonb_build_object/i
  );
});

test('the SELECT-only release predicates share exact reviewed content and fail closed on absent owner/link rows', () => {
  assert.deepEqual(JSON.parse(release.split('$harnessed$')[1]), spec);
  assert.match(release, /t\.description = s\.value->>'description_after'/);
  assert.match(release, /t\.meta_data->'source' = s\.value->'source_after'/);
  assert.match(release, /t\.uuid = \(s\.value->>'uuid'\)::bigint/);
  assert.match(release, /count\(\*\) = 3 and bool_and/);
  assert.match(release, /a\.row is not null/);
  assert.match(release, /is distinct from property\.value/);
  assert.match(release, /coalesce\([\s\S]*false\)/);
  assert.doesNotMatch(release, /\b(update|insert|delete|do|call|create|alter)\b/i);
  assert.equal((release.match(/;/g) ?? []).length, 1);
});
