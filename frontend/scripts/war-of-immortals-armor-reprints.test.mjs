import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import uploadUtils from '../../supabase/functions/_shared/upload-utils.ts';
import { readContentRows } from './operation-test-harness.mjs';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';

const { uniqueId } = uploadUtils;

const migration = await readFile(
  new URL('../../supabase/migrations/20260928000000_war_of_immortals_armor_reprints.sql', import.meta.url),
  'utf8'
);
const index = await readFile(new URL('../../supabase/release/war-of-immortals-index.sql', import.meta.url), 'utf8');
const release = await readFile(new URL('../../supabase/release/war-of-immortals.sql', import.meta.url), 'utf8');

const armors = [
  {
    id: 12145,
    name: 'Lattice Armor',
    uuid: '6101547865815677',
    warUuid: 1142536405766694,
    tvUrl: 'https://2e.aonprd.com/Armor.aspx?ID=67',
    warUrl: 'https://2e.aonprd.com/Armor.aspx?ID=54',
    price: 6,
    descriptionMd5: '5c18ad68c44d03df372627399262aa81',
  },
  {
    id: 12236,
    name: 'Niyaháat',
    uuid: '476041034844908',
    warUuid: 5866771262234991,
    tvUrl: 'https://2e.aonprd.com/Armor.aspx?ID=71',
    warUrl: 'https://2e.aonprd.com/Armor.aspx?ID=55',
    price: 5,
    descriptionMd5: 'baff9d0c71cdfb04254ee9c8ca068e62',
  },
  {
    id: 12366,
    name: 'Sankeit',
    uuid: '8906569033590767',
    warUuid: 3406841990572783,
    tvUrl: 'https://2e.aonprd.com/Armor.aspx?ID=74',
    warUrl: 'https://2e.aonprd.com/Armor.aspx?ID=53',
    price: 5,
    descriptionMd5: '80486dabc8d4d955181faac119e1dff2',
  },
];

test('War armor copies use source-specific identities and leave Treasure Vault records intact', async () => {
  const rows = await readContentRows(armors.map(({ id }) => ({ table: 'item', id })));
  const sources = await readContentRows([
    { table: 'content_source', id: 16 },
    { table: 'content_source', id: 400 },
  ]);
  const treasureVault = sources.find(({ row }) => row.id === 16).row;
  const war = sources.find(({ row }) => row.id === 400).row;
  assert.equal(treasureVault.name, 'Treasure Vault');
  assert.equal(war.name, 'War of Immortals');
  assert.ok(!war.required_content_sources.includes(16));
  assert.equal(new Set(armors.map(({ warUuid }) => warUuid)).size, 3);

  for (const armor of armors) {
    const row = rows.find(({ row: item }) => item.id === armor.id).row;
    assert.equal(row.name, armor.name);
    assert.equal(row.content_source_id, 16);
    assert.equal(row.uuid, armor.uuid);
    if (armor.name === 'Sankeit') {
      assertReviewedTransition(row.group, 'WEAPON', 'ARMOR', 'Sankeit armor classification');
    } else {
      assert.equal(row.group, 'ARMOR');
    }
    if (armor.id === 12145) {
      assertReviewedTransition(row.price, { gp: 6 }, { gp: 9 }, 'Lattice Armor price');
    } else {
      assert.equal(row.price.gp, armor.price);
    }
    assert.equal(row.meta_data.source.url, armor.tvUrl);
    assert.equal(createHash('md5').update(row.description).digest('hex'), armor.descriptionMd5);
    assert.equal(uniqueId(row.name, 'item', row.level, 400), armor.warUuid);
    assert.match(migration, new RegExp(String(armor.warUuid)));
    assert.match(migration, new RegExp(armor.warUrl.replaceAll('?', '\\?')));
    assert.match(index, new RegExp(String(armor.warUuid)));
    assert.match(index, new RegExp(armor.warUrl.replaceAll('?', '\\?')));
  }
});

test('armor insert rejects drift and pending edits, and does not modify saved items', () => {
  assert.match(migration, /md5\(tv_entry\.description\) is distinct from expected_armor\.description_md5/);
  assert.match(migration, /tv_entry\."group" is distinct from 'ARMOR'/);
  assert.match(migration, /tv_entry\.price::jsonb is distinct from jsonb_build_object/);
  assert.match(migration, /status->>'state' = 'PENDING'/);
  assert.ok(migration.indexOf('if existing_count = 3 then') < migration.indexOf('for expected_armor in'));
  assert.match(migration, /existing_count <> 0/);
  assert.match(migration, /md5\(actual\.description\) is distinct from expected\.description_md5/);
  assert.match(migration, /data->>'name' in \(select name from pg_temp\.war_armor_reprint_spec\)/);
  assert.match(migration, /insert into public\.item/);
  assert.doesNotMatch(migration, /update public\.(item|character|creature)/);
  assert.match(index, /count\(\*\) = 472 from war_index_expected/);
  assert.doesNotMatch(index, /war-index-tv-armor-exceptions/);
  assert.match(release, /select 'war-armor-reprints'/);
  assert.match(release, /md5\(actual\.description\) is distinct from expected\.description_md5/);
});
