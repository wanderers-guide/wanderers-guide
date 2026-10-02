import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { ContentTypeSchema, ContentUpdateSchema, ItemSchema, TraitSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import uploadUtils from '../../supabase/functions/_shared/upload-utils.ts';

const { uniqueId } = uploadUtils;

const migration = await readFile(
  new URL('../../supabase/migrations/20261001060000_treasure_vault_structured_fields.sql', import.meta.url),
  'utf8'
);
const predicate = await readFile(
  new URL('../../supabase/release/treasure-vault-structured-fields.sql', import.meta.url),
  'utf8'
);
const patches = JSON.parse(migration.split('$patches$')[1]);
const dependencies = JSON.parse(migration.split('$dependencies$')[1]);
const expected = JSON.parse(predicate.split('$expected$')[1]);
const md5 = (value) => createHash('md5').update(value).digest('hex');
const armorIds = [11764, 11768, 11970, 12104, 12317, 12318, 12563, 12710];
const shieldIds = [11904, 12095, 12141, 12207, 12311, 12355, 12505];
let engine;
let fixtureRows;
let originals;
let proposed;
let sequence = 0;

/** Mirror the exact reviewed guards and leaves without replacing any other content field. */
function repair(original, patch, { pending = [], collisions = [] } = {}) {
  assert.deepEqual(
    [original.id, original.name, original.content_source_id, original.group, original.price],
    [patch.id, patch.name, patch.source, patch.group, patch.price],
    'unreviewed item identity/source/group/price'
  );
  assert.equal(md5(original.name), patch.name_md5);
  assert.ok(original.meta_data && typeof original.meta_data === 'object' && !Array.isArray(original.meta_data));
  assert.deepEqual(original.meta_data.source, patch.citation, 'unreviewed citation');
  assert.ok(
    (original.level === patch.before_level && String(original.uuid) === patch.before_uuid) ||
      (original.level === patch.after_level && String(original.uuid) === patch.after_uuid),
    'unreviewed level/UUID pair'
  );
  assert.ok(
    !pending.some((entry) => entry.type === 'item' && entry.ref_id === patch.id && entry.state === 'PENDING'),
    'pending item submission'
  );
  for (const key of Object.keys(patch.before)) {
    assert.ok(
      JSON.stringify(original[key]) === JSON.stringify(patch.before[key]) ||
        JSON.stringify(original[key]) === JSON.stringify(patch.after[key]),
      `unreviewed ${key} leaf`
    );
  }
  assert.ok(
    !collisions.some((entry) => entry.id !== original.id && String(entry.uuid) === patch.after_uuid),
    'UUID collision'
  );
  return {
    ...structuredClone(original),
    level: patch.after_level,
    uuid: patch.after_uuid,
    ...structuredClone(patch.after),
  };
}

/** Model the fail-closed final-state predicate, including missing and changed dependencies. */
function passes(
  items,
  traits = fixtureRows.filter(({ table }) => table === 'trait').map(({ row }) => row),
  sources = fixtureRows.filter(({ table }) => table === 'content_source').map(({ row }) => row)
) {
  return (
    expected.length === 29 &&
    expected.every((entry) => {
      const item = items.find(({ id }) => id === entry.id);
      return (
        item != null &&
        item.name === entry.name &&
        md5(item.name) === entry.name_md5 &&
        String(item.uuid) === entry.uuid &&
        item.content_source_id === entry.source &&
        item.level === entry.level &&
        item.group === entry.group &&
        JSON.stringify(item.price) === JSON.stringify(entry.price) &&
        item.meta_data != null &&
        !Array.isArray(item.meta_data) &&
        JSON.stringify(item.meta_data.source) === JSON.stringify(entry.citation) &&
        Object.entries(entry.leaves).every(([key, value]) => JSON.stringify(item[key]) === JSON.stringify(value))
      );
    }) &&
    dependencies.every((dependency) =>
      traits.some(
        (trait) =>
          trait.id === dependency.id &&
          trait.name === dependency.name &&
          String(trait.uuid) === dependency.uuid &&
          trait.content_source_id === dependency.source
      )
    ) &&
    [3, 16].every((id) =>
      sources.some(
        (source) =>
          source.id === id &&
          source.name === (id === 3 ? 'Common Core' : 'Treasure Vault') &&
          source.user_id === null &&
          source.is_published === true
      )
    )
  );
}

/** Keep content identity separate from a synthetic inventory occurrence. */
function occurrence(item, flags = {}) {
  return {
    id: `structured-${item.id}-${++sequence}`,
    item,
    is_equipped: true,
    is_invested: true,
    is_implanted: false,
    is_formula: false,
    container_contents: [],
    ...flags,
  };
}

/** Execute the unchanged production equipment controller against complete local official rows. */
async function calculate(item, flags = {}) {
  const content = {
    classes: [],
    ancestries: [],
    backgrounds: [],
    abilityBlocks: [],
    languages: [],
    spells: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: fixtureRows.filter(({ table }) => table === 'content_source').map(({ row }) => row),
    traits: fixtureRows.filter(({ table }) => table === 'trait').map(({ row }) => row),
    items: proposed,
    defaultSources: { PAGE: [3, 16], INFO: [3, 16] },
  };
  engine.setFixtures(
    fixtureRows.filter(({ table }) => table !== 'item').concat(proposed.map((row) => ({ table: 'item', row })))
  );
  const character = {
    id: 990076,
    name: 'Structured fields fixture',
    level: 20,
    hp_current: 1,
    details: { conditions: [] },
    inventory: { items: [occurrence(item, flags)] },
    operation_data: { selections: {} },
    content_sources: { enabled: [3, 16] },
    meta_data: { reset_hp: false },
    options: { custom_operations: true, ignore_bulk_limit: true },
    custom_operations: [],
  };
  const result = await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-SHEET' });
  assert.deepEqual(result.errors, []);
  engine.importVariableStore('CHARACTER', result.store);
}

before(async () => {
  fixtureRows = await readContentRows([
    { table: 'item', sourceIds: [1, 3, 16] },
    { table: 'trait', sourceIds: [3, 16] },
    { table: 'content_source', id: 3 },
    { table: 'content_source', id: 16 },
  ]);
  // Optional ignored complete audit fixture; CI uses the unchanged checked-in full-row dump.
  if (process.env.WG_TREASURE_VAULT_STRUCTURED_FIXTURE) {
    const fixture = JSON.parse(await readFile(process.env.WG_TREASURE_VAULT_STRUCTURED_FIXTURE, 'utf8'));
    assert.equal(fixture.source_id, 16);
    for (const patch of patches) {
      const entry = fixture.rows.find(({ content_type, row }) => content_type === 'item' && row.id === patch.id);
      assert.ok(entry, `private fixture item ${patch.id}`);
      const index = fixtureRows.findIndex(({ table, row }) => table === 'item' && row.id === patch.id);
      assert.ok(index >= 0);
      fixtureRows[index] = { table: 'item', row: entry.row };
    }
  }
  originals = patches.map(({ id }) => fixtureRows.find(({ table, row }) => table === 'item' && row.id === id).row);
  proposed = patches.map((patch, index) => repair(originals[index], patch));
  engine = await createOperationEngine();
});
after(async () => engine?.cleanup());

test('29 exact source16 rows contain only the reviewed 31 structured leaf corrections', () => {
  assert.equal(patches.length, 29);
  assert.equal(new Set(patches.map(({ id }) => id)).size, 29);
  assert.equal(
    patches.reduce(
      (count, patch) => count + Object.keys(patch.after).length + (patch.before_level !== patch.after_level ? 2 : 0),
      0
    ),
    31
  );
  assert.deepEqual(
    patches.map(({ id }) => id),
    [
      11764, 11768, 11845, 11904, 11970, 12095, 12104, 12138, 12141, 12178, 12207, 12225, 12273, 12311, 12317, 12318,
      12355, 12377, 12485, 12505, 12510, 12511, 12512, 12513, 12514, 12563, 12594, 12710, 17302,
    ]
  );
  for (const [index, patch] of patches.entries()) {
    const original = originals[index];
    const result = proposed[index];
    assert.ok(ItemSchema.safeParse(original).success, `full stored schema ${patch.id}`);
    assert.ok(ItemSchema.safeParse(result).success, `full proposed schema ${patch.id}`);
    assert.deepEqual(repair(result, patch), result, `idempotent replay ${patch.id}`);
    const restored = { ...result, level: original.level, uuid: original.uuid };
    for (const key of Object.keys(patch.after)) restored[key] = original[key];
    assert.deepEqual(restored, original, `all unrelated fields ${patch.id}`);
    assert.deepEqual(result.meta_data, original.meta_data, `metadata siblings ${patch.id}`);
    assert.equal(String(uniqueId(result.name, 'item', result.level, result.content_source_id)), patch.after_uuid);
    assert.equal(result.id, original.id, 'retained numeric identity');
    assert.equal(patch.source, 16);
  }
  assert.ok(!patches.some(({ id }) => [12145, 23434].includes(id)), 'Lattice armor reprint remains excluded');
});

test('specific bulk, usage, rarity and tier leaves retain untouched neighboring data', () => {
  const item = (id) => proposed.find((row) => row.id === id);
  assert.deepEqual([item(11845).level, item(11845).uuid, item(11845).price], [14, '7281710863321355', { gp: 800 }]);
  assert.deepEqual([item(12225).bulk, item(12225).usage], ['0.1', 'placed on a surface']);
  assert.equal(item(12273).bulk, '0');
  assert.equal(item(12594).bulk, '0');
  for (const id of [12510, 12511, 12512, 12513, 12514]) assert.equal(item(id).bulk, '1');
  assert.equal(item(12377).usage, 'held in 1 hand');
  assert.equal(item(12178).rarity, 'COMMON');
  assert.equal(item(17302).rarity, 'COMMON');
  assert.equal(item(12485).rarity, 'RARE');
  assert.deepEqual(item(12138).traits, [1841, 1686, 3073, 1459]);
});

test('actual investment and rune benefit helpers gate all eight repaired magic armor rows', async () => {
  for (const id of armorIds) {
    const original = originals.find((row) => row.id === id);
    const item = proposed.find((row) => row.id === id);
    const untouched = structuredClone(item);
    assert.equal(engine.isItemInvestable(original), false);
    assert.equal(engine.isItemInvestable(item), true);
    const potency = item.meta_data.runes.potency;
    const resilience = item.meta_data.runes.resilient;
    await calculate(original, { is_invested: false });
    assert.ok(
      engine
        .getVariableBonuses('CHARACTER', 'AC_BONUS')
        .some((bonus) => bonus.source === item.name && bonus.value === potency)
    );
    await calculate(item, { is_invested: false });
    assert.equal(
      engine.getVariableBonuses('CHARACTER', 'AC_BONUS').filter((bonus) => bonus.source === item.name).length,
      0,
      `uninvested potency ${id}`
    );
    assert.equal(
      engine.getVariableBonuses('CHARACTER', 'SAVE_FORT').filter((bonus) => bonus.source === item.name).length,
      0,
      `uninvested resilience ${id}`
    );
    await calculate(item);
    assert.equal(
      engine
        .getVariableBonuses('CHARACTER', 'AC_BONUS')
        .filter((bonus) => bonus.source === item.name && bonus.value === potency).length,
      1,
      `invested potency ${id}`
    );
    assert.equal(
      engine
        .getVariableBonuses('CHARACTER', 'SAVE_FORT')
        .filter((bonus) => bonus.source === item.name && bonus.value === resilience).length,
      resilience ? 1 : 0,
      `invested resilience ${id}`
    );
    await calculate(item, { is_equipped: false });
    assert.equal(
      engine.getVariableBonuses('CHARACTER', 'AC_BONUS').filter((bonus) => bonus.source === item.name).length,
      0,
      `unequipped potency ${id}`
    );
    assert.deepEqual(item, untouched, `helpers do not mutate ${id}`);
  }
});

test('actual trait compilation retains inherited bases, automatic Magical and shield qualifiers', () => {
  engine.setFixtures(fixtureRows);
  const normalize = (name) => name.toLowerCase().replaceAll(/[^a-z0-9]/g, '');
  for (const id of armorIds) {
    const original = originals.find((row) => row.id === id);
    const item = proposed.find((row) => row.id === id);
    const base = fixtureRows.find(
      ({ table, row }) => table === 'item' && normalize(row.name) === normalize(item.meta_data.base_item)
    );
    assert.ok(base, `inherited base ${id}`);
    const before = { ...structuredClone(original), meta_data: { ...original.meta_data, base_item_content: base.row } };
    const after = { ...structuredClone(item), meta_data: { ...item.meta_data, base_item_content: base.row } };
    assert.deepEqual(
      new Set(engine.compileTraits(after)),
      new Set([...engine.compileTraits(before), 1527]),
      `only Invested added ${id}`
    );
    assert.ok(engine.compileTraits(after).includes(engine.getTraitIdByType('MAGICAL')));
    for (const traitId of base.row.traits ?? []) assert.ok(engine.compileTraits(after).includes(traitId));
    assert.deepEqual(item.meta_data, original.meta_data);
  }
  for (const id of shieldIds) {
    const item = proposed.find((row) => row.id === id);
    const patch = patches.find((entry) => entry.id === id);
    const untouched = structuredClone(item);
    assert.deepEqual(engine.compileTraits(item), patch.after.traits);
    assert.deepEqual(item, untouched);
  }
  const weapon = proposed.find((row) => row.id === 12138);
  const beforeWeapon = originals.find((row) => row.id === 12138);
  assert.deepEqual(new Set(engine.compileTraits(weapon)), new Set([...engine.compileTraits(beforeWeapon), 1459]));
});

test('actual filtered equipment choices preserve all armor and weapon classifications', async () => {
  engine.setFixtures(
    fixtureRows.filter(({ table }) => table !== 'item').concat(proposed.map((row) => ({ table: 'item', row })))
  );
  const filter = (group) => ({ id: 'structured-equipment-filter', type: 'ADJ_VALUE', group, value: { value: 'T' } });
  const armor = await engine.determineFilteredSelectionList('CHARACTER', 'structured-armor', filter('ARMOR'));
  const weapons = await engine.determineFilteredSelectionList('CHARACTER', 'structured-weapons', filter('WEAPON'));
  assert.deepEqual(
    new Set(armor.map(({ name }) => name)),
    new Set(proposed.filter(({ group }) => group === 'ARMOR').map(({ name }) => name))
  );
  assert.deepEqual(
    new Set(weapons.map(({ name }) => name)),
    new Set(proposed.filter(({ group }) => group === 'WEAPON').map(({ name }) => name))
  );
});

test('official trait dependencies and canonical item/trait pending submission types match current schemas', () => {
  for (const dependency of dependencies) {
    const trait = fixtureRows.find(({ table, row }) => table === 'trait' && row.id === dependency.id).row;
    assert.ok(TraitSchema.safeParse(trait).success);
    assert.deepEqual(
      [trait.name, String(trait.uuid), trait.content_source_id],
      [dependency.name, dependency.uuid, dependency.source]
    );
  }
  for (const type of ['item', 'trait']) {
    assert.ok(ContentTypeSchema.safeParse(type).success);
    const submission = {
      id: 990076,
      created_at: '2026-10-01T00:00:00Z',
      user_id: '00000000-0000-0000-0000-000000000001',
      type,
      ref_id: 11764,
      action: 'UPDATE',
      data: {},
      content_source_id: 16,
      status: { state: 'PENDING' },
      upvotes: [],
      downvotes: [],
      discord_msg_id: null,
    };
    assert.ok(ContentUpdateSchema.safeParse(submission).success);
  }
});

test('guards reject changed leaves, missing identity, mixed tier/UUID pairs, collisions and pending replay', () => {
  const patch = patches.find(({ id }) => id === 11845);
  const original = originals.find(({ id }) => id === patch.id);
  const result = proposed.find(({ id }) => id === patch.id);
  assert.throws(() => repair({ ...original, level: 14 }, patch), /level\/UUID pair/);
  assert.throws(() => repair({ ...original, uuid: patch.after_uuid }, patch), /level\/UUID pair/);
  assert.throws(() => repair({ ...original, uuid: null }, patch), /level\/UUID pair/);
  assert.throws(() => repair({ ...original, name: 'Different title' }, patch), /identity/);
  assert.throws(() => repair({ ...original, content_source_id: 400 }, patch), /identity/);
  assert.throws(() => repair({ ...original, price: { gp: 900 } }, patch), /identity/);
  assert.throws(() => repair({ ...original, meta_data: {} }, patch), /citation/);
  assert.throws(() => repair(original, patch, { collisions: [{ id: 990077, uuid: patch.after_uuid }] }), /collision/);
  assert.throws(
    () => repair(result, patch, { pending: [{ type: 'item', ref_id: patch.id, state: 'PENDING' }] }),
    /pending item/
  );
  const shieldPatch = patches.find(({ id }) => id === 11904);
  assert.throws(
    () => repair({ ...originals.find(({ id }) => id === 11904), traits: [999999] }, shieldPatch),
    /unreviewed traits/
  );
  const mawPatch = patches.find(({ id }) => id === 12225);
  const maw = originals.find(({ id }) => id === 12225);
  assert.deepEqual(
    repair({ ...maw, bulk: mawPatch.after.bulk }, mawPatch),
    proposed.find(({ id }) => id === 12225)
  );
});

test('release models every final leaf and fails closed on missing or changed content and dependencies', () => {
  assert.ok(passes(proposed));
  assert.equal(passes(originals), false);
  assert.equal(passes(proposed.slice(1)), false);
  for (const entry of expected) {
    const patch = patches.find(({ id }) => id === entry.id);
    assert.deepEqual(entry, {
      id: patch.id,
      name: patch.name,
      name_md5: patch.name_md5,
      uuid: patch.after_uuid,
      source: patch.source,
      level: patch.after_level,
      group: patch.group,
      price: patch.price,
      citation: patch.citation,
      leaves: patch.after,
    });
    for (const key of Object.keys(entry.leaves)) {
      assert.equal(
        passes(proposed.map((row) => (row.id === entry.id ? { ...row, [key]: patch.before[key] } : row))),
        false,
        `release leaf ${entry.id} ${key}`
      );
    }
  }
  const traits = fixtureRows.filter(({ table }) => table === 'trait').map(({ row }) => row);
  assert.equal(
    passes(
      proposed,
      traits.filter(({ id }) => id !== 1527)
    ),
    false
  );
  assert.equal(
    passes(
      proposed,
      traits.map((row) => (row.id === 2881 ? { ...row, uuid: null } : row))
    ),
    false
  );
  const sources = fixtureRows.filter(({ table }) => table === 'content_source').map(({ row }) => row);
  assert.equal(
    passes(
      proposed,
      traits,
      sources.map((row) => (row.id === 16 ? { ...row, user_id: 'custom' } : row))
    ),
    false
  );
});

test('migration uses locks, pending-before-replay, paired identities and leaf-only compare-and-set updates', () => {
  const childPrelockStart = migration.indexOf('-- Acquire reviewed content rows before source cache locks.');
  const childPrelockEnd = migration.indexOf('-- End reviewed content row prelocks.');
  assert.ok(migration.indexOf('lock table public.content_update') < childPrelockStart);
  assert.ok(
    childPrelockStart < childPrelockEnd &&
      childPrelockEnd < migration.indexOf('from public.content_source', migration.indexOf('\nbegin\n'))
  );
  const childPrelocks = migration.slice(childPrelockStart, childPrelockEnd);
  assert.doesNotMatch(childPrelocks, /\b(?:update|insert|delete)\s+public\.|\b(?:continue|return)\b/i);
  assert.match(childPrelocks, /public\.item i[\s\S]*?jsonb_array_elements\(patches\)[\s\S]*?order by i\.id for update/);
  assert.match(
    childPrelocks,
    /public\.trait t[\s\S]*?jsonb_array_elements\(dependencies\)[\s\S]*?order by t\.id for share/
  );
  assert.match(migration, /lock table public\.content_update in share mode/);
  assert.match(migration, /user_id is null and is_published is true order by id for update/);
  assert.match(migration, /public\.trait where id = \(dependency->>'id'\)::bigint for share/);
  assert.match(migration, /where type = 'trait'/);
  assert.match(migration, /where type = 'item'/);
  assert.ok(migration.indexOf("where type = 'item'") < migration.indexOf('for leaf in'));
  assert.ok(migration.indexOf("where type = 'item'") < migration.indexOf('update public.item'));
  assert.match(migration, /status->>'state' = 'PENDING'/);
  assert.match(migration, /item_row\.level = \(patch->>'before_level'\)::integer/);
  assert.match(migration, /item_row\.uuid = \(patch->>'before_uuid'\)::bigint/);
  assert.match(migration, /item_row\.level = \(patch->>'after_level'\)::integer/);
  assert.match(migration, /item_row\.uuid = \(patch->>'after_uuid'\)::bigint/);
  assert.match(migration, /\) is not true then/);
  assert.match(migration, /Corrected structured-field UUID collides with another item/);
  assert.match(migration, /item_row\.meta_data->'source' is distinct from patch->'citation'/);
  assert.match(migration, /item_row\.price::jsonb is distinct from patch->'price'/);
  assert.match(migration, /jsonb_typeof\(item_row\.meta_data\) is distinct from 'object'/);
  const updates = migration.match(/update public\.item set[\s\S]*?;/g);
  assert.equal(updates.length, 5);
  for (const update of updates) {
    for (const field of ['id', 'name', 'uuid', 'level', 'content_source_id', '"group"']) {
      assert.ok(update.includes(`${field} ${field === 'id' ? '=' : 'is not distinct from'} item_row.${field}`));
    }
    assert.match(update, /price::jsonb is not distinct from item_row\.price::jsonb/);
    assert.match(update, /meta_data->'source' is not distinct from item_row\.meta_data->'source'/);
  }
  for (const leaf of ['traits', 'bulk', 'usage', 'rarity']) {
    const update = updates.find((sql) => sql.startsWith(`update public.item set ${leaf} =`));
    assert.ok(update);
    assert.ok(update.includes(`and ${leaf} is not distinct from item_row.${leaf}`));
  }
  assert.doesNotMatch(migration, /set (description|meta_data|operations|price|name|id)\s*=/);
  assert.doesNotMatch(migration, /update public\.(character|inventory|content_update|trait|content_source)/);
  assert.doesNotMatch(migration, /12145|23434/);
  assert.match(predicate, /select 'treasure-vault-structured-fields'::text as id/);
  assert.match(predicate, /count\(\*\) = 29 and bool_and/);
  assert.match(predicate, /count\(\*\) = 10 and bool_and/);
  assert.match(predicate, /left join public\.item/);
  assert.match(predicate, /left join public\.trait/);
  assert.match(predicate, /where to_jsonb\(i\)->leaf\.key is distinct from leaf\.value/);
  assert.match(predicate, /\) is true\)/);
  assert.match(predicate, /\), false\)/);
});
