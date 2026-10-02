import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { SpellSchema, ContentSourceSchema, InventorySchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { inventoryItem, summoner } from './fixtures/eidolon.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261001190000_treasure_vault_safe_passage_duration.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-safe-passage-duration.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$duration$')[1]);
assert.deepEqual(JSON.parse(release.split('$duration$')[1]), spec);
const [patch] = spec.spells;
const rows = await readContentRows([
  { table: 'spell', id: 4814 },
  { table: 'content_source', id: 1 },
  { table: 'item', id: 12000 },
]);
const get = (table, id) => {
  const row = rows.find((entry) => entry.table === table && entry.row.id === id)?.row;
  assert.ok(row, `Missing ${table}:${id} fixture`);
  return row;
};
const source = get('content_source', 1);
const md5 = (value) => createHash('md5').update(value).digest('hex');

/** Match the migration's authoritative references and ref-null CREATE payloads. */
function isRelevant(update) {
  const data = update.data ?? {};
  const noReference = update.ref_id == null;
  const same = (actual, expected) => actual != null && String(actual) === String(expected);
  if (update.type === 'content-source') {
    return (
      same(update.ref_id, spec.source.expected.id) ||
      same(data.id, spec.source.expected.id) ||
      (noReference && data.name === spec.source.expected.name)
    );
  }
  return (
    update.type === 'spell' &&
    (same(update.ref_id, patch.id) ||
      (noReference &&
        (same(data.id, patch.id) ||
          ((same(update.content_source_id, patch.expected.content_source_id) ||
            same(data.content_source_id, patch.expected.content_source_id)) &&
            data.name === patch.expected.name))))
  );
}

/** Validate all reviewed fields and queue states before accepting either duration. */
function stateOf(row, sourceRow = source, queue = []) {
  assert.ok(sourceRow);
  for (const [key, value] of Object.entries(spec.source.expected)) {
    assert.deepEqual(sourceRow[key], value, `Source/${key}`);
  }
  assert.ok(row);
  for (const [key, value] of Object.entries(patch.expected)) {
    assert.deepEqual(key === 'uuid' && row[key] != null ? String(row[key]) : row[key], value, `Spell/${key}`);
  }
  assert.ok(row.meta_data && typeof row.meta_data === 'object' && !Array.isArray(row.meta_data));
  for (const [key, value] of Object.entries(patch.metadata)) {
    assert.deepEqual(row.meta_data[key], value, `Metadata/${key}`);
  }
  for (const key of patch.metadata_absent) assert.equal(Object.hasOwn(row.meta_data, key), false, `Metadata/${key}`);
  assert.equal(md5(row.description), patch.description_md5);
  for (const update of queue) {
    if (isRelevant(update)) assert.ok(['APPROVED', 'REJECTED'].includes(update.status?.state));
  }
  for (const name of ['before', 'after']) {
    assert.equal(md5(patch.duration[name]), patch.duration[`${name}_md5`]);
  }
  for (const name of ['before', 'after']) if (row.duration === patch.duration[name]) return name;
  assert.fail('Safe Passage duration is outside the reviewed pair');
}

/** Apply only the approved duration leaf to a validated local clone. */
function at(row, state, sourceRow = source, queue = []) {
  stateOf(row, sourceRow, queue);
  return { ...structuredClone(row), duration: patch.duration[state] };
}

const original = at(get('spell', 4814), 'before');
const proposed = at(original, 'after');
let engine;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true });
  engine.setFixtures(rows);
});
after(async () => engine?.cleanup());

test('one approved duration pair preserves the complete Safe Passage spell, citation and source', () => {
  assert.deepEqual(
    spec.spells.map(({ id }) => id),
    [4814]
  );
  assert.equal(spec.source.expected.id, 1);
  SpellSchema.parse(original);
  SpellSchema.parse(proposed);
  ContentSourceSchema.parse(source);
  assert.equal(original.duration, '1 minute');
  assert.equal(proposed.duration, 'sustained up to 1 minute');
  assert.deepEqual({ ...proposed, duration: original.duration }, original);
  assert.deepEqual(proposed.meta_data, original.meta_data);
  assert.deepEqual(Object.keys(patch.metadata).sort(), ['damage', 'foundry', 'source']);
  assert.deepEqual(
    Object.keys(patch.expected).sort(),
    Object.keys(original)
      .filter((key) => !['created_at', 'updated_at', 'search_tsv', 'meta_data', 'duration'].includes(key))
      .sort()
  );
  assert.equal(proposed.rank, 3);
  assert.equal(proposed.cast, 'THREE-ACTIONS');
  assert.deepEqual(proposed.traditions, ['arcane', 'divine', 'primal']);
  assert.equal(proposed.meta_data.source.url, 'https://2e.aonprd.com/Spells.aspx?ID=1659');
  assert.equal(proposed.meta_data.source.book, 'Player Core');
  assert.equal(proposed.meta_data.source.page, '355');
  assert.equal(md5(original.description), '56b0844109450c6b4d14a4d2a6cb751c');
  assert.equal(patch.duration.before_md5, 'f77eb9f1b917ba78f6eb2ce8ede0a0e4');
  assert.equal(patch.duration.after_md5, '50333c8c6ec3bcb5d26d25117a3e61ac');
});

test('both complete stored states replay without changing any other field or server token', () => {
  for (const row of [original, proposed]) {
    assert.deepEqual(at(row, 'after'), proposed);
    assert.deepEqual(at(at(row, 'after'), 'after'), proposed);
    assert.deepEqual(at(row, 'before'), original);
  }
  for (const value of [null, undefined, '', '1 hour', 1])
    assert.throws(() => stateOf({ ...original, duration: value }));
});

test('future unrelated metadata/columns are preserved while existing mechanics and citation remain structural guards', () => {
  for (const row of [original, proposed]) {
    const extended = {
      ...row,
      future_column: { values: [1, null, { retain: true }] },
      meta_data: {
        untouched: { nested: [1, 2, { future: true }] },
        image_url: 'https://example.invalid/retained.png',
        ...structuredClone(row.meta_data),
      },
    };
    SpellSchema.parse(extended);
    const next = at(extended, 'after');
    assert.deepEqual({ ...next, duration: extended.duration }, extended);
    assert.deepEqual(next.meta_data, extended.meta_data);
    const reordered = {
      ...row,
      meta_data: {
        foundry: { is_focus: false, rules: [] },
        source: { page: '355', book: 'Player Core', url: row.meta_data.source.url },
        damage: [],
      },
    };
    assert.doesNotThrow(() => stateOf(reordered));
    for (const key of patch.metadata_absent)
      assert.throws(() => stateOf({ ...row, meta_data: { ...row.meta_data, [key]: false } }));
  }
});

test('missing/null/drifted identity, nullable mechanics, descriptions and heightened rules reject before and after', () => {
  for (const row of [original, proposed]) {
    for (const [key, expected] of Object.entries(patch.expected)) {
      assert.throws(() => stateOf({ ...row, [key]: expected === null ? '' : null }), `${key} null/drift`);
      const missing = structuredClone(row);
      delete missing[key];
      assert.throws(() => stateOf(missing), `${key} missing`);
    }
    for (const changes of [
      { name: 'Renamed Safe Passage' },
      { uuid: '6425681134899700' },
      { content_source_id: 3 },
      { rank: 4 },
      { traditions: ['arcane'] },
      { traits: [] },
      { cast: 'TWO-ACTIONS' },
      { defense: 'Will' },
      { heightened: { text: [], data: {} } },
      { description: `${row.description} ` },
    ])
      assert.throws(() => stateOf({ ...row, ...changes }));
    assert.throws(() => stateOf(null));
  }
});

test('malformed or drifted known metadata subtrees fail closed on both duration states', () => {
  for (const row of [original, proposed]) {
    for (const meta_data of [
      null,
      [],
      'serialized',
      {},
      { ...row.meta_data, source: null },
      { ...row.meta_data, damage: [{}] },
      { ...row.meta_data, foundry: { rules: [{ key: 'drift' }], is_focus: false } },
    ]) {
      assert.throws(() => stateOf({ ...row, meta_data }));
    }
    for (const key of Object.keys(patch.metadata)) {
      const meta_data = structuredClone(row.meta_data);
      delete meta_data[key];
      assert.throws(() => stateOf({ ...row, meta_data }));
    }
    for (const key of ['url', 'book', 'page']) {
      const meta_data = structuredClone(row.meta_data);
      meta_data.source[key] = null;
      assert.throws(() => stateOf({ ...row, meta_data }));
    }
    assert.throws(() =>
      stateOf({ ...row, meta_data: { ...row.meta_data, source: { ...row.meta_data.source, extra: true } } })
    );
  }
});

test('every official source identity/publication/dependency field rejects missing/null/drift even on replay', () => {
  for (const row of [original, proposed]) {
    assert.throws(() => stateOf(row, null));
    for (const [key, expected] of Object.entries(spec.source.expected)) {
      assert.throws(() => stateOf(row, { ...source, [key]: expected === null ? 'drift' : null }));
      const missing = structuredClone(source);
      delete missing[key];
      assert.throws(() => stateOf(row, missing));
    }
    for (const changes of [
      { id: 3 },
      { name: 'Wrong book' },
      { user_id: 'homebrew' },
      { is_published: false },
      { require_key: true },
      { deprecated: true },
      { group: 'legacy' },
      { required_content_sources: [3] },
    ]) {
      assert.throws(() => stateOf(row, { ...source, ...changes }));
    }
    assert.doesNotThrow(() => stateOf(row, { ...source, meta_data: { counts: { unrelated: 42 } } }));
  }
});

test('relevant UPDATE/DELETE/CREATE owner/source queues block before and replay unless explicitly approved or rejected', () => {
  const relevant = [
    { type: 'spell', ref_id: 4814, data: {} },
    { type: 'spell', ref_id: 4814, data: null, content_source_id: null },
    { type: 'spell', ref_id: null, data: { id: 4814 } },
    { type: 'spell', ref_id: null, content_source_id: 1, data: { name: 'Safe Passage' } },
    { type: 'spell', ref_id: null, content_source_id: 3, data: { name: 'Safe Passage', content_source_id: 1 } },
    { type: 'spell', ref_id: null, content_source_id: 1, data: { name: 'Safe Passage', content_source_id: 3 } },
    { type: 'content-source', ref_id: 1, data: {} },
    { type: 'content-source', ref_id: null, data: { id: 1 } },
    { type: 'content-source', ref_id: 3, data: { id: 1 } },
    { type: 'content-source', ref_id: null, data: { name: 'Player Core' } },
  ];
  for (const row of [original, proposed]) {
    for (const entry of relevant) {
      assert.equal(isRelevant(entry), true);
      for (const status of [
        null,
        {},
        { state: null },
        { state: 'PENDING' },
        { state: 'UNKNOWN' },
        { state: '' },
        { state: 'approved' },
        { state: 1 },
      ]) {
        assert.throws(() => at(row, 'after', source, [{ ...entry, status }]));
      }
      for (const state of ['APPROVED', 'REJECTED'])
        assert.doesNotThrow(() => at(row, 'after', source, [{ ...entry, status: { state } }]));
    }
    const unrelated = [
      { type: 'item', ref_id: 4814, data: {} },
      { type: 'spell', ref_id: 5000, data: {} },
      { type: 'spell', ref_id: null, content_source_id: 3, data: { name: 'Safe Passage' } },
      { type: 'spell', ref_id: null, content_source_id: 1, data: { name: 'Another spell' } },
      { type: 'spell', ref_id: 5000, data: { id: 4814 } },
      { type: 'content-source', ref_id: 3, data: {} },
      { type: 'content-source', ref_id: null, data: { name: 'Other book', id: 3 } },
      { type: 'content-source', ref_id: null, content_source_id: 1, data: { name: 'OtherBook' }, status: null },
      { type: 'content-source', ref_id: null, data: { name: 'OtherBook', content_source_id: 1 }, status: null },
      { type: 'content-source', ref_id: null, content_source_id: 1, data: {}, status: null },
      { type: 'content-source', ref_id: null, data: { content_source_id: 1 }, status: null },
    ];
    for (const entry of unrelated) assert.equal(isRelevant(entry), false);
    assert.doesNotThrow(() => at(row, 'after', source, unrelated));
  }
});

test('actual rank-aware item parsing clones rank 4 without changing base cast cost, source catalogs or heightening', () => {
  const link = engine.convertToHardcodedLink('spell', 'Safe Passage', 'safe passage');
  const description = `**Activate** <abbr cost="TWO-ACTIONS" class="action-symbol">2</abbr>; **Effect** The armor casts 4th-rank *${link}*.`;
  for (const row of [original, proposed]) {
    const snapshot = structuredClone(row);
    const [{ spell, rank }] = engine.detectSpells(description, [row], true);
    assert.equal(rank, 4);
    assert.equal(spell.id, 4814);
    assert.equal(spell.rank, 4);
    assert.equal(spell.cast, 'THREE-ACTIONS');
    assert.equal(spell.duration, row.duration);
    assert.deepEqual(spell.heightened, row.heightened);
    assert.deepEqual(row, snapshot);
    const catalog = [row];
    assert.equal(engine.mergeSpellDependencies(catalog, [row], []), catalog);
    assert.deepEqual(
      engine.filterSpellCatalog(catalog, 'safe passage', 'THREE-ACTIONS', () => []).map((s) => s.id),
      [4814]
    );
    assert.deepEqual(
      engine.filterSpellCatalog(catalog, 'safe passage', 'TWO-ACTIONS', () => []),
      []
    );
  }
  assert.equal(engine.renderRichText(original.description), engine.renderRichText(proposed.description));
});

test('saved full inventory and spell snapshots remain unchanged while repaired catalog clones are created', () => {
  const inventory = summoner([inventoryItem(get('item', 12000), { is_equipped: true })]).inventory;
  const saved = structuredClone({ inventory, spells: [original], conditions: [], rounds: { unchanged: 5 } });
  InventorySchema.parse(inventory);
  SpellSchema.parse(original);
  at(original, 'after');
  assert.deepEqual({ inventory, spells: [original], conditions: [], rounds: { unchanged: 5 } }, saved);
  InventorySchema.parse(inventory);
});

test('SQL checks the complete source/content/queue before replay, updates only duration with strict CAS and verifies preservation', () => {
  assert.match(migration, /lock table public\.content_update in share mode/);
  assert.match(migration, /jsonb_each\(patch->'expected'\)/);
  assert.match(migration, /jsonb_each\(patch->'metadata'\)/);
  assert.match(migration, /jsonb_array_elements_text\(patch->'metadata_absent'\)/);
  assert.match(migration, /coalesce\(u\.status->>'state','PENDING'\) not in \('APPROVED','REJECTED'\)/);
  assert.ok(
    migration.indexOf('Safe Passage source has a pending') < migration.indexOf('if spell_row.duration is not distinct')
  );
  assert.ok(
    migration.indexOf('Safe Passage has a pending') < migration.indexOf('if spell_row.duration is not distinct')
  );
  assert.match(migration, /u\.ref_id is null/);
  for (const sql of [migration, release]) {
    const sourceGuard = sql.split("u.type='content-source' and (")[1].split('    ))')[0];
    assert.match(sourceGuard, /or u\.data->>'id'=spec(?:\.value)?#>>'\{source,expected,id\}'/);
    assert.match(
      sourceGuard,
      /or \(u\.ref_id is null and u\.data->>'name'=spec(?:\.value)?#>>'\{source,expected,name\}'\)/
    );
    assert.doesNotMatch(sourceGuard, /u\.content_source_id|u\.data->>'content_source_id'/);
  }
  assert.match(migration, /u\.data->>'id'=patch->>'id'/);
  assert.match(migration, /u\.content_source_id=\(patch#>>'\{expected,content_source_id\}'\)::bigint/);
  assert.match(migration, /u\.data->>'content_source_id'=patch#>>'\{expected,content_source_id\}'/);
  assert.match(migration, /update public\.spell s set duration=patch#>>'\{duration,after\}'/);
  assert.match(migration, /s\.duration is not distinct from patch#>>'\{duration,before\}'/);
  assert.match(migration, /if changed_rows<>1 then raise exception/);
  assert.match(migration, /after_row-'duration'-'updated_at'-'search_tsv'/);
  assert.match(migration, /is distinct from before_body/);
  assert.equal((migration.match(/update public\./g) ?? []).length, 1);
  assert.doesNotMatch(migration, /set (?:meta_data|description|name|uuid|rank|cast|traditions|traits|heightened)\s*=/);
  assert.doesNotMatch(migration, /update public\.(?:item|character|trait|ability_block|content_source)/);
  assert.match(release, /'treasure-vault-safe-passage-duration'::text id/);
  assert.match(release, /false\) passed/);
  assert.match(release, /s\.duration is distinct from p#>>'\{duration,after\}'/);
  assert.match(release, /jsonb_each\(p->'metadata'\)/);
  assert.match(release, /jsonb_array_elements_text\(p->'metadata_absent'\)/);
  assert.match(release, /u\.data->>'id'=p->>'id'/);
  assert.match(release, /u\.data->>'content_source_id'=p#>>'\{expected,content_source_id\}'/);
  assert.match(release, /coalesce\(u\.status->>'state','PENDING'\) not in \('APPROVED','REJECTED'\)/);
});
