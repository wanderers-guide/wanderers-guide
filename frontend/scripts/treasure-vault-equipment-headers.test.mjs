import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { ItemSchema, TraitSchema, InventorySchema, ContentSourceSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { content as emptyContent, inventoryItem, summoner } from './fixtures/eidolon.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261001210000_treasure_vault_equipment_headers.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-equipment-headers.sql', import.meta.url),
  'utf8'
);
const predecessor = JSON.parse(
  (
    await readFile(
      new URL('../../supabase/migrations/20261001130000_treasure_vault_condition_references.sql', import.meta.url),
      'utf8'
    )
  ).split('$patches$')[1]
);
const spec = JSON.parse(migration.split('$headers$')[1]);
const rows = await readContentRows([
  ...spec.items.map(({ id }) => ({ table: 'item', id })),
  ...spec.dependencies.map(({ id }) => ({ table: 'trait', id })),
  ...spec.sources.map(({ id }) => ({ table: 'content_source', id })),
  ...[1504, 1531, 1476, 1532, 1469, 1479, 2868, 1584].map((id) => ({ table: 'trait', id })),
]);
const get = (table, id) => {
  const row = rows.find((r) => r.table === table && r.row.id === id)?.row;
  assert.ok(row, `${table}:${id}`);
  return row;
};
const md5 = (text) => createHash('md5').update(text).digest('hex');
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
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
function metadata(row, expected, absent) {
  assert.ok(object(row.meta_data));
  for (const [key, value] of Object.entries(expected))
    assert.deepEqual(row.meta_data[key], value, `${row.id}/metadata/${key}`);
  for (const key of absent) assert.equal(Object.hasOwn(row.meta_data, key), false, `${row.id}/absent/${key}`);
}
function projection(row, p) {
  return { ...Object.fromEntries(Object.keys(p.before).map((k) => [k, row[k]])), description: row.description };
}
function validate(row, p, terminal = false) {
  fields(row, p.expected);
  metadata(row, p.metadata, p.metadata_absent);
  const value = projection(row, p);
  if (p.after_states.some((s) => equal(s, value))) return 'after';
  if (!terminal && p.before_states.some((s) => equal(s, value))) return 'before';
  assert.fail('Unreviewed complete equipment header state');
}
function cloneAt(p, state = 'before', descriptionIndex = 0) {
  const row = structuredClone(get('item', p.id));
  Object.assign(row, structuredClone(p[state]), { description: p.descriptions[descriptionIndex].text });
  validate(row, p);
  ItemSchema.parse(row);
  return row;
}
const originals = spec.items.map((p) => cloneAt(p));
const proposed = spec.items.map((p) => cloneAt(p, 'after'));
const sources = spec.sources.map((s) => get('content_source', s.id));
const dependencies = spec.dependencies.map((d) => get('trait', d.id));
function relevant(u) {
  if (['APPROVED', 'REJECTED'].includes(u.status?.state)) return false;
  if (u.type === 'content-source')
    return spec.sources.some(
      (s) => u.ref_id === s.id || String(u.data?.id) === String(s.id) || (u.ref_id == null && u.data?.name === s.name)
    );
  const identities =
    u.type === 'item'
      ? spec.items.map((p) => ({ id: p.id, name: p.expected.name, source: 16, uuid: p.expected.uuid }))
      : u.type === 'trait'
        ? spec.dependencies.map((d) => ({ id: d.id, name: d.name, source: 3, uuid: d.expected.uuid }))
        : [];
  return identities.some(
    (d) =>
      u.ref_id === d.id ||
      String(u.data?.id) === String(d.id) ||
      String(u.data?.uuid) === d.uuid ||
      ((u.content_source_id === d.source || String(u.data?.content_source_id) === String(d.source)) &&
        u.data?.name === d.name)
  );
}
function gates(sourceRows = sources, deps = dependencies, pending = []) {
  assert.equal(sourceRows.length, 2);
  assert.equal(deps.length, 9);
  assert.ok(!pending.some(relevant));
  for (const s of spec.sources)
    fields(
      sourceRows.find((r) => r.id === s.id),
      s
    );
  for (const d of spec.dependencies) {
    const row = deps.find((r) => r.id === d.id);
    fields(row, d.expected);
    metadata(row, d.metadata, d.metadata_absent);
  }
}
/** Pure clone model is not SQL proof; the actual PostgreSQL rehearsal is separate. */
function apply(input, sourceRows = sources, deps = dependencies, pending = [], failedCas) {
  gates(sourceRows, deps, pending);
  assert.equal(input.length, 8);
  assert.equal(new Set(input.map((r) => r.id)).size, 8);
  for (const p of spec.items)
    validate(
      input.find((r) => r.id === p.id),
      p
    );
  return input.map((row) => {
    const p = spec.items.find((p) => p.id === row.id);
    if (validate(row, p) !== 'after') assert.notEqual(row.id, failedCas);
    return { ...structuredClone(row), ...structuredClone(p.after) };
  });
}
function terminal(input, sourceRows = sources, deps = dependencies, pending = []) {
  try {
    gates(sourceRows, deps, pending);
    assert.equal(input.length, 8);
    for (const p of spec.items)
      validate(
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
  engine = await createOperationEngine();
  engine.setFixtures(rows);
});
after(async () => engine?.cleanup());

test('eight exact owners change only the ten independently specified header leaves with real schemas and citations preserved', () => {
  assert.deepEqual(spec, JSON.parse(release.split('$headers$')[1]));
  assert.deepEqual(
    spec.items.map((p) => [p.id, p.after]),
    [
      [11707, { traits: [1504, 1447], usage: 'worn gloves' }],
      [11779, { traits: [1531, 1564, 1476, 1529], bulk: '0.1' }],
      [11901, { traits: [1529, 1531, 1564, 1476, 1481] }],
      [12024, { traits: [1529, 1531, 1532, 1519] }],
      [12507, { traits: [1469, 1531, 1447, 1504, 1479, 2131] }],
      [12546, { traits: [1531, 1504, 2868, 1584, 1520] }],
      [12709, { traits: [1529, 1531, 1476, 1564, 1448] }],
      [12719, { traits: [1531, 1504, 1855] }],
    ]
  );
  assert.equal(
    spec.items.reduce((n, p) => n + Object.keys(p.after).length, 0),
    10
  );
  for (const [i, p] of spec.items.entries()) {
    ItemSchema.parse(originals[i]);
    ItemSchema.parse(proposed[i]);
    assert.deepEqual({ ...proposed[i], ...p.before }, originals[i]);
    assert.equal(proposed[i].operations, null);
    assert.equal(proposed[i].meta_data.source.url, p.evidence.legacy);
    for (const d of p.descriptions) assert.equal(md5(d.text), d.md5);
    assert.deepEqual(
      p.before_states,
      p.descriptions.map((d) => ({ ...p.before, description: d.text }))
    );
    assert.deepEqual(
      p.after_states,
      p.descriptions.map((d) => ({ ...p.after, description: d.text }))
    );
  }
  assert.ok(proposed.find((r) => r.id === 12507).traits.includes(1447), 'existing Illusion retained');
  for (const s of sources) ContentSourceSchema.parse(s);
  for (const d of dependencies) TraitSchema.parse(d);
});

test('three exact 013 description predecessor pairs are preserved independently from complete coupled header states', () => {
  assert.deepEqual(
    spec.items.filter((p) => p.descriptions.length === 2).map((p) => p.id),
    [11901, 12024, 12719]
  );
  for (const p of spec.items.filter((p) => p.descriptions.length === 2)) {
    const old = predecessor.find((r) => r.id === p.id);
    let text = old.description.before_text;
    assert.equal(text, p.descriptions[0].text);
    for (const r of old.description.replacements) {
      assert.equal(text.split(r.from).length - 1, r.count);
      text = text.split(r.from).join(r.to);
    }
    assert.equal(text, p.descriptions[1].text);
    assert.equal(md5(text), old.description.after);
    for (let index = 0; index < 2; index++) {
      const before = spec.items.map((q) => cloneAt(q, 'before', q.id === p.id ? index : 0));
      assert.equal(apply(before).find((r) => r.id === p.id).description, p.descriptions[index].text);
    }
  }
  for (const p of spec.items.filter((p) => Object.keys(p.after).length === 2)) {
    const keys = Object.keys(p.after);
    for (const key of keys) {
      const row = cloneAt(p);
      row[key] = structuredClone(p.after[key]);
      assert.throws(() => validate(row, p), 'partial multi-leaf repair rejected');
    }
  }
  const poison = cloneAt(spec.items.find((p) => p.id === 12709));
  poison.traits.push(1564);
  assert.throws(
    () =>
      validate(
        poison,
        spec.items.find((p) => p.id === 12709)
      ),
    'both new poison traits move together'
  );
});

test('all 256 complete row-wise before/after mixtures repair and replay without mutating input or future metadata', () => {
  for (let mask = 0; mask < 256; mask++) {
    const input = spec.items.map((p, i) => cloneAt(p, mask & (1 << i) ? 'after' : 'before'));
    const frozen = structuredClone(input);
    assert.deepEqual(apply(input), proposed);
    assert.deepEqual(apply(apply(input)), proposed);
    assert.deepEqual(input, frozen);
    assert.equal(terminal(input), mask === 255);
  }
  const input = originals.map((r) => ({
    ...structuredClone(r),
    meta_data: { ...r.meta_data, future_extension: { nested: [null, 42] } },
  }));
  for (const [i, r] of apply(input).entries())
    assert.deepEqual(r.meta_data.future_extension, input[i].meta_data.future_extension);
});

test('NULL/drift/metadata flags and changed official dependency/source reject before write and no-op replay', () => {
  for (const baseline of [originals, proposed]) {
    for (const changes of [
      { name: null },
      { uuid: null },
      { level: 1 },
      { price: { gp: 1 } },
      { traits: null },
      { operations: [] },
      { description: null },
      { meta_data: null },
      { meta_data: [] },
    ]) {
      const input = structuredClone(baseline);
      Object.assign(input[7], changes);
      assert.throws(() => apply(input));
      assert.equal(terminal(input), false);
    }
    for (const key of spec.items[7].metadata_absent) {
      const input = structuredClone(baseline);
      input[7].meta_data[key] = null;
      assert.throws(() => apply(input));
      assert.equal(terminal(input), false);
    }
    const deps = structuredClone(dependencies);
    deps[8].meta_data.source = null;
    assert.throws(() => apply(baseline, sources, deps));
    const sourceRows = structuredClone(sources);
    sourceRows[0].is_published = false;
    assert.throws(() => apply(baseline, sourceRows));
  }
  assert.throws(() => apply(originals.slice(0, 7)));
  assert.throws(() => apply(originals, sources, dependencies, [], 12719));
});

test('pending identities, CREATE queue/payload sources and malformed status block first apply and replay, completed controls do not', () => {
  const targets = [
    ...spec.items.map((p) => ({ type: 'item', id: p.id, source: 16, name: p.expected.name, uuid: p.expected.uuid })),
    ...spec.dependencies.map((d) => ({ type: 'trait', id: d.id, source: 3, name: d.name, uuid: d.expected.uuid })),
    ...spec.sources.map((s) => ({ type: 'content-source', ...s, source: s.id })),
  ];
  for (const t of targets) {
    const variants = [
      { ref_id: t.id, data: {} },
      { ref_id: null, data: { id: String(t.id) } },
      { ref_id: null, data: { name: t.name, content_source_id: t.source } },
    ];
    if (t.uuid) variants.push({ ref_id: null, data: { uuid: t.uuid } });
    for (const v of variants) {
      for (const status of [{ state: 'PENDING' }, {}, null, { state: 'UNKNOWN' }]) {
        const u = { type: t.type, content_source_id: 999, action: 'CREATE', ...v, status };
        for (const input of [originals, proposed]) assert.throws(() => apply(input, sources, dependencies, [u]));
        assert.equal(terminal(proposed, sources, dependencies, [u]), false);
      }
      for (const state of ['APPROVED', 'REJECTED'])
        assert.ok(terminal(proposed, sources, dependencies, [{ type: t.type, ...v, status: { state } }]));
    }
  }
  assert.ok(terminal(proposed, sources, dependencies, [{ type: 'item', ref_id: -1, status: {} }]));
});

test('actual trait compilation and mechanical filters retain all existing traits, with exact helper IDs and no extra spell dependencies', () => {
  engine.setFixtures(rows);
  for (const [i, p] of spec.items.entries()) {
    assert.deepEqual(engine.compileTraits(originals[i]), p.before.traits);
    assert.deepEqual(engine.compileTraits(proposed[i]), p.after.traits);
    assert.deepEqual(
      p.after.traits.filter((id) => !p.before.traits.includes(id)),
      p.after.traits.slice(p.before.traits.length)
    );
  }
  for (const d of spec.dependencies)
    assert.equal(
      engine.convertToHardcodedLink('trait', d.name, d.name.toLowerCase()),
      `[${d.name.toLowerCase()}](link_trait_${d.id})`
    );
  for (const type of ['MAGICAL', 'CONSUMABLE', 'SPLASH', 'STAFF', 'WAND'])
    assert.deepEqual(
      engine
        .filterByTraitType(
          originals.map((r) => inventoryItem(r)),
          type
        )
        .map((r) => r.item.id),
      engine
        .filterByTraitType(
          proposed.map((r) => inventoryItem(r)),
          type
        )
        .map((r) => r.item.id)
    );
  assert.deepEqual(
    engine.getInventorySpellIds(originals.map((r) => inventoryItem(r))),
    engine.getInventorySpellIds(proposed.map((r) => inventoryItem(r)))
  );
});

const stableStore = (store) => ({
  ...store,
  history: Object.fromEntries(
    Object.entries(store.history).map(([k, values]) => [k, values.map(({ timestamp, ...v }) => v)])
  ),
});
async function calculate(items, kind, enabled) {
  const character = { ...summoner(items), companions: { list: [] }, content_sources: { enabled } };
  const content = {
    ...emptyContent,
    items: proposed,
    traits: rows.filter((r) => r.table === 'trait').map((r) => r.row),
    sources,
    abilityBlocks: [],
    defaultSources: { PAGE: enabled, INFO: enabled },
  };
  engine.setFixtures(rows);
  engine.clearOperationErrorNotifications();
  let result;
  if (kind === 'character')
    result = await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-SHEET' });
  else {
    const parent = await engine._executeCharacterOperations({
      character: { ...summoner([]), companions: { list: [] } },
      content,
      context: 'CHARACTER-SHEET',
    });
    result = await engine._executeCreatureOperations({
      id: 'COMPANION_0',
      creature: { name: 'Header companion', level: 1, operations: [], inventory: character.inventory },
      content,
      charStore: parent.store,
    });
  }
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  return { ...result, store: stableStore(result.store) };
}
test('actual character and companion controller results stay identical for equipment/investment/formulas/containers/source sets and saved copies', async () => {
  const container = {
    ...structuredClone(proposed[0]),
    id: -21001,
    name: 'Synthetic container',
    traits: [],
    operations: [],
    usage: '',
    bulk: '0',
    meta_data: { bulk: { capacity: 10 } },
  };
  for (const kind of ['character', 'companion'])
    for (const enabled of [[16], [3, 16], [3]])
      for (const flags of [
        {},
        { is_equipped: true },
        { is_invested: true },
        { is_equipped: true, is_invested: true },
        { is_equipped: true, is_invested: true, is_formula: true },
      ]) {
        const oldItems = originals.map((r) => inventoryItem(structuredClone(r), flags));
        const nextItems = proposed.map((r) => inventoryItem(structuredClone(r), flags));
        const frozen = structuredClone(oldItems);
        for (const wrap of [(items) => items, (items) => [inventoryItem(container, { container_contents: items })]])
          assert.deepEqual(
            await calculate(wrap(oldItems), kind, enabled),
            await calculate(wrap(nextItems), kind, enabled)
          );
        assert.deepEqual(oldItems, frozen);
      }
  // A clone-only sentinel makes the unchanged worn-prefix eligibility assertion non-vacuous.
  const p = spec.items[0];
  const op = {
    id: 'header021-worn-sentinel',
    type: 'addBonusToValue',
    data: { variable: 'AC_BONUS', value: 1, type: 'item', text: '' },
  };
  for (const usage of [p.before.usage, p.after.usage]) {
    const item = inventoryItem({ ...structuredClone(originals[0]), usage, operations: [op] }, { is_equipped: true });
    const top = await calculate([item], 'character', [16]);
    engine.importVariableStore('CHARACTER', top.store);
    assert.equal(engine.getFinalVariableValue('CHARACTER', 'AC_BONUS').total, 1);
    const stowed = await calculate([inventoryItem(container, { container_contents: [item] })], 'character', [16]);
    engine.importVariableStore('CHARACTER', stowed.store);
    assert.equal(engine.getFinalVariableValue('CHARACTER', 'AC_BONUS').total, 0);
  }
});

test('actual Blisterwort load uses existing light grouping, formulas/container offsets, and new selections preserve old saved bulk', async () => {
  const old = originals.find((r) => r.id === 11779),
    next = proposed.find((r) => r.id === 11779);
  const entry = (item, quantity, flags = {}) =>
    inventoryItem({ ...structuredClone(item), meta_data: { ...item.meta_data, quantity } }, flags);
  for (const [quantity, expected] of [
    [1, 0.1],
    [9, 0.1],
    [10, 1],
    [19, 1],
    [20, 2],
  ]) {
    assert.equal(engine.getItemBulk(entry(next, quantity)), expected);
    assert.equal(engine.getItemBulk(entry(old, quantity)), 0);
    assert.equal(engine.getItemBulk(entry(next, quantity, { is_formula: true })), 0);
    assert.equal(
      engine.getInvBulk({ items: [entry(next, quantity)], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } }),
      expected
    );
  }
  const distinct = Array.from({ length: 10 }, (_, i) => ({ ...entry(next, 1), id: `light-${i}` }));
  assert.ok(Math.abs(engine.getInvBulk({ items: distinct }) - 1) < 1e-12, 'existing distinct-light arithmetic');
  const container = {
    ...structuredClone(next),
    bulk: '1',
    traits: [],
    meta_data: { bulk: { capacity: 10, ignored: 1 } },
  };
  assert.equal(engine.getInvBulk({ items: [inventoryItem(container, { container_contents: [entry(next, 20)] })] }), 2);
  let character = summoner([entry(old, 1)]);
  const saved = structuredClone(character.inventory.items[0]),
    frozenCatalog = structuredClone(next);
  await engine.handleAddItem(
    (fn) => {
      character = fn(character);
    },
    next,
    false
  );
  InventorySchema.parse(character.inventory);
  assert.deepEqual(
    character.inventory.items.find((r) => r.id === saved.id),
    saved
  );
  assert.equal(character.inventory.items.find((r) => r.id !== saved.id).item.bulk, '0.1');
  assert.equal(engine.getInvBulk(character.inventory), 0.1);
  assert.deepEqual(next, frozenCatalog);
});

test('SQL locks all gates before captured writes, rejects narrow drift, preserves full readback and requires complete terminal release', async () => {
  const body = migration.split('$headers$')[2];
  assert.match(body, /lock table public\.content_update in share mode/);
  assert.match(body, /coalesce\(u\.status->>'state','PENDING'\) not in \('APPROVED','REJECTED'\)/);
  assert.ok(body.indexOf('Lock and capture every validated owner') < body.indexOf('update public.item'));
  assert.match(body, /captured_rows:=jsonb_set\(captured_rows/);
  assert.match(body, /is distinct from captured_rows->\(patch->>'id'\)/);
  assert.match(body, /is not distinct from captured_rows->\(patch->>'id'\)/);
  assert.match(body, /changed_rows<>1/);
  assert.match(body, /saved_after is distinct from expected_after/);
  assert.match(body, /saved_after is distinct from expected_terminal->\(patch->>'id'\)/);
  assert.doesNotMatch(
    body,
    /update public\.(trait|spell|character|content_source)|set (?:description|meta_data|operations|name|uuid)\s*=/
  );
  assert.match(release, /count\(distinct i\.id\)=8/);
  assert.match(release, /is true/);
  const query = await readFile(new URL('../../supabase/functions/search-data/index.ts', import.meta.url), 'utf8');
  assert.match(
    query,
    /query = query\.contains\('traits', filters\.traits\)/,
    'advanced item search uses stored all-of traits; actual PostgreSQL containment proof is separate'
  );
});
