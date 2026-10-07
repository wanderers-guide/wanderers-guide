import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {parentPort,workerData} from 'node:worker_threads';
import {wireSha256} from './treasure-vault-native-engine-wire.mjs';
import {GROUPED_NATIVE_FILE_SCRIPT,GROUPED_NATIVE_FILE_SCRIPT_SHA256} from './treasure-vault-native-file-transport.mjs';

import {assertStrictStatementArchive} from './treasure-vault-native-engine-archive-model.mjs';
/** Fake Unix HTTP only. This server never invokes Docker, SQL or a subprocess. */
const {binding}=workerData,executions=new Map(),files=new Map(),directories=new Set(),requests=[];
let counter=0,allocationCounter=0,scenario=workerData.scenario;
const frame=(type,bytes)=>{const value=Buffer.from(bytes),header=Buffer.alloc(8);header[0]=type;header.writeUInt32BE(value.length,4);return Buffer.concat([header,value]);};
const db=binding.database;
const server=createServer(async(req,res)=>{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
  requests.push({method:req.method,path:req.url,body_bytes:body.length});
  const response=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(value===undefined?'':JSON.stringify(value));};
  if(scenario==='delayed-chain')await new Promise(resolve=>setTimeout(resolve,125));
  if(req.url==='/version')return response(200,{MinAPIVersion:scenario==='unsupported-api'?'1.46':'1.24',ApiVersion:scenario==='unsupported-max'?'1.44':'1.45'});
  if(req.url==='/v1.45/info')return response(200,{ID:scenario==='wrong-engine'?'another-engine':binding.engineId,OSType:'linux'});
  if(req.url.startsWith('/v1.45/images/'))return response(200,{Id:scenario==='wrong-image'?'sha256:'+('e'.repeat(64)):db.imageId,RepoTags:[db.imageTag]});
  let observedScenario=scenario;
  const drift=scenario.match(/^after-(allocate|archive|grouped|dump)-(memory|owner)$/);
  if(drift) {
    const completed=drift[1]==='archive'?files.size>0:[...executions.values()].some(row=>drift[1]==='allocate'?row.argv[0]==='mktemp':drift[1]==='dump'?row.argv[0]==='pg_dump':row.grouped);
    if(completed)observedScenario=drift[2]==='memory'?'memory-drift':'wrong-owner';
  }
  if(req.url==='/v1.45/containers/'+db.id+'/json')return response(200,{
    Id:scenario==='wrong-container'?'f'.repeat(64):db.id,Name:'/'+(scenario==='wrong-name'?'replacement':db.name),Image:scenario==='wrong-image'?'sha256:'+'e'.repeat(64):db.imageId,
    Config:{User:scenario.startsWith('empty-user-')?'':'postgres',Labels:{'wg.native.owner':observedScenario==='wrong-owner'?'not-owned':db.owner}},State:{Running:scenario!=='container-stopped'},
    HostConfig:{Memory:observedScenario==='memory-drift'?2147483648:1073741824,MemorySwap:scenario==='swap-drift'?2147483648:1073741824,NanoCpus:scenario==='cpu-drift'?2000000000:1000000000,NetworkMode:scenario==='wrong-network'?'bridge':'none',PortBindings:scenario==='ports'?{'5432/tcp':[{HostPort:'5432'}]}:{}},
  });
  if(req.url==='/v1.45/containers/'+db.id+'/exec') {
    if(scenario==='create-timeout')return;
    if(scenario==='socket-peer-loss') {req.socket.destroy();return;}
    if(scenario==='http-error')return response(500,{message:'Fake create rejection'});
    const value=JSON.parse(body.toString('utf8'));
    assert.equal(value.AttachStdin,false);assert.equal(value.AttachStdout,true);assert.equal(value.AttachStderr,true);
    assert.equal(value.Tty,false);assert.equal(value.Privileged,false);assert.equal('Env' in value,false);assert.equal('User' in value,false);
    const id=(++counter).toString(16).padStart(64,'0');executions.set(id,{argv:value.Cmd});return response(201,{Id:id});
  }
  const match=req.url.match(/^\/v1\.45\/exec\/([a-f0-9]{64})\/(start|json)$/);
  if(match) {
    const execution=executions.get(match[1]);assert.ok(execution);
    if(match[2]==='json')return response(200,{ID:match[1],ContainerID:scenario==='wrong-exec-container'?'d'.repeat(64):db.id,Running:scenario==='still-running',OpenStdin:false,ExitCode:execution.status??0,
      ProcessConfig:{privileged:false,...(['empty-user-omitted','known-user-omitted'].includes(scenario)?{}:{user:scenario==='empty-user-explicit'?'':'postgres'}),tty:false,entrypoint:scenario==='wrong-command'?'sh':execution.argv[0],arguments:execution.argv.slice(1)}});
    const start=JSON.parse(body.toString('utf8'));assert.deepEqual(start,{Detach:false,Tty:false});
    if(scenario==='unexpected-upgrade') {res.writeHead(101,{Connection:'Upgrade',Upgrade:'tcp'});res.end();return;}
    res.writeHead(200,{'Content-Type':'application/vnd.docker.raw-stream','Connection':'close'});
    if(scenario==='stream-timeout')return;
    if(scenario==='stream-reset') {res.write(frame(1,'incomplete'));res.destroy();return;}
    let stdout='fake-output',stderr='';execution.status=0;
    const argv=execution.argv;
    if(argv[0]==='mktemp') {const directory='/tmp/wg-tv-native-sql-A'+String(++allocationCounter).padStart(5,'0');directories.add(directory);stdout=directory+'\n';}
    if(argv[0]==='sha256sum')stdout=wireSha256(files.get(argv.at(-1)))+'  '+argv.at(-1)+'\n';
    if(argv[0]==='rm'||argv[0]==='rmdir')stdout='';
    if(argv[0]==='pg_dump')stdout='fake-schema';
    if(argv[0]==='psql') {stdout='Ω雪\n';if(scenario==='native-three'){execution.status=3;stdout='';stderr='ERROR: 22012: division by zero\n';}}
    if(argv[0]==='/bin/sh') {
      assert.equal(argv.length,9);assert.deepEqual(argv.slice(0,4),['/bin/sh','-c',GROUPED_NATIVE_FILE_SCRIPT,'wg-tv-native-file']);
      const [mode,directory,file,expected,login]=argv.slice(4);
      assert.ok(['run','cleanup'].includes(mode));assert.ok(directories.has(directory));assert.equal(file,directory+'/statement.sql');
      assert.match(expected,/^[a-f0-9]{64}$/);assert.ok(['postgres','supabase_admin'].includes(login));
      stdout='';
      if(mode==='run') {
        assert.ok(files.has(file));assert.equal(wireSha256(files.get(file)),expected,'Fake accepts only the exact archived bytes');
        const response=workerData.responses?.[expected];
        if(response) {stdout=response.stdout;stderr=response.stderr;execution.status=response.status;}
        else stdout='Ω雪\n';
        if(scenario==='group-native-three'){execution.status=3;stdout='';stderr='ERROR: 22012: division by zero\n';}
        if(/^group-(?:1|2|90|91|92)$/.test(scenario)){execution.status=Number(scenario.slice(6));stdout='';stderr='fake grouped transport outcome\n';}
      }
      if([0,3,90].includes(execution.status)){files.delete(file);directories.delete(directory);}
      execution.grouped={mode,directory,input_sha256:expected,script_sha256:GROUPED_NATIVE_FILE_SCRIPT_SHA256,login};
    }
    let stream=Buffer.concat([frame(1,stdout),frame(2,stderr)]);
    if(scenario==='fragmented-utf8')stream=Buffer.concat([frame(1,Buffer.from('Ω雪').subarray(0,1)),frame(2,'error-δ'),frame(1,Buffer.from('Ω雪').subarray(1))]);
    if(scenario==='system-error')stream=frame(3,'fake daemon error');
    if(scenario==='truncated-header')stream=frame(1,'bad').subarray(0,5);
    if(scenario==='truncated-payload')stream=frame(1,'bad').subarray(0,10);
    if(scenario==='reserved-frame')stream[2]=1;
    if(scenario==='unexpected-stdin')stream[0]=0;
    if(scenario==='oversize-frame')stream.writeUInt32BE(128*1024*1024+1,4);
    if(scenario==='fragmented-utf8') {
      for(let index=0;index<stream.length;index++) {res.write(stream.subarray(index,index+1));await new Promise(resolve=>setImmediate(resolve));}
      res.end();return;
    }
    res.end(stream);return;
  }
  if(req.method==='PUT'&&req.url.startsWith('/v1.45/containers/'+db.id+'/archive?')) {
    const url=new URL(req.url,'http://unused.invalid'),directory=url.searchParams.get('path');
    assert.match(directory,/^\/tmp\/wg-tv-native-sql-[A-Za-z0-9]{6}$/);assert.equal(url.searchParams.get('noOverwriteDirNonDir'),'1');
    const size=Number.parseInt(body.subarray(124,136).toString('ascii'),8),bytes=body.subarray(512,512+size);
    assertStrictStatementArchive(body,bytes);files.set(directory+'/statement.sql',Buffer.from(bytes));return response(200);
  }
  response(404,{message:'Fake route not supported'});
});
const sockets=new Set();server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
server.on('error',error=>parentPort.postMessage({kind:'error',message:error.message}));
server.listen(binding.socketPath,()=>parentPort.postMessage({kind:'ready'}));
parentPort.on('message',message=>{
  if(message?.mode) {scenario=message.mode;parentPort.postMessage({kind:'mode'});}
  if(message==='state')parentPort.postMessage({kind:'state',requests,exec_count:executions.size,remote_directories:[...directories],remote_file_count:files.size,
    grouped:[...executions.values()].filter(row=>row.grouped).map(row=>({...row.grouped,status:row.status}))});
  if(message==='close') {for(const socket of sockets)socket.destroy();server.close(()=>{parentPort.postMessage({kind:'closed'});parentPort.close();});}
});
