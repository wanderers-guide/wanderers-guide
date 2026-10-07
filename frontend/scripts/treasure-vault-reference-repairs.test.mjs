import { readReviewedHistoricalSql } from './treasure-vault-historical-test-support.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ItemSchema, SpellSchema } from '../src/schemas/content.ts';
import { readContentRows } from './operation-test-harness.mjs';

const migrationNames = [
  '20261001010000_treasure_vault_reference_repairs.sql',
  '20261001020000_treasure_vault_equipment_fields.sql',
];
const migrations = await Promise.all(
  migrationNames.map((name) => readReviewedHistoricalSql(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8'))
);
const specs = migrations.map((sql) => JSON.parse(sql.split('$patches$')[1]));
const spellTargets = JSON.parse(migrations[0].split('$targets$')[1]);
const itemIds = [...new Set(specs.flat().map((patch) => patch.id))];
const rows = await readContentRows([
  ...itemIds.map((id) => ({ table: 'item', id })),
  ...spellTargets.map(({ id }) => ({ table: 'spell', id })),
]);
const getRow = (table, id) => rows.find((entry) => entry.table === table && entry.row.id === id).row;
const md5 = (value) => createHash('md5').update(value).digest('hex');
const leaf = (row, path) => path.reduce((value, part) => value?.[part], row);
const setLeaf = (row, path, value) => {
  const parent = path.slice(0, -1).reduce((node, part) => node[part], row);
  parent[path.at(-1)] = value;
};
const render = (value) => renderToStaticMarkup(createElement(Markdown, { remarkPlugins: [remarkGfm] }, value));

function repairedText(value, patch) {
  if (md5(value) === patch.after) return value;
  assert.equal(md5(value), patch.before, `${patch.name} differs from reviewed text`);
  for (const replacement of patch.replacements) {
    assert.equal(value.split(replacement.from).length - 1, replacement.count);
    value = value.replaceAll(replacement.from, replacement.to);
  }
  assert.equal(md5(value), patch.after);
  return value;
}

test('reference repairs preserve every unrelated field of ten valid full item rows', () => {
  assert.equal(specs[0].length, 10);
  for (const patch of specs[0]) {
    const row = getRow('item', patch.id);
    assert.deepEqual(
      [row.name, row.uuid, row.content_source_id, row.level],
      [patch.name, patch.uuid, patch.source, patch.level]
    );
    const proposed = structuredClone(row);
    const before = leaf(row, patch.path);
    const after = repairedText(before, patch);
    setLeaf(proposed, patch.path, after);
    assert.ok(ItemSchema.safeParse(proposed).success, patch.name);
    assert.equal(repairedText(after, patch), after);
    setLeaf(proposed, patch.path, before);
    assert.deepEqual(proposed, row);
  }
});

test('equipment patches match reviewed before or after values and preserve full rows', () => {
  assert.equal(specs[1].length, 16);
  assert.equal(new Set(specs[1].map(({ id }) => id)).size, 14);
  for (const id of new Set(specs[1].map((patch) => patch.id))) {
    const row = getRow('item', id);
    const proposed = structuredClone(row);
    const patches = specs[1].filter((patch) => patch.id === id);
    for (const patch of patches) {
      assert.deepEqual(
        [row.name, row.uuid, row.content_source_id, row.level],
        [patch.name, patch.uuid, patch.source, patch.level]
      );
      const current = leaf(proposed, patch.path);
      assert.ok(
        JSON.stringify(current) === JSON.stringify(patch.before) ||
          JSON.stringify(current) === JSON.stringify(patch.after),
        patch.name
      );
      setLeaf(proposed, patch.path, patch.after);
    }
    assert.ok(ItemSchema.safeParse(proposed).success, row.name);
    for (const patch of patches) setLeaf(proposed, patch.path, leaf(row, patch.path));
    assert.deepEqual(proposed, row);
  }
});

test('named rune activations render as one bold heading without false spell links', () => {
  for (const [id, title] of [
    [11726, 'Go Invisible'],
    [11832, 'Holy Healing'],
    [7052, 'Go Invisible'],
  ]) {
    const patch = specs[0].find((entry) => entry.id === id);
    const text = repairedText(leaf(getRow('item', id), patch.path), patch);
    assert.match(render(text), new RegExp(`<strong>Activate—${title}</strong>`));
    assert.doesNotMatch(text, /\*\*\*\*/);
    assert.doesNotMatch(text, /link_spell_(3390|3371)/);
    const reconstructedBefore = patch.replacements.reduce((value, part) => value.replace(part.to, part.from), text);
    const visible = (value) => render(value).replaceAll(/<[^>]+>/g, '');
    assert.equal(visible(text), visible(reconstructedBefore));
  }
});

test('Major Brightbloom keeps rank six while Fury Cocktail drops only broken reach links and foreign markup', () => {
  const posy = specs[0].find(({ id }) => id === 11814);
  assert.match(repairedText(getRow('item', posy.id).description, posy), /6th-rank \[petal storm\]\(link_spell_8999\)/);
  for (const id of [12029, 12030]) {
    const patch = specs[0].find((entry) => entry.id === id);
    const after = repairedText(getRow('item', id).description, patch);
    assert.doesNotMatch(after, /link_trait_192|\[\[Effect:/);
    assert.match(after, /reach/);
    assert.equal(md5(after), patch.after);
  }
});

test('spell dependencies retain canonical rank and mechanics when adding source URL metadata', () => {
  for (const target of spellTargets) {
    const row = getRow('spell', target.id);
    assert.deepEqual(
      [row.name, row.uuid, row.rank, row.content_source_id, row.traditions],
      [target.name, target.uuid, target.rank, target.source, target.traditions]
    );
    if (row.meta_data?.source != null) assert.deepEqual(row.meta_data.source, target.citation);
    const proposed = { ...row, meta_data: { ...row.meta_data, source: target.citation } };
    assert.ok(SpellSchema.safeParse(proposed).success, target.name);
    assert.deepEqual({ ...proposed, meta_data: row.meta_data }, row);
  }
});

test('migrations reject identity or curator drift before replay and release checks pin all repaired leaves', async () => {
  const requirements = JSON.parse(
    await readFile(new URL('../../supabase/release/requirements.json', import.meta.url), 'utf8')
  );
  const release = await readReviewedHistoricalSql(
    new URL('../../supabase/release/treasure-vault-remaster-repairs.sql', import.meta.url),
    'utf8'
  );
  for (const [index, sql] of migrations.entries()) {
    assert.match(sql, /lock table public\.content_update in share mode/);
    // The complete child pass must precede parent locks and cache-trigger writes.
    const queueLock = sql.indexOf('lock table public.content_update in share mode;');
    const sourceLock = sql.indexOf('perform id from public.content_source');
    assert.ok(sourceLock > queueLock);
    assert.ok(sql.search(/\n\s+update public\./) > sourceLock);
    const childLocks = sql.slice(queueLock, sourceLock);
    assert.deepEqual(
      [...childLocks.matchAll(/perform (?:[a-z]\.)?id from public\.(\w+)/g)].map((match) => match[1]),
      index === 0 ? ['item', 'spell'] : ['item', 'trait']
    );
    assert.match(
      childLocks,
      /perform i\.id from public\.item i where i\.id in \(\s*select \(value->>'id'\)::bigint from jsonb_array_elements\(patches\)\s*\) order by i\.id for update;/
    );
    if (index === 0) {
      assert.deepEqual(
        spellTargets.map(({ id }) => id).toSorted((a, b) => a - b),
        [8867, 8999]
      );
      assert.match(childLocks, /perform id from public\.spell where id in \(8867,8999\) order by id for update;/);
    } else {
      assert.match(
        childLocks,
        /perform t\.id from public\.trait t\s+where t\.id in \(1475,1504,1517,1527,1542,1613,1630,1665,1846,2860\)\s+order by t\.id for share;/
      );
    }
    assert.match(sql, /item_row\.uuid is distinct from/);
    assert.match(sql, /item_row\.content_source_id is distinct from/);
    assert.match(sql, /item_row\.level is distinct from/);
    const itemPending = sql.indexOf("where type = 'item'");
    const replay = sql.indexOf(
      index === 0 ? "if md5(before_text) = patch->>'after'" : "if current_value = patch->'after'"
    );
    assert.ok(itemPending > 0 && itemPending < replay);
    assert.match(sql, /get diagnostics changed_rows = row_count/);
    assert.deepEqual(requirements[migrationNames[index]], {
      check: 'treasure-vault-remaster-repairs.sql',
      order: 'before-functions',
    });
    for (const patch of specs[index]) {
      assert.ok(release.includes(String(patch.id)) && release.includes(patch.uuid));
      if (index === 0) assert.ok(release.includes(patch.after));
    }
    assert.doesNotMatch(sql, /update public\.(character|inventory|content_update)/);
  }
  assert.match(release, /count\(\*\) = 10/);
  assert.match(release, /count\(\*\) = 16/);
  assert.match(release, /'treasure-vault-item-references'::text as id/);
  assert.match(release, /'treasure-vault-equipment-fields'::text as id/);
  assert.equal((release.match(/\) is true\)/g) ?? []).length, 2);
  assert.match(migrations[0], /runes,property,0,rune,content_source_id/);
  assert.match(migrations[0], /runes,property,0,rune,uuid/);
  assert.ok(
    migrations[0].indexOf('Embedded rune differs from reviewed entry') <
      migrations[0].indexOf("if md5(before_text) = patch->>'after'")
  );
});
