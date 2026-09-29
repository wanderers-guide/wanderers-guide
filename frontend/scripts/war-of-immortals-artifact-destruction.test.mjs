import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ItemSchema } from '../src/schemas/content.ts';
import { readContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260929090000_war_of_immortals_artifact_destruction.sql', import.meta.url),
  'utf8'
);
const patches = JSON.parse(migration.split('$patches$')[1]);
const rows = await readContentRows(patches.map(({ id }) => ({ table: 'item', id })));
const oldHeading = '**\n\n* * *\n\nDestruction**';
const newHeading = '* * *\n\n**Destruction**';

test('five War artifacts present destruction conditions as descriptions', () => {
  assert.deepEqual(
    patches.map(({ id, kind }) => ({ id, kind })),
    [
      { id: 16928, kind: 'heading' },
      { id: 16929, kind: 'heading' },
      { id: 16930, kind: 'heading' },
      { id: 17101, kind: 'craft' },
      { id: 17102, kind: 'craft' },
    ]
  );
  const originals = rows.map(({ row }) => structuredClone(row));
  for (const patch of patches) {
    const original = rows.find(({ row }) => row.id === patch.id).row;
    const updated = structuredClone(original);
    assert.equal(original.content_source_id, 400);
    assert.equal(original.name, patch.name);
    assert.equal(original.meta_data.source.url, patch.url);
    if (patch.kind === 'heading') {
      assert.equal(original.description.split(oldHeading).length - 1, 1);
      assert.equal(original.craft_requirements, '');
      updated.description = original.description.replace(oldHeading, newHeading);
    } else {
      assert.equal(original.craft_requirements, patch.destruction);
      assert.ok(!original.description.includes('**Destruction**'));
      updated.description = `${original.description}\n\n${newHeading} ${patch.destruction}`;
      updated.craft_requirements = '';
    }
    assert.equal(updated.description.split('**Destruction**').length - 1, 1);
    assert.ok(!updated.description.includes(oldHeading));
    const section = updated.description.slice(updated.description.lastIndexOf('\n\n* * *'));
    const html = renderToStaticMarkup(createElement(Markdown, { remarkPlugins: [remarkGfm] }, section));
    assert.match(html, /<hr\s*\/?>/);
    assert.match(html, /<strong>Destruction<\/strong>/);
    assert.equal(ItemSchema.safeParse(updated).success, true);
    const expected = structuredClone(original);
    expected.description = updated.description;
    if (patch.kind === 'craft') expected.craft_requirements = '';
    assert.deepEqual(updated, expected);
  }
  assert.deepEqual(
    rows.map(({ row }) => row),
    originals,
    'source and saved item snapshots are not mutated'
  );
  assert.match(migration, /status->>'state' = 'PENDING'/);
  assert.match(migration, /item_row\.meta_data #>> '\{source,url\}' is distinct from patch->>'url'/);
});
