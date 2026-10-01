import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SpellSchema } from '../src/schemas/content.ts';
import { readContentRows } from './operation-test-harness.mjs';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';

const migrationName = '20261001000000_war_of_immortals_spell_emphasis.sql';
const migration = await readFile(new URL(`../../supabase/migrations/${migrationName}`, import.meta.url), 'utf8');
const release = await readFile(
  new URL('../../supabase/release/war-of-immortals-spell-emphasis.sql', import.meta.url),
  'utf8'
);
const requirements = JSON.parse(
  await readFile(new URL('../../supabase/release/requirements.json', import.meta.url), 'utf8')
);
const [{ row }] = await readContentRows([{ table: 'spell', id: 7282 }]);
const before = '_Flash of Brilliance Arcanotheign_';
const after = '_Flash of Brilliance_ Arcanotheign';
const beforeMd5 = 'a1b1f5454184cb6f2e20feb77ff608b7';
const afterMd5 = '0a761e733db000059b4ffb760bff3e98';
const md5 = (value) => createHash('md5').update(value).digest('hex');
const count = (value, phrase) => value.split(phrase).length - 1;
const render = (value) => renderToStaticMarkup(createElement(Markdown, { remarkPlugins: [remarkGfm] }, value));

/** Accept both the pre-migration dump and a refreshed post-migration dump. */
function reviewedDescription(description) {
  const state = assertReviewedTransition(md5(description), beforeMd5, afterMd5, 'Beseech Arcanotheign text');
  if (state === 'after') return description;
  assert.equal(count(description, before), 1);
  assert.equal(count(description, after), 0);
  return description.replace(before, after);
}

test('Beseech Arcanotheign changes only the italic boundary in a valid full spell row', () => {
  assert.equal(row.id, 7282);
  assert.equal(row.name, 'Beseech Arcanotheign');
  assert.equal(row.uuid, '4591751933917325');
  assert.equal(row.content_source_id, 400);
  assert.deepEqual(row.meta_data.source, {
    url: 'https://2e.aonprd.com/MythicSpells.aspx?ID=2153',
    book: 'War of Immortals',
    page: '154',
  });

  const proposed = structuredClone(row);
  proposed.description = reviewedDescription(row.description);
  assert.equal(md5(proposed.description), afterMd5);
  assert.equal(reviewedDescription(proposed.description), proposed.description);
  assert.equal(count(proposed.description, before), 0);
  assert.equal(count(proposed.description, after), 1);
  assert.ok(SpellSchema.safeParse(proposed).success);
  assert.deepEqual({ ...proposed, description: row.description }, row);
  assert.equal(proposed.description.split('**Depart**')[0], row.description.split('**Depart**')[0]);
});

test('rendered emphasis ends before Arcanotheign without changing visible prose', () => {
  const proposed = reviewedDescription(row.description);
  const beforeText = proposed.replace(after, before);
  const oldHtml = render(beforeText);
  const newHtml = render(proposed);
  assert.match(oldHtml, /<em>Flash of Brilliance Arcanotheign<\/em>/);
  assert.match(newHtml, /<em>Flash of Brilliance<\/em> Arcanotheign/);
  assert.doesNotMatch(newHtml, /<em>Flash of Brilliance Arcanotheign<\/em>/);
  assert.equal(newHtml.replaceAll(/<\/?em>/g, ''), oldHtml.replaceAll(/<\/?em>/g, ''));
});

test('guarded migration and release check reject drift while permitting reviewed replay', () => {
  assert.match(migration, /from public\.spell where id = 7282 for update/);
  assert.match(migration, /current_uuid is distinct from 4591751933917325/);
  assert.match(migration, /current_source is distinct from 400/);
  assert.match(migration, /current_metadata #>> '\{source,book\}' is distinct from 'War of Immortals'/);
  assert.match(migration, /current_metadata #>> '\{source,page\}' is distinct from '154'/);
  assert.match(
    migration,
    /current_metadata #>> '\{source,url\}' is distinct from 'https:\/\/2e\.aonprd\.com\/MythicSpells\.aspx\?ID=2153'/
  );
  assert.match(migration, /type = 'spell' and ref_id = 7282 and status->>'state' = 'PENDING'/);
  assert.ok(
    migration.indexOf("status->>'state' = 'PENDING'") < migration.indexOf('md5(current_description) = after_md5')
  );
  assert.match(migration, /md5\(current_description\) is distinct from before_md5/);
  assert.match(migration, /md5\(corrected\) is distinct from after_md5/);
  assert.match(migration, /where id = 7282 and description = current_description/);
  assert.match(migration, /get diagnostics changed_rows = row_count/);
  assert.doesNotMatch(migration, /set (meta_data|uuid|rank|cast|traits|heightened)\s*=/);
  assert.deepEqual(requirements[migrationName], {
    check: 'war-of-immortals-spell-emphasis.sql',
    order: 'before-functions',
  });
  assert.match(release, /count\(\*\) = 1/);
  assert.match(release, new RegExp(afterMd5));
});
