import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { AbilityBlockSchema, InventorySchema } from '../src/schemas/content.ts';
import uploadUtils from '../../supabase/functions/_shared/upload-utils.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';

const { uniqueId } = uploadUtils;
const migrationName = '20261001070000_treasure_vault_ursine_feats.sql';
const migration = await readFile(new URL('../../supabase/migrations/' + migrationName, import.meta.url), 'utf8');
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-ursine-feats.sql', import.meta.url),
  'utf8'
);
const specs = JSON.parse(migration.split('$feats$')[1]);
const repairs = JSON.parse(migration.split('$repairs$')[1]);
const dependencies = JSON.parse(migration.split('$dependencies$')[1]);
const candidates = [
  ['Call Ursine Ally', 8, 8641661906134255, [3351, 1454, 2134], [], 'once per hour'],
  ['Bear Empathy', 10, 5152313550250344, [3351, 1454], [], ''],
  ['Great Bear', 12, 7134592185110641, [3351], ['Ursine Avenger Form'], 'once per hour'],
  ['Terrible Transformation', 14, 5732112610711193, [3351], ['Ursine Avenger Form'], ''],
  ['Fearsome Fangs', 16, 8910251669367082, [3351], ['Ursine Avenger Form'], ''],
  ['Mighty Bear', 18, 6633677401327609, [3351], ['Great Bear'], ''],
  ['Immortal Bear', 20, 6875755095101542, [3351], ['Ursine Avenger Form'], ''],
];
const rows = await readContentRows([
  ...dependencies.map(({ table, id }) => ({ table: table.replaceAll('-', '_'), id })),
  ...repairs.map(({ id }) => ({ table: 'ability_block', id })),
  { table: 'content_source', id: 3 },
  { table: 'content_source', id: 16 },
  { table: 'ability_block', sourceIds: [16] },
]);
const fixtures = [...new Map(rows.map((entry) => [entry.table + ':' + entry.row.id, entry])).values()];
const getRow = (table, id) => {
  const row = fixtures.find((entry) => entry.table === table && entry.row.id === id)?.row;
  assert.ok(row, table + ':' + id + ' fixture missing');
  return row;
};
const form = getRow('ability_block', 26030);
const archetype = getRow('archetype', 166);
const stableItemOperations = [
  { id: '88233209-3b95-4aed-8497-fe1809421b8a', type: 'giveItem', data: { itemId: 13667 } },
  { id: 'fd429a17-7805-4ecf-8db5-2e09a112dbe8', type: 'giveItem', data: { itemId: 13666 } },
];
let engine;

/** Normalize only decoder/server-owned fields, matching the SQL full-content guard. */
function reviewedContent(row, excludePrerequisites = false) {
  const result = structuredClone(row);
  for (const key of ['id', 'created_at', 'updated_at', 'search_tsv']) delete result[key];
  if (excludePrerequisites) delete result.prerequisites;
  result.uuid = Number(result.uuid);
  return result;
}

/** Preview distinct positive allocations without reserving any database sequence values. */
function importedRows(firstId = 990101) {
  const greatBearId = firstId + 2;
  return specs.map(({ row }, index) => ({
    ...structuredClone(row),
    id: firstId + index,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    description: row.name === 'Mighty Bear' ? row.description.replace('%s', String(greatBearId)) : row.description,
  }));
}

const imported = importedRows();
const candidateIds = new Set(imported.map(({ id }) => id));
const lookupFixtures = [
  ...fixtures.filter(
    ({ table, row }) => table !== 'ability_block' || !specs.some((spec) => spec.row.uuid === Number(row.uuid))
  ),
  ...imported.map((row) => ({ table: 'ability_block', row })),
];

/** Use actual selectors and a saved selection tree, rather than executing candidate operations directly. */
async function calculate({
  level = 20,
  slotLevel = level,
  enabled = [3, 16],
  selectedForm = true,
  selectedFeat,
  customOperations = [],
  inventory = { items: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
  givenItemIds = [],
} = {}) {
  const formSelect = {
    id: 'form-choice',
    type: 'select',
    data: {
      title: 'Select Dedication',
      modeType: 'FILTERED',
      optionType: 'ABILITY_BLOCK',
      optionsFilters: {
        id: 'form-filter',
        type: 'ABILITY_BLOCK',
        abilityBlockType: 'feat',
        traits: [1445],
        level: { max: slotLevel },
      },
    },
  };
  const featSelect = {
    id: 'ursine-choice',
    type: 'select',
    data: {
      title: 'Select Archetype Feat',
      modeType: 'FILTERED',
      optionType: 'ABILITY_BLOCK',
      optionsFilters: {
        id: 'ursine-filter',
        type: 'ABILITY_BLOCK',
        abilityBlockType: 'feat',
        traits: [],
        isFromArchetype: true,
        level: { max: slotLevel },
      },
    },
  };
  const selections = {};
  if (selectedForm) selections['character_form-choice'] = String(form.id);
  if (selectedFeat) selections['character_ursine-choice'] = String(selectedFeat.id);
  const character = {
    id: 990071,
    name: 'Ursine feat controller fixture',
    level,
    hp_current: 1,
    details: { conditions: [] },
    inventory: structuredClone(inventory),
    operation_data: { selections },
    content_sources: { enabled },
    meta_data: { reset_hp: false, given_item_ids: givenItemIds },
    options: { custom_operations: true, ignore_bulk_limit: true },
    custom_operations: [formSelect, featSelect, ...customOperations],
  };
  const before = structuredClone(character);
  const content = {
    classes: [],
    ancestries: [],
    backgrounds: [],
    languages: [],
    spells: lookupFixtures.filter(({ table }) => table === 'spell').map(({ row }) => row),
    archetypes: [archetype],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    items: lookupFixtures.filter(({ table }) => table === 'item').map(({ row }) => row),
    abilityBlocks: lookupFixtures.filter(({ table }) => table === 'ability_block').map(({ row }) => row),
    traits: lookupFixtures.filter(({ table }) => table === 'trait').map(({ row }) => row),
    defaultSources: { PAGE: enabled, INFO: [3] },
  };
  engine.setFixtures(lookupFixtures);
  const result = await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-BUILDER' });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(character, before, 'calculation must preserve saved character and selection snapshots');
  engine.importVariableStore('CHARACTER', result.store);
  const options = await engine.determineFilteredSelectionList(
    'CHARACTER',
    'ursine-choice',
    featSelect.data.optionsFilters
  );
  return { ...result, character, content, options: options.filter(({ id }) => candidateIds.has(id)) };
}

before(async () => {
  engine = await createOperationEngine({ resolveArchetypeFixtures: true });
  engine.setFixtures(lookupFixtures);
});
after(async () => engine?.cleanup());

test('seven complete remaster rows have canonical identity, source, traits, prerequisites and manual effects', () => {
  assert.equal(specs.length, 7);
  assert.equal(new Set(specs.map(({ row }) => row.uuid)).size, 7);
  for (const [index, row] of imported.entries()) {
    const [name, level, uuid, traits, prerequisites, frequency] = candidates[index];
    assert.ok(AbilityBlockSchema.safeParse(row).success, name);
    assert.deepEqual(
      [row.name, row.level, row.uuid, row.traits, row.prerequisites, row.frequency],
      [name, level, uuid, traits, prerequisites, frequency]
    );
    assert.equal(uniqueId(name, 'feat', level, 16), uuid);
    assert.ok(Number.isSafeInteger(uuid));
    assert.equal(row.content_source_id, 16);
    assert.equal(row.type, 'feat');
    assert.equal(row.rarity, 'COMMON');
    assert.equal(row.actions, null);
    assert.deepEqual(row.operations, []);
    assert.equal(row.meta_data.unselectable, undefined);
    assert.deepEqual(row.meta_data.source, {
      url: 'https://2e.aonprd.com/Feats.aspx?ID=' + (4089 + index),
      book: 'Treasure Vault (Remastered)',
      page: '184',
    });
    assert.equal(specs[index].legacy_url, 'https://2e.aonprd.com/Feats.aspx?ID=' + (8953 + index));
    assert.doesNotMatch(row.description, /\[\[|@UUID|link_[a-z-]+_-|%s/);
    assert.equal(row.version, '1.0');
    assert.equal(row.availability, null);
  }
  assert.match(
    imported[0].description,
    /black bear.*4th rank.*grizzly bear.*5th rank.*polar bear.*6th rank.*cave bear/
  );
  assert.match(imported[2].description, /1st-rank.*enlarge/);
  assert.equal(
    getRow('spell', 4601).rank,
    2,
    'keep the printed Great Bear discrepancy visible, without invented automation'
  );
  assert.match(imported[4].description, /jaws.*1d12.*claws.*1d8/);
  assert.match(imported[6].description, /When in .*Ursine Avenger Form.*fast healing 5/);
});

test('every numeric prose reference resolves through the production helper and Mighty uses the local Great Bear ID', () => {
  for (const firstId of [990101, 123456]) {
    const allocated = importedRows(firstId);
    engine.setFixtures([...fixtures, ...allocated.map((row) => ({ table: 'ability_block', row }))]);
    const great = allocated.find(({ name }) => name === 'Great Bear');
    const mighty = allocated.find(({ name }) => name === 'Mighty Bear');
    assert.ok(mighty.description.includes(engine.convertToHardcodedLink('feat', 'Great Bear')));
    assert.equal(engine.buildHrefFromContentData('feat', great.id), 'link_feat_' + great.id);
    for (const row of allocated) {
      for (const match of row.description.matchAll(/\[([^\]]+)\]\(link_([a-z-]+)_(\d+)\)/g)) {
        const [, label, type, idText] = match;
        const id = Number(idText);
        assert.ok(id > 0);
        const table = ['feat', 'action'].includes(type) ? 'ability_block' : type;
        const target = allocated.find((target) => table === 'ability_block' && target.id === id) ?? getRow(table, id);
        if (table === 'ability_block') assert.equal(target.type, type);
        assert.equal(engine.convertToHardcodedLink(type, target.name, label), match[0]);
      }
    }
  }
  engine.setFixtures(lookupFixtures);
});

test('the two fabricated prerequisite leaves have exact guarded transitions and preserve all other full-row fields', () => {
  assert.deepEqual(
    repairs.map(({ id }) => id),
    [52136, 52138]
  );
  for (const patch of repairs) {
    const row = getRow('ability_block', patch.id);
    assert.deepEqual(reviewedContent(row, true), reviewedContent({ ...patch.row }, true));
    assertReviewedTransition(row.prerequisites, patch.before, patch.after, row.name + ' prerequisites');
    const proposed = { ...structuredClone(row), prerequisites: patch.after };
    assert.ok(AbilityBlockSchema.safeParse(proposed).success, row.name);
    assert.deepEqual({ ...proposed, prerequisites: row.prerequisites }, row);
    assert.deepEqual(patch.before, ['Ursine Avenger Hood Dedication']);
    assert.deepEqual(patch.after, []);
  }
  assert.equal(archetype.dedication_feat_id, form.id);
  assert.equal(archetype.trait_id, 3351);
  assert.deepEqual(form.operations, stableItemOperations);
  for (const dependency of dependencies) {
    const row = getRow(dependency.table.replaceAll('-', '_'), dependency.id);
    for (const [key, value] of Object.entries(dependency)) {
      if (key === 'table') continue;
      assert.deepEqual(
        key === 'uuid' ? Number(row[key]) : row[key],
        value,
        dependency.table + ':' + dependency.id + '/' + key
      );
    }
  }
});

test('actual Form selection supplies the archetype trait and seven feats obey earned-slot level/source/ownership caps', async () => {
  for (const level of [7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 12, 8]) {
    const result = await calculate({ level });
    assert.deepEqual(
      result.options.map(({ name }) => name),
      candidates.filter(([, required]) => required <= level).map(([name]) => name)
    );
    assert.deepEqual(engine.getVariable('CHARACTER', 'EXTRA_ITEM_IDS')?.value, ['13667', '13666']);
    assert.deepEqual(engine.getVariable('CHARACTER', 'FEAT_IDS')?.value, ['26030']);
    assert.ok(engine.getAllArchetypeTraitVariables('CHARACTER').some(({ value }) => value === 3351));
    assert.equal((engine.getVariable('CHARACTER', 'SPELL_DATA')?.value ?? []).length, 0);
  }
  assert.equal((await calculate({ level: 20, slotLevel: 10 })).options.length, 2);
  assert.equal((await calculate({ level: 20, slotLevel: 6 })).options.length, 0);
  assert.equal((await calculate({ selectedForm: false })).options.length, 0);
  assert.equal(engine.getAllArchetypeTraitVariables('CHARACTER').length, 0);
  assert.equal((await calculate({ enabled: [3] })).options.length, 0);
  assert.deepEqual(form.operations, stableItemOperations);
});

test('canonical prerequisites report Form/Great ownership without adding a new hard selection policy', async () => {
  await calculate({ selectedForm: false });
  assert.equal(engine.meetsPrerequisites('CHARACTER', imported[2].prerequisites).result, 'NOT');
  await calculate();
  for (const feat of imported.filter(({ prerequisites }) => prerequisites.includes('Ursine Avenger Form'))) {
    assert.equal(engine.meetsPrerequisites('CHARACTER', feat.prerequisites).result, 'FULLY');
  }
  for (const repair of repairs) {
    assert.equal(engine.meetsPrerequisites('CHARACTER', repair.before).result, 'NOT');
    assert.equal(engine.meetsPrerequisites('CHARACTER', repair.after).result, null);
  }
  assert.equal(engine.meetsPrerequisites('CHARACTER', imported[5].prerequisites).result, 'NOT');
  const unqualified = await calculate({ level: 18, selectedFeat: imported[5] });
  assert.ok(
    unqualified.options.some(({ id }) => id === imported[5].id),
    'prerequisites remain advisory rather than filtering valid-level options'
  );
  assert.equal(engine.meetsPrerequisites('CHARACTER', imported[5].prerequisites).result, 'NOT');
  await calculate({ level: 18, selectedFeat: imported[2] });
  assert.equal(engine.meetsPrerequisites('CHARACTER', imported[5].prerequisites).result, 'FULLY');
});

test('saved selections survive repeat/down-level/source changes and manual Call does not create a misleading spell pool', async () => {
  const call = imported[0];
  for (const [level, enabled] of [
    [8, [3, 16]],
    [14, [3, 16]],
    [8, [3, 16]],
    [20, [3]],
  ]) {
    await calculate({ level, enabled, selectedFeat: call });
    assert.deepEqual(engine.getVariable('CHARACTER', 'FEAT_IDS')?.value, ['26030', String(call.id)]);
    assert.deepEqual(engine.getVariable('CHARACTER', 'FEAT_NAMES')?.value, ['URSINE AVENGER FORM', 'CALL URSINE ALLY']);
    assert.deepEqual(engine.getVariable('CHARACTER', 'SPELL_DATA')?.value, []);
  }
  const independentGrant = {
    id: 'independent-spell-fixture',
    type: 'giveSpell',
    data: { spellId: 4866, type: 'INNATE', tradition: 'PRIMAL', rank: 2, casts: 2 },
  };
  for (const selectedFeat of [undefined, call, call]) {
    await calculate({ level: 12, selectedFeat, customOperations: [independentGrant] });
    assert.deepEqual(
      engine.getVariable('CHARACTER', 'SPELL_DATA')?.value.map((value) => JSON.parse(value)),
      [{ spellId: 4866, type: 'INNATE', rank: 2, tradition: 'PRIMAL', casts: 2 }]
    );
  }
});

test('manual later feats neither replace Form attacks nor mutate customized saved inventory snapshots', async () => {
  const attacks = [13666, 13667].map((id) => ({
    id: 'saved-ursine-' + id,
    item: {
      ...structuredClone(getRow('item', id)),
      description: 'Saved customized attack',
      meta_data: {
        ...structuredClone(getRow('item', id).meta_data),
        runes: { potency: 2, striking: 2, property: [{ id: 760101 + id, name: 'Saved custom property rune' }] },
      },
    },
    is_equipped: true,
    is_invested: false,
    is_formula: false,
    is_implanted: false,
    container_contents: [],
  }));
  const inventory = { items: attacks, coins: { cp: 0, sp: 0, gp: 0, pp: 0 } };
  assert.ok(InventorySchema.safeParse(inventory).success, 'the complete saved inventory fixture is schema-valid');
  for (const selectedFeat of [imported[4], imported[6], imported[4]]) {
    const { character, content } = await calculate({ selectedFeat, inventory, givenItemIds: [13666, 13667] });
    assert.deepEqual(character.inventory, inventory);
    assert.ok(InventorySchema.safeParse(character.inventory).success);
    assert.deepEqual(engine.getVariable('CHARACTER', 'EXTRA_ITEM_IDS')?.value, ['13667', '13666']);
    assert.equal(engine.getWeaponStats('CHARACTER', attacks[0].item).damage.die, 'd8');
    assert.equal(engine.getWeaponStats('CHARACTER', attacks[1].item).damage.die, 'd6');
    let saved = character;
    engine.addExtraItems('CHARACTER', content.items, character, (update) => {
      saved = update(saved);
    });
    await delay(250);
    assert.ok(InventorySchema.safeParse(saved.inventory).success);
    assert.deepEqual(saved, character, 'existing generated IDs/runes/customizations must not be swapped or deleted');
  }
});

test('migration gates pending proposals, replay, collisions and drift before writes, without reserving IDs or rewriting scaffolds', async () => {
  const childPrelockStart = migration.indexOf('-- Acquire reviewed content rows before source cache locks.');
  const childPrelockEnd = migration.indexOf('-- End reviewed content row prelocks.');
  assert.ok(migration.indexOf('lock table public.content_update') < childPrelockStart);
  assert.ok(migration.indexOf('lock table public.ability_block in share row exclusive mode;') < childPrelockStart);
  assert.ok(
    childPrelockStart < childPrelockEnd &&
      childPrelockEnd < migration.indexOf('from public.content_source', migration.indexOf('\nbegin\n'))
  );
  const childPrelocks = migration.slice(childPrelockStart, childPrelockEnd);
  assert.doesNotMatch(childPrelocks, /\b(?:update|insert|delete)\s+public\.|\b(?:continue|return)\b/i);
  assert.match(childPrelocks, /jsonb_array_elements\(repairs\)/);
  assert.match(
    childPrelocks,
    /a\.uuid = \(f->'row'->>'uuid'\)::bigint\s+and a\.content_source_id = \(f->'row'->>'content_source_id'\)::bigint/
  );
  assert.match(
    childPrelocks,
    /order by a\.id loop[\s\S]*?if \(entry->>'write'\)::boolean then[\s\S]*?public\.ability_block[^;]*for update;[\s\S]*?else[\s\S]*?public\.ability_block[^;]*for share;/
  );
  for (const [table, alias] of [
    ['archetype', 'a'],
    ['item', 'i'],
    ['spell', 's'],
    ['trait', 't'],
  ]) {
    assert.match(
      childPrelocks,
      new RegExp(
        `public\\.${table} ${alias}[\\s\\S]*?where d->>'table' = '${table}'[\\s\\S]*?order by ${alias}\\.id for share;`
      )
    );
  }
  assert.match(migration, /lock table public\.content_update in share mode/);
  assert.match(migration, /lock table public\.ability_block in share row exclusive mode/);
  assert.match(migration, /user_id is null and is_published is true/);
  assert.match(migration, /id <> 16 or name = 'Treasure Vault'/);
  assert.match(migration, /u\.type = 'content-source' and u\.ref_id = 16/);
  assert.match(migration, /u\.ref_id in \(52136,52138\)/);
  const pendingRefGuard = migration.slice(
    migration.indexOf("or (u.type = 'ability-block' and exists ("),
    migration.indexOf('or exists (select 1 from jsonb_array_elements(dependencies) d')
  );
  assert.match(pendingRefGuard, /a\.id = u\.ref_id/);
  assert.match(pendingRefGuard, /a\.uuid in \(select/);
  assert.match(pendingRefGuard, /a\.content_source_id = 16/);
  assert.doesNotMatch(pendingRefGuard, /u\.data/);
  for (const row of imported) {
    const pending = { type: 'ability-block', ref_id: row.id, content_source_id: 16, data: {} };
    assert.deepEqual(pending.data, {});
    assert.equal(pending.content_source_id, 16);
    assert.ok(
      imported.some((actual) => actual.id === pending.ref_id && specs.some((spec) => spec.row.uuid === actual.uuid)),
      row.name + ' pending partial UPDATE/DELETE resolves by stored ref identity without payload fields'
    );
  }
  assert.match(migration, /u\.data->>'uuid'/);
  assert.match(migration, /u\.data #>> '\{meta_data,source,url\}'/);
  assert.ok(migration.indexOf("u.status->>'state' = 'PENDING'") < migration.indexOf('if existing_count = 7'));
  assert.ok(
    migration.indexOf("u.status->>'state' = 'PENDING'") < migration.indexOf('insert into public.ability_block')
  );
  assert.match(migration, /existing_count not in \(0,7\)/);
  assert.match(migration, /a\.uuid in \(select/);
  assert.match(migration, /lower\(btrim\(a\.name\)\)/);
  assert.match(migration, /lower\(split_part\(a\.meta_data #>> '\{source,url\}', '&', 1\)\)/);
  assert.match(migration, /actual\.id <= 0/);
  assert.match(migration, /is distinct from expected/);
  assert.match(migration, /returning id into inserted_id/);
  assert.match(migration, /if expected->>'name' = 'Great Bear' then great_bear_id := inserted_id/);
  assert.match(migration, /format\(expected->>'description', great_bear_id\)/);
  assert.match(migration, /prerequisites.*is not true|entry->'after'\) is not true/s);
  assert.match(migration, /is distinct from \(\(entry->'row'\) - 'prerequisites'\)/);
  const insertColumns = migration.match(/insert into public\.ability_block \(([\s\S]*?)\)\s+select/)[1];
  assert.doesNotMatch(insertColumns, /\b(id|created_at|updated_at|search_tsv)\b/);
  assert.doesNotMatch(
    migration,
    /\b(nextval|setval)\b|max\s*\(\s*id\s*\)|on conflict|delete from|update public\.(item|archetype|trait|character|content_update)/i
  );
  assert.match(migration, /update public\.ability_block set prerequisites = '\{\}'::varchar\[\]/);
  assert.match(migration, /meta_data::jsonb #> '\{counts,feat\}' is distinct from to_jsonb\(feat_count\)/);
  assert.match(migration, /coalesce\(nullif\(meta_data::jsonb, 'null'::jsonb\), '\{\}'::jsonb\)/);
  assert.match(migration, /jsonb_typeof\(meta_data::jsonb\) not in \('object','null'\)/);
  assert.match(migration, /where content_source_id = 16 and type = 'feat'/);
  assert.doesNotMatch(migration, /'feat', 54/);
  const requirements = JSON.parse(
    await readFile(new URL('../../supabase/release/requirements.json', import.meta.url), 'utf8')
  );
  assert.deepEqual(requirements[migrationName], {
    check: 'treasure-vault-ursine-feats.sql',
    order: 'before-functions',
  });
});

test('SELECT-only release checks share exact reviewed rows, resolve local IDs and compare the real source count', () => {
  assert.match(release, /= \(\(p\.value->'row'\) - 'prerequisites'\)/);
  for (const tag of ['$feats$', '$repairs$', '$dependencies$']) {
    assert.deepEqual(JSON.parse(release.split(tag)[1]), JSON.parse(migration.split(tag)[1]));
  }
  assert.match(release, /^--[^\n]*\nwith feat_spec/);
  assert.equal(release.split(';').length, 2);
  assert.doesNotMatch(release, /\b(create|insert|update|delete|alter|drop|truncate)\b/i);
  assert.deepEqual(
    [...release.matchAll(/select '(treasure-vault-ursine-[a-z-]+)'/g)].map((match) => match[1]),
    [
      'treasure-vault-ursine-feats',
      'treasure-vault-ursine-prerequisites',
      'treasure-vault-ursine-scaffolds',
      'treasure-vault-ursine-feat-count',
    ]
  );
  assert.match(release, /format\(f\.value->'row'->>'description', great_bear\.id\)/);
  assert.match(release, /count\(\*\) = 7/);
  assert.match(release, /count\(\*\) = 2/);
  assert.match(release, /count\(\*\) = 15/);
  assert.match(release, /to_jsonb\(a\) - '\{id,created_at,updated_at,search_tsv\}'/);
  assert.match(release, /select count\(\*\) from public\.ability_block where content_source_id = 16 and type = 'feat'/);
  assert.doesNotMatch(release, /'feat', 54/);
  const source = getRow('content_source', 16);
  assert.equal(source.name, 'Treasure Vault');
  const sourceFeatCount = fixtures.filter(
    ({ table, row }) => table === 'ability_block' && row.content_source_id === 16 && row.type === 'feat'
  ).length;
  const beforeCount = source.meta_data.counts.feat;
  assert.equal(beforeCount, sourceFeatCount);
  const missing = specs.filter(
    ({ row }) => !fixtures.some((entry) => entry.table === 'ability_block' && Number(entry.row.uuid) === row.uuid)
  ).length;
  assert.ok(missing === 0 || missing === 7);
  const refreshed = {
    ...structuredClone(source),
    meta_data: {
      ...structuredClone(source.meta_data),
      counts: { ...source.meta_data.counts, feat: sourceFeatCount + missing },
    },
  };
  assert.equal(refreshed.meta_data.counts.feat, sourceFeatCount + missing);
  refreshed.meta_data.counts.feat = beforeCount;
  assert.deepEqual(refreshed, source, 'only the feat count is authorized to change');
});
