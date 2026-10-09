import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureNativeInputManifest } from './treasure-vault-native-input-manifest.mjs';
import { createNativeTechCorePrerequisites } from './treasure-vault-native-tech-core-prerequisites.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inputManifest = await captureNativeInputManifest({ root });
const fullRecords = JSON.parse(await readFile(new URL('./fixtures/tech-core-native-prerequisites.json', import.meta.url), 'utf8'));
const hasGeneral = inputManifest.manifest.chronology.some(({ path }) => path === '20261008190000_tech_core_general_spells.sql');
const sha = value => createHash('sha256').update(value).digest('hex');
function withText(path, text, { recomputeHash = true } = {}) {
  return { ...inputManifest, manifest: { ...inputManifest.manifest, entries: inputManifest.manifest.entries.map(entry => entry.path === path && recomputeHash ? { path, bytes: Buffer.byteLength(text), sha256: sha(text) } : entry) }, readRelative: key => key === path ? text : inputManifest.readRelative(key) };
}

test('Captured full source and exact Junk/Station records form the only approved late supplement', () => {
  const plan = createNativeTechCorePrerequisites({ inputManifest });
  assert.deepEqual(plan.keys, ['content_source:900', 'trait:5225', ...(hasGeneral ? ['trait:5236'] : [])]);
  assert.deepEqual(plan.records.map(({ table, row }) => ({ table, row })), fullRecords.filter(({ row }) => hasGeneral || row.id !== 5236), 'Independent frozen full rows, including source creation date and metadata');
  assert.equal(plan.records[0].row.created_at, '2026-10-07T21:51:13.845822+00:00');
  assert.deepEqual(plan.records[0].row.meta_data, { counts: { trait: 46, class: 2, feat: 5, ancestry: 3, heritage: 1, versatile_heritage: 1 } });
  assert.equal(plan.records[0].row.required_content_sources, null);
  assert.equal(plan.records[1].row.uuid, 8693519255012780);
  if (hasGeneral) assert.equal(plan.records[2].row.uuid, 2341035972402734);
  assert.equal(plan.referenceComparisons.introductory, 16);
  assert.equal(plan.referenceComparisons.general, hasGeneral ? 92 : 0);
  assert.equal(plan.stationReason, hasGeneral ? 'The captured chronology includes the 76 general spells and its exact Station dependency.' : 'No general-spell successor is captured; Station is not hydrated.');
});

test('Only fully absent or fully exact replay state is accepted, never mixed identity or payload', () => {
  const plan = createNativeTechCorePrerequisites({ inputManifest });
  assert.equal(plan.classifyExisting([]), 'absent');
  assert.equal(plan.classifyExisting(structuredClone(plan.records)), 'exact-replay');
  for (const rows of [plan.records.slice(0, 1), [...plan.records, plan.records[0]], [{ table: 'trait', row: { id: 999, name: 'Junk' } }]]) assert.throws(() => plan.classifyExisting(rows));
  for (const change of [rows => { rows[0].row.name = 'Other book'; }, rows => { rows[1].row.description += ' changed'; }, rows => { rows[1].row.uuid = 1; }, rows => { rows[0].row.meta_data = {}; }, rows => { rows[0].row.created_at = '2026-10-08T00:00:00+00:00'; }]) {
    const rows = structuredClone(plan.records); change(rows); assert.throws(() => plan.classifyExisting(rows));
  }
});

test('Missing or drifted input hashes, changed full payloads and unreviewed references reject', () => {
  const dump = inputManifest.readRelative('data/data.sql');
  assert.throws(() => createNativeTechCorePrerequisites({ inputManifest: withText('data/data.sql', dump + '\n', { recomputeHash: false }) }), /byte count|hash/);
  assert.throws(() => createNativeTechCorePrerequisites({ inputManifest: { ...inputManifest, manifest: { ...inputManifest.manifest, entries: inputManifest.manifest.entries.filter(({ path }) => path !== 'data/data.sql') } } }), /Missing captured input/);
  for (const [before, after] of [['Spells with the junk trait use scrap, trash, and other debris', 'Changed junk rule'], ['2026-10-07 21:51:13.845822+00', '2026-10-07 21:51:13.845823+00'], ['"trait":46,"class":2,"feat":5', '"trait":47,"class":2,"feat":5']]) {
    assert.ok(dump.includes(before));
    assert.throws(() => createNativeTechCorePrerequisites({ inputManifest: withText('data/data.sql', dump.replace(before, after)) }), /reference|prerequisite bytes/);
  }
  const path = 'supabase/migrations/20261008160000_tech_core_introductory_spells.sql';
  const source = inputManifest.readRelative(path), parts = source.split('$tech_core_spells$');
  for (const change of [spec => { spec.references[0].row.description += ' changed'; }, spec => { spec.references[0].row.id = 99999999; }, spec => { spec.references.push(spec.references[0]); }]) {
    const spec = JSON.parse(parts[1]); change(spec);
    assert.throws(() => createNativeTechCorePrerequisites({ inputManifest: withText(path, parts[0] + '$tech_core_spells$' + JSON.stringify(spec) + '$tech_core_spells$' + parts[2]) }));
  }
});

test('Station is excluded from the introductory-only chronology even when it exists in the current dump', () => {
  const input = { ...inputManifest, manifest: { ...inputManifest.manifest, chronology: inputManifest.manifest.chronology.filter(({ path }) => path !== '20261008190000_tech_core_general_spells.sql'), entries: inputManifest.manifest.entries.filter(({ path }) => path !== 'supabase/migrations/20261008190000_tech_core_general_spells.sql') } };
  const plan = createNativeTechCorePrerequisites({ inputManifest: input });
  assert.deepEqual(plan.keys, ['content_source:900', 'trait:5225']);
  assert.doesNotMatch(plan.sql, /2341035972402734/);
});

/** External database orchestration model, not PostgreSQL execution or native proof. */
function model(plan, { replay = false, stageFailure = false, sequenceDrift = false, rollbackBadStatus = false, rollbackDrift = false, replayDrift = false } = {}) {
  let committed = replay;
  let rejected = false, replayed = false;
  const receipt = {}, baseline = { tuples: { 'public.content_source': '99:before', 'public.trait': '100:before', 'auth.users': '1:saved', 'public.character': '1:saved', 'public.content_update': '0:empty' }, sequences: { 'public.trait_id_seq': { last_value: '5193', is_called: true }, 'public.content_source_id_seq': { last_value: '899', is_called: true } }, schema_sha256: 'schema', roles_sha256: 'roles', sha256: 'initial' };
  const fixture = { assertOwned() {}, queryJson: () => committed ? structuredClone(plan.records) : [], snapshot: () => {
    const value = structuredClone(baseline);
    if (committed && !replay) { value.tuples['public.content_source'] = '100:after'; value.tuples['public.trait'] = '102:after'; value.sha256 = 'after'; }
    if (committed && sequenceDrift) value.sequences['public.trait_id_seq'].last_value = '5236';
    if (rejected && rollbackDrift) value.roles_sha256 = 'changed';
    if (replayed && replayDrift) value.schema_sha256 = 'changed';
    return value;
  }, sql: () => { rejected = true; return { status: rollbackBadStatus ? 0 : 3, signal: null, error: null, stderr: 'ERROR: P0001: Tech Core fixture injected late failure' }; } };
  return { receipt, fixture, stage: async (name) => { if (stageFailure) throw new Error('Model positive transaction failure'); committed = true; if (name.endsWith('-replay')) replayed = true; } };
}

test('Orchestration models accept absent/exact replay and do not report success after stage or sequence failure', async () => {
  const input = { ...inputManifest, verify: async () => ({ model_only: true }) };
  const plan = createNativeTechCorePrerequisites({ inputManifest: input });
  for (const replay of [false, true]) { const context = model(plan, { replay }); const proof = await plan.run(context); assert.equal(proof.passed, true); assert.equal(proof.mode, replay ? 'exact-replay' : 'absent'); assert.deepEqual(proof.controls.map(row => row.name), ['injected-late-rollback', 'exact-replay']); }
  for (const options of [{ stageFailure: true }, { sequenceDrift: true }, { rollbackBadStatus: true }, { rollbackDrift: true }, { replayDrift: true }]) { const context = model(plan, options); await assert.rejects(() => plan.run(context)); assert.equal(context.receipt.tech_core_prerequisites.passed, false); }
});

test('Native recipe uses one transaction, complete readback and pre-commit unaffected tuple/sequence checks', () => {
  const plan = createNativeTechCorePrerequisites({ inputManifest });
  assert.ok(plan.sql.startsWith('BEGIN;\n'));
  const inserts = plan.sql.indexOf('insert into public.content_source');
  const readback = plan.sql.indexOf("raise exception 'Tech Core fixture prerequisite readback differs'");
  const preserved = plan.sql.indexOf("raise exception 'Tech Core fixture changed an unrelated tuple or sequence'");
  assert.ok(inserts > 0 && readback > inserts && preserved > readback && plan.sql.indexOf('COMMIT;') > preserved);
  assert.doesNotMatch(plan.sql, /\b(nextval|setval|disable trigger|enable trigger|session_replication_role)\b/i);
  assert.equal((plan.sql.match(/insert into public\./g) ?? []).length, hasGeneral ? 3 : 2);
  assert.match(plan.sql, /md5\(pg_catalog\.record_send\(r\)\)/);
  assert.match(plan.sql, /schemaname in\('public','auth','proof'\)/);
  assert.match(plan.sql, /''last_value'',last_value::text,''is_called'',is_called/);
  const timestampGuard = plan.sql.indexOf("raise exception 'Tech Core fixture source changed beyond its triggered timestamp'");
  const timestampRestore = plan.sql.indexOf('update public.content_source s set updated_at=r.updated_at');
  assert.ok(timestampGuard > inserts && timestampRestore > timestampGuard && timestampRestore < readback);
  assert.match(plan.sql, /to_jsonb\(s\)-'search_tsv'-'updated_at'/);
  assert.match(plan.sql, /seqtypid.*seqstart.*seqincrement.*seqmax.*seqmin.*seqcache.*seqcycle/);
  assert.match(plan.sql, /schemaname in\('public','auth','proof'\)/);
});
