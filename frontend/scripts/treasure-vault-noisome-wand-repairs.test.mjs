import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import {
  ItemSchema,
  InventorySchema,
  SpellSchema,
  AbilityBlockSchema,
  TraitSchema,
  ContentSourceSchema,
} from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { content as emptyContent, inventoryItem, summoner } from './fixtures/eidolon.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261001200000_treasure_vault_noisome_wand_repairs.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-noisome-wand-repairs.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$noisome$')[1]);
const rows = await readContentRows([
  ...spec.items.map(({ id }) => ({ table: 'item', id })),
  ...spec.dependencies.map(({ table, id }) => ({ table: table.replace('-', '_'), id })),
  ...spec.sources.map(({ id }) => ({ table: 'content_source', id })),
]);
const get = (table, id) => {
  const row = rows.find((e) => e.table === table && e.row.id === id)?.row;
  assert.ok(row, `${table}:${id}`);
  return row;
};
const md5 = (text) => createHash('md5').update(text).digest('hex');
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const equal = (a, b) => {
  try {
    assert.deepEqual(a, b);
    return true;
  } catch {
    return false;
  }
};
function fields(row, expected) {
  assert.ok(row);
  for (const [key, value] of Object.entries(expected))
    assert.deepEqual(key === 'uuid' ? String(row[key]) : row[key], value, `${row.id}/${key}`);
}
function metadata(row, expected = {}, absent = []) {
  assert.ok(object(row.meta_data));
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(row.meta_data[key], value);
  for (const key of absent) assert.equal(Object.hasOwn(row.meta_data, key), false, `${row.id}/absent/${key}`);
}
const tuple = (row) => ({
  description: row.description,
  craft_requirements: row.craft_requirements,
  source: row.meta_data?.source,
});
function ownerState(row, patch, terminal = false) {
  fields(row, patch.expected);
  metadata(row, {}, patch.metadata_absent);
  if (equal(tuple(row), patch.after)) return 'after';
  if (!terminal && equal(tuple(row), patch.before)) return 'before';
  assert.fail('Unreviewed complete Noisome state');
}
/** A captured R fixture may only gain the already-reviewed 003 identity; all three text/citation leaves move together. */
function ownerAt(stored, patch, state) {
  const row = structuredClone(stored);
  if (
    equal(tuple(row), patch.raw) &&
    row.id === 12659 &&
    row.name === 'Wand of Noisome Acid (4nd-Level Spell)' &&
    String(row.uuid) === '7778569537178750'
  ) {
    row.name = patch.expected.name;
    row.uuid = Number(patch.expected.uuid);
  }
  fields(row, patch.expected);
  metadata(row, {}, patch.metadata_absent);
  assert.ok(
    [patch.raw, patch.before, patch.after].some((s) => equal(tuple(row), s)),
    'captured complete state'
  );
  Object.assign(row, { description: patch[state].description, craft_requirements: patch[state].craft_requirements });
  row.meta_data.source = structuredClone(patch[state].source);
  ItemSchema.parse(row);
  return row;
}
const originals = spec.items.map((p) => ownerAt(get('item', p.id), p, 'before'));
const proposed = spec.items.map((p, i) => ownerAt(originals[i], p, 'after'));
const sources = spec.sources.map((s) => get('content_source', s.id));
const dependencies = spec.dependencies.map((d) => ({ table: d.table, row: get(d.table.replace('-', '_'), d.id) }));
const spells = dependencies.filter((d) => d.table === 'spell').map((d) => d.row);
function relevant(update) {
  if (['APPROVED', 'REJECTED'].includes(update.status?.state)) return false;
  const data = update.data;
  if (update.type === 'content-source')
    return spec.sources.some(
      (s) =>
        update.ref_id === s.id || String(data?.id) === String(s.id) || (update.ref_id == null && data?.name === s.name)
    );
  const identities =
    update.type === 'item'
      ? spec.items.map((p) => ({ id: p.id, name: p.expected.name, source: 16, uuid: p.expected.uuid }))
      : spec.dependencies
          .filter((d) => d.table === update.type)
          .map((d) => ({ id: d.id, name: d.name, source: d.source, uuid: d.expected.uuid }));
  return identities.some(
    (d) =>
      update.ref_id === d.id ||
      String(data?.id) === String(d.id) ||
      String(data?.uuid) === d.uuid ||
      ((update.content_source_id === d.source || String(data?.content_source_id) === String(d.source)) &&
        data?.name === d.name)
  );
}
function gates(sourceRows, dependencyRows, pending) {
  assert.equal(sourceRows.length, 2);
  assert.equal(dependencyRows.length, 4);
  assert.ok(!pending.some(relevant));
  for (const s of spec.sources)
    fields(
      sourceRows.find((row) => row.id === s.id),
      s
    );
  for (const d of spec.dependencies) {
    const row = dependencyRows.find((x) => x.table === d.table && x.row.id === d.id)?.row;
    fields(row, d.expected);
    metadata(row, d.metadata, d.metadata_absent);
  }
}
/** Clone model validates the whole batch before mutating copies; real SQL is rehearsed independently. */
function apply(input, sourceRows = sources, deps = dependencies, pending = [], failedCas) {
  gates(sourceRows, deps, pending);
  assert.equal(input.length, 4);
  for (const p of spec.items)
    ownerState(
      input.find((r) => r.id === p.id),
      p
    );
  return input.map((row) => {
    const p = spec.items.find((p) => p.id === row.id);
    if (ownerState(row, p) === 'after') return structuredClone(row);
    assert.notEqual(row.id, failedCas);
    return ownerAt(row, p, 'after');
  });
}
function terminal(input, sourceRows = sources, deps = dependencies, pending = []) {
  try {
    gates(sourceRows, deps, pending);
    assert.equal(input.length, 4);
    for (const p of spec.items)
      ownerState(
        input.find((r) => r.id === p.id),
        p,
        true
      );
    return true;
  } catch {
    return false;
  }
}
let engine;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true });
  engine.setFixtures(rows);
});
after(async () => engine?.cleanup());

test('four independently specified tier identities, prices and full coupled before/after hashes retain the 003 corrected UUID', () => {
  assert.deepEqual(spec, JSON.parse(release.split('$noisome$')[1]));
  assert.deepEqual(
    spec.items.map((p) => [p.id, p.rank, p.expected.level, p.expected.price.gp]),
    [
      [12658, 2, 6, 250],
      [12659, 4, 10, 1000],
      [12660, 6, 14, 4500],
      [12661, 8, 18, 24000],
    ]
  );
  assert.equal(spec.items[1].expected.uuid, '7611411327409832');
  for (const [i, p] of spec.items.entries()) {
    ItemSchema.parse(originals[i]);
    ItemSchema.parse(proposed[i]);
    for (const state of ['raw', 'before', 'after'])
      for (const leaf of ['description', 'craft_requirements'])
        assert.equal(md5(p[state][leaf]), p.hashes[leaf][state]);
    assert.deepEqual(
      {
        ...proposed[i],
        description: originals[i].description,
        craft_requirements: originals[i].craft_requirements,
        meta_data: { ...proposed[i].meta_data, source: originals[i].meta_data.source },
      },
      originals[i]
    );
    assert.deepEqual(p.after.source, {
      url: 'https://2e.aonprd.com/Equipment.aspx?ID=2284',
      book: 'Treasure Vault (Remastered)',
      page: '141',
    });
    assert.deepEqual(proposed[i].traits, [1528, 1504, 1665]);
    assert.equal(proposed[i].operations, null);
  }
});

test('four real dependency schemas retain canonical Acid Grip mechanics and absent Cast a Spell citation', () => {
  for (const s of sources) ContentSourceSchema.parse(s);
  for (const d of dependencies)
    ({ spell: SpellSchema, trait: TraitSchema, 'ability-block': AbilityBlockSchema })[d.table].parse(d.row);
  gates(sources, dependencies, []);
  const spell = get('spell', 4389);
  assert.deepEqual(
    [spell.name, spell.rank, spell.cast, spell.traditions, spell.defense, spell.range, spell.targets],
    ['Acid Grip', 2, 'TWO-ACTIONS', ['arcane', 'primal'], 'Reflex', '120 feet', '1 creature']
  );
  assert.match(spell.description, /2d8/);
  assert.match(spell.description, /1d6/);
  assert.equal(get('ability_block', 19611).type, 'action');
  assert.equal(Object.hasOwn(get('ability_block', 19611).meta_data, 'source'), false);
});

test('actual cache helper, cast parser and RichText resolve all twenty references at ranks 2/4/6/8 with four sickened riders', () => {
  let linkCount = 0;
  for (const [i, row] of proposed.entries()) {
    const p = spec.items[i];
    for (const [type, name, label, id] of [
      ['spell', 'Acid Grip', 'acid grip', 4389],
      ['action', 'Cast a Spell', 'Cast a Spell', 19611],
      ['trait', 'Acid', 'acid', 1528],
      ['trait', 'Olfactory', 'olfactory', 2131],
    ]) {
      const expected = `[${label}](link_${type}_${id})`;
      assert.equal(engine.convertToHardcodedLink(type, name, label), expected);
      assert.ok(row.description.includes(expected));
    }
    const craftLink = engine.convertToHardcodedLink('spell', 'Acid Grip', 'acid grip');
    assert.equal(craftLink, '[acid grip](link_spell_4389)');
    assert.ok(row.craft_requirements.includes(craftLink));
    assert.deepEqual(engine.detectSpells(originals[i].description, spells, true), []);
    const found = engine.detectSpells(row.description, spells, true);
    assert.equal(found.length, 1);
    assert.equal(found[0].spell.id, 4389);
    assert.equal(found[0].rank, p.rank);
    assert.equal(found[0].spell.rank, p.rank);
    assert.equal(engine.detectSpells(row.craft_requirements, spells, true)[0].spell.id, 4389);
    for (const leaf of ['description', 'craft_requirements']) {
      const html = engine.renderRichText(row[leaf]);
      assert.match(html, /<em><a\b[^>]*>acid grip<\/a><\/em>/);
      assert.doesNotMatch(html, /\[\[|@UUID|link_condition_/);
      linkCount += [...row[leaf].matchAll(/link_(?:spell|action|trait)_\d+/g)].length;
    }
    const html = engine.renderRichText(row.description);
    assert.match(html, /<a\b[^>]*>sickened<\/a> 1/);
    assert.doesNotMatch(engine.renderRichText(row.description, ['sickened']), />sickened<\/a>/);
    assert.match(row.description, /initial \[acid\].*damage from this spell become sickened 1/);
    assert.match(row.description, /Use your spell DC if the creature attempts to recover/);
    assert.match(row.description, /once per day, plus overcharge/);
  }
  assert.equal(linkCount, 20);
});

test('all 32 within-row H/S cross-products reject six hybrids each; all 16 complete row-wise batch states repair and replay', () => {
  for (const [i, p] of spec.items.entries())
    for (let mask = 0; mask < 8; mask++) {
      const row = structuredClone(originals[i]);
      for (const [bit, leaf] of ['description', 'craft_requirements', 'source'].entries()) {
        const value = (mask & (1 << bit) ? p.after : p.before)[leaf];
        if (leaf === 'source') row.meta_data.source = value;
        else row[leaf] = value;
      }
      if (mask === 0 || mask === 7) ownerState(row, p);
      else assert.throws(() => ownerState(row, p));
    }
  for (let mask = 0; mask < 16; mask++) {
    const input = spec.items.map((p, i) => ownerAt(proposed[i], p, mask & (1 << i) ? 'after' : 'before'));
    const frozen = structuredClone(input);
    assert.deepEqual(apply(input), proposed);
    assert.deepEqual(apply(apply(input)), proposed);
    assert.deepEqual(input, frozen);
    assert.equal(terminal(input), mask === 15);
  }
  const extended = originals.map((r) => ({
    ...structuredClone(r),
    meta_data: { ...r.meta_data, future_extension: { nested: [null, 42] } },
  }));
  for (const [i, r] of apply(extended).entries())
    assert.deepEqual(r.meta_data.future_extension, extended[i].meta_data.future_extension);
});

test('identity/mechanics/null metadata/known-absent flags and complete dependency drift reject before and after', () => {
  for (const baseline of [originals, proposed]) {
    for (const changes of [
      { name: null },
      { uuid: null },
      { level: 1 },
      { price: { gp: 1 } },
      { traits: [] },
      { operations: [] },
      { meta_data: null },
      { meta_data: [] },
      { meta_data: { source: null } },
      { description: null },
      { craft_requirements: null },
    ]) {
      const input = structuredClone(baseline);
      Object.assign(input[3], changes);
      assert.throws(() => apply(input));
      assert.equal(terminal(input), false);
    }
    for (const key of spec.items[3].metadata_absent) {
      const input = structuredClone(baseline);
      input[3].meta_data[key] = null;
      assert.throws(() => apply(input));
    }
    const deps = structuredClone(dependencies);
    deps.find((d) => d.table === 'spell').row.defense = 'AC';
    assert.throws(() => apply(baseline, sources, deps));
    const action = structuredClone(dependencies);
    action.find((d) => d.table === 'ability-block').row.meta_data.source = null;
    assert.throws(() => apply(baseline, sources, action));
    const changedSources = structuredClone(sources);
    changedSources[0].is_published = false;
    assert.throws(() => apply(baseline, changedSources));
  }
  assert.throws(() => apply(originals.slice(0, 3)));
  assert.throws(() => apply(originals, sources, dependencies, [], 12661));
});

test('partial pending, payload source, UUID and malformed status block before replay; completed/unrelated controls remain accepted', () => {
  const targets = [
    ...spec.items.map((p) => ({ type: 'item', id: p.id, source: 16, name: p.expected.name, uuid: p.expected.uuid })),
    ...spec.dependencies.map((d) => ({
      type: d.table,
      id: d.id,
      source: d.source,
      name: d.name,
      uuid: d.expected.uuid,
    })),
    ...spec.sources.map((s) => ({ type: 'content-source', ...s })),
  ];
  for (const target of targets)
    for (const data of [
      {},
      { id: String(target.id) },
      { uuid: target.uuid },
      { name: target.name, content_source_id: target.source },
    ])
      for (const state of ['PENDING', 'UNKNOWN', null]) {
        const update = {
          type: target.type,
          ref_id: target.id,
          content_source_id: 999,
          data,
          status: state === null ? {} : { state },
        };
        for (const input of [originals, proposed]) assert.throws(() => apply(input, sources, dependencies, [update]));
        for (const state of ['APPROVED', 'REJECTED'])
          assert.ok(terminal(proposed, sources, dependencies, [{ ...update, status: { state } }]));
      }
  for (const target of targets) {
    const payloads = [{ id: String(target.id) }, { name: target.name, content_source_id: target.source }];
    if (target.uuid) payloads.push({ uuid: target.uuid });
    for (const data of payloads) {
      const create = {
        type: target.type,
        ref_id: null,
        content_source_id: 999,
        data,
        action: 'CREATE',
        status: { state: 'PENDING' },
      };
      for (const input of [originals, proposed]) assert.throws(() => apply(input, sources, dependencies, [create]));
      assert.equal(terminal(proposed, sources, dependencies, [create]), false);
    }
  }
  assert.ok(
    terminal(proposed, sources, dependencies, [{ type: 'item', ref_id: -1, data: {}, status: { state: 'PENDING' } }])
  );
});

const stableStore = (store) => ({
  ...store,
  history: Object.fromEntries(
    Object.entries(store.history).map(([key, values]) => [key, values.map(({ timestamp, ...value }) => value)])
  ),
});
async function calculate(items) {
  engine.clearOperationErrorNotifications();
  const result = await engine._executeCharacterOperations({
    character: {
      ...summoner(items),
      companions: { list: [] },
      content_sources: { enabled: [16] },
      operation_data: { selections: { preserved: 'selection' } },
    },
    content: {
      ...emptyContent,
      items: proposed,
      spells,
      sources,
      traits: dependencies.filter((d) => d.table === 'trait').map((d) => d.row),
      abilityBlocks: [],
    },
    context: 'CHARACTER-SHEET',
  });
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  return result;
}
test('real passive controller, saved copies, ownership/removal/containers and source-isolated wand availability remain unchanged', async () => {
  for (const flags of [{}, { is_equipped: true }, { is_formula: true }]) {
    const oldItems = originals.map((r) => inventoryItem(structuredClone(r), flags)),
      nextItems = proposed.map((r) => inventoryItem(structuredClone(r), flags));
    const saved = {
        inventory: { coins: { cp: 1, sp: 2, gp: 3, pp: 4 }, items: oldItems },
        selections: { preserved: 'selection' },
        dependencies: structuredClone(dependencies),
      },
      frozen = structuredClone(saved);
    InventorySchema.parse(saved.inventory);
    for (const variant of [
      (items) => items,
      (items) => [...items].reverse(),
      () => [],
      (items) => [inventoryItem({ ...structuredClone(proposed[0]), traits: [] }, { container_contents: items })],
    ]) {
      const a = await calculate(variant(oldItems)),
        b = await calculate(variant(nextItems));
      assert.deepEqual(stableStore(a.store), stableStore(b.store));
      assert.deepEqual(a.ors, b.ors);
      assert.deepEqual(a.errors, b.errors);
    }
    assert.deepEqual(saved, frozen);
    assert.equal(engine.filterByTraitType(nextItems, 'WAND').length, 4);
    assert.deepEqual(engine.getInventorySpellIds(nextItems), [4389]);
  }
  const normal = spells.filter((s) => s.content_source_id === 16);
  assert.deepEqual(normal, []);
  assert.deepEqual(engine.getMissingSpellIds(normal, [4389]), [4389]);
  assert.equal(engine.mergeSpellDependencies(normal, spells, []), normal);
  assert.deepEqual(engine.getInventorySpellIds([]), []);
});

test('SQL preserves narrow ownership, validates every row before write, strict CAS/readback and complete terminal release', () => {
  const childPrelockStart = migration.indexOf('-- Acquire reviewed content rows before source cache locks.');
  const childPrelockEnd = migration.indexOf('-- End reviewed content row prelocks.');
  assert.ok(migration.indexOf('lock table public.content_update') < childPrelockStart);
  assert.ok(
    childPrelockStart < childPrelockEnd &&
      childPrelockEnd < migration.indexOf('from public.content_source', migration.indexOf('\nbegin\n'))
  );
  const childPrelocks = migration.slice(childPrelockStart, childPrelockEnd);
  assert.doesNotMatch(childPrelocks, /\b(?:update|insert|delete)\s+public\.|\b(?:continue|return)\b/i);
  assert.match(
    childPrelocks,
    /public\.item i[\s\S]*?jsonb_array_elements\(spec->'items'\)[\s\S]*?order by i\.id for update/
  );
  for (const [table, type, alias] of [
    ['ability_block', 'ability-block', 'a'],
    ['spell', 'spell', 's'],
    ['trait', 'trait', 't'],
  ]) {
    assert.match(
      childPrelocks,
      new RegExp(
        `public\\.${table} ${alias}[\\s\\S]*?jsonb_array_elements\\(spec->'dependencies'\\)[\\s\\S]*?where d->>'table' = '${type}'[\\s\\S]*?order by ${alias}\\.id for share;`
      )
    );
  }
  const body = migration.split('$noisome$')[2];
  assert.match(body, /lock table public\.content_update in share mode/);
  assert.match(body, /coalesce\(u\.status->>'state','PENDING'\) not in \('APPROVED','REJECTED'\)/);
  assert.ok(body.indexOf('Validate and lock every complete H/S owner') < body.indexOf('update public.item'));
  assert.match(body, /changed_rows<>1/);
  assert.match(body, /saved_after is distinct from expected_after/);
  assert.match(body, /captured_rows:=jsonb_set\(captured_rows/);
  assert.match(body, /is distinct from captured_rows->\(patch->>'id'\)/);
  assert.match(body, /expected_after:=expected_terminal->\(patch->>'id'\)/);
  assert.match(body, /is not distinct from captured_rows->\(patch->>'id'\)/);
  assert.match(body, /saved_after is distinct from expected_terminal->\(patch->>'id'\)/);
  assert.ok(
    body.indexOf('captured baseline changed before write') < body.indexOf("if jsonb_build_object('description'")
  );
  assert.match(body, /jsonb_set\(i\.meta_data,'\{source\}'/);
  assert.doesNotMatch(
    body,
    /update public\.(spell|trait|ability_block|character|content_source)|set (?:name|uuid|traits|operations)\s*=/
  );
  assert.match(release, /count\(distinct i\.id\)=4/);
  assert.match(release, /is true/);
});
