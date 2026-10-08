import assert from 'node:assert/strict';
import test from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureNativeInputManifest } from './treasure-vault-native-input-manifest.mjs';
import { proveWholeHelperTokenBoundary, runAlternateAllocations } from './treasure-vault-native-allocations.mjs';
import { assertNativeLockTimeout, observeNativeHeldSession, runNativeWriterOrdering } from './treasure-vault-native-writers.mjs';

/** Pure unit controls only. Synthetic transport values are not PostgreSQL evidence. */
test('whole helper token normalization never changes prefix targets or another kind',()=>{
  assert.deepEqual(proveWholeHelperTokenBoundary(),{passed:true,kind:'pure-string-boundary-only',physical_native_prefix_allocation_claimed:false});
});

test('the validator accepts only the exact intended native lock-timeout shape',()=>{
  const result={status:3,signal:null,ready:false,stdout:'',stderr:'ERROR:  55P03: canceling statement due to lock timeout'};
  assertNativeLockTimeout(result,'unit shape');
  for(const mutant of [
    {...result,status:0},{...result,status:1},{...result,status:2},{...result,signal:'SIGKILL'},{...result,ready:true},
    {...result,error:Object.assign(new Error('write EPIPE'),{code:'EPIPE'})},
    {...result,stderr:'ERROR: P0001: guard rejection'},
    {...result,stderr:result.stderr+'\nserver closed the connection unexpectedly'},
    {...result,stderr:result.stderr+'\nEPIPE'},
  ])assert.throws(()=>assertNativeLockTimeout(mutant,'unit mutation'),{name:'AssertionError'});
});

test('observed readiness requires the actual intended PID, transaction and granted relation lock',()=>{
  const positive={activity:{pid:43210,state:'idle in transaction',xact_start:'2026-10-03T00:00:00Z'},locks:[{schema:'public',table:'item',mode:'ShareRowExclusiveLock',granted:true}]};
  const required=[['item','ShareRowExclusiveLock']];let owned=0,queries=0;
  const fixture={assertOwned(){owned++;},queryJson(sql){queries++;assert.match(sql,/pg_catalog\.pg_stat_activity/);assert.match(sql,/pg_catalog\.pg_locks/);return structuredClone(positive);}};
  const result=observeNativeHeldSession({fixture,session:{pid:43210},required});
  assert.equal(owned,1);assert.equal(queries,1);assert.equal(result.pid,43210);
  for(const mutate of [
    row=>row.activity.pid=43211,row=>row.activity.state='active',row=>row.activity.xact_start=null,
    row=>row.locks[0].granted=false,row=>row.locks[0].mode='AccessShareLock',row=>row.locks[0].schema='other',row=>row.locks=[],
  ]){
    const row=structuredClone(positive);mutate(row);
    assert.throws(()=>observeNativeHeldSession({fixture:{assertOwned(){},queryJson(){return row;}},session:{pid:43210},required}),{name:'AssertionError'});
  }
});

test('no synchronous or absent session callback can certify two-session ordering',async()=>{
  let touched=false;
  await assert.rejects(runNativeWriterOrdering({inputs:{input_provenance:{mode:'checked-in-default'}},fixture:{assertOwned(){touched=true;}},phase:'before100',userId:'unused',receipt:{}}),/actual asynchronous owned-session transport/);
  assert.equal(touched,false,'Missing concurrency implementation fails before any connection use');
});

test('alternate allocation rejects a missing authentic fixture or incomplete chronology before SQL',async()=>{
  let touched=false;
  const fixture={snapshot(){touched=true;throw new Error('must not reach SQL');}};
  await assert.rejects(runAlternateAllocations({inputs:{},fixture,primaryChronology:[],receipt:{}}),/second authentic fixture driver/);
  await assert.rejects(runAlternateAllocations({inputs:{},fixture,withAlternateFixture(){},primaryChronology:[],receipt:{}}),/primary complete chronology/);
  assert.equal(touched,false);
});

test('alternate allocation accepts the actual complete captured chronology before touching SQL',async()=>{
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const captured=await captureNativeInputManifest({root});
  const primaryChronology=captured.manifest.chronology;
  assert.equal(primaryChronology.length,110);
  const boundary=new Error('validated chronology reached the first snapshot');
  let snapshots=0;
  const fixture={snapshot(){snapshots++;throw boundary;}};
  await assert.rejects(runAlternateAllocations({inputs:{},fixture,withAlternateFixture(){assert.fail('No alternate SQL in this contract');},primaryChronology,receipt:{}}),error=>error===boundary);
  assert.equal(snapshots,1,'The actual current manifest passes the production validation path');
  for(const rows of [
    primaryChronology.slice(0,-1),
    [...primaryChronology,primaryChronology.at(-1)],
    [...primaryChronology.slice(0,-1),primaryChronology.at(-2)],
    primaryChronology.map((row,index)=>index===primaryChronology.length-1?{...row,path:'20261008170000_unreviewed_successor.sql'}:row),
    [...primaryChronology].reverse(),
    primaryChronology.map((row,index)=>index===0?{...row,path:'invalid.sql'}:row),
    primaryChronology.map((row,index)=>index===0?{...row,sha256:'invalid'}:row),
  ]){
    await assert.rejects(runAlternateAllocations({inputs:{},fixture,withAlternateFixture(){assert.fail('Malformed chronology cannot create an alternate fixture');},primaryChronology:rows,receipt:{}}),{name:'AssertionError'});
    assert.equal(snapshots,1,'Malformed chronology rejects before the first SQL snapshot');
  }
});
