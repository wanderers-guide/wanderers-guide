import assert from 'node:assert/strict';
import test from 'node:test';
import {EventEmitter} from 'node:events';
import {PassThrough,Writable} from 'node:stream';
import {readNativeGoTrueVersionStderr,assertNativeGoTrueRuntimeWitness,assertLocalNativeDocker,assertNativeContainerIdentity,readNativeDockerCensus,assertNativeCleanupCensus,buildNativeSequenceSnapshotQuery,buildNativeSnapshotMembershipQuery,buildNativeSnapshotValuesQuery,normalizeNativeSnapshotValues,buildNativeContentStateQuery,readNativeContentStateRows,nativeDatabaseResourceLimits,assertNativeDatabaseResourceLimits,createOwnedNativeFixture} from './treasure-vault-native-fixture.mjs';
import {createOwnedNativeSessions} from './treasure-vault-native-sessions.mjs';
import {assertNativeRestoration,createNativePhaseRunner} from './treasure-vault-native-phases.mjs';
import {metadataAuthorityInspectionSql,assertMetadataAuthorityResult,assertMetadataRejectionSetup} from './treasure-vault-native-metadata.mjs';
import {nativeStrictReleaseEdges} from './treasure-vault-native-negatives.mjs';
import {disposeNativeOwnedContainer} from './treasure-vault-native-fixture.mjs';

/** External log/removal boundary models only; no container or PostgreSQL starts. */
function cleanupLogModel({database=true,raw,write=()=>{},redact=value=>String(value).split('\n').map(line=>line.slice(0,1000)).join('\n').slice(-12000),metadataError=false}={}) {
  const name='owned-diagnostic-'+(database?'db':'auth'),id='d'.repeat(64);
  const row={Id:id,Name:'/'+name,State:{Running:true,OOMKilled:false},Mounts:[{Type:'volume',Name:'owned-anonymous-volume'}],HostConfig:nativeDatabaseResourceLimits()};
  if(metadataError)Object.defineProperty(row,'Mounts',{get(){throw new Error('Owned metadata capture failed');}});
  const receipt={failure:{phase:'preserved-primary',message:'Original failure'},owned_database_resources:{last_observed:nativeDatabaseResourceLimits(),final_verified:false}};
  const records=[],events=[],errors=[],removedVolumes=new Set();
  const docker=(args,input,allowFailure,recordOutput)=>{
    events.push([...args]);assert.equal(input,undefined);
    if(args[0]==='logs'){
      assert.equal(allowFailure,true);
      if(typeof raw==='function')return raw(args);
      return raw??{status:0,signal:null,error:null,stdout:'2026-10-05T00:00:00Z owned log\n',stderr:''};
    }
    if(args[0]==='rm'){assert.deepEqual(args,['rm','-f','-v',name]);return {status:0,signal:null,error:null,stdout:'',stderr:''};}
    assert.deepEqual(args,['ps','-a','--format','{{.Names}}']);return {status:0,signal:null,error:null,stdout:'unrelated-container\n',stderr:''};
  };
  return {row,name,id,receipt,records,events,errors,removedVolumes,run:()=>disposeNativeOwnedContainer({name,row,database,docker,log:async record=>{await write(record);records.push(record);},redact,receipt,removedVolumes,errors})};
}

test('pure owned state receipts redact diagnostic strings without changing source state or status metadata',async()=>{
  const secret='fake-owned-state-credential';
  const original={Status:'exited',Running:false,Paused:false,Restarting:false,OOMKilled:true,Dead:false,Pid:0,ExitCode:137,
    Error:'daemon detail '+secret,StartedAt:'2026-10-05T00:00:00Z',FinishedAt:'2026-10-05T00:00:01Z',
    Health:{Status:'unhealthy',FailingStreak:2,Log:[{Start:'2026-10-05T00:00:00Z',End:'2026-10-05T00:00:01Z',ExitCode:1,Output:'health detail '+secret}]}};
  const expected=structuredClone(original);expected.Error='daemon detail [owned-fixture-secret]';expected.Health.Log[0].Output='health detail [owned-fixture-secret]';
  for(const database of [true,false]){
    const model=cleanupLogModel({database,redact:value=>String(value).replaceAll(secret,'[owned-fixture-secret]')});
    const state=structuredClone(original),failure=model.receipt.failure;model.row.State=state;
    await model.run();
    const recorded=model.receipt.final_owned_states[0];
    assert.equal(recorded.name,model.name);assert.deepEqual(recorded.state,expected);
    assert.equal(JSON.stringify(recorded.state).includes(secret),false);
    assert.notEqual(recorded.state,state);assert.deepEqual(model.row.State,original);assert.equal(model.row.State,state);
    assert.deepEqual({ExitCode:recorded.state.ExitCode,OOMKilled:recorded.state.OOMKilled,Running:recorded.state.Running,Pid:recorded.state.Pid,healthExitCode:recorded.state.Health.Log[0].ExitCode},
      {ExitCode:137,OOMKilled:true,Running:false,Pid:0,healthExitCode:1});
    assert.equal(model.receipt.failure,failure);assert.equal(model.errors.length,0);
    assert.deepEqual(model.events.slice(-2),[['rm','-f','-v',model.name],['ps','-a','--format','{{.Names}}']]);
    assert.deepEqual([...model.removedVolumes],['owned-anonymous-volume']);
  }
});

test('pure owned diagnostic receipts omit arbitrary error names even if the secret redactor fails',async()=>{
  const secret='fake-owned-diagnostic-credential',error=Object.assign(new Error('detail '+secret),{name:'name '+secret,code:'unknown '+secret});
  for(const redactorFails of [false,true]) {
    const model=cleanupLogModel({write:()=>{throw error;},redact:text=>{
      if(redactorFails)throw error;return String(text).replaceAll(secret,'[owned-fixture-secret]');
    }});
    await model.run();
    assert.deepEqual(model.receipt.owned_container_diagnostic_errors,[{
      name:model.name,container_id:model.id,kind:'logs',name_of_error:'Error',
      message:redactorFails?'Owned diagnostic failed; its message could not be safely redacted':'detail [owned-fixture-secret]',
    }]);
    assert.equal(JSON.stringify(model.receipt).includes(secret),false);
    assert.deepEqual(model.events.slice(-2),[['rm','-f','-v',model.name],['ps','-a','--format','{{.Names}}']]);
    assert.equal(error.name,'name '+secret);assert.equal(error.message,'detail '+secret);
  }
});

test('pure owned PostgreSQL cleanup retains the first failure beyond80 records and12000 characters',async()=>{
  const lines=['2026-10-05T00:00:00Z ERROR: first-preserved-PG-failure',...Array.from({length:200},(_,i)=>'2026-10-05T00:00:01Z ordinary-'+i+' '+'.'.repeat(150))];
  const model=cleanupLogModel({raw:args=>({status:0,signal:null,error:null,stdout:lines.slice(-Number(args[args.indexOf('--tail')+1])).join('\n')+'\n',stderr:''})});
  await model.run();
  assert.ok(model.records[0].text.includes('first-preserved-PG-failure'),'The first observed error must survive the bounded timestamped PostgreSQL tail');
  assert.ok(model.records[0].text.length>12000,'Do not apply the whole-output12000-character tail');
  assert.deepEqual(model.events[0],['logs','--timestamps','--tail','1000',model.id]);
  assert.equal(model.errors.length,0);assert.deepEqual(model.receipt.failure,{phase:'preserved-primary',message:'Original failure'});
  assert.deepEqual([...model.removedVolumes],['owned-anonymous-volume']);
});

test('pure owned log failures stay failures while exact retained disposal and census still run',async()=>{
  const raw={status:0,signal:null,error:null,stdout:'owned PostgreSQL detail\n',stderr:''};
  const mutations=[{status:1},{status:2},{error:new Error('Owned log EPIPE')},{signal:'SIGTERM'},
    {status:null},{stdout:null},{stderr:null}];
  for(const mutation of mutations){
    const model=cleanupLogModel({raw:{...raw,...mutation}});
    await model.run();
    assert.equal(model.errors.length,1,'Bad diagnostic transport is retained as a cleanup failure');
    assert.equal(model.receipt.owned_container_diagnostic_errors.length,1);
    assert.equal(model.receipt.owned_container_diagnostic_errors[0].kind,'logs');
    assert.deepEqual(model.events.slice(-2),[['rm','-f','-v',model.name],['ps','-a','--format','{{.Names}}']]);
    assert.deepEqual([...model.removedVolumes],['owned-anonymous-volume']);
    assert.deepEqual(model.receipt.failure,{phase:'preserved-primary',message:'Original failure'});
    assert.equal(model.receipt.cleaned_only_owned_containers_and_volumes,undefined,'A diagnostic error cannot claim cleanup certification');
  }
  for(const options of [
    {raw:()=>{throw new Error('Thrown owned-log adapter');}},
    {write:()=>{throw new Error('Owned log synchronous write failure');}},
    {write:async()=>{throw new Error('Owned log asynchronous write failure');}},
    {redact:()=>{throw new Error('Owned log redaction failure');}},
    {metadataError:true},
  ]){
    const model=cleanupLogModel(options);await model.run();
    assert.equal(model.errors.length,1);assert.equal(model.receipt.owned_container_diagnostic_errors.length,1);
    assert.deepEqual(model.events.slice(-2),[['rm','-f','-v',model.name],['ps','-a','--format','{{.Names}}']]);
    assert.deepEqual(model.receipt.failure,{phase:'preserved-primary',message:'Original failure'});
  }
});

test('pure owned PostgreSQL logs redact each bounded line while Auth keeps its existing80-record policy',async()=>{
  const secret='known-owned-fixture-secret',calls=[];
  const redact=value=>{calls.push(value);return String(value).replaceAll(secret,'[owned-fixture-secret]').split('\n').map(line=>line.slice(0,1000)).join('\n').slice(-12000);};
  const pgLines=['2026-10-05T00:00:00Z ERROR: '+secret,'2026-10-05T00:00:01Z '+secret+' '+'.'.repeat(1400)];
  const pg=cleanupLogModel({redact,raw:{status:0,signal:null,error:null,stdout:pgLines.join('\n')+'\n',stderr:'2026-10-05T00:00:02Z '+secret+'\n'}});
  await pg.run();
  assert.deepEqual(calls,[...pgLines,'2026-10-05T00:00:02Z '+secret,''],'The existing redactor receives one PostgreSQL line at a time');
  assert.equal(pg.records[0].text.includes(secret),false);assert.ok(pg.records[0].text.includes('[owned-fixture-secret]'));
  assert.ok(pg.records[0].text.split('\n').every(line=>line.length<=1000));
  assert.match(pg.records[0].scope,/not a full archive or proof of earlier causes/);
  assert.deepEqual({status:pg.records[0].status,signal:pg.records[0].signal,no_transport_error:pg.records[0].no_transport_error},{status:0,signal:null,no_transport_error:true});
  const authLines=Array.from({length:100},(_,i)=>'auth-record-'+i+' '+secret+' '+'.'.repeat(180));
  const authCalls=[],authRedact=value=>{authCalls.push(value);return String(value).replaceAll(secret,'[owned-fixture-secret]').split('\n').map(line=>line.slice(0,1000)).join('\n').slice(-12000);};
  const auth=cleanupLogModel({database:false,redact:authRedact,raw:args=>({status:0,signal:null,error:null,stdout:authLines.slice(-Number(args[args.indexOf('--tail')+1])).join('\n')+'\n',stderr:''})});
  await auth.run();
  assert.deepEqual(auth.events[0],['logs','--tail','80',auth.name]);
  assert.deepEqual(authCalls,[authLines.slice(-80).join('\n')+'\n'],'Auth retains the existing whole-output redactor call');
  assert.equal(auth.records[0].text.length,12000);assert.equal(auth.records[0].text.includes(secret),false);
  assert.equal(auth.records[0].scope,'Existing Auth last80 records and whole-output redaction bound.');
  assert.equal(pg.errors.length,0);assert.equal(auth.errors.length,0);
});

/** SQL-free content boundary models; real PostgreSQL parity and memory need the native run. */
const contentResult=stdout=>({status:0,signal:null,error:null,stdout,stderr:''});
const contentFrame=(table,row)=>JSON.stringify({table,row})+'\n';
const contentKeyOrder=['item','class','spell','trait','ancestry','creature','language','archetype','background','ability_block','class_archetype','versatile_heritage'];

/** Configuration models only; actual limit enforcement and memory use require native execution. */
test('pure new-database resource policy is fixed per fixture without starting services',()=>{
  const expected={Memory:1073741824,MemorySwap:1073741824,NanoCpus:1000000000};
  assert.deepEqual(nativeDatabaseResourceLimits(),expected);
  const changed=nativeDatabaseResourceLimits();changed.Memory=0;assert.deepEqual(nativeDatabaseResourceLimits(),expected);
  const receipts=[{},{}];
  for(const receipt of receipts) {
    createOwnedNativeFixture({root:'/unused-model-root',receipt,log:()=>assert.fail('No constructor commands'),bootstrapRead:()=>assert.fail('No constructor SQL reads')});
    assert.deepEqual(receipt.owned_database_resources.requested,expected);
    assert.equal(receipt.owned_database_resources.per_container_only,true);
    assert.equal(receipt.owned_database_resources.total_host_guarantee,false);
    assert.equal(receipt.owned_database_resources.fresh_verified_inspections,0);
    assert.equal(receipt.owned_database_resources.initial_observed,null);
    assert.equal(receipt.owned_database_resources.final_verified,false);
  }
  receipts[0].owned_database_resources.requested.Memory=0;assert.equal(receipts[1].owned_database_resources.requested.Memory,1073741824);
});

test('pure resource readback rejects missing, changed, unbounded or wrongly typed limits',()=>{
  const expected={Memory:1073741824,MemorySwap:1073741824,NanoCpus:1000000000};
  const row={HostConfig:{...expected,NetworkMode:'none',PortBindings:{}}};
  assert.deepEqual(assertNativeDatabaseResourceLimits(row),expected);
  const mutants=[null,{}, {HostConfig:null},{HostConfig:[]},...Object.keys(expected).flatMap(field=>[0,-1,expected[field]*2,expected[field]/2,String(expected[field]),undefined].map(value=>({HostConfig:{...expected,[field]:value}})))];
  for(const mutant of mutants)assert.throws(()=>assertNativeDatabaseResourceLimits(mutant));
  row.HostConfig.NanoCpus=2000000000;assert.throws(()=>assertNativeDatabaseResourceLimits(row));
});

test('pure correct limits cannot authenticate a substituted container, image or owner',()=>{
  const binding={name:'owned-model-db',id:'a'.repeat(64),owner:'actual-model-owner',imageId:'sha256:'+'b'.repeat(64)};
  const row={Name:'/'+binding.name,Id:binding.id,Image:binding.imageId,Config:{Labels:{'wg.native.owner':binding.owner}},HostConfig:nativeDatabaseResourceLimits()};
  const verify=value=>{assertNativeContainerIdentity({row:value,...binding});return assertNativeDatabaseResourceLimits(value);};
  assert.deepEqual(verify(row),nativeDatabaseResourceLimits());
  for(const mutant of [{...row,Id:'c'.repeat(64)},{...row,Image:'sha256:'+'c'.repeat(64)},{...row,Name:'/other'},{...row,Config:{Labels:{'wg.native.owner':'other'}}}])assert.throws(()=>verify(mutant));
});

test('pure content query keeps all twelve full-row domains in one statement',()=>{
  const tables=['ability_block','ancestry','archetype','background','class','class_archetype','creature','item','language','spell','trait','versatile_heritage'];
  const branches=tables.map(table=>`select jsonb_build_object('table','${table}','row',to_jsonb(r))::text from (select * from public."${table}" order by id) r`);
  assert.equal(buildNativeContentStateQuery(),branches.join(' union all ')+';');
});

test('pure content rows preserve complete typed fields and original table and identity order',()=>{
  const first={id:-1,uuid:6116429865927994,created_at:'2026-10-05T00:00:00+00:00',updated_at:null,name:'é雪',description:'one\ntwo\rthree\t"\\four',operations:[{data:{nested:[true,false,null,{id:5}]}}],meta_data:{uuid:'00017',missing:[],level:0}};
  const zero={id:0,uuid:'944653220160268',unknown_field:{exact:'untouched'}};
  const ability={id:3,type:'feat',operations:null};
  const actual=readNativeContentStateRows(contentResult(contentFrame('item',zero)+contentFrame('ability_block',ability)+contentFrame('item',first)));
  assert.deepEqual(actual.item,[first,zero]);assert.deepEqual(actual.ability_block,[ability]);
  assert.deepEqual(Object.keys(actual),contentKeyOrder);
  for(const table of contentKeyOrder.filter(table=>!['item','ability_block'].includes(table)))assert.deepEqual(actual[table],[]);
  assert.equal(typeof actual.item[0].uuid,'number');assert.equal(typeof actual.item[1].uuid,'string');
});

test('pure content reads retain empty domains and never return cached mutable state',()=>{
  const empty=readNativeContentStateRows(contentResult(''));
  assert.deepEqual(Object.keys(empty),contentKeyOrder);
  for(const table of contentKeyOrder)assert.deepEqual(empty[table],[]);
  const frame=contentFrame('item',{id:1,meta_data:{nested:[1]}});
  const first=readNativeContentStateRows(contentResult(frame));first.item[0].meta_data.nested.push(2);first.trait.push({id:5});
  const second=readNativeContentStateRows(contentResult(frame));assert.deepEqual(second.item,[{id:1,meta_data:{nested:[1]}}]);assert.deepEqual(second.trait,[]);
});

test('pure content rejects duplicate identities, malformed frames and extra diagnostics',()=>{
  const mutants=[contentFrame('item',{id:1})+contentFrame('item',{id:1}),contentFrame('item',{id:1.5}),contentFrame('item',{id:Number.MAX_SAFE_INTEGER+1}),contentFrame('item',{id:'1'}),contentFrame('content_source',{id:1}),contentFrame('item',null),contentFrame('item',[]),'null\n','[]\n','true\n','not json\n','{\n',JSON.stringify({table:'item',row:{id:1},extra:true})+'\n',JSON.stringify({table:'item'})+'\n','\n',contentFrame('item',{id:1})+'\n','diagnostic\n'+contentFrame('item',{id:1})];
  for(const stdout of mutants)assert.throws(()=>readNativeContentStateRows(contentResult(stdout)));
  assert.deepEqual(readNativeContentStateRows(contentResult(contentFrame('item',{id:1})+contentFrame('spell',{id:1}))).spell,[{id:1}]);
});

test('pure content refuses failed transports even when stdout contains valid rows',()=>{
  const baseline=contentResult(contentFrame('item',{id:1}));
  for(const change of [{status:1},{status:2},{status:3},{status:null},{signal:'SIGKILL'},{error:Object.assign(new Error('EPIPE'),{code:'EPIPE'})},{stdout:null}])assert.throws(()=>readNativeContentStateRows({...baseline,...change}));
});

test('pure row frames preserve the previous parsed complete-content shape exactly',()=>{
  const former={item:[{id:12,name:'B',updated_at:'kept',uuid:7},{id:13,name:'C',operations:[{data:{value:1}}]}],class:[{id:21,name:'Wizard'}],spell:[{id:5,rank:0}],trait:[{id:1,type:'UNIQUE'}],ancestry:[{id:8}],creature:[{id:17,hp:10}],language:[{id:90,name:'Fey'}],archetype:[{id:110,dedication_feat_id:51105}],background:[],ability_block:[{id:51105,type:'feat'}],class_archetype:[],versatile_heritage:[]};
  const wire=contentFrame('class',former.class[0])+contentFrame('item',former.item[1])+contentFrame('ancestry',former.ancestry[0])+contentFrame('spell',former.spell[0])+contentFrame('item',former.item[0])+contentFrame('trait',former.trait[0])+contentFrame('creature',former.creature[0])+contentFrame('language',former.language[0])+contentFrame('archetype',former.archetype[0])+contentFrame('ability_block',former.ability_block[0]);
  const actual=readNativeContentStateRows(contentResult(wire));assert.deepEqual(actual,former);assert.equal(JSON.stringify(actual),JSON.stringify(former));
});

/** These models exercise transport contracts only, never emulate a native SQL pass. */
test('pure local ownership and successful absence census reject substitutions/transport failures',()=>{
  const info={OSType:'linux',ServerVersion:'29.4.1',Architecture:'arm64'};
  assert.equal(assertLocalNativeDocker({environment:{},context:'desktop-linux',endpoint:'unix:///owned/docker.sock',info}).local_unix_verified,true);
  for(const mutate of [row=>{row.environment.DOCKER_HOST='tcp://remote';},row=>{row.endpoint='tcp://remote';},row=>{row.info.OSType='windows';}]) {
    const row={environment:{},context:'default',endpoint:'unix:///owned/docker.sock',info:{...info}};mutate(row);assert.throws(()=>assertLocalNativeDocker(row));
  }
  const expected={name:'owned-db',id:'a'.repeat(64),owner:'unit-owner',imageId:'sha256:'+'b'.repeat(64)};
  const row={Name:'/owned-db',Id:expected.id,Image:expected.imageId,Config:{Labels:{'wg.native.owner':'unit-owner'}}};
  assertNativeContainerIdentity({row,...expected});
  for(const mutant of [{...row,Id:'c'.repeat(64)},{...row,Image:'sha256:'+'c'.repeat(64)},{...row,Config:{Labels:{'wg.native.owner':'other'}}}])assert.throws(()=>assertNativeContainerIdentity({row:mutant,...expected}));
  assert.deepEqual(readNativeDockerCensus({status:0,signal:null,stdout:'',error:null}),[]);
  assert.deepEqual(readNativeDockerCensus({status:0,signal:null,stdout:'owned-db\nowned-auth\n'}),['owned-db','owned-auth']);
  for(const result of [{status:1,signal:null,stdout:''},{status:0,signal:'SIGTERM',stdout:''},{status:0,signal:null,stdout:'',error:new Error('denied')},{status:0,signal:null,stdout:'same\nsame\n'}])assert.throws(()=>readNativeDockerCensus(result));
  assertNativeCleanupCensus({ownedContainerNames:[],removedVolumes:['removed'],currentVolumeNames:['unrelated']});
  assert.throws(()=>assertNativeCleanupCensus({ownedContainerNames:['owned-db'],removedVolumes:[],currentVolumeNames:[]}));
  assert.throws(()=>assertNativeCleanupCensus({ownedContainerNames:[],removedVolumes:['removed'],currentVolumeNames:['removed']}));
});

test('pure batched snapshot preserves exact SQL, membership, typed values and original field ordering',()=>{
  const relations=[{schema:'auth',table:'users'},{schema:'public',table:'character'},{schema:'public',table:'item'}];
  const sequenceNames=[{schema:'public',name:'character_id_seq'},{schema:'public',name:'item_id_seq'}];
  const values={tuples:{'public.item':'27467:'+'a'.repeat(32),'auth.users':'1:'+'b'.repeat(32),'public.character':'1:'+'c'.repeat(32)},sequences:{'public.item_id_seq':{last_value:'23440',is_called:true,increment:'1',cache:'1',cycle:false},'public.character_id_seq':{last_value:'7',is_called:false,increment:'-2',cache:'1',cycle:false}}};
  const parsed=normalizeNativeSnapshotValues({relations,sequenceNames,values});
  assert.deepEqual(parsed,{tuples:values.tuples,sequences:Object.fromEntries(sequenceNames.map(row=>[row.schema+'.'+row.name,values.sequences[row.schema+'.'+row.name]]))});
  assert.deepEqual(Object.keys(parsed.sequences),sequenceNames.map(row=>row.schema+'.'+row.name));
  const oldBranches=relations.map(row=>`select '${row.schema+'.'+row.table}' name,count(*)||':'||md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'')) value from "${row.schema}"."${row.table}" r`);
  const oldTuples='select jsonb_object_agg(name,value order by name) from ('+oldBranches.join(' union all ')+') s';
  const batched=buildNativeSnapshotValuesQuery({relations,sequenceNames});
  assert.ok(batched.includes(oldTuples),'Complete original row-digest SQL preserved byte-for-byte');
  assert.ok(batched.includes(buildNativeSequenceSnapshotQuery(sequenceNames).slice(0,-1)),'Complete original typed sequence SQL preserved byte-for-byte');
  const membership=buildNativeSnapshotMembershipQuery();
  for(const original of ["select coalesce(jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename) order by schemaname,tablename),'[]'::jsonb) from pg_tables where schemaname in('public','auth','proof')","select coalesce(jsonb_agg(jsonb_build_object('schema',schemaname,'name',sequencename) order by schemaname,sequencename),'[]'::jsonb) from pg_sequences where schemaname in('public','auth','proof')","jsonb_build_object('roles',(select jsonb_agg(to_jsonb(r) order by rolname) from pg_roles r),'members',(select coalesce(jsonb_agg(to_jsonb(m) order by roleid,member,grantor),'[]'::jsonb) from pg_auth_members m))"])assert.ok(membership.includes(original));
  assert.deepEqual(normalizeNativeSnapshotValues({relations:[],sequenceNames:[],values:{tuples:{},sequences:{}}}),{tuples:{},sequences:{}});
  for(const mutate of [row=>{delete row.values.tuples['auth.users'];},row=>{row.values.tuples.extra='0:'+'0'.repeat(32);},row=>{delete row.values.sequences['public.item_id_seq'];},row=>{row.values.sequences.extra={};},row=>{row.values.sequences['public.item_id_seq'].last_value=23440;},row=>{row.values.sequences['public.item_id_seq'].is_called='true';},row=>{row.values.sequences['public.item_id_seq'].extra=true;}]) {
    const row=structuredClone({relations,sequenceNames,values});mutate(row);assert.throws(()=>normalizeNativeSnapshotValues(row));
  }
  for(const row of [{relations:[relations[0],relations[0]],sequenceNames},{relations:[{schema:'public',table:'item;drop'}],sequenceNames},{relations,sequenceNames:[sequenceNames[0],sequenceNames[0]]},{relations,sequenceNames:[{schema:'private',name:'item_id_seq'}]}])assert.throws(()=>buildNativeSnapshotValuesQuery(row));
});

test('pure restoration models distinguish expected nontransactional nextvals from unreviewed drift',()=>{
  const before={tuples:{item:'1:hash'},schema_sha256:'schema',roles_sha256:'roles',sequences:{'public.item_id_seq':{last_value:'9',is_called:false,increment:'2',cache:'1',cycle:false},'public.other':{last_value:'7',is_called:true,increment:'1',cache:'1',cycle:false}}};
  const after=structuredClone(before);after.sequences['public.item_id_seq']={...before.sequences['public.item_id_seq'],last_value:'15',is_called:true};
  assert.equal(assertNativeRestoration({before,after,expectedCalls:{item:4},sequenceForTable:()=> 'public.item_id_seq'})[0].calls,4);
  assert.throws(()=>assertNativeRestoration({before,after,sequenceForTable:()=> 'public.item_id_seq'}));
  for(const change of [row=>{row.tuples.item='changed';},row=>{row.schema_sha256='changed';},row=>{row.roles_sha256='changed';},row=>{row.sequences['public.other'].last_value='8';}]) {
    const wrong=structuredClone(after);change(wrong);assert.throws(()=>assertNativeRestoration({before,after:wrong,expectedCalls:{item:4},sequenceForTable:()=> 'public.item_id_seq'}));
  }
});

/** In-memory stream model; no process, PostgreSQL, account or owned fixture starts. */
function sessionModel() {
  const receipt={},child=new EventEmitter(),events=[],cleanupReads=[];
  child.stdout=new PassThrough();child.stderr=new PassThrough();let exited=false;
  function finish(){if(exited)return;exited=true;queueMicrotask(()=>child.emit('close',0,null));}
  child.kill=()=>{events.push('kill-owned-client');finish();return true;};
  child.stdin=new Writable({write(chunk,_encoding,done){
    const text=String(chunk);events.push(text);
    const marker=text.match(/\\echo ([a-zA-Z0-9_]+)/)?.[1];
    if(text.includes('select jsonb_build_object')) {
      const name=text.match(/set application_name='([^']+)'/)?.[1];
      child.stdout.write(JSON.stringify({pid:2345,application_name:name})+'\n'+marker+'\n');
    } else if(marker)child.stdout.write(marker+'\n');
    if(text.includes('\\q'))finish();done();
  }});
  let stopped=false;
  const assertOwned=()=>{if(stopped)throw new Error('Requested stop');};
  const sessions=createOwnedNativeSessions({assertOwned,spawnPsql:()=>child,queryJson:()=>false,cleanupAssertOwned:()=>cleanupReads.push('owned-identity'),cleanupQueryJson:sql=>{cleanupReads.push(sql);return false;},redact:String,throwIfRequested:assertOwned,receipt});
  return {sessions,receipt,child,events,cleanupReads,stop:()=>{stopped=true;}};
}

test('pure session cleanup is serialized and allowed after stop without accepting later transport success',async()=>{
  const model=sessionModel(),session=await model.sessions.openSession({label:'pure-model'});
  model.stop();await Promise.all([session.close({rollback:true}),session.close({rollback:true})]);
  assert.equal(model.events.filter(text=>text.startsWith('rollback;')).length,1);
  assert.equal(model.receipt.owned_sessions[0].backend_gone,true);assert.equal(model.cleanupReads.length>0,true);
  await model.sessions.closeAll();
  const broken=sessionModel(),client=await broken.sessions.openSession({label:'late-idle-error-model'});
  broken.child.emit('error',Object.assign(new Error('EPIPE model'),{code:'EPIPE'}));
  await assert.rejects(()=>client.run('select 1;'),/failed\/deadline-aborted transport/);
  assert.equal(broken.events.filter(text=>text.startsWith('select 1;')).length,0);
  await client.close({rollback:true});await broken.sessions.closeAll();
});

test('pure phase transport requires raw script exit3 and keeps mandatory controls under focused CLI',async()=>{
  const baseline={tuples:{item:'0:'+'0'.repeat(32)},sequences:{},schema_sha256:'schema',roles_sha256:'roles'};
  const batch={path:'20261002100000_treasure_vault_complete_catalog.sql',sql:'exact-original',releaseSql:"select 'check' id,false passed;"};
  const recipe={name:'modeled-mandatory',phase:'modeled',batch,prepare:()=>({batch,setup:'typed-setup;',expectedSqlState:'P0001',match:/intended guard/,includeRelease:false,assertions:[],reservations:[],sequence_expectation:{expected_nextval_calls:{}}})};
  function fixtureFor(errorResult) {let calls=0;return {snapshot:()=>structuredClone(baseline),queryJson:()=>null,sql:()=>++calls===1?{status:0,signal:null,stdout:'native_setup_ok\n',stderr:''}:errorResult};}
  const proper={status:3,signal:null,stdout:'',stderr:'ERROR:  P0001: intended guard'};
  for(const mutant of [{...proper,status:1},{...proper,status:2},{...proper,signal:'SIGTERM'},{...proper,error:new Error('EPIPE')},{...proper,stderr:'ERROR:  23502: wrong setup'}]) {
    const phases=createNativePhaseRunner({fixture:fixtureFor(mutant),receipt:{},stage:async()=>{}});
    await assert.rejects(()=>phases.negatives({cases:[recipe]}));
  }
  const receipt={},phases=createNativePhaseRunner({fixture:fixtureFor(proper),receipt,stage:async()=>{},selectedNegativeFiles:new Set(['other.sql'])});
  await phases.negatives({cases:[recipe]});assert.equal(receipt.negative_controls,undefined);
  await phases.negatives({cases:[recipe]},{mandatory:true});assert.equal(receipt.negative_controls.length,1);
  assert.deepEqual([receipt.negative_controls[0].actual_exit_status,receipt.negative_controls[0].actual_signal,receipt.negative_controls[0].mandatory_scope],[3,null,true]);
  assert.ok(Number.isSafeInteger(receipt.negative_controls[0].elapsed_ms)&&receipt.negative_controls[0].elapsed_ms>=0);
  const logs=[],loggedReceipt={},logged=createNativePhaseRunner({fixture:fixtureFor(proper),receipt:loggedReceipt,stage:async()=>{},log:row=>logs.push(row)});
  await logged.negatives({cases:[recipe]});assert.deepEqual(logs,[{kind:'negative',...loggedReceipt.negative_controls[0]}]);
});

/** JSON-only metadata counterexamples; genuine role permissions still require native SQL. */
test('pure metadata authority and denied EXECUTE require real-role evidence, not setup failures',()=>{
  const adminRow={
    session_user:'supabase_admin',current_user:'supabase_admin',current_superuser:true,
    postgres_superuser:false,admin_superuser:true,owns_helper:true,
    service_role_membership:true,anon_role_membership:true,authenticated_role_membership:true,
    postgres_schema_create:true,service_schema_create:true,sql_language_usage:true,plpgsql_language_usage:true,
  };
  const result=row=>({status:0,signal:null,stdout:JSON.stringify(row),stderr:''});
  assert.deepEqual(assertMetadataAuthorityResult('supabase_admin',result(adminRow)),adminRow);
  const ordinaryRow={...adminRow,session_user:'postgres',current_user:'postgres',current_superuser:false};
  assert.deepEqual(assertMetadataAuthorityResult('postgres',result(ordinaryRow)),ordinaryRow);
  for(const role of ['postgres','supabase_admin']){
    const inspection=metadataAuthorityInspectionSql(role);
    assert.ok(inspection.startsWith('select jsonb_build_object('));
    assert.ok(inspection.includes("'current_superuser'")&&inspection.includes("'owns_helper'"));
    assert.doesNotMatch(inspection,/\b(?:alter|grant|revoke|insert|update|delete)\b/i);
  }
  const deny={kind:'sql-rejection',expectedSqlState:'42501',expectedSetupMarker:'native-metadata-execution-role:anon'};
  assertMetadataRejectionSetup(deny,{stdout:deny.expectedSetupMarker+'\n'});
  let rejected=0;
  for(const stdout of ['', 'other\n', 'native-metadata-execution-role:authenticated\n', deny.expectedSetupMarker+'\nextra\n']){
    assert.throws(()=>assertMetadataRejectionSetup(deny,{stdout}));rejected++;
  }
  for(const change of [
    {current_superuser:false},{current_user:'postgres'},{session_user:'postgres'},
    {admin_superuser:false},{postgres_superuser:true},{owns_helper:false},
    {service_schema_create:false},{postgres_schema_create:false},
    {anon_role_membership:false},{service_role_membership:false},
  ]){
    assert.throws(()=>assertMetadataAuthorityResult('supabase_admin',result({...adminRow,...change})));rejected++;
  }
  for(const change of [{status:1},{status:2},{status:3},{signal:'SIGTERM'},{error:new Error('EPIPE model')}]){
    assert.throws(()=>assertMetadataAuthorityResult('supabase_admin',{...result(adminRow),...change}));rejected++;
  }
  assert.equal(rejected,19,'Exactly19 JSON-boundary mutants, no real SQL or role proof');
});


/** JSON-only version witnesses; no daemon, service, SQL or native pass is modeled. */
test('pure GoTrue image/build witness separates unspecified runtime reporting and rejects identity or transport drift',()=>{
  const imageId='sha256:202c16530f2f29c886de963ab18b369074c49655480a463ce881169019f2bda7';
  const witness=()=>({imageTag:'supabase/gotrue:v2.158.1',imageId,currentImage:{Id:imageId,RepoTags:['supabase/gotrue:v2.158.1']},ownedImageId:imageId,
    health:{status:200,body:{version:'vunspecified',name:'GoTrue',description:'GoTrue is a user registration and authentication API'}},
    binary:{status:0,signal:null,stdout:'vunspecified\n',stderr:'',error:null}});
  const unspecified=assertNativeGoTrueRuntimeWitness(witness());
  assert.equal(unspecified.verified,true);assert.equal(unspecified.imageTag,'supabase/gotrue:v2.158.1');
  assert.equal(unspecified.imageId,imageId);assert.equal(unspecified.reportedVersion,'vunspecified');
  assert.equal(unspecified.exactRuntimeVersionConfirmed,false);
  assert.match(unspecified.versionEvidence,/semantic version is not confirmed/);
  for(const version of ['v2.158.1','2.158.1']) {
    const row=witness();row.health.body.version=version;row.binary.stdout=version+'\n';
    const proof=assertNativeGoTrueRuntimeWitness(row);assert.equal(proof.reportedVersion,version);assert.equal(proof.exactRuntimeVersionConfirmed,true);
  }
  // Platform image IDs are witnessed, not an arm64-only allowlist on amd64 CI.
  const otherPlatform=witness();otherPlatform.imageId='sha256:'+'a'.repeat(64);otherPlatform.currentImage.Id=otherPlatform.imageId;otherPlatform.ownedImageId=otherPlatform.imageId;
  assert.equal(assertNativeGoTrueRuntimeWitness(otherPlatform).exactRuntimeVersionConfirmed,false);
  const mutations=[
    row=>{row.imageTag='supabase/gotrue:v2.158.2';},
    row=>{row.currentImage.RepoTags=['supabase/gotrue:v2.158.2'];},
    row=>{row.currentImage.Id='sha256:'+'b'.repeat(64);},
    row=>{row.ownedImageId='sha256:'+'b'.repeat(64);},
    row=>{row.imageId='not-an-image-id';},
    row=>{row.health.status=503;},row=>{row.health.status='200';},
    row=>{row.health.body.name='OtherService';},row=>{row.health.body.description='Other description';},
    row=>{delete row.health.body.version;},row=>{row.health.body.version='unspecified';row.binary.stdout='unspecified\n';},
    row=>{row.health.body.version='v2.159.0';row.binary.stdout='v2.159.0\n';},row=>{row.health.body.version=null;},
    row=>{row.health.body.extra=true;},row=>{row.health.body=[];},
    row=>{row.binary.stdout='v2.158.1\n';},row=>{row.binary.stdout='warning\nvunspecified\n';},
    row=>{row.binary.status=1;},row=>{row.binary.status=2;},row=>{row.binary.status=3;},row=>{row.binary.status='0';},
    row=>{row.binary.signal='SIGTERM';},row=>{row.binary.error=new Error('EPIPE model');},
    row=>{row.binary.stderr='diagnostic';},row=>{row.binary.stdout=null;},
  ];
  for(const mutate of mutations){const row=witness();mutate(row);assert.throws(()=>assertNativeGoTrueRuntimeWitness(row));}
  assert.equal(mutations.length,25,'Exactly25 pure identity/health/binary counterexamples, not service execution');
});

/** JSON stdout models use the actual edge/ordinary reader, never a PostgreSQL pass. */
test('pure release reader rejects blank IDs even without an expected-ID list',async()=>{
  const baseline={tuples:{item:'0:'+'0'.repeat(32)},sequences:{},schema_sha256:'schema',roles_sha256:'roles'};
  const expected=[
    ['strict-null',"select 'a'::text id,null::boolean passed",['a'],[{id:'a',passed:null}]],
    ['strict-empty',"select 'a'::text id,true passed where false",['a'],[]],
    ['strict-false',"select 'a'::text id,false passed",['a'],[{id:'a',passed:false}]],
    ['strict-duplicate',"select 'a'::text id,true passed union all select 'a',true",['a'],[{id:'a',passed:true},{id:'a',passed:true}]],
    ['strict-wrong-id',"select 'b'::text id,true passed",['a'],[{id:'b',passed:true}]],
    ['strict-empty-id',"select ''::text id,true passed",null,[{id:'',passed:true}]],
    ['strict-whitespace-id',"select ' \t '::text id,true passed",null,[{id:' \t ',passed:true}]],
  ];
  const edges=nativeStrictReleaseEdges();
  assert.deepEqual(edges,expected.map(([name,check,ids])=>({name,check,ids})));
  const changed=nativeStrictReleaseEdges();changed[0].ids.push('mutated');changed.push({name:'mutated'});
  assert.deepEqual(nativeStrictReleaseEdges(),edges,'Fresh arrays and nested IDs, not mutable shared inventory');
  const responses=new Map(expected.map(([,check,,rows])=>[check,rows]));
  const calls=[],receipt={};
  const fixture={snapshot:()=>structuredClone(baseline),queryJson:()=>{throw new Error('No sequence or SQL callback expected');},sql:statement=>{
    calls.push(statement);assert.ok(statement.startsWith('begin read only;select row_to_json(r) from ('));
    assert.ok(statement.endsWith(') r;rollback;'));
    const query=statement.slice('begin read only;select row_to_json(r) from ('.length,-') r;rollback;'.length);
    assert.ok(responses.has(query),'Exact modeled statement only');
    return {status:0,signal:null,error:null,stderr:'',stdout:responses.get(query).map(row=>JSON.stringify(row)).join('\n')+'\n'};
  }};
  const phases=createNativePhaseRunner({fixture,receipt,stage:async()=>{throw new Error('No migration execution expected');}});
  phases.strictReleaseEdges(edges);
  assert.deepEqual(receipt.release_result_negatives,edges.map(({name})=>({name,passed:true})));
  for(const [index,id] of ['check','  meaningful check  '].entries()) {
    const query='modeled-good:'+index;responses.set(query,[{id,passed:true}]);
    assert.deepEqual(await phases.readOnly({path:'pure-good',releaseSql:query}),[{id,passed:true}]);
  }
  for(const id of ['', ' \t ']) {
    const query='modeled-bad:'+JSON.stringify(id);responses.set(query,[{id,passed:true}]);
    await assert.rejects(()=>phases.readOnly({path:'pure-bad',releaseSql:query}),/Release check ID must be nonempty/);
  }
  assert.equal(calls.length,11);assert.equal(receipt.release_checks.length,2);
});

/** JSON-only command diagnostics; no Auth, signal-origin or native SQL proof. */
test('pure GoTrue version accepts only empty or one exact known Info and keeps all raw witness gates',()=>{
  const known='{"level":"info","msg":"received graceful shutdown signal","time":"2026-10-04T03:26:19Z"}\n';
  assert.deepEqual(readNativeGoTrueVersionStderr(''),{kind:'empty',log:null});
  assert.equal(readNativeGoTrueVersionStderr(known).kind,'known-graceful-shutdown-info');
  const mutants=[null,0,Buffer.from(known),' ',known.trim(),known+'\n','\n'+known,known+known,known+'warning\n',
    known.replace('info','warn'),known.replace('info','error'),known.replace('received graceful shutdown signal','different message'),
    known.replace('"level"','"severity"'),known.replace('"time":','"extra":true,"time":'),known.replace('"time":','"level":"info","time":'),
    known.replace('2026-10-04','2026-02-30'),known.replace('03:26:19','24:26:19'),known.replace('19Z','60Z'),known.replace('T03',' 03'),
    known.replace('19Z','19+00:00'),known.replace('19Z','19.000Z'),known.replace('2026','invalid'),known.replace('\n','\r\n'),
    known.replace('{"level"','{ "level"'),JSON.stringify({msg:'received graceful shutdown signal',level:'info',time:'2026-10-04T03:26:19Z'})+'\n'];
  for(const stderr of mutants)assert.throws(()=>readNativeGoTrueVersionStderr(stderr));
  assert.equal(mutants.length,25,'Exactly25 pure stderr counterexamples');
  const imageId='sha256:202c16530f2f29c886de963ab18b369074c49655480a463ce881169019f2bda7';
  const witness=()=>({imageTag:'supabase/gotrue:v2.158.1',imageId,currentImage:{Id:imageId,RepoTags:['supabase/gotrue:v2.158.1']},ownedImageId:imageId,
    health:{status:200,body:{version:'vunspecified',name:'GoTrue',description:'GoTrue is a user registration and authentication API'}},
    binary:{status:0,signal:null,stdout:'vunspecified\n',stderr:known,error:null}});
  for(const version of ['vunspecified','v2.158.1','2.158.1']) {
    const row=witness();row.health.body.version=version;row.binary.stdout=version+'\n';const proof=assertNativeGoTrueRuntimeWitness(row);
    assert.equal(proof.binaryVersion.stderr,known,'Known stderr is not dropped or normalized');
    assert.equal(proof.binaryStderr.kind,'known-graceful-shutdown-info');assert.equal(proof.exactRuntimeVersionConfirmed,version!=='vunspecified');
  }
  const drift=[row=>{row.binary.status=1;},row=>{row.binary.status=2;},row=>{row.binary.status=3;},row=>{row.binary.status='0';},
    row=>{row.binary.signal='SIGTERM';},row=>{row.binary.error={code:'EPIPE'};},row=>{row.imageTag='supabase/gotrue:other';},
    row=>{row.currentImage.Id='sha256:'+'a'.repeat(64);},row=>{row.ownedImageId='sha256:'+'a'.repeat(64);},row=>{row.health.status=503;},
    row=>{row.health.body.name='Other';},row=>{row.health.body.version='v2.159.0';row.binary.stdout='v2.159.0\n';},row=>{row.binary.stdout='v2.158.1\n';}];
  for(const mutate of drift){const row=witness();mutate(row);assert.throws(()=>assertNativeGoTrueRuntimeWitness(row));}
  assert.equal(drift.length,13,'Existing raw/identity gates remain mandatory with known Info');
});
