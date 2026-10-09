import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { ItemSchema, InventorySchema } from '../src/schemas/content.ts';
import { createOperationEngine, readHistoricalContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261001130000_treasure_vault_condition_references.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-condition-references.sql', import.meta.url),
  'utf8'
);
const patches = JSON.parse(migration.split('$patches$')[1]);
const noisome = JSON.parse(migration.split('$noisome$')[1]);
const prose = JSON.parse(migration.split('$prose$')[1]);
const releaseExpected = JSON.parse(release.split('$expected$')[1]);
const expectedIds = [
  11727, 11772, 11774, 11775, 11796, 11797, 11824, 11831, 11859, 11860, 11889, 11899, 11901, 11926, 11951, 11963, 11967,
  11971, 11987, 11988, 12006, 12012, 12013, 12024, 12028, 12039, 12060, 12061, 12096, 12098, 12105, 12106, 12119, 12133,
  12142, 12162, 12163, 12164, 12166, 12167, 12176, 12177, 12179, 12190, 12198, 12210, 12213, 12215, 12216, 12228, 12253,
  12254, 12255, 12256, 12263, 12266, 12284, 12286, 12299, 12315, 12331, 12332, 12341, 12342, 12343, 12377, 12379, 12401,
  12402, 12410, 12411, 12412, 12413, 12414, 12415, 12416, 12418, 12468, 12482, 12487, 12493, 12496, 12498, 12509, 12514,
  12519, 12520, 12521, 12522, 12533, 12534, 12535, 12536, 12537, 12541, 12550, 12576, 12631, 12632, 12633, 12634, 12635,
  12636, 12637, 12638, 12639, 12658, 12659, 12660, 12661, 12719,
];
// Independent PF2e registry expectation, not derived from migration labels or the runtime registry.
const conditions = new Set([
  'blinded',
  'broken',
  'clumsy',
  'concealed',
  'confused',
  'controlled',
  'dazzled',
  'deafened',
  'doomed',
  'drained',
  'dying',
  'encumbered',
  'enfeebled',
  'fascinated',
  'fatigued',
  'fleeing',
  'friendly',
  'frightened',
  'grabbed',
  'helpful',
  'hidden',
  'hostile',
  'immobilized',
  'indifferent',
  'invisible',
  'observed',
  'off-guard',
  'paralyzed',
  'persistent damage',
  'petrified',
  'prone',
  'quickened',
  'restrained',
  'sickened',
  'slowed',
  'stunned',
  'stupefied',
  'unconscious',
  'undetected',
  'unfriendly',
  'unnoticed',
  'wounded',
]);
const deferredIds = [12000, 12138, 12300, 12486, 12552, 12553];
const coveredIds = [...Array.from({ length: 14 }, (_, index) => 12605 + index), 12662, 12663, 12697, 12702];
const rows = await readHistoricalContentRows([
  ...[...expectedIds, ...deferredIds, ...coveredIds].map((id) => ({ table: 'item', id })),
  { table: 'content_source', id: 16 },
  ...prose.dependencies.map(({ table, id }) => ({ table, id })),
  ...prose.sources.map(({ id }) => ({ table: 'content_source', id })),
]);
const get = (table, id) => {
  const row = rows.find((entry) => entry.table === table && entry.row.id === id)?.row;
  assert.ok(row, `Missing ${table}:${id} fixture`);
  return row;
};
const source = get('content_source', 16);
const md5 = (value) => createHash('md5').update(value).digest('hex');
const exactCount = (value, literal) => value.split(literal).length - 1;
const noisomeTuple = (row) => ({
  description: row.description,
  craft_requirements: row.craft_requirements,
  source: row.meta_data?.source,
});
const same = (a, b) => {
  try {
    assert.deepEqual(a, b);
    return true;
  } catch {
    return false;
  }
};

// Separate approved 024 successor tuple; original historical content literals stay immutable.
const proseTuple = (row) => ({
  traits: row.traits,
  usage: row.usage,
  description: row.description,
  craft_requirements: row.craft_requirements,
  source: row.meta_data?.source,
});
function proseFields(row, expected) {
  assert.ok(row);
  for (const [key, value] of Object.entries(expected))
    assert.deepEqual(key === 'uuid' ? String(row[key]) : row[key], value);
}
function proseMetadata(row, expected, absent) {
  assert.ok(row.meta_data !== null && typeof row.meta_data === 'object' && !Array.isArray(row.meta_data));
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(row.meta_data[key], value);
  for (const key of absent) assert.equal(Object.hasOwn(row.meta_data, key), false);
}
function proseValidate(row, p) {
  proseFields(row, p.expected);
  proseMetadata(row, p.metadata, p.metadata_absent);
  assert.ok(
    [p.after, ...p.legacy_states].some((s) => same(proseTuple(row), s)),
    'complete historical or B tuple'
  );
  return same(proseTuple(row), p.after);
}
function proseRelevant(u) {
  if (['APPROVED', 'REJECTED'].includes(u.status?.state)) return false;
  if (u.type === 'content-source')
    return prose.sources.some(
      (s) => u.ref_id === s.id || String(u.data?.id) === String(s.id) || u.data?.name === s.name
    );
  return [
    ...prose.items.map((p) => ({ ...p.expected, type: 'item' })),
    ...prose.dependencies.map((d) => ({ ...d.expected, type: d.type })),
  ].some(
    (d) =>
      u.type === d.type &&
      (u.ref_id === d.id ||
        String(u.data?.id) === String(d.id) ||
        String(u.data?.uuid) === d.uuid ||
        ((u.content_source_id === d.content_source_id ||
          String(u.data?.content_source_id) === String(d.content_source_id)) &&
          u.data?.name === d.name))
  );
}
const proseSources = prose.sources.map((s) => get('content_source', s.id));
const proseDependencies = prose.dependencies.map((d) => get(d.table, d.id));
function proseGates(pending = [], sourceRows = proseSources, deps = proseDependencies) {
  assert.equal(sourceRows.length, 3);
  assert.equal(deps.length, 23);
  assert.ok(!pending.some(proseRelevant));
  for (const s of prose.sources)
    proseFields(
      sourceRows.find((r) => r.id === s.id),
      s
    );
  for (const d of prose.dependencies) {
    const row = deps.find((r) => r.id === d.id && String(r.uuid) === d.expected.uuid);
    proseFields(row, d.expected);
    proseMetadata(row, d.metadata, d.metadata_absent);
  }
}
function proseRaw(row, p) {
  const result = structuredClone(row);
  if (proseValidate(result, p)) {
    const { source, ...leaves } = structuredClone(p.raw);
    Object.assign(result, leaves);
    result.meta_data.source = source;
  }
  return result;
}

function completeSuccessor(row, successor) {
  if (!same(noisomeTuple(row), successor.after)) return false;
  for (const [key, value] of Object.entries(successor.expected))
    assert.deepEqual(key === 'uuid' ? String(row[key]) : row[key], value);
  for (const key of successor.metadata_absent) assert.equal(Object.hasOwn(row.meta_data, key), false);
  assert.equal(md5(successor.after.description), successor.hashes.description.after);
  assert.equal(md5(successor.after.craft_requirements), successor.hashes.craft_requirements.after);
  return true;
}

/** Normalize only the already-reviewed paired 003 identity; never invert repeated plain conditions. */
function reviewedBefore(stored, patch) {
  const p = prose.items.find((p) => p.id === stored.id);
  const row = p ? proseRaw(stored, p) : structuredClone(stored);
  const successor = noisome.find((p) => p.id === row.id);
  if (successor && completeSuccessor(row, successor)) {
    row.description = successor.raw.description;
    row.craft_requirements = successor.raw.craft_requirements;
    row.meta_data.source = structuredClone(successor.raw.source);
  }
  if (successor)
    assert.ok(
      [successor.raw, successor.before].some((state) => same(noisomeTuple(row), state)),
      'complete historical tuple before reconstruction'
    );
  if (row.id === 12659) {
    assert.ok(
      (row.name === 'Wand of Noisome Acid (4nd-Level Spell)' && String(row.uuid) === '7778569537178750') ||
        (row.name === 'Wand of Noisome Acid (4th-Level Spell)' && String(row.uuid) === '7611411327409832')
    );
    row.name = 'Wand of Noisome Acid (4th-Level Spell)';
    row.uuid = 7611411327409832;
  }
  assert.ok(
    [patch.description.before, patch.description.after].includes(md5(row.description)),
    `${patch.id} dump leaf drift`
  );
  row.description = patch.description.before_text;
  return row;
}

/** Model the narrow SQL gates and exact leaf CAS without changing any other field. */
function repaired(stored, patch, pending = [], currentSource = source) {
  proseGates(pending);
  assert.deepEqual(
    [currentSource.id, currentSource.name, currentSource.user_id, currentSource.is_published],
    [16, 'Treasure Vault', null, true]
  );
  assert.ok(
    !pending.some(
      (entry) =>
        entry.status?.state === 'PENDING' &&
        ((entry.type === 'item' && entry.ref_id === stored.id) ||
          (entry.type === 'content-source' && entry.ref_id === 16))
    )
  );
  const row = structuredClone(stored);
  assert.deepEqual(
    [row.id, row.name, String(row.uuid), row.content_source_id, row.level],
    [patch.id, patch.name, patch.uuid, patch.source, patch.level]
  );
  assert.ok(row.meta_data && typeof row.meta_data === 'object' && !Array.isArray(row.meta_data));
  let afterText = patch.description.before_text;
  assert.equal(md5(afterText), patch.description.before);
  for (const replacement of patch.description.replacements) {
    assert.equal(exactCount(afterText, replacement.from), replacement.count);
    afterText = afterText.replaceAll(replacement.from, replacement.to);
  }
  assert.equal(md5(afterText), patch.description.after);
  const prosePatch = prose.items.find((p) => p.id === row.id);
  if (prosePatch && proseValidate(row, prosePatch)) return row;
  const successor = noisome.find((p) => p.id === row.id);
  if (successor) {
    if (completeSuccessor(row, successor)) return row;
    assert.ok(
      [successor.raw, successor.before].some((state) => same(noisomeTuple(row), state)),
      'Noisome complete legacy tuple'
    );
  }
  assert.deepEqual(row.meta_data.source, patch.citation);
  assert.ok(row.description === patch.description.before_text || row.description === afterText);
  row.description = afterText;
  return row;
}

// Model strict release: a valid repair input is not terminal unless it already remains unchanged.
const conditionTerminal = (row, patch) => {
  try {
    return same(repaired(row, patch), row);
  } catch {
    return false;
  }
};
const originals = patches.map((patch) => reviewedBefore(get('item', patch.id), patch));
const proposed = patches.map((patch, index) => repaired(originals[index], patch));
let engine;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true });
  engine.setFixtures(rows);
});
after(async () => engine?.cleanup());

test('exact 111 owning descriptions contain 216 independent canonical condition literals, with matching strict release identities', () => {
  assert.deepEqual(
    patches.map(({ id }) => id),
    expectedIds
  );
  assert.equal(new Set(expectedIds).size, 111);
  assert.equal(
    patches
      .flatMap((patch) => patch.description.replacements)
      .reduce((total, replacement) => total + replacement.count, 0),
    216
  );
  assert.deepEqual(
    releaseExpected,
    patches.map(({ description, ...identity }) => ({ ...identity, description_md5: description.after }))
  );
  for (const patch of patches) {
    assert.equal(patch.source, 16);
    for (const replacement of patch.description.replacements) {
      const parsed = /^\[\[([A-Za-z -]+)\]\](?:\{([^}]+)\})?$/.exec(replacement.from.replaceAll('\\', ''));
      assert.ok(parsed);
      const name = parsed[1].toLowerCase();
      const display = (parsed[2] ?? parsed[1]).toLowerCase();
      assert.ok(conditions.has(name));
      assert.match(display, new RegExp(`^${name}(?: [1-9][0-9]*)?$`));
      assert.equal(replacement.to, display);
      assert.ok(replacement.count > 0);
      assert.doesNotMatch(replacement.to, /link_condition_|\[|\]|\{/);
    }
  }
});

test('all 222 actual-schema full clones change only description and accept reconstructed already-after sanitized fixtures', () => {
  for (const [index, patch] of patches.entries()) {
    const beforeRow = originals[index],
      afterRow = proposed[index];
    ItemSchema.parse(beforeRow);
    ItemSchema.parse(afterRow);
    assert.deepEqual({ ...afterRow, description: beforeRow.description }, beforeRow);
    assert.deepEqual(repaired(afterRow, patch), afterRow);
    assert.deepEqual(reviewedBefore(afterRow, patch), beforeRow);
    assert.equal(md5(beforeRow.description), patch.description.before);
    assert.equal(md5(afterRow.description), patch.description.after);
    assert.deepEqual(afterRow.operations, beforeRow.operations);
    assert.deepEqual(afterRow.meta_data, beforeRow.meta_data);
    assert.doesNotMatch(afterRow.description, /link_condition_/);
  }
});

test('actual RichText renders every changed condition occurrence and respects the real condition blacklist', () => {
  for (const [index, patch] of patches.entries()) {
    const labelCounts = new Map();
    for (const replacement of patch.description.replacements) {
      const name = replacement.to.replace(/ [1-9][0-9]*$/, '');
      labelCounts.set(name, (labelCounts.get(name) ?? 0) + replacement.count);
      assert.ok(engine.getConditionByName(name));
    }
    const beforeHtml = engine.renderRichText(originals[index].description);
    const afterHtml = engine.renderRichText(proposed[index].description);
    const blacklistHtml = engine.renderRichText(proposed[index].description, [...labelCounts.keys()]);
    for (const [name, count] of labelCounts) {
      const anchor = new RegExp(`<a\\b[^>]*>${name}<\\/a>`, 'g');
      assert.equal(
        (afterHtml.match(anchor) ?? []).length - (beforeHtml.match(anchor) ?? []).length,
        count,
        `${patch.id}/${name}`
      );
      assert.equal((blacklistHtml.match(anchor) ?? []).length, 0);
    }
  }
});

test('every distinct condition/value remains exact lowercase prose and renders its unchanged numeric suffix', () => {
  for (const text of new Set(patches.flatMap((patch) => patch.description.replacements.map(({ to }) => to)))) {
    const name = text.replace(/ [1-9][0-9]*$/, '');
    const html = engine.renderRichText(text);
    assert.match(html, new RegExp(`<a\\b[^>]*>${name}<\\/a>`));
    const value = text.slice(name.length);
    if (value) assert.ok(html.includes(`</a>${value}`));
    assert.doesNotMatch(engine.renderRichText(text, [name]), /<a\b/);
  }
});

test('006 usage/bulk combinations and 002 traits survive condition updates and both replay orders', () => {
  const scalePatch = patches.find(({ id }) => id === 12377),
    orbPatch = patches.find(({ id }) => id === 12514);
  for (const usage of [null, 'held in 1 hand'])
    for (const bulk of ['0.1', '1']) {
      const scale = { ...structuredClone(originals[patches.indexOf(scalePatch)]), usage };
      const orb = { ...structuredClone(originals[patches.indexOf(orbPatch)]), bulk };
      for (const [row, patch, field] of [
        [scale, scalePatch, 'usage'],
        [orb, orbPatch, 'bulk'],
      ]) {
        const afterRow = repaired(row, patch);
        ItemSchema.parse(afterRow);
        assert.equal(afterRow[field], row[field]);
        assert.deepEqual(repaired(afterRow, patch), afterRow);
        const after006 = { ...afterRow, [field]: field === 'usage' ? 'held in 1 hand' : '1' };
        assert.deepEqual(repaired(after006, patch), after006);
      }
    }
  const skinsawPatch = patches.find(({ id }) => id === 12410);
  for (const traits of [
    [1475, 1577, 1527],
    [1475, 1846, 1527],
  ]) {
    const row = { ...structuredClone(originals[patches.indexOf(skinsawPatch)]), traits };
    const afterRow = repaired(row, skinsawPatch);
    ItemSchema.parse(afterRow);
    assert.deepEqual(afterRow.traits, traits);
    assert.deepEqual(repaired(afterRow, skinsawPatch), afterRow);
  }
});

test('003 requires its complete corrected paired identity, while all unrelated metadata and fields are preserved', () => {
  const patch = patches.find(({ id }) => id === 12659),
    row = originals[patches.indexOf(patch)];
  assert.deepEqual([patch.name, patch.uuid], ['Wand of Noisome Acid (4th-Level Spell)', '7611411327409832']);
  assert.throws(() => repaired({ ...row, name: 'Wand of Noisome Acid (4nd-Level Spell)' }, patch));
  assert.throws(() => repaired({ ...row, uuid: 7778569537178750 }, patch));
  assert.throws(() => reviewedBefore({ ...row, uuid: 7778569537178750 }, patch));
  const extended = structuredClone(row);
  extended.meta_data.condition_repair_preservation = { custom: true, values: [1, 2, 3] };
  extended.bulk = '2';
  const afterRow = repaired(extended, patch);
  ItemSchema.parse(afterRow);
  assert.deepEqual({ ...afterRow, description: extended.description }, extended);
});

test('pending item partial UPDATE/DELETE data={} and source submissions block before and already-after replay', () => {
  for (const action of ['UPDATE', 'DELETE'])
    for (const state of [originals[0], proposed[0]]) {
      assert.throws(() =>
        repaired(state, patches[0], [
          { type: 'item', ref_id: state.id, content_source_id: 16, action, data: {}, status: { state: 'PENDING' } },
        ])
      );
      assert.throws(() =>
        repaired(state, patches[0], [
          { type: 'content-source', ref_id: 16, content_source_id: 16, action, data: {}, status: { state: 'PENDING' } },
        ])
      );
    }
  assert.deepEqual(
    repaired(proposed[0], patches[0], [{ type: 'item', ref_id: -1, status: { state: 'PENDING' } }]),
    proposed[0]
  );
  assert.deepEqual(
    repaired(proposed[0], patches[0], [{ type: 'item', ref_id: proposed[0].id, status: { state: 'APPROVED' } }]),
    proposed[0]
  );
});

test('identity, source, citation, null/malformed metadata and changed before/after prose fail closed', () => {
  const patch = patches.at(-1);
  for (const base of [originals.at(-1), proposed.at(-1)]) {
    for (const changes of [
      { id: -1 },
      { name: `${base.name} drift` },
      { uuid: -1 },
      { content_source_id: 3 },
      { level: -1 },
      { meta_data: null },
      { meta_data: [] },
      { meta_data: 'scalar' },
      { meta_data: { source: null } },
      { meta_data: { ...base.meta_data, source: { ...base.meta_data.source, url: 'https://example.invalid/' } } },
      { description: `${base.description} curator edit` },
      { description: null },
    ])
      assert.throws(() => repaired({ ...base, ...changes }, patch));
    for (const change of [
      { id: 3 },
      { name: 'Different source' },
      { user_id: '00000000-0000-0000-0000-000000000001' },
      { is_published: false },
    ])
      assert.throws(() => repaired(base, patch, [], { ...source, ...change }));
  }
});

test('saved full inventories/selections and six deferred/33 already-reviewed occurrences stay untouched', () => {
  const inventory = {
    coins: { cp: 1, sp: 2, gp: 3, pp: 4 },
    items: originals.map((item) => ({
      id: `saved-${item.id}`,
      item: structuredClone(item),
      is_formula: false,
      is_equipped: true,
      is_invested: true,
      is_implanted: false,
      container_contents: [],
    })),
  };
  InventorySchema.parse(inventory);
  const selections = originals.map(({ id, uuid }) => ({
    saved_item_id: id,
    saved_uuid: uuid,
    selection_id: `selection-${id}`,
  }));
  const savedInventory = JSON.stringify(inventory),
    savedSelections = JSON.stringify(selections);
  const excluded = [...deferredIds, ...coveredIds].map((id) => structuredClone(get('item', id)));
  const savedExcluded = JSON.stringify(excluded);
  for (const [index, patch] of patches.entries()) repaired(originals[index], patch);
  assert.equal(JSON.stringify(inventory), savedInventory);
  InventorySchema.parse(inventory);
  assert.equal(JSON.stringify(selections), savedSelections);
  assert.equal(JSON.stringify(excluded), savedExcluded);
  assert.ok([...deferredIds, ...coveredIds].every((id) => !expectedIds.includes(id)));
});

test('SQL owns only one leaf update, checks the frozen queue before replay, and strict release covers every owner', () => {
  assert.match(migration, /lock table public\.content_update in share mode/);
  assert.match(migration, /u\.type = 'content-source' and u\.ref_id = 16/);
  assert.match(migration, /u\.ref_id = item_row\.id/);
  assert.ok(
    migration.indexOf('Condition item has a pending curator submission') <
      migration.indexOf('if item_row.description = repaired_text then continue')
  );
  assert.equal((migration.match(/update public\.item set /g) ?? []).length, 1);
  assert.match(migration, /update public\.item set description = repaired_text/);
  assert.match(migration, /description is not distinct from reviewed_text/);
  assert.doesNotMatch(migration, /set (?:meta_data|operations|traits|name|uuid|content_source_id|usage|bulk)\s*=/);
  assert.match(release, /count\(\*\) = 111/);
  assert.match(release, /coalesce\(/);
  assert.match(release, /md5\(i\.description\) = patch->>'description_md5'/);
  assert.match(release, /u\.ref_id in \(select \(patch->>'id'\)::bigint from expected\)/);
  assert.match(release, /u\.type = 'content-source' and u\.ref_id = 16/);
});

test('020 four complete successors no-op without downgrade; hybrids and original 003 identity fail, pending remains checked first', () => {
  assert.deepEqual(noisome, JSON.parse(release.split('$noisome$')[1]));
  for (const successor of noisome) {
    const patch = patches.find((p) => p.id === successor.id),
      original = originals[patches.indexOf(patch)];
    assert.equal(successor.raw.description, patch.description.before_text);
    assert.equal(successor.hashes.description.before, patch.description.after);
    const next = {
      ...structuredClone(original),
      description: successor.after.description,
      craft_requirements: successor.after.craft_requirements,
      meta_data: { ...original.meta_data, source: structuredClone(successor.after.source), future_key: { keep: true } },
    };
    assert.deepEqual(repaired(next, patch), next);
    assert.deepEqual(reviewedBefore(next, patch), {
      ...structuredClone(original),
      meta_data: { ...original.meta_data, future_key: { keep: true } },
    });
    ItemSchema.parse(next);
    assert.throws(() =>
      repaired(next, patch, [{ type: 'item', ref_id: next.id, data: {}, status: { state: 'PENDING' } }])
    );
    for (let mask = 1; mask < 7; mask++) {
      const mixed = structuredClone(next);
      for (const [bit, leaf] of ['description', 'craft_requirements', 'source'].entries()) {
        const value = (mask & (1 << bit) ? successor.after : successor.before)[leaf];
        if (leaf === 'source') mixed.meta_data.source = value;
        else mixed[leaf] = value;
      }
      assert.throws(() => repaired(mixed, patch));
      assert.throws(() => reviewedBefore(mixed, patch));
    }
    assert.throws(() => repaired({ ...next, bulk: '2' }, patch));
    if (next.id === 12659)
      assert.throws(() =>
        repaired({ ...next, name: 'Wand of Noisome Acid (4nd-Level Spell)', uuid: 7778569537178750 }, patch)
      );
  }
});

test('024 Curare/Freeze complete B successors preserve entire rows and immutable literals; no hybrid, pending or dependency bypass', () => {
  assert.deepEqual(prose, JSON.parse(release.split('$prose$')[1]));
  assert.equal(
    createHash('sha256').update(migration.split('$patches$')[1]).digest('hex'),
    '5a39d35511dac3eae2b2c5c1d4b90253514113d2fa569c23a3bbb221784e6ba9'
  );
  const intersected = prose.items.filter((p) => patches.some((patch) => patch.id === p.id)).map((p) => p.id);
  assert.deepEqual(intersected, [11901, 12024]);
  assert.ok(release.includes("patch->>'id' not in ('11901','12024')"));
  assert.ok(release.includes("exists(select 1 from prose_legacy_complete where id=patch->>'id')"));
  const equalTuple = (row, state) => same(proseTuple(row), state);
  for (const p of prose.items.filter((p) => [11901, 12024].includes(p.id))) {
    const patch = patches.find((patch) => patch.id === p.id);
    const next = {
      ...structuredClone(get('item', p.id)),
      ...structuredClone(p.expected),
      ...structuredClone(p.after),
      uuid: Number(p.expected.uuid),
      meta_data: {
        ...structuredClone(get('item', p.id).meta_data),
        source: structuredClone(p.after.source),
        future_key: { keep: [null, 42] },
      },
    };
    delete next.source;
    ItemSchema.parse(next);
    assert.deepEqual(repaired(next, patch), next);
    assert.ok(conditionTerminal(next, patch));
    for (const legacy of p.legacy_states) {
      const row = structuredClone(next);
      const { source, ...values } = structuredClone(legacy);
      Object.assign(row, values);
      row.meta_data.source = source;
      assert.equal(conditionTerminal(row, patch), md5(row.description) === patch.description.after);
    }
    assert.deepEqual(repaired(repaired(next, patch), patch), next);
    const normalized = reviewedBefore(next, patch);
    assert.equal(normalized.description, patch.description.before_text);
    assert.deepEqual(proseTuple(normalized), p.raw);
    for (let mask = 1; mask < 31; mask++) {
      const mixed = structuredClone(next);
      for (const [bit, key] of ['traits', 'usage', 'description', 'craft_requirements', 'source'].entries()) {
        const value = structuredClone((mask & (1 << bit) ? p.after : p.before_states.at(-1))[key]);
        if (key === 'source') mixed.meta_data.source = value;
        else mixed[key] = value;
      }
      if (equalTuple(mixed, p.after) || equalTuple(mixed, p.before_states.at(-1))) continue;
      assert.throws(() => repaired(mixed, patch));
      assert.equal(conditionTerminal(mixed, patch), false, 'strict release rejects every partial B tuple');
      assert.throws(() => reviewedBefore(mixed, patch));
    }
    for (const changes of [
      { operations: [] },
      { hands: '1' },
      { level: 0 },
      { usage: null },
      { usage: ' ' },
      { traits: null },
      { description: null },
      { meta_data: { ...next.meta_data, source: { ...p.after.source, extra: 'drift' } } },
    ])
      assert.throws(() => repaired({ ...next, ...changes }, patch));
    for (const key of p.metadata_absent) {
      const drift = structuredClone(next);
      drift.meta_data[key] = null;
      assert.throws(() => repaired(drift, patch));
    }

    for (const pending of [
      {
        type: 'item',
        ref_id: null,
        content_source_id: 999,
        data: { name: next.name, content_source_id: 16 },
        status: null,
      },
      { type: 'item', ref_id: null, data: { uuid: p.expected.uuid }, status: {} },
      { type: 'item', ref_id: next.id, data: {}, status: { state: 'UNKNOWN' } },
    ])
      assert.throws(() => repaired(next, patch, [pending]));
  }
  for (const [index, d] of prose.dependencies.entries()) {
    const deps = structuredClone(proseDependencies);
    deps[index].name += ' drift';
    assert.throws(() => proseGates([], proseSources, deps));
    assert.throws(() =>
      proseGates([
        { type: d.type, ref_id: null, content_source_id: 999, data: { uuid: d.expected.uuid }, status: null },
      ])
    );
  }
  for (const [index, s] of prose.sources.entries()) {
    const rows = structuredClone(proseSources);
    rows[index].is_published = false;
    assert.throws(() => proseGates([], rows));
  }
  const prelock = migration.indexOf('This pure initial pass');
  const parent = migration.indexOf('into prose_source_row from public.content_source');
  for (const table of ['item', 'trait', 'ability_block']) {
    const lock = migration.indexOf(`perform 1 from public.${table}`);
    assert.ok(prelock < lock && lock < parent);
  }
  assert.ok(migration.indexOf('Invalid condition after text/hash') < migration.indexOf('if prose_current=prose_patch'));
  const initialSnapshot = migration.indexOf('Snapshot the two shared prose owners before any historical write');
  assert.ok(initialSnapshot < migration.lastIndexOf('for patch in select value from jsonb_array_elements(patches)'));
  assert.ok(initialSnapshot < migration.indexOf('update public.item set description'));
  assert.ok(migration.includes("prose_captured,array[patch->>'id'],prose_initial_captured->(patch->>'id'),true"));
  const initialBGuard = migration.indexOf('Protect an initially complete B row even if an earlier write downgraded');
  assert.ok(migration.indexOf('Invalid condition after text/hash') < initialBGuard);
  assert.ok(initialBGuard < migration.indexOf("if prose_current=prose_patch->'after'"));
  assert.ok(migration.includes("'source',prose_saved#>'{meta_data,source}')=prose_patch->'after'"));
  assert.match(migration, /Historical prose successor initial captured baseline drift/);
  assert.match(migration, /Historical prose successor final captured readback drift/);
  assert.match(release, /exists\(select 1 from prose_complete where id=patch->>'id'\)/);
});
