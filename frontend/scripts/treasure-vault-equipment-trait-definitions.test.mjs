import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { build } from 'esbuild';
import { TraitSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261002080000_treasure_vault_equipment_trait_definitions.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-equipment-trait-definitions.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$traits$')[1]);
const rows = await readContentRows([
  ...spec.blocks.map(({ id }) => ({ table: 'trait', id })),
  ...spec.dependencies.map(({ table, id }) => ({ table, id })),
]);
const tuple = (row) => ({ description: row.description, metadata: row.meta_data });

/** Match the reviewed domain without conflating COPY and PostgreSQL timestamp formatting. */
function anchor(row) {
  const value = {
    ...row,
    uuid: String(row.uuid),
    created_at: row.created_at.replace(' ', 'T').replace(/\+00$/, '+00:00'),
  };
  for (const key of ['description', 'meta_data', 'updated_at', 'search_tsv']) delete value[key];
  return value;
}

/** Fail closed on all unknown tuples, then apply the two approved leaves to a clone. */
function apply(input) {
  assert.equal(input.length, 9);
  assert.equal(new Set(input.map(({ id }) => id)).size, 9);
  return spec.blocks.map((patch) => {
    const row = input.find(({ id }) => id === patch.id);
    assert.ok(row);
    assert.deepEqual(anchor(row), patch.anchor);
    assert.ok([patch.before, patch.after].some((expected) => JSON.stringify(tuple(row)) === JSON.stringify(expected)));
    const next = {
      ...structuredClone(row),
      description: patch.after.description,
      meta_data: structuredClone(patch.after.metadata),
    };
    TraitSchema.parse(next);
    return next;
  });
}

const originals = spec.blocks.map((patch) => {
  const row = structuredClone(
    rows.find((candidate) => candidate.table === 'trait' && candidate.row.id === patch.id)?.row
  );
  assert.ok(row);
  row.description = patch.before.description;
  row.meta_data = patch.before.metadata;
  return row;
});
const proposed = apply(originals);
let engine;
let renderTrait;

before(async () => {
  engine = await createOperationEngine({ renderRichText: true });
  const frontend = new URL('..', import.meta.url).pathname;
  const result = await build({
    absWorkingDir: frontend,
    stdin: {
      contents: `import React from 'react';
        import { renderToStaticMarkup } from 'react-dom/server';
        import { MantineProvider, DEFAULT_THEME } from '@mantine/core';
        import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
        import { TraitDrawerContent } from '@drawers/types/TraitDrawer';
        export function renderTrait(trait) {
          const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
          try { return renderToStaticMarkup(React.createElement(MantineProvider,
            { theme: { colors: { guide: DEFAULT_THEME.colors.blue } } },
            React.createElement(QueryClientProvider, { client },
            React.createElement(TraitDrawerContent, { data: { trait } })))); }
          finally { client.clear(); }
        }`,
      resolveDir: frontend,
      loader: 'tsx',
    },
    tsconfig: `${frontend}/tsconfig.json`,
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    banner: {
      js: `import { createRequire } from 'node:module'; const require = createRequire(${JSON.stringify(`${frontend}/package.json`)});`,
    },
    define: { 'import.meta.env': JSON.stringify({ VITE_ENV: 'production' }) },
    plugins: [
      {
        name: 'offline-trait-content',
        setup(plugin) {
          plugin.onResolve({ filter: /^@content\/content-store$/ }, () => ({ path: 'content', namespace: 'fixture' }));
          plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
            contents: `export function getCachedContent(){return [];} export function getContentFast(){return [];} export function getDefaultSources(){return [];} export function getDefaultSourcesKey(){return 'trait-test';} export async function fetchContent(){return [];} export async function fetchContentById(){return null;} export async function fetchContentAll(){return [];} export async function fetchTraitByName(){return null;}`,
            loader: 'ts',
          }));
          plugin.onResolve({ filter: /^@utils\/notifications$/ }, () => ({
            path: 'notifications',
            namespace: 'notifications',
          }));
          plugin.onLoad({ filter: /.*/, namespace: 'notifications' }, () => ({
            contents: 'export function displayError() {}',
            loader: 'ts',
          }));
        },
      },
    ],
  });
  ({ renderTrait } = await import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
  ));
});
after(async () => engine?.cleanup());

test('nine existing qualifiers retain all identities and mechanics; only descriptions and authoritative citation metadata change', () => {
  assert.deepEqual(spec, JSON.parse(release.split('$traits$')[1]));
  assert.deepEqual(
    spec.blocks.map(({ id }) => id),
    [2873, 2881, 2887, 2890, 2892, 2895, 2896, 2898, 2904]
  );
  for (const [index, row] of proposed.entries()) {
    TraitSchema.parse(row);
    assert.deepEqual(
      { ...row, description: originals[index].description, meta_data: originals[index].meta_data },
      originals[index]
    );
    assert.equal(row.meta_data.source.book, 'Treasure Vault (Remastered)');
    assert.match(row.meta_data.source.url, /^https:\/\/2e\.aonprd\.com\/Traits\.aspx\?ID=(468|473|481|483|490)$/);
    assert.doesNotMatch(row.description, /No description|@UUID|\[\[|—/);
  }
  for (const row of proposed.filter(({ name }) => name.startsWith('Deflecting')))
    assert.match(row.description, /Hardness against the listed type of attack by 2/);
  for (const row of proposed.filter(({ name }) => name.startsWith('Integrated'))) {
    assert.match(row.description, /can't be removed/);
    assert.match(row.description, /prevents other \[attached\].*weapons/);
    assert.match(row.description, /martial weapon in the shield weapon group and requires one hand/);
    assert.match(row.description, /runes etched/);
    assert.match(row.description, /shield is broken, but if the shield is destroyed, so is the weapon/);
    assert.equal((row.description.match(/link_trait_3653/g) ?? []).length, 4);
  }
  for (const row of proposed.filter(({ name }) => name.startsWith('Shield Throw'))) {
    assert.match(row.description, /damage dice and type are the same as its shield bash/);
    assert.match(row.description, /Strength modifier to damage/);
    assert.match(row.description, /range increment/);
    assert.equal((row.description.match(/link_trait_1575/g) ?? []).length, 2);
  }
  assert.match(
    proposed.find(({ id }) => id === 2881).description,
    /minimum of 1 action, and you can't use the hand holding your shield to reload/
  );
});

test('the actual TraitDrawer and RichText change from empty fallback to complete printed definitions without extra notes', () => {
  for (const [index, row] of proposed.entries()) {
    assert.match(renderTrait(originals[index]), /No description given\./);
    const html = renderTrait(row);
    assert.doesNotMatch(html, /No description given\./);
    assert.match(
      html,
      new RegExp(
        row.description.startsWith('The equipment')
          ? 'equipment comes'
          : row.description.startsWith('This shield')
            ? 'This shield'
            : 'A (mechanism|shield)'
      )
    );
    if (row.name.startsWith('Integrated')) assert.match(html, /<a\b[^>]*>broken<\/a>/);
  }
});

test('every repeated indexed reference resolves by the real helper with the exact official table and subtype', () => {
  const dependencies = rows.filter((candidate) =>
    spec.dependencies.some(({ table, id }) => candidate.table === table && candidate.row.id === id)
  );
  engine.setFixtures(dependencies);
  for (const row of proposed)
    for (const match of row.description.matchAll(/\[([^\]]+)\]\(link_([a-z-]+)_(\d+)\)/g)) {
      const [, label, type, rawId] = match;
      const table = type === 'trait' ? 'trait' : 'ability_block';
      const target = dependencies.find((candidate) => candidate.table === table && candidate.row.id === Number(rawId));
      assert.ok(target);
      if (table === 'ability_block') assert.equal(target.row.type, type);
      assert.equal(engine.convertToHardcodedLink(type, target.row.name, label), match[0]);
    }
});

test('strict anchors, metadata nullability and coupled description/citation tuples reject all unreviewed drift and preserve replay', () => {
  assert.deepEqual(apply(proposed), proposed);
  for (const mutate of [
    (rows) => {
      rows[0].description = spec.blocks[0].after.description;
    },
    (rows) => {
      rows[0].meta_data = spec.blocks[0].after.metadata;
    },
    (rows) => {
      rows[0].meta_data = {};
    },
    (rows) => {
      rows[0].name = 'Adjusted alternative';
    },
    (rows) => {
      rows[0].uuid = String(Number(rows[0].uuid) + 1);
    },
    (rows) => {
      rows[0].content_source_id = 3;
    },
    (rows) => {
      rows[0].created_at = '2026-10-02T00:00:00+00:00';
    },
    (rows) => {
      rows[0].meta_data = { source: { ...spec.blocks[0].after.metadata.source, page: '217' } };
    },
  ]) {
    const changed = structuredClone(originals);
    mutate(changed);
    assert.throws(() => apply(changed));
  }
  assert.throws(() => apply(originals.slice(0, 8)));
  assert.throws(() => apply([...originals.slice(0, 8), originals[0]]));
});

test('SQL uses child-first locks, conservative pending identities, complete tuple validation, full-row CAS and final readback', () => {
  const body = migration.split('$traits$')[2];
  assert.match(body, /lock table public\.content_update in share mode/);
  assert.ok(body.indexOf('public.trait where id in') < body.indexOf('public.content_source s'));
  assert.match(body, /coalesce\(u\.status->>'state','PENDING'\) not in \('APPROVED','REJECTED'\)/);
  assert.match(body, /complete tuple changed/);
  assert.match(body, /captured CAS failed/);
  assert.match(body, /final owner drift/);
  assert.match(body, /final dependency drift/);
  assert.match(body, /final source drift/);
  assert.match(body, /final curator drift/);
  assert.doesNotMatch(
    body,
    /insert into|delete from|update public\.(character|item|creature|ability_block|content_source)/i
  );
  assert.match(release, /is true,false/);
});
