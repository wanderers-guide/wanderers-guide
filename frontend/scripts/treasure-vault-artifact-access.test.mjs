import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { AbilityBlockSchema, ArchetypeSchema, ItemSchema, InventoryItemSchema } from '../src/schemas/content.ts';
import { createOperationEngine } from './operation-test-harness.mjs';
import { inventoryItem } from './fixtures/eidolon.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261002097000_treasure_vault_artifact_access.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-artifact-access.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$artifact097$')[1]);
const normalize = (row) => {
  const result = { ...structuredClone(row), uuid: String(row.uuid) };
  delete result.updated_at;
  delete result.search_tsv;
  return result;
};
const row = (value) => ({ ...structuredClone(value), uuid: Number(value.uuid) });
const patch = (table, id) => spec.patches.find((p) => p.table === table && p.id === id);
const same = (a, b) => {
  try {
    assert.deepEqual(a, b);
    return true;
  } catch {
    return false;
  }
};
const normalizedText = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase();
function matchesPending(submission) {
  if (
    ['APPROVED', 'REJECTED'].includes(
      String(submission.status?.state ?? 'PENDING')
        .trim()
        .toUpperCase()
    )
  )
    return false;
  const data = submission.data ?? {};
  if (submission.type === 'content-source')
    return spec.sources.some(
      (source) =>
        submission.ref_id === source.id ||
        String(data.id) === String(source.id) ||
        normalizedText(data.name) === normalizedText(source.name)
    );
  return [...spec.patches, ...spec.dependencies].some((p) => {
    if (submission.type !== p.type && !(p.table === 'ability_block' && submission.type === 'ability-block'))
      return false;
    return (
      submission.ref_id === p.id ||
      String(data.id) === String(p.id) ||
      String(data.uuid) === String(p.anchor.uuid) ||
      ((submission.content_source_id === p.anchor.content_source_id ||
        String(data.content_source_id) === String(p.anchor.content_source_id)) &&
        normalizedText(data.name) === normalizedText(p.name)) ||
      (p.anchor.meta_data?.source?.url &&
        normalizedText(data.meta_data?.source?.url) === normalizedText(p.anchor.meta_data.source.url)) ||
      (p.primary ?? []).some((evidence) => normalizedText(data.meta_data?.source?.url) === normalizedText(evidence.url))
    );
  });
}
function repair(rows) {
  const normalized = rows.map(normalize);
  const before = normalized.every((r, i) => same(r, spec.patches[i].anchor));
  const after = normalized.every((r, i) => same(r, spec.patches[i].final));
  assert.ok(before || after, 'complete known atomic domain');
  return spec.patches.map((p) => row(p.final));
}
const strip = (value) =>
  Array.isArray(value)
    ? value.map(strip)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .filter(([key]) => key !== 'timestamp')
            .map(([key, child]) => [key, strip(child)])
        )
      : value;
let engine;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true, resolveArchetypeFixtures: true });
});
after(async () => engine?.cleanup());

async function calculate({
  projected = false,
  inventory = 'invested',
  level = 2,
  enabled = [3, 16],
  selectFirst = false,
  fervent = false,
  custom = [],
} = {}) {
  const fixtures = [
    ...spec.dependencies.map((d) => ({ table: d.table, row: row(d.anchor) })),
    ...spec.patches.map((p) => ({ table: p.table, row: row(projected ? p.final : p.anchor) })),
  ];
  engine.setFixtures(fixtures);
  const item = fixtures.find((x) => x.table === 'item' && x.row.id === 12041).row;
  const oldItem = row(patch('item', 12041).anchor);
  const entry = inventoryItem(inventory === 'saved-old' ? oldItem : item, {
    is_invested: !['uninvested', 'formula'].includes(inventory),
    is_equipped: false,
    is_formula: inventory === 'formula',
  });
  const container = inventoryItem(
    {
      id: 990097,
      name: 'Container fixture',
      group: 'GENERAL',
      usage: null,
      traits: [],
      operations: [],
      meta_data: { bulk: { capacity: 4 } },
    },
    { container_contents: [entry] }
  );
  const filter = {
    id: 'gelid-feat-filter',
    type: 'ABILITY_BLOCK',
    abilityBlockType: 'feat',
    isFromArchetype: true,
    traits: [],
    level: { max: level },
  };
  const character = {
    id: 990098,
    name: 'Archetype artifact fixture',
    level,
    hp_current: 1,
    details: { conditions: [] },
    inventory: {
      items: inventory === 'removed' ? [] : inventory === 'stowed' ? [container] : [entry],
      coins: { cp: 0, sp: 0, gp: 0, pp: 0 },
    },
    operation_data: { selections: selectFirst ? { 'character_gelid-feat-choice': '25723' } : {} },
    content_sources: { enabled },
    meta_data: { reset_hp: false },
    options: { custom_operations: true, ignore_bulk_limit: true },
    custom_operations: [
      ...custom,
      ...(fervent
        ? [29513, 29515].map((id) => ({
            id: `grant-${id}`,
            type: 'giveAbilityBlock',
            data: { type: 'feat', abilityBlockId: id },
          }))
        : []),
      {
        id: 'gelid-feat-choice',
        type: 'select',
        data: {
          title: 'Select an Archetype Feat',
          modeType: 'FILTERED',
          optionType: 'ABILITY_BLOCK',
          optionsFilters: filter,
        },
      },
    ],
  };
  const content = {
    classes: [],
    ancestries: [],
    backgrounds: [],
    languages: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    spells: fixtures.filter((x) => x.table === 'spell').map((x) => x.row),
    archetypes: fixtures.filter((x) => x.table === 'archetype').map((x) => x.row),
    items: fixtures.filter((x) => x.table === 'item').map((x) => x.row),
    abilityBlocks: fixtures.filter((x) => x.table === 'ability_block').map((x) => x.row),
    traits: fixtures.filter((x) => x.table === 'trait').map((x) => x.row),
    defaultSources: { PAGE: enabled, INFO: [3] },
  };
  const saved = structuredClone(character);
  const result = await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-BUILDER' });
  assert.deepEqual(character, saved, 'saved inventories, choices and custom adjustments remain unchanged');
  assert.deepEqual(result.errors, []);
  engine.importVariableStore('CHARACTER', result.store);
  const value = (name) => structuredClone(engine.getVariable('CHARACTER', name)?.value);
  const first = fixtures.find((x) => x.table === 'ability_block' && x.row.id === 25723).row;
  const options = await engine.determineFilteredSelectionList('CHARACTER', 'gelid-feat-choice', filter);
  const dedicationOptions = await engine.determineFilteredSelectionList('CHARACTER', 'dedication-choice', {
    id: 'dedication-filter',
    type: 'ABILITY_BLOCK',
    abilityBlockType: 'feat',
    traits: [1445],
    level: { max: level },
  });
  return {
    store: strip(result.store),
    feats: value('FEAT_NAMES'),
    traits: value('TRAIT_NAMES'),
    spells: value('SPELL_DATA'),
    casting: value('CASTING_SOURCES'),
    injection: value('INJECT_TEXT'),
    resistances: value('RESISTANCES'),
    first: engine.meetsPrerequisites('CHARACTER', first.prerequisites).result,
    options: options.filter((x) => x.traits?.includes(3295)).map((x) => x.id),
    markerVisible: dedicationOptions.some((x) => x.id === 51105),
  };
}

test('three exact catalog leaves preserve identities, existing operations and schema-valid saved copies', async () => {
  assert.deepEqual(spec, JSON.parse(release.split('$artifact097$')[1]));
  assert.equal(spec.patches.length, 3);
  assert.equal(spec.dependencies.length, 32);
  const giftSpec = JSON.parse(
    (
      await readFile(
        new URL('../../supabase/migrations/20261002020000_treasure_vault_relic_gifts.sql', import.meta.url),
        'utf8'
      )
    ).split('$gifts$')[1]
  );
  const predecessor = giftSpec.blocks.find((p) => p.id === 29513);
  const fervor = spec.dependencies.find((d) => d.table === 'ability_block' && d.id === 29513).anchor;
  assert.deepEqual(fervor.traits, predecessor.after.traits);
  assert.equal(fervor.description, predecessor.after.description);
  assert.deepEqual(fervor.meta_data.source, predecessor.after.source);
  assert.deepEqual(fervor.traits, [3460, 3489, 3479, 1486, 1448, 1432]);
  const schemas = { item: ItemSchema, ability_block: AbilityBlockSchema, archetype: ArchetypeSchema };
  for (const p of spec.patches) {
    schemas[p.table].parse(row(p.anchor));
    schemas[p.table].parse(row(p.final));
    assert.deepEqual({ ...p.final, [p.path]: p.anchor[p.path] }, p.anchor);
    if (p.table === 'item') InventoryItemSchema.parse(inventoryItem(row(p.final)));
  }
  const grant = patch('item', 12041);
  assert.deepEqual(grant.final.operations.slice(0, -1), grant.anchor.operations);
  assert.deepEqual(grant.final.operations.at(-1), {
    id: '8d8f5c32-6d3f-4dd7-b540-c5c2d76feb6c',
    type: 'giveAbilityBlock',
    data: { type: 'feat', abilityBlockId: 51105 },
  });
  assert.equal(patch('archetype', 110).final.dedication_feat_id, 51105);
  assert.equal(patch('ability_block', 29515).final.operations[0].id, 'ba2ad9c1-aabc-48f9-80f3-e81b190f7eb9');
  assert.deepEqual(
    repair(spec.patches.map((p) => row(p.anchor))),
    spec.patches.map((p) => row(p.final))
  );
  assert.deepEqual(
    repair(spec.patches.map((p) => row(p.final))),
    spec.patches.map((p) => row(p.final))
  );
});

test('complete guards reject partial states, changed siblings, unknown fields and malformed operations without touching inputs', () => {
  for (const state of ['anchor', 'final']) {
    for (const [index, p] of spec.patches.entries()) {
      for (const key of Object.keys(p[state])) {
        const changed = spec.patches.map((x) => row(x[state]));
        changed[index][key] = key === 'id' ? -1 : '__unreviewed__';
        const saved = structuredClone(changed);
        assert.throws(() => repair(changed), `${p.table}:${p.id}/${key}`);
        assert.deepEqual(changed, saved);
      }
    }
  }
  assert.throws(() => repair(spec.patches.map((p, index) => row(index === 0 ? p.final : p.anchor))));
  const changed = spec.patches.map((p) => row(p.anchor));
  changed[0].meta_data.unreviewed = true;
  assert.throws(() => repair(changed));
});

test('curator guards reject both ability-block and exact subtype identities while excluding cross-table numeric collisions', () => {
  for (const p of [...spec.patches, ...spec.dependencies].filter((p) => p.table === 'ability_block')) {
    for (const type of ['ability-block', p.type]) {
      for (const identity of [
        { ref_id: p.id },
        { data: { id: p.id } },
        { data: { uuid: p.anchor.uuid } },
        { content_source_id: p.anchor.content_source_id, data: { name: ` ${p.name.toUpperCase()} ` } },
        { data: { content_source_id: String(p.anchor.content_source_id), name: p.name } },
        ...(p.anchor.meta_data?.source?.url
          ? [{ data: { meta_data: { source: { url: ` ${p.anchor.meta_data.source.url.toUpperCase()} ` } } } }]
          : []),
      ]) {
        const submission = { type, status: { state: ' pending ' }, ...identity };
        const saved = structuredClone(submission);
        assert.equal(matchesPending(submission), true, `${type}/${p.id}/${JSON.stringify(identity)}`);
        assert.deepEqual(submission, saved);
        assert.equal(matchesPending({ ...submission, status: { state: ' approved ' } }), false);
        assert.equal(matchesPending({ ...submission, status: { state: 'rejected' } }), false);
      }
    }
    assert.equal(matchesPending({ type: 'item', ref_id: p.id }), false);
    assert.equal(matchesPending({ type: 'spell', ref_id: p.id }), false);
    assert.equal(matchesPending({ type: 'ability-block', data: { name: p.name, content_source_id: -1 } }), false);
  }
  assert.equal(matchesPending({ type: 'ability-block', ref_id: 12041 }), false);
  for (const text of [migration, release])
    assert.match(text, /u\.type=p->>'type' or \(p->>'table'='ability_block' and u\.type='ability-block'\)/);
});

test('actual invested artifact grants only hidden access and unlocks the paid First Frost choice', async () => {
  const before = await calculate();
  const after = await calculate({ projected: true });
  assert.equal(before.first, 'NOT');
  assert.ok(!before.options.includes(25723));
  assert.equal(after.first, 'FULLY');
  assert.ok(after.options.includes(25723));
  assert.ok(after.feats.includes('GELID SHARD DEDICATION'));
  assert.ok(!after.feats.includes('FIRST FROST'));
  assert.ok(after.traits.includes('GELID SHARD ARCHETYPE'));
  assert.equal(after.markerVisible, false);
  assert.deepEqual(after.spells, []);
  assert.deepEqual(after.casting, []);
  assert.deepEqual(after.resistances, before.resistances);
});

test('actual inactive, removed and old saved item states preserve the entire baseline including custom adjustments', async () => {
  const custom = [
    {
      id: 'saved-fort-adjustment',
      type: 'addBonusToValue',
      data: { variable: 'SAVE_FORT', value: 2, type: 'untyped', text: '' },
    },
  ];
  for (const inventory of ['uninvested', 'formula', 'removed', 'saved-old']) {
    const before = await calculate({ inventory, custom });
    const after = await calculate({ inventory, custom, projected: true });
    assert.deepEqual(after, before, inventory);
    assert.equal(after.first, 'NOT');
    assert.ok(!after.options.includes(25723));
  }
  const stowedBefore = await calculate({ inventory: 'stowed' });
  const stowedAfter = await calculate({ inventory: 'stowed', projected: true });
  assert.equal(stowedAfter.first, 'FULLY');
  assert.deepEqual(stowedAfter.resistances, stowedBefore.resistances);
  assert.match(spec.boundaries.stowed, /cannot be removed or uninvested/);
});

test('actual book and level filters remain enforced while existing saved item effects retain their contract', async () => {
  for (const level of [1, 2, 4, 20]) {
    const result = await calculate({ level, projected: true });
    assert.equal(result.options.includes(25723), level >= 2);
    assert.equal(result.options.includes(51106), level >= 4);
    assert.equal(result.markerVisible, false);
  }
  const off = await calculate({ projected: true, enabled: [3] });
  assert.deepEqual(off.options, []);
  assert.ok(off.feats.includes('GELID SHARD DEDICATION'));
});

test('actual paid First Frost selection grants two cantrips once and preserves old saved selections', async () => {
  const result = await calculate({ projected: true, selectFirst: true });
  assert.deepEqual(
    result.spells
      .map(JSON.parse)
      .map((x) => x.spellId)
      .sort((a, b) => a - b),
    [4636, 5829]
  );
  assert.equal(result.feats.filter((x) => x === 'FIRST FROST').length, 1);
  assert.equal(result.feats.filter((x) => x === 'GELID SHARD DEDICATION').length, 1);
  const oldSaved = await calculate({ projected: true, selectFirst: true, inventory: 'saved-old' });
  assert.equal(oldSaved.feats.filter((x) => x === 'FIRST FROST').length, 1);
  assert.equal(oldSaved.first, 'NOT');
});

test('actual injected-text consumer receives the same target and glyph without an obsolete auditory trait', async () => {
  const before = await calculate({ fervent: true, inventory: 'removed' });
  const after = await calculate({ projected: true, fervent: true, inventory: 'removed' });
  const current = after.injection.map(JSON.parse).filter((x) => x.id === 29513 && x.type === 'feat');
  assert.equal(current.length, 1);
  assert.equal(current[0].text, patch('ability_block', 29515).final.operations[0].data.text);
  assert.equal(before.injection.length, 1);
  assert.match(before.injection[0], /auditory/);
  assert.doesNotMatch(current[0].text, /auditory/);
  assert.match(current[0].text, /concentrate.*manipulate/);
  assert.match(current[0].text, /cost="ONE-ACTION"/);
  const html = engine.renderRichText(current[0].text);
  assert.doesNotMatch(html, /auditory/);
  assert.match(html, /concentrate/);
  assert.match(html, /manipulate/);
  assert.deepEqual((await calculate({ projected: true, inventory: 'removed' })).injection, []);
});

test('SQL is atomic with complete CAS and post-trigger guards and the release check is read-only', () => {
  assert.match(migration, /lock table public\.content_update in share mode/);
  assert.match(migration, /Preflight every complete owner before the first write/);
  assert.match(migration, /baseline_owners>0 and terminal_owners>0/);
  assert.equal((migration.match(/update public\./g) ?? []).length, 3);
  assert.match(migration, /update public\.item i set operations=array/);
  assert.match(migration, /update public\.ability_block a set operations=array/);
  assert.match(migration, /update public\.archetype a set dedication_feat_id=/);
  assert.doesNotMatch(migration, /update public\.(character|creature|content_source|content_update)/i);
  for (const text of [
    'captured CAS failed',
    'post-trigger owner drift',
    'final owner drift',
    'final dependency drift',
    'final source drift',
    'final curator drift',
  ])
    assert.ok(migration.includes(text));
  assert.match(migration, /actual is distinct from dependency->'anchor'/);
  assert.match(migration, /upper\(btrim\(coalesce\(u\.status/);
  assert.match(migration, /u\.data->>'uuid'/);
  assert.match(migration, /u\.data->>'content_source_id'/);
  assert.doesNotMatch(release, /^\s*(?:do|update|insert|delete|alter|create|lock|perform|begin|commit)\b/im);
  assert.doesNotMatch(release, /for (?:update|share)/i);
  assert.match(release, /select 'treasure-vault-artifact-access' as id/);
  assert.match(release, /as passed/);
});
