import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const sha = value => createHash('sha256').update(value).digest('hex');

/**
 * Actual control builder only. The caller must first load the reviewed
 * checked-in release inputs, identify its owned PostgreSQL fixture, and
 * distinguish transport errors from the exact PostgreSQL rejection below.
 * This module performs no reads, writes, output, SQL execution or connections.
 */
export function buildTerminalHelperMetadataControls(inputs) {
  assert.equal(inputs.input_provenance.mode, 'checked-in-default');
  assert.equal(typeof inputs.verifyHistoricalFiles, 'function');
  assert.equal(typeof inputs.verifyFreshNativeLedger, 'function');
  const helper = inputs.helper;
  assert.equal(helper.signature, 'public.treasure_vault_terminal_status_v1()');
  assert.equal(helper.path, '20260927245900_treasure_vault_terminal_status.sql');
  assert.equal(helper.bodySha256, sha(helper.body));
  assert.equal(helper.proof.native_derivation.authentic_full_ci_chronology, true);
  assert.equal(helper.proof.native_derivation.generated_id_mapping, false);
  assert.equal(helper.proof.native_derivation.queue_imports, false);
  assert.equal(inputs.actualWrapperMetadata.length, 39);
  const signature = helper.signature;
  const transaction = body => `begin;\n${body}\nrollback;\n`;
  const metadata = helper.releaseSql;
  assert.equal(helper.state.split('p.proleakproof is false').length, 2);
  const leakproofState = helper.state.replace('p.proleakproof is false', 'p.proleakproof is true');
  const adminTransaction = setup => transaction(`do $native_metadata_admin$
begin
  if current_user<>'supabase_admin' or session_user<>'supabase_admin'
    or not exists(select 1 from pg_catalog.pg_roles where rolname=current_user and rolsuper is true) then
    raise exception 'Native metadata superuser transport was not independently verified';
  end if;
end $native_metadata_admin$;
${setup}
set local role postgres;
do $native_metadata_execution$
begin
  if current_user<>'postgres' or session_user<>'supabase_admin'
    or not exists(select 1 from pg_catalog.pg_roles where rolname=current_user and rolsuper is false)
    or (${leakproofState}) is not true then
    raise exception 'Native metadata leakproof setup or ordinary execution role was not verified';
  end if;
end $native_metadata_execution$;
${metadata}`);
  const controls = [
    { name: 'install-exact-helper', kind: 'installer', sql: helper.sql, expected: 'success' },
    { name: 'inspect-native-definition-and-acl', kind: 'inspection', expected: 'native-attributes',
      sql: `select jsonb_build_object('body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'kind',p.prokind,'volatility',p.provolatile,'security_definer',p.prosecdef,'strict',p.proisstrict,'leakproof',p.proleakproof,'parallel',p.proparallel,'cost',p.procost,'rows',p.prorows,'arg_count',p.pronargs,'retset',p.proretset,'ret_type',p.prorettype::regtype::text,'all_arg_types',p.proallargtypes,'arg_modes',p.proargmodes,'arg_names',p.proargnames,'configuration',p.proconfig,'owner',p.proowner::regrole::text,'acl',p.proacl)::text from pg_proc p where p.oid=to_regprocedure('${signature}');` },
    { name: 'helper-definition-read-only-release', kind: 'release', sql: `begin read only;\n${metadata}\nrollback;`, expected: true },
    { name: 'exact-installer-replay', kind: 'installer', sql: helper.sql, expected: 'success-no-content-write' },
  ];
  for (const role of ['postgres', 'service_role']) controls.push({
    name: `execute-${role}`, kind: 'privilege', expected: 'one-boolean-status-row',
    sql: transaction(`set local role ${role};select row_to_json(status) from ${signature} status;`),
  });
  for (const role of ['anon', 'authenticated']) controls.push({
    name: `deny-${role}`, kind: 'sql-rejection', expectedSqlState: '42501',
    expectedSetupMarker: `native-metadata-execution-role:${role}`,
    sql: transaction(`set local role ${role};select 'native-metadata-execution-role:${role}' where current_user='${role}';select * from ${signature};`),
  });
  const mutations = [
    ['volatile', `alter function ${signature} volatile;`],
    ['immutable', `alter function ${signature} immutable;`],
    ['security-definer', `alter function ${signature} security definer;`],
    ['strict', `alter function ${signature} strict;`],
    ['leakproof', `alter function ${signature} leakproof;`],
    ['parallel-safe', `alter function ${signature} parallel safe;`],
    ['cost', `alter function ${signature} cost 1;`],
    ['rows', `alter function ${signature} rows 2;`],
    ['search-path-public', `alter function ${signature} set search_path='public';`],
    ['search-path-unset', `alter function ${signature} reset all;`],
    ['owner', `alter function ${signature} owner to service_role;`],
    ['public-execute', `grant execute on function ${signature} to public;`],
    ['anon-execute', `grant execute on function ${signature} to anon;`],
    ['authenticated-execute', `grant execute on function ${signature} to authenticated;`],
    ['service-grant-option', `grant execute on function ${signature} to service_role with grant option;`],
    ['service-execute-revoked', `revoke execute on function ${signature} from service_role;`],
    ['body', `create or replace function ${signature} returns table(recognized boolean,passed boolean) language sql stable security invoker parallel unsafe cost 100 rows 1 set search_path='' as $metadata_mutant$select true,true;$metadata_mutant$;`],
    ['return-name', `drop function ${signature};${helper.definition.replace('returns table(recognized boolean,passed boolean)', 'returns table(recognised boolean,passed boolean)')}revoke all on function ${signature} from public,anon,authenticated;grant execute on function ${signature} to postgres,service_role;`],
    ['language-plpgsql', `create or replace function ${signature} returns table(recognized boolean,passed boolean) language plpgsql stable security invoker parallel unsafe cost 100 rows 1 set search_path='' as $metadata_language$begin return query select true,true;end;$metadata_language$;`],
    ['return-output-type', `drop function ${signature};create function ${signature} returns table(recognized boolean,passed integer) language sql stable security invoker parallel unsafe cost 100 rows 1 set search_path='' as $metadata_type$select true,1;$metadata_type$;revoke all on function ${signature} from public,anon,authenticated;grant execute on function ${signature} to postgres,service_role;`],
  ];
  for (const [name, setup] of mutations) controls.push({ name: `reject-${name}-metadata`, kind: 'release', executionLogin: name==='leakproof'?'supabase_admin':'postgres', executionRole:'postgres', sql: name==='leakproof'?adminTransaction(setup):transaction(`${setup}\n${metadata}`), expected: false });
  controls.push({ name: 'missing-helper-release-is-false', kind: 'release', sql: transaction(`drop function ${signature};\n${metadata}`), expected: false });
  const wrappers = [...inputs.actualWrapperMetadata, inputs.completionWrapper];
  assert.equal(wrappers.length, 40);
  for (const wrapper of wrappers) {
    controls.push({ name: `missing-helper-migration:${wrapper.path}`, kind: 'sql-rejection', expectedSqlState: 'P0001', sql: () => transaction(`drop function ${signature};\n${wrapper.sql}`) });
    // SQL resolves the absent function before CASE evaluation. This is an error,
    // not a fabricated {passed:false} result, and must still be a hard rejection.
    controls.push({ name: `missing-helper-query:${wrapper.path}`, kind: 'sql-rejection', expectedSqlState: '42883', sql: () => transaction(`drop function ${signature};\n${wrapper.releaseSql}`) });
  }
  controls.push({ name: 'unknown-existing-definition-installer-rejects', kind: 'sql-rejection', expectedSqlState: 'P0001', sql: transaction(`${mutations.find(([name]) => name === 'body')[1]}\n${helper.sql}`) });
  return {
    helper_body_sha256: helper.bodySha256,
    required_transports: { ordinary:'postgres', privileged_setup:'supabase_admin', execution_role:'postgres', privileged_control_names:['reject-leakproof-metadata'] },
    native_expected: { configuration: ['search_path=""'], argument_modes: ['t', 't'], argument_names: ['recognized', 'passed'], output_types: ['boolean', 'boolean'], owner: 'postgres', direct_execute_roles: ['postgres', 'service_role'], grant_option: false },
    controls,
    limits: ['Metadata/permission proof only, not all39 own-stage or whole-catalog behavioral acceptance.', 'Each mutant rolls back. Expected query errors must be distinguished from transport/process failures.', 'Language and output-type recreation controls also change the body; they prove rejection of those complete altered definitions, not isolated causality for one catalog attribute.', 'Full catalog preservation, mixed terminals, writer order/fresh calls, optional exact queue rows, trigger rollback and all39 actual own stages remain separate mandatory controls.'],
  };
}

/** Read-only authority checks must run through each genuine caller-owned login. */
export function metadataAuthorityInspectionSql(login) {
  assert.ok(['postgres','supabase_admin'].includes(login));
  return `select jsonb_build_object(
    'session_user',session_user,'current_user',current_user,
    'current_superuser',(select rolsuper from pg_catalog.pg_roles where rolname=current_user),
    'postgres_superuser',(select rolsuper from pg_catalog.pg_roles where rolname='postgres'),
    'admin_superuser',(select rolsuper from pg_catalog.pg_roles where rolname='supabase_admin'),
    'owns_helper',(select proowner=pg_catalog.to_regrole('postgres') from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('public.treasure_vault_terminal_status_v1()')),
    'service_role_membership',pg_catalog.pg_has_role('postgres','service_role','MEMBER'),
    'anon_role_membership',pg_catalog.pg_has_role('postgres','anon','MEMBER'),
    'authenticated_role_membership',pg_catalog.pg_has_role('postgres','authenticated','MEMBER'),
    'postgres_schema_create',pg_catalog.has_schema_privilege('postgres','public','CREATE'),
    'service_schema_create',pg_catalog.has_schema_privilege('service_role','public','CREATE'),
    'sql_language_usage',pg_catalog.has_language_privilege('postgres','sql','USAGE'),
    'plpgsql_language_usage',pg_catalog.has_language_privilege('postgres','plpgsql','USAGE')
  );`;
}

/** No role is manufactured or promoted, and unsupported setup authority is not green. */
export function assertMetadataAuthorityResult(login,result) {
  assert.ok(['postgres','supabase_admin'].includes(login));
  assert.equal(result.error==null,true);assert.equal(result.signal,null);assert.equal(result.status,0);
  const row=JSON.parse(result.stdout.trim());
  assert.deepEqual(row,{
    session_user:login,current_user:login,current_superuser:login==='supabase_admin',
    postgres_superuser:false,admin_superuser:true,owns_helper:true,
    service_role_membership:true,anon_role_membership:true,authenticated_role_membership:true,
    postgres_schema_create:true,service_schema_create:true,sql_language_usage:true,plpgsql_language_usage:true,
  },'Exact real login/function-owner/schema/language/role setup authority');
  return row;
}

/** A failed SET ROLE must not masquerade as a denied EXECUTE on the target helper. */
export function assertMetadataRejectionSetup(control,result) {
  if(control.expectedSetupMarker) {
    assert.equal(control.kind,'sql-rejection');assert.equal(control.expectedSqlState,'42501');
    assert.deepEqual(result.stdout.trim().split('\n').filter(Boolean),[control.expectedSetupMarker],
      'The intended role switch must succeed before the target function denies EXECUTE');
  }
}
