import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { before, test } from 'node:test';
import uploadUtils from '../../supabase/functions/_shared/upload-utils.ts';
import { ItemSchema } from '../src/schemas/content.ts';
import { readContentRows } from './operation-test-harness.mjs';

const { uniqueId } = uploadUtils;
const migration = await readFile(
  new URL('../../supabase/migrations/20261001080000_treasure_vault_lattice_price.sql', import.meta.url),
  'utf8'
);
const oldMigration = await readFile(
  new URL('../../supabase/migrations/20260928000000_war_of_immortals_armor_reprints.sql', import.meta.url),
  'utf8'
);
const predicate = await readFile(
  new URL('../../supabase/release/treasure-vault-lattice-price.sql', import.meta.url),
  'utf8'
);
const oldPredicate = await readFile(new URL('../../supabase/release/war-of-immortals.sql', import.meta.url), 'utf8');
const patches = JSON.parse(migration.split('$patches$')[1]);
const expected = JSON.parse(predicate.split('$expected$')[1]);
const md5 = (value) => createHash('md5').update(value).digest('hex');
const oldSpecifications = [
  ...oldMigration.matchAll(
    /\((\d+), '([^']+)', (\d+), (\d+),\s*'([^']+)', '([^']+)',\s*'([a-f0-9]+)', '([^']+)', (\d+), '([^']+)', '([^']+)', (\d+), (\d+), (-?\d+), (-?\d+), (\d+), ('\{\}'|array\[[\d,]+\])::bigint\[\]\)/g
  ),
].map((match) => ({
  tvId: Number(match[1]),
  name: match[2],
  tvUuid: match[3],
  warUuid: match[4],
  tvUrl: match[5],
  warUrl: match[6],
  descriptionMd5: match[7],
  bulk: match[8],
  price: { gp: Number(match[9]) },
  armor: {
    category: match[10],
    group: match[11],
    ac_bonus: Number(match[12]),
    dex_cap: Number(match[13]),
    check_penalty: Number(match[14]),
    speed_penalty: Number(match[15]),
    strength: Number(match[16]),
  },
  traits: match[17] === "'{}'" ? [] : match[17].slice(6, -1).split(',').map(Number),
}));
let originals;
let sources;
let receiptItems;

/** Recognize only the complete original/corrected Lattice price objects, never numeric coercions. */
function oldPriceMatches(item, specification) {
  return (
    isDeepStrictEqual(item.price, specification.price) ||
    (specification.tvId === 12145 && isDeepStrictEqual(item.price, { gp: 9 }))
  );
}

/** Check the unchanged old insert/replay fields around its narrowly superseded price leaf. */
function assertOldReviewed(item, specification, isWar) {
  assert.deepEqual(
    [item.name, String(item.uuid), item.content_source_id, item.group, item.level, item.rarity, item.size, item.bulk],
    [
      specification.name,
      isWar ? specification.warUuid : specification.tvUuid,
      isWar ? 400 : 16,
      'ARMOR',
      0,
      'COMMON',
      'MEDIUM',
      specification.bulk,
    ]
  );
  if (!isWar) assert.equal(item.id, specification.tvId);
  assert.ok(oldPriceMatches(item, specification), 'unreviewed old price');
  assert.deepEqual(item.traits, specification.traits);
  assert.equal(md5(item.description), specification.descriptionMd5);
  if (isWar) {
    assert.deepEqual(item.meta_data.source, { url: specification.warUrl, book: 'War of Immortals', page: '146' });
  } else {
    assert.equal(item.meta_data.source.url, specification.tvUrl);
    assert.equal(item.meta_data.source.book, 'Treasure Vault');
  }
  for (const [key, value] of Object.entries(specification.armor)) {
    assert.ok(item.meta_data[key] != null, `missing old armor ${key}`);
    if (typeof value === 'number') assert.equal(Number(item.meta_data[key]), value);
    else assert.equal(item.meta_data[key], value);
  }
  assert.equal(item.operations, null);
}

/** Rehearse the existing INSERT's full-row copy without fixing or guessing numeric reprint IDs. */
function replayOld(items, { pending = [], nextId = 990080 } = {}) {
  const result = structuredClone(items);
  const matches = result.filter((item) =>
    oldSpecifications.some(
      (specification) =>
        String(item.uuid) === specification.warUuid ||
        (item.content_source_id === 400 && item.name === specification.name) ||
        item.meta_data?.source?.url === specification.warUrl
    )
  );
  assert.ok(
    !pending.some(
      (entry) =>
        entry.type === 'item' &&
        entry.state === 'PENDING' &&
        (oldSpecifications.some((specification) => entry.ref_id === specification.tvId) ||
          (entry.content_source_id === 400 &&
            (matches.some((item) => item.id === entry.ref_id) ||
              oldSpecifications.some((specification) => entry.name === specification.name))))
    ),
    'pending old reprint'
  );
  assert.ok(matches.length === 0 || matches.length === 3, 'partially present reprints');
  if (matches.length === 3) {
    for (const specification of oldSpecifications) {
      const item = matches.find((row) => String(row.uuid) === specification.warUuid && row.content_source_id === 400);
      assert.ok(item, 'missing canonical old reprint');
      assertOldReviewed(item, specification, true);
    }
    return result;
  }
  for (const specification of oldSpecifications) {
    const original = result.find((row) => row.id === specification.tvId);
    assert.ok(original, 'missing original armor');
    assertOldReviewed(original, specification, false);
    result.push({
      ...structuredClone(original),
      id: nextId++,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
      uuid: specification.warUuid,
      content_source_id: 400,
      meta_data: {
        ...structuredClone(original.meta_data),
        source: { url: specification.warUrl, book: 'War of Immortals', page: '146' },
      },
    });
  }
  return result;
}

/** Match every new reviewed identity/citation/armor field while allowing metadata siblings to remain intact. */
function assertReviewed(item, patch) {
  if ('id' in patch) assert.equal(item.id, patch.id, 'original numeric identity');
  assert.deepEqual(
    [String(item.uuid), item.content_source_id],
    [patch.uuid, patch.source],
    'canonical source identity'
  );
  for (const key of [
    'name',
    'level',
    'group',
    'rarity',
    'size',
    'bulk',
    'hands',
    'usage',
    'craft_requirements',
    'availability',
    'version',
    'traits',
  ]) {
    assert.deepEqual(item[key], patch[key], `unreviewed ${key}`);
  }
  assert.equal(item.operations, null, 'unreviewed operations');
  assert.equal(md5(item.description), patch.description_md5, 'unreviewed description');
  assert.ok(item.meta_data && typeof item.meta_data === 'object' && !Array.isArray(item.meta_data), 'metadata object');
  assert.deepEqual(item.meta_data.source, patch.citation, 'unreviewed citation');
  for (const [key, value] of Object.entries(patch.armor)) {
    assert.deepEqual(item.meta_data[key], value, `unreviewed armor ${key}`);
  }
}

/** Mirror the price-only CAS and dynamic UUID/source resolution on complete local clones. */
function repair(items, { pending = [], sourceRows = sources } = {}) {
  for (const [id, name] of [
    [16, 'Treasure Vault'],
    [400, 'War of Immortals'],
  ]) {
    assert.equal(
      sourceRows.filter(
        (row) => row.id === id && row.name === name && row.user_id === null && row.is_published === true
      ).length,
      1,
      'official published source'
    );
  }
  const result = structuredClone(items);
  for (const patch of patches) {
    const matches = result.filter(
      (row) =>
        String(row.uuid) === patch.uuid &&
        row.content_source_id === patch.source &&
        (!('id' in patch) || row.id === patch.id)
    );
    assert.equal(matches.length, 1, 'missing or duplicate canonical armor');
    const item = matches[0];
    assertReviewed(item, patch);
    assert.ok(
      isDeepStrictEqual(item.price, patch.before_price) || isDeepStrictEqual(item.price, patch.after_price),
      'unreviewed price object'
    );
    assert.ok(
      !pending.some(
        (entry) =>
          entry.type === 'item' &&
          entry.state === 'PENDING' &&
          (entry.ref_id === item.id || (entry.content_source_id === item.content_source_id && entry.name === item.name))
      ),
      'pending price repair'
    );
    item.price = structuredClone(patch.after_price);
  }
  return result;
}

/** Fail closed on either missing canonical row, any reviewed-field drift, or either non-final price. */
function passes(items, sourceRows = sources) {
  try {
    for (const entry of expected) {
      const matches = items.filter((row) => String(row.uuid) === entry.uuid && row.content_source_id === entry.source);
      assert.equal(matches.length, 1);
      assertReviewed(matches[0], entry);
      assert.deepEqual(matches[0].price, entry.price);
    }
    assert.equal(expected.length, 2);
    for (const [id, name] of [
      [16, 'Treasure Vault'],
      [400, 'War of Immortals'],
    ]) {
      assert.equal(
        sourceRows.filter(
          (row) => row.id === id && row.name === name && row.user_id === null && row.is_published === true
        ).length,
        1
      );
    }
    return true;
  } catch {
    return false;
  }
}

before(async () => {
  assert.equal(oldSpecifications.length, 3, 'read actual old INSERT specification');
  const rows = await readContentRows([
    ...oldSpecifications.map(({ tvId }) => ({ table: 'item', id: tvId })),
    { table: 'content_source', id: 16 },
    { table: 'content_source', id: 400 },
  ]);
  originals = oldSpecifications.map(({ tvId }) =>
    structuredClone(rows.find(({ table, row }) => table === 'item' && row.id === tvId).row)
  );
  // The existing predecessor migration classifies Sankeit before the unchanged reprint INSERT.
  const sankeit = originals.find(({ id }) => id === 12366);
  assert.ok(['WEAPON', 'ARMOR'].includes(sankeit.group));
  sankeit.group = 'ARMOR';
  sources = rows.filter(({ table }) => table === 'content_source').map(({ row }) => row);
  if (process.env.WG_TREASURE_VAULT_LATTICE_FIXTURE) {
    const receipt = JSON.parse(await readFile(process.env.WG_TREASURE_VAULT_LATTICE_FIXTURE, 'utf8'));
    assert.equal(receipt.read_only, true);
    receiptItems = receipt.rows.filter(({ content_type }) => content_type === 'item').map(({ row }) => row);
    assert.equal(receiptItems.length, 2);
  }
});

test('two canonical price patches retain complete cloned rows and resolve arbitrary reprint IDs', () => {
  assert.equal(patches.length, 2);
  assert.equal(patches[0].id, 12145);
  assert.ok(!('id' in patches[1]), 'War reprint does not pin an allocated numeric ID');
  for (const patch of patches) {
    assert.equal(String(uniqueId(patch.name, 'item', patch.level, patch.source)), patch.uuid);
    assert.deepEqual(patch.before_price, { gp: 6 });
    assert.deepEqual(patch.after_price, { gp: 9 });
  }
  for (const nextId of [23434, 990080]) {
    const copied = replayOld(originals, { nextId });
    const result = repair(copied);
    for (const [index, row] of result.entries()) {
      assert.ok(ItemSchema.safeParse(copied[index]).success, `full before schema ${row.id}`);
      assert.ok(ItemSchema.safeParse(row).success, `full after schema ${row.id}`);
      assert.deepEqual({ ...row, price: copied[index].price }, copied[index], `only price changed ${row.id}`);
    }
    assert.equal(result.find((row) => String(row.uuid) === patches[1].uuid).id, nextId);
    assert.deepEqual(repair(result), result, 'new price replay');
    assert.deepEqual(replayOld(result), result, 'old reprint replay after correction');
    assert.ok(passes(result));
  }
  if (receiptItems) {
    const result = repair(receiptItems);
    for (const [index, row] of result.entries()) {
      ItemSchema.parse(receiptItems[index]);
      ItemSchema.parse(row);
      assert.deepEqual({ ...row, price: receiptItems[index].price }, receiptItems[index]);
    }
    assert.ok(passes(result));
  }
});

test('old-dump copy6 then repair9, fresh9 replay, and TV9 first-copy9 preserve all other armors', () => {
  const old = originals.map((row) => (row.id === 12145 ? { ...row, price: { gp: 6 } } : row));
  const copied = replayOld(old);
  assert.equal(passes(copied), false, 'old compatibility is not final price verification');
  assert.deepEqual(
    copied.filter((row) => row.name === 'Lattice Armor').map(({ price }) => price),
    [{ gp: 6 }, { gp: 6 }]
  );
  const corrected = repair(copied);
  assert.deepEqual(
    corrected.filter((row) => row.name === 'Lattice Armor').map(({ price }) => price),
    [{ gp: 9 }, { gp: 9 }]
  );
  assert.deepEqual(repair(replayOld(corrected)), corrected, 'fresh final dump replays all');
  const tvNine = old.map((row) => (row.id === 12145 ? { ...row, price: { gp: 9 } } : row));
  const firstCopy = replayOld(tvNine, { nextId: 990090 });
  assert.deepEqual(firstCopy.find((row) => String(row.uuid) === patches[1].uuid).price, { gp: 9 });
  assert.deepEqual(repair(firstCopy), firstCopy);
  for (const row of corrected.filter((item) => item.name !== 'Lattice Armor')) {
    assert.deepEqual(
      row,
      copied.find((item) => item.id === row.id),
      'unrelated reprint preserved'
    );
  }
  assert.throws(
    () => replayOld(corrected.filter((row) => String(row.uuid) !== patches[1].uuid)),
    /partially present reprints/
  );
});

test('only complete numeric6/9 price objects are recognized, and all other armor prices remain exact', () => {
  const copied = replayOld(originals);
  for (const price of [null, {}, { gp: 6.01 }, { gp: 9.01 }, { gp: '6' }, { gp: '9' }, { gp: 9, cp: 0 }]) {
    for (const source of [16, 400]) {
      const drifted = copied.map((row) =>
        row.name === 'Lattice Armor' && row.content_source_id === source ? { ...row, price } : row
      );
      assert.throws(() => repair(drifted), /unreviewed price object/);
      assert.equal(passes(drifted), false);
      if (source === 400) assert.throws(() => replayOld(drifted), /unreviewed old price/);
      else
        assert.throws(() => replayOld(drifted.filter((row) => row.content_source_id !== 400)), /unreviewed old price/);
    }
  }
  const niyahaat = oldSpecifications.find(({ tvId }) => tvId === 12236);
  for (const gp of [6, 9]) {
    assert.equal(oldPriceMatches({ price: { gp } }, niyahaat), false, 'no broad other-armor known states');
  }
});

test('pending item proposals block bootstrap and both replay paths before changing caller data', () => {
  const copied = replayOld(originals);
  const corrected = repair(copied);
  for (const current of [copied, corrected]) {
    for (const item of current.filter((row) => row.name === 'Lattice Armor')) {
      const unchanged = structuredClone(current);
      const pending = [{ type: 'item', ref_id: item.id, content_source_id: item.content_source_id, state: 'PENDING' }];
      assert.throws(() => repair(current, { pending }), /pending price repair/);
      assert.throws(() => replayOld(current, { pending }), /pending old reprint/);
      assert.deepEqual(current, unchanged);
      assert.throws(
        () =>
          repair(current, {
            pending: [
              {
                type: 'item',
                ref_id: null,
                content_source_id: item.content_source_id,
                name: item.name,
                state: 'PENDING',
              },
            ],
          }),
        /pending price repair/
      );
    }
  }
  assert.throws(
    () =>
      replayOld(originals, {
        pending: [
          {
            type: 'item',
            ref_id: 12145,
            content_source_id: 16,
            state: 'PENDING',
          },
        ],
      }),
    /pending old reprint/
  );
});

test('new migration and strict release reject missing rows, NULL identities, citation and armor drift', () => {
  const corrected = repair(replayOld(originals));
  for (const source of [16, 400]) {
    const without = corrected.filter((row) => row.name !== 'Lattice Armor' || row.content_source_id !== source);
    assert.throws(() => repair(without), /missing or duplicate/);
    assert.equal(passes(without), false);
    for (const change of [
      { uuid: null },
      { name: 'Wrong title' },
      { level: 1 },
      { traits: [1527] },
      { operations: [] },
      { meta_data: null },
      { meta_data: {} },
      { meta_data: { ...corrected.find((row) => row.content_source_id === source).meta_data, source: {} } },
      { meta_data: { ...corrected.find((row) => row.content_source_id === source).meta_data, ac_bonus: 5 } },
    ]) {
      const drifted = corrected.map((row) =>
        row.name === 'Lattice Armor' && row.content_source_id === source ? { ...row, ...change } : row
      );
      assert.throws(() => repair(drifted));
      assert.equal(passes(drifted), false);
    }
  }
  for (const sourceRows of [
    sources.filter(({ id }) => id !== 400),
    sources.map((row) => (row.id === 400 ? { ...row, user_id: 'custom' } : row)),
    sources.map((row) => (row.id === 16 ? { ...row, is_published: false } : row)),
  ]) {
    assert.throws(() => repair(corrected, { sourceRows }), /official published source/);
    assert.equal(passes(corrected, sourceRows), false);
  }
});

test('SQL preserves bounded old guards and uses locks, pending-before-replay, and price-only CAS', () => {
  assert.match(oldMigration, /20261001080000 corrects Lattice to 9 gp/);
  assert.match(oldMigration, /lock table public\.content_update in share mode/);
  assert.ok(oldMigration.indexOf("where type = 'item'") < oldMigration.indexOf('if existing_count = 3 then'));
  assert.match(oldMigration, /case when expected\.tv_id = 12145 then/);
  assert.match(oldMigration, /case when expected_armor\.tv_id = 12145 then/);
  assert.match(oldMigration, /existing_count <> 0/);
  assert.match(oldMigration, /original\.price, original\.traits, original\.availability/);
  for (const field of ['name', 'level', 'rarity', 'size', 'bulk', 'traits']) {
    assert.ok(oldMigration.includes(`actual.${field === 'name' ? 'name' : field} is distinct from`));
  }
  assert.match(oldMigration, /md5\(actual\.description\) is distinct from expected\.description_md5/);
  assert.match(oldMigration, /actual\.operations is not null/);
  assert.match(oldPredicate, /case when expected\.war_uuid = 1142536405766694 then/);
  assert.match(
    oldPredicate,
    /else actual\.price::jsonb is distinct from jsonb_build_object\('gp', expected\.price_gp\) end/
  );
  assert.match(migration, /lock table public\.content_update in share mode/);
  assert.match(migration, /user_id is null and is_published is true order by id for update/);
  assert.match(
    migration,
    /where uuid = \(patch->>'uuid'\)::bigint and content_source_id = \(patch->>'source'\)::bigint/
  );
  assert.match(migration, /not \(patch \? 'id'\) or id = \(patch->>'id'\)::bigint\) for update/);
  assert.ok(migration.indexOf("where type = 'item'") < migration.indexOf('if item_row.price::jsonb is distinct from'));
  assert.match(migration, /item_row\.price::jsonb is distinct from patch->'before_price'/);
  assert.match(migration, /item_row\.price::jsonb is distinct from patch->'after_price'/);
  assert.match(migration, /price::jsonb is not distinct from item_row\.price::jsonb/);
  assert.match(migration, /meta_data is not distinct from item_row\.meta_data/);
  assert.equal((migration.match(/update public\.item/g) ?? []).length, 1);
  assert.match(migration, /update public\.item set price = patch->'after_price'/);
  assert.doesNotMatch(migration, /update public\.(character|inventory|content_update)/);
  assert.doesNotMatch(migration, /set (id|uuid|name|meta_data|operations|description)\s*=/);
  assert.match(predicate, /count\(\*\) = 2 and bool_and/);
  assert.match(predicate, /left join public\.item i on i\.uuid = e\.uuid and i\.content_source_id = e\.source/);
  assert.match(predicate, /i\.price::jsonb = e\.price/);
  assert.match(predicate, /\) is true\)/);
  assert.match(predicate, /\), false\)/);
  for (const [index, patch] of patches.entries()) {
    const { before_price, after_price, ...identity } = patch;
    assert.deepEqual(expected[index], { ...identity, price: after_price });
  }
});
