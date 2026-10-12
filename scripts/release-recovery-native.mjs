import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

// Native mechanics proof only. Plan mode performs no Docker, SQL or network calls.
const runFile = promisify(execFile);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const IMAGE = 'sha256:d74eeac9a635390a49bc21bd49fccd973de707e2a53a76ac49b552b8712ec46f';
const PINNED = {
  'supabase/migrations/20261011000000_restore_heal_companion.sql': '174f39728a8f581c5e46a9cf5ab69014b72cc46e77e7da6a0070cf51ab198a76',
  'supabase/release/heal-companion-recovery.sql': 'c25c3735dac0d078f7463fe41db92862e81cc0fdbad56bcd9f6c88393aa4d1af',
  'supabase/migrations/20261011000100_incarnate_release_compatibility.sql': 'f4c2eeb9a230f14f96bef05f2278bf2bfa8cb3a4856147f1893e3a25481bd2a7',
  'supabase/release/tech-core-general-spells-incarnate-compatibility.sql': '6f1e5f5d111bfc02c2dfe5058b62fb28d92197c733c179d687947a53447b7b6e',
  'supabase/release/tech-core-general-spells.sql': '97c50a7cf4a529219ff96d86c755dc24c7aa9b287b15db8107bce3e681f3102e',
};
const tables = ['ability_block', 'ancestry', 'archetype', 'background', 'class', 'class_archetype', 'content_source', 'creature', 'item', 'language', 'spell', 'trait', 'versatile_heritage', 'content_update'];
const q = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const ident = (value) => { assert.match(value, /^[a-z_]+$/); return '"' + value + '"'; };
const json = (value) => { const text = JSON.stringify(value); assert(!text.includes('$fixture_json$')); return '$fixture_json$' + text + '$fixture_json$::jsonb'; };
const stripped = (row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'search_tsv'));
const stable = (row) => Object.fromEntries(Object.entries(row).filter(([key]) => !['search_tsv', 'updated_at'].includes(key)));
const insert = (table, row) => { const value = stripped(row); const cols = Object.keys(value).map(ident).join(','); return `INSERT INTO public.${ident(table)} (${cols}) SELECT ${cols} FROM jsonb_populate_record(NULL::public.${ident(table)},${json(value)});`; };
const prefix = "SET LOCAL statement_timeout='20s'; SET LOCAL lock_timeout='3s'; SET LOCAL client_min_messages='warning';";
const tx = (sql, commit = false, readOnly = false) => `BEGIN${readOnly ? ' READ ONLY' : ''}; ${prefix}\n${sql}\n${commit ? 'COMMIT' : 'ROLLBACK'};`;
const spec = (text, tag) => { const parts = text.split(tag); assert.equal(parts.length, 3, 'Exactly one embedded specification'); return JSON.parse(parts[1]); };
const capsule = (text) => { assert.equal([...text.matchAll(/^begin;\n/gm)].length, 1); assert.equal([...text.matchAll(/^commit;\n?$/gm)].length, 1); assert(/commit;\n?$/.test(text)); return text.replace(/^begin;\n/m, '').replace(/commit;\n?$/, ''); };
const setAt = (value, keys, next) => { let cursor = value; for (const key of keys.slice(0, -1)) cursor = cursor[key]; cursor[keys.at(-1)] = next; };
const getAt = (value, keys) => keys.reduce((current, key) => current[key], value);

export function prepare(repository) {
  repository = path.resolve(repository);
  const sourcePaths = [...Object.keys(PINNED), 'supabase/release/heal-companion.sql', 'data/schema.sql', 'supabase/migrations/20260718000000_content_updated_at.sql', 'supabase/migrations/20260729000000_noop_guard_generated_columns.sql'];
  const files = Object.fromEntries(sourcePaths.map((relative) => [relative, fs.readFileSync(path.join(repository, relative), 'utf8')]));
  const pins = sourcePaths.map((relative) => ({ relative, bytes: Buffer.byteLength(files[relative]), sha256: sha(files[relative]) }));
  for (const [relative, expected] of Object.entries(PINNED)) assert.equal(sha(files[relative]), expected, relative + ' reviewed bytes changed');
  const recoveryWhole = files[sourcePaths[0]], recovery = capsule(recoveryWhole), healEffect = files[sourcePaths[1]], compatibilityWhole = files[sourcePaths[2]], compatibilityMigration = capsule(compatibilityWhole), wrapper = files[sourcePaths[3]];
  const heal = spec(recovery, '$heal_recovery_spec$'), general = spec(files['supabase/release/tech-core-general-spells.sql'], '$tech_core_general$');
  assert.equal(heal.row.id, 22108); assert.equal(heal.row.uuid, 7476666523704164); assert.equal(heal.row.meta_data.deprecated, true);
  assert.equal(general.references.length, 92); assert.equal(general.sources.length, 7); assert.equal(general.rows.length + general.prior_rows.length, 82); assert.equal(general.bindings.length, 8);
  const schema = files['data/schema.sql'];
  const create = tables.map((table) => { const start = schema.indexOf(`CREATE TABLE public.${table} (`), end = schema.indexOf('\n);', start); assert(start >= 0 && end > start); return schema.slice(start, end + 3); });
  const identities = tables.map((table) => { const start = schema.indexOf(`ALTER TABLE public.${table} ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (`), end = schema.indexOf('\n);', start); assert(start >= 0 && end > start); return schema.slice(start, end + 3); });
  const constraints = [...schema.matchAll(/ALTER TABLE ONLY public\.([a-z_]+)\s+ADD CONSTRAINT [\s\S]*?;/g)].filter((match) => tables.includes(match[1])).map((match) => match[0]);
  assert.equal(constraints.filter((text) => text.includes('PRIMARY KEY')).length, 14);
  for (const text of constraints) { const reference = text.match(/REFERENCES (public|auth)\.([a-z_]+)/); if (reference) assert(reference[1] === 'auth' && reference[2] === 'users' || tables.includes(reference[2])); }
  const setup = "CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); INSERT INTO auth.users VALUES('00000000-0000-4000-8000-000000000001');\n" + [...create, ...identities, ...constraints, files['supabase/migrations/20260718000000_content_updated_at.sql'], files['supabase/migrations/20260729000000_noop_guard_generated_columns.sql']].join('\n');
  const sources = new Map(general.sources.map((row) => [row.id, { ...row, created_at: '2024-01-01T00:00:00+00:00', updated_at: '2024-01-01T00:00:00+00:00' }]));
  for (const row of heal.sources) sources.set(row.id, { ...sources.get(row.id), created_at: '2024-01-01T00:00:00+00:00', updated_at: '2024-01-01T00:00:00+00:00', ...row });
  sources.set(999900, { id: 999900, name: 'Unrelated synthetic source', user_id: null, is_published: true, require_key: false, updated_at: '2024-01-01T00:00:00+00:00' });
  const raw = [...general.prior_rows, ...general.rows];
  // Only these 82 IDs are synthetic. The release query intentionally resolves actual IDs by real UUID.
  const identity = new Map(raw.map((row, index) => [String(row.uuid), 800000 + index]));
  const spells = raw.map((source) => { const row = structuredClone(source); for (const binding of general.bindings.filter((b) => b.owner_uuid === row.uuid)) { const old = '(' + binding.href + ')'; assert.equal(getAt(row, binding.path).split(old).length - 1, binding.occurrences); setAt(row, binding.path, getAt(row, binding.path).replaceAll(old, '(link_spell_' + identity.get(String(binding.target_uuid)) + ')')); } return { id: identity.get(String(row.uuid)), created_at: '2024-01-01T00:00:00+00:00', ...row }; });
  const references = general.references.map((reference) => ({ table: reference.table, row: structuredClone(reference.row) }));
  references.push({ table: 'trait', row: { ...heal.dependencies.find((dep) => dep.table === 'trait').row, created_at: '2024-01-01T00:00:00+00:00', description: '' } });
  references.push({ table: 'spell', row: { ...heal.dependencies.find((dep) => dep.table === 'spell').row, uuid: 8000000000004977, created_at: '2024-01-01T00:00:00+00:00', description: 'Synthetic body: only the exact declared recovery dependency projection is exercised.' } });
  const unrelatedAbility = { id: 999900, name: 'Unrelated synthetic ability', uuid: 8000000000999900, type: 'feat', content_source_id: 999900, operations: [], description: 'Unrelated baseline.' };
  const queue = (data = {}, extra = {}) => ({ id: 999901, created_at: '2024-01-01T00:00:00+00:00', user_id: '00000000-0000-4000-8000-000000000001', type: 'ability-block', ref_id: null, content_source_id: 999900, action: 'UPDATE', data, upvotes: [], downvotes: [], status: { state: 'PENDING', private_note: 'Explicit synthetic moderation data.' }, ...extra });
  const seed = 'TRUNCATE ' + tables.map((table) => 'public.' + ident(table)).join(',') + ';\n' + [...sources.values()].map((row) => insert('content_source', row)).join('\n') + '\n' + references.map(({ table, row }) => insert(table, row)).join('\n') + '\n' + spells.map((row) => insert('spell', row)).join('\n') + '\n' + insert('ability_block', unrelatedAbility) + '\n' + insert('content_update', queue({ name: 'Unrelated moderation' }, { id: 999900 })) + "\nUPDATE public.content_source SET updated_at='2024-01-01T00:00:00+00:00';";
  const snapshot = `SELECT jsonb_build_object(${tables.map((table) => q(table) + `,(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]'::jsonb) FROM public.${ident(table)} t)`).join(',')},'sequences',jsonb_build_object(${tables.map((table) => q(table) + `,(SELECT jsonb_build_object('last_value',last_value::text,'is_called',is_called) FROM public.${ident(table + '_id_seq')})`).join(',')}),'triggers',(SELECT jsonb_agg(jsonb_build_object('table',tgrelid::regclass::text,'name',tgname,'enabled',tgenabled,'type',tgtype,'definition',pg_get_triggerdef(oid)) ORDER BY tgrelid,tgname) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN(${tables.map((table) => q('public.' + table) + '::regclass').join(',')})))::text;`;
  const cases = [];
  const reject = (name, mutation, error) => cases.push({ kind: 'heal-reject', name, mutation, error });
  const predicate = (name, mutation, expected, check = 'wrapper') => cases.push({ kind: 'predicate', name, mutation, expected, check });
  const conflict = (name, overrides) => reject(name, insert('ability_block', { ...heal.row, id: 999902, uuid: 8000000000999902, name: 'Other fixture ability', content_source_id: 999900, meta_data: {}, ...overrides }), 'identity is no longer absent');
  conflict('heal-occupied-ID', { id: 22108 }); conflict('heal-global-UUID', { uuid: heal.row.uuid }); conflict('heal-normalized-source-name', { name: '\t HEAL COMPANION \n', content_source_id: 14 }); conflict('heal-global-canonical-URL', { meta_data: { source: { url: '\t HTTPS://2E.AONPRD.COM/FEATS.ASPX?ID=1764 \n' } } });
  for (const source of heal.sources) reject('heal-source-' + source.id + '-drift', `UPDATE public.content_source SET name=name||' fixture drift' WHERE id=${source.id};`, 'source dependencies changed');
  for (const dep of heal.dependencies) reject('heal-dependency-' + dep.table + dep.row.id + '-drift', `UPDATE public.${ident(dep.table)} SET name=name||' fixture drift' WHERE id=${dep.row.id};`, 'spell or trait dependencies changed');
  reject('heal-disabled-parent-cache-trigger', 'ALTER TABLE public.ability_block DISABLE TRIGGER ability_block_bump_source_updated_at;', 'cache trigger changed');
  reject('heal-disabled-parent-trigger-with-current-token', 'ALTER TABLE public.ability_block DISABLE TRIGGER ability_block_bump_source_updated_at; UPDATE public.content_source SET updated_at=transaction_timestamp() WHERE id=14;', 'cache trigger changed');
  const late = "CREATE FUNCTION public.fixture_late() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id=22108 THEN IF NOT EXISTS(SELECT 1 FROM public.ability_block WHERE id=22108) OR NOT EXISTS(SELECT 1 FROM public.content_source WHERE id=14 AND updated_at=transaction_timestamp()) THEN RAISE EXCEPTION 'Fixture late failure occurred too early'; END IF; RAISE EXCEPTION 'Fixture failure after actual insert and cache refresh'; END IF; RETURN NULL; END $$; CREATE TRIGGER zzz_fixture_late AFTER INSERT ON public.ability_block FOR EACH ROW EXECUTE FUNCTION public.fixture_late();";
  reject('heal-late-real-insert-cache-rollback', late, 'Fixture failure after actual insert and cache refresh');
  reject('heal-post-trigger-persisted-corruption', "CREATE FUNCTION public.fixture_corrupt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id=22108 THEN UPDATE public.ability_block SET description=description||' fixture corruption' WHERE id=NEW.id; END IF; RETURN NULL; END $$; CREATE TRIGGER zzz_fixture_corrupt AFTER INSERT ON public.ability_block FOR EACH ROW EXECUTE FUNCTION public.fixture_corrupt();", 'readback differs');
  const pendingHeal = (name, data, extra = {}) => reject(name, insert('content_update', queue(data, extra)), 'pending curator dependency');
  pendingHeal('heal-pending-ref-ID', {}, { ref_id: 22108 }); pendingHeal('heal-pending-data-ID', { id: '\t22108\n' }); pendingHeal('heal-pending-UUID', { uuid: '\t' + heal.row.uuid + '\n' }); pendingHeal('heal-pending-canonical-URL', { meta_data: { source: { url: '\tHTTPS://2E.AONPRD.COM/FEATS.ASPX?ID=1764\n' } } });
  const paths = [['content_source_id'], ['source_id'], ['source', 'content_source_id'], ['source', 'source_id'], ['source', 'id'], ['meta_data', 'content_source_id'], ['meta_data', 'source', 'content_source_id'], ['meta_data', 'source', 'source_id']];
  const nested = (keys, value, initial = {}) => { const row = structuredClone(initial); let current = row; for (const key of keys.slice(0, -1)) current = current[key] ??= {}; current[keys.at(-1)] = value; return row; };
  for (const keys of paths) pendingHeal('heal-nested-name-source-' + keys.join('.'), nested(keys, '\t14\n', { name: '\tHEAL COMPANION\n' }), { type: '\tability_block\n', status: { state: '\tPENDING\n' } });
  for (const dep of heal.dependencies) for (const keys of paths) pendingHeal('heal-dependency-pending-' + dep.table + '-' + keys.join('.'), nested(keys, '\t' + dep.row.content_source_id + '\n', { name: '\t' + dep.row.name.toUpperCase() + '\n' }), { type: '\t' + dep.table + '\n' });
  for (const source of heal.sources) pendingHeal('heal-source-pending-' + source.id, { name: '\t' + source.name.toUpperCase() + '\n' }, { type: '\tcontent_source\n', status: { state: 'UNKNOWN' } });
  for (const state of ['APPROVED', 'REJECTED']) cases.push({ kind: 'heal-positive-queue', name: 'heal-closed-' + state + '-alias-preserved', mutation: insert('content_update', queue({ uuid: heal.row.uuid }, { status: { state: '\t' + state + '\n' } })) });
  cases.push({ kind: 'heal-positive-queue', name: 'heal-unrelated-pending-preserved', mutation: insert('content_update', queue({ name: '\tOther Companion\n', content_source_id: 14 })) });
  predicate('incarnate-original-complete-wrapper', '', true);
  predicate('incarnate-source-only-successor-complete-wrapper', 'UPDATE public.trait SET content_source_id=3 WHERE id=2584;', true);
  for (const dep of general.references) predicate('incarnate-reject-dependency-' + dep.table + dep.row.id, `UPDATE public.${ident(dep.table)} SET name=name||' fixture drift' WHERE id=${dep.row.id};`, false);
  for (const source of general.sources) predicate('incarnate-reject-source-' + source.id, `UPDATE public.content_source SET name=name||' fixture drift' WHERE id=${source.id};`, false);
  for (const row of spells) predicate('incarnate-reject-missing-spell-' + row.id, `DELETE FROM public.spell WHERE id=${row.id};`, false);
  for (const row of spells) predicate('incarnate-reject-content-drift-spell-' + row.id, `UPDATE public.spell SET description=coalesce(description,'')||' fixture drift' WHERE id=${row.id};`, false);
  for (const binding of general.bindings) { const row = spells.find((row) => row.uuid === binding.owner_uuid); const value = getAt(row, binding.path); const changed = value.replace('(link_spell_' + identity.get(String(binding.target_uuid)) + ')', '(link_spell_999999)'); const patch = {}; setAt(nested(binding.path, ''), binding.path, changed); let mutation; if (binding.path.length === 1) mutation = `UPDATE public.spell SET ${ident(binding.path[0])}=${q(changed)} WHERE id=${row.id};`; else mutation = `UPDATE public.spell SET ${ident(binding.path[0])}=jsonb_set(${ident(binding.path[0])}::jsonb,ARRAY[${binding.path.slice(1).map(q).join(',')}],${json(changed)},false)::json WHERE id=${row.id};`; predicate('incarnate-reject-bound-link-' + row.id + '-' + binding.path.join('.'), mutation, false); }
  const incarnate = general.references.find((dep) => dep.table === 'trait' && dep.row.id === 2584).row;
  for (const source of [3, 15]) predicate('incarnate-reject-original-duplicate-name-source' + source, insert('trait', { ...incarnate, id: 999902, uuid: 8000000000999902, name: '\tIncarnate\n', content_source_id: source }), false);
  for (const [name, mutation] of [['wrong-source', 'UPDATE public.trait SET content_source_id=7 WHERE id=2584;'], ['description', "UPDATE public.trait SET content_source_id=3,description=description||' drift' WHERE id=2584;"], ['metadata', "UPDATE public.trait SET content_source_id=3,meta_data=meta_data||'{\"fixture\":true}'::jsonb WHERE id=2584;"], ['UUID', 'UPDATE public.trait SET content_source_id=3,uuid=uuid+1 WHERE id=2584;'], ['creation-time', "UPDATE public.trait SET content_source_id=3,created_at=created_at+interval '1 day' WHERE id=2584;"], ['duplicate-name', 'UPDATE public.trait SET content_source_id=3 WHERE id=2584;\n' + insert('trait', { ...incarnate, id: 999902, uuid: 8000000000999902, name: '\tIncarnate\n', content_source_id: 15 })]]) predicate('incarnate-reject-successor-' + name, mutation, false);
  for (const source of [15, 3]) for (const keys of paths) predicate('incarnate-reject-pending-source' + source + '-' + keys.join('.'), `UPDATE public.trait SET content_source_id=${source} WHERE id=2584;\n` + insert('content_update', queue(nested(keys, '\t' + source + '\n', { name: '\tINCARNATE\n' }), { type: '\ttrait\n', status: { state: '\tPENDING\n' } })), false);
  for (const state of ['APPROVED', 'REJECTED']) predicate('incarnate-closed-' + state + '-alias-preserved', 'UPDATE public.trait SET content_source_id=3 WHERE id=2584;\n' + insert('content_update', queue({ uuid: incarnate.uuid }, { type: 'trait', status: { state } })), true);
  const spell = spells[0];
  predicate('incarnate-pending-native-spell-UUID', insert('content_update', queue({ uuid: spell.uuid }, { type: 'spell' })), false);
  predicate('incarnate-pending-native-spell-ref', insert('content_update', queue({}, { type: 'spell', ref_id: spell.id })), false);
  predicate('incarnate-pending-source-ref', insert('content_update', queue({}, { type: 'content-source', ref_id: 900 })), false);
  predicate('incarnate-pending-reference-ref', insert('content_update', queue({}, { type: 'item', ref_id: general.references.find((dep) => dep.table === 'item').row.id })), false);
  predicate('incarnate-unrelated-moderation-preserved', insert('content_update', queue({ name: 'Unrelated new fixture proposal' })), true);
  predicate('incarnate-clock-only-dependency-change-is-allowed', 'UPDATE public.trait SET updated_at=clock_timestamp() WHERE id=2584;', true);
  predicate('incarnate-clock-only-source-change-is-allowed', 'UPDATE public.content_source SET updated_at=clock_timestamp() WHERE id=900;', true);
  return { repository, files, pins, setup, seed, snapshot, recovery, recoveryWhole, healEffect, wrapper, compatibilityMigration, compatibilityWhole, heal, general, spells, cases, identity: Object.fromEntries(identity), fixture_limitations: ['Real content table/identity/PK/unique/content-FK DDL and cache triggers; auth.users is a minimal UUID FK target, not an Auth/RLS permission proof.', '82 native spell IDs are explicit synthetic positive fixture IDs resolved by the real query from real UUIDs; no production IDs are allocated.', 'Heal dependencies exercise their exact declared projections, not unguarded editorial fields.', 'All moderation payloads are synthetic; no live/private moderator values or database access.'] };
}

/** Validate the completed native psql command before accepting its SQL outcome. */
export function assertNativeSqlResult(result, expectedError = null, phase = 'native SQL') {
  assert.equal(result.killed, false, phase + ' process was killed');
  assert.equal(result.signal, null, phase + ' process received a signal');
  assert.equal(result.process_error_code, null, phase + ' process transport failed');
  assert.equal(result.exit_code, expectedError ? 3 : 0, phase + ' unexpected psql exit: ' + result.stderr);
  if (expectedError) assert(result.stderr.includes(expectedError), phase + ' expected diagnostic: ' + result.stderr);
}

/** Capture command termination, including failures, for the attempt's SQL receipt. */
export function executeNativeSqlProcess(id, text, executeFile = execFile) {
  return new Promise((resolve) => {
    const child = executeFile('docker', ['exec', '-e', 'PGAPPNAME=wg-release-recovery-native', '-i', id, 'psql', '-h', '127.0.0.1', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres'], { timeout: 30000, maxBuffer: 8_000_000 }, (err, stdout, stderr) => {
      resolve({ exit_code: err ? (Number.isInteger(err.code) ? err.code : null) : 0, killed: err?.killed === true, signal: err?.signal ?? null, process_error_code: typeof err?.code === 'string' ? err.code : null, stdout, stderr });
    });
    child.stdin.end(text);
  });
}

export async function executeOwned(prepared, output) {
  output = path.resolve(output); fs.mkdirSync(output, { recursive: true, mode: 0o700 });
  const save = (name, value) => fs.writeFileSync(path.join(output, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  save('ATTEMPT-STARTED.json', { started_at: new Date().toISOString(), maximum_attempts: 1 });
  const docker = (args, timeout = 10000) => runFile('docker', args, { timeout, maxBuffer: 8_000_000 });
  const inventory = async () => { const ids = (await docker(['ps', '--no-trunc', '--format', '{{.ID}}'])).stdout.trim().split('\n').filter(Boolean); if (!ids.length) return []; return (await docker(['inspect', '--format', '{"id":"{{.Id}}","started_at":"{{.State.StartedAt}}","running":{{.State.Running}},"paused":{{.State.Paused}},"restarts":{{.RestartCount}},"oom_killed":{{.State.OOMKilled}}}', ...ids])).stdout.trim().split('\n').map(JSON.parse); };
  const beforeContainers = await inventory(); save('EXISTING-CONTAINERS-BEFORE.json', beforeContainers); save('INPUT-PINS.json', prepared.pins); save('SETUP.sql', prepared.setup); save('SEED.sql', prepared.seed); save('PLAN.json', { cases: prepared.cases.map(({ name, kind, expected }) => ({ name, kind, expected })), identity: prepared.identity, limitations: prepared.fixture_limitations });
  let id = null, attemptedStart = false, functional = false, failure = null, phase = 'before-start'; const secondary = [], observations = []; let call = 0;
  const label = 'wg-release-recovery-native-' + randomBytes(12).toString('hex'); const name = label;
  const ownership = async (exactTarget) => {
    assert(exactTarget === name || exactTarget === id, 'Only exact current-attempt name or ID may be inspected for cleanup');
    const owned = JSON.parse((await docker(['inspect', '--format', '{"id":"{{.Id}}","name":"{{.Name}}","image":"{{.Image}}","label":"{{index .Config.Labels "wg.private-test"}}","network":"{{.HostConfig.NetworkMode}}"}', exactTarget])).stdout.trim());
    assert.match(owned.id, /^[a-f0-9]{64}$/); assert.equal(owned.name, '/' + name); assert.equal(owned.image, IMAGE); assert.equal(owned.label, label); assert.equal(owned.network, 'none'); if (id) assert.equal(owned.id, id); return owned;
  };
  async function sql(text, error = null) {
    const begin = Date.now(); const current = ++call;
    const result = await executeNativeSqlProcess(id, text);
    save('SQL-' + String(current).padStart(4, '0') + '.json', { phase, query_sha256: sha(text), bytes: Buffer.byteLength(text), elapsed_ms: Date.now() - begin, expected_error: error, ...result });
    assertNativeSqlResult(result, error, phase);
    return result.stdout.trim();
  }
  const snapshot = async () => JSON.parse(await sql(tx(prepared.snapshot, false, true)));
  const checkPredicate = async (query, expected, mutation = '') => { const result = await sql(tx(mutation + '\n' + query, false, !mutation)); const lines = result.split('\n').filter(Boolean); assert.equal(lines.length, 1, 'Exactly one complete predicate result'); assert.equal(lines[0].split('|').at(-1), expected ? 't' : 'f', phase + ' wrong predicate: ' + lines[0]); };
  try {
    phase = 'verify-image-start-owned-fixture';
    const image = (await docker(['image', 'inspect', 'postgres:17', '--format', '{{.Id}}'])).stdout.trim(); assert.equal(image, IMAGE, 'The reviewed cached PostgreSQL17 image must be exact immediately before start');
    attemptedStart = true;
    const started = await docker(['run', '-d', '--pull=never', '--name', name, '--label', 'wg.private-test=' + label, '--network', 'none', '--memory', '256m', '--cpus', '0.5', '--pids-limit', '128', '--tmpfs', '/var/lib/postgresql/data:rw,size=192m', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', image, 'postgres', '-c', 'shared_buffers=16MB', '-c', 'wal_buffers=1MB', '-c', 'max_connections=10'], 30000);
    const createdId = started.stdout.trim(); assert.match(createdId, /^[a-f0-9]{64}$/); id = createdId; save('OWNED-CONTAINER.json', { id, name, label, image, network: 'none', memory: '256m', cpu: '0.5' }); await ownership(id);
    const deadline = Date.now() + 30000; for (;;) { try { await docker(['exec', id, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'], 3000); break; } catch (error) { if (Date.now() >= deadline) throw error; await new Promise((resolve) => setTimeout(resolve, 250)); } }
    phase = 'real-DDL-constraints-cache-triggers-and-seed'; await sql(tx(prepared.setup + '\n' + prepared.seed, true)); const baseline = await snapshot(); save('BASELINE.json', baseline);
    phase = 'heal-absent-whole-row-release-rejects'; await checkPredicate(prepared.healEffect, false); observations.push({ name: phase, passed: true });
    phase = 'heal-exact-restore-commit'; await sql(prepared.recoveryWhole); const recovered = await snapshot(); const row = recovered.ability_block.find((value) => value.id === 22108); assert.deepEqual(stable(row), prepared.heal.row); assert.equal(row.meta_data.deprecated, true); assert.deepEqual(recovered.sequences, baseline.sequences); assert.deepEqual(recovered.content_update, baseline.content_update); assert.notEqual(recovered.content_source.find((s) => s.id === 14).updated_at, baseline.content_source.find((s) => s.id === 14).updated_at);
    for (const table of tables) { if (table === 'ability_block') assert.deepEqual(recovered[table].filter((value) => value.id !== 22108), baseline[table]); else if (table === 'content_source') assert.deepEqual(recovered[table].map((source) => source.id === 14 ? { ...source, updated_at: baseline[table].find((value) => value.id === 14).updated_at } : source), baseline[table]); else assert.deepEqual(recovered[table], baseline[table]); }
    await checkPredicate(prepared.healEffect, true); await checkPredicate(prepared.files['supabase/release/heal-companion.sql'], true); save('RECOVERED.json', recovered); observations.push({ name: phase, passed: true, all_sequences_unchanged: true, all_other_rows_and_queue_unchanged: true, parent_cache_refreshed: true });
    phase = 'heal-idempotent-reapply-no-churn'; await sql(prepared.recoveryWhole); assert.deepEqual(await snapshot(), recovered); observations.push({ name: phase, passed: true });
    phase = 'heal-restored-row-drift-refused'; await sql(tx("UPDATE public.ability_block SET description=description||' fixture drift' WHERE id=22108;\n" + prepared.recovery), 'identity is no longer absent'); assert.deepEqual(await snapshot(), recovered); observations.push({ name: phase, passed: true });
    await sql(tx(prepared.seed, true)); const reset = await snapshot();
    for (const test of prepared.cases) {
      phase = test.name;
      if (test.kind === 'heal-reject') await sql(tx(test.mutation + '\n' + prepared.recovery), test.error);
      else if (test.kind === 'heal-positive-queue') { const result = await sql(tx(test.mutation + '\n' + prepared.recovery + '\n' + prepared.healEffect)); assert.equal(result.split('\n').at(-1).split('|').at(-1), 't', 'Closed/unrelated queue still permits whole-row effect'); }
      else await checkPredicate(test.check === 'wrapper' ? prepared.wrapper : prepared.healEffect, test.expected, test.mutation);
      assert.deepEqual(await snapshot(), reset, test.name + ' must roll back complete rows/cache/queues/schema and preserve every sequence');
      observations.push({ name: test.name, passed: true, expected_predicate: test.expected, full_state_and_sequences_preserved: true });
      if (observations.length % 20 === 0) console.log(JSON.stringify({ progress: observations.length, expected: prepared.cases.length + 4, phase, at: new Date().toISOString() }));
    }
    phase = 'compatibility-migration-original-zero-write'; await sql(prepared.compatibilityWhole); assert.deepEqual(await snapshot(), reset); observations.push({ name: phase, passed: true });
    phase = 'compatibility-migration-successor-zero-write'; await sql(tx('UPDATE public.trait SET content_source_id=3 WHERE id=2584;\n' + prepared.compatibilityMigration)); assert.deepEqual(await snapshot(), reset); observations.push({ name: phase, passed: true });
    phase = 'compatibility-migration-rejects-arbitrary-trait-edit'; await sql(tx("UPDATE public.trait SET description=description||' drift' WHERE id=2584;\n" + prepared.compatibilityMigration), 'Incarnate'); assert.deepEqual(await snapshot(), reset); observations.push({ name: phase, passed: true });
    functional = true;
  } catch (error) { failure = { phase, name: error.name, message: error.message }; }
  finally {
    let removed = false, cleanupValidated = false, preserved = null;
    if (!id && attemptedStart) try { const recovered = await ownership(name); id = recovered.id; save('UNCERTAIN-START-OWNERSHIP-RECOVERY.json', recovered); } catch (error) { if (!String(error.stderr ?? '').includes('No such object') && !String(error.stderr ?? '').includes('No such container')) secondary.push({ phase: 'uncertain-start-exact-ownership-resolution', message: error.message }); }
    if (id) try { const owned = await ownership(id); save('OWNERSHIP-CLEANUP-CHECK.json', owned); cleanupValidated = true; await docker(['rm', '-f', id], 10000); removed = true; } catch (error) { secondary.push({ phase: 'strict-owned-ID-cleanup', message: error.message }); }
    try { const after = await inventory(); save('EXISTING-CONTAINERS-AFTER.json', after); preserved = beforeContainers.every((before) => after.some((now) => JSON.stringify(now) === JSON.stringify(before))); assert(preserved, 'Existing container IDs/start times/running/pause/restart/OOM state changed observationally'); } catch (error) { secondary.push({ phase: 'existing-container-state', message: error.message }); }
    try { for (const pin of prepared.pins) assert.equal(sha(fs.readFileSync(path.join(prepared.repository, pin.relative))), pin.sha256, pin.relative + ' changed during native attempt'); } catch (error) { secondary.push({ phase: 'input-byte-preservation', message: error.message }); }
    const receipt = { checked_at: new Date().toISOString(), functional_pass: functional, passed: functional && !failure && secondary.length === 0 && removed && cleanupValidated && preserved, cases: observations.length, expected_cases: prepared.cases.length + 7, observations, failure, secondary_failures: secondary, owned_container_removed: removed, strict_ownership_cleanup: cleanupValidated, existing_container_state_preserved: preserved, no_existing_container_control: true, production_SQL: false, credential_access: false, inputs: prepared.pins, wrapper_not_shortened: true, timeouts: { statement: '20s', lock: '3s', process: '30s' }, limits: prepared.fixture_limitations };
    save('FINAL-RECEIPT.json', receipt); save('MANIFEST.json', { files: fs.readdirSync(output).filter((name) => name !== 'MANIFEST.json').sort().map((name) => { const bytes = fs.readFileSync(path.join(output, name)); return { name, bytes: bytes.length, sha256: sha(bytes) }; }) }); console.log(JSON.stringify({ output, passed: receipt.passed, functional_pass: functional, cases: observations.length, expected_cases: receipt.expected_cases, failure, secondary_failures: secondary, owned_container_removed: removed })); return receipt;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2); const value = (flag) => { const index = args.indexOf(flag); assert(index >= 0 && args[index + 1], flag + ' is required'); return args[index + 1]; };
  for (let index = 0; index < args.length; index++) { const arg = args[index]; if (['--repository', '--output'].includes(arg)) index++; else assert(['--plan', '--execute-owned-native'].includes(arg), 'Unknown argument ' + arg); }
  const prepared = prepare(value('--repository'));
  if (!args.includes('--execute-owned-native')) console.log(JSON.stringify({ mode: 'inert-plan', cases: prepared.cases.length + 7, inputs: prepared.pins, fixture_image: IMAGE, fixture_limits: prepared.fixture_limitations }, null, 2));
  else { assert(!args.includes('--plan')); const result = await executeOwned(prepared, value('--output')); if (!result.passed) process.exitCode = 1; }
}
