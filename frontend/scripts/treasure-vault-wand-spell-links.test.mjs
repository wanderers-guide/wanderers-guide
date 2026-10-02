import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { InventoryItemSchema, ItemSchema, SpellSchema, TraitSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261001100000_treasure_vault_wand_spell_links.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-wand-spell-links.sql', import.meta.url),
  'utf8'
);
const patches = JSON.parse(migration.split('$patches$')[1]);
const dependencies = JSON.parse(migration.split('$dependencies$')[1]);
const expected = JSON.parse(release.split('$expected$')[1]);
const rows = await readContentRows([
  ...patches.map(({ id }) => ({ table: 'item', id })),
  ...dependencies.map(({ table, id }) => ({ table, id })),
  ...[3, 13, 16].map((id) => ({ table: 'content_source', id })),
]);
const getRow = (table, id) => {
  const row = rows.find((entry) => entry.table === table && entry.row.id === id)?.row;
  assert.ok(row, `${table}:${id} fixture missing`);
  return row;
};
const md5 = (text) => createHash('md5').update(text).digest('hex');
const render = (text) => renderToStaticMarkup(createElement(Markdown, { remarkPlugins: [remarkGfm] }, text));

function reviewedBefore(stored, patch) {
  const row = structuredClone(stored);
  for (const [field, spec] of [
    ['description', patch.description],
    ['craft_requirements', patch.craft],
  ]) {
    if (md5(row[field]) === spec.after) {
      for (const replacement of [...spec.replacements].reverse()) {
        // The reviewed wrappers precede later plain mentions of the same condition.
        // Restore only the exact reviewed occurrence count; the before hash proves its position.
        for (let occurrence = 0; occurrence < replacement.count; occurrence++) {
          assert.ok(row[field].includes(replacement.to));
          row[field] = row[field].replace(replacement.to, replacement.from);
        }
      }
    }
    assert.equal(md5(row[field]), spec.before, `${row.name} ${field} differs from reviewed snapshot`);
  }
  return row;
}

function repaired(stored, patch) {
  assert.deepEqual(
    [stored.id, stored.name, String(stored.uuid), stored.content_source_id, stored.level, stored.group, stored.usage],
    [patch.id, patch.name, patch.uuid, patch.source, patch.level, 'GENERAL', 'held-in-one-hand']
  );
  assert.ok(stored.traits?.includes(1665));
  assert.deepEqual(stored.meta_data.source, patch.citation);
  const row = structuredClone(stored);
  for (const [field, spec] of [
    ['description', patch.description],
    ['craft_requirements', patch.craft],
  ]) {
    if (md5(row[field]) !== spec.after) {
      assert.equal(md5(row[field]), spec.before);
      for (const replacement of spec.replacements) {
        assert.equal(row[field].split(replacement.from).length - 1, replacement.count);
        row[field] = row[field].replaceAll(replacement.from, replacement.to);
      }
    }
    assert.equal(md5(row[field]), spec.after);
  }
  return row;
}

const beforeRows = patches.map((patch) => reviewedBefore(getRow('item', patch.id), patch));
const afterRows = patches.map((patch, index) => repaired(beforeRows[index], patch));
const spells = dependencies.filter(({ table }) => table === 'spell').map(({ id }) => getRow('spell', id));
const inventory = (item, overrides = {}) => ({
  id: `wand-${item.id}`,
  item: structuredClone(item),
  is_formula: false,
  is_equipped: false,
  is_invested: false,
  is_implanted: false,
  container_contents: [],
  ...overrides,
});
let engine;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true });
  engine.setFixtures(rows);
});
after(async () => engine?.cleanup());

test('the bounded 17-wand repair changes only 34 exact text leaves, preserving full schemas and replay', () => {
  assert.deepEqual(
    patches.map(({ id }) => id),
    [
      12603, 12605, 12606, 12607, 12608, 12609, 12610, 12611, 12612, 12613, 12614, 12615, 12616, 12617, 12618, 12662,
      12663,
    ]
  );
  assert.equal(dependencies.length, 5);
  assert.equal(
    patches.reduce(
      (sum, patch) =>
        sum +
        [...patch.description.replacements, ...patch.craft.replacements]
          .filter((part) => part.to.includes('link_spell_'))
          .reduce((count, part) => count + part.count, 0),
      0
    ),
    35
  );
  assert.equal(
    patches.reduce(
      (sum, patch) =>
        sum +
        patch.description.replacements
          .filter((part) => part.to === 'Fortitude')
          .reduce((count, part) => count + part.count, 0),
      0
    ),
    7
  );
  for (const [index, patch] of patches.entries()) {
    const row = beforeRows[index];
    const proposed = afterRows[index];
    ItemSchema.parse(row);
    ItemSchema.parse(proposed);
    assert.deepEqual(repaired(proposed, patch), proposed);
    assert.deepEqual(
      reviewedBefore(proposed, patch),
      row,
      'a refreshed after-state fixture reconstructs the reviewed snapshot'
    );
    assert.deepEqual({ ...proposed, description: row.description, craft_requirements: row.craft_requirements }, row);
    // In particular, no description migration can rewrite Foundry snapshots, item prices, or operations.
    for (const field of ['meta_data', 'operations', 'price', 'name', 'uuid', 'traits', 'bulk', 'level'])
      assert.deepEqual(proposed[field], row[field]);
    assert.deepEqual(expected[index], {
      ...Object.fromEntries(Object.entries(patch).filter(([key]) => !['description', 'craft'].includes(key))),
      description_md5: patch.description.after,
      craft_md5: patch.craft.after,
    });
  }
});

test('all selected targets are canonical exact-ID official dependencies, resolved with the real link helper', () => {
  for (const dependency of dependencies) {
    const row = getRow(dependency.table, dependency.id);
    assert.deepEqual(
      [row.name, String(row.uuid), row.content_source_id],
      [dependency.name, dependency.uuid, dependency.source]
    );
    assert.equal(getRow('content_source', dependency.source).user_id, null);
    assert.equal(getRow('content_source', dependency.source).is_published, true);
    if (dependency.table === 'trait') {
      TraitSchema.parse(row);
      continue;
    }
    SpellSchema.parse(row);
    assert.deepEqual(
      [row.rank, row.traditions, row.cast, md5(row.description), row.meta_data.source],
      [dependency.rank, dependency.traditions, dependency.cast, dependency.description_md5, dependency.citation]
    );
    const linked = engine.convertToHardcodedLink('spell', row.name.toLowerCase());
    assert.equal(linked, `[${row.name.toLowerCase()}](link_spell_${row.id})`);
    for (const patch of patches.filter(({ spell_id }) => spell_id === row.id)) {
      for (const part of [...patch.description.replacements, ...patch.craft.replacements].filter((part) =>
        part.to.includes('link_spell_')
      ))
        assert.ok(part.to.includes(`*${linked}*`));
    }
  }
  engine.setFixtures([]);
  assert.equal(engine.convertToHardcodedLink('spell', 'paralyze'), 'paralyze');
  engine.setFixtures(rows);
});

test('actual wand spell detection exposes all 17 casting tiers, without changing the canonical spell rows', () => {
  const untouchedSpells = structuredClone(spells);
  for (const [index, patch] of patches.entries()) {
    assert.deepEqual(engine.detectSpells(beforeRows[index].description, spells, true), []);
    const detected = engine.detectSpells(afterRows[index].description, spells, true);
    assert.equal(detected.length, patch.id === 12603 ? 2 : 1);
    assert.equal(detected[0].spell.id, patch.spell_id);
    assert.equal(detected[0].rank, patch.cast_rank, patch.name);
    assert.equal(detected[0].spell.rank, patch.cast_rank, patch.name);
    const crafted = engine.detectSpells(afterRows[index].craft_requirements, spells, true);
    assert.equal(crafted.length, 1);
    assert.equal(crafted[0].spell.id, patch.spell_id);
  }
  assert.deepEqual(spells, untouchedSpells);
  assert.match(afterRows.find(({ id }) => id === 12663).description, /You cast 7th-rank \*\[paralyze\]/);
  assert.match(afterRows.find(({ id }) => id === 12663).description, /2d12/);
});

test('all spell and craft links render as italic links, including both formerly adjacent Paralyze craft tokens', () => {
  for (const [index, patch] of patches.entries()) {
    for (const [field, spec] of [
      ['description', patch.description],
      ['craft_requirements', patch.craft],
    ]) {
      const text = afterRows[index][field];
      const html = render(text);
      const links = spec.replacements
        .filter((part) => part.to.includes('link_spell_'))
        .reduce((count, part) => count + part.count, 0);
      assert.equal(
        (html.match(new RegExp(`<em><a href="link_spell_${patch.spell_id}">`, 'g')) ?? []).length,
        links,
        `${patch.id}:${field}`
      );
      assert.doesNotMatch(text, /\*\[[^\]]+\]\(link_spell_\d+\)\*[A-Za-z]/);
      if (patch.id >= 12662 && field === 'craft_requirements') {
        assert.match(html, /<em><a href="link_spell_4751">paralyze<\/a><\/em> of the appropriate rank/);
        assert.doesNotMatch(html, /\*/);
      }
    }
  }
});

test('canonical conditional riders and unrelated imported prose remain byte-for-byte unchanged', () => {
  for (const [index, patch] of patches.entries()) {
    for (const [field, spec] of [
      ['description', patch.description],
      ['craft_requirements', patch.craft],
    ]) {
      const restored = [...spec.replacements].reverse().reduce((text, part) => {
        for (let occurrence = 0; occurrence < part.count; occurrence++) text = text.replace(part.to, part.from);
        return text;
      }, afterRows[index][field]);
      assert.equal(restored, beforeRows[index][field]);
    }
  }
  for (const row of afterRows.filter(({ id }) => id >= 12605 && id <= 12611)) {
    assert.match(row.description, /Fortitude/);
    assert.doesNotMatch(row.description, /@Check/);
  }
});

test('30 exact condition wrappers become lowercase text and the actual RichText auto-links every occurrence', () => {
  const names = ['blinded', 'dazzled', 'frightened', 'stupefied', 'paralyzed'];
  let count = 0;
  for (const [index, patch] of patches.entries()) {
    const labels =
      patch.id >= 12605 && patch.id <= 12611
        ? ['blinded', 'dazzled']
        : patch.id >= 12612 && patch.id <= 12618
          ? ['frightened', 'stupefied']
          : patch.id >= 12662
            ? ['paralyzed']
            : [];
    const conditionChanges = patch.description.replacements.filter(({ to }) => names.includes(to));
    assert.deepEqual(
      conditionChanges.map(({ to }) => to),
      labels
    );
    for (const part of conditionChanges) {
      assert.equal(part.count, 1);
      assert.equal(part.from, `\\[\\[${part.to[0].toUpperCase() + part.to.slice(1)}\\]\\]`);
      count += part.count;
    }
    const text = afterRows[index].description;
    assert.doesNotMatch(text, /link_condition_|\\\[\\\[(?:Blinded|Dazzled|Frightened|Stupefied|Paralyzed)\\\]\\\]/);
    if (labels.length === 0) continue;
    const html = engine.renderRichText(text);
    const blacklisted = engine.renderRichText(text, labels);
    for (const label of labels) {
      const occurrences = (text.match(new RegExp(`\\b${label}\\b`, 'g')) ?? []).length;
      const anchors = new RegExp(`<a\\b[^>]*>${label}<\\/a>`, 'g');
      assert.equal((html.match(anchors) ?? []).length, occurrences, `${patch.id}:${label} auto-links every occurrence`);
      assert.equal(
        (blacklisted.match(anchors) ?? []).length,
        0,
        `${patch.id}:${label} uses the actual condition blacklist`
      );
      assert.doesNotMatch(html, new RegExp(`\\[\\[${label}\\]\\]`, 'i'));
    }
  }
  assert.equal(count, 30);
});

test('existing wand eligibility stays literal across equipment/formula flags, containers, entities, and removal', () => {
  for (const flags of [{}, { is_equipped: true }, { is_formula: true }, { is_invested: true }]) {
    const oldItems = beforeRows.map((row) => inventory(row, flags));
    const items = afterRows.map((row) => inventory(row, flags));
    items.forEach((entry) => InventoryItemSchema.parse(entry));
    assert.deepEqual(
      engine.filterByTraitType(oldItems, 'WAND').map(({ id }) => id),
      engine.filterByTraitType(items, 'WAND').map(({ id }) => id)
    );
    assert.equal(engine.filterByTraitType(items, 'WAND').length, 17);
    assert.deepEqual(engine.getInventorySpellIds(oldItems), []);
    assert.deepEqual(engine.getInventorySpellIds(items), [4599, 4660, 4751, 5378]);
  }
  const actor = [inventory(afterRows[0])];
  const saved = structuredClone(actor);
  assert.deepEqual(engine.getInventorySpellIds(actor), [4599]);
  assert.deepEqual(engine.getInventorySpellIds([]), []);
  const container = inventory({ ...afterRows[0], traits: [] }, { container_contents: actor });
  assert.deepEqual(engine.filterByTraitType([container], 'WAND'), []);
  assert.deepEqual(engine.getInventorySpellIds([container]), []);
  assert.deepEqual(actor, saved);
});

test('source16-only item dependencies stay separate from ordinary selection and stale actor results', () => {
  const ordinary = spells.filter(({ content_source_id }) => content_source_id === 16);
  assert.deepEqual(ordinary, []);
  const owned = [inventory(afterRows.find(({ id }) => id === 12663))];
  const ids = engine.getInventorySpellIds(owned);
  assert.deepEqual(ids, [4751]);
  assert.deepEqual(engine.getMissingSpellIds(ordinary, ids), ids);
  const itemCatalog = engine.mergeSpellDependencies(ordinary, spells, ids);
  assert.deepEqual(
    itemCatalog.map(({ id }) => id),
    [4751]
  );
  assert.deepEqual(ordinary, []);
  assert.deepEqual(engine.mergeSpellDependencies(ordinary, spells, []), ordinary);
  assert.deepEqual(engine.mergeSpellDependencies(ordinary, undefined, ids), ordinary);
  assert.deepEqual(engine.mergeSpellDependencies(itemCatalog, spells, ids), itemCatalog);
  const names = () => [];
  assert.deepEqual(engine.filterSpellCatalog(itemCatalog, 'paralyze', 'ALL', names), itemCatalog);
  assert.deepEqual(engine.filterSpellCatalog(itemCatalog, '', 'TWO-ACTIONS', names), itemCatalog);
  assert.deepEqual(engine.filterSpellCatalog(itemCatalog, 'paralyze', 'TWO-ACTIONS', names), itemCatalog);
  assert.deepEqual(engine.filterSpellCatalog(itemCatalog, 'holy light', 'ALL', names), []);
  assert.deepEqual(engine.filterSpellCatalog(itemCatalog, 'paralyze', 'ONE-ACTION', names), []);
  assert.deepEqual(engine.filterSpellCatalog(itemCatalog, '', 'ALL', names), itemCatalog);
});

test('SQL guards are nullable-safe, pending before replay, leaf-only, and use the release evaluator contract', () => {
  assert.match(migration, /lock table public\.content_update in share mode/);
  // The whole exact child set, not merely the first owner, precedes parents.
  const queueLock = migration.indexOf('lock table public.content_update in share mode;');
  const sourceLock = migration.indexOf('perform id from public.content_source');
  assert.ok(sourceLock > queueLock);
  assert.ok(migration.search(/\n\s+update public\./) > sourceLock);
  const childLocks = migration.slice(queueLock, sourceLock);
  assert.deepEqual(
    [...childLocks.matchAll(/perform (?:[a-z]\.)?id from public\.(\w+)/g)].map((match) => match[1]),
    ['item', 'spell', 'trait']
  );
  assert.match(
    childLocks,
    /perform i\.id from public\.item i where i\.id in \(\s*select \(value->>'id'\)::bigint from jsonb_array_elements\(patches\)\s*\) order by i\.id for update;/
  );
  assert.match(
    childLocks,
    /perform s\.id from public\.spell s where s\.id in \(\s*select \(value->>'id'\)::bigint from jsonb_array_elements\(dependencies\)\s*where value->>'table' = 'spell'\s*\) order by s\.id for share;/
  );
  assert.match(
    childLocks,
    /perform t\.id from public\.trait t where t\.id in \(\s*select \(value->>'id'\)::bigint from jsonb_array_elements\(dependencies\)\s*where value->>'table' = 'trait'\s*\) order by t\.id for share;/
  );
  assert.match(migration, /order by id for update/);
  assert.match(migration, /for share of s/);
  assert.match(migration, /for share of t/);
  assert.match(migration, /item_row\.uuid is distinct from/);
  assert.match(migration, /item_row\.usage is distinct from 'held-in-one-hand'/);
  assert.match(migration, /\(1665 = any\(item_row\.traits\)\) is not true/);
  assert.match(migration, /jsonb_typeof\(item_row\.meta_data\) is distinct from 'object'/);
  assert.match(migration, /u\.type = d->>'table'/);
  const replay = migration.indexOf('if md5(next_description)');
  assert.ok(migration.indexOf('dependency has a pending curator submission') < replay);
  assert.ok(migration.indexOf('item has a pending curator submission') < replay);
  assert.match(migration, /update public\.item set description = next_description, craft_requirements = next_craft/);
  assert.match(migration, /description is not distinct from item_row\.description/);
  assert.doesNotMatch(migration, /update public\.(character|inventory|content_update|spell|trait)/);
  assert.match(release, /'treasure-vault-wand-spell-links'::text as id/);
  assert.match(release, /as passed/);
  assert.match(release, /count\(\*\) = 17/);
  assert.match(release, /count\(\*\) = 5/);
  assert.match(release, /is true/);
  assert.match(release, /not exists/);
  assert.deepEqual(JSON.parse(release.split('$dependencies$')[1]), dependencies);
});
