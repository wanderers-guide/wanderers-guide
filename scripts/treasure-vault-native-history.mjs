import assert from 'node:assert/strict';
import { buildTerminalHelperMetadataControls,metadataAuthorityInspectionSql,assertMetadataAuthorityResult,assertMetadataRejectionSetup } from './treasure-vault-native-metadata.mjs';

// Actual shared-history controls. No connection, writes or execution at import.
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
const json = value => quote(JSON.stringify(value)) + '::jsonb';
const tables = new Set(['ability_block','ancestry','archetype','background','class','class_archetype','creature','item','language','spell','trait','versatile_heritage']);
export function createAuthenticSharedHistoryControls(context) {
  const { inputs, query, sql, sqlAsAdmin,stateDigest, receipt, stage,checkpoint=async()=>{} } = context;
  assert.equal(inputs.actualWrapperMetadata.length, 39);
  assert.equal(inputs.contract.expected_entries.length, 2349);
  const helper = inputs.helper, signature = helper.signature;
  receipt.shared_history = { own_stage: [], terminal: [], negatives: [], metadata: [], limits: [
    'This module proves actual shared helper/history only. Original batch, writer, allocation and pending-alias evidence must come from their independently required modules.',
    'Sanitized queue is empty. Exact private known-row present acceptance is not tested or imported. A separate mandatory pending-alias family uses the real owned GoTrue user, never a fake Auth row or foreign-key bypass.',
  ] };
  const statusSql = `select row_to_json(s) from ${signature} s;`;
  function status(expected) {
    assert.equal(query(`select (${helper.state});`), 't', 'Exact helper attributes/body/ACL');
    const row = JSON.parse(query(statusSql));
    assert.equal(typeof row.recognized, 'boolean'); assert.equal(typeof row.passed, 'boolean');
    if (expected) assert.deepEqual(row, expected);
    return row;
  }
  function rows(check) {
    const body = check.trim().replace(/;\s*$/, '');
    const result = JSON.parse(query(`select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb) from (${body}) r;`));
    assert.ok(result.length); assert.equal(new Set(result.map(row => row.id)).size, result.length);
    for (const row of result) { assert.equal(typeof row.id, 'string'); assert.equal(typeof row.passed, 'boolean'); }
    return result;
  }
  function unchanged(before) { assert.equal(stateDigest().sha256, before.sha256, 'Every public tuple, timestamp, generated field and sequence is preserved'); }
  function update(table, id, row, fields) {
    assert.ok(tables.has(table)); assert.ok(Number.isSafeInteger(id));
    for (const field of fields) assert.match(field, /^[a-z_]+$/);
    return `update public.${table} r set ${fields.map(field => `"${field}"=typed."${field}"`).join(',')} from jsonb_populate_record(null::public.${table},${json(row)})typed where r.id=${id};`;
  }
  async function reject(name, setup, wrapper = inputs.completionWrapper) {
    await checkpoint('shared-history negative '+name);
    const before = stateDigest(), beforeStatus = status({ recognized: true, passed: true });
    const seen = JSON.parse(query(`begin;${setup}\n${statusSql}rollback;`));
    assert.deepEqual(seen, { recognized: true, passed: false }, `${name}: actual whole-domain helper rejection`);
    unchanged(before);
    const result = sql(`begin;set local lock_timeout='5s';set local statement_timeout='300s';${setup}\n${wrapper.sql}\nrollback;`, true);
    assert.equal(result.status, 3, `${name}: exact noninteractive ON_ERROR_STOP script error, not fatal1/connection2`);
    assert.equal(result.signal,null);
    assert.equal(result.error==null,true);
    assert.match(result.stderr, /ERROR:\s+P0001:\s+Treasure Vault catalog\/display successor is partial or unreviewed/);
    unchanged(before); assert.deepEqual(status(), beforeStatus);
    const releaseRows = JSON.parse(query(`begin;${setup}\nselect jsonb_agg(to_jsonb(r) order by r.id) from (${wrapper.releaseSql.trim().replace(/;\s*$/, '')}) r;rollback;`));
    assert.ok(releaseRows.some(row => row.passed === false), `${name}: actual release rejects`);
    unchanged(before);
    receipt.shared_history.negatives.push({ name, passed: true,actual_exit_status:result.status,actual_signal:result.signal,no_transport_error:result.error==null,expected_sqlstate:'P0001', actual_helper: true, actual_wrapper: wrapper.path, actual_release: true, rollback_and_full_state_preserved: true });
    await checkpoint('after shared-history negative '+name);
  }
  async function ownStage(wrapper) {
    const before = stateDigest(); assert.equal(status().recognized, false, `Legitimate predecessor before ${wrapper.path}`);
    const originalBefore = rows(wrapper.originalReleaseSql), wrappedBefore = rows(wrapper.releaseSql);
    assert.deepEqual(wrappedBefore, originalBefore, 'At this same stage no future/shared release predicate is bypassed');
    unchanged(before);
    await stage(wrapper.path + '-actual-wrapper-bootstrap', wrapper.sql);
    assert.equal(status().recognized, false, `Legitimate predecessor after ${wrapper.path}`);
    const originalAfter = rows(wrapper.originalReleaseSql), wrappedAfter = rows(wrapper.releaseSql);
    assert.deepEqual(wrappedAfter, originalAfter);
    const terminal = stateDigest();
    await stage(wrapper.path + '-own-stage-replay', wrapper.sql); unchanged(terminal);
    receipt.shared_history.own_stage.push({ path: wrapper.path, passed: true, before_sha256: before.sha256, after_sha256: terminal.sha256, original_migration_sha256: wrapper.originalMigrationSha256, original_release_sha256: wrapper.originalReleaseSha256, before_recognized: false, after_recognized: false, original_and_wrapped_values_equal: true, original_check_ids: originalAfter.map(row => row.id), replay_full_state_preserved: true });
  }
  async function metadataControls(phase) {
    assert.equal(phase,'100','The complete metadata family runs once at the actual100 terminal');
    assert.equal(typeof sqlAsAdmin,'function','A fixed verified administrator transport is required only for the named leakproof and verifier controls');
    const plan = buildTerminalHelperMetadataControls(inputs);
    assert.deepEqual(plan.required_transports,{ordinary:'postgres',privileged_setup:'supabase_admin',execution_role:'postgres',privileged_control_names:['reject-leakproof-metadata','execute-supabase_read_only_user']});
    assert.equal(plan.controls.length,113);
    const authorityBefore=stateDigest();status({recognized:true,passed:true});
    const marker=helper.proof.entries.find(row=>row.sha256_100!==row.sha256_101);assert.ok(marker);assert.ok(tables.has(marker.table));assert.ok(Number.isSafeInteger(marker.id));
    assert.equal(query(`select encode(sha256(convert_to(((to_jsonb(r)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',r.uuid::text))::text,'UTF8')),'hex') from public.${marker.table} r where id=${marker.id};`),marker.sha256_100,'Actual complete-row100 phase witness, not only a supplied label');
    for(const login of ['postgres','supabase_admin']) {
      await checkpoint('helper metadata authority '+login);
      const statement=metadataAuthorityInspectionSql(login);
      const result=(login==='supabase_admin'?sqlAsAdmin:sql)(statement,true);
      const witness=assertMetadataAuthorityResult(login,result);
      unchanged(authorityBefore);status({recognized:true,passed:true});
      (receipt.shared_history.metadata_authorities??=[]).push({phase,login,witness,actual_exit_status:result.status,actual_signal:result.signal,no_transport_error:result.error==null,full_state_preserved:true});
    }
    for (const control of plan.controls) {
      await checkpoint('helper metadata '+control.name);
      const before = stateDigest(), statement = typeof control.sql === 'function' ? control.sql() : control.sql;
      const login=control.executionLogin??'postgres';assert.ok(['postgres','supabase_admin'].includes(login));
      if(login==='supabase_admin') {
        assert.ok(plan.required_transports.privileged_control_names.includes(control.name));
        if(control.name==='reject-leakproof-metadata') {
          assert.equal(control.kind,'release');assert.equal(control.expected,false);assert.equal(control.executionRole,'postgres');
        } else {
          assert.equal(control.name,'execute-supabase_read_only_user');assert.equal(control.kind,'privilege');
          assert.equal(control.expected,'one-boolean-status-row');assert.equal(control.executionRole,'supabase_read_only_user');
        }
      }
      const result = (login==='supabase_admin'?sqlAsAdmin:sql)(statement, true);
      assert.equal(result.error==null,true);assert.equal(result.signal,null);
      if (control.kind === 'sql-rejection') {
        assert.equal(result.status, 3);assert.equal(result.signal,null); assert.match(result.stderr, new RegExp(`ERROR:\\s+${control.expectedSqlState}:`), control.name);
        assertMetadataRejectionSetup(control,result);
      } else {
        assert.equal(result.status, 0, result.stderr);
        if (control.kind === 'release') assert.equal(result.stdout.trim().split('|').at(-1), control.expected ? 't' : 'f', control.name);
        if (control.kind === 'privilege') {
          const row = JSON.parse(result.stdout.trim()); assert.deepEqual(row, { recognized: true, passed: true });
        }
        if (control.kind === 'inspection') {
          const row = JSON.parse(result.stdout.trim()); assert.equal(row.body_sha256, helper.bodySha256);
          assert.equal(row.owner, 'postgres'); assert.equal(row.security_definer, false); assert.deepEqual(row.arg_names, ['recognized', 'passed']);
        }
      }
      unchanged(before); status({ recognized: true, passed: true });
      const executionRole=control.executionRole??/^(?:deny|execute)-(postgres|service_role|supabase_read_only_user|anon|authenticated)$/.exec(control.name)?.[1]??'postgres';
      receipt.shared_history.metadata.push({ name: control.name, phase,passed: true, sql_kind: control.kind, setup_login:login,execution_role:executionRole,setup_marker:control.expectedSetupMarker??null,actual_exit_status:result.status,actual_signal:result.signal,no_transport_error:result.error==null,expected_sqlstate: control.expectedSqlState ?? null, causality: /language-plpgsql|return-output-type/.test(control.name) ? 'Combined complete definition rejection; body also changed' : 'Reviewed complete fingerprint/permission control', full_state_preserved: true });
    }
  }
  async function terminalPhase(phase) {
    status({ recognized: true, passed: true });
    const before = stateDigest();
    for (const wrapper of [...inputs.actualWrapperMetadata, inputs.completionWrapper]) {
      await stage(`${phase}-${wrapper.path}-exact-terminal-replay`, wrapper.sql); unchanged(before);
      const original = rows(wrapper.originalReleaseSql), wrapped = rows(wrapper.releaseSql);
      if (wrapper.releaseScope.mode === 'check-id') {
        const id = wrapper.releaseScope.id;
        assert.deepEqual(wrapped.filter(row => row.id !== id), original.filter(row => row.id !== id));
        assert.equal(wrapped.find(row => row.id === id).passed, true);
      }
      assert.ok(wrapped.every(row => row.passed)); unchanged(before);
    }
    receipt.shared_history.terminal.push({ phase, passed: true, historical_migrations: 39, completion100_wrapper: 1, exact_release_values_preserved: true, all_final_release_checks_true: true, full_state_sha256: before.sha256 });
  }
  async function commonNegatives() {
    status({ recognized: true, passed: true });
    for (const role of ['owner', 'dependency']) {
      const row = inputs.contract.expected_entries.find(row => row.role === role && row.table === 'item'); assert.ok(row);
      await reject(`${role}-full-row-drift`, `update public.item set name=name||' unreviewed' where id=${row.id};`);
      await reject(`${role}-creation-date-drift`, `update public.item set created_at=created_at+interval '1 second' where id=${row.id};`);
    }
    for (const source of inputs.contract.expected_sources) await reject(`source-${source.id}-full-row-drift`, `update public.content_source set description=coalesce(description,'')||' unreviewed' where id=${source.id};`);
    for (const template of inputs.contract.expected_templates) {
      const actual = JSON.parse(query(`select to_jsonb(r) from public.${template.table} r where uuid::text=${quote(template.uuid)};`));
      assert.ok(actual.id > 0 && actual.content_source_id === 16);
      await reject(`template-${template.uuid}-name`, `update public.${template.table} set name=name||' unreviewed' where id=${actual.id};`);
      await reject(`template-${template.uuid}-missing`, `delete from public.${template.table} where id=${actual.id};`);
      await reject(`template-${template.uuid}-wrong-source`, `update public.${template.table} set content_source_id=3 where id=${actual.id};`);
      if (template.binding) {
        const changed = structuredClone(actual); const op = changed.operations.find(op => op.id === template.binding.operation_id); assert.ok(op); op.data.itemId = -30002;
        await reject('chair-exact-runtime-attack-binding', update(template.table, actual.id, changed, ['operations']));
      }
    }
    for (const row of inputs.contract.expected_entries.filter(row => row.phase101_keys)) await reject(`mixed101-catalog-${row.table}-${row.id}`, update(row.table, row.id, row.row_100, row.phase101_keys));
    const owner = inputs.contract.expected_entries.find(row => row.role === 'owner' && row.table === 'item');
    receipt.shared_history.queue_insertion_negatives = {scope:'Required separate real-user pending-alias module; this history module cannot claim its execution.',private_known_body_acceptance:false};
    // Current-call freshness: two separate statements in one transaction must see the intervening write.
    const before = stateDigest();
    const result = query(`begin;${statusSql}update public.item set name=name||' unreviewed' where id=${owner.id};${statusSql}rollback;`).split('\n').filter(Boolean).map(line => JSON.parse(line));
    assert.deepEqual(result, [{ recognized: true, passed: true }, { recognized: true, passed: false }]); unchanged(before);
    receipt.shared_history.negatives.push({ name: 'separate-statement-freshness-not-cached', passed: true, rollback_and_full_state_preserved: true });
    const war = inputs.actualWrapperMetadata.find(row => row.releaseScope.mode === 'check-id');
    const values = JSON.parse(query(`begin;update public.ability_block set name='Native unrelated War corruption' where id=38754;select jsonb_build_object('global',(select row_to_json(s) from ${signature} s),'original',(select jsonb_agg(to_jsonb(r) order by id) from (${war.originalQuery})r),'wrapped',(select jsonb_agg(to_jsonb(r) order by id) from (${war.releaseSql.trim().replace(/;\s*$/, '')})r));rollback;`));
    assert.deepEqual(values.global, { recognized: true, passed: true });
    assert.equal(values.original.find(row => row.id === 'war-fields').passed, false);
    assert.equal(values.wrapped.find(row => row.id === 'treasure-vault-dragonprism-links').passed, true);
    assert.deepEqual(values.wrapped.filter(row => row.id !== 'treasure-vault-dragonprism-links'), values.original.filter(row => row.id !== 'treasure-vault-dragonprism-links'));
    unchanged(before); receipt.shared_history.negatives.push({ name: 'unrelated-War-corruption-retains-original34-predicates', passed: true, rollback_and_full_state_preserved: true });
    assert.equal(query('select count(*) from public.content_update;'), '0');
  }
  return { status, ownStage, metadataControls, terminalPhase, commonNegatives };
}
