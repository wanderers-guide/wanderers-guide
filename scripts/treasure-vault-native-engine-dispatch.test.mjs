import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createNativeEngineSqlDispatch} from './treasure-vault-native-engine-dispatch.mjs';
import {createNativeFileSqlTransport,GROUPED_NATIVE_FILE_SCRIPT} from './treasure-vault-native-file-transport.mjs';
import {nativeDatabaseResourceLimits} from './treasure-vault-native-resources.mjs';

const id='a'.repeat(64),digest=b=>createHash('sha256').update(b).digest('hex');
/** Transport effects only; no SQL parsing, Docker lifecycle or native result is emulated. */
function model({raw=0,poison=false,drift=false}={}) {
  const events=[],resources={fresh_verified_inspections:0};let current=null,attempted=false,cleanup=false,remote=null,reads=0;
  const engine={
    inspect(){events.push('engine-inspect');if(poison)throw new Error('poisoned worker');reads++;return {owned_identity_verified:true,container_id:drift&&reads===5?'b'.repeat(64):id,resource_limits_freshly_verified:true,resources:nativeDatabaseResourceLimits()};},
    exec(args){events.push(['engine-exec',...args]);if(poison)throw new Error('poisoned worker');
      if(args[0]==='mktemp')return {status:0,signal:null,error:null,stdout:'/tmp/wg-tv-native-sql-Ab1234\n',stderr:''};
      assert.deepEqual(args.slice(0,4),['/bin/sh','-c',GROUPED_NATIVE_FILE_SCRIPT,'wg-tv-native-file']);
      assert.equal(args[6],'/tmp/wg-tv-native-sql-Ab1234/statement.sql');assert.equal(args[7],digest(remote));assert.ok(['postgres','supabase_admin'].includes(args[8]));
      return {status:raw,signal:null,error:null,stdout:raw===0?'actual-output\n':'',stderr:raw===3?'ERROR: P0001: model expected rejection\n':''};},
    archive(payload){events.push('engine-archive');remote=readFileSync(payload.sourcePath);assert.equal(payload.expectedSha256,digest(remote));assert.equal(payload.expectedSize,remote.length);return {archive_uploaded:true,remote_sha256_verified:false};},
  };
  const dispatch=createNativeEngineSqlDispatch({getEngine:()=>current,engineEnableAttempted:()=>attempted,cliCleanup:()=>cleanup,databaseId:()=>id,resources,
    cliInspect:()=>{events.push('cli-inspect');return id;},cliDocker:(...args)=>{events.push(['cli-command',...args]);return {status:0,signal:null,error:null,stdout:'cli\n',stderr:''};}});
  return {dispatch,events,resources,enable(){attempted=true;current=engine;},failConstructor(){attempted=true;},cleanup(){cleanup=true;},get bytes(){return remote;}};
}

test('dispatch retains actual exact-file helper cadence, unchanged Unicode bytes and both permitted roles',()=>{
  for(const login of ['postgres','supabase_admin'])for(const raw of [0,3]) {
    const m=model({raw});m.enable();const records=[];
    const sql=createNativeFileSqlTransport({getOwnedDatabaseId:m.dispatch.inspect,docker:m.dispatch.command,cleanupTransport:fn=>fn(),redact:String,record:r=>records.push(r)});
    const statement="select 'Ω雪 noLF'";const result=sql(statement,true,login);
    assert.equal(result.status,raw);assert.equal(result.error,null);assert.equal(result.signal,null);assert.equal(m.bytes.toString(),statement);
    assert.equal(m.resources.fresh_verified_inspections,5);assert.equal(m.events.filter(x=>x==='engine-inspect').length,5);
    assert.equal(m.events.some(x=>x==='cli-inspect'||Array.isArray(x)&&x[0]==='cli-command'),false);
    assert.equal(records[0].passed,true);assert.equal(records[0].post_group_ownership_verified,true);assert.equal(records[0].temporary_files_cleaned,true);
  }
});

test('constructor failure and poisoned or changed workers cannot fall back or qualify SQL',()=>{
  const failed=model();failed.failConstructor();assert.throws(failed.dispatch.inspect,/No SQL fallback/);assert.throws(()=>failed.dispatch.command(['exec',id,'anything'],undefined,true),/No SQL fallback/);assert.deepEqual(failed.events,[]);
  const poisoned=model({poison:true});poisoned.enable();assert.throws(poisoned.dispatch.inspect,/poisoned/);assert.throws(()=>poisoned.dispatch.command(['exec',id,'anything'],undefined,true),/poisoned/);assert.equal(poisoned.events.some(x=>x==='cli-inspect'),false);
  for(const raw of [0,3]) {
    const m=model({raw,drift:true});m.enable();const records=[];
    const sql=createNativeFileSqlTransport({getOwnedDatabaseId:m.dispatch.inspect,docker:m.dispatch.command,cleanupTransport:fn=>fn(),redact:String,record:r=>records.push(r)});
    assert.throws(()=>sql('select 1;',true));assert.equal(records[0].passed,false);assert.equal(records[0].post_group_ownership_verified,false);
    assert.equal(m.events.filter(x=>Array.isArray(x)&&x[0]==='engine-exec').length,2,'No replay after completed group');
  }
});

test('explicit original CLI cleanup remains usable after constructor failure or worker poisoning',()=>{
  for(const state of ['bootstrap','constructor-failed','poisoned']) {
    const m=model({poison:true});if(state==='constructor-failed')m.failConstructor();if(state==='poisoned')m.enable();
    m.cleanup();assert.equal(m.dispatch.inspect(),id);assert.equal(m.dispatch.command(['exec',id,'owned-cleanup-query'],undefined,true).stdout,'cli\n');
    assert.deepEqual(m.events,['cli-inspect',['cli-command',['exec',id,'owned-cleanup-query'],undefined,true]]);
  }
});
