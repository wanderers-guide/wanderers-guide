import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { readContentRows } from './operation-test-harness.mjs';

const sql = await readFile(
  new URL('../../supabase/migrations/20260927250000_treasure_vault_dragonprism_links.sql', import.meta.url),
  'utf8'
);

const links = new Map([
  ['Demoralize', '[Demoralize](link_action_19624)'],
  ['Gouging Claw', '[Gouging Claw](link_spell_4645)'],
  ['Puff of Poison', '[Puff of Poison](link_spell_6760)'],
  ['Breathe Fire', '[Breathe Fire](link_spell_4423)'],
  ['Fear', '[Fear](link_spell_4616)'],
  ['Acid Arrow', '[Acid Arrow](link_spell_6347)'],
  ['Resist Energy', '[Resist Energy](link_spell_4801)'],
  ['Lightning Bolt', '[Lightning Bolt](link_spell_4700)'],
  ['Fly', '[Fly](link_spell_4628)'],
  ['Reflective Scales', '[Reflective Scales](link_spell_6197)'],
  ['Cone of Cold', 'Cone of Cold'],
  ['Summon Dragon', '[Summon Dragon](link_spell_4869)'],
  ['Dragon Form', '[Dragon Form](link_spell_4583)'],
]);

const md5 = (text) => createHash('md5').update(text).digest('hex');
const render = (text) => renderToStaticMarkup(React.createElement(Markdown, { remarkPlugins: [remarkGfm] }, text));

test('Dragonprism Staff escaped tokens render as content links without changing its spell list', async () => {
  const [{ row: staff }, { row: greater }] = await readContentRows([
    { table: 'item', id: 11940 },
    { table: 'item', id: 11939 },
  ]);
  assert.equal(staff.name, 'Dragonprism Staff');
  assert.equal(staff.content_source_id, 16);
  assert.equal(staff.uuid, '982148341471611');
  assert.equal(md5(staff.description), 'b4b3e5ee7a8b92e7eea230368d3571f3');
  assert.match(render(staff.description), /\[\[Demoralize\]\]/);

  let corrected = staff.description;
  for (const [name, replacement] of links) {
    corrected = corrected.replaceAll(`\\[\\[${name}\\]\\]`, replacement);
    if (replacement !== name) assert.ok(greater.description.includes(replacement));
  }
  assert.equal(md5(corrected), '8098f54e420d89eadfb852aae690b8c3');
  assert.doesNotMatch(corrected, /\\\[\\\[/);
  assert.match(corrected, /\*\*5th\*\* Cone of Cold, \[Summon Dragon\]\(link_spell_4869\)/);
  assert.doesNotMatch(render(corrected), /\[\[/);
  assert.match(render(corrected), /href="link_action_19624"/);
  assert.match(render(corrected), /href="link_spell_4645"/);

  assert.match(sql, /where type = 'item' and ref_id = 11940 and status->>'state' = 'PENDING'/);
  assert.match(sql, /set description = corrected/);
  assert.match(sql, /8098f54e420d89eadfb852aae690b8c3/);
});

test('Dragonprism Staff links point to the intended existing content', async () => {
  const targets = new Map([
    [4645, 'Gouging Claw'],
    [6760, 'Puff of Poison'],
    [4423, 'Breathe Fire'],
    [4616, 'Fear'],
    [6347, 'Acid Arrow'],
    [4801, 'Resist Energy'],
    [4700, 'Lightning Bolt'],
    [4628, 'Fly'],
    [6197, 'Reflective Scales (legacy)'],
    [4869, 'Summon Dragon'],
    [4583, 'Dragon Form'],
  ]);
  const rows = await readContentRows([
    { table: 'ability_block', id: 19624 },
    ...[...targets.keys()].map((id) => ({ table: 'spell', id })),
  ]);
  assert.equal(rows.find(({ table }) => table === 'ability_block')?.row.name, 'Demoralize');
  for (const { table, row } of rows.filter(({ table }) => table === 'spell')) {
    assert.equal(table, 'spell');
    assert.equal(row.name, targets.get(row.id));
  }
});
