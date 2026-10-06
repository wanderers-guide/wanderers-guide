import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const sha = value => createHash('sha256').update(value).digest('hex');
const q = value => "'" + String(value).replaceAll("'", "''") + "'";

/** Compare rollback content/schema exactly, allowing only declared real nextval calls. */
export function assertNativeRestoration({before,after,expectedCalls = {},sequenceForTable}) {
  assert.deepEqual(after.tuples, before.tuples, 'Every public/Auth/saved tuple restored');
  assert.equal(after.schema_sha256, before.schema_sha256, 'Schema, helper body/ACL, RLS, constraints and triggers restored');
  assert.equal(after.roles_sha256, before.roles_sha256, 'Role attributes and membership restored');
  assert.deepEqual(Object.keys(after.sequences).sort(), Object.keys(before.sequences).sort());
  const allowed = new Map();
  for (const [table, count] of Object.entries(expectedCalls)) {
    assert.ok(Number.isSafeInteger(count) && count > 0);
    const path = sequenceForTable(table);
    assert.ok(!allowed.has(path)); allowed.set(path, count);
  }
  const observed = [];
  for (const [path, baseline] of Object.entries(before.sequences)) {
    const actual = after.sequences[path], count = allowed.get(path) ?? 0;
    if (!count) { assert.deepEqual(actual, baseline, path + ': no unreviewed identity consumption'); continue; }
    assert.equal(baseline.cache, '1', 'Exact nextval accounting requires the real CACHE 1 identity sequence');
    assert.equal(baseline.cycle, false);
    const expected = {...baseline,is_called:true,last_value:String(BigInt(baseline.last_value) + BigInt(baseline.increment) * BigInt(baseline.is_called ? count : count - 1))};
    assert.deepEqual(actual, expected, path + ': only the declared original insert path may consume nextval');
    observed.push({sequence:path,calls:count,before:baseline,after:actual});
  }
  assert.equal(observed.length, allowed.size, 'Every expected sequence exists in the actual fixture');
  return observed;
}

/** The same strict read-only release reader is used for real queries and malformed-result controls. */
export function createNativePhaseRunner({fixture,receipt,stage,selectedNegativeFiles = null,checkpoint=async()=>{},log=()=>{}}) {
  assert.equal(typeof log,'function');
  const sequenceForTable = table => {
    assert.ok(['item','creature','content_update'].includes(table));
    const path = fixture.queryJson(`select to_jsonb(pg_get_serial_sequence('public.${table}','id'));`);
    assert.match(path, /^public\.[a-z_]+$/); return path;
  };
  const restored = (before, calls = {}) => assertNativeRestoration({before,after:fixture.snapshot(),expectedCalls:calls,sequenceForTable});
  function releaseRows(check) {
    const body = check.trim().replace(/;\s*$/, '');
    const result = fixture.sql(`begin read only;select row_to_json(r) from (${body}) r;rollback;`);
    return result.stdout.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  }
  function assertRelease(rows, expectedIds = null) {
    assert.ok(rows.length, 'Release must return at least one check');
    for (const row of rows) { assert.equal(typeof row.id, 'string'); assert.ok(row.id.trim().length > 0, 'Release check ID must be nonempty'); assert.equal(row.passed, true, row.id + ': strict boolean success required'); }
    assert.equal(new Set(rows.map(row => row.id)).size, rows.length, 'Duplicate check IDs reject');
    if (expectedIds) assert.deepEqual(rows.map(row => row.id).sort(), [...expectedIds].sort());
    return rows;
  }
  async function readOnly(batch, expectedIds = null) {
    await checkpoint('read-only '+batch.path);
    const before = fixture.snapshot();
    const rows = assertRelease(releaseRows(batch.releaseSql), expectedIds);
    restored(before);
    (receipt.release_checks ??= []).push({path:batch.path,ids:rows.map(row => row.id),sql_sha256:sha(batch.releaseSql),read_only:true,full_state_preserved:true});
    return rows;
  }
  async function replay(batch, label = 'replay') {
    await checkpoint('replay '+batch.path);
    const before = fixture.snapshot();
    await stage(label + ':' + batch.path, batch.sql); restored(before);
    await readOnly(batch);
    (receipt.exact_replays ??= []).push({path:batch.path,migration_sha256:sha(batch.sql),sequences_preserved:true,full_state_preserved:true});
  }
  async function negatives(plan,{mandatory=false}={}) {
    assert.equal(typeof mandatory,'boolean');
    for (const recipe of plan.cases) {
      await checkpoint('negative '+recipe.name);
      if (!mandatory&&selectedNegativeFiles && !selectedNegativeFiles.has(recipe.batch.path)) continue;
      const started=Date.now();
      const control = recipe.prepare();
      const before = fixture.snapshot();
      const prefix = "begin;set local lock_timeout='5s';set local statement_timeout='600s';";
      // A setup type, FK, DDL or parser error is not the intended guard rejection.
      const setupResult = fixture.sql(prefix + control.setup + "\nselect 'native_setup_ok';rollback;", true);
      assert.equal(setupResult.status, 0, recipe.name + ': setup must execute against the actual schema');
      assert.equal(setupResult.signal,null,recipe.name+': successful setup cannot be a process signal');
      assert.equal(setupResult.error==null,true,recipe.name+': setup transport must succeed');
      assert.equal(setupResult.stdout.trim().split('\n').at(-1), 'native_setup_ok');
      restored(before);
      const result = fixture.sql(prefix + control.setup + '\n' + control.batch.sql + '\nrollback;', true);
      assert.equal(result.status, 3, recipe.name + ': exact noninteractive ON_ERROR_STOP script error, not fatal1/connection2');
      assert.equal(result.signal,null,recipe.name+': native script error cannot be a process signal');
      assert.equal(result.error==null,true,recipe.name+': transport failure is not native rejection');
      assert.match(result.stderr, new RegExp(`ERROR:\\s+${control.expectedSqlState}:`), recipe.name + ': exact SQLSTATE');
      assert.match(result.stderr, control.match, recipe.name + ': exact original guard');
      await checkpoint('after negative '+recipe.name);
      const afterGuard=fixture.snapshot();
      const consumption=assertNativeRestoration({before,after:afterGuard,expectedCalls:control.sequence_expectation.expected_nextval_calls,sequenceForTable});
      for (const assertion of control.assertions) assertion();
      if (control.includeRelease) {
        // With no intervening callbacks or writes, the actual proven guard
        // restoration is the release baseline. Unknown postconditions require
        // a fresh snapshot instead of assuming they are read-only.
        const releaseBefore=control.assertions.length?fixture.snapshot():afterGuard;
        const rows = fixture.queryJson(prefix + control.setup + '\nselect coalesce(jsonb_agg(to_jsonb(r)),\'[]\'::jsonb) from (' + control.batch.releaseSql.trim().replace(/;\s*$/, '') + ') r;rollback;');
        assert.ok(rows.length && rows.some(row => row.passed === false), recipe.name + ': release cannot report all true');
        restored(releaseBefore);
      }
      const record={name:recipe.name,phase:recipe.phase,path:control.batch.path,elapsed_ms:Date.now()-started,mandatory_scope:mandatory,setup_sha256:sha(control.setup),actual_reservations:control.reservations,expected_sqlstate:control.expectedSqlState,actual_exit_status:result.status,actual_signal:result.signal,no_transport_error:result.error==null,setup_status:setupResult.status,setup_signal:setupResult.signal,guard_message_matched:true,original_guard:true,setup_type_proved:true,rollback_schema_tuples_saved_preserved:true,sequence_consumption:consumption};
      (receipt.negative_controls ??= []).push(record);log({kind:'negative',...record});
    }
  }
  async function after(plan) {
    await negatives(plan);
    for (const batch of plan.positiveReplays) await replay(batch, plan.phase);
  }
  async function knownQueueLifecycle(cases) {
    for (const recipe of cases) {
      await checkpoint('optional queue '+recipe.name);
      const control = recipe.prepare(), before = fixture.snapshot();
      const results = fixture.sql('begin;' + control.helper_status_sql + control.insert_incorrect_present + control.helper_status_sql + control.remove + control.helper_status_sql + 'rollback;').stdout.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
      assert.deepEqual(results, [control.expected_before,control.expected_incorrect_present,control.expected_removed]);
      restored(before);
      (receipt.optional_queue_controls ??= []).push({name:recipe.name,absent_positive:true,incorrect_present_negative:true,removal_positive:true,actual_auth:true,private_expected_body_imported:false,full_state_preserved:true});
    }
  }
  function strictReleaseEdges(cases) {
    const before = fixture.snapshot();
    for (const control of cases) {
      const rows = releaseRows(control.check);
      assert.throws(() => assertRelease(rows, control.ids), {name:'AssertionError'}, control.name);
      (receipt.release_result_negatives ??= []).push({name:control.name,passed:true});
    }
    restored(before);
  }
  return {negatives,after,replay,readOnly,knownQueueLifecycle,strictReleaseEdges};
}
