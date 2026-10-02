import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AbilityBlockSchema, ItemSchema, SpellSchema, TraitSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261001120000_treasure_vault_remaining_wand_repairs.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-remaining-wand-repairs.sql', import.meta.url),
  'utf8'
);
const old = await readFile(
  new URL('../../supabase/migrations/20261001030000_treasure_vault_wand_fields.sql', import.meta.url),
  'utf8'
);
const oldDance = JSON.parse(old.split('$patches$')[1]).find(({ id }) => id === 12702);
const patches = JSON.parse(migration.split('$patches$')[1]);
const dependencies = JSON.parse(migration.split('$dependencies$')[1]);
const rows = await readContentRows([
  ...patches.map(({ id }) => ({ table: 'item', id })),
  ...dependencies.map(({ table, id }) => ({ table: table.replaceAll('-', '_'), id })),
  ...[3, 16].map((id) => ({ table: 'content_source', id })),
]);
const get = (table, id) => {
  const result = rows.find((entry) => entry.table === table && entry.row.id === id)?.row;
  assert.ok(result, `${table}:${id} fixture missing`);
  return result;
};
const md5 = (text) => createHash('md5').update(text).digest('hex');
const render = (text) => renderToStaticMarkup(createElement(Markdown, { remarkPlugins: [remarkGfm] }, text));

/** Model only the exact already-reviewed003 identity transition when the dump predates it. */
function post003(stored) {
  const row = structuredClone(stored);
  if (row.id !== 12702) return row;
  assert.ok(
    (row.name === oldDance.before_name && String(row.uuid) === oldDance.before_uuid) ||
      (row.name === oldDance.after_name && String(row.uuid) === oldDance.after_uuid)
  );
  if (Object.hasOwn(row.meta_data, 'source')) assert.deepEqual(row.meta_data.source, oldDance.citation);
  row.name = oldDance.after_name;
  row.uuid = Number(oldDance.after_uuid);
  row.meta_data.source = structuredClone(oldDance.citation);
  return row;
}

/** Accept reviewed before/after leaves while preserving existing plain condition mentions. */
function reviewedBefore(stored, patch) {
  const row = post003(stored);
  for (const [field, spec] of [
    ['description', patch.description],
    ['craft_requirements', patch.craft],
  ]) {
    if (md5(row[field]) === spec.after) {
      for (const replacement of [...spec.replacements].reverse()) {
        for (let occurrence = 0; occurrence < replacement.count; occurrence++) {
          assert.ok(row[field].includes(replacement.to));
          row[field] = row[field].replace(replacement.to, replacement.from);
        }
      }
    }
    assert.equal(md5(row[field]), spec.before, `${patch.id}:${field} fixture drift`);
  }
  return row;
}

function repaired(stored, patch) {
  const row = structuredClone(stored);
  assert.deepEqual(
    [row.name, String(row.uuid), row.content_source_id, row.level, row.price, row.traits, row.meta_data.source],
    [patch.name, patch.uuid, patch.source, patch.level, patch.price, patch.traits, patch.citation]
  );
  for (const [field, spec] of [
    ['description', patch.description],
    ['craft_requirements', patch.craft],
  ]) {
    if (md5(row[field]) !== spec.after) {
      assert.equal(md5(row[field]), spec.before);
      for (const part of spec.replacements) {
        assert.equal(row[field].split(part.from).length - 1, part.count);
        row[field] = row[field].replaceAll(part.from, part.to);
      }
    }
    assert.equal(md5(row[field]), spec.after);
  }
  return row;
}

const originals = patches.map((patch) => reviewedBefore(get('item', patch.id), patch));
const proposed = patches.map((patch, index) => repaired(originals[index], patch));
const originalSpells = dependencies.filter(({ table }) => table === 'spell').map(({ id }) => get('spell', id));
const spells = originalSpells.map((row) => ({ ...structuredClone(row), defense: 'Will' }));
const inv = (item, flags = {}) => ({
  id: `wand-${item.id}`,
  item: structuredClone(item),
  is_formula: false,
  is_equipped: false,
  is_invested: false,
  is_implanted: false,
  container_contents: [],
  ...flags,
});
let engine;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true });
  engine.setFixtures(rows);
});
after(async () => engine?.cleanup());

test('only two reviewed wand text pairs change and exact003 identity/citation survives refreshed dumps and replay', () => {
  assert.deepEqual(
    patches.map(({ id }) => id),
    [12697, 12702]
  );
  assert.equal(patches[1].name, oldDance.after_name);
  assert.equal(patches[1].uuid, oldDance.after_uuid);
  assert.deepEqual(patches[1].citation, oldDance.citation);
  for (const [index, patch] of patches.entries()) {
    ItemSchema.parse(originals[index]);
    ItemSchema.parse(proposed[index]);
    assert.deepEqual(repaired(proposed[index], patch), proposed[index]);
    assert.deepEqual(reviewedBefore(proposed[index], patch), originals[index]);
    assert.deepEqual(
      {
        ...proposed[index],
        description: originals[index].description,
        craft_requirements: originals[index].craft_requirements,
      },
      originals[index]
    );
  }
});

test('all spell/action occurrences use actual official-cache helper links with canonical dependency identities', () => {
  for (const dependency of dependencies) {
    const row = get(dependency.table.replaceAll('-', '_'), dependency.id);
    assert.deepEqual(
      [row.name, String(row.uuid), row.content_source_id],
      [dependency.name, dependency.uuid, dependency.source]
    );
    assert.equal(get('content_source', dependency.source).user_id, null);
    assert.equal(get('content_source', dependency.source).is_published, true);
    if (dependency.table === 'spell') {
      SpellSchema.parse(row);
      assert.deepEqual(
        Object.fromEntries(Object.keys(dependency.headers).map((key) => [key, row[key]])),
        dependency.headers
      );
      assert.equal(md5(row.description), dependency.description_md5);
      assert.deepEqual(row.meta_data.source, dependency.citation);
      assert.ok(row.defense === dependency.defense || row.defense === dependency.defense_after);
    } else if (dependency.table === 'ability-block') {
      AbilityBlockSchema.parse(row);
      assert.equal(row.type, 'action');
    } else TraitSchema.parse(row);
  }
  for (const [index, patch] of patches.entries()) {
    const spell = get('spell', patch.spell_id);
    const link = `*${engine.convertToHardcodedLink('spell', spell.name.toLowerCase())}*`;
    assert.equal((proposed[index].description.match(/\(link_spell_\d+\)/g) ?? []).length, 1);
    assert.equal((proposed[index].craft_requirements.match(/\(link_spell_\d+\)/g) ?? []).length, 1);
    assert.ok(proposed[index].description.includes(link));
    assert.ok(proposed[index].craft_requirements.includes(link));
    assert.ok(proposed[index].description.includes(engine.convertToHardcodedLink('action', 'Cast a Spell')));
    for (const field of ['description', 'craft_requirements'])
      assert.match(render(proposed[index][field]), new RegExp(`<em><a href="link_spell_${patch.spell_id}">`));
  }
});

test('actual parser returns rank4 Sleep and rank8 dance with Will defense and leaves all source spells unchanged', () => {
  const saved = structuredClone(originalSpells);
  for (const [index, patch] of patches.entries()) {
    assert.deepEqual(engine.detectSpells(originals[index].description, spells, true), []);
    const result = engine.detectSpells(proposed[index].description, spells, true);
    assert.equal(result.length, 1);
    assert.deepEqual(
      [result[0].spell.id, result[0].rank, result[0].spell.rank, result[0].spell.defense],
      [patch.spell_id, patch.cast_rank, patch.cast_rank, 'Will']
    );
    assert.equal(engine.detectSpells(proposed[index].craft_requirements, spells, true)[0].rank, patch.cast_rank);
  }
  assert.deepEqual(originalSpells, saved);
  const dance = originalSpells.find(({ id }) => id === 4914);
  assert.deepEqual({ ...spells.find(({ id }) => id === 4914), defense: dance.defense }, dance);
  assert.deepEqual(
    spells.find(({ id }) => id === 4837),
    originalSpells.find(({ id }) => id === 4837)
  );
  SpellSchema.parse(spells.find(({ id }) => id === 4914));
});

test('real RichText auto-links conditions/persistent mental damage, preserves every rider, and emits no raw wrappers', () => {
  for (const [index, labels] of [['unconscious', 'frightened'], ['fatigued']].entries()) {
    const text = proposed[index].description;
    const html = engine.renderRichText(text);
    const blacklisted = engine.renderRichText(text, labels);
    assert.doesNotMatch(text, /link_condition_|\\\[\\\[|\{Frightened|persistent,mental/);
    for (const label of labels) {
      const anchor = new RegExp(`<a\\b[^>]*>${label}<\\/a>`, 'g');
      assert.equal((html.match(anchor) ?? []).length, (text.match(new RegExp(`\\b${label}\\b`, 'g')) ?? []).length);
      assert.equal((blacklisted.match(anchor) ?? []).length, 0);
    }
  }
  assert.match(engine.renderRichText(proposed[0].description), /<a\b[^>]*>persistent mental damage<\/a>/);
  assert.match(proposed[0].description, /1d6 persistent mental damage/);
  assert.match(proposed[0].description, /only if it deals 4 or more damage on a single roll/);
  assert.match(proposed[0].description, /frightened 1/);
  assert.match(proposed[0].description, /doesn't reduce its frightened condition automatically on that turn/);
  assert.match(
    proposed[1].description,
    /When the spell's duration ends, if the target was forced to dance for 1 minute, it becomes fatigued/
  );
  assert.equal(originals[0].operations, proposed[0].operations);
  assert.equal(originals[1].operations, proposed[1].operations);
});

test('literal eligibility and item-only supplements preserve ordinary source selection, filters, actor removal, and saved copies', () => {
  const saved = proposed.map((row) => inv(row));
  for (const flags of [{}, { is_formula: true }, { is_equipped: true }, { is_invested: true }]) {
    const items = proposed.map((row) => inv(row, flags));
    assert.equal(engine.filterByTraitType(items, 'WAND').length, 2);
    assert.deepEqual(engine.getInventorySpellIds(items), [4837, 4914]);
  }
  const ordinary = spells.filter(({ content_source_id }) => content_source_id === 16);
  assert.deepEqual(ordinary, []);
  const ids = engine.getInventorySpellIds(saved);
  assert.deepEqual(engine.getMissingSpellIds(ordinary, ids), ids);
  const loaded = engine.mergeSpellDependencies(ordinary, spells, ids);
  assert.deepEqual(
    loaded.map(({ id }) => id),
    [4837, 4914]
  );
  assert.deepEqual(engine.mergeSpellDependencies(ordinary, spells, engine.getInventorySpellIds([])), ordinary);
  assert.deepEqual(
    engine.filterSpellCatalog(loaded, 'sleep', 'TWO-ACTIONS', () => []).map(({ id }) => id),
    [4837]
  );
  assert.deepEqual(
    engine.filterSpellCatalog(loaded, 'sleep', 'ONE-ACTION', () => []),
    []
  );
  assert.deepEqual(
    engine.filterSpellCatalog(loaded, '', 'ALL', () => []),
    loaded
  );
  assert.deepEqual(ordinary, []);
  assert.deepEqual(
    saved,
    proposed.map((row) => inv(row))
  );
});

test('nullable-safe leaf guards, canonical action pending type, row locks, and release terminal states are pinned', () => {
  assert.deepEqual(JSON.parse(release.split('$dependencies$')[1]), dependencies);
  assert.match(migration, /lock table public\.content_update in share mode/);
  // Preserve both spell UPDATE locks and complete the child pass before parents.
  const queueLock = migration.indexOf('lock table public.content_update in share mode;');
  const sourceLock = migration.indexOf('perform id from public.content_source');
  assert.ok(sourceLock > queueLock);
  assert.ok(migration.search(/\n\s+update public\./) > sourceLock);
  const childLocks = migration.slice(queueLock, sourceLock);
  assert.deepEqual(
    [...childLocks.matchAll(/perform (?:[a-z]\.)?id from public\.(\w+)/g)].map((match) => match[1]),
    ['ability_block', 'item', 'spell', 'trait']
  );
  assert.match(
    childLocks,
    /perform a\.id from public\.ability_block a where a\.id in \(\s*select \(value->>'id'\)::bigint from jsonb_array_elements\(dependencies\)\s*where value->>'table' = 'ability-block'\s*\) order by a\.id for share;/
  );
  assert.match(
    childLocks,
    /perform i\.id from public\.item i where i\.id in \(\s*select \(value->>'id'\)::bigint from jsonb_array_elements\(patches\)\s*\) order by i\.id for update;/
  );
  assert.match(
    childLocks,
    /perform s\.id from public\.spell s where s\.id in \(\s*select \(value->>'id'\)::bigint from jsonb_array_elements\(dependencies\)\s*where value->>'table' = 'spell'\s*\) order by s\.id for update;/
  );
  assert.match(
    childLocks,
    /perform t\.id from public\.trait t where t\.id in \(\s*select \(value->>'id'\)::bigint from jsonb_array_elements\(dependencies\)\s*where value->>'table' = 'trait'\s*\) order by t\.id for share;/
  );
  assert.match(migration, /for update of s/);
  assert.match(migration, /for share of a/);
  assert.match(migration, /for share of t/);
  assert.match(migration, /u\.type = d->>'table'/);
  const replay = migration.indexOf('if md5(next_description)');
  assert.ok(migration.indexOf('dependency has a pending curator submission') < replay);
  assert.ok(migration.indexOf('wand has a pending curator submission') < replay);
  assert.match(migration, /update public\.spell set defense = 'Will' where id = 4914 and defense is null/);
  assert.doesNotMatch(migration, /update public\.(character|inventory|ability_block|trait|content_update)/);
  assert.match(release, /'treasure-vault-remaining-wand-repairs'::text as id/);
  assert.match(release, /s\.defense is not distinct from d->>'defense_after'/);
  assert.doesNotMatch(release, /s\.defense is not distinct from d->>'defense'\s+or/);
  assert.match(release, /as passed/);
});
