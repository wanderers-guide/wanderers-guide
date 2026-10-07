import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,writeFileSync,readFileSync,chmodSync,symlinkSync,linkSync,unlinkSync,rmdirSync,existsSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {Worker} from 'node:worker_threads';
import {createStrictEngineDemux,createStrictStatementArchive,wireSha256} from './treasure-vault-native-engine-wire.mjs';

import {assertStrictStatementArchive} from './treasure-vault-native-engine-archive-model.mjs';
import {createOwnedUnixEngineWorker,assertPrivateRpcReply,assertOwnedExecProcessConfig} from './treasure-vault-native-engine.mjs';
import {GROUPED_NATIVE_FILE_SCRIPT,GROUPED_NATIVE_FILE_SCRIPT_SHA256} from './treasure-vault-native-file-transport.mjs';

const frame=(type,bytes)=>{const body=Buffer.from(bytes),header=Buffer.alloc(8);header[0]=type;header.writeUInt32BE(body.length,4);return Buffer.concat([header,body]);};
const dump=['pg_dump','-U','postgres','-d','postgres','--schema-only','--schema=public','--schema=auth','--schema=proof'];

/** Model orchestration is bounded too; no fake-worker death can hang cleanup. */
function waitFakeMessage(worker,kind,deadlineMs=5000) {
  assert.ok(Number.isSafeInteger(deadlineMs)&&deadlineMs>0&&deadlineMs<=30000);
  return new Promise((resolve,reject)=>{
    let finished=false;
    const done=(error,value)=>{if(finished)return;finished=true;clearTimeout(timer);worker.off('message',message);worker.off('error',errorEvent);worker.off('exit',exitEvent);if(error)reject(error);else resolve(value);};
    const message=value=>value?.kind===kind?done(null,value):done(new Error('Unexpected fake-service message: '+value?.kind));
    const errorEvent=error=>done(error);
    const exitEvent=code=>done(Object.assign(new Error('Fake service worker exited before '+kind+': '+code),{code:'FAKE_WORKER_EXITED'}));
    const timer=setTimeout(()=>done(Object.assign(new Error('Fake service '+kind+' deadline exceeded'),{code:'FAKE_MESSAGE_TIMEOUT'})),deadlineMs);
    worker.on('message',message);worker.on('error',errorEvent);worker.on('exit',exitEvent);
    if(worker.threadId===-1)exitEvent('already-exited');
  });
}

/** Every server is a task-owned fake Unix service. No Docker, SQL or artifacts. */
async function fake(scenario,callback) {
  const folder=mkdtempSync('/private/tmp/wg-tv-engine-fake-'),socketPath=join(folder,'engine.sock');
  const binding={socketPath,engineId:'captured-fake-engine',database:{id:'a'.repeat(64),imageId:'sha256:'+'b'.repeat(64),imageTag:'supabase/postgres:15.6.1.146',name:'wg-tv-fake-owned',owner:'fake-owner'}};
  const server=new Worker(new URL('./treasure-vault-native-engine-fake.mjs',import.meta.url),{workerData:{binding,scenario}});
  let client=null,clientWorker=null,failure=null;const cleanupErrors=[];
  try {
    await waitFakeMessage(server,'ready',30000);
    const open=async(deadlineMs=5000)=>{client=await createOwnedUnixEngineWorker({binding,deadlineMs,initializationDeadlineMs:30000,modelWorkerObserver:worker=>{clientWorker=worker;}});return client;};
    const state=async()=>{const wait=waitFakeMessage(server,'state');server.postMessage('state');return await wait;};
    const setMode=async mode=>{const wait=waitFakeMessage(server,'mode');server.postMessage({mode});await wait;};
    await callback({open,state,setMode,binding,folder,terminateClientWorker:async()=>{await clientWorker.terminate();},terminateServerWorker:async()=>{await server.terminate();}});
  } catch(error) {failure=error;}
  finally {
    try {if(client){const closed=await client.close();if(closed)assert.equal(closed.owned_container_cleanup_performed,false);}}catch(error){cleanupErrors.push(error);}
    try {if(server.threadId!==-1){const wait=waitFakeMessage(server,'closed');server.postMessage('close');await wait;}}catch(error){cleanupErrors.push(error);}
    try {await server.terminate();assert.equal(server.threadId,-1);}catch(error){cleanupErrors.push(error);}
    try {if(existsSync(socketPath)){assert.ok(lstatSync(socketPath).isSocket());unlinkSync(socketPath);}rmdirSync(folder);}catch(error){cleanupErrors.push(error);}
  }
  if(cleanupErrors.length)throw new AggregateError([...(failure?[failure]:[]),...cleanupErrors],'Fake lifecycle cleanup failed; no model may qualify');
  if(failure)throw failure;
}

/** Literal fake bytes only; this helper neither parses nor executes SQL. */
function archiveModel(client,folder) {
  const directory=client.exec(['mktemp','-d','/tmp/wg-tv-native-sql-XXXXXX']).stdout.trim();
  const bytes=Buffer.from('fake Ω雪 payload'),sourcePath=join(folder,'statement.sql');writeFileSync(sourcePath,bytes,{flag:'wx',mode:0o600});
  try {client.archive({sourcePath,expectedSha256:wireSha256(bytes),expectedSize:bytes.length,destinationDirectory:directory});}
  finally {unlinkSync(sourcePath);}
  return {directory,sha256:wireSha256(bytes),argv:['/bin/sh','-c',GROUPED_NATIVE_FILE_SCRIPT,'wg-tv-native-file','run',directory,directory+'/statement.sql',wireSha256(bytes),'postgres']};
}

test('strict frames retain fragmented Unicode and reject incomplete/system/oversize headers',()=>{
  const bytes=Buffer.from('Ω雪'),stream=Buffer.concat([frame(1,bytes.subarray(0,1)),frame(2,'δ\n'),frame(1,bytes.subarray(1))]);
  const reader=createStrictEngineDemux(2048);for(const byte of stream)reader.push(Buffer.from([byte]));
  assert.deepEqual(reader.finish(),{stdout:'Ω雪',stderr:'δ\n',received_bytes:stream.length});assert.throws(()=>reader.finish());
  for(const mutant of [frame(3,'daemon'),frame(0,'stdin'),frame(1,'x').subarray(0,3),frame(1,'abc').subarray(0,10)]) {
    const value=createStrictEngineDemux(2048);assert.throws(()=>{value.push(mutant);value.finish();});
  }
  const reserved=frame(1,'x');reserved[1]=1;assert.throws(()=>createStrictEngineDemux(2048).push(reserved));
  const large=frame(1,'x');large.writeUInt32BE(2049,4);assert.throws(()=>createStrictEngineDemux(2048).push(large));
});

test('one regular private archive has exact bytes, mode and SHA; no aliases/path/link entries',()=>{
  const folder=mkdtempSync('/private/tmp/wg-tv-engine-archive-'),sourcePath=join(folder,'statement.sql'),alias=join(folder,'alias.sql');
  const bytes=Buffer.from('fake Ω雪 payload');writeFileSync(sourcePath,bytes,{flag:'wx',mode:0o600});
  const input={sourcePath,expectedSha256:wireSha256(bytes),expectedSize:bytes.length};
  try {
    const valid=createStrictStatementArchive(input);assertStrictStatementArchive(valid.archive,bytes);
    assert.equal(valid.source_sha256,wireSha256(bytes));assert.deepEqual(readFileSync(sourcePath),bytes);
    assert.throws(()=>createStrictStatementArchive({...input,expectedSha256:'0'.repeat(64)}));
    assert.throws(()=>createStrictStatementArchive({...input,expectedSize:bytes.length+1}));
    assert.throws(()=>createStrictStatementArchive({...input,sourcePath:folder+'/../'+folder.split('/').at(-1)+'/statement.sql'}));
    chmodSync(sourcePath,0o644);assert.throws(()=>createStrictStatementArchive(input));chmodSync(sourcePath,0o600);
    symlinkSync(sourcePath,alias);assert.throws(()=>createStrictStatementArchive({...input,sourcePath:alias}));unlinkSync(alias);
    linkSync(sourcePath,alias);assert.throws(()=>createStrictStatementArchive(input));unlinkSync(alias);
    for(const offset of [0,100,156,157,345]) {const changed=Buffer.from(valid.archive);changed[offset]=0x31;assert.throws(()=>assertStrictStatementArchive(changed,bytes));}
    assert.throws(()=>assertStrictStatementArchive(Buffer.concat([valid.archive,Buffer.alloc(512)]),bytes));
  } finally {if(existsSync(alias))unlinkSync(alias);unlinkSync(sourcePath);rmdirSync(folder);}
});

test('actual RPC nonce/sequence validator rejects stale/future and malformed completion packets',()=>{
  const packet={kind:'result',nonce:'nonce',sequence:2,ok:true,diagnostic:{poisoned:false,pending_exec_ids:[]}};
  assertPrivateRpcReply(packet,'nonce',2);
  for(const changed of [{...packet,nonce:'other'},{...packet,sequence:1},{...packet,sequence:3},{...packet,kind:'stdout'},{...packet,ok:0},{...packet,diagnostic:{poisoned:false,pending_exec_ids:['short']}}])assert.throws(()=>assertPrivateRpcReply(changed,'nonce',2));
});

test('constructor pins engine/API once; every action freshly verifies exact owned database',async()=>{
  await fake('normal',async({open,state})=>{
    const client=await open(660000);assert.equal(client.inspect().owned_identity_verified,true);assert.equal(client.inspect().continuous_engine_id_verification,false);
    const observed=await state();assert.equal(observed.requests.filter(row=>row.path==='/v1.45/info').length,1);
    assert.equal(observed.requests.filter(row=>row.path==='/version').length,1);
    assert.equal(observed.requests.filter(row=>row.path.includes('/images/')).length,0);
    assert.equal(observed.requests.filter(row=>row.path.includes('/containers/')&&row.path.endsWith('/json')).length,3);
  });
  for(const scenario of ['unsupported-api','unsupported-max','wrong-engine','wrong-container','wrong-owner','wrong-network','ports','memory-drift','swap-drift','cpu-drift'])await fake(scenario,async({open})=>{await assert.rejects(open(),error=>error.native_result.status===null&&error.diagnostic.poisoned===true);});
  for(const scenario of ['wrong-container','wrong-name','wrong-owner','wrong-image','wrong-network','ports','container-stopped','memory-drift','swap-drift','cpu-drift'])await fake('normal',async({open,setMode,state})=>{
    const client=await open();await setMode(scenario);assert.throws(()=>client.exec(dump),error=>error.native_result.status===null);assert.equal((await state()).exec_count,0);
  });
});

test('complete stream plus fresh exact ExecInspect returns raw 0 and byte-preserved Unicode',async()=>{
  await fake('normal',async({open,state})=>{
    const client=await open(),value=client.exec(dump);assert.equal(value.status,0);assert.equal(value.signal,null);assert.equal(value.error,null);assert.equal(value.stdout,'fake-schema');
    assert.equal(value.clean_stream_complete,true);assert.equal(client.state().pending_exec_ids.length,0);
    const observed=await state();assert.equal(observed.exec_count,1);assert.equal(observed.requests.filter(row=>row.path.endsWith('/start')).length,1);
  });
  await fake('fragmented-utf8',async({open})=>{const value=(await open()).exec(dump);assert.equal(value.stdout,'Ω雪');assert.equal(value.stderr,'error-δ');});
});

test('archived exact SQL uses only the pinned grouped program and preserves actual raw3',async()=>{
  await fake('group-native-three',async({open,folder,state})=>{
    const client=await open(),model=archiveModel(client,folder),value=client.exec(model.argv);
    assert.equal(value.status,3);assert.equal(value.error,null);assert.equal(value.stderr,'ERROR: 22012: division by zero\n');
    assert.equal(client.state().poisoned,false);assert.equal((await state()).remote_file_count,0);
  });
});

test('ambiguous stream/status/argv failures poison without retry or cleanup and retain unknown exec',async()=>{
  for(const scenario of ['system-error','truncated-header','truncated-payload','reserved-frame','unexpected-stdin','oversize-frame','unexpected-upgrade','wrong-exec-container','still-running','wrong-command','stream-reset'])await fake(scenario,async({open,state})=>{
    const client=await open();assert.throws(()=>client.exec(dump),error=>error.native_result.status===null&&error.diagnostic.poisoned===true);
    assert.equal(client.state().pending_exec_ids.length,1);assert.equal(client.state().current_exec.start_attempted,true);
    const before=await state();assert.throws(()=>client.inspect(),/Poisoned/);assert.throws(()=>client.exec(['rmdir','--','/tmp/wg-tv-native-sql-ABC123']),/Poisoned/);
    assert.equal((await state()).requests.length,before.requests.length,'No fallback or retry after ambiguity');
  });
  await fake('normal',async({open,state})=>{const client=await open();assert.throws(()=>client.exec(['sh','-c','anything']));assert.equal((await state()).exec_count,0);});
  await fake('http-error',async({open})=>{const client=await open();assert.throws(()=>client.exec(dump));assert.equal(client.state().unknown_exec_creation,true);});
  await fake('socket-peer-loss',async({open})=>{const client=await open();assert.throws(()=>client.exec(dump),error=>error.native_result.status===null);assert.equal(client.state().unknown_exec_creation,true);});
});

test('finite TOTAL deadlines and fake peer loss never become a native exit or execution-stop proof',async()=>{
  for(const scenario of ['stream-timeout','create-timeout','delayed-chain'])await fake(scenario==='delayed-chain'?'normal':scenario,async({open,setMode})=>{
    const client=await open(500);if(scenario==='delayed-chain')await setMode(scenario);const started=performance.now();
    assert.throws(()=>client.exec(dump),error=>error.native_result.status===null&&error.code==='ETIMEDOUT');
    assert.ok(performance.now()-started<1200,'Deadline is total, not independently extended at each HTTP step');
    if(scenario==='create-timeout')assert.equal(client.state().unknown_exec_creation,true);
    else assert.ok(client.state().pending_exec_ids.length===1);
    const closed=await client.close();assert.equal(closed.owned_container_cleanup_performed,false);
    assert.throws(()=>client.inspect(),/closed/);
  });
  await fake('normal',async({open,terminateClientWorker})=>{
    const client=await open(500);await terminateClientWorker();assert.throws(()=>client.exec(dump),error=>error.native_result.status===null&&error.code==='ETIMEDOUT');
    assert.equal(client.state().poisoned,true,'No successful stale or cached result after actual Worker death');
  });
  await fake('normal',async({open,state,terminateServerWorker})=>{
    const client=await open(500);await terminateServerWorker();await assert.rejects(state(),error=>error.code==='FAKE_WORKER_EXITED');
    assert.throws(()=>client.inspect(),error=>error.native_result.status===null&&error.diagnostic.poisoned===true);
  });
});

test('fixed grouped program returns clean raw outcomes without inventing cleanup for 1/2/91/92',async()=>{
  assert.equal(GROUPED_NATIVE_FILE_SCRIPT_SHA256,'d31e12050be6086b0929718c4a46b24254480d5544e50d258551b29ab0c3e28b');
  for(const [scenario,status] of [['normal',0],['group-native-three',3],['group-1',1],['group-2',2],['group-90',90],['group-91',91],['group-92',92]])await fake(scenario,async({open,folder,state})=>{
    const client=await open(),model=archiveModel(client,folder),value=client.exec(model.argv);
    assert.equal(value.status,status);assert.equal(value.signal,null);assert.equal(value.error,null);assert.equal(client.state().poisoned,false);
    assert.equal(value.grouped_transport.remote_cleanup_completed,[0,3,90].includes(status));
    assert.equal(value.grouped_transport.copied_bytes_verified,[0,3].includes(status));
    const observed=await state();assert.equal(observed.grouped.length,1);assert.equal(observed.grouped[0].input_sha256,model.sha256);
    assert.equal(observed.remote_file_count,[0,3,90].includes(status)?0:1);
    if(status===3)assert.equal(value.stderr,'ERROR: 22012: division by zero\n');
    if([0,3,90].includes(status))assert.throws(()=>client.exec(model.argv),/allocated directory/);
  });
  await fake('normal',async({open,folder,state})=>{
    const client=await open(),directory=client.exec(['mktemp','-d','/tmp/wg-tv-native-sql-XXXXXX']).stdout.trim();
    const value=client.exec(['/bin/sh','-c',GROUPED_NATIVE_FILE_SCRIPT,'wg-tv-native-file','cleanup',directory,directory+'/statement.sql','c'.repeat(64),'supabase_admin']);
    assert.equal(value.status,0);assert.equal(value.grouped_transport.mode,'cleanup');assert.equal((await state()).remote_directories.length,0);
  });
});

test('grouped RPC permits only the pinned literal program and this allocated exact archive identity',async()=>{
  const mutations=[
    argv=>{argv[2]+='\n# changed';},argv=>{argv[3]='other-marker';},argv=>{argv[4]='other';},
    argv=>{argv[5]='/tmp/wg-tv-native-sql-ZZZZZZ';argv[6]=argv[5]+'/statement.sql';},
    argv=>{argv[6]+='.other';},argv=>{argv[7]='f'.repeat(64);},argv=>{argv[8]='root';},argv=>{argv.push('extra');},
  ];
  for(const mutate of mutations)await fake('normal',async({open,folder,state})=>{
    const client=await open(),model=archiveModel(client,folder),before=await state(),argv=model.argv.slice();mutate(argv);
    assert.throws(()=>client.exec(argv),error=>error.native_result.status===null&&error.diagnostic.poisoned===true);
    assert.equal((await state()).exec_count,before.exec_count,'Malformed shell request cannot create an exec');
  });
});

/** Model the observed omission shape, not a raw retained ExecInspect capture.
 * API1.45 declares user,omitempty. No Docker, SQL or native parity is claimed.
 */
test('empty original OS user permits omitted or explicit empty ExecInspect user, but a known user cannot disappear',async()=>{
  for(const scenario of ['empty-user-omitted','empty-user-explicit'])await fake(scenario,async({open,state})=>{
    const client=await open(),value=client.exec(dump);assert.equal(value.status,0);assert.equal(value.signal,null);assert.equal(value.error,null);
    assert.equal(value.stdout,'fake-schema');assert.equal(value.clean_stream_complete,true);assert.equal(client.state().pending_exec_ids.length,0);
    const observed=await state();assert.equal(observed.exec_count,1);assert.equal(observed.requests.filter(row=>row.path.endsWith('/start')).length,1);
  });
  await fake('known-user-omitted',async({open,state})=>{
    const client=await open();assert.throws(()=>client.exec(dump),error=>error.native_result.status===null&&error.diagnostic.poisoned===true);
    const before=await state();assert.equal(before.exec_count,1);assert.equal(client.state().pending_exec_ids.length,1);
    assert.throws(()=>client.exec(dump),/Poisoned/);assert.equal((await state()).exec_count,before.exec_count,'No retry after a known user disappears');
  });
});

/** Pure boundary literals, not daemon metadata or a native SQL pass. */
test('documented empty-user omission keeps all exact command metadata and never mutates the actual row',()=>{
  const empty={privileged:false,tty:false,entrypoint:'pg_dump',arguments:['-U','postgres','-d','postgres','--schema-only','--schema=public','--schema=auth','--schema=proof']};
  for(const [actual,user] of [[empty,''],[{...empty,user:''},''],[{...empty,user:'postgres'},'postgres']]) {
    const before=structuredClone(actual);Object.freeze(actual.arguments);Object.freeze(actual);
    assertOwnedExecProcessConfig(actual,user,dump);assert.deepEqual(actual,before,'No normalized user key or other mutation is written into actual metadata');
  }
  const mutants=[
    [null,''],[[],''],[{...empty,user:null},''],[{...empty,user:undefined},''],[{...empty,user:0},''],[{...empty,user:false},''],
    [{...empty,user:'postgres'},''],[{...empty,user:'root'},''],[empty,'postgres'],[{...empty,user:''},'postgres'],[{...empty,user:'root'},'postgres'],
    [{...empty,extra:true},''],[{...empty,privileged:true},''],[{...empty,privileged:null},''],[{...empty,tty:true},''],
    [{...empty,entrypoint:'sh'},''],[{...empty,arguments:['-U','root']},''],[{...empty,arguments:undefined},''],[empty,null],[empty,0],
  ];
  for(const [actual,user] of mutants)assert.throws(()=>assertOwnedExecProcessConfig(actual,user,dump));
  for(const key of ['privileged','tty','entrypoint','arguments']){const row={...empty};delete row[key];assert.throws(()=>assertOwnedExecProcessConfig(row,'',dump));}
  const inherited=Object.create({user:''});Object.assign(inherited,empty);assert.throws(()=>assertOwnedExecProcessConfig(inherited,'',dump));
  assert.equal(mutants.length+4+1,25,'Exactly25 additional pure metadata counterexamples');
});

/** Fresh post-action drift must reject the completed result, never replay it. */
test('resource or owner drift after allocation, archive, grouped execution or dump vetoes the result without retry',async()=>{
  for(const action of ['allocate','archive','grouped','dump'])for(const drift of ['memory','owner'])await fake('normal',async({open,setMode,folder,state})=>{
    const client=await open();
    let model;
    if(action==='grouped')model=archiveModel(client,folder);
    if(action==='archive') {
      const directory=client.exec(['mktemp','-d','/tmp/wg-tv-native-sql-XXXXXX']).stdout.trim();
      const bytes=Buffer.from('fake Ω雪 payload'),sourcePath=join(folder,'statement.sql');writeFileSync(sourcePath,bytes,{flag:'wx',mode:0o600});
      model={directory,sourcePath,bytes};
    }
    await setMode('after-'+action+'-'+drift);
    try {
      assert.throws(()=>{
        if(action==='allocate')client.exec(['mktemp','-d','/tmp/wg-tv-native-sql-XXXXXX']);
        else if(action==='archive')client.archive({sourcePath:model.sourcePath,expectedSha256:wireSha256(model.bytes),expectedSize:model.bytes.length,destinationDirectory:model.directory});
        else client.exec(action==='grouped'?model.argv:dump);
      },error=>error.native_result.status===null&&error.diagnostic.poisoned===true);
      const before=await state();assert.throws(()=>client.inspect(),/Poisoned/);assert.throws(()=>client.exec(dump),/Poisoned/);
      assert.equal((await state()).requests.length,before.requests.length,'No retry after post-action identity failure');
    }finally {if(model?.sourcePath)unlinkSync(model.sourcePath);}
  });
});

/** A pending stop before dispatch and a late stop after completion cannot qualify. */
test('stop probes veto pre-dispatch and completed RPC results while worker closure remains independent',async()=>{
  for(const when of ['before','after'])await fake('normal',async({binding,state})=>{
    let stopped=false;
    const client=await createOwnedUnixEngineWorker({binding,throwIfRequested:label=>{
      if(stopped&&(when==='before'||label==='after local Engine RPC'))throw Object.assign(new Error('model stop'),{code:'ERR_NATIVE_STOP'});
    }});
    try {
      stopped=true;assert.throws(()=>client.exec(dump),error=>error.code==='ERR_NATIVE_STOP');
      assert.equal((await state()).exec_count,when==='before'?0:1);
      if(when==='after')assert.equal(client.state().poisoned,true);
      const closed=await client.close();assert.equal(closed.worker_closed,true);assert.equal(closed.owned_container_cleanup_performed,false);
    }finally {await client.close();}
  });
});
