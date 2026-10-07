import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { assertNativeRestoration } from './treasure-vault-native-phases.mjs';

const q=value=>"'"+String(value).replaceAll("'","''")+"'";
const sha=value=>createHash('sha256').update(value).digest('hex');
const countedTables=['item','creature','trait'];
const timeouts="set local lock_timeout='250ms';set local statement_timeout='600s';";
const validPid=pid=>assert.ok(Number.isSafeInteger(pid)&&pid>0,'An actual positive pg_backend_pid is mandatory');
const sequenceFor=(fixture,table)=>{
  assert.ok(['item','creature','content_update'].includes(table));
  const name=fixture.queryJson(`select to_jsonb(pg_get_serial_sequence('public.${table}','id'));`);
  assert.match(name,/^public\.[a-z_]+$/);return name;
};

/** An exact affected-row assertion prevents a missing setup from becoming a false lock proof. */
function oneRow(statement) {
  return `do $native_writer_setup$ declare affected bigint;begin ${statement}get diagnostics affected=row_count;if affected<>1 then raise exception 'Native writer setup did not affect exactly one actual row';end if;end $native_writer_setup$;`;
}

/** Observe the actual transaction and relation locks, not a sleep or a simulated marker. */
export function observeNativeHeldSession({fixture,session,required}) {
  fixture.assertOwned();validPid(session.pid);
  const row=fixture.queryJson(`select jsonb_build_object('activity',(select to_jsonb(a)-'query' from pg_catalog.pg_stat_activity a where a.pid=${session.pid} and a.datname=current_database()),'locks',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'mode',l.mode,'granted',l.granted) order by n.nspname,c.relname,l.mode),'[]'::jsonb) from pg_catalog.pg_locks l join pg_catalog.pg_class c on c.oid=l.relation join pg_catalog.pg_namespace n on n.oid=c.relnamespace where l.pid=${session.pid} and l.locktype='relation'));`);
  assert.equal(row.activity?.pid,session.pid);assert.equal(row.activity.state,'idle in transaction');assert.ok(row.activity.xact_start);
  for(const [table,mode]of required)assert.ok(row.locks.some(lock=>lock.schema==='public'&&lock.table===table&&lock.mode===mode&&lock.granted===true),'Actual granted '+table+' '+mode);
  return {pid:session.pid,state:row.activity.state,xact_start:row.activity.xact_start,locks:row.locks};
}

/** A SQL transport death is never accepted as the intended lock rejection. */
export function assertNativeLockTimeout(result,label) {
  assert.ok(result.error==null,label+': no transport error qualifies as a native lock rejection');
  assert.equal(result.status,3,label+': piped ON_ERROR_STOP script error, not fatal1 or connection2');
  assert.equal(result.signal,null,label+': no terminated child qualifies');
  assert.equal(result.ready,false,label+': failed command cannot report a completed readiness marker');
  assert.match(result.stderr,/ERROR:\s+55P03:\s+canceling statement due to lock timeout/i,label+': exact native lock SQLSTATE');
  assert.doesNotMatch(result.stderr,/EPIPE|connection to server was lost|server closed the connection|terminating connection due to crash|PANIC:/i);
}

/**
 * Construct only authentic ordinary writers. Actual nextval/Auth resolution is
 * owned by the caller's genuine offline fixture, not by imported private bodies.
 */
function prepareWriterPlan({inputs,fixture,userId,phase}) {
  fixture.assertOwned();assert.match(userId,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  const user=fixture.queryJson(`select jsonb_build_object('auth',(select count(*) from auth.users where id=${q(userId)}::uuid),'public',(select count(*) from public.public_user where user_id=${q(userId)}::uuid));`);
  assert.deepEqual(user,{auth:1,public:1},'A genuine signup/public trigger user is required');
  const owner=inputs.completion.spec.patches.find(row=>row.table==='item'&&row.anchor.content_source_id===16);assert.ok(owner);
  assert.ok(Number.isSafeInteger(owner.id)&&owner.id>0);
  const currentOwner=fixture.queryJson(`select jsonb_build_object('id',id,'source',content_source_id,'uuid',uuid::text) from public.item where id=${owner.id};`);
  assert.equal(currentOwner.id,owner.id);assert.equal(currentOwner.source,16);assert.equal(currentOwner.uuid,String(owner.anchor.uuid));
  const writers=[];
  for(const table of countedTables) {
    const row=fixture.queryJson(`select jsonb_build_object('id',r.id,'source',r.content_source_id,'uuid',r.uuid::text) from public.${table} r join public.content_source s on s.id=r.content_source_id where r.content_source_id<>16 and s.is_published is true and s.user_id is null order by r.id limit 1;`);
    assert.ok(Number.isSafeInteger(row.id)&&row.id>0);assert.ok(Number.isSafeInteger(row.source)&&row.source>0&&row.source!==16);
    writers.push({table,identity:row,statement:oneRow(`update public.${table} set content_source_id=16 where id=${row.id} and content_source_id=${row.source};`),basis:'Actual foreign-source published row enters the source16 count predicate. No fabricated canonical row.'});
  }
  writers.push({table:'content_source',identity:{id:16},statement:oneRow('update public.content_source set description=description where id=16;'),basis:'Actual source row writer, including timestamps/triggers.'});
  const beforeReservation=fixture.snapshot(),proposalId=fixture.reserveProposalId();
  assert.ok(Number.isSafeInteger(proposalId)&&proposalId>0);
  const reservation=assertNativeRestoration({before:beforeReservation,after:fixture.snapshot(),expectedCalls:{content_update:1},sequenceForTable:table=>sequenceFor(fixture,table)});
  const data=JSON.stringify({id:owner.id,uuid:String(owner.anchor.uuid),name:owner.anchor.name,content_source_id:16});
  writers.push({table:'content_update',identity:{id:proposalId,user_id:userId,type:'item',ref_id:owner.id,content_source_id:16},statement:oneRow(`insert into public.content_update(id,user_id,type,ref_id,content_source_id,action,data,upvotes,downvotes,status) values(${proposalId},${q(userId)}::uuid,'item',${owner.id},16,'UPDATE',${q(data)}::json,'{}'::json[],'{}'::json[],'{"state":"PENDING"}'::json);`),basis:'Genuine GoTrue identity plus actual proposal nextval reserved before the rollback baseline. No private expected body.'});
  return {phase,owner:currentOwner,proposal_id:proposalId,reservation,writers,
    ordinaryWriter:oneRow(`update public.item set name=name where id=${owner.id} and content_source_id=16;`)};
}

/**
 * Exact positive100/101 bodies with two actual persistent PostgreSQL sessions.
 * openSession.run appends and consumes its own unique psql completion marker;
 * success returns ready:true while the transaction remains open. The reviewed
 * nonTTY pipe with ON_ERROR_STOP reports script errors as raw exit3, never a
 * normalized nonzero result. Errors retain stderr/ready:false. No import effects.
 */
export async function runNativeWriterOrdering({inputs,fixture,phase,userId,receipt}) {
  assert.equal(inputs.input_provenance.mode,'checked-in-default');assert.ok(['before100','before101'].includes(phase));
  assert.equal(typeof fixture.openSession,'function','A reviewed actual asynchronous owned-session transport is mandatory');
  assert.equal(typeof fixture.assertOwned,'function');fixture.assertOwned();
  const batch=phase==='before100'?inputs.completionWrapper:inputs.display;
  const expectedCalls=phase==='before100'?{item:4}:{};
  if(phase==='before100')assert.equal(inputs.completion.spec.inserts.length,4);
  assert.equal(fixture.query(`select (${inputs.helper.state});`),'t');
  const status=fixture.queryJson('select row_to_json(s) from '+inputs.helper.signature+' s;');
  if(phase==='before100')assert.equal(status.recognized,false,'Execute before completion markers exist, not against a remapped terminal');
  else assert.deepEqual(status,{recognized:true,passed:true},'Execute101 against the actual complete100 baseline');
  const plan=prepareWriterPlan({inputs,fixture,userId,phase}),baseline=fixture.snapshot();
  const evidence={phase,batch:batch.path,migration_sha256:sha(batch.sql),private_curator_bodies_imported:false,reservation:plan.reservation,proposal_id:plan.proposal_id,cases:[],passed:false};
  (receipt.native_writer_controls??=[]).push(evidence);
  const sessions=new Set();
  const restored=calls=>assertNativeRestoration({before:baseline,after:fixture.snapshot(),expectedCalls:calls,sequenceForTable:table=>sequenceFor(fixture,table)});
  async function opened(label) {
    fixture.assertOwned();const session=await fixture.openSession({label:phase+'-'+label});validPid(session.pid);
    assert.equal(typeof session.run,'function');assert.equal(typeof session.close,'function');sessions.add(session);return session;
  }
  async function close(session) {await session.close({rollback:true});sessions.delete(session);}
  async function ready(session,statement) {
    const result=await session.run(statement,{deadlineMs:660000,allowFailure:false});
    assert.equal(result.status,0,result.stderr);assert.equal(result.signal,null);assert.equal(result.ready,true);return result;
  }
  try {
    // Separate rollback setup preflights prove all FK, json[] and trigger typing.
    for(const setup of [{table:'earlier-owner',statement:plan.ordinaryWriter},...plan.writers]) {
      const result=fixture.sql('begin;'+setup.statement+"select 'native_writer_setup_ok';rollback;",true);
      assert.equal(result.status,0,setup.table+': actual setup must succeed, not hide behind an earlier lock');
      assert.equal(result.signal,null);assert.equal(result.stdout.trim().split('\n').at(-1),'native_writer_setup_ok');restored({});
    }
    const earlier=await opened('earlier-owner');await ready(earlier,"begin;set local statement_timeout='600s';"+plan.ordinaryWriter);
    const earlierBarrier=observeNativeHeldSession({fixture,session:earlier,required:[['item','RowExclusiveLock']]});
    const contender=await opened('release-behind-writer');assert.notEqual(contender.pid,earlier.pid);
    const blockedRelease=await contender.run('begin;'+timeouts+batch.sql+'\nrollback;',{deadlineMs:660000,allowFailure:true});
    assertNativeLockTimeout(blockedRelease,phase+' release behind ordinary writer');
    await close(contender);await close(earlier);restored({});
    evidence.cases.push({name:'earlier-ordinary-writer-ordering',actual_two_session_pids:[earlier.pid,contender.pid],holder:earlierBarrier,sqlstate:'55P03',complete_rollback:true,all_sequences_preserved:true});

    const held=await opened('held-positive-release'),started=performance.now();
    await ready(held,"begin;set local lock_timeout='5s';set local statement_timeout='600s';"+batch.sql);
    const readyAt=performance.now();
    const barrier=observeNativeHeldSession({fixture,session:held,required:[...countedTables.map(table=>[table,'ShareRowExclusiveLock']),['content_source','ShareLock'],['content_update','ShareLock']]});
    for(const writer of plan.writers) {
      const client=await opened('blocked-'+writer.table);assert.notEqual(client.pid,held.pid);
      const result=await client.run('begin;'+timeouts+writer.statement+'rollback;',{deadlineMs:45000,allowFailure:true});
      assertNativeLockTimeout(result,phase+' blocked '+writer.table);await close(client);
      observeNativeHeldSession({fixture,session:held,required:[['item','ShareRowExclusiveLock']]});
      evidence.cases.push({name:'held-positive-release-blocks-'+writer.table,actual_two_session_pids:[held.pid,client.pid],actual_writer:writer.identity,setup_sha256:sha(writer.statement),setup_actual_schema_proved:true,basis:writer.basis,sqlstate:'55P03'});
    }
    const heldMs=performance.now()-readyAt;await close(held);
    evidence.sequence_consumption=restored(expectedCalls);
    evidence.lock_benchmark={parse_and_positive_execution_until_ready_ms:readyAt-started,lock_hold_until_rollback_requested_ms:heldMs,migration_bytes:Buffer.byteLength(batch.sql),offline_fixture_only:true};
    evidence.holder=barrier;assert.equal(evidence.cases.length,6);
    assert.equal(fixture.query(`select (${inputs.helper.state});`),'t');
    assert.deepEqual(fixture.queryJson('select row_to_json(s) from '+inputs.helper.signature+' s;'),status,'Fresh helper sees the restored original phase');
    evidence.full_tuples_saved_auth_queue_schema_roles_restored=true;evidence.all_other_sequences_unchanged=true;evidence.passed=true;
    return evidence;
  } finally {
    const errors=[];
    for(const session of sessions)try {await session.close({rollback:true});}catch(error){errors.push(error.message);}
    assert.deepEqual(errors,[],'Only these actual sessions must close/rollback; the fixture owns container cleanup');
  }
}
