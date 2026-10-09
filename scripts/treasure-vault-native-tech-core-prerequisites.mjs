import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { HISTORICAL_CONTENT_FIXTURE } from './historical-content-fixture.mjs';

export const TECH_CORE_PREREQUISITE_BOUNDARY = '20261008160000_tech_core_introductory_spells.sql';
const generalPath = 'supabase/migrations/20261008190000_tech_core_general_spells.sql';
const introPath = 'supabase/migrations/' + TECH_CORE_PREREQUISITE_BOUNDARY;
const sha = (value) => createHash('sha256').update(value).digest('hex');
const approvedRows = new Map([
  ['content_source:900', '3c35fc171d8f87ffe5305226509d6cc45439d4bc5925985f14b206e30d7dfa46'],
  ['trait:5225', 'fd43bfb1436334f30ac26def3bf7c4dfbac190ba76e7a0ba220883876289e6d2'],
  ['trait:5236', 'a88cc8fb49691577f9940a1c589d5214b88650dfaffb01bda46101e7fd60bfd1'],
]);
const normalized = (row) => Object.fromEntries(Object.entries(row).filter(([key]) => !['updated_at', 'search_tsv'].includes(key)));
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const literal = (value) => quote(JSON.stringify(value)) + '::jsonb';
function contentArray(value) {
  if (value === '{}') return [];
  assert.ok(value.startsWith('{') && value.endsWith('}'), 'One-dimensional COPY array');
  const entries = []; let index = 1;
  while (index < value.length - 1) {
    const quoted = value[index] === '"'; if (quoted) index++;
    let entry = '';
    while (index < value.length - 1) {
      const character = value[index++];
      if (character === '\\') entry += value[index++];
      else if (quoted && character === '"') break;
      else if (!quoted && character === ',') break;
      else entry += character;
    }
    if (quoted && value[index] === ',') index++;
    entries.push(!quoted && entry === 'NULL' ? null : entry);
  }
  return entries;
}
function capturedCopyRows(text, expected) {
  const result = new Map(); let table, columns;
  const escapes = { '\\': '\\', n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v' };
  for (const line of text.split('\n')) {
    const header = /^COPY public\.([^ ]+) \((.*?)\) FROM stdin;$/.exec(line);
    if (header) { table = header[1]; columns = header[2].split(', ').map((key) => key.replace(/^"|"$/g, '')); continue; }
    if (line === '\\.') { table = undefined; continue; }
    if (!table) continue;
    const cells = line.split('\t'), key = table + ':' + cells[columns.indexOf('id')];
    if (!expected.has(key)) continue;
    assert.ok(!result.has(key), 'Duplicate captured row: ' + key);
    assert.equal(cells.length, columns.length, 'Complete captured COPY row');
    const row = Object.fromEntries(columns.map((column, index) => {
      const raw = cells[index]; if (raw === '\\N') return [column, null];
      const value = raw.replace(/\\([\\ntrbfv])/g, (_, escaped) => escapes[escaped]);
      const known = expected.get(key)[column];
      if (['created_at', 'updated_at'].includes(column)) return [column, value.replace(' ', 'T').replace(/\+00$/, '+00:00')];
      if (Array.isArray(known)) {
        const entries = contentArray(value);
        return [column, column === 'operations' ? entries.map(JSON.parse) : typeof known[0] === 'number' || ['traits', 'required_content_sources'].includes(column) ? entries.map(Number) : entries];
      }
      if (typeof known === 'number') { const number = Number(value); assert.ok(Number.isSafeInteger(number), 'Safe integer content identity'); return [column, number]; }
      if (typeof known === 'boolean' || ['is_published', 'require_key', 'deprecated'].includes(column)) { assert.ok(value === 't' || value === 'f'); return [column, value === 't']; }
      if (known === undefined && table === 'content_source' && key !== 'content_source:900') return [column, value];
      if (value.startsWith('{')) return [column, JSON.parse(value)];
      return [column, value];
    }));
    result.set(key, { table, row, rawSha256: sha(line) });
  }
  assert.deepEqual([...result.keys()].sort(), [...expected.keys()].sort(), 'Every guarded current reference is captured');
  return result;
}

/** Construction reads only captured bytes. It cannot run SQL or hydrate arbitrary content. */
export function createNativeTechCorePrerequisites({ inputManifest }) {
  const manifest = inputManifest.manifest;
  assert.equal(manifest.schema, 'wg-tv-native-checked-in-input-manifest-v2');
  assert.equal(manifest.historical_bootstrap_mode, 'pinned-git-predecessor');
  assert.deepEqual(manifest.historical_git_inputs, [HISTORICAL_CONTENT_FIXTURE], 'Historical input remains the reviewed immutable predecessor');
  assert.equal(sha(inputManifest.readHistoricalBootstrap()), manifest.historical_git_inputs[0].sha256, 'Historical bytes stay unchanged');
  const captured = new Map(manifest.entries.map((entry) => [entry.path, entry]));
  assert.equal(captured.size, manifest.entries.length, 'No duplicate captured inputs');
  function read(path) {
    const record = captured.get(path); assert.ok(record, 'Missing captured input: ' + path);
    const text = inputManifest.readRelative(path);
    assert.equal(Buffer.byteLength(text), record.bytes, 'Captured input byte count');
    assert.equal(sha(text), record.sha256, 'Captured input hash');
    return text;
  }
  const intro = JSON.parse(read(introPath).split('$tech_core_spells$')[1]);
  assert.equal(intro.references.length, 16); assert.equal(intro.sources.length, 3);
  const includeStation = manifest.chronology.some(({ path }) => path === generalPath.split('/').at(-1));
  const general = includeStation ? JSON.parse(read(generalPath).split('$tech_core_general$')[1]) : null;
  if (general) { assert.equal(general.references.length, 92); assert.equal(general.sources.length, 7); }
  const specs = [intro, ...(general ? [general] : [])];
  const expected = new Map();
  for (const spec of specs) for (const { table, row } of spec.references) {
    const key = table + ':' + row.id;
    if (expected.has(key)) assert.deepEqual(expected.get(key), row, 'Shared references agree exactly');
    expected.set(key, row);
  }
  for (const spec of specs) for (const row of spec.sources) {
    const key = 'content_source:' + row.id;
    expected.set(key, { ...expected.get(key), ...row });
  }
  const rows = capturedCopyRows(read('data/data.sql'), expected);
  for (const spec of specs) {
    for (const { table, row } of spec.references) assert.deepEqual(normalized(rows.get(table + ':' + row.id).row), row, 'Full current reference equals reviewed spell manifest');
    for (const source of spec.sources) assert.deepEqual(Object.fromEntries(Object.keys(source).map((key) => [key, rows.get('content_source:' + source.id).row[key]])), source, 'Exact source guard projection');
  }
  const keys = ['content_source:900', 'trait:5225', ...(includeStation ? ['trait:5236'] : [])];
  const records = keys.map((key) => {
    const record = rows.get(key); assert.ok(record, 'Exact approved prerequisite');
    assert.equal(record.rawSha256, approvedRows.get(key), 'Approved full prerequisite bytes changed: ' + key);
    return record;
  });
  function classifyExisting(existing) {
    assert.ok(Array.isArray(existing), 'Native prerequisite rows must be an array');
    if (!existing.length) return 'absent';
    assert.equal(existing.length, records.length, 'Mixed prerequisite state rejects');
    const seen = new Set();
    for (const { table, row } of existing) {
      const key = table + ':' + row.id;
      assert.ok(keys.includes(key) && !seen.has(key), 'Unknown, duplicate or aliased prerequisite rejects'); seen.add(key);
      assert.deepEqual(Object.fromEntries(Object.entries(row).filter(([field]) => field !== 'search_tsv')), records.find((record) => record.table === table && record.row.id === row.id).row, 'Full existing prerequisite must match');
    }
    return 'exact-replay';
  }
  const traits = records.filter(({ table }) => table === 'trait');
  const existingQuery = `select jsonb_build_object('table','content_source','row',to_jsonb(r)-'search_tsv') as entry from public.content_source r where r.id=900 or lower(btrim(r.name))='tech core'
union all select jsonb_build_object('table','trait','row',to_jsonb(r)-'search_tsv') from public.trait r where r.id in(${traits.map(({ row }) => row.id).join(',')}) or r.uuid in(${traits.map(({ row }) => row.uuid).join(',')}) or (r.content_source_id=900 and lower(btrim(r.name)) in(${traits.map(({ row }) => quote(row.name.toLowerCase())).join(',')}))`;
  const exactRows = records.map(({ table, row }) => ({ table, row }));
  // Record-send captures preserve nulls, types and every generated/live column.
  function snapshotSql(destination) {
    return `${destination}:='{}'::jsonb;
for relation in select schemaname,tablename from pg_tables where schemaname in('public','auth','proof') order by schemaname,tablename loop
  excluded:=case when relation.schemaname='public' and relation.tablename='content_source' then ' where r.id<>900' when relation.schemaname='public' and relation.tablename='trait' then ' where r.id not in(${traits.map(({ row }) => row.id).join(',')})' else '' end;
  execute format('select count(*)::text||'':''||md5(coalesce(string_agg(md5(pg_catalog.record_send(r)),'''' order by md5(pg_catalog.record_send(r))),'''')) from %I.%I r%s',relation.schemaname,relation.tablename,excluded) into digest;
  ${destination}:=jsonb_set(${destination},array['tuple:'||relation.schemaname||'.'||relation.tablename],to_jsonb(digest),true);
end loop;
for relation in select schemaname,sequencename from pg_sequences where schemaname in('public','auth','proof') order by schemaname,sequencename loop
  execute format('select jsonb_build_object(''last_value'',last_value::text,''is_called'',is_called,''seqtypid'',p.seqtypid::text,''seqstart'',p.seqstart::text,''seqincrement'',p.seqincrement::text,''seqmax'',p.seqmax::text,''seqmin'',p.seqmin::text,''seqcache'',p.seqcache::text,''seqcycle'',p.seqcycle) from %I.%I cross join pg_catalog.pg_sequence p where p.seqrelid=%L::regclass',relation.schemaname,relation.sequencename,relation.schemaname||'.'||relation.sequencename) into sequence_state;
  ${destination}:=jsonb_set(${destination},array['sequence:'||relation.schemaname||'.'||relation.sequencename],sequence_state,true);
end loop;`;
  }
  const matchesSql = `jsonb_array_length(existing)=${records.length} and not exists(select 1 from jsonb_array_elements(existing) a where not exists(select 1 from jsonb_array_elements(v_spec) e where e=a))`;
  const inserts = records.map(({ table, row }) => {
    const columns = Object.keys(row).map((column) => '"' + column + '"').join(',');
    return `insert into public.${table}(${columns}) select ${Object.keys(row).map((column) => 'r."' + column + '"').join(',')} from jsonb_populate_record(null::public.${table},${literal(row)}) r;`;
  }).join('\n');
  const sourceRow = records.find(({ table }) => table === 'content_source').row;
  // Trait INSERT triggers remain enabled and bump this newly inserted parent's token.
  // Restore only its captured token after refusing any other source-field change.
  const restoreSourceTimestamp = `if (select to_jsonb(s)-'search_tsv'-'updated_at' from public.content_source s where s.id=900) is distinct from (${literal(sourceRow)}-'updated_at') then raise exception 'Tech Core fixture source changed beyond its triggered timestamp'; end if;
update public.content_source s set updated_at=r.updated_at from jsonb_populate_record(null::public.content_source,${literal(sourceRow)}) r where s.id=900;`;
  const sql = `BEGIN;
lock table public.content_source,public.trait in share row exclusive mode;
do $tech_core_fixture$
declare v_spec constant jsonb:=${literal(exactRows)}; existing jsonb; before_state jsonb; after_state jsonb; relation record; excluded text; digest text; sequence_state jsonb;
begin
select coalesce(jsonb_agg(entry),'[]'::jsonb) into existing from (${existingQuery}) r;
if jsonb_array_length(existing)<>0 and not(${matchesSql}) then raise exception 'Tech Core fixture prerequisite state differs'; end if;
${snapshotSql('before_state')}
if jsonb_array_length(existing)=0 then
${inserts}
${restoreSourceTimestamp}
end if;
select coalesce(jsonb_agg(entry),'[]'::jsonb) into existing from (${existingQuery}) r;
if not(${matchesSql}) then raise exception 'Tech Core fixture prerequisite readback differs'; end if;
${snapshotSql('after_state')}
if before_state is distinct from after_state then raise exception 'Tech Core fixture changed an unrelated tuple or sequence'; end if;
-- tech-core-fixture-late-control-boundary
end $tech_core_fixture$;
COMMIT;\n`;
  const lateMarker = '-- tech-core-fixture-late-control-boundary';
  assert.equal(sql.split(lateMarker).length, 2, 'Exactly one late control insertion boundary');
  const lateSql = sql.replace(lateMarker, "raise exception using errcode='P0001', message='Tech Core fixture injected late failure';\n" + lateMarker);
  async function run({ fixture, stage, receipt, checkpoint = async () => {} }) {
    await inputManifest.verify(); fixture.assertOwned();
    const existing = fixture.queryJson(`select coalesce(jsonb_agg(entry),'[]'::jsonb) from (${existingQuery}) r;`);
    const mode = classifyExisting(existing), before = fixture.snapshot();
    const proof = receipt.tech_core_prerequisites = { passed: false, mode, keys, station_included: includeStation, sql_sha256: sha(sql), explicit_ids: true, sequence_reset: false, trigger_suppression: false, absent_source_timestamp_restored: mode === 'absent', full_preexisting_tuple_and_sequence_guard: true, source: captured.get('data/data.sql'), controls: [] };
    await checkpoint('Tech Core prerequisite late rollback'); fixture.assertOwned();
    const rejected = fixture.sql(lateSql, true);
    assert.equal(rejected.error == null, true, 'Late rollback has no transport error');
    assert.equal(rejected.signal, null, 'Late rollback has no process signal');
    assert.equal(rejected.status, 3, 'Late rollback is actual psql script exit3');
    assert.match(rejected.stderr, /ERROR:\s+P0001:/);
    assert.match(rejected.stderr, /Tech Core fixture injected late failure/);
    assert.deepEqual(fixture.snapshot(), before, 'Late rejection preserves entire baseline including every sequence, saved row, schema and role');
    proof.controls.push({ name: 'injected-late-rollback', passed: true, sql_sha256: sha(lateSql), actual_exit_status: 3, actual_signal: null, sqlstate: 'P0001', no_transport_error: true, full_state_preserved: true });
    await stage('late-tech-core-prerequisites', sql);
    classifyExisting(fixture.queryJson(`select coalesce(jsonb_agg(entry),'[]'::jsonb) from (${existingQuery}) r;`));
    const after = fixture.snapshot();
    const comparable = structuredClone(after);
    if (mode === 'absent') for (const table of ['public.content_source', 'public.trait']) comparable.tuples[table] = before.tuples[table];
    delete comparable.sha256;
    const original = structuredClone(before); delete original.sha256;
    assert.deepEqual(comparable, original, 'Supplement preserves schema, roles, saved/Auth/queue tuples and every sequence');
    const replayBefore = fixture.snapshot();
    await stage('late-tech-core-prerequisites-replay', sql);
    classifyExisting(fixture.queryJson(`select coalesce(jsonb_agg(entry),'[]'::jsonb) from (${existingQuery}) r;`));
    assert.deepEqual(fixture.snapshot(), replayBefore, 'Exact supplement replay preserves every tuple, sequence, schema and role');
    proof.controls.push({ name: 'exact-replay', passed: true, sql_sha256: sha(sql), actual_exit_status: 0, actual_signal: null, no_transport_error: true, full_state_preserved: true });
    await inputManifest.verify();
    proof.passed = true;
    return proof;
  }
  return { keys, records, classifyExisting, existingQuery, sql, run, referenceComparisons: { introductory: 16, general: general ? 92 : 0 }, stationReason: includeStation ? 'The captured chronology includes the 76 general spells and its exact Station dependency.' : 'No general-spell successor is captured; Station is not hydrated.' };
}
