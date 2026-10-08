import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PREVIOUS_TERMINAL_BODY_SHA256, SOURCE_CORRECTION_TERMINAL_BODY_SHA256, SOURCE_CORRECTION_UPGRADE_PATH, SOURCE_CORRECTION_PATH, sourceCorrectionRows, terminalSourceCorrectionInstaller, terminalSourceCorrectionUpgrade, wrapDisplaySourceCorrections } from './treasure-vault-native-source-corrections.mjs';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const validHash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const key = (entry) => `${entry.table}:${entry.id}`;
const templateKey = (entry) => `${entry.table}:${entry.uuid}`;
const TABLES = new Set(['ability_block', 'ancestry', 'archetype', 'background', 'class', 'class_archetype', 'creature', 'item', 'language', 'spell', 'trait', 'versatile_heritage']);
export const APPROVED_CANDIDATES = Object.freeze({
  completion100: {
    file_sha256: '67786e53c6e1e147f1bdbcd3b74c59d59f5f188ef283c451573312fcd67e3e6b',
    migration_sha256: '10230255f2d64a65d52282e902091e293e27d9696597e422232288f12d705988',
    release_sha256: '56389455410347e4bb6de4d56b2dc909d426f91bf6255125635c2bcdacd4bf2e',
    spec_sha256: '9908656a57406d06827c8e6a17f26770f367e70e11949fd5adbce77afed836ba',
  },
  display101: {
    file_sha256: '20708fca10a471241fca8a45a80725e72bc69c757436a72b1a5ac22d588fdbef',
    migration_sha256: '840d23589ec428b6272b73ad9b87b59a575e29486243de696fa08f0af81897af',
    release_sha256: '345ff9b3034efc25ef654a3451c005f4c1445afa63d77f9caf0a3dd3f98c973c',
    spec_sha256: '3b18d342a3f8cefbec78bcf85d252f4515a501dcd3b651153e1e4ab49d77001e',
  },
});
const COMPLETION_PATH = '20261002100000_treasure_vault_complete_catalog.sql';
const COMPLETION_RELEASE = 'treasure-vault-complete-catalog.sql';
const DISPLAY_PATH = '20261002101000_treasure_vault_complete_display.sql';
const DISPLAY_RELEASE = 'treasure-vault-complete-display.sql';
export const TERMINAL_HELPER = Object.freeze({
  migration: '20260927245900_treasure_vault_terminal_status.sql',
  release: 'treasure-vault-terminal-status.sql',
  signature: 'public.treasure_vault_terminal_status_v1()',
});
export const APPROVED_SHARED_CHECK = Object.freeze({
  body_sha256: SOURCE_CORRECTION_TERMINAL_BODY_SHA256,
  proof_sha256: '39c123a1676c1bb3c6492e4d55b9cd59941b182ab73b574c835b727f1d30a504',
  manifest_sha256: 'dfeec0ae6e8d18e443237f7e9bfbc6571ba8ca8c61521562a0620179b84f64c3',
});
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
const digestSql = expression => `pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((${expression})::text,'UTF8')),'hex')`;
const APPROVED_HISTORY = [
  '20260927250000_treasure_vault_dragonprism_links.sql',
  '20261001010000_treasure_vault_reference_repairs.sql', '20261001020000_treasure_vault_equipment_fields.sql', '20261001030000_treasure_vault_wand_fields.sql', '20261001040000_treasure_vault_staff_price.sql',
  '20261001050000_treasure_vault_passive_bonuses.sql', '20261001060000_treasure_vault_structured_fields.sql', '20261001070000_treasure_vault_ursine_feats.sql', '20261001080000_treasure_vault_lattice_price.sql',
  '20261001090000_treasure_vault_harnessed_trait.sql', '20261001100000_treasure_vault_wand_spell_links.sql', '20261001110000_treasure_vault_beast_staff_repairs.sql', '20261001120000_treasure_vault_remaining_wand_repairs.sql',
  '20261001130000_treasure_vault_condition_references.sql', '20261001140000_treasure_vault_library_staff_repairs.sql', '20261001150000_treasure_vault_staff_spell_citations.sql', '20261001160000_treasure_vault_library_spell_rules.sql',
  '20261001170000_treasure_vault_wand_family_repairs.sql', '20261001180000_treasure_vault_intelligent_item_repairs.sql', '20261001190000_treasure_vault_safe_passage_duration.sql', '20261001200000_treasure_vault_noisome_wand_repairs.sql',
  '20261001210000_treasure_vault_equipment_headers.sql', '20261001220000_treasure_vault_winter_resistance.sql', '20261001230000_treasure_vault_missing_equipment.sql', '20261001240000_treasure_vault_equipment_prose.sql',
  '20261002010000_treasure_vault_relic_seeds.sql', '20261002020000_treasure_vault_relic_gifts.sql', '20261002030000_treasure_vault_oozeform_chair.sql', '20261002040000_treasure_vault_physical_headers.sql',
  '20261002050000_treasure_vault_repository_selections.sql', '20261002060000_animal_companion_full_increases.sql', '20261002070000_treasure_vault_immortal_bastion_prose.sql', '20261002080000_treasure_vault_equipment_trait_definitions.sql',
  '20261002090000_treasure_vault_third_eye_apex.sql', '20261002095000_treasure_vault_scalar_mechanics.sql', '20261002096000_treasure_vault_item_operations.sql', '20261002097000_treasure_vault_artifact_access.sql',
  '20261002098000_treasure_vault_legacy_grips.sql', '20261002099000_treasure_vault_embedded_display_links.sql',
];
const NATIVE_DERIVATION = {
  full_row_expression: "(to_jsonb(r)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',r.uuid::text)",
  expected_hash_expression: "encode(sha256(convert_to(expected::text,'UTF8')),'hex')",
  template_display_normalization: 'exact reviewed self-link fields to symbolic allocated_id UUID tokens after positive-ID/type/source/cardinality validation',
};
const RECONSTRUCTION = {
  completion100_migration_delimiter: '$historical_original_dual$',
  completion100_spec_delimiter: '$completion100$',
  display101_spec_delimiter: '$display101$',
  existing_literals: 'Use pinned original100 patch.final/dependency.anchor as row100, pinned101 catalog.before/after as row100/row101, original100 patch.anchor for phase100.before and changed_columns projections. Normalize only updated_at/search_tsv and outer uuid string; id/created_at remain.',
  sources: 'Full pinned100 source.final; normalize updated_at only.',
  historical: 'Exact39 originals SHA/query SHA/removed suffix/scope must match embedded manifest; only the Dragonprism shared-release check ID is substituted.',
  terminal_helper: {
    migration: TERMINAL_HELPER.migration, release: TERMINAL_HELPER.release, signature: TERMINAL_HELPER.signature,
    body_pin: 'Exact pg_proc.prosrc SHA256, verified before invocation; helper exists before every wrapped repair',
    known_queue: 'Approved known IDs may be absent; any present known ID must equal the captured full identity and row MD5; all other matching pending routes remain rejected',
  },
};
const normalized = (input) => {
  const row = structuredClone(input);
  delete row.updated_at;
  delete row.search_tsv;
  if (row.uuid != null) row.uuid = String(row.uuid);
  return row;
};
const project = (row, fields) => Object.fromEntries(fields.map((name) => [name, row[name]]));
const same = (left, right) => { try { assert.deepEqual(left, right); return true; } catch { return false; } };
const get = (row, path) => path.reduce((value, part) => value?.[part], row);
const set = (row, path, value) => { path.slice(0, -1).reduce((parent, part) => parent[part], row)[path.at(-1)] = value; };

/** Extract exactly one reviewed SQL literal. Embedded metadata must never create dollar-tag collisions. */
function literal(sql, delimiter) {
  const parts = sql.split(delimiter);
  assert.equal(parts.length, 3, `Exactly one ${delimiter} literal`);
  return parts[1];
}

/** Validate the original migration/release/spec four-pin identity, never an unstable outer wrapper digest. */
function originalBatch(path, release, sql, releaseSql, delimiter, pins, provenance) {
  assert.equal(sha(sql), pins.migration_sha256, `${path} original migration`);
  assert.equal(sha(releaseSql), pins.release_sha256, `${release} original release`);
  const specText = literal(sql, delimiter);
  assert.equal(sha(specText), pins.spec_sha256, `${path} original specification`);
  assert.equal(literal(releaseSql, delimiter), specText, 'Migration/release specifications are byte-identical');
  assert.match(pins.file_sha256, /^[a-f0-9]{64}$/, 'Approved candidate origin pin is recorded, not a claimed tracked-file digest');
  return { path, release, sql, releaseSql, check: releaseSql.trim().replace(/;$/, ''), spec: JSON.parse(specText), proposalSha256: pins.file_sha256, proposalSha256Provenance: provenance };
}

/** Every historical source path and shared-release scope is an explicit reviewed manifest member. */
function assertHistoryManifest(manifest) {
  assert.equal(manifest.length, 39, 'All39 historical migration wrappers are mandatory');
  assert.deepEqual(manifest.map((entry) => entry.migration), APPROVED_HISTORY);
  for (const entry of manifest) {
    assert.match(entry.release, /^[a-z0-9-]+\.sql$/);
    for (const field of ['migration_sha256', 'release_sha256', 'original_query_sha256']) assert.ok(validHash(entry[field]));
    assert.match(entry.original_release_removed_suffix, /^;\s*$/);
    const expectedScope = entry.migration === APPROVED_HISTORY[0] ? { mode: 'check-id', id: 'treasure-vault-dragonprism-links' } : { mode: 'all-checks' };
    assert.deepEqual(entry.release_scope, expectedScope, 'Only the exact Dragonprism check may substitute the shared War result');
    if (entry.migration === APPROVED_HISTORY[0]) assert.equal(entry.release, 'war-of-immortals.sql');
  }
}

/** Strict metadata and ACL fingerprint, never a cached pass result. */
export function terminalFunctionState(bodySha256) {
  assert.ok(validHash(bodySha256));
  return `exists(select 1 from pg_catalog.pg_proc p
  where p.oid=pg_catalog.to_regprocedure(${quote(TERMINAL_HELPER.signature)})
    and ${digestSql('p.prosrc')}=${quote(bodySha256)}
    and p.prokind='f' and p.prolang=(select l.oid from pg_catalog.pg_language l where l.lanname='sql')
    and p.provolatile='s' and p.prosecdef is false and p.proisstrict is false and p.proleakproof is false
    and p.proparallel='u' and p.procost=100 and p.prorows=1
    and p.pronargs=0 and p.pronargdefaults=0 and p.proretset is true
    and p.prorettype=pg_catalog.to_regtype('record')
    and p.proallargtypes=array[pg_catalog.to_regtype('boolean')::oid,pg_catalog.to_regtype('boolean')::oid]
    and p.proargmodes=array['t','t']::"char"[] and p.proargnames=array['recognized','passed']::text[]
    and p.proconfig=array['search_path=""']::text[] and p.proowner=pg_catalog.to_regrole('postgres')
    and (select count(*)=3
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('postgres'))=1
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('service_role'))=1
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('supabase_read_only_user'))=1
      and bool_and((a.privilege_type='EXECUTE' and a.is_grantable is false
      and a.grantor=pg_catalog.to_regrole('postgres')
      and a.grantee in(pg_catalog.to_regrole('postgres'),pg_catalog.to_regrole('service_role'),pg_catalog.to_regrole('supabase_read_only_user'))) is true)
      from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a)
    and pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE')
    and pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
    and pg_catalog.has_function_privilege('supabase_read_only_user',p.oid,'EXECUTE'))`;
}

/** Extract the one actual checked-in helper and exact installer/release skeleton. */
export function extractReviewedTerminalHelper({ migrationSql, releaseSql }) {
  const definition = literal(migrationSql, '$terminal_definition$');
  const body = literal(definition, '$$');
  const bodySha256 = sha(body);
  assert.equal(bodySha256, APPROVED_SHARED_CHECK.body_sha256, 'Exact root-reviewed native helper body, not a self-consistent distributed rehash');
  const proofText = literal(body, '$global_dual$'), proof = JSON.parse(proofText);
  assert.equal(proofText, JSON.stringify(proof).replaceAll('$', '\\u0024'), 'Proof metadata escaping remains lossless');
  assert.equal(sha(proofText), APPROVED_SHARED_CHECK.proof_sha256, 'Exact reviewed full native proof');
  assert.equal(sha(JSON.stringify(proof.historical_files)), APPROVED_SHARED_CHECK.manifest_sha256, 'Exact original39 history manifest');
  assert.ok(body.startsWith(`\nwith global_terminal_settings as materialized(select $global_dual$${proofText}$global_dual$::jsonb as spec),\n`));
  assert.ok(body.endsWith('\nselect phase.recognized,guard.passed from global_terminal_phase phase cross join global_terminal_guard guard;\n'));
  const state = terminalFunctionState(bodySha256);
  const expectedDefinition = `create function ${TERMINAL_HELPER.signature}
returns table(recognized boolean,passed boolean)
language sql stable security invoker parallel unsafe cost 100 rows 1
set search_path = ''
as $$${body}$$;`;
  assert.ok(definition === expectedDefinition, 'Exact qualified STABLE INVOKER helper signature');
  const expectedMigration = terminalSourceCorrectionInstaller({ definition: expectedDefinition, state,
    previousState: terminalFunctionState(PREVIOUS_TERMINAL_BODY_SHA256), signature: TERMINAL_HELPER.signature });
  assert.ok(migrationSql === expectedMigration, 'No installer body, grant or readback mutation');
  assert.equal(releaseSql, `-- Only inspect definition and grants; this check does not alter or cache content.
select 'treasure-vault-terminal-status' as id,coalesce((${state}),false) as passed;
`, 'Exact SELECT-only helper metadata release');
  assert.equal((migrationSql.match(/\bas\s+\$\$/gi) ?? []).length, 1);
  return { path: TERMINAL_HELPER.migration, release: TERMINAL_HELPER.release, signature: TERMINAL_HELPER.signature,
    sql: migrationSql, releaseSql, check: releaseSql.trim().replace(/;$/, ''), definition, body, bodySha256,
    proof, proofText, proofSha256: sha(proofText), state, migrationSha256: sha(migrationSql), releaseSha256: sha(releaseSql) };
}

/** Verify the added successor wrapper while retaining the exact original101 four-pin proof. */
export function extractReviewedDisplaySourceWrapper({ migrationSql, releaseSql, helper }) {
  const originalSql = literal(migrationSql, '$display_original_source$');
  const start = releaseSql.indexOf('\noriginal_checks as(\n') + '\noriginal_checks as(\n'.length;
  const end = releaseSql.lastIndexOf('\n)\nselect o.id,case when c.passed');
  assert.ok(start > 0 && end > start);
  const originalReleaseSql = releaseSql.slice(start, end) + ';\n';
  assert.equal(sha(originalSql), APPROVED_CANDIDATES.display101.migration_sha256);
  assert.equal(sha(originalReleaseSql), APPROVED_CANDIDATES.display101.release_sha256);
  const spec = JSON.parse(literal(originalSql, '$display101$'));
  const patches = sourceCorrectionRows(spec);
  const expected = wrapDisplaySourceCorrections({ originalSql, originalReleaseSql, patches,
    helperState: helper.state, locks: historicalWrapperLocks(helper.proof), signature: TERMINAL_HELPER.signature });
  assert.equal(migrationSql, expected.migration, 'Exact101 successor wrapper and no fallback bypass');
  assert.equal(releaseSql, expected.release, 'Exact101 successor SELECT and unchanged original predicates');
  return { originalSql, originalReleaseSql, patches };
}

export function historicalWrapperLocks(proof) {
  const tables = [...new Set(proof.entries.map(entry => entry.table))].sort();
  for (const table of tables) assert.ok(TABLES.has(table));
  for (const table of ['item', 'creature', 'trait']) assert.ok(tables.includes(table), 'Every counted table is locked');
  return `lock table public.content_update in share mode;\n  lock table public.content_source in share mode;\n  ${tables.map(table => `lock table public.${table} in share row exclusive mode;`).join('\n  ')}\n  perform s.id from public.content_source s where s.id in(${proof.sources.map(source => source.id).join(',')}) order by s.id for share;`;
}

/** Require exact originals, caller locks and the one shared helper pin. */
export function extractReviewedWrapper({ migrationSql, releaseSql, manifest, helper }) {
  assert.ok(!migrationSql.includes('$global_dual$') && !releaseSql.includes('$global_dual$'), 'Global proof occurs only in the shared helper');
  const proof = helper.proof, original = literal(migrationSql, '$historical_original_dual$');
  assert.equal(sha(original), manifest.migration_sha256, 'Exact original migration body');
  const locks = historicalWrapperLocks(proof);
  const expectedMigration = `-- Preserve the original repair; use the pinned shared terminal check.
do $historical_dual$
declare completion_recognized boolean;completion_passed boolean;
begin
  ${locks}
  if (${helper.state}) is not true then
    raise exception 'Treasure Vault terminal helper is missing or differs from the reviewed definition';
  end if;
  select s.recognized,s.passed into strict completion_recognized,completion_passed from ${TERMINAL_HELPER.signature} s;
  if completion_recognized is null or completion_passed is null then
    raise exception 'Treasure Vault terminal helper returned an invalid status';
  end if;
  if completion_recognized then
    if completion_passed is not true then raise exception 'Treasure Vault catalog/display successor is partial or unreviewed';end if;
    return;
  end if;
  execute $historical_original_dual$${original}$historical_original_dual$;
end $historical_dual$;
`;
  assert.ok(migrationSql === expectedMigration, 'Exact wrapper body, locks, helper pin and no fallback bypass');
  const statusCtes = `terminal_function as materialized(select (${helper.state}) as valid),
terminal_status as materialized(select case when f.valid is true then
  coalesce((select pg_catalog.to_jsonb(s) from ${TERMINAL_HELPER.signature} s),'{"recognized":true,"passed":false}'::jsonb)
  else '{"recognized":true,"passed":false}'::jsonb end as value from terminal_function f)`;
  const recognized = "coalesce((status.value->>'recognized')::boolean,true)";
  const applies = manifest.release_scope.mode === 'check-id'
    ? `original_checks.id=${quote(manifest.release_scope.id)} and ${recognized}` : recognized;
  const header = `-- Preserve original check IDs and predicates; use the pinned shared terminal check.\nwith ${statusCtes},\noriginal_checks as(\n`;
  const footer = `\n)\nselect original_checks.id,case when ${applies} then coalesce((status.value->>'passed')::boolean,false) else original_checks.passed end as passed from original_checks cross join terminal_status status;\n`;
  assert.ok(releaseSql.startsWith(header) && releaseSql.endsWith(footer), 'Strict helper release and original scoped CASE');
  const footerStart = releaseSql.lastIndexOf(footer);
  assert.equal(footerStart, releaseSql.length - footer.length);
  const originalQuery = releaseSql.slice(header.length, footerStart);
  assert.equal(sha(originalQuery), manifest.original_query_sha256, 'Exact original query');
  const originalRelease = originalQuery + manifest.original_release_removed_suffix;
  assert.equal(sha(originalRelease), manifest.release_sha256, 'Exact original release query/suffix');
  if (manifest.release_scope.mode === 'check-id') {
    const ids = [...originalQuery.matchAll(/^select[ \t]+'([^']+)'(?:[ \t]+as[ \t]+id)?[ \t]*,/gim)].map(match => match[1]);
    assert.equal(ids.length, 35); assert.equal(ids.filter(id => id === manifest.release_scope.id).length, 1);
  }
  return { originalSql: original, originalReleaseSql: originalRelease, originalQuery,
    migrationSha256: sha(migrationSql), releaseSha256: sha(releaseSql), originalMigrationSha256: sha(original),
    originalReleaseSha256: sha(originalRelease), originalQuerySha256: sha(originalQuery), releaseScope: manifest.release_scope,
    helperSignature: helper.signature, helperBodySha256: helper.bodySha256 };
}

/** Reconstruct every symbolic row from101; no validation-only IDs or JavaScript PostgreSQL-row digests. */
function symbolicTemplates(spec100, spec101) {
  const before = [...spec100.prerequisites, ...spec100.inserts];
  const after = [...spec101.prerequisites, ...spec101.inserts];
  const descriptor = ({ table, uuid, name, row, binding }) => ({ table, uuid, name, row, binding });
  assert.deepEqual(after.map(descriptor), before.map(descriptor), 'Full template rows and chair binding descriptors remain exact');
  return after.map((entry) => {
    const row_100 = structuredClone(entry.row), row_101 = structuredClone(entry.row), symbolic_fields = [];
    assert.ok(!Object.hasOwn(row_100, 'id') && !Object.hasOwn(row_100, 'created_at'));
    for (const field of entry.display_fields) {
      assert.equal(get(row_100, field.path), field.before);
      set(row_101, field.path, field.after_template);
      for (const binding of field.bindings) {
        const target = after.find((candidate) => candidate.table === binding.table && String(candidate.uuid) === binding.uuid);
        assert.ok(target && target.row.content_source_id === 16);
        assert.equal(binding.uuid, String(entry.uuid), 'Only exact owner self helper URLs are symbolically normalized');
        symbolic_fields.push({ path: field.path, uuid: binding.uuid, table: binding.table, type: binding.table, token: `{{allocated_id:${binding.uuid}}}`, runtime_validation: 'exact unique global UUID; positive actual ID; complete target template/source domain; replace only exact helper URL in this reviewed field' });
      }
    }
    return { table: entry.table, type: entry.type, uuid: entry.uuid, name: entry.name, row_100, row_101, binding: entry.binding ?? null, symbolic_fields, role: spec100.prerequisites.some((candidate) => templateKey(candidate) === templateKey(entry)) ? 'prerequisite' : 'insert', ...(!same(row_100, row_101) ? { phase101_keys: [...new Set(entry.display_fields.map((field) => field.path[0]))] } : {}) };
  });
}

/** Build full native-hashing inputs from actual tracked specs and verify complete embedded digest membership. */
export function reconstructDualNativeContract(spec100, spec101, proof) {
  assert.equal(proof.schema, 'wg-tv-dual-terminal-native-hashes-v1');
  assert.deepEqual(proof.candidates, APPROVED_CANDIDATES);
  assert.deepEqual(proof.reconstruction, RECONSTRUCTION);
  assert.equal(proof.native_derivation.literal_readback_equality, true, 'Native literal/readback fidelity is mandatory');
  assert.equal(proof.native_derivation.actual_row_hashes, true);
  assert.equal(proof.native_derivation.authentic_full_ci_chronology, true);
  assert.equal(proof.native_derivation.generated_id_mapping, false);
  assert.equal(proof.native_derivation.queue_imports, false);
  assert.match(proof.native_derivation.postgres_version, /^PostgreSQL /);
  assert.ok(validHash(proof.native_derivation.derivation_sql_sha256));
  assert.equal(proof.native_derivation.symbolic_normalization, 'Only complete ](link_TYPE_ID) tokens, never prefixes or other fields');
  for (const [field, value] of Object.entries(NATIVE_DERIVATION)) assert.equal(proof.native_derivation[field], value);
  assertHistoryManifest(proof.historical_files);
  assert.equal(spec101.completion_spec_sha256, APPROVED_CANDIDATES.completion100.spec_sha256);
  assert.deepEqual(spec100.counts, proof.counts);
  assert.deepEqual(spec100.counts.final, spec101.counts);
  assert.deepEqual(spec100.known_pending_dependencies, spec101.known_pending_dependencies);
  assert.deepEqual(spec100.known_pending_dependencies, proof.known_pending_dependencies);
  assert.deepEqual(spec101.sources, spec100.sources.map((source) => ({ id: source.id, name: source.name, row: source.final })));
  const display = new Map(spec101.catalog.map((entry) => [key(entry), entry]));
  const originals = [...spec100.patches, ...spec100.dependencies];
  const originalsByKey = new Map(originals.map((entry) => [key(entry), entry]));
  assert.equal(originalsByKey.size, originals.length);
  assert.equal(display.size, spec101.catalog.length);
  assert.deepEqual([...display.keys()].sort(), originals.map(key).sort(), '100 domain cannot be silently omitted');
  const expected_entries = originals.map((entry) => {
    assert.ok(TABLES.has(entry.table));
    const counterpart = display.get(key(entry)), row_100 = normalized(entry.final ?? entry.anchor), row_before_100 = normalized(entry.anchor), row_101 = counterpart.after;
    assert.deepEqual(counterpart.before, row_100);
    assert.equal(row_100.created_at, row_before_100.created_at, 'Full native digest includes original created_at');
    assert.equal(row_101.created_at, row_100.created_at);
    const role = entry.final ? 'owner' : 'dependency', phase100_keys = entry.changed_columns;
    return { table: entry.table, id: entry.id, type: entry.type, role, row_before_100, row_100, row_101, ...(phase100_keys ? { phase100_keys, phase100_before: project(row_before_100, phase100_keys), phase100_after: project(row_100, phase100_keys) } : {}), ...(spec101.operation_owners.includes(key(entry)) ? { phase101_keys: ['operations'], phase101_before: { operations: row_100.operations }, phase101_after: { operations: row_101.operations } } : {}) };
  });
  const expected_templates = symbolicTemplates(spec100, spec101);
  const exactSet = (actual, expected, identify) => { assert.equal(actual.length, expected.length); assert.equal(new Set(actual.map(identify)).size, actual.length); assert.deepEqual(actual.map(identify).sort(), expected.map(identify).sort()); };
  exactSet(proof.entries, expected_entries, key);
  exactSet(proof.templates, expected_templates, templateKey);
  exactSet(proof.sources, spec100.sources, (entry) => String(entry.id));
  const entriesByKey = new Map(expected_entries.map((entry) => [key(entry), entry]));
  for (const entry of proof.entries) {
    const expected = entriesByKey.get(key(entry));
    const original = originalsByKey.get(key(entry));
    for (const field of ['id', 'uuid', 'name', 'content_source_id']) assert.equal(String(entry[field]), String(expected.row_100[field]));
    assert.ok(validHash(entry.sha256_before_100), 'Actual predecessor whole-row digest is retained');
    assert.equal(entry.role, expected.role);
    assert.equal(entry.type, expected.type);
    assert.equal(entry.before_name, original.final ? original.anchor.name : expected.row_100.name);
    assert.equal(entry.before_uuid, original.final ? original.anchor.uuid : expected.row_100.uuid);
    assert.deepEqual(entry.url_aliases, [...new Set([original.final ? original.anchor.meta_data?.source?.url : undefined, expected.row_100.meta_data?.source?.url].filter(Boolean))]);
    assert.equal(entry.canonical_identity_change, original.changed_columns?.some((field) => ['name', 'uuid'].includes(field)) ?? false);
    for (const phase of ['100', '101']) {
      assert.ok(validHash(entry[`sha256_${phase}`]));
      assert.deepEqual(entry[`phase${phase}_keys`], expected[`phase${phase}_keys`]);
      if (expected[`phase${phase}_keys`]) {
        assert.ok(validHash(entry[`phase${phase}_before_sha256`]) && validHash(entry[`phase${phase}_after_sha256`]));
        assert.notEqual(entry[`phase${phase}_before_sha256`], entry[`phase${phase}_after_sha256`]);
      }
    }
  }
  for (const entry of proof.templates) {
    const expected = expected_templates.find((candidate) => templateKey(candidate) === templateKey(entry));
    const original = [...spec100.prerequisites, ...spec100.inserts].find((candidate) => templateKey(candidate) === templateKey(entry));
    const display = [...spec101.prerequisites, ...spec101.inserts].find((candidate) => templateKey(candidate) === templateKey(entry));
    for (const field of ['table', 'uuid', 'name', 'role', 'row_100', 'row_101', 'binding', 'symbolic_fields', 'phase101_keys']) assert.deepEqual(entry[field], expected[field]);
    assert.equal(entry.type, original.type);
    assert.equal(entry.content_source_id, 16);
    assert.deepEqual(entry.display_fields, display.display_fields);
    assert.deepEqual(entry.aliases, original.aliases ?? []);
    assert.deepEqual(entry.url_aliases, [original.row.meta_data?.source?.url].filter(Boolean));
    for (const phase of ['100', '101']) assert.ok(validHash(entry[`sha256_${phase}`]));
    if (expected.phase101_keys) {
      assert.ok(validHash(entry.phase101_before_sha256) && validHash(entry.phase101_after_sha256));
      assert.notEqual(entry.phase101_before_sha256, entry.phase101_after_sha256);
    }
  }
  for (const source of proof.sources) {
    const original = spec100.sources.find((candidate) => candidate.id === source.id);
    assert.equal(source.name, original.name);
    assert.deepEqual(source.url_aliases, [...new Set([original.anchor.url, original.final.url].filter(Boolean))]);
    assert.ok(validHash(source.sha256_before_100));
    assert.ok(validHash(source.sha256)); assert.equal(source.sha256_101, source.sha256);
  }
  assert.deepEqual(proof.entries.filter((entry) => entry.sha256_100 !== entry.sha256_101).map(key).sort(), spec101.operation_owners.slice().sort());
  assert.deepEqual(proof.templates.filter((entry) => entry.sha256_100 !== entry.sha256_101).map(templateKey).sort(), [...spec101.prerequisites, ...spec101.inserts].filter((entry) => entry.display_fields.length).map(templateKey).sort());
  const counts = { owners: spec100.patches.length, dependencies: spec100.dependencies.length, catalog: originals.length, sources: spec100.sources.length, prerequisites: spec100.prerequisites.length, inserts: spec100.inserts.length, changed_catalog_hashes: spec101.operation_owners.length, changed_template_hashes: expected_templates.filter((entry) => entry.phase101_keys).length, symbolic_fields: expected_templates.reduce((count, entry) => count + entry.symbolic_fields.length, 0), symbolic_self_occurrences: expected_templates.reduce((count, entry) => count + entry.symbolic_fields.reduce((total, field) => total + get(entry.row_101, field.path).split(`](link_${field.type}_${field.token})`).length - 1, 0), 0) };
  assert.deepEqual(counts, { owners: 1127, dependencies: 1222, catalog: 2349, sources: 31, prerequisites: 7, inserts: 4, changed_catalog_hashes: 14, changed_template_hashes: 7, symbolic_fields: 6, symbolic_self_occurrences: 9 });
  return {
    schema: proof.schema, candidates: proof.candidates,
    native_derivation: { ...NATIVE_DERIVATION, postgres_version: 'MUST BE ACTUAL POSTGRESQL VERSION, NOT A PLACEHOLDER IN AN ACCEPTED LEDGER' },
    counts,
    entry_contract: 'entries[] {table,id,uuid,name,content_source_id,role,sha256_100,sha256_101}; owner entries additionally phase100_keys,phase100_before_sha256,phase100_after_sha256;14 display entries additionally phase101_keys,phase101_before_sha256,phase101_after_sha256. All row and projection digests must be PG-native with literal/readback equality proved.',
    template_contract: 'templates[] {table,uuid,name,role,row_100,row_101,binding,symbolic_fields,sha256_100,sha256_101};7 changed display templates additionally phase101_keys,phase101_before_sha256,phase101_after_sha256. Exact runtime self references normalize only approved fields, not arbitrary prose.',
    expected_entries,
    expected_sources: spec100.sources.map((source) => ({ id: source.id, name: source.name, row_before_100: source.anchor, row_100: source.final, row_101: source.final })),
    reconstruction: RECONSTRUCTION,
    expected_entry_projections: expected_entries.map((entry) => ({ table: entry.table, id: entry.id, role: entry.role, ...(entry.phase100_keys ? { phase100_keys: entry.phase100_keys } : {}), ...(entry.phase101_keys ? { phase101_keys: entry.phase101_keys } : {}) })),
    expected_templates, historical_files: proof.historical_files, known_pending_dependencies: proof.known_pending_dependencies,
    mandatory_native_controls: [
      "Install exact helper before earliest Dragonprism; all39 actual original bootstrap stages remain unrecognized;100 original body bootstrap; exact100 and exact101 replay",
      "Missing/changed helper body, volatility/security/search_path/return shape/owner/ACL drift fail closed; PUBLIC/anon/authenticated cannot execute; postgres/service_role/supabase_read_only_user can execute",
      "Actual helper performs current whole-domain checks for every separate call; writer and trigger mutations between calls are not masked by cached prior truth",
      "actual wrappers reject mixed100/101 owner/template domains and any retained100/101 marker with unknown owner/dependency/source/queue state",
      "Approved known queue IDs absent, exact one/both present, or removed are valid; edited/replaced present IDs and all additional matching pending routes reject",
      "two different legitimate actual-ID allocations;wrong/missing/duplicate UUIDs,types,sources,positive IDs,chair giveItem,self URLs,missing/repeated-extra self spans",
      "full id/created_at/native literal/readback digest fidelity; full source/queue/saved rows preserved; late-trigger rollback",
      "shared War release: only exact Dragonprism check accepts100/101; all34 unrelated original checks remain rigid; corrupt unrelated War owner fails even at complete TV terminal; missing War armor copies fail and are never repaired after100"
    ],
  };
}

/** Default CI requires actual checked-in helper, all39 wrappers,100 and101. No private input fallback. */
export function loadTreasureVaultDefaultNativeInputs({ root, readText = path => readFile(path, 'utf8') }) {
  return (async () => {
    assert.equal(typeof root, 'string');
    const read = (directory, filename) => readText(resolve(root, 'supabase', directory, filename));
    const filenames = [
      ['migrations', COMPLETION_PATH], ['release', COMPLETION_RELEASE],
      ['migrations', DISPLAY_PATH], ['release', DISPLAY_RELEASE],
      ['migrations', TERMINAL_HELPER.migration], ['release', TERMINAL_HELPER.release],
      ['release', 'requirements.json'],
      ['migrations', SOURCE_CORRECTION_UPGRADE_PATH], ['release', 'treasure-vault-terminal-source-corrections.sql'],
      ['migrations', SOURCE_CORRECTION_PATH], ['release', 'treasure-vault-source-corrections.sql'],
    ];
    const snapshots = await Promise.all(filenames.map(([directory, filename]) => read(directory, filename)));
    const [completionSql, completionReleaseSql, displaySql, displayReleaseSql, helperSql, helperReleaseSql, requirementsText, sourceUpgradeSql, sourceUpgradeReleaseSql, sourceRepairSql, sourceRepairReleaseSql] = snapshots;
    const helper = extractReviewedTerminalHelper({ migrationSql: helperSql, releaseSql: helperReleaseSql });
    const proof = helper.proof;
    assert.deepEqual(proof.candidates, APPROVED_CANDIDATES);
    assertHistoryManifest(proof.historical_files);
    assert.ok(TERMINAL_HELPER.migration.slice(0, 14) < proof.historical_files[0].migration.slice(0, 14));
    const metadata = proof.completion100_original;
    assert.ok(metadata, 'Pinned original100 query/suffix/scope metadata is mandatory');
    assert.equal(metadata.migration_sha256, APPROVED_CANDIDATES.completion100.migration_sha256);
    assert.equal(metadata.release_sha256, APPROVED_CANDIDATES.completion100.release_sha256);
    assert.ok(validHash(metadata.original_query_sha256));
    assert.match(metadata.original_release_removed_suffix, /^;\s*$/);
    assert.deepEqual(metadata.release_scope, { mode: 'all-checks' });
    const completionWrapper = extractReviewedWrapper({ migrationSql: completionSql, releaseSql: completionReleaseSql, manifest: metadata, helper });
    const requirements = JSON.parse(requirementsText);
    assert.deepEqual(requirements[COMPLETION_PATH], { check: COMPLETION_RELEASE, order: 'before-functions' });
    assert.deepEqual(requirements[DISPLAY_PATH], { check: DISPLAY_RELEASE, order: 'before-functions' });
    assert.deepEqual(requirements[TERMINAL_HELPER.migration], { check: TERMINAL_HELPER.release, order: 'before-functions', function_signature: TERMINAL_HELPER.signature });
    assert.equal(Object.keys(requirements).filter(name => name.slice(0, 14) === TERMINAL_HELPER.migration.slice(0, 14)).length, 1, 'Only the registered shared helper may own its version');
    const wrapperMetadata = [], originalHistorical = [];
    async function verifyHistoricalFiles(manifest) {
      assert.deepEqual(manifest, proof.historical_files, 'Caller cannot shrink or alter the reviewed39 manifest');
      const current = await Promise.all(filenames.map(([directory, filename]) => read(directory, filename)));
      for (let index = 0; index < snapshots.length; index++) assert.equal(current[index], snapshots[index], `Current ${filenames[index].join('/')} remains the exact loaded snapshot`);
      for (const entry of manifest) {
        assert.equal(requirements[entry.migration]?.check, entry.release);
        const [migrationSql, releaseSql] = await Promise.all([read('migrations', entry.migration), read('release', entry.release)]);
        const verified = extractReviewedWrapper({ migrationSql, releaseSql, manifest: entry, helper });
        if (!wrapperMetadata.some(wrapper => wrapper.path === entry.migration)) {
          wrapperMetadata.push({ path: entry.migration, release: entry.release, sql: migrationSql, releaseSql, ...verified });
          originalHistorical.push({ path: entry.migration, release: entry.release, sql: verified.originalSql, releaseSql: verified.originalReleaseSql, check: verified.originalQuery });
        }
      }
      assert.equal(wrapperMetadata.length, 39);
      return wrapperMetadata;
    }
    /** Fresh PostgreSQL evidence must independently reproduce every embedded native digest. */
    async function verifyFreshNativeLedger(ledger) {
      await verifyHistoricalFiles(contract.historical_files);
      assert.equal(ledger.schema, proof.schema);
      assert.deepEqual(ledger.candidates, proof.candidates);
      assert.deepEqual(ledger.historical_files, proof.historical_files);
      assert.deepEqual(ledger.counts, contract.counts);
      assert.deepEqual(ledger.known_pending_dependencies, proof.known_pending_dependencies);
      for (const field of ['literal_readback_equality', 'actual_row_hashes', 'authentic_full_ci_chronology']) assert.equal(ledger.native_derivation[field], true);
      for (const field of ['queue_imports', 'generated_id_mapping']) assert.equal(ledger.native_derivation[field], false);
      for (const [field, expected] of Object.entries(NATIVE_DERIVATION)) assert.equal(ledger.native_derivation[field], expected);
      assert.match(ledger.native_derivation.postgres_version, /^PostgreSQL /);
      assert.ok(validHash(ledger.native_derivation.derivation_sql_sha256));
      assert.equal(ledger.native_derivation.symbolic_normalization, proof.native_derivation.symbolic_normalization);
      function compareRows(actual, expected, identify, identityFields, digestFields) {
        assert.equal(actual.length, expected.length);
        const map = new Map(actual.map(row => [identify(row), row]));
        assert.equal(map.size, actual.length);
        assert.deepEqual([...map.keys()].sort(), expected.map(identify).sort());
        for (const row of expected) {
          const fresh = map.get(identify(row));
          for (const field of identityFields) assert.deepEqual(fresh[field], row[field], `Fresh native identity ${identify(row)}.${field}`);
          for (const field of digestFields) {
            assert.deepEqual(fresh[field], row[field], `Fresh PostgreSQL digest ${identify(row)}.${field}`);
            if (row[field] != null) assert.ok(validHash(fresh[field]));
          }
        }
      }
      compareRows(ledger.entries, proof.entries, key,
        ['table', 'id', 'type', 'role', 'uuid', 'name', 'content_source_id', 'phase100_keys', 'phase101_keys'],
        ['sha256_before_100', 'sha256_100', 'sha256_101', 'phase100_before_sha256', 'phase100_after_sha256', 'phase101_before_sha256', 'phase101_after_sha256']);
      compareRows(ledger.templates, proof.templates, templateKey,
        ['table', 'type', 'uuid', 'name', 'role', 'row_100', 'row_101', 'binding', 'symbolic_fields', 'phase101_keys'],
        ['sha256_before_100', 'sha256_100', 'sha256_101', 'phase101_before_sha256', 'phase101_after_sha256']);
      compareRows(ledger.sources, proof.sources, row => String(row.id), ['id', 'name'], ['sha256_before_100', 'sha256', 'sha256_101']);
      return { catalog: ledger.entries.length, sources: ledger.sources.length, templates: ledger.templates.length, all_native_digests_reproduced: true };
    }
    // Reject exact file/registry alterations before rebuilding the complete row contract.
    await verifyHistoricalFiles(proof.historical_files);
    const completion = originalBatch(COMPLETION_PATH, COMPLETION_RELEASE, completionWrapper.originalSql, completionWrapper.originalReleaseSql, '$completion100$', proof.candidates.completion100, 'approved candidate origin metadata derived from tracked wrapper, not a private file read');
    const displayWrapper = extractReviewedDisplaySourceWrapper({ migrationSql: displaySql, releaseSql: displayReleaseSql, helper });
    const displayOriginal = originalBatch(DISPLAY_PATH, DISPLAY_RELEASE, displayWrapper.originalSql, displayWrapper.originalReleaseSql, '$display101$', proof.candidates.display101, 'approved candidate origin metadata verified against tracked original SQL, not a private file read');
    const display = { ...displayOriginal, sql: displaySql, releaseSql: displayReleaseSql, check: displayReleaseSql.trim().replace(/;$/, ''), originalSql: displayWrapper.originalSql, originalReleaseSql: displayWrapper.originalReleaseSql };
    const patches = sourceCorrectionRows(display.spec);
    const sourceRepairSpec = JSON.parse(literal(sourceRepairSql, '$source_corrections102$'));
    assert.deepEqual(sourceRepairSpec.patches.map(({ id, before, after }) => ({ table: 'item', id, before, after })), patches, 'The repair and compatibility guard accept the same three full rows');
    assert.deepEqual(JSON.parse(literal(sourceRepairReleaseSql, '$source_corrections102$')), sourceRepairSpec);
    assert.deepEqual(sourceRepairSpec.source, display.spec.sources.find(source => source.id === 16).row);
    assert.equal(sourceUpgradeSql, terminalSourceCorrectionUpgrade({ state: helper.state, previousState: terminalFunctionState(PREVIOUS_TERMINAL_BODY_SHA256), patches, signature: helper.signature }));
    assert.equal(sourceUpgradeReleaseSql, `-- Only inspect the exact source-corrected helper definition and unchanged grants.\nselect 'treasure-vault-terminal-source-corrections' as id,coalesce((${helper.state}),false) as passed;\n`);
    assert.deepEqual(requirements[SOURCE_CORRECTION_UPGRADE_PATH], { check: 'treasure-vault-terminal-source-corrections.sql', order: 'before-functions' });
    assert.deepEqual(requirements[SOURCE_CORRECTION_PATH], { check: 'treasure-vault-source-corrections.sql', order: 'before-functions' });
    const sourceCorrections = { path: SOURCE_CORRECTION_PATH, sql: sourceRepairSql, releaseSql: sourceRepairReleaseSql, spec: sourceRepairSpec, patches,
      upgrade: { path: SOURCE_CORRECTION_UPGRADE_PATH, sql: sourceUpgradeSql, releaseSql: sourceUpgradeReleaseSql } };
    const contract = reconstructDualNativeContract(completion.spec, display.spec, proof);
    return {
      completion, display, helper, contract, sourceCorrections, verifyHistoricalFiles, verifyFreshNativeLedger, originalHistorical,
      completionWrapper: { path: COMPLETION_PATH, release: COMPLETION_RELEASE, sql: completionSql, releaseSql: completionReleaseSql, ...completionWrapper },
      actualWrapperMetadata: wrapperMetadata, embeddedProof: proof,
      input_provenance: {
        mode: 'checked-in-default', proof_sha256: helper.proofSha256, actual_helper_body_sha256: helper.bodySha256,
        actual_helper_migration_sha256: helper.migrationSha256, actual_helper_release_sha256: helper.releaseSha256,
        actual_completion_wrapper_sha256: sha(completionSql), actual_completion_release_wrapper_sha256: sha(completionReleaseSql),
        actual_display_migration_sha256: sha(displaySql), actual_display_release_sha256: sha(displayReleaseSql),
        approved_candidate_origin_pins: proof.candidates, contract_reconstructed_from_actual_literals: true,
        external_private_input_files: [],
      },
    };
  })();
}

/** Give each rehearsal fresh native ledgers; callers use exclusive writes and never overwrite previous evidence. */
export function uniqueNativeLedgerPaths(receiptPath, runId = randomUUID()) {
  assert.equal(typeof receiptPath, 'string');
  assert.match(runId, /^[a-zA-Z0-9-]+$/);
  const ledger = `${receiptPath}.${runId}.dual-native-hashes.json`;
  return { ledger, derivation: `${ledger}.derivation.sql` };
}
