import { readReviewedHistoricalSql } from './treasure-vault-historical-test-support.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ContentSourceSchema, SpellSchema } from '../src/schemas/content.ts';
import uploadUtils from '../../supabase/functions/_shared/upload-utils.ts';
import { readContentRows } from './operation-test-harness.mjs';

const { uniqueId } = uploadUtils;
const migration = await readReviewedHistoricalSql(
  new URL('../../supabase/migrations/20261001150000_treasure_vault_staff_spell_citations.sql', import.meta.url),
  'utf8'
);
const release = await readReviewedHistoricalSql(
  new URL('../../supabase/release/treasure-vault-staff-spell-citations.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$staffcite$')[1]);
const rows = await readContentRows([
  ...spec.spells.map(({ id }) => ({ table: 'spell', id })),
  { table: 'content_source', id: 842 },
]);
const fixture = (table, id) => {
  const row = rows.find((entry) => entry.table === table && entry.row.id === id)?.row;
  assert.ok(row, `${table}:${id} fixture missing`);
  return row;
};
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const equal = (a, b) => {
  try {
    assert.deepEqual(a, b);
    return true;
  } catch {
    return false;
  }
};
/** Accept only exact canonical decimal UUIDs, whether the dump reader returns text or a number. */
function uuidText(value) {
  assert.ok(typeof value === 'string' || (typeof value === 'number' && Number.isSafeInteger(value)));
  const text = String(value);
  assert.match(text, /^[1-9]\d*$/);
  return text;
}
/** Mirror the reviewed source-key projection, never an arbitrary citation or whole-metadata replacement. */
function spellState(row, patch, terminal = false) {
  assert.ok(row);
  for (const [key, value] of Object.entries(patch.expected)) {
    assert.deepEqual(key === 'uuid' ? uuidText(row[key]) : row[key], value, `${patch.id} ${key}`);
  }
  assert.ok(isObject(row.meta_data), `${patch.id} metadata must be an object`);
  const projection = Object.hasOwn(row.meta_data, 'source') ? { source: row.meta_data.source } : {};
  if (equal(projection, patch.metadata.after)) return 'after';
  if (!terminal && equal(projection, patch.metadata.before)) return 'before';
  assert.fail(`${patch.id} citation projection changed`);
}
/** Reconstruct either reviewed dump state from a before, after, or mixed future sanitized fixture. */
function spellAt(row, patch, state) {
  spellState(row, patch);
  const result = structuredClone(row);
  delete result.meta_data.source;
  if (state === 'after') result.meta_data.source = structuredClone(patch.metadata.after.source);
  SpellSchema.parse(result);
  assert.equal(spellState(result, patch), state);
  return result;
}
function sourceValid(source) {
  assert.ok(source);
  for (const [key, value] of Object.entries(spec.source.expected)) assert.deepEqual(source[key], value, key);
}
/** ref_id remains authoritative even if an UPDATE/DELETE submission's data is empty. */
function relevantSubmission(update) {
  const state = update.status?.state ?? 'PENDING';
  if (state === 'APPROVED' || state === 'REJECTED') return false;
  if (update.type === 'spell') {
    return (
      spec.spells.some((patch) => patch.id === update.ref_id) ||
      ((update.content_source_id === 842 || String(update.data?.content_source_id) === '842') &&
        spec.spells.some((patch) => patch.expected.name === update.data?.name))
    );
  }
  return (
    update.type === 'content-source' &&
    (update.ref_id === 842 || String(update.data?.id) === '842' || update.data?.name === 'Impossible Magic')
  );
}
/** Pure atomic model for before/after matrix and preservation; real SQL rehearsal is separate. */
function applyBatch(input, source, queue = [], failedCasId) {
  sourceValid(source);
  assert.ok(!queue.some(relevantSubmission), 'pending or malformed owner/source submission');
  assert.equal(input.length, 5);
  for (const patch of spec.spells)
    spellState(
      input.find((row) => row.id === patch.id),
      patch
    );
  const result = structuredClone(input);
  for (const patch of spec.spells) {
    const row = result.find((entry) => entry.id === patch.id);
    if (spellState(row, patch) === 'after') continue;
    assert.notEqual(row.id, failedCasId, 'leaf compare-and-set failed');
    row.meta_data.source = structuredClone(patch.metadata.after.source);
  }
  return result;
}
function terminalBatch(input, source, queue = []) {
  try {
    sourceValid(source);
    assert.equal(input.length, 5);
    for (const patch of spec.spells)
      spellState(
        input.find((row) => row.id === patch.id),
        patch,
        true
      );
    return !queue.some(relevantSubmission);
  } catch {
    return false;
  }
}
const source = fixture('content_source', 842);
const beforeRows = spec.spells.map((patch) => spellAt(fixture('spell', patch.id), patch, 'before'));
const afterRows = spec.spells.map((patch, index) => spellAt(beforeRows[index], patch, 'after'));

test('five exact published spell citations use independently verified Impossible Magic pages', () => {
  assert.deepEqual(
    spec.spells.map(({ id }) => id),
    [9000, 9010, 9011, 9015, 9053]
  );
  assert.deepEqual(spec, JSON.parse(release.split('$staffcite$')[1]));
  const citations = [
    [9000, 2787, '157'],
    [9010, 2797, '158'],
    [9011, 2798, '159'],
    [9015, 2803, '160'],
    [9053, 2845, '167'],
  ];
  for (const [id, aonId, page] of citations) {
    const patch = spec.spells.find((entry) => entry.id === id);
    assert.deepEqual(patch.metadata.before, {});
    assert.deepEqual(patch.metadata.after, {
      source: { url: `https://2e.aonprd.com/Spells.aspx?ID=${aonId}`, book: 'Impossible Magic', page },
    });
    assert.equal(patch.expected.content_source_id, 842);
    assert.equal(patch.expected.uuid, String(uniqueId(patch.expected.name, 'spell', patch.expected.rank, 842)));
  }
  assert.equal(spec.spells.find((patch) => patch.id === 9011).expected.rank, 0, 'WG cantrip storage rank stays zero');
});

test('public schemas validate full cloned rows, exact citation source and all unchanged mechanics/prose', () => {
  ContentSourceSchema.parse(source);
  sourceValid(source);
  for (const [index, before] of beforeRows.entries()) {
    SpellSchema.parse(before);
    const after = afterRows[index];
    const parsed = SpellSchema.parse(after);
    assert.deepEqual(parsed.meta_data.source, spec.spells[index].metadata.after.source);
    const restored = structuredClone(after);
    delete restored.meta_data.source;
    assert.deepEqual(restored, before, 'the single citation source leaf is the entire content change');
    assert.deepEqual(after.description, before.description);
    assert.deepEqual(after.heightened, before.heightened);
    assert.deepEqual(after.traits, before.traits);
    assert.deepEqual(after.traditions, before.traditions);
  }
});

test('all 32 mixed before/after dump states apply and replay to strict terminal rows without mutating input', () => {
  for (let mask = 0; mask < 32; mask++) {
    const input = spec.spells.map((patch, index) =>
      spellAt(afterRows[index], patch, mask & (1 << index) ? 'after' : 'before')
    );
    const saved = structuredClone(input);
    const after = applyBatch(input, source);
    assert.deepEqual(after, afterRows);
    assert.deepEqual(applyBatch(after, source), after);
    assert.ok(terminalBatch(after, source));
    assert.deepEqual(input, saved);
    assert.equal(terminalBatch(input, source), mask === 31);
  }
});

test('future unrelated metadata and sanitized after-state fixture reconstruction remain lossless', () => {
  const extraRows = beforeRows.map((row) => ({
    ...structuredClone(row),
    meta_data: {
      image_url: 'https://example.test/sanitized.png',
      foundry: { untouched: { array: [1, null, 'x'] } },
      future_key: { keep: true },
    },
  }));
  const saved = structuredClone(extraRows);
  const result = applyBatch(extraRows, source);
  assert.ok(terminalBatch(result, source));
  for (const [index, row] of result.entries()) {
    SpellSchema.parse(row);
    const before = spellAt(row, spec.spells[index], 'before');
    assert.deepEqual(before, extraRows[index]);
    assert.deepEqual(spellAt(before, spec.spells[index], 'after'), row);
  }
  assert.deepEqual(extraRows, saved);
  assert.deepEqual(applyBatch(result, source), result);
});

test('NULL/scalar metadata and unknown/partial/present-null citations fail closed before and after', () => {
  const malformed = [
    null,
    [],
    'metadata',
    false,
    1,
    { source: null },
    { source: {} },
    { source: { ...spec.spells[0].metadata.after.source, page: '999' } },
    { source: { ...spec.spells[0].metadata.after.source, extra: 'unreviewed' } },
    { source: { url: spec.spells[0].metadata.after.source.url } },
    { source: JSON.stringify(spec.spells[0].metadata.after.source) },
  ];
  for (const baseline of [beforeRows, afterRows]) {
    for (const meta_data of malformed) {
      const input = structuredClone(baseline);
      input[0].meta_data = meta_data;
      const saved = structuredClone(input);
      assert.throws(() => applyBatch(input, source));
      assert.equal(terminalBatch(input, source), false);
      assert.deepEqual(input, saved);
    }
  }
});

test('every identity/content/mechanics field, missing row and forced CAS failure reject atomically', () => {
  for (const baseline of [beforeRows, afterRows]) {
    for (const patch of spec.spells) {
      for (const key of Object.keys(patch.expected)) {
        const input = structuredClone(baseline);
        const target = input.find((row) => row.id === patch.id);
        target[key] = target[key] === null ? 'unknown' : null;
        const saved = structuredClone(input);
        assert.throws(() => applyBatch(input, source), `${patch.id} ${key}`);
        assert.equal(terminalBatch(input, source), false);
        assert.deepEqual(input, saved);
      }
    }
    for (const value of ['', 'not-a-uuid', '4197355284093809.0', '9223372036854775808', NaN]) {
      const input = structuredClone(baseline);
      input[0].uuid = value;
      assert.throws(() => applyBatch(input, source));
      assert.equal(terminalBatch(input, source), false);
    }
    assert.throws(() => applyBatch(baseline.slice(1), source));
    assert.equal(terminalBatch(baseline.slice(1), source), false);
  }
  const saved = structuredClone(beforeRows);
  assert.throws(() => applyBatch(beforeRows, source, [], 9011), /compare-and-set/);
  assert.deepEqual(beforeRows, saved);
});

test('source ownership/publication and exact identity constraints apply before application and replay', () => {
  for (const [key, value] of Object.entries(spec.source.expected)) {
    const changed = structuredClone(source);
    changed[key] = value === null ? 'unknown' : null;
    assert.throws(() => applyBatch(beforeRows, changed));
    assert.throws(() => applyBatch(afterRows, changed));
    assert.equal(terminalBatch(afterRows, changed), false);
  }
  assert.throws(() => applyBatch(beforeRows, null));
  assert.equal(terminalBatch(afterRows, null), false);
  const futureCounts = { ...structuredClone(source), meta_data: { counts: { spell: 999 } } };
  ContentSourceSchema.parse(futureCounts);
  assert.deepEqual(applyBatch(beforeRows, futureCounts), afterRows, 'volatile counts are not content identity');
});

test('pending UPDATE/DELETE empty data, CREATE identities and malformed status block first run and replay', () => {
  const pending = [];
  for (const ref_id of [9000, 9010, 9011, 9015, 9053]) {
    for (const action of ['UPDATE', 'DELETE'])
      pending.push({ type: 'spell', ref_id, action, data: {}, content_source_id: 0 });
  }
  for (const patch of spec.spells) {
    pending.push({
      type: 'spell',
      ref_id: null,
      action: 'CREATE',
      data: { name: patch.expected.name },
      content_source_id: 842,
    });
    pending.push({
      type: 'spell',
      ref_id: null,
      action: 'CREATE',
      data: { name: patch.expected.name, content_source_id: 842 },
      content_source_id: 0,
    });
  }
  pending.push({ type: 'content-source', ref_id: 842, action: 'DELETE', data: {} });
  pending.push({ type: 'content-source', ref_id: null, action: 'CREATE', data: { name: 'Impossible Magic' } });
  pending.push({ type: 'content-source', ref_id: null, action: 'UPDATE', data: { id: 842 } });
  for (const update of pending) {
    for (const status of [{ state: 'PENDING' }, null, {}, { state: 'UNKNOWN' }]) {
      const queue = [{ ...update, status }];
      assert.throws(() => applyBatch(beforeRows, source, queue));
      assert.throws(() => applyBatch(afterRows, source, queue));
      assert.equal(terminalBatch(afterRows, source, queue), false);
    }
    for (const state of ['APPROVED', 'REJECTED'])
      assert.ok(terminalBatch(afterRows, source, [{ ...update, status: { state } }]));
  }
  for (const update of [
    { type: 'item', ref_id: 9000, data: {} },
    { type: 'spell', ref_id: 99999, data: {} },
    { type: 'spell', ref_id: null, content_source_id: 999, data: { name: 'Quick Sort' } },
  ])
    assert.ok(terminalBatch(afterRows, source, [{ ...update, status: { state: 'PENDING' } }]));
});

test('migration and release enforce exact source projection, guarded locks, pending before replay and leaf-only CAS', () => {
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
    /public\.spell s[\s\S]*?jsonb_array_elements\(spec->'spells'\)[\s\S]*?order by s\.id for update/
  );
  const body = migration.split('$staffcite$')[2];
  assert.match(body, /lock table public\.content_update in share mode/);
  assert.match(body, /content_source where id=842 order by id for share/);
  assert.match(body, /spell where id in \(9000,9010,9011,9015,9053\) order by id for update/);
  assert.ok(body.indexOf('pending or malformed') < body.indexOf('then continue'));
  assert.ok(body.indexOf('for property') < body.indexOf('update public.spell'));
  assert.match(body, /jsonb_typeof\(actual_metadata\) is distinct from 'object'/);
  assert.match(body, /jsonb_build_object\('source',actual_metadata->'source'\) else '\{\}'::jsonb/);
  assert.match(
    body,
    /set meta_data=jsonb_set\(s\.meta_data::jsonb,'\{source\}',patch #> '\{metadata,after,source\}',true\)::json/
  );
  assert.match(body, /and not \(s\.meta_data::jsonb \? 'source'\)/);
  assert.match(body, /s\.uuid::text=patch #>> '\{expected,uuid\}'/);
  assert.match(body, /get diagnostics affected=row_count/);
  assert.match(body, /if affected <> 1 then raise exception/);
  assert.doesNotMatch(body, /set (description|rank|traditions|traits|heightened|uuid|content_source_id)\s*=/i);
  assert.doesNotMatch(
    body,
    /update public\.(item|ability_block|content_source|trait)|insert into|delete from|coalesce\(s\.meta_data/i
  );
  const predicate = release.split('$staffcite$')[2];
  assert.match(predicate, /count\(\*\)=5 and bool_and/);
  assert.match(predicate, /count\(\*\)=1 and bool_and/);
  assert.match(predicate, /actual #> '\{meta_data,source\}' is not distinct from patch #> '\{metadata,after,source\}'/);
  for (const sql of [body, predicate]) {
    assert.match(sql, /u\.ref_id in \(9000,9010,9011,9015,9053\)/);
    assert.match(sql, /u\.type='content-source'/);
    assert.match(sql, /u\.ref_id=842/);
    assert.match(sql, /coalesce\(u\.status->>'state','PENDING'\) not in \('APPROVED','REJECTED'\)/);
    assert.match(sql, /u\.data->>'name'=p #>> '\{expected,name\}'/);
  }
});
