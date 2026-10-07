import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {lstatSync} from 'node:fs';
import {request as httpRequest} from 'node:http';
import {performance} from 'node:perf_hooks';
import {isMainThread,Worker,MessageChannel,receiveMessageOnPort,workerData} from 'node:worker_threads';
import {createStrictEngineDemux,createStrictStatementArchive} from './treasure-vault-native-engine-wire.mjs';
import {GROUPED_NATIVE_FILE_SCRIPT,GROUPED_NATIVE_FILE_SCRIPT_SHA256} from './treasure-vault-native-file-transport.mjs';

assert.equal(GROUPED_NATIVE_FILE_SCRIPT_SHA256,'d31e12050be6086b0929718c4a46b24254480d5544e50d258551b29ab0c3e28b','Exact reviewed shell program only');

import {assertNativeDatabaseResourceLimits,nativeDatabaseResourceLimits} from './treasure-vault-native-resources.mjs';

const API='1.45',MAX_BYTES=128*1024*1024;
const PRIVATE_DIRECTORY=/^\/tmp\/wg-tv-native-sql-[A-Za-z0-9]{6}$/;
const shaPattern=/^[a-f0-9]{64}$/;
const version=value=>{assert.match(value,/^[0-9]+\.[0-9]+$/);return value.split('.').map(Number);};
const compare=(left,right)=>left[0]-right[0]||left[1]-right[1];

/** Real facade uses the same isolated nonce/sequence checks exercised by models. */
export function assertPrivateRpcReply(message,nonce,sequence) {
  assert.equal(message.nonce,nonce,'RPC nonce must match');assert.equal(message.sequence,sequence,'No stale/future RPC reply');
  assert.ok(['progress','result'].includes(message.kind));
  assert.equal(typeof message.diagnostic.poisoned,'boolean');assert.ok(Array.isArray(message.diagnostic.pending_exec_ids));
  for(const id of message.diagnostic.pending_exec_ids)assert.match(id,shaPattern);
  if(message.kind==='result')assert.equal(typeof message.ok,'boolean');
}

/** API1.45 represents an empty inherited OS user by an omitted user key.
 * Permit that one documented wire shape only; never normalize the actual row.
 * Nonempty inherited users and every other command/privilege field stay exact.
 */
export function assertOwnedExecProcessConfig(actual,originalOsUser,argv) {
  assert.equal(typeof originalOsUser,'string','Original owned container OS user remains text');
  assert.ok(actual&&typeof actual==='object'&&!Array.isArray(actual),'ExecInspect ProcessConfig is an object');
  assert.equal(Object.getPrototypeOf(actual),Object.prototype,'ExecInspect is an actual plain JSON object');
  const expected={privileged:false,user:originalOsUser,tty:false,entrypoint:argv[0],arguments:argv.slice(1)};
  if(originalOsUser===''&&!Object.hasOwn(actual,'user'))delete expected.user;
  assert.deepEqual(actual,expected,'ExecInspect must describe the exact requested nonprivileged command');
}

/** No endpoint, name, image or owner is discovered from an ambient context. */
function validateBinding(binding) {
  assert.deepEqual(Object.keys(binding).sort(),['database','engineId','socketPath']);
  assert.equal(typeof binding.socketPath,'string');assert.match(binding.socketPath,/^\/[^\r\n\0?#]+$/);
  assert.ok(!binding.socketPath.split('/').some(part=>part==='.'||part==='..'));
  assert.ok(lstatSync(binding.socketPath).isSocket(),'Explicit local Unix socket only');
  assert.equal(typeof binding.engineId,'string');assert.match(binding.engineId,/^[A-Za-z0-9:_.-]+$/);
  const db=binding.database;
  assert.deepEqual(Object.keys(db).sort(),['id','imageId','imageTag','name','owner']);
  assert.match(db.id,shaPattern);assert.match(db.imageId,/^sha256:[a-f0-9]{64}$/);
  assert.equal(db.imageTag,'supabase/postgres:15.6.1.146');
  assert.match(db.name,/^wg-tv-[A-Za-z0-9_-]+$/);assert.match(db.owner,/^[A-Za-z0-9_-]+$/);
}

/** Synchronous local Engine facade. Atomics cannot deliver pending main-thread signals.
 * Actual fixture orchestration must still yield and run its async stop callbacks.
 * Worker termination never removes a container or proves a launched exec ended.
 */
export async function createOwnedUnixEngineWorker({binding,deadlineMs=660000,initializationDeadlineMs=30000,throwIfRequested=()=>{},modelWorkerObserver=null}) {
  validateBinding(binding);assert.ok(Number.isSafeInteger(deadlineMs)&&deadlineMs>=100&&deadlineMs<=660000);
  assert.ok(Number.isSafeInteger(initializationDeadlineMs)&&initializationDeadlineMs>=100&&initializationDeadlineMs<=30000);
  assert.equal(typeof throwIfRequested,'function');
  if(modelWorkerObserver!==null)assert.equal(typeof modelWorkerObserver,'function');
  const {port1,port2}=new MessageChannel(),notification=new Int32Array(new SharedArrayBuffer(4));
  const nonce=randomUUID();let sequence=0,closed=false,poisoned=false;
  let diagnostic={poisoned:false,pending_exec_ids:[],unknown_exec_creation:false};
  const worker=new Worker(new URL(import.meta.url),{workerData:{binding,port:port2,notification:notification.buffer,nonce},transferList:[port2],stdout:true,stderr:true});
  worker.on('error',()=>{});
  worker.stdout.resume();worker.stderr.resume();
  function fail(error) {
    poisoned=true;diagnostic={...diagnostic,poisoned:true};error.diagnostic=structuredClone(diagnostic);
    error.native_result={status:null,signal:null,error:{code:error.code??'ENGINE_TRANSPORT_REJECTED',stage:error.phase??'parent-rpc',created_exec_id:diagnostic.current_exec?.created_exec_id??null,start_attempted:diagnostic.current_exec?.start_attempted??false,execution_unknown:true},stdout:null,stderr:null};throw error;
  }
  function call(operation,payload,totalDeadlineMs=deadlineMs) {
    assert.equal(closed,false,'Worker is closed');assert.equal(poisoned,false,'Poisoned worker cannot retry or fall back');
    throwIfRequested('before local Engine RPC');const current=++sequence;
    const deadline=performance.now()+totalDeadlineMs;
    port1.postMessage({nonce,sequence:current,operation,payload,deadline_ms:totalDeadlineMs,sent_at:Date.now()});
    try {
      while(true) {
        const remaining=deadline-performance.now();
        if(remaining<=0) {const error=new Error('Total Unix RPC deadline exceeded; native result unknown');error.code='ETIMEDOUT';return fail(error);}
        const notificationBefore=Atomics.load(notification,0);
        const packet=receiveMessageOnPort(port1);
        if(packet) {
          const message=packet.message;
          assertPrivateRpcReply(message,nonce,current);diagnostic=message.diagnostic;
          if(message.kind==='progress')continue;
          assert.equal(typeof message.ok,'boolean');
          if(!message.ok) {const error=new Error(message.failure.message);error.code=message.failure.code;error.phase=message.failure.phase;return fail(error);}
          throwIfRequested('after local Engine RPC');
          if(performance.now()>=deadline) {const error=new Error('Late Unix RPC result cannot qualify');error.code='ETIMEDOUT';return fail(error);}
          return message.result;
        }
        throwIfRequested('local Engine RPC cached stop probe');
        Atomics.wait(notification,0,notificationBefore,Math.min(remaining,10));
      }
    } catch(error) {if(!poisoned)fail(error);throw error;}
  }
  const facade={
    inspect:()=>call('inspect',{}),
    exec:argv=>call('exec',{argv}),
    archive:payload=>call('archive',payload),
    state:()=>structuredClone(diagnostic),
    async close() {
      if(closed)return;closed=true;port1.close();const exit=await worker.terminate();assert.equal(worker.threadId,-1,'Only this owned worker must stop');
      return {worker_closed:true,worker_exit:exit,owned_container_cleanup_performed:false,diagnostic:structuredClone(diagnostic)};
    },
  };
  try {if(modelWorkerObserver)modelWorkerObserver(worker);call('initialize',{},initializationDeadlineMs);return facade;}
  catch(error) {await facade.close();throw error;}
}

/** Worker-only HTTP: no subprocesses, TTY/stdin, arbitrary shell, ambient context,
 * environment or remote API. Only the reviewed literal transport script exists.
 */
if(!isMainThread) {
  const {binding,port,nonce}=workerData,notification=new Int32Array(workerData.notification);
  validateBinding(binding);
  const directories=new Map();let poisoned=false,busy=false,initialized=false,lastSequence=0,originalOsUser=null;
  const diagnostic={poisoned:false,pending_exec_ids:[],unknown_exec_creation:false,possible_unknown_archive:false,current_exec:null};
  const reply=(message)=>{port.postMessage(message);Atomics.add(notification,0,1);Atomics.notify(notification,0);};
  port.on('message',async request=>{
    let phase='rpc-validation';const context={deadline:request.sent_at+request.deadline_ms};
    const report=()=>reply({kind:'progress',nonce,sequence:request.sequence,diagnostic:structuredClone(diagnostic)});
    const timedError=()=>Object.assign(new Error('Total Unix operation deadline exceeded; native result unknown'),{code:'ETIMEDOUT'});
    function remaining() {const value=context.deadline-Date.now();if(value<=0)throw timedError();return value;}
    async function http(method,path,body,stream=false) {
      remaining();phase=method+' '+path;
      return await new Promise((resolve,reject)=>{
        let settled=false,total=0;const chunks=[],demux=stream?createStrictEngineDemux(MAX_BYTES):null;
        const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);if(error){req.destroy();reject(error);}else resolve(value);};
        const req=httpRequest({socketPath:binding.socketPath,method,path,agent:false,headers:{Connection:'close',...(body?{'Content-Type':stream?'application/json':(Buffer.isBuffer(body)?'application/x-tar':'application/json'),'Content-Length':Buffer.byteLength(body)}:{})}},res=>{
          try {
            assert.equal(res.statusCode,stream?200:(method==='POST'?201:200),'Exact HTTP status, never a native command result');
            if(stream)assert.ok(['application/vnd.docker.raw-stream','application/vnd.docker.multiplexed-stream'].includes(res.headers['content-type']),'NonTTY stream content type');
          } catch(error) {finish(error);return;}
          res.on('data',chunk=>{try{total+=chunk.length;assert.ok(total<=MAX_BYTES,'HTTP response byte limit');if(stream)demux.push(chunk);else chunks.push(chunk);}catch(error){finish(error);}});
          res.on('aborted',()=>finish(new Error('Aborted HTTP response; native result unknown')));
          res.on('error',error=>finish(error));
          res.on('end',()=>{try{assert.equal(res.complete,true,'Complete HTTP response required');finish(null,stream?demux.finish():Buffer.concat(chunks));}catch(error){finish(error);}});
          res.on('close',()=>{if(!settled)finish(new Error('Premature HTTP close; native result unknown'));});
        });
        const timer=setTimeout(()=>finish(timedError()),remaining());
        req.on('upgrade',(_res,socket)=>{socket.destroy();finish(new Error('Unexpected101 upgrade; native result unknown'));});
        req.on('error',error=>finish(error));req.end(body);
      });
    }
    const json=async(method,path,value)=>JSON.parse((await http(method,path,value===undefined?undefined:JSON.stringify(value))).toString('utf8'));
    async function initialWitness() {
      const observed=await json('GET','/version');
      assert.ok(compare(version(observed.MinAPIVersion),version(API))<=0&&compare(version(observed.ApiVersion),version(API))>=0,'Fixed API1.45 must be inside actual server range');
      const info=await json('GET','/v'+API+'/info');assert.equal(info.ID,binding.engineId,'Original captured engine ID');assert.equal(info.OSType,'linux');
    }
    async function identity() {
      const row=await json('GET','/v'+API+'/containers/'+binding.database.id+'/json');
      assert.equal(row.Id,binding.database.id);assert.equal(row.Name,'/'+binding.database.name);assert.equal(row.Image,binding.database.imageId);
      assert.equal(row.Config.Labels['wg.native.owner'],binding.database.owner);
      assert.equal(typeof row.Config.User,'string');
      if(originalOsUser===null)originalOsUser=row.Config.User;
      else assert.equal(row.Config.User,originalOsUser,'Original owned container OS user');
      assert.equal(row.State.Running,true);assert.equal(row.HostConfig.NetworkMode,'none');assert.deepEqual(row.HostConfig.PortBindings??{},{});
      assertNativeDatabaseResourceLimits(row);
      return row;
    }
    function validateCommand(argv) {
      assert.ok(Array.isArray(argv)&&argv.every(value=>typeof value==='string'));
      if(JSON.stringify(argv)===JSON.stringify(['mktemp','-d','/tmp/wg-tv-native-sql-XXXXXX']))return 'allocate';
      if(argv[0]==='/bin/sh') {
        assert.equal(argv.length,9);assert.deepEqual(argv.slice(0,4),['/bin/sh','-c',GROUPED_NATIVE_FILE_SCRIPT,'wg-tv-native-file']);
        assert.ok(['run','cleanup'].includes(argv[4]));assert.match(argv[5],PRIVATE_DIRECTORY);
        assert.equal(argv[6],argv[5]+'/statement.sql');assert.match(argv[7],shaPattern);assert.ok(['postgres','supabase_admin'].includes(argv[8]));
        assert.ok(directories.has(argv[5]),'Only this worker\'s actual allocated directory');
        if(argv[4]==='run')assert.equal(directories.get(argv[5]).sha256,argv[7],'Grouped expected SHA is the exact archived source');
        return 'grouped';
      }
      if(argv[0]==='pg_dump') {
        assert.deepEqual(argv,['pg_dump','-U','postgres','-d','postgres','--schema-only','--schema=public','--schema=auth','--schema=proof']);return 'dump';
      }
      assert.fail('Only exact file allocation, grouped program and complete schema dump are permitted');
    }
    try {
      assert.equal(busy,false,'Only one RPC in flight');assert.equal(poisoned,false,'No worker retries after poison');busy=true;
      assert.deepEqual(Object.keys(request).sort(),['deadline_ms','nonce','operation','payload','sent_at','sequence']);
      assert.equal(request.nonce,nonce);assert.ok(Number.isSafeInteger(request.sequence)&&request.sequence===lastSequence+1);lastSequence=request.sequence;
      assert.ok(Number.isSafeInteger(request.deadline_ms)&&request.deadline_ms>=100&&request.deadline_ms<=660000);
      if(request.operation==='initialize')assert.ok(request.deadline_ms<=30000,'Separate finite constructor budget');
      assert.ok(['initialize','inspect','exec','archive'].includes(request.operation));
      if(request.operation==='initialize') {assert.equal(initialized,false);await initialWitness();}
      else assert.equal(initialized,true,'Constructor binding witness must succeed');
      let result;await identity();
      if(['initialize','inspect'].includes(request.operation)) {
        initialized=true;result={owned_identity_verified:true,container_id:binding.database.id,engine_id:binding.engineId,api_version:API,continuous_engine_id_verification:false,resources:nativeDatabaseResourceLimits(),resource_limits_freshly_verified:true};
      }
      if(request.operation==='exec') {
        assert.deepEqual(Object.keys(request.payload),['argv']);const kind=validateCommand(request.payload.argv);
        diagnostic.unknown_exec_creation=true;diagnostic.current_exec={created_exec_id:null,start_attempted:false};report();
        const created=await json('POST','/v'+API+'/containers/'+binding.database.id+'/exec',{AttachStdin:false,AttachStdout:true,AttachStderr:true,Tty:false,Privileged:false,Cmd:request.payload.argv});
        assert.match(created.Id,shaPattern);diagnostic.unknown_exec_creation=false;diagnostic.pending_exec_ids.push(created.Id);
        diagnostic.current_exec={created_exec_id:created.Id,start_attempted:true};report();
        const streams=await http('POST','/v'+API+'/exec/'+created.Id+'/start',JSON.stringify({Detach:false,Tty:false}),true);
        const finished=await json('GET','/v'+API+'/exec/'+created.Id+'/json');
        assert.equal(finished.ID,created.Id);assert.equal(finished.ContainerID,binding.database.id);assert.equal(finished.Running,false);
        assert.equal(finished.OpenStdin,false);assert.ok(Number.isInteger(finished.ExitCode)&&finished.ExitCode>=0&&finished.ExitCode<=255);
        assertOwnedExecProcessConfig(finished.ProcessConfig,originalOsUser,request.payload.argv);
        await identity();diagnostic.pending_exec_ids=diagnostic.pending_exec_ids.filter(id=>id!==created.Id);
        diagnostic.current_exec=null;
        result={status:finished.ExitCode,signal:null,error:null,stdout:streams.stdout,stderr:streams.stderr,exec_id:created.Id,clean_stream_complete:true,api_version:API};
        if(kind==='allocate'&&result.status===0) {
          const allocated=result.stdout.replace(/\n$/,'');assert.match(allocated,PRIVATE_DIRECTORY);assert.equal(directories.has(allocated),false);
          directories.set(allocated,{verified:false});
        }
        if(kind==='grouped') {
          const argv=request.payload.argv,cleanupCompleted=[0,3,90].includes(result.status);
          result.grouped_transport={script_sha256:GROUPED_NATIVE_FILE_SCRIPT_SHA256,mode:argv[4],remote_cleanup_completed:cleanupCompleted,copied_bytes_verified:argv[4]==='run'&&[0,3].includes(result.status)};
          if(cleanupCompleted)directories.delete(argv[5]);
        }
      }
      if(request.operation==='archive') {
        const payload=request.payload;assert.deepEqual(Object.keys(payload).sort(),['destinationDirectory','expectedSha256','expectedSize','sourcePath']);
        assert.match(payload.destinationDirectory,PRIVATE_DIRECTORY);assert.ok(directories.has(payload.destinationDirectory));
        const tar=createStrictStatementArchive(payload);diagnostic.possible_unknown_archive=true;report();
        const body=await http('PUT','/v'+API+'/containers/'+binding.database.id+'/archive?path='+encodeURIComponent(payload.destinationDirectory)+'&noOverwriteDirNonDir=1',tar.archive);
        assert.equal(body.length,0);await identity();diagnostic.possible_unknown_archive=false;
        directories.set(payload.destinationDirectory,{verified:false,sha256:tar.source_sha256});
        result={archive_uploaded:true,remote_sha256_verified:false,source_sha256:tar.source_sha256,source_bytes:tar.source_bytes,archive_sha256:tar.archive_sha256};
      }
      reply({kind:'result',nonce,sequence:request.sequence,ok:true,result,diagnostic:structuredClone(diagnostic)});
    } catch(error) {
      poisoned=true;diagnostic.poisoned=true;
      reply({kind:'result',nonce,sequence:request.sequence,ok:false,failure:{message:error.message,code:error.code??'ENGINE_TRANSPORT_REJECTED',phase},diagnostic:structuredClone(diagnostic)});
    } finally {busy=false;}
  });
}
