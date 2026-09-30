import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SpellSchema } from '../src/schemas/content.ts';
import { readContentRows } from './operation-test-harness.mjs';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';

const migrationName = '20260930030000_war_of_immortals_spell_reference_links.sql';
const migration = await readFile(new URL(`../../supabase/migrations/${migrationName}`, import.meta.url), 'utf8');
const release = await readFile(
  new URL('../../supabase/release/war-of-immortals-spell-reference-links.sql', import.meta.url),
  'utf8'
);
const requirements = JSON.parse(
  await readFile(new URL('../../supabase/release/requirements.json', import.meta.url), 'utf8')
);
const targets = JSON.parse(migration.split('$targets$')[1]);
const repairs = JSON.parse(migration.split('$repairs$')[1]);
const expectedTargets = [
  { table: 'item', id: 6693, type: 'item', name: "Alchemist's Lab", uuid: '981315748264688', source: 1 },
  {
    table: 'ability_block',
    id: 38707,
    type: 'feat',
    name: 'Crafter in the Vault',
    uuid: '5805084005545995',
    source: 400,
  },
  { table: 'trait', id: 2938, type: 'trait', name: 'Plant', uuid: '339889839350251', source: 3 },
  { table: 'trait', id: 4075, type: 'trait', name: 'Apparition', uuid: '8054066192161682', source: 400 },
  { table: 'spell', id: 4687, type: 'spell', name: 'Interplanar Teleport', uuid: '7609947194314161', source: 3 },
  { table: 'spell', id: 7318, type: 'spell', name: 'Imprisonment', uuid: '3996631344551247', source: 400 },
  { table: 'spell', id: 7317, type: 'spell', name: 'Freedom', uuid: '2578725875317887', source: 400 },
  { table: 'ability_block', id: 20769, type: 'sense', name: 'Darkvision', uuid: '990708369957964', source: 3 },
  { table: 'spell', id: 4699, type: 'spell', name: 'Light', uuid: '2956398977648258', source: 3 },
];
const referenceInputs = new Map([
  [
    7268,
    [
      { from: 'alchemist’s lab', target: 6693, display: 'alchemist’s lab', count: 1 },
      { from: 'crafter in the vault', target: 38707, display: 'crafter in the vault', count: 2 },
    ],
  ],
  [7285, [{ from: '(plant)', target: 2938, display: 'plant', prefix: '(', suffix: ')', count: 2 }]],
  [7278, [{ from: 'apparition trait', target: 4075, display: 'apparition', suffix: ' trait', count: 1 }]],
  [
    7315,
    [
      {
        from: 'interplanar teleport or similar',
        target: 4687,
        display: 'interplanar teleport',
        suffix: ' or similar',
        count: 1,
      },
      { from: 'interplanar teleport locus', target: 4687, display: 'interplanar teleport', suffix: ' locus', count: 1 },
    ],
  ],
  [7317, [{ from: 'imprisonment', target: 7318, display: 'imprisonment', count: 2 }]],
  [7318, [{ from: 'freedom', target: 7317, display: 'freedom', count: 3 }]],
  [
    7324,
    [
      { from: 'Casters with darkvision', target: 20769, display: 'darkvision', prefix: 'Casters with ', count: 1 },
      { from: 'for a light spell', target: 4699, display: 'light', prefix: 'for a ', suffix: ' spell', count: 1 },
    ],
  ],
]);
const expectedCounts = new Map([
  [
    7268,
    [
      [6693, 1],
      [38707, 2],
    ],
  ],
  [7285, [[2938, 2]]],
  [7278, [[4075, 1]]],
  [7315, [[4687, 3]]],
  [7317, [[7318, 2]]],
  [7318, [[7317, 3]]],
  [
    7324,
    [
      [20769, 2],
      [4699, 1],
    ],
  ],
]);
const rows = await readContentRows([...targets, ...[...referenceInputs.keys()].map((id) => ({ table: 'spell', id }))]);

// Exercise the real cache-driven resolver with official fixtures, without remote reads.
const frontend = new URL('../', import.meta.url).pathname;
const bundle = await build({
  stdin: {
    contents: `export { convertToHardcodedLink, buildHrefFromContentData } from './src/process/content/hardcoded-links.ts'; export { setFixtures } from '@content/content-store';`,
    resolveDir: frontend,
    loader: 'ts',
  },
  tsconfig: `${frontend}tsconfig.json`,
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  plugins: [
    {
      name: 'official-reference-fixtures',
      setup(builder) {
        builder.onResolve({ filter: /^@content\/content-store$/ }, () => ({
          path: 'content-store',
          namespace: 'fixture',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
          contents: `let rows = []; export function setFixtures(value) { rows = value; } export function getCachedContent(type) { return rows.filter(entry => entry.table === type.replaceAll('-', '_')).map(entry => entry.row); }`,
          loader: 'js',
        }));
      },
    },
  ],
});
const resolver = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);
resolver.setFixtures(rows);
const md5 = (text) => createHash('md5').update(text).digest('hex');
const stripContentLinks = (text) => text.replace(/\[([^\]]+)\]\(link_[^)]+\)/g, '$1');
const count = (text, value) => text.split(value).length - 1;

/** Accept refreshed repaired dumps without linking their references a second time. */
function reviewedDescription(description, repair, replacements) {
  const state = assertReviewedTransition(md5(description), repair.before, repair.after, `${repair.name} text`);
  if (state === 'after') return description;
  let corrected = description;
  for (const reference of replacements) {
    assert.equal(count(corrected, reference.from), reference.count);
    corrected = corrected.replaceAll(reference.from, reference.to);
  }
  return corrected;
}

test('War spell references resolve to the intended official records and subtypes', () => {
  assert.deepEqual(targets, expectedTargets);
  for (const target of targets) {
    const row = rows.find((entry) => entry.table === target.table && entry.row.id === target.id).row;
    assert.equal(row.name, target.name);
    assert.equal(row.uuid, target.uuid);
    assert.equal(row.content_source_id, target.source);
    assert.equal(row.type ?? target.table, target.type);
    const link = resolver.convertToHardcodedLink(target.type, target.name);
    assert.equal(link, `[${target.name}](${resolver.buildHrefFromContentData(target.type, target.id)})`);
  }
  assert.deepEqual(
    repairs.map(({ id }) => id),
    [...referenceInputs.keys()]
  );
});

test('all fifteen missing references become links without changing complete spell rows or rules prose', () => {
  let addedLinks = 0;
  for (const repair of repairs) {
    const row = rows.find((entry) => entry.table === 'spell' && entry.row.id === repair.id).row;
    assert.equal(row.name, repair.name);
    assert.equal(row.uuid, repair.uuid);
    assert.equal(row.content_source_id, 400);
    assert.equal(row.meta_data.source.url, repair.url);
    const expected = referenceInputs
      .get(row.id)
      .map(({ from, target: id, display, prefix = '', suffix = '', count }) => {
        const target = targets.find((entry) => entry.id === id);
        return {
          from,
          to: `${prefix}${resolver.convertToHardcodedLink(target.type, target.name, display)}${suffix}`,
          count,
        };
      });
    assert.deepEqual(repair.replacements, expected);

    const proposed = structuredClone(row);
    proposed.description = reviewedDescription(row.description, repair, expected);
    assert.equal(md5(proposed.description), repair.after);
    assert.equal(reviewedDescription(proposed.description, repair, expected), proposed.description);
    assert.ok(SpellSchema.safeParse(proposed).success, row.name);
    assert.deepEqual({ ...proposed, description: row.description }, row);
    assert.equal(stripContentLinks(proposed.description), stripContentLinks(row.description));

    const html = renderToStaticMarkup(createElement(Markdown, { remarkPlugins: [remarkGfm] }, proposed.description));
    for (const [id, expectedCount] of expectedCounts.get(row.id)) {
      const target = targets.find((entry) => entry.id === id);
      const href = resolver.buildHrefFromContentData(target.type, target.id);
      assert.equal(count(proposed.description, `](${href})`), expectedCount, `${row.name} ${target.name}`);
      assert.equal(count(html, `href="${href}"`), expectedCount, `${row.name} rendered ${target.name}`);
    }
    addedLinks += expected.reduce((total, reference) => total + reference.count, 0);
    assert.match(release, new RegExp(repair.after));
  }
  assert.equal(addedLinks, 15);
});

test('War spell reference repair preserves curator edits and verifies its final state', () => {
  assert.match(migration, /where id = \(repair->>'id'\)::bigint for update/);
  assert.match(migration, /where id = \$1 for share/);
  assert.match(migration, /current_type is distinct from target->>'type'/);
  assert.match(migration, /current_uuid is distinct from \(target->>'uuid'\)::bigint/);
  assert.match(migration, /current_uuid is distinct from \(repair->>'uuid'\)::bigint/);
  assert.match(migration, /md5\(current_description\) = repair->>'after'/);
  assert.match(migration, /md5\(current_description\) is distinct from repair->>'before'/);
  assert.match(migration, /type = 'spell' and ref_id = \(repair->>'id'\)::bigint and status->>'state' = 'PENDING'/);
  assert.ok(
    migration.indexOf("status->>'state' = 'PENDING'") < migration.indexOf("md5(current_description) = repair->>'after'")
  );
  assert.match(migration, /md5\(corrected\) is distinct from repair->>'after'/);
  assert.match(migration, /where id = \(repair->>'id'\)::bigint and description = current_description/);
  assert.match(migration, /get diagnostics changed_rows = row_count/);
  assert.doesNotMatch(migration, /set (heightened|meta_data|uuid|traits|rank|cast)\s*=/);
  assert.deepEqual(requirements[migrationName], {
    check: 'war-of-immortals-spell-reference-links.sql',
    order: 'before-functions',
  });
  assert.match(release, /count\(\*\) = 7/);
  assert.match(release, /count\(\*\) = 9/);
});
