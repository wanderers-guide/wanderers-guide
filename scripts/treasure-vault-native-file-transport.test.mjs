import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync,lstatSync} from 'node:fs';
import test from 'node:test';
import {mkdtempSync,writeFileSync,chmodSync,unlinkSync,rmdirSync,readdirSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import { EventEmitter } from 'node:events';
import { assertNativeContainerIdentity, assertNativeDatabaseResourceLimits } from './treasure-vault-native-fixture.mjs';
import { createNativeStopController, finalizeNativeStopReceipt } from './treasure-vault-native-stop.mjs';
import {createNativeFileSqlTransport} from './treasure-vault-native-file-transport.mjs';

const id='a'.repeat(64);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const result=(overrides={})=>({status:0,signal:null,error:undefined,stdout:'',stderr:'',...overrides});

/** External Docker boundary only. No process, SQL or daemon is started here. */
function model({psql=result({stdout:'check|t\n'}),fail=null,corruptCopy=false,replaceIdentityAt=null,mktemp=result({stdout:'/tmp/wg-tv-native-sql-Ab1234\n'}),commandResult=null,ownerRead=null,afterAction=()=>{},cleanupResult=result(),noRemoteExecution=false}={}) {
  const files=new Map(),copied=[],events=[],records=[],localFiles=[];
  let ownershipReads=0,cleanupDepth=0,psqlCalls=0;
  function getOwnedDatabaseId(){
    ownershipReads++;
    if(ownerRead)return ownerRead(ownershipReads,cleanupDepth);
    return ownershipReads===replaceIdentityAt?'b'.repeat(64):id;
  }
  function docker(args,input,allowFailure){
    assert.equal(input,undefined,'No SQL is delivered over attached stdin');
    assert.equal(allowFailure,true,'Raw exits are validated by the file transport');
    let name=args[0]==='cp'?'copy':args[2];
    if(name==='/bin/sh')name='grouped-'+args[6];
    events.push({name,args:[...args],cleanup:cleanupDepth>0});
    if(commandResult){const override=commandResult(name,args);if(override)return override;}
    if(name==='mktemp')return mktemp;
    if(name==='copy'){
      assert.equal(args[2],id+':/tmp/wg-tv-native-sql-Ab1234/statement.sql');
      const path=args[1],stat=lstatSync(path);
      assert.ok(stat.isFile()&&!stat.isSymbolicLink());assert.equal(stat.mode&0o777,0o600);
      localFiles.push(path);const bytes=Buffer.from(readFileSync(path));copied.push(bytes);
      files.set('/tmp/wg-tv-native-sql-Ab1234/statement.sql',corruptCopy?Buffer.from('not the SQL'):bytes);
      const value=fail==='copy'?result({status:1,stderr:'Model copy failure'}):result();
      afterAction(name);return value;
    }
    if(name==='grouped-run'||name==='grouped-cleanup'){
      assert.deepEqual(args.slice(0,4),['exec',id,'/bin/sh','-c']);
      assert.equal(digest(Buffer.from(args[4])),'d31e12050be6086b0929718c4a46b24254480d5544e50d258551b29ab0c3e28b','Exact reviewed fixed script');
      assert.deepEqual(args.slice(5,9),['wg-tv-native-file',name==='grouped-run'?'run':'cleanup','/tmp/wg-tv-native-sql-Ab1234','/tmp/wg-tv-native-sql-Ab1234/statement.sql']);
      assert.match(args[9],/^[a-f0-9]{64}$/);assert.ok(['postgres','supabase_admin'].includes(args[10]));
      let value=name==='grouped-cleanup'?cleanupResult:psql;
      if(name==='grouped-run'&&(corruptCopy||fail==='sha256sum'))value=result({status:90,stderr:'Native file transport digest failed\n'});
      else if(name==='grouped-run')psqlCalls++;
      if(fail==='rm'||fail==='rmdir')value=result({status:91,stdout:value.stdout,stderr:value.stderr+'Native file transport cleanup failed\n'});
      if(!noRemoteExecution&&[0,3,90].includes(value.status)&&value.error==null&&value.signal===null)files.delete(args[8]);
      afterAction(name);return value;
    }
    throw new Error('Unmodelled Docker command '+JSON.stringify(args));
  }
  const sql=createNativeFileSqlTransport({getOwnedDatabaseId,docker,cleanupTransport:callback=>{cleanupDepth++;try{return callback();}finally{cleanupDepth--; }},redact:String,record:row=>records.push(row)});
  return {sql,events,records,files,copied,localFiles,get ownershipReads(){return ownershipReads;},get psqlCalls(){return psqlCalls;}};
}

test('File-only boundary model: exact UTF8 SQL reaches psql through a private regular file, never stdin',()=>{
  const statement="BEGIN;\nSELECT '雪', E'\\\\q', '$tag$';\nROLLBACK;\n";
  const m=model(),actual=m.sql(statement);
  assert.deepEqual(actual,result({stdout:'check|t\n'}));
  assert.deepEqual(m.events.map(row=>row.name),['mktemp','copy','grouped-run']);
  assert.equal(m.records[0].sql_sha256,digest(Buffer.from(statement)));
  assert.equal(m.records[0].sql_bytes,Buffer.byteLength(statement));
  assert.equal(m.records[0].copied_bytes_verified,true);
  assert.equal(m.records[0].temporary_files_cleaned,true);
  assert.equal(m.records[0].scope,'SQL byte/transport evidence only; not guard/migration proof.');
  assert.ok(m.localFiles.every(path=>!existsSync(path)));
});

/** Capture the real helper's dispatched fixed script through its external boundary. */
function reviewedScript(){
  const m=model();m.sql('SELECT 1;');
  const script=m.events.find(row=>row.name==='grouped-run').args[4];
  assert.equal(digest(Buffer.from(script)),'d31e12050be6086b0929718c4a46b24254480d5544e50d258551b29ab0c3e28b');
  return script;
}

// The actual POSIX shell is exercised only with fake utility executables. Its
// fake psql records file bytes and prints fixtures; it never executes SQL.
const FAKE_UTILITY=`#!${process.execPath}
import{readFileSync,writeFileSync,appendFileSync,existsSync,unlinkSync,rmdirSync}from'node:fs';
import{basename}from'node:path';import{createHash}from'node:crypto';
const name=basename(process.argv[1]),args=process.argv.slice(2),config=JSON.parse(readFileSync(process.env.WG_MODEL_CONFIG,'utf8'));
appendFileSync(process.env.WG_MODEL_TRACE,JSON.stringify({name,args})+'\\n');
const fail=config.utilityFailures?.[name];if(fail){process.stdout.write(fail.stdout??'');process.stderr.write(fail.stderr??'');process.exit(fail.status);}
if(name==='sha256sum'){const value=createHash('sha256').update(readFileSync(args[1])).digest('hex');process.stdout.write((config.badDigest?'0'.repeat(64):value)+'  '+args[1]+(config.digestNoLF?'':'\\n')+(config.digestExtraStdout??''));process.stderr.write(config.digestExtraStderr??'');}
else if(name==='psql'){const path=args[args.indexOf('-f')+1];writeFileSync(process.env.WG_MODEL_OBSERVED,readFileSync(path));process.stdout.write(config.native.stdout);process.stderr.write(config.native.stderr);process.exit(config.native.status);}
else if(name==='rm'){if(existsSync(args[2]))unlinkSync(args[2]);}
else if(name==='rmdir'){rmdirSync(args[1]);}
else throw Error('Unexpected fake utility');
`;

function posix({native={status:0,stdout:'row|t\n',stderr:''},utilityFailures={},badDigest=false,digestNoLF=false,digestExtraStdout='',digestExtraStderr='',missing=[],mode='run',statement="SELECT '雪';",extraArgs}={}){
  const root=mkdtempSync(join(realpathSync(tmpdir()),'wg-tv-grouped-model-'));
  const remote=mkdtempSync('/tmp/wg-tv-native-sql-'),remoteFile=remote+'/statement.sql';
  const paths=[];const track=path=>{paths.push(path);return path;};
  try{
    writeFileSync(remoteFile,Buffer.from(statement),{flag:'wx',mode:0o600});
    const config=track(join(root,'config.json')),trace=track(join(root,'trace.jsonl')),observed=track(join(root,'observed.sql'));
    writeFileSync(config,JSON.stringify({native,utilityFailures,badDigest,digestNoLF,digestExtraStdout,digestExtraStderr}),{flag:'wx',mode:0o600});writeFileSync(trace,'',{flag:'wx',mode:0o600});
    for(const name of ['sha256sum','psql','rm','rmdir'])if(!missing.includes(name)){
      const path=track(join(root,name));writeFileSync(path,FAKE_UTILITY,{flag:'wx',mode:0o700});chmodSync(path,0o700);
    }
    const expectedDigest=digest(Buffer.from(statement));
    const actual=spawnSync('/bin/sh',['-c',reviewedScript(),'wg-tv-native-file',...(extraArgs??[mode,remote,remoteFile,expectedDigest,'postgres'])],
      {encoding:'utf8',timeout:10000,env:{PATH:root,WG_MODEL_CONFIG:config,WG_MODEL_TRACE:trace,WG_MODEL_OBSERVED:observed}});
    const events=readFileSync(trace,'utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line));
    return{actual,events,observed:existsSync(observed)?readFileSync(observed):null,remoteExists:existsSync(remote),remoteFileExists:existsSync(remoteFile),remote,remoteFile};
  }finally{
    // Only exact task-created regular files / then empty task-created dirs.
    if(existsSync(remoteFile))unlinkSync(remoteFile);if(existsSync(remote))rmdirSync(remote);
    for(const path of paths)if(existsSync(path))unlinkSync(path);assert.deepEqual(readdirSync(root),[]);rmdirSync(root);
  }
}

test('Actual POSIX fake utilities preserve native raw stdout/stderr/status and exact -f bytes without SQL execution',()=>{
  for(const status of [0,1,2,3,137]){
    const native={status,stdout:'\nrow|f\n\n',stderr:'psql:statement.sql:2: ERROR:  P0001: exact fixture guard\n'};
    const m=posix({native});assert.equal(m.actual.status,status);assert.equal(m.actual.signal,null);assert.equal(m.actual.error,undefined);
    assert.equal(m.actual.stdout,native.stdout);assert.equal(m.actual.stderr,native.stderr);
    assert.equal(m.observed.toString('utf8'),"SELECT '雪';");assert.equal(m.remoteExists,false);
    assert.deepEqual(m.events.map(event=>event.name),['sha256sum','psql','rm','rmdir']);
    const invocation=m.events[1].args;assert.deepEqual(invocation,['-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-f',m.remoteFile]);
  }
});

test('Actual POSIX digest/setup failures never invoke fake psql and cleanup failures override native outcomes',()=>{
  const digest=posix({badDigest:true});assert.equal(digest.actual.status,90);assert.equal(digest.observed,null);
  assert.deepEqual(digest.events.map(event=>event.name),['sha256sum','rm','rmdir']);assert.equal(digest.actual.stdout,'');assert.equal(digest.remoteExists,false);
  for(const missing of [['sha256sum'],['psql'],['rm'],['rmdir']]){
    const m=posix({missing});assert.ok([91,92].includes(m.actual.status));assert.equal(m.observed,null);assert.equal(m.actual.stdout,'');
  }
  for(const nativeStatus of [0,3])for(const name of ['rm','rmdir']){
    const m=posix({native:{status:nativeStatus,stdout:'native untouched\n',stderr:'native guard\n'},utilityFailures:{[name]:{status:1,stdout:'utility output',stderr:'utility detail'}}});
    assert.equal(m.actual.status,91);assert.equal(m.actual.stdout,'native untouched\n');
    assert.equal(m.actual.stderr,'native guard\nNative file transport cleanup failed\n');
  }
  for(const name of ['sha256sum','rm','rmdir']){
    const m=posix({utilityFailures:{[name]:{status:0,stderr:'unexpected utility warning'}}});
    assert.equal(m.actual.status,name==='sha256sum'?90:91);assert.ok(!m.actual.stderr.includes('unexpected utility warning'));
  }
  for(const name of ['rm','rmdir']){
    const m=posix({utilityFailures:{[name]:{status:0,stdout:'\n'}}});
    assert.equal(m.actual.status,91,'Trailing-newline-only cleanup output must not disappear in command substitution');
    assert.equal(m.actual.stdout,'row|t\n');assert.equal(m.actual.stderr,'Native file transport cleanup failed\n');
  }
  const malformed=posix({extraArgs:['run','not-an-approved-directory','not-a-child','0'.repeat(64),'postgres']});
  assert.equal(malformed.actual.status,92);assert.equal(malformed.observed,null);assert.equal(malformed.events.length,0);
  assert.equal(malformed.remoteExists,true,'Invalid path cannot authorize guessed cleanup');
  const cleanup=posix({mode:'cleanup'});assert.equal(cleanup.actual.status,0);assert.equal(cleanup.observed,null);
  assert.deepEqual(cleanup.events.map(event=>event.name),['rm','rmdir']);assert.equal(cleanup.actual.stdout,'');assert.equal(cleanup.remoteExists,false);

  // Preserve the previously reviewed single-LF/blank diagnostic utility matrix.
  for(const mutant of [{digestNoLF:true},{digestExtraStdout:'\n'},{digestExtraStderr:'\n'}]){
    const m=posix(mutant);assert.equal(m.actual.status,90,'Exact old digest byte contract must remain strict');
    assert.equal(m.actual.stdout,'');assert.equal(m.actual.stderr,'Native file transport digest failed\n');
    assert.equal(m.observed,null);assert.equal(m.remoteExists,false);
    assert.deepEqual(m.events.map(event=>event.name),['sha256sum','rm','rmdir']);
  }
});


test('Unknown remote allocation fails closed and cannot claim complete temporary-file cleanup',()=>{
  for(const allocated of [result({status:null,error:Object.assign(new Error('timed out'),{code:'ETIMEDOUT'})}),result({stdout:'/tmp/unreviewed\n'})]){
    const m=model({mktemp:allocated});
    assert.throws(()=>m.sql('SELECT 1;'));
    assert.deepEqual(m.events.map(row=>row.name),['mktemp']);
    assert.equal(m.records[0].possible_unknown_remote_allocation,true);
    assert.equal(m.records[0].remote_allocation_attempted,true);assert.equal(m.records[0].remote_path_verified,false);
    assert.equal(m.records[0].temporary_files_cleaned,false);
    assert.equal(m.records[0].passed,false);
  }
});

test('Byte corpus only: COPY, rollback, metacommands, Unicode and no-LF statements are not rewritten',()=>{
  const fixtures=[
    ['empty',''],['no final LF',"SELECT '雪';"],['unterminated final buffer','SELECT 1'],
    ['inline COPY',"COPY public.probe(value) FROM stdin;\n雪\n\\.\nSELECT 1;\n"],
    ['transaction rollback',"BEGIN;\nCREATE TEMP TABLE probe(v text);\nINSERT INTO probe VALUES ('雪');\nROLLBACK;\n"],
    ['metacommands',"\\echo exact-output\n\\if true\nSELECT 1;\n\\endif\n"],
    ['unbalanced if',"\\if true\nSELECT 1;\n"],
    ['multiline dollar quote',"DO $a$ BEGIN RAISE NOTICE 'literal \\q'; END $a$;\n"],
    ['comment at EOF','SELECT 1; -- no final newline'],
  ];
  for(const [label,statement] of fixtures){
    const m=model({psql:result({stdout:'unchanged-output\n'})});
    const actual=m.sql(statement);assert.deepEqual(m.copied,[Buffer.from(statement,'utf8')],label);
    assert.equal(m.records[0].sql_bytes,Buffer.byteLength(statement));assert.equal(m.records[0].sql_sha256,digest(Buffer.from(statement)));
    assert.equal(m.records[0].sql_framing_added,false);assert.equal(actual.stdout,'unchanged-output\n');
    assert.equal(m.psqlCalls,1);assert.ok(m.localFiles.every(path=>!existsSync(path)));
  }
});

test('Raw output/status contract: no trimming or injected output; actual file-error prefix preserves exact guard matching',()=>{
  for(const stdout of ['', '\ncheck|t\n\n', 'COPY 1\n雪\n', 'read-only|t\n']){
    const raw=result({stdout}),m=model({psql:raw});assert.equal(m.sql('SELECT 1;'),raw);assert.equal(m.records[0].raw_sql_status,0);
  }
  const stderr='psql:/tmp/wg-tv-native-sql-Ab1234/statement.sql:8: ERROR:  P0001: treasure-vault test guard\nCONTEXT:  PL/pgSQL function inline_code_block line 2 at RAISE\n';
  const raw=result({status:3,stdout:'prior-output\n',stderr}),m=model({psql:raw});
  assert.equal(m.sql('BEGIN;\nDO $$ BEGIN RAISE EXCEPTION USING ERRCODE=\'P0001\',MESSAGE=\'treasure-vault test guard\'; END $$;\nROLLBACK;',true),raw);
  assert.match(raw.stderr,/ERROR:\s+P0001: treasure-vault test guard/);assert.equal(raw.status,3);assert.equal(raw.signal,null);
  for(const status of [1,2]){
    const value=result({status,stdout:'untouched-output\n',stderr:'fatal-or-connection-error'}),n=model({psql:value,noRemoteExecution:true});
    assert.throws(()=>n.sql('SELECT 1;',true),error=>{
      assert.match(error.message,/Only actual psql success/);assert.equal(error.rawTransportResult,value);
      assert.equal(Object.keys(error).includes('rawTransportResult'),false,'Raw SQL output is not serialized in evidence');return true;
    });
    assert.equal(n.records[0].raw_grouped_status,status);assert.equal(n.records[0].raw_sql_status,undefined);
    assert.equal(n.records[0].temporary_files_cleaned,false);assert.equal(n.events.length,3,'No retry after grouped invocation');
    assert.equal(n.files.size,1,'Daemon-before-exec cannot prove that the remote trap ran');
    assert.equal(n.records[0].copied_bytes_verified,false);assert.equal(n.records[0].post_group_ownership_verified,false);
    assert.equal(value.status===3&&/ERROR:\s+P0001: treasure-vault test guard/.test(value.stderr),false,'Non-script exit cannot satisfy existing guard');
  }
  for(const status of [90,91,92,137]){
    const raw=result({status,stdout:'prior-output\n',stderr}),m=model({psql:raw,noRemoteExecution:status!==90});
    assert.throws(()=>m.sql('SELECT 1;',true),error=>error.rawTransportResult===raw);
    assert.equal(m.records[0].passed,false);assert.equal(m.records[0].raw_sql_status,undefined);
    assert.equal(m.records[0].temporary_files_cleaned,status===90,'Only the fixed digest-error path can certify its completed trap');
    assert.equal(m.files.size,status===90?0:1,'The boundary model must retain an actually unknown remote file');
    assert.equal(m.events.length,3);assert.ok(m.localFiles.every(path=>!existsSync(path)));
  }
  const denied=model({psql:raw});assert.throws(()=>denied.sql('SELECT 1;'),/File psql must succeed/);
  assert.equal(denied.records[0].passed,false);assert.equal(denied.records[0].temporary_files_cleaned,true);
});

test('Failed setup or copied-byte verification never runs psql, retries or uses stdin fallback',()=>{
  for(const opts of [{fail:'copy'},{fail:'sha256sum'},{corruptCopy:true}]){
    const m=model(opts);assert.throws(()=>m.sql('SELECT 1;'));
    assert.equal(m.psqlCalls,0);assert.equal(m.events.filter(row=>row.name==='copy').length,1);
    assert.equal(m.events.at(-1).name,opts.fail==='copy'?'grouped-cleanup':'grouped-run');
    assert.equal(m.events.filter(row=>row.name.startsWith('grouped-')).length,1,'Only cleanup before execution or one run, never retry');
    assert.equal(m.records[0].passed,false);assert.equal(m.records[0].temporary_files_cleaned,true);
    assert.ok(m.localFiles.every(path=>!existsSync(path)));
  }
});

test('Transport errors, signals and absent exit codes fail closed with local cleanup and unknown remote cleanup',()=>{
  for(const raw of [result({status:null,error:Object.assign(new Error('timeout'),{code:'ETIMEDOUT'})}),result({status:null,signal:'SIGTERM'}),result({status:null}),result({status:3,error:Object.assign(new Error('EPIPE'),{code:'EPIPE'})}),result({status:3,signal:'SIGTERM'})]){
    const m=model({psql:raw});assert.throws(()=>m.sql('SELECT 1;',true));
    assert.equal(m.psqlCalls,1);assert.equal(m.events.at(-1).name,'grouped-run');assert.equal(m.events.length,3);
    assert.equal(m.records[0].passed,false);assert.equal(m.records[0].temporary_files_cleaned,false,'Ambiguous group completion cannot prove the remote trap');
    assert.ok(m.localFiles.every(path=>!existsSync(path)));
  }
});

test('Replacement identity and cleanup failure cannot qualify even if psql would succeed',()=>{
  const changed=model({replaceIdentityAt:3});assert.throws(()=>changed.sql('SELECT 1;'),/Same positively verified owned container/);
  assert.equal(changed.events.some(row=>row.name==='copy'),false);assert.equal(changed.psqlCalls,0);
  assert.equal(changed.records[0].passed,false);
  const cleanup=model({fail:'rm'});assert.throws(()=>cleanup.sql('SELECT 1;'),/Reserved grouped transport failure/);
  assert.equal(cleanup.events.at(-1).name,'grouped-run');assert.equal(cleanup.events.length,3);
  assert.equal(cleanup.records[0].temporary_files_cleaned,false);assert.equal(cleanup.records[0].passed,false);
  assert.ok(cleanup.localFiles.every(path=>!existsSync(path)));
});

test('Only existing fixture logins and lossless UTF8 are accepted before any command',()=>{
  const admin=model();admin.sql('SELECT current_user;',false,'supabase_admin');
  assert.equal(admin.events.find(row=>row.name==='grouped-run').args[10],'supabase_admin');
  for(const [statement,login] of [['SELECT 1;','unreviewed'],['\ud800','postgres']]){
    const m=model();assert.throws(()=>m.sql(statement,false,login));assert.deepEqual(m.events,[]);assert.deepEqual(m.records,[]);
  }
});

/** These are the actual pure fixture validators, not a cached current-container row. */
function fullOwnedRow() {
  return {Id:id,Name:'/owned-db',Image:'sha256:'+'c'.repeat(64),Config:{Labels:{'wg.native.owner':'owned-model'}},
    HostConfig:{NetworkMode:'none',PortBindings:{},Memory:1073741824,MemorySwap:1073741824,NanoCpus:1000000000},State:{Running:true}};
}
function verifyOwnedRow(row) {
  assertNativeContainerIdentity({row,name:'owned-db',id,owner:'owned-model',imageId:'sha256:'+'c'.repeat(64)});
  assert.equal(row.HostConfig.NetworkMode,'none');assert.deepEqual(row.HostConfig.PortBindings,{});
  assert.equal(row.State.Running,true);assertNativeDatabaseResourceLimits(row);return row.Id;
}

test('A fresh post-group full owned identity and cap witness rejects drift even after clean raw0 or raw3',()=>{
  const mutants=[
    row=>{row.Id='b'.repeat(64);},row=>{row.Name='/replacement';},row=>{row.Image='sha256:'+'d'.repeat(64);},
    row=>{row.Config.Labels['wg.native.owner']='foreign';},row=>{row.HostConfig.NetworkMode='bridge';},
    row=>{row.HostConfig.PortBindings={'5432/tcp':[{HostPort:'5432'}]};},row=>{row.State.Running=false;},
    row=>{row.HostConfig.Memory=2147483648;},row=>{row.HostConfig.MemorySwap=-1;},row=>{row.HostConfig.NanoCpus=0;},
  ];
  for(const status of [0,3])for(const mutate of mutants){
    const row=fullOwnedRow(),m=model({psql:result({status}),ownerRead:()=>verifyOwnedRow(row),
      afterAction:name=>{if(name==='grouped-run')mutate(row);}});
    assert.throws(()=>m.sql('SELECT 1;',true),{name:'AssertionError'});
    assert.equal(m.events.length,3,'No execution or cleanup retry after dispatch');
    assert.equal(m.records[0].raw_grouped_status,status);assert.equal(m.records[0].passed,false);
    assert.equal(m.records[0].post_group_ownership_verified,false);
  }
  const good=model({ownerRead:()=>verifyOwnedRow(fullOwnedRow())});good.sql('SELECT 1;');
  assert.equal(good.ownershipReads,5,'Initial binding, three action gates and one fresh closure');
  assert.equal(good.records[0].post_group_ownership_verified,true);
});

test('Cooperative stop distinguishes pre-dispatch cleanup-only from completed group and preserves late-stop veto',async()=>{
  for(const signal of ['SIGINT','SIGTERM']){
    const signals=new EventEmitter(),receipt={passed:true,full_native_execution_complete:true};
    const stop=createNativeStopController({receipt,signals});
    try{
      const m=model({ownerRead:(_read,depth)=>{if(!depth)stop.throwIfRequested('model action');return id;},
        afterAction:name=>{if(name==='copy')signals.emit(signal);}});
      assert.throws(()=>m.sql('SELECT 1;',true),error=>error.code==='ERR_NATIVE_STOP');
      assert.deepEqual(m.events.map(row=>row.name),['mktemp','copy','grouped-cleanup']);
      assert.equal(m.events.at(-1).cleanup,true);assert.equal(m.psqlCalls,0);
      assert.equal(m.files.size,0);assert.equal(m.records[0].temporary_files_cleaned,true);
      assert.equal(m.records[0].group_dispatch_attempted,false);
      assert.equal(await finalizeNativeStopReceipt({receipt,stop}),signal==='SIGINT'?130:143);
      assert.equal(receipt.passed,false);assert.equal(receipt.full_native_execution_complete,false);
    }finally{stop.close();}
    const afterSignals=new EventEmitter(),afterReceipt={passed:true,full_native_execution_complete:true};
    const afterStop=createNativeStopController({receipt:afterReceipt,signals:afterSignals});
    try{
      const raw=result({status:3,stdout:'prior-output\n',stderr:'ERROR: P0001: exact original guard\n'});
      const m=model({psql:raw,ownerRead:(_read,depth)=>{if(!depth)afterStop.throwIfRequested('model action');return id;},
        afterAction:name=>{if(name==='grouped-run')afterSignals.emit(signal);}});
      assert.equal(m.sql('SELECT 1;',true),raw,'Byte transport can complete before the next asynchronous stop checkpoint');
      assert.equal(m.records[0].post_group_ownership_verified,true);assert.equal(m.files.size,0);
      assert.deepEqual(m.events.map(row=>row.name),['mktemp','copy','grouped-run']);
      await assert.rejects(()=>afterStop.checkpoint('after model group'),error=>error.code==='ERR_NATIVE_STOP');
      assert.equal(await finalizeNativeStopReceipt({receipt:afterReceipt,stop:afterStop}),signal==='SIGINT'?130:143);
      assert.equal(afterReceipt.passed,false);
    }finally{afterStop.close();}
  }
  const signalSource=new EventEmitter(),receipt={passed:false},stop=createNativeStopController({receipt,signals:signalSource});
  try{
    const m=model({fail:'copy',cleanupResult:result({status:91,stderr:'Native file transport cleanup failed\n'}),
      ownerRead:(_read,depth)=>{if(!depth)stop.throwIfRequested('model action');return id;},
      afterAction:name=>{if(name==='copy')signalSource.emit('SIGTERM');}});
    assert.throws(()=>m.sql('SELECT 1;',true),error=>{
      assert.ok(error instanceof AggregateError);assert.match(error.errors[0].message,/copy-exact-local-file: Model copy failure/);return true;
    });
    assert.equal(m.records[0].temporary_files_cleaned,false);assert.equal(m.records[0].passed,false);assert.equal(m.psqlCalls,0);
  }finally{stop.close();}
});

test('Thrown adapter errors retain the originating failure, exact local cleanup and unknown dispatched remote state',()=>{
  const cases=[
    {at:'mktemp',cleaned:false,unknownAllocation:true,dispatched:false},
    {at:'copy',cleaned:true,unknownAllocation:false,dispatched:false},
    {at:'grouped-run',cleaned:false,unknownAllocation:false,dispatched:true},
  ];
  for(const scenario of cases){
    const directoryRoot=realpathSync(tmpdir()),before=new Set(readdirSync(directoryRoot));let localDirectory=null;
    const original=Object.assign(new Error('Originating thrown adapter '+scenario.at),{code:'EPIPE'});
    const m=model({commandResult:name=>{
      if(name===scenario.at){
        const allocated=readdirSync(directoryRoot).filter(value=>value.startsWith('wg-tv-native-sql-')&&!before.has(value));
        assert.equal(allocated.length,1,'Observe the new private directory allocated by this call');
        localDirectory=join(directoryRoot,allocated[0]);assert.equal(existsSync(join(localDirectory,'statement.sql')),true);
        throw original;
      }
      return null;
    }});
    let caught;try{m.sql('SELECT 1;',true);}catch(error){caught=error;}
    assert.equal(caught,original,'No normalization or replacement of the thrown transport failure');
    assert.equal(existsSync(localDirectory),false,'Local regular file and directory are cleaned after a throw');
    const evidence=m.records[0];assert.equal(evidence.passed,false);
    assert.equal(evidence.temporary_files_cleaned,scenario.cleaned);
    assert.equal(evidence.possible_unknown_remote_allocation,scenario.unknownAllocation);
    assert.equal(evidence.group_dispatch_attempted,scenario.dispatched);
    assert.equal(evidence.remote_cleanup_completed,scenario.cleaned);
    assert.equal(evidence.raw_sql_status,undefined,'A thrown adapter cannot invent a native exit status');
    assert.equal(m.events.filter(row=>row.name==='grouped-run').length,scenario.dispatched?1:0);
    assert.equal(m.events.filter(row=>row.name==='grouped-cleanup').length,scenario.at==='copy'?1:0);
    if(scenario.dispatched)assert.equal(m.files.size,1,'Remote execution and trap completion remain unknown; exact-owned fixture disposal is required');
  }
  for(const cleanupFailure of [
    {throws:true}, {raw:result({status:91,stderr:'Native file transport cleanup failed\n'})},
  ]){
    const original=new Error('Originating thrown copy'),secondary=new Error('Thrown cleanup adapter');
    const m=model({commandResult:name=>{
      if(name==='copy')throw original;
      if(name==='grouped-cleanup'){
        if(cleanupFailure.throws)throw secondary;
        return cleanupFailure.raw;
      }
      return null;
    }});
    let caught;try{m.sql('SELECT 1;',true);}catch(error){caught=error;}
    assert.ok(caught instanceof AggregateError);assert.equal(caught.errors[0],original);
    assert.equal(caught.errors.length,2);
    if(cleanupFailure.throws)assert.equal(caught.errors[1],secondary);
    else assert.match(caught.errors[1].message,/cleanup-known-unexecuted-file/);
    assert.equal(m.records[0].passed,false);assert.equal(m.records[0].temporary_files_cleaned,false);
    assert.equal(m.records[0].remote_cleanup_completed,false);
    assert.equal(m.events.filter(row=>row.name==='grouped-cleanup').length,1);
    assert.equal(m.events.filter(row=>row.name==='grouped-run').length,0);
    assert.ok(m.localFiles.every(path=>!existsSync(path)));
  }
});
