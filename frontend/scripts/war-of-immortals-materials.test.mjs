import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { uniqueId } from '../../supabase/functions/_shared/upload-utils.ts';
import { readContentRows } from './operation-test-harness.mjs';

const sql = await readFile(
  new URL('../../supabase/migrations/20260927140000_war_of_immortals_materials.sql', import.meta.url),
  'utf8'
);
const materials = JSON.parse(sql.split('$materials$')[1]);

const reviewed = new Map([
  ['Dreamweb Object (Standard-Grade)', [5, 150, 'GENERAL', 215, 3517]],
  ['Dreamweb Object (High-Grade)', [14, 3000, 'GENERAL', 215, 3517]],
  ['Sloughstone', [0, null, 'MATERIAL', 208, 3515]],
  ['Sloughstone Chunk', [0, 500, 'GENERAL', 208, 3515]],
  ['Sloughstone Ingot', [0, 5000, 'GENERAL', 208, 3515]],
  ['Sloughstone Object (Standard-Grade)', [8, 350, 'GENERAL', 208, 3515]],
  ['Sloughstone Object (High-Grade)', [16, 6000, 'GENERAL', 208, 3515]],
]);

test('the seven material rows match the published levels, prices, citations, and WG IDs', () => {
  assert.equal(materials.length, 7);
  assert.deepEqual(new Set(materials.map(({ name }) => name)), new Set(reviewed.keys()));
  assert.deepEqual(new Set(materials.map(({ uuid }) => uuid)).size, 7);
  for (const material of materials) {
    const [level, gp, itemGroup, page, aonId] = reviewed.get(material.name);
    assert.equal(material.level, level, material.name);
    assert.equal(material.gp, gp, material.name);
    assert.equal(material.item_group, itemGroup, material.name);
    assert.equal(material.page, String(page), material.name);
    assert.equal(material.url, `https://2e.aonprd.com/Equipment.aspx?ID=${aonId}`, material.name);
    assert.equal(material.uuid, uniqueId(material.name, 'item', level, 400), material.name);
    assert.equal(typeof material.description, 'string');
    if (material.name.includes('Object')) assert.match(material.description, /per Bulk/);
  }

  const sloughstone = materials.find(({ name }) => name === 'Sloughstone');
  assert.match(sloughstone.description, /Craft an item from sloughstone by 4/);
  assert.match(sloughstone.description, /Structures can't be made from sloughstone/);
  for (const values of ['8 | 36 | 18', '11 | 48 | 24', '12 | 50 | 25', '15 | 62 | 31']) {
    assert.ok(sloughstone.description.includes(values));
  }
});

test('the material insert leaves unspecified Bulk blank and rejects drift or curator conflicts', () => {
  assert.match(sql, /select material\.name, null, material\.level/);
  assert.match(sql, /case when material\.gp is null then '\{\}'::json/);
  assert.match(sql, /'RARE', material\.description/);
  assert.match(sql, /array\[1533\]::bigint\[\]/);
  assert.match(sql, /'\{\}'::json\[\], 400, '1\.0'/);
  assert.match(sql, /status->>'state' = 'PENDING'/);
  assert.match(sql, /if existing_count = 7 then/);
  assert.match(sql, /is distinct from to_jsonb\(expected\)/);
  assert.match(sql, /elsif existing_count <> 0 then/);
});

test('each purchasable material retains its parent material rules in its own drawer', async () => {
  const rows = (await readContentRows([{ table: 'item', sourceIds: [400] }])).map(({ row }) => row);
  const dreamweb = rows.find(({ id }) => id === 17477);
  const sloughstone = materials.find(({ name }) => name === 'Sloughstone');

  assert.match(sql, /description = \(select description from public\.item where id = 17477\)/);
  assert.match(
    sql,
    /description = \(select description from pg_temp\.war_expected_materials where name = 'Sloughstone'\)/
  );
  assert.match(sql, /child\.name in \(\s*'Sloughstone Chunk', 'Sloughstone Ingot'/);
  assert.match(sql, /child\.name like 'Sloughstone Object%'/);
  assert.match(dreamweb.description, /poison.*resistance/);
  assert.match(sloughstone.description, /Sloughstone Items/);
});

test('the checked-in War item corpus has at most one copy of each reviewed material', async () => {
  const rows = (await readContentRows([{ table: 'item', sourceIds: [400] }])).map(({ row }) => row);
  const dreamweb = rows.find(({ name }) => name === 'Dreamweb');
  assert.equal(dreamweb?.meta_data?.source?.url, 'https://2e.aonprd.com/Equipment.aspx?ID=3517');
  for (const material of materials) {
    const matches = rows.filter(({ name, uuid }) => name === material.name || uuid === material.uuid);
    assert.ok(matches.length <= 1, `${material.name} must not be duplicated`);
    if (matches.length === 0) continue;
    const [row] = matches;
    assert.equal(row.name, material.name);
    assert.equal(row.uuid, material.uuid);
    assert.equal(row.level, material.level);
    assert.equal(row.group, material.item_group);
    assert.equal(row.bulk, null);
    assert.deepEqual(row.price, material.gp === null ? {} : { gp: material.gp });
    assert.deepEqual(row.traits, [1533]);
    assert.deepEqual(row.operations, []);
    assert.deepEqual(row.meta_data.source, {
      url: material.url,
      book: 'War of Immortals',
      page: material.page,
    });
  }
});
