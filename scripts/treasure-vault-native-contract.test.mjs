import assert from 'node:assert/strict';
import test from 'node:test';
import {EventEmitter} from 'node:events';
import {setImmediate} from 'node:timers/promises';
import {createHash} from 'node:crypto';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as loader from './treasure-vault-native-inputs.mjs';
import * as nativeStop from './treasure-vault-native-stop.mjs';
import {captureNativeInputManifest} from './treasure-vault-native-input-manifest.mjs';
import {buildTerminalHelperMetadataControls} from './treasure-vault-native-metadata.mjs';
import {main as nativeMain,executeNativeBase} from './treasure-vault-native-safety.mjs';
import {nativeDiagnostic,createNativeReceiptLogger} from './treasure-vault-native-diagnostics.mjs';
import {createAuthenticAlternateFixtureDriver} from './treasure-vault-native-alternate-fixture.mjs';
import {nativeDatabaseResourceLimits} from './treasure-vault-native-fixture.mjs';
import './treasure-vault-native-fixture-contract.test.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

/** In-memory mutants originate only from actual checked-in inputs, never candidates or old receipts. */
function buildCheckedInLoaderMutants(files,baseline) {
  const approved=loader.APPROVED_SHARED_CHECK;
  for(const field of ['body_sha256','proof_sha256','manifest_sha256'])assert.match(approved[field],/^[a-f0-9]{64}$/);
  assert.equal(baseline.helper.bodySha256,approved.body_sha256);
  assert.equal(baseline.helper.proofSha256,approved.proof_sha256);
  assert.equal(sha(JSON.stringify(baseline.embeddedProof.historical_files)),approved.manifest_sha256);
  assert.equal(baseline.actualWrapperMetadata.length,39);
  assert.equal(baseline.contract.expected_entries.length,2349);assert.equal(baseline.contract.expected_templates.length,11);
  const path=(directory,filename)=>resolve(root,'supabase',directory,filename);
  const helperPath=path('migrations',loader.TERMINAL_HELPER.migration),helperRelease=path('release',loader.TERMINAL_HELPER.release);
  const completionPath=path('migrations',baseline.completion.path),completionRelease=path('release',baseline.completion.release);
  const displayPath=path('migrations',baseline.display.path),displayRelease=path('release',baseline.display.release);
  const registryPath=path('release','requirements.json');
  const checks=['actual-checked-in-default-layout'],cases=[];
  function rejected(name,mutate) { cases.push({name,mutate});checks.push(name); }
  function replace(map,target,before,after) {
    const current=map.get(target);assert.equal(typeof current,'string');assert.ok(current.includes(before),'Exact mutation anchor '+target);
    map.set(target,current.replace(before,after));
  }
  for(const target of [helperPath,helperRelease,completionPath,completionRelease,displayPath,displayRelease])rejected('mandatory-file:'+target,map=>map.delete(target));
  for(const [filename,fields]of [[loader.TERMINAL_HELPER.migration,['check','order','function_signature']],[baseline.completion.path,['check','order']],[baseline.display.path,['check','order']]])for(const field of fields) {
    rejected('registry:'+filename+':'+field,map=>{
      const registry=JSON.parse(map.get(registryPath));
      registry[filename][field]=field==='order'?'after-functions':field==='check'?'unreviewed.sql':'public.unreviewed()';map.set(registryPath,JSON.stringify(registry));
    });
  }
  for(const [name,before,after]of [['security-definer','language sql stable security invoker','language sql stable security definer'],['search-path',"set search_path = ''","set search_path = 'public'"],['privilege','from public,anon,authenticated','from anon,authenticated'],['owner','owner to postgres','owner to service_role']])rejected('installer:'+name,map=>replace(map,helperPath,before,after));
  for(const wrapper of [...baseline.actualWrapperMetadata,baseline.completionWrapper]) {
    rejected('original-migration:'+wrapper.path,map=>replace(map,path('migrations',wrapper.path),'$historical_original_dual$','$historical_original_dual$\n-- unreviewed original alteration\n'));
    rejected('caller-lock:'+wrapper.path,map=>replace(map,path('migrations',wrapper.path),'lock table public.content_update in share mode;','null;'));
  }
  rejected('original100-query',map=>replace(map,completionRelease,'original_checks as(\n','original_checks as(\n-- unreviewed predicate alteration\n'));
  rejected('original101-body',map=>map.set(displayPath,map.get(displayPath)+'\n-- unreviewed direct SQL\n'));
  const war=baseline.actualWrapperMetadata.find(row=>row.releaseScope.mode==='check-id');assert.ok(war);
  rejected('all34-war-results-remain-outside-tv-bypass',map=>replace(map,path('release',war.release),"original_checks.id='treasure-vault-dragonprism-links' and ",''));
  rejected('full100-owner-domain-cannot-be-skipped',map=>{
    const delimiter='$completion100$',parts=map.get(completionPath).split(delimiter);assert.equal(parts.length,3);
    const spec=JSON.parse(parts[1]);spec.patches.pop();map.set(completionPath,[parts[0],JSON.stringify(spec),parts[2]].join(delimiter));
  });
  /** Updating every distributed fingerprint must not permit a semantic guard edit. */
  function selfConsistent(name,mutateBody) {
    rejected(name,map=>{
      const before=baseline.helper.body,after=mutateBody(before);assert.notEqual(after,before);replace(map,helperPath,before,after);
      for(const [target,value]of map)if(target.endsWith('.sql'))map.set(target,value.replaceAll(baseline.helper.bodySha256,sha(after)));
    });
  }
  selfConsistent('self-consistent-always-true-complete-guard',body=>{
    const marker='global_terminal_guard as(select coalesce(';assert.ok(body.includes(marker));return body.replace(marker,marker+'true or ');
  });
  selfConsistent('self-consistent-lost-row-preservation',body=>{
    const marker="pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((a.row)::text,'UTF8')),'hex')=a.expected->>'sha256_100'";
    assert.ok(body.includes(marker));return body.replace(marker,'true');
  });
  selfConsistent('self-consistent-count-only-catalog-substitute',body=>{
    const marker='global_terminal_guard as(select coalesce(',start=body.indexOf(marker)+marker.length;
    const end=body.indexOf("\n  and (select jsonb_build_object('item'",start);assert.ok(start>=marker.length&&end>start);
    return body.slice(0,start)+'(select count(*) from public.item where content_source_id=16)=1123'+body.slice(end);
  });
  assert.equal(files.get(helperPath),baseline.helper.sql,'Mutants never change the actual baseline');
  assert.equal(checks.length,105);assert.equal(new Set(checks).size,105);
  return {baseline,checks,cases};
}

/** Each input identity has its own deadline; no mutation reuses an accepted loader result. */
test('strict checked-in Treasure Vault loader identities',async(t)=>{
  let captured,baseline,files;
  const read=map=>async path=>{if(!map.has(path))throw Object.assign(new Error('Missing checked-in input '+path),{code:'ENOENT'});return map.get(path);};
  const load=map=>loader.loadTreasureVaultDefaultNativeInputs({root,readText:read(map)});
  await t.test('actual-checked-in-default-layout',{timeout:60000},async()=>{
    captured=await captureNativeInputManifest({root});
    assert.equal(captured.migrations.length,108);
    baseline=await loader.loadTreasureVaultDefaultNativeInputs({root,readText:captured.readCurrentText});
    assert.equal(baseline.input_provenance.mode,'checked-in-default');
    assert.deepEqual(baseline.input_provenance.external_private_input_files,[]);
    await baseline.verifyHistoricalFiles(baseline.contract.historical_files);
  const metadataPlan=buildTerminalHelperMetadataControls(baseline);
  assert.equal(metadataPlan.controls.length,113);
  assert.equal(new Set(metadataPlan.controls.map(control=>control.name)).size,113);
  assert.deepEqual(metadataPlan.controls.filter(control=>control.executionLogin==='supabase_admin').map(control=>control.name),['execute-supabase_read_only_user','reject-leakproof-metadata']);
  assert.deepEqual(metadataPlan.native_expected.direct_execute_roles,['postgres','service_role','supabase_read_only_user']);
  const verifier=metadataPlan.controls.find(control=>control.name==='execute-supabase_read_only_user');
  assert.equal(verifier.kind,'privilege');assert.equal(verifier.executionLogin,'supabase_admin');assert.equal(verifier.executionRole,'supabase_read_only_user');
  assert.ok(verifier.sql.startsWith('begin read only;'));
  assert.ok(verifier.sql.includes("current_user<>'supabase_read_only_user' or session_user<>'supabase_admin'"));
  assert.ok(verifier.sql.includes("current_setting('transaction_read_only')<>'on'"));
  assert.ok(verifier.sql.includes("pg_catalog.pg_has_role(current_user,'postgres','MEMBER')"));
  assert.ok(verifier.sql.includes("pg_catalog.pg_has_role(current_user,'service_role','MEMBER')"));
  for(const name of ['verifier-grant-option','verifier-execute-revoked'])assert.ok(metadataPlan.controls.some(control=>control.name==='reject-'+name+'-metadata'&&control.expected===false));
  const leakproof=metadataPlan.controls.find(control=>control.name==='reject-leakproof-metadata');
  assert.equal(leakproof.executionRole,'postgres');assert.equal(leakproof.kind,'release');assert.equal(leakproof.expected,false);
  const alter=`alter function ${baseline.helper.signature} leakproof;`,reset='set local role postgres;';
  const fingerprint=baseline.helper.state.replace('p.proleakproof is false','p.proleakproof is true');
  const alterAt=leakproof.sql.indexOf(alter),resetAt=leakproof.sql.indexOf(reset),fingerprintAt=leakproof.sql.indexOf(fingerprint),releaseAt=leakproof.sql.indexOf(baseline.helper.releaseSql);
  assert.ok(alterAt>=0&&resetAt>alterAt&&fingerprintAt>resetAt&&releaseAt>fingerprintAt,'Setup is admin-only, the complete leakproof-only fingerprint and exact release run after resetting the ordinary role');
  assert.ok(leakproof.sql.includes("current_user<>'supabase_admin' or session_user<>'supabase_admin'"));
  assert.ok(leakproof.sql.includes("current_user<>'postgres' or session_user<>'supabase_admin'"));
  assert.equal(leakproof.sql.split(baseline.helper.releaseSql).length,2);
  for(const role of ['anon','authenticated']){
    const deny=metadataPlan.controls.find(control=>control.name==='deny-'+role);
    assert.equal(deny.expectedSetupMarker,'native-metadata-execution-role:'+role);
    const switchAt=deny.sql.indexOf('set local role '+role+';'),markerAt=deny.sql.indexOf("select '"+deny.expectedSetupMarker+"' where current_user='"+role+"'"),callAt=deny.sql.indexOf('select * from '+baseline.helper.signature+';');
    assert.ok(switchAt>=0&&markerAt>switchAt&&callAt>markerAt,'Successful role-switch witness precedes the target EXECUTE rejection');
  }


    files=new Map(captured.manifest.entries.map(row=>[resolve(root,row.path),captured.readRelative(row.path)]));
  });
  const result=buildCheckedInLoaderMutants(files,baseline);
  for(const {name,mutate}of result.cases)await t.test(name,{timeout:60000},async()=>{
    const mutant=new Map(files);mutate(mutant);
    await assert.rejects(()=>load(mutant),undefined,name);
  });
  assert.equal(result.checks.length,105);assert.equal(result.cases.length,104);
  assert.equal(files.get(resolve(root,'supabase','migrations',loader.TERMINAL_HELPER.migration)),baseline.helper.sql);
  await captured.verify();
});

/** Final cooperative-stop receipts use the real controller without native services. */
function setupNativeStop(receipt={passed:true,full_native_execution_complete:true}) {
  const signals=new EventEmitter();
  const stop=nativeStop.createNativeStopController({receipt,signals});
  return {receipt,signals,stop};
}

function requireNativeStopFinalizer() {
  assert.equal(typeof nativeStop.finalizeNativeStopReceipt,'function','The actual stop module owns the final observed-stop veto');
  return nativeStop.finalizeNativeStopReceipt;
}

test('native finalization: no observed stop preserves the receipt and returns no exit override',async()=>{
  const model=setupNativeStop({passed:true,full_native_execution_complete:true,failure:{message:'unchanged'},stages:[{passed:true}]});
  const before=structuredClone(model.receipt);
  try {
    assert.equal(await requireNativeStopFinalizer()({receipt:model.receipt,stop:model.stop}),null);
    assert.deepEqual(model.receipt,before);
  } finally {model.stop.close();}
});

for(const [signal,exitCode] of [['SIGINT',130],['SIGTERM',143]]) {
  test('native finalization: '+signal+' after native completion vetoes pass and the completion flag with its actual signal exit',async()=>{
    const model=setupNativeStop();
    try {
      model.signals.emit(signal);
      const requested=model.stop.requested;
      assert.equal(await requireNativeStopFinalizer()({receipt:model.receipt,stop:model.stop}),exitCode);
      assert.equal(model.receipt.passed,false);
      assert.equal(model.receipt.full_native_execution_complete,false);
      assert.equal(model.receipt.failure,model.receipt.late_stop);
      assert.deepEqual(model.receipt.late_stop,{
        phase:'final receipt serialization',name:'Error',code:'ERR_NATIVE_STOP',signal,
        exit_code:exitCode,requested_at:requested.requested_at,
        message:'Native verification stopped at final receipt serialization after '+signal,
      });
      assert.equal(model.receipt.stop_requested,requested);
    } finally {model.stop.close();}
  });
}

test('native finalization: late stops during input verification, mandatory cleanup or log flush are not success',async()=>{
  for(const stopAt of ['final-input-verification','mandatory-cleanup','log-flush']) {
    const model=setupNativeStop(),completed=[];
    try {
      for(const phase of ['final-input-verification','mandatory-cleanup','log-flush']) {
        await setImmediate();
        if(phase===stopAt)model.signals.emit('SIGTERM');
        completed.push(phase);
      }
      assert.deepEqual(completed,['final-input-verification','mandatory-cleanup','log-flush']);
      assert.equal(await requireNativeStopFinalizer()({receipt:model.receipt,stop:model.stop}),143);
      assert.equal(model.receipt.passed,false);
    } finally {model.stop.close();}
  }
});

test('native finalization: the existing cooperative checkpoint observes a queued signal before serialization',async()=>{
  const model=setupNativeStop();
  try {
    const queued=setImmediate().then(()=>model.signals.emit('SIGINT'));
    assert.equal(await requireNativeStopFinalizer()({receipt:model.receipt,stop:model.stop}),130);
    await queued;
    assert.equal(model.receipt.passed,false);
  } finally {model.stop.close();}
});

test('native finalization: a late stop preserves the originating failure, cleanup failure, log failure and family evidence',async()=>{
  const originating={phase:'native-check',message:'original rejected SQL'};
  const cleanup={message:'original cleanup error'},log={message:'original log error'},proofs=[{name:'actual family',fresh_native_evidence_verified:true}];
  const model=setupNativeStop({passed:false,full_native_execution_complete:true,failure:originating,cleanup_failure:cleanup,log_failure:log,execution_family_proofs:proofs});
  try {
    model.signals.emit('SIGTERM');
    assert.equal(await requireNativeStopFinalizer()({receipt:model.receipt,stop:model.stop}),143);
    assert.equal(model.receipt.failure,originating);
    assert.equal(model.receipt.cleanup_failure,cleanup);
    assert.equal(model.receipt.log_failure,log);
    assert.equal(model.receipt.execution_family_proofs,proofs);
    assert.equal(model.receipt.full_native_execution_complete,false);
  } finally {model.stop.close();}
});

test('native finalization: the original first-signal policy and listener disposal remain exact',async()=>{
  const model=setupNativeStop();
  try {
    model.signals.emit('SIGINT');const first=model.stop.requested;
    model.signals.emit('SIGTERM');
    assert.equal(model.stop.requested,first);
    assert.equal(await requireNativeStopFinalizer()({receipt:model.receipt,stop:model.stop}),130);
  } finally {model.stop.close();}
  assert.equal(model.signals.listenerCount('SIGINT'),0);
  assert.equal(model.signals.listenerCount('SIGTERM'),0);
});

test('native finalization: an unrelated checkpoint failure is propagated without a fake stop receipt or exit',async()=>{
  const model=setupNativeStop(),before=structuredClone(model.receipt),failure=new TypeError('checkpoint transport failure');
  try {
    const actualStop={...model.stop,checkpoint:async()=>{throw failure;}};
    await assert.rejects(requireNativeStopFinalizer()({receipt:model.receipt,stop:actualStop}),error=>error===failure);
    assert.deepEqual(model.receipt,before);
  } finally {model.stop.close();}
});

/** The actual default caller reads checked-in inputs; only external writes and randomness are replaced. */
function memoryNativeReceipt(t,{logWrite=async()=>{}}={}) {
  const outputs=new Map(),opened=[];
  t.mock.method(fs,'mkdir',async path=>assert.equal(path,root+'/.agents/legacy'));
  t.mock.method(fs,'open',async(path,flags,mode)=>{
    assert.equal(flags,'wx');assert.equal(mode,0o600);opened.push(path);
    return {write:async(buffer,offset=0,length=buffer.length)=>{const bytes=buffer.subarray(offset,offset+length);outputs.set(path,(outputs.get(path)??'')+bytes.toString('utf8'));await logWrite(bytes);return {bytesWritten:bytes.length};},writeFile:async text=>outputs.set(path,text),close:async()=>{}};
  });
  syncBuiltinESMExports();
  return {outputs,opened};
}

test('native diagnostic receipts: actual outer fallback omits arbitrary exception text and preserves its failure exit',async(t)=>{
  const secret='fake-outer-diagnostic-credential',error=Object.assign(new Error('message '+secret),{
    name:'name '+secret,code:'ENOSPC',path:'/path/'+secret,syscall:'syscall '+secret,cause:{secret},argv:[secret],exitCode:143,
  });
  const memory=memoryNativeReceipt(t),previousExit=process.exitCode;
  t.mock.method(crypto,'randomBytes',()=>{throw error;});syncBuiltinESMExports();
  try {
    const receipt=await nativeMain();
    assert.deepEqual(receipt.failure,{name:'Error',message:'Native verification failed before safe fixture diagnostics were available',code:'ENOSPC'});
    assert.equal(receipt.passed,false);assert.equal(process.exitCode,143);
    assert.equal(memory.opened.length,2);assert.equal(memory.outputs.size,1);
    const text=memory.outputs.get(memory.opened[0]);assert.equal(text.includes(secret),false);
    assert.deepEqual(JSON.parse(text),receipt);
    assert.equal(error.name,'name '+secret);assert.equal(error.message,'message '+secret);
  } finally {process.exitCode=previousExit;t.mock.restoreAll();syncBuiltinESMExports();}
});

test('native diagnostic receipts: actual log writer failure is safe and leaves the originating redacted failure intact',async(t)=>{
  const secret='fake-log-writer-credential',error=Object.assign(new Error('message '+secret),{
    name:'name '+secret,code:'EIO',path:'/path/'+secret,cause:{secret},argv:[secret],
  });
  const memory=memoryNativeReceipt(t,{logWrite:async()=>{throw error;}}),previousExit=process.exitCode,commands=[];
  const password='0a'.repeat(24);
  t.mock.method(crypto,'randomBytes',size=>Buffer.alloc(size,size===24?0x0a:0x0b));
  t.mock.method(childProcess,'spawnSync',(binary,args)=>{
    assert.equal(binary,'docker');commands.push(args);
    if(commands.length===1){assert.deepEqual(args,['context','show']);return {status:1,signal:null,error:null,stdout:'',stderr:'owned start '+password};}
    assert.ok(args[0]==='ps'||args[0]==='volume','Only failed-startup cleanup censuses, never a real container action');
    return {status:0,signal:null,error:null,stdout:'',stderr:''};
  });
  syncBuiltinESMExports();
  try {
    const receipt=await nativeMain();
    assert.deepEqual(receipt.log_failure,{name:'Error',message:'Native diagnostic log could not be written',code:'EIO'});
    assert.equal(receipt.failure.phase,'fixture-bootstrap');assert.equal(receipt.failure.name,'AssertionError');
    assert.ok(receipt.failure.message.includes('[owned-fixture-secret]'));
    assert.equal(receipt.passed,false);assert.equal(process.exitCode,1);assert.equal(receipt.cleaned_only_owned_containers_and_volumes,true);
    assert.equal(commands.length,3);assert.equal(memory.opened.length,2);
    for(const text of memory.outputs.values()){assert.equal(text.includes(secret),false);assert.equal(text.includes(password),false);}
    assert.deepEqual(JSON.parse(memory.outputs.get(memory.opened[0])),receipt);
    assert.equal(error.name,'name '+secret);assert.equal(error.message,'message '+secret);
  } finally {process.exitCode=previousExit;t.mock.restoreAll();syncBuiltinESMExports();}
});

test('native diagnostic receipts: actual inner failure redacts name and message without replacing its control exception',async(t)=>{
  const secret='0c'.repeat(24),error=Object.assign(new Error('detail '+secret),{name:'name '+secret,code:'ERR_NATIVE_STOP',exitCode:143,signal:'SIGTERM'});
  const receipt={stages:[]},commands=[];
  t.mock.method(crypto,'randomBytes',size=>Buffer.alloc(size,size===24?0x0c:0x0d));
  t.mock.method(childProcess,'spawnSync',(binary,args)=>{
    assert.equal(binary,'docker');assert.ok(args[0]==='ps'||args[0]==='volume');commands.push(args);
    return {status:0,signal:null,error:null,stdout:'',stderr:''};
  });
  syncBuiltinESMExports();
  try {
    await assert.rejects(executeNativeBase({root,inputs:{},migrations:[],output:'/unused-native-model',receipt,log:()=>{},
      inputManifest:{verify:async()=>({}),readRelative:()=>''},stop:{checkpoint:async()=>{},throwIfRequested:()=>{throw error;}}}),actual=>actual===error);
    assert.deepEqual(receipt.failure,{phase:'fixture-bootstrap',name:'Error',message:'detail [owned-fixture-secret]'});
    assert.equal(JSON.stringify(receipt).includes(secret),false);assert.equal(receipt.passed,false);
    assert.equal(receipt.cleaned_only_owned_containers_and_volumes,true);assert.equal(commands.length,2);
    assert.equal(error.code,'ERR_NATIVE_STOP');assert.equal(error.exitCode,143);assert.equal(error.signal,'SIGTERM');
    assert.equal(error.message,'detail '+secret);assert.equal(error.name,'name '+secret);
  } finally {t.mock.restoreAll();syncBuiltinESMExports();}
});

test('native diagnostic receipts: an actual alternate failure stays safe across its primary redactor without changing stop identity',async(t)=>{
  const secret='0e'.repeat(24),primarySecret='primary-fixture-secret';
  const error=Object.assign(new Error('alternate detail '+secret),{name:'name '+secret,code:'ERR_NATIVE_STOP',exitCode:143,signal:'SIGTERM',cause:{secret}});
  const receipt={},commands=[];
  t.mock.method(crypto,'randomBytes',size=>Buffer.alloc(size,size===24?0x0e:0x0f));
  t.mock.method(childProcess,'spawnSync',(binary,args)=>{
    assert.equal(binary,'docker');assert.ok(args[0]==='ps'||args[0]==='volume');commands.push(args);
    return {status:0,signal:null,error:null,stdout:'',stderr:''};
  });
  syncBuiltinESMExports();
  try {
    const run=createAuthenticAlternateFixtureDriver({root,inputs:{},migrations:[],receipt,log:()=>{},
      inputManifest:{verify:async()=>{throw error;},readRelative:()=>''},stop:{checkpoint:async()=>{},throwIfRequested:()=>{}}});
    await assert.rejects(run({beforeStage:()=>{},afterPhase:()=>{}}),actual=>{
      assert.equal(actual,error);
      const primary=nativeDiagnostic(actual,{redact:text=>String(text).replaceAll(primarySecret,'[owned-fixture-secret]')});
      assert.equal(JSON.stringify(primary).includes(secret),false,'A primary redactor cannot independently redact an alternate credential');
      assert.deepEqual(primary,{name:'Error',message:'alternate detail [owned-fixture-secret]'});
      return true;
    });
    assert.deepEqual(receipt.alternate_fixture.failure,{name:'Error',message:'alternate detail [owned-fixture-secret]'});
    assert.equal(JSON.stringify(receipt).includes(secret),false);assert.equal(receipt.alternate_fixture.passed,false);
    assert.equal(receipt.alternate_fixture.cleaned_only_owned_containers_and_volumes,true);assert.equal(commands.length,2);
    assert.equal(error.code,'ERR_NATIVE_STOP');assert.equal(error.exitCode,143);assert.equal(error.signal,'SIGTERM');
    assert.equal(error.message,'alternate detail '+secret);assert.equal(error.name,'name '+secret);assert.deepEqual(error.cause,{secret});
  } finally {t.mock.restoreAll();syncBuiltinESMExports();}
});

test('native diagnostic receipts: alternate construction failures use a safe fallback before owning a secret redactor',async(t)=>{
  const secret='fake-alternate-construction-credential',error=Object.assign(new Error('detail '+secret),{name:'name '+secret,code:'ERR_NATIVE_STOP',exitCode:130,signal:'SIGINT'});
  const receipt={};t.mock.method(crypto,'randomBytes',()=>{throw error;});
  t.mock.method(childProcess,'spawnSync',()=>assert.fail('Construction cannot start a service or transport'));syncBuiltinESMExports();
  try {
    const run=createAuthenticAlternateFixtureDriver({root,inputs:{},migrations:[],receipt,log:()=>{},
      inputManifest:{verify:async()=>assert.fail('Failed construction cannot verify or initialize'),readRelative:()=>''},stop:{checkpoint:async()=>{},throwIfRequested:()=>{}}});
    await assert.rejects(run({beforeStage:()=>{},afterPhase:()=>{}}),actual=>{
      assert.equal(actual,error);
      assert.deepEqual(nativeDiagnostic(actual,{redact:String}),{name:'Error',message:'Alternate fixture failed before safe diagnostics were available'});
      return true;
    });
    assert.equal(receipt.alternate_fixture.passed,false);assert.equal(JSON.stringify(receipt).includes(secret),false);
    assert.deepEqual(receipt.alternate_fixture.failure,{name:'Error',message:'Alternate fixture failed before safe diagnostics were available'});
    assert.equal(error.code,'ERR_NATIVE_STOP');assert.equal(error.exitCode,130);assert.equal(error.signal,'SIGINT');
    assert.equal(error.name,'name '+secret);assert.equal(error.message,'detail '+secret);
  } finally {t.mock.restoreAll();syncBuiltinESMExports();}
});

test('native diagnostic receipts: remembered summaries also use the next owning redactor without exposing original text',()=>{
  const secondary='fake-secondary-secret',primary='fake-primary-secret';
  const error=Object.assign(new Error(secondary+' '+primary),{name:'name '+secondary,code:'ERR_NATIVE_STOP',exitCode:143,signal:'SIGTERM',cause:{secondary,primary}});
  const owned=nativeDiagnostic(error,{remember:true,redact:text=>text.replaceAll(secondary,'[owned-fixture-secret]')});
  const next=nativeDiagnostic(error,{redact:text=>text.replaceAll(primary,'[owned-fixture-secret]')});
  assert.deepEqual(next,{name:'Error',message:'[owned-fixture-secret] [owned-fixture-secret]'});
  owned.message=secondary;
  assert.deepEqual(nativeDiagnostic(error,{redact:text=>text.replaceAll(primary,'[owned-fixture-secret]')}),next);
  assert.deepEqual(nativeDiagnostic(error,{redact:()=>{throw new Error(primary);}}),{name:'Error',message:'Native diagnostic unavailable'});
  assert.equal(error.code,'ERR_NATIVE_STOP');assert.equal(error.exitCode,143);assert.equal(error.signal,'SIGTERM');
  assert.equal(error.message,secondary+' '+primary);assert.equal(error.name,'name '+secondary);assert.deepEqual(error.cause,{secondary,primary});
});

test('native diagnostic receipts: only known errno values and safe names survive malformed or failing diagnostics',()=>{
  const secret='fake-diagnostic-metadata-credential';
  const error={name:'TypeError',message:'detail '+secret,code:'EIO',path:secret,syscall:secret,stack:secret,cause:{secret},argv:[secret]};
  assert.deepEqual(nativeDiagnostic(error),{name:'TypeError',message:'Native diagnostic unavailable',code:'EIO'});
  assert.deepEqual(nativeDiagnostic(error,{redact:text=>text.replaceAll(secret,'[owned-fixture-secret]')}),{name:'TypeError',message:'detail [owned-fixture-secret]',code:'EIO'});
  assert.deepEqual(nativeDiagnostic(error,{redact:()=>{throw new Error(secret);}}),{name:'TypeError',message:'Native diagnostic unavailable',code:'EIO'});
  for(const code of ['unknown '+secret,' EIO','EIO '+secret,{},Symbol(secret),null]) {
    assert.deepEqual(nativeDiagnostic({...error,name:'name '+secret,code}),{name:'Error',message:'Native diagnostic unavailable'});
  }
  const unreadable={};for(const key of ['name','message','code'])Object.defineProperty(unreadable,key,{get(){throw new Error(secret);}});
  for(const value of [null,undefined,secret,unreadable])assert.deepEqual(nativeDiagnostic(value,{redact:String}),{name:'Error',message:'Native diagnostic unavailable'});
  assert.equal(error.message,'detail '+secret);assert.deepEqual(error.cause,{secret});
});

test('native diagnostic receipts: a rejected log write is handled during a real readiness yield and still fails final flush',async(t)=>{
  const secret='fake-deferred-log-credential',writeError=Object.assign(new Error(secret),{name:'name '+secret,code:'EIO'});
  const originating=Object.assign(new Error('modeled startup failed after its readiness yield'),{exitCode:77});
  const memory=memoryNativeReceipt(t,{logWrite:async()=>{throw writeError;}}),previousExit=process.exitCode,unhandled=[];
  const observed=error=>unhandled.push(error);process.on('unhandledRejection',observed);
  const id='c'.repeat(64),imageId='sha256:'+'a'.repeat(64),endpoint='unix:///native-diagnostic-model.sock';
  let name,owner,inspections=0,removed=false;
  t.mock.method(childProcess,'spawnSync',(binary,raw)=>{
    assert.equal(binary,'docker');const args=raw[0]==='--host'?raw.slice(2):raw;
    const result=stdout=>({status:0,signal:null,error:null,stdout,stderr:''});
    if(args[0]==='context'&&args[1]==='show')return {...result('diagnostic-model\n'),stderr:'owned startup diagnostic'};
    if(args[0]==='context')return result(JSON.stringify([{Name:'diagnostic-model',Endpoints:{docker:{Host:endpoint}}}]));
    if(args[0]==='info')return result(JSON.stringify({ID:'diagnostic-model-engine',OSType:'linux',ServerVersion:'test',Architecture:'amd64'}));
    if(args[0]==='image')return result(JSON.stringify([{Id:args[2].includes('postgres')?imageId:'sha256:'+'b'.repeat(64),RepoTags:[args[2]],RepoDigests:[],Architecture:'amd64'}]));
    if(args[0]==='run'){
      assert.equal(name,undefined,'Only a modeled database startup, never Auth or SQL');name=args[args.indexOf('--name')+1];owner=args[args.indexOf('--label')+1].split('=')[1];
      return result(id+'\n');
    }
    if(args[0]==='inspect'){
      assert.equal(args[1],name);if(++inspections===2)throw originating;
      return result(JSON.stringify([{Id:id,Name:'/'+name,Image:imageId,Config:{Labels:{'wg.native.owner':owner}},
        HostConfig:{...nativeDatabaseResourceLimits(),NetworkMode:'none',PortBindings:{}},Mounts:[],State:{Running:true,OOMKilled:false,ExitCode:0}}]));
    }
    if(args[0]==='logs')return result('');
    if(args[0]==='rm'){assert.deepEqual(args,['rm','-f','-v',name]);removed=true;return result('');}
    if(args[0]==='ps')return result(removed?'':name+'\n');
    if(args[0]==='volume')return result('');
    assert.fail('Unmodeled transport, SQL or service action');
  });
  syncBuiltinESMExports();
  try {
    const receipt=await nativeMain();
    assert.deepEqual(unhandled,[],'A rejected write cannot escape while the actual readiness loop yields');
    assert.deepEqual(receipt.log_failure,{name:'Error',message:'Native diagnostic log could not be written',code:'EIO'});
    assert.equal(receipt.failure.message,originating.message);assert.equal(receipt.passed,false);assert.equal(process.exitCode,77);
    assert.equal(receipt.cleaned_only_owned_containers_and_volumes,true);assert.equal(removed,true);
    assert.equal(receipt.owned_database_resources.final_verified,true);
    assert.equal(JSON.stringify(receipt).includes(secret),false);assert.deepEqual(JSON.parse(memory.outputs.get(memory.opened[0])),receipt);
  } finally {process.removeListener('unhandledRejection',observed);process.exitCode=previousExit;t.mock.restoreAll();syncBuiltinESMExports();}
});
/** Real log ordering/writing boundary; no database or native SQL success is modeled. */
test('native logs: a checkpoint persists every UTF8 record despite partial byte writes',async()=>{
  const chunks=[],events=[];let elapsed=100;
  const writer=createNativeReceiptLogger({write:async(buffer,offset,length)=>{
    await setImmediate();const count=Math.min(length,3);chunks.push(Buffer.from(buffer.subarray(offset,offset+count)));return {bytesWritten:count};
  },checkpoint:async label=>{events.push(label);},monotonic:()=>elapsed++,timestamp:()=> '2026-10-07T09:00:00.000Z'});
  const first={kind:'transport',text:'Ω雪\nexact'},second={kind:'negative',passed:false};
  writer.log(first);writer.log(second);
  assert.equal(chunks.length,0,'The test reproduces deferred writes before the real drain');
  await writer.checkpoint('before next owned action');
  const records=Buffer.concat(chunks).toString('utf8').trimEnd().split('\n').map(JSON.parse);
  assert.deepEqual(records,[{...first,log_sequence:1,observed_at:'2026-10-07T09:00:00.000Z',observed_elapsed_ms:1},{...second,log_sequence:2,observed_at:'2026-10-07T09:00:00.000Z',observed_elapsed_ms:2}]);
  assert.deepEqual(events,['before next owned action','after log drain: before next owned action']);
  assert.deepEqual(first,{kind:'transport',text:'Ω雪\nexact'});await writer.flush();
});

test('native logs: returned write promises and failed drains prevent later actions',async()=>{
  for(const result of [{bytesWritten:0},{bytesWritten:-1},{bytesWritten:999},undefined]) {
    const writer=createNativeReceiptLogger({write:async()=>result,checkpoint:async()=>{}});
    const pending=writer.log({kind:'test'});assert.equal(typeof pending.then,'function');
    await assert.rejects(pending);await assert.rejects(writer.checkpoint('next action'));await assert.rejects(writer.flush());
  }
  const failure=Object.assign(new Error('owned file failure'),{code:'ENOSPC'});let writes=0;
  const writer=createNativeReceiptLogger({write:async()=>{writes++;throw failure;},checkpoint:async()=>{}});
  const first=writer.log({kind:'first'}),second=writer.log({kind:'second'});
  await assert.rejects(first,error=>error===failure);await assert.rejects(second,error=>error===failure);assert.equal(writes,1);
  await assert.rejects(writer.checkpoint('next action'),error=>error===failure);
});

test('native logs: checkpoints still deliver stops before or after a write drain',async()=>{
  for(const stopAt of [1,2]) {
    let calls=0;const failure=new Error('actual stop checkpoint');
    const writer=createNativeReceiptLogger({write:async(buffer,offset,length)=>({bytesWritten:length}),checkpoint:async()=>{if(++calls===stopAt)throw failure;}});
    writer.log({kind:'transport'});
    await assert.rejects(writer.checkpoint('owned action'),error=>error===failure);await writer.flush();assert.equal(calls,stopAt);
  }
});
