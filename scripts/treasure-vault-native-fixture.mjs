import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { spawn,spawnSync } from 'node:child_process';
import {createOwnedNativeSessions} from './treasure-vault-native-sessions.mjs';
import {createNativeFileSqlTransport} from './treasure-vault-native-file-transport.mjs';
import {createNativeEngineSqlDispatch} from './treasure-vault-native-engine-dispatch.mjs';
import {createOwnedUnixEngineWorker} from './treasure-vault-native-engine.mjs';
import {nativeDatabaseResourceLimits,assertNativeDatabaseResourceLimits} from './treasure-vault-native-resources.mjs';
export {nativeDatabaseResourceLimits,assertNativeDatabaseResourceLimits} from './treasure-vault-native-resources.mjs';
import {nativeDiagnostic} from './treasure-vault-native-diagnostics.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const q = value => "'" + String(value).replaceAll("'", "''") + "'";
const identifier = value => { assert.match(value, /^[a-z_]+$/); return '"' + value + '"'; };
const contentTables = ['ability_block','ancestry','archetype','background','class','class_archetype','creature','item','language','spell','trait','versatile_heritage'];

/** One SQL statement keeps the original MVCC snapshot without a full-table JSON aggregate. */
export function buildNativeContentStateQuery() {
  return contentTables.map(table =>
    `select jsonb_build_object('table',${q(table)},'row',to_jsonb(r))::text from (select * from public.${identifier(table)} order by id) r`
  ).join(' union all ') + ';';
}

/** Retain every typed row/field and exact id ordering; never accept a failed transport as content. */
export function readNativeContentStateRows(result) {
  assert.equal(result.error==null,true,'Content state read must have no transport error');
  assert.equal(result.signal,null,'Content state read cannot terminate by signal');
  assert.equal(result.status,0,'Content state read must succeed');
  assert.equal(typeof result.stdout,'string','Content state read returns text');
  // jsonb_build_object previously serialized these fixed keys in this order.
  const keys=['item','class','spell','trait','ancestry','creature','language','archetype','background','ability_block','class_archetype','versatile_heritage'];
  assert.deepEqual(keys.slice().sort(),contentTables.slice().sort());
  const state=Object.fromEntries(keys.map(table=>[table,[]]));
  const seen=Object.fromEntries(keys.map(table=>[table,new Set()]));
  const lines=result.stdout===''?[]:result.stdout.split('\n');
  if(lines.at(-1)==='')lines.pop();
  for(const line of lines) {
    assert.ok(line.length>0,'No blank or diagnostic lines in complete content rows');
    const record=JSON.parse(line);
    assert.ok(record&&typeof record==='object'&&!Array.isArray(record),'One complete JSON row envelope');
    assert.deepEqual(Object.keys(record).sort(),['row','table'],'Exact content row envelope fields');
    assert.ok(contentTables.includes(record.table),'Only the complete fixed twelve-table content domain');
    assert.ok(record.row&&typeof record.row==='object'&&!Array.isArray(record.row),'Complete content row is an object');
    assert.ok(Number.isSafeInteger(record.row.id),'Actual content identity is a safe integer');
    assert.equal(seen[record.table].has(record.row.id),false,'No duplicate content identity in one snapshot');
    seen[record.table].add(record.row.id);
    state[record.table].push(record.row);
  }
  for(const table of keys)state[table].sort((left,right)=>left.id-right.id);
  return state;
}

/** Default CI accepts only a positively identified local Unix engine, never remote overrides. */
export function assertLocalNativeDocker({environment,context,endpoint,info}) {
  for (const name of ['DOCKER_HOST','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']) assert.ok(!environment[name],name+': remote/transport overrides are not allowed');
  assert.match(context,/^[a-zA-Z0-9_.-]+$/);
  assert.match(endpoint,/^unix:\/\/\/[^\r\n]+$/);
  assert.equal(info.OSType,'linux');
  assert.ok(typeof info.ServerVersion==='string'&&info.ServerVersion.length>0);
  return {context,endpoint,server_version:info.ServerVersion,architecture:info.Architecture,os_type:info.OSType,local_unix_verified:true};
}

/** Caller must obtain this census from a successful Docker command. Failure is never absence. */
export function parseNativeDockerNames(stdout) {
  const names=stdout.trim()?stdout.trim().split('\n'):[];
  for(const name of names)assert.match(name,/^[a-zA-Z0-9_.-]+$/);
  assert.equal(new Set(names).size,names.length);
  return names;
}

/** Fatal/connection/daemon errors cannot masquerade as an empty resource census. */
export function readNativeDockerCensus(result) {
  assert.equal(result.error==null,true,'Docker census transport must succeed');
  assert.equal(result.signal,null,'Docker census cannot terminate by signal');
  assert.equal(result.status,0,'Docker census command must succeed before proving absence');
  return parseNativeDockerNames(result.stdout);
}

/** Name/label alone cannot authenticate a replacement container. */
export function assertNativeContainerIdentity({row,name,id,owner,imageId}) {
  assert.match(id,/^[a-f0-9]{64}$/);assert.match(imageId,/^sha256:[a-f0-9]{64}$/);
  assert.equal(row.Name,'/'+name);assert.equal(row.Config.Labels['wg.native.owner'],owner);
  assert.equal(row.Id,id,'Exact container ID returned by this fixture\'s successful Docker run');
  assert.equal(row.Image,imageId,'Created container uses the positively captured immutable image ID');
}

export function assertNativeCleanupCensus({ownedContainerNames,removedVolumes,currentVolumeNames}) {
  assert.deepEqual(ownedContainerNames,[],'Successful final owner-label census must be empty');
  for(const name of removedVolumes)assert.equal(currentVolumeNames.includes(name),false,'Actual removed anonymous volume remains: '+name);
}

/** Dispose only a container whose immutable identity the fixture already verified. */
export async function disposeNativeOwnedContainer({name,row,database,docker,log,redact,receipt,removedVolumes,errors}) {
  let volumes=[];
  function diagnosticFailure(kind,error) {
    const {name:nameOfError,message}=nativeDiagnostic(error,{redact,summary:'Owned diagnostic failed; its message could not be safely redacted'});
    errors.push(message);
    (receipt.owned_container_diagnostic_errors??=[]).push({name,container_id:row.Id,kind,name_of_error:nameOfError,message});
  }
  try {
    volumes=row.Mounts.filter(mount=>mount.Type==='volume').map(mount=>mount.Name);
    // Redact serialized strings only; keep the actual state and typed status evidence intact.
    const state=JSON.parse(JSON.stringify(row.State,(_key,value)=>typeof value==='string'?redact(value):value));
    (receipt.final_owned_states??=[]).push({name,state});
    if(database) {
      receipt.owned_database_resources.final_observed={...receipt.owned_database_resources.last_observed};
      assertNativeDatabaseResourceLimits(row);receipt.owned_database_resources.final_verified=true;
    }
  } catch(error) {diagnosticFailure('metadata',error);}
  try {
    const args=database?['logs','--timestamps','--tail','1000',row.Id]:['logs','--tail','80',name];
    const logs=docker(args,undefined,true,false);
    assert.equal(logs.error==null,true,'Owned log capture transport must succeed');
    assert.equal(logs.signal,null,'Owned log capture cannot qualify after a signal');
    assert.equal(logs.status,0,'Owned log capture must exit successfully');
    assert.equal(typeof logs.stdout,'string');assert.equal(typeof logs.stderr,'string');
    const text=database?(logs.stdout+logs.stderr).split('\n').map(line=>redact(line).slice(0,1000)).join('\n'):redact(logs.stdout+logs.stderr);
    await log({kind:'owned-container-final-logs',name,container_id:row.Id,text,status:logs.status,signal:logs.signal,no_transport_error:true,
      scope:database?'Actual last1000 timestamped Docker log records; existing secret redactor applied separately per line with a1000-character line bound; not a full archive or proof of earlier causes.':'Existing Auth last80 records and whole-output redaction bound.'});
  } catch(error) {diagnosticFailure('logs',error);}
  // Diagnostic failure is still a failed run, never authority to abandon the
  // existing exact-owned disposal and successful absence-census obligations.
  docker(['rm','-f','-v',name]);
  for(const volume of volumes)removedVolumes.add(volume);
  assert.equal(readNativeDockerCensus(docker(['ps','-a','--format','{{.Names}}'])).includes(name),false,'Successful container census proves target absent');
}

/** Classify only the pinned command's exact known Info, preserving raw stderr.
 * Deferred context cancellation can emit it after a successful version return;
 * this record does not prove whether an external signal occurred.
 */
export function readNativeGoTrueVersionStderr(stderr) {
  assert.equal(typeof stderr,'string','Owned auth version returns raw diagnostic text');
  if(stderr==='')return {kind:'empty',log:null};
  const match=stderr.match(/^\{"level":"info","msg":"received graceful shutdown signal","time":"([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z)"\}\n$/);
  assert.ok(match,'Owned auth version stderr is only the exact known singleton Info record');
  const timestamp=new Date(match[1]);assert.equal(Number.isNaN(timestamp.valueOf()),false,'Known Info timestamp is valid');
  assert.equal(timestamp.toISOString(),match[1].replace(/Z$/,'.000Z'),'Known Info timestamp round-trips as second-precision UTC RFC3339');
  const log=JSON.parse(stderr);assert.deepEqual(Object.keys(log).sort(),['level','msg','time']);
  return {kind:'known-graceful-shutdown-info',log};
}

/** Identify the pinned image separately from the GoTrue binary's reported version. */
export function assertNativeGoTrueRuntimeWitness({imageTag,imageId,currentImage,ownedImageId,health,binary}) {
  assert.equal(imageTag,'supabase/gotrue:v2.158.1','Exact reviewed GoTrue image tag');
  assert.match(imageId,/^sha256:[a-f0-9]{64}$/,'Positively captured platform image ID');
  assert.ok(Array.isArray(currentImage?.RepoTags)&&currentImage.RepoTags.includes(imageTag),'Current image retains the reviewed tag');
  assert.equal(currentImage.Id,imageId,'Current tag still resolves to the captured immutable image');
  assert.equal(ownedImageId,imageId,'Owner-verified auth container still uses the captured image');
  assert.equal(health.status,200,'Current owned GoTrue health must return HTTP200');
  assert.ok(health.body&&typeof health.body==='object'&&!Array.isArray(health.body),'GoTrue health is a JSON object');
  assert.deepEqual(Object.keys(health.body).sort(),['description','name','version'],'Exact reviewed health response fields');
  assert.equal(health.body.name,'GoTrue','Exact health service name');
  assert.equal(health.body.description,'GoTrue is a user registration and authentication API','Exact health description');
  assert.ok(['v2.158.1','2.158.1','vunspecified'].includes(health.body.version),'Only reviewed semantic-version variants or the known unspecified image build');
  assert.equal(binary.error==null,true,'Owned auth version has no transport error');
  assert.equal(binary.signal,null,'Owned auth version cannot end by signal');
  assert.equal(binary.status,0,'Owned auth version must exit successfully');
  const binaryStderr=readNativeGoTrueVersionStderr(binary.stderr);
  assert.equal(typeof binary.stdout,'string','Owned auth version returns text');
  assert.equal(binary.stdout.trim(),health.body.version,'Owned binary and current health versions must agree exactly');
  return {imageTag,imageId,currentTagImageId:currentImage.Id,ownedImageId,
    healthStatus:health.status,health:structuredClone(health.body),binaryVersion:{status:binary.status,signal:binary.signal,stdout:binary.stdout,stderr:binary.stderr},binaryStderr,
    reportedVersion:health.body.version,exactRuntimeVersionConfirmed:health.body.version!=='vunspecified',
    versionEvidence:health.body.version==='vunspecified'?'Pinned image identity and matching unspecified binary/health build; semantic version is not confirmed':'Pinned image identity and matching explicit binary/health semantic version',verified:true};
}

/** One validated read returns the same exact typed values as the per-sequence reader. */
export function buildNativeSequenceSnapshotQuery(names) {
  const paths=names.map(row=>{
    assert.ok(['public','auth','proof'].includes(row.schema));
    identifier(row.schema);identifier(row.name);return row.schema+'.'+row.name;
  });
  assert.equal(new Set(paths).size,paths.length);
  if (!names.length) return "select '{}'::jsonb;";
  const branches=names.map(row=>{
    const path=row.schema+'.'+row.name;
    return `select ${q(path)} name,jsonb_build_object('last_value',s.last_value::text,'is_called',s.is_called,'increment',p.seqincrement::text,'cache',p.seqcache::text,'cycle',p.seqcycle) value from ${identifier(row.schema)}.${identifier(row.name)} s cross join pg_catalog.pg_sequence p where p.seqrelid=${q(path)}::regclass`;
  });
  return 'select jsonb_object_agg(name,value order by name) from ('+branches.join(' union all ')+') sequences;';
}

/** Fresh table/sequence membership and complete role state in one read. */
export function buildNativeSnapshotMembershipQuery() {
  return "select jsonb_build_object('relations',(select coalesce(jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename) order by schemaname,tablename),'[]'::jsonb) from pg_tables where schemaname in('public','auth','proof')),'sequence_names',(select coalesce(jsonb_agg(jsonb_build_object('schema',schemaname,'name',sequencename) order by schemaname,sequencename),'[]'::jsonb) from pg_sequences where schemaname in('public','auth','proof')),'roles',jsonb_build_object('roles',(select jsonb_agg(to_jsonb(r) order by rolname) from pg_roles r),'members',(select coalesce(jsonb_agg(to_jsonb(m) order by roleid,member,grantor),'[]'::jsonb) from pg_auth_members m)));";
}

/** Complete binary row digests include type OIDs, NULLs and every live/generated attribute.
 * Compare only within the same pinned fixture; this is not a portable content fingerprint.
 */
export function buildNativeSnapshotValuesQuery({relations,sequenceNames}) {
  assert.ok(Array.isArray(relations));assert.ok(Array.isArray(sequenceNames));
  const paths=relations.map(row=>{
    assert.deepEqual(Object.keys(row).sort(),['schema','table']);
    assert.ok(['public','auth','proof'].includes(row.schema));
    identifier(row.schema);identifier(row.table);return row.schema+'.'+row.table;
  });
  assert.equal(new Set(paths).size,paths.length);
  const branches=relations.map(row=>`select ${q(row.schema+'.'+row.table)} name,count(*)||':'||md5(coalesce(string_agg(md5(pg_catalog.record_send(r)),'' order by md5(pg_catalog.record_send(r))),'')) value from ${identifier(row.schema)}.${identifier(row.table)} r`);
  const tuples=branches.length?'select jsonb_object_agg(name,value order by name) from ('+branches.join(' union all ')+') s':"select '{}'::jsonb";
  const sequences=buildNativeSequenceSnapshotQuery(sequenceNames).replace(/;$/,'');
  return "select jsonb_build_object('tuples',("+tuples+"),'sequences',("+sequences+'));';
}

/** Validate membership and retain the prior stable sequence ordering. */
export function normalizeNativeSnapshotValues({relations,sequenceNames,values}) {
  const relationPaths=relations.map(row=>row.schema+'.'+row.table);
  assert.deepEqual(Object.keys(values).sort(),['sequences','tuples']);
  assert.deepEqual(Object.keys(values.tuples).sort(),relationPaths.slice().sort());
  for(const value of Object.values(values.tuples))assert.match(value,/^[0-9]+:[a-f0-9]{32}$/);
  const paths=sequenceNames.map(row=>row.schema+'.'+row.name);
  assert.deepEqual(Object.keys(values.sequences).sort(),paths.slice().sort());
  const sequences=Object.fromEntries(paths.map(path=>[path,values.sequences[path]]));
  for(const value of Object.values(sequences)) {
    assert.deepEqual(Object.keys(value).sort(),['cache','cycle','increment','is_called','last_value']);
    for(const field of ['last_value','increment','cache'])assert.match(value[field],/^-?[0-9]+$/);
    for(const field of ['is_called','cycle'])assert.equal(typeof value[field],'boolean');
  }
  return {tuples:values.tuples,sequences};
}

/**
 * The real offline fixture. Construction does not start containers. initialize()
 * owns the only reset path, inside a uniquely labelled database with no ports.
 * Auth schema/users come from the actual GoTrue service, never replacement SQL.
 */
export function createOwnedNativeFixture({ root, receipt, log, bootstrapRead,throwIfRequested=()=>{} }) {
  assert.equal(typeof log, 'function');
  assert.equal(typeof bootstrapRead,'function','Exact starting captured bootstrap bytes are required');
  const owner = randomUUID(), db = 'wg-tv-native-db-' + owner, auth = 'wg-tv-native-auth-' + owner;
  const password = randomBytes(24).toString('hex'), jwt = randomBytes(32).toString('hex');
  const secrets = new Set([password, jwt]);
  const image = 'supabase/postgres:15.6.1.146', authImage = 'supabase/gotrue:v2.158.1';
  const imageIds=new Map(),containerIds=new Map();
  const databaseLimits=nativeDatabaseResourceLimits();
  receipt.native_snapshot_policy={tuple_codec:'postgres-record-send-v1',complete_live_attributes:true,generated_fields_included:true,null_and_type_framing:true,row_order_independent:true,duplicate_multiplicity_preserved:true,comparison_scope:'Same owned PostgreSQL15.6 fixture only; not portable across databases/type OIDs',fresh_relation_and_sequence_membership:true,full_schema_dump:true,complete_roles_and_memberships:true};
  receipt.owned_database_resources={requested:{...databaseLimits},per_container_only:true,total_host_guarantee:false,
    auth_resource_policy_unchanged:true,fresh_verified_inspections:0,initial_observed:null,last_observed:null,final_observed:null,final_verified:false};
  let databaseAttempted = false, authAttempted = false, cleaning=false,cleanupTransportDepth=0,cleanupCliDepth=0,localEndpoint=null,engineId=null,engineTransport=null,engineEnableAttempted=false;
  const redact = value => {
    let text = String(value ?? '');
    for (const secret of secrets) text = text.replaceAll(secret, '[owned-fixture-secret]');
    return text.split('\n').map(line => line.slice(0, 1000)).join('\n').slice(-12000);
  };
  function docker(args, input, allowFailure = false, recordOutput = true) {
    if (!cleaning&&!cleanupTransportDepth) throwIfRequested('owned Docker transport');
    const environment={...process.env};
    if(localEndpoint)for(const name of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete environment[name];
    const result = spawnSync('docker', localEndpoint?['--host',localEndpoint,...args]:args, { input,env:environment, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 660000 });
    if (result.error) throw new Error('Docker transport failed, not a PostgreSQL guard rejection: ' + redact(result.error.message), {cause: result.error});
    if (recordOutput && (result.status !== 0 || result.stderr)) log({kind:'transport',status:result.status,signal:result.signal,stderr:redact(result.stderr)});
    if (!allowFailure) assert.equal(result.status, 0, redact(result.stderr));
    return result;
  }
  function inspect(name) {
    assert.ok([db, auth].includes(name));
    const row = JSON.parse(docker(['inspect', name]).stdout)[0];
    assertNativeContainerIdentity({row,name,id:containerIds.get(name),owner,imageId:imageIds.get(name===db?image:authImage)});
    if (name === db) {
      assert.equal(row.HostConfig.NetworkMode, 'none');
      const observed=Object.fromEntries(Object.keys(databaseLimits).map(field=>[field,row.HostConfig[field]]));
      receipt.owned_database_resources.container_id=row.Id;receipt.owned_database_resources.last_observed=observed;
      // Final disposal keeps its original identity gates even if a resource limit drifted.
      if(!cleaning) {
        assertNativeDatabaseResourceLimits(row);
        receipt.owned_database_resources.initial_observed??={...observed};
        receipt.owned_database_resources.fresh_verified_inspections++;
      }
    }
    else {
      const ownedDb = inspect(db);
      assert.ok([`container:${db}`, `container:${ownedDb.Id}`].includes(row.HostConfig.NetworkMode));
    }
    assert.deepEqual(row.HostConfig.PortBindings ?? {}, {});
    return row;
  }
  const engineDispatch=createNativeEngineSqlDispatch({getEngine:()=>engineTransport,
    engineEnableAttempted:()=>engineEnableAttempted,cliCleanup:()=>cleaning||cleanupCliDepth>0,
    databaseId:()=>containerIds.get(db),resources:receipt.owned_database_resources,cliDocker:docker,
    cliInspect:()=>{const row=inspect(db);assert.equal(row.State.Running,true,'Owned database must remain running');return row.Id;}});
  const inspectSqlDatabase=engineDispatch.inspect,fileCommand=engineDispatch.command;
  const sqlWithLogin=createNativeFileSqlTransport({
    getOwnedDatabaseId:inspectSqlDatabase,docker:fileCommand,
    cleanupTransport:callback=>cleanupTransport(callback),redact,
    record:evidence=>log({kind:'file-sql-transport',...evidence}),
  });
  /** Bind once to the original locally witnessed Engine and fully bootstrapped owned DB. */
  async function enableEngineTransport() {
    assert.equal(engineEnableAttempted,false,'No constructor retry or CLI fallback');engineEnableAttempted=true;
    assert.equal(cleaning,false);assert.ok(localEndpoint);assert.equal(receipt.local_docker.local_unix_verified,true);
    assert.equal(receipt.bootstrap.real_auth,true);assert.equal(receipt.owned_auth_fixture.real_signup,true);
    assert.equal(receipt.owned_auth_fixture.auth_and_public_trigger_match,true);
    assert.equal(receipt.saved_copy_fixture.inventory_and_custom_graph_created,true);
    assertOwned();
    const binding={socketPath:localEndpoint.slice('unix://'.length),engineId,
      database:{id:containerIds.get(db),name:db,owner,imageId:imageIds.get(image),imageTag:image}};
    engineTransport=await createOwnedUnixEngineWorker({binding,throwIfRequested:label=>{if(!cleaning&&!cleanupTransportDepth)throwIfRequested(label);}});
    receipt.local_engine_transport={enabled:true,api_version:'1.45',owned_database_id:containerIds.get(db),
      original_binding:true,sql_bytes_unchanged:true,file_identity_callbacks:5,resource_limits_unchanged:true,
      bootstrap_auth_sessions_cleanup:'Original CLI authority',http_connections_reused:false};
    log({kind:'local-engine-transport-enabled',...receipt.local_engine_transport});
  }
  const sql=(statement,allowFailure=false)=>sqlWithLogin(statement,allowFailure,'postgres');
  // The reviewed leakproof setup requires the image's actual administrator.
  // Its SQL asserts that identity, then tests the release as ordinary postgres.
  const sqlAsAdmin=(statement,allowFailure=false)=>sqlWithLogin(statement,allowFailure,'supabase_admin');
  const query = statement => sql(statement).stdout.trim();
  const queryJson = statement => JSON.parse(query(statement));
  async function waitForDatabase() {
    for (let attempt = 0; attempt < 120; attempt++) {
      assert.equal(inspect(db).State.Running, true);
      const logs = docker(['logs',db], undefined, true);
      if ((logs.stdout + logs.stderr).includes('PostgreSQL init process complete') &&
        docker(['exec',db,'pg_isready','-h','127.0.0.1','-U','postgres'],undefined,true).status === 0) return;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('Owned PostgreSQL did not become ready');
  }
  function localHttp(path, payload) {
    assert.ok(['/health','/signup'].includes(path)); inspect(auth);
    const method = payload == null ? 'GET' : 'POST', body = payload == null ? '' : JSON.stringify(payload);
    // ASCII owned fixture payloads keep shell character length equal to bytes.
    assert.match(body, /^[\x20-\x7e]*$/);
    const script = 'IFS= read -r -d "" body || :; exec 3<>/dev/tcp/127.0.0.1/9999; ' +
      `printf '${method} ${path} HTTP/1.0\\r\\nHost: localhost\\r\\nContent-Type: application/json\\r\\nContent-Length: %s\\r\\n\\r\\n%s' "${'${#body}'}" "$body" >&3; cat <&3`;
    const result = docker(['exec','-i',db,'bash','-c',script], body, true, false);
    assert.equal(result.status, 0, 'Owned GoTrue HTTP transport must succeed');
    const split = result.stdout.indexOf('\r\n\r\n'); assert.ok(split >= 0);
    const status = Number(result.stdout.match(/^HTTP\/1\.[01] ([0-9]{3})\b/)?.[1]);
    assert.ok(Number.isInteger(status));
    return {status,body:result.stdout.slice(split + 4)};
  }
  async function waitForAuth() {
    for (let attempt = 0; attempt < 120; attempt++) {
      assert.equal(inspect(auth).State.Running, true);
      try { if (localHttp('/health').status === 200) return; } catch (error) { log({kind:'auth-readiness',attempt,error:redact(error.message)}); }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('Owned GoTrue did not become ready');
  }
  async function initialize(stage) {
    assert.equal(databaseAttempted, false);
    // Validate context and daemon before any run/reset. Version tags are portable;
    // actual image IDs are recorded, not arm64-only constants imposed on amd64 CI.
    for(const name of ['DOCKER_HOST','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])assert.ok(!process.env[name],name+': transport overrides reject before connecting');
    const context=docker(['context','show']).stdout.trim();
    const contextRow=JSON.parse(docker(['context','inspect',context]).stdout)[0];
    assert.equal(contextRow.Name,context);
    assert.match(contextRow.Endpoints?.docker?.Host,/^unix:\/\/\/[^\r\n]+$/);
    localEndpoint=contextRow.Endpoints.docker.Host;
    const info=JSON.parse(docker(['info','--format','{{json .}}']).stdout);
    assert.ok(typeof info.ID==='string'&&info.ID.length>0);engineId=info.ID;
    receipt.local_docker=assertLocalNativeDocker({environment:process.env,context,endpoint:contextRow.Endpoints?.docker?.Host,info});
    receipt.local_docker.engine_id=engineId;
    for (const value of [image, authImage]) {
      const row = JSON.parse(docker(['image','inspect',value]).stdout)[0];
      assert.ok(row.RepoTags.includes(value));assert.match(row.Id,/^sha256:[a-f0-9]{64}$/);
      imageIds.set(value,row.Id);
      (receipt.images ??= []).push({image:value,id:row.Id,digests:row.RepoDigests,architecture:row.Architecture,scope:'Observed local platform image, not an unverified cross-architecture digest pin'});
    }
    databaseAttempted = true;
    const dbRun=docker(['run','--pull','never','-d','--name',db,'--label',`wg.native.owner=${owner}`,'--network','none',
      '--memory',String(databaseLimits.Memory),'--memory-swap',String(databaseLimits.MemorySwap),'--cpus',String(databaseLimits.NanoCpus/1e9),
      '-e','POSTGRES_HOST=/var/run/postgresql','-e','PGPORT=5432','-e','POSTGRES_PORT=5432',
      '-e',`PGPASSWORD=${password}`,'-e',`POSTGRES_PASSWORD=${password}`,'-e','PGDATABASE=postgres','-e','POSTGRES_DB=postgres',
      '-e',`JWT_SECRET=${jwt}`,'-e','JWT_EXP=3600',
      '-v',root+'/docker/db-init/zzz-passwords.sh:/docker-entrypoint-initdb.d/zzz-passwords.sh:ro',
      '-v',root+'/supabase/seed.sql:/docker-entrypoint-initdb.d/zzz-seed.sql:ro',imageIds.get(image)]);
    assert.match(dbRun.stdout.trim(),/^[a-f0-9]{64}$/);containerIds.set(db,dbRun.stdout.trim());
    await waitForDatabase();
    assert.equal(query('show server_version_num;'),'150006','Exact reviewed PostgreSQL15.6 runtime');
    authAttempted = true;
    const authRun=docker(['run','--pull','never','-d','--name',auth,'--label',`wg.native.owner=${owner}`,'--network',`container:${db}`,
      '-e','GOTRUE_API_HOST=127.0.0.1','-e','GOTRUE_API_PORT=9999','-e','API_EXTERNAL_URL=http://127.0.0.1:9999',
      '-e','GOTRUE_DB_DRIVER=postgres','-e',`GOTRUE_DB_DATABASE_URL=postgres://supabase_auth_admin:${password}@127.0.0.1:5432/postgres`,
      '-e','GOTRUE_SITE_URL=http://127.0.0.1:3000','-e','GOTRUE_DISABLE_SIGNUP=false',
      '-e','GOTRUE_JWT_ADMIN_ROLES=service_role','-e','GOTRUE_JWT_AUD=authenticated','-e','GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated',
      '-e','GOTRUE_JWT_EXP=3600','-e',`GOTRUE_JWT_SECRET=${jwt}`,'-e','GOTRUE_EXTERNAL_EMAIL_ENABLED=true','-e','GOTRUE_MAILER_AUTOCONFIRM=true',imageIds.get(authImage)]);
    assert.match(authRun.stdout.trim(),/^[a-f0-9]{64}$/);containerIds.set(auth,authRun.stdout.trim());
    await waitForAuth();
    const authResponse=localHttp('/health');
    receipt.gotrue_runtime_witness={imageTag:authImage,imageId:imageIds.get(authImage),healthStatus:authResponse.status,health:null,healthJsonParsed:false,verified:false,exactRuntimeVersionConfirmed:false};
    const authHealth=JSON.parse(authResponse.body);
    receipt.gotrue_runtime_witness.healthJsonParsed=true;
    receipt.gotrue_runtime_witness.health=Object.fromEntries(['version','name','description'].map(field=>[field,typeof authHealth?.[field]==='string'?redact(authHealth[field]):null]));
    const authContainer=inspect(auth);
    const currentAuthImage=JSON.parse(docker(['image','inspect',authImage]).stdout)[0];
    receipt.gotrue_runtime_witness.currentTagImageId=currentAuthImage?.Id;
    receipt.gotrue_runtime_witness.ownedImageId=authContainer.Image;
    const authVersion=docker(['exec',auth,'auth','version'],undefined,true,false);
    receipt.gotrue_runtime_witness.binaryVersion={status:authVersion.status,signal:authVersion.signal,stdout:redact(authVersion.stdout),stderr:redact(authVersion.stderr)};
    const authWitness=assertNativeGoTrueRuntimeWitness({imageTag:authImage,imageId:imageIds.get(authImage),currentImage:currentAuthImage,ownedImageId:authContainer.Image,health:{status:authResponse.status,body:authHealth},binary:authVersion});
    receipt.gotrue_runtime_witness={...authWitness,healthJsonParsed:true};
    receipt.runtime_versions={postgres:'15.6',gotrue:authWitness.reportedVersion,gotrueImageTag:authWitness.imageTag,gotrueImageId:authWitness.imageId,gotrueExactRuntimeVersionConfirmed:authWitness.exactRuntimeVersionConfirmed,image_pins:'Repository version tags and observed immutable platform image IDs; an unspecified GoTrue build does not confirm its runtime semantic version.'};
    assert.equal(query("select to_regclass('auth.users') is not null and to_regprocedure('auth.uid()') is not null;"), 't');
    await stage('ci-github-role', "do $$ begin if not exists(select from pg_roles where rolname='github') then create role github;end if;end $$;");
    await stage('ci-owned-public-reset', 'drop schema public cascade;create schema public;grant all on schema public to postgres;grant all on schema public to public;');
    await stage('ci-trigram-extension', "create extension if not exists pg_trgm with schema public;do $$ begin if(select n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pg_trgm')<>'public' then alter extension pg_trgm set schema public;end if;end $$;");
    const schema = bootstrapRead('data/schema.sql'), dump = bootstrapRead('data/data.sql');
    receipt.bootstrap = {schema_sha256:sha(schema),dump_sha256:sha(dump),real_auth:true,generated_id_mapping:false,known_queue_imports:false};
    await stage('ci-full-schema', schema.split('\n').filter(line => !/^\\(?:un)?restrict /.test(line) && !/^CREATE TRIGGER /.test(line)).join('\n'));
    await stage('ci-full-canonical-dump', dump.split('\n').filter(line => !/^\\(?:un)?restrict /.test(line)).join('\n'));
    assert.equal(query('select count(*) from public.content_update;'), '0');
    await stage('ci-role-grants', 'grant usage on schema public to anon,authenticated,service_role;grant select,insert,update,delete on all tables in schema public to anon,authenticated,service_role;grant usage,select on all sequences in schema public to anon,authenticated,service_role;alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated,service_role;alter default privileges in schema public grant usage,select on sequences to anon,authenticated,service_role;');
    await stage('ci-auth-public-trigger', bootstrapRead('data/auth-trigger.sql'));
    await stage('owned-interference-namespace', 'create schema proof;');
    receipt.isolation = {owner,database:db,database_id:containerIds.get(db),auth,auth_id:containerIds.get(auth),network:'none',ports:[],mounts:inspect(db).Mounts.map(row => ({type:row.Type,destination:row.Destination,name:row.Name}))};
  }
  function signup() {
    const userPassword = randomBytes(24).toString('hex'); secrets.add(userPassword);
    const email = 'native-' + owner + '@fixture.invalid';
    const response = localHttp('/signup', {email,password:userPassword,data:{display_name:'Owned Native Fixture'}});
    let data;
    try { data = JSON.parse(response.body); } catch { throw new Error('Owned signup did not return JSON'); }
    for (const name of ['access_token','refresh_token']) if (typeof data[name] === 'string') secrets.add(data[name]);
    assert.ok([200,201].includes(response.status), 'Actual GoTrue signup must succeed');
    const userId = data.user?.id ?? data.id;
    assert.match(userId ?? '', /^[0-9a-f-]{36}$/i);
    const identity = queryJson(`select jsonb_build_object('auth',(select count(*) from auth.users where id=${q(userId)}::uuid and email=${q(email)}),'public',(select count(*) from public.public_user where user_id=${q(userId)}::uuid),'user_id',(select user_id from public.public_user where user_id=${q(userId)}::uuid));`);
    assert.deepEqual(identity, {auth:1,public:1,user_id:userId});
    receipt.owned_auth_fixture = {user_id:userId,real_signup:true,auth_and_public_trigger_match:true};
    return userId;
  }
  function reserveId(table) {
    assert.ok(['content_update','item','creature'].includes(table));
    const sequence = queryJson(`select to_jsonb(pg_get_serial_sequence('public.${table}','id'));`);
    assert.match(sequence, /^public\.[a-z_]+$/);
    const id = queryJson(`select to_jsonb(nextval(${q(sequence)}));`);
    assert.ok(Number.isSafeInteger(id) && id > 0);
    assert.equal(queryJson(`select to_jsonb(exists(select 1 from public.${identifier(table)} where id=${id}));`), false);
    (receipt.actual_reservations ??= []).push({table,sequence,id});
    return id;
  }
  function readState() {
    return readNativeContentStateRows(sql(buildNativeContentStateQuery()));
  }
  function savedCopyFixture(userId) {
    const rows = queryJson('select coalesce(jsonb_agg(to_jsonb(i) order by id),\'[]\'::jsonb) from public.item i where id in(11937,11944,12020,12212,12325,12426);');
    assert.equal(rows.length, 6);
    const inventory = {coins:{cp:0,sp:150,gp:0,pp:0},items:rows.map(item => ({id:randomUUID(),item,is_formula:false,is_equipped:true,is_invested:false,is_implanted:false,container_contents:[]}))};
    const custom = [{id:randomUUID(),type:'addBonusToValue',data:{variable:'SKILL_ARCANA',value:1,type:'circumstance',text:'Owned saved-copy preservation'}}];
    const id = queryJson(`insert into public."character"(user_id,name,inventory,operation_data,custom_operations,meta_data) values(${q(userId)}::uuid,'Owned Native Saved Copies',${q(JSON.stringify(inventory))}::json,'{"selections":{"native-preservation":"unchanged"}}'::json,array(select value::json from jsonb_array_elements(${q(JSON.stringify(custom))}::jsonb)),'{}'::json) returning to_jsonb(id);`);
    assert.ok(Number.isSafeInteger(id) && id > 0);
    receipt.saved_copy_fixture = {character_id:id,actual_table:'public.character',catalog_ids:rows.map(row => row.id),inventory_and_custom_graph_created:true,limits:['Database preservation fixture, not character-engine/UI correctness certification.']};
    return id;
  }
  function snapshot() {
    const membership=queryJson(buildNativeSnapshotMembershipQuery());
    assert.deepEqual(Object.keys(membership).sort(),['relations','roles','sequence_names']);
    const values=queryJson(buildNativeSnapshotValuesQuery({relations:membership.relations,sequenceNames:membership.sequence_names}));
    const {tuples,sequences}=normalizeNativeSnapshotValues({relations:membership.relations,sequenceNames:membership.sequence_names,values});
    const id=inspectSqlDatabase();
    const dumped = fileCommand(['exec',id,'pg_dump','-U','postgres','-d','postgres','--schema-only','--schema=public','--schema=auth','--schema=proof'],undefined,true);
    assert.equal(dumped.error==null,true);assert.equal(dumped.signal,null);assert.equal(dumped.status,0,'Complete native schema dump');
    const schema = sha(dumped.stdout.split('\n').filter(line => !/^\\(?:un)?restrict /.test(line)).join('\n'));
    const state = {tuple_codec:'postgres-record-send-v1',tuples,sequences,schema_sha256:schema,roles_sha256:sha(JSON.stringify(membership.roles))};
    return {...state,sha256:sha(JSON.stringify(state))};
  }
  async function cleanup() {
    cleaning=true;
    const errors = [],removedVolumes=new Set();
    if(engineTransport)try {receipt.local_engine_transport.closed=await engineTransport.close();}
    catch(error){errors.push(redact(error.message));}
    try {await sessions.closeAll();}catch(error){errors.push(redact(error.message));}
    if(localEndpoint)try {
      assert.equal(JSON.parse(docker(['info','--format','{{json .}}']).stdout).ID,engineId,'Same positively identified local engine');
    } catch(error){errors.push(redact(error.message));}
    for (const [name, attempted] of [[auth,authAttempted],[db,databaseAttempted]]) if (attempted) {
      try {
        const present=readNativeDockerCensus(docker(['ps','-a','--format','{{.Names}}']));
        if(!present.includes(name))continue; // Successful census, never arbitrary inspect failure.
        const row=inspect(name);
        await disposeNativeOwnedContainer({name,row,database:name===db,docker,log,redact,receipt,removedVolumes,errors});
      } catch (error) { errors.push(redact(error.message)); }
    }
    try {
      const ownedContainerNames=readNativeDockerCensus(docker(['ps','-a','--filter',`label=wg.native.owner=${owner}`,'--format','{{.Names}}']));
      const currentVolumeNames=readNativeDockerCensus(docker(['volume','ls','--format','{{.Name}}']));
      assertNativeCleanupCensus({ownedContainerNames,removedVolumes:[...removedVolumes],currentVolumeNames});
      receipt.cleanup_census={owner_label_empty:true,removed_anonymous_volumes:[...removedVolumes],daemon_commands_succeeded:true};
    } catch(error) {errors.push(redact(error.message));}
    assert.deepEqual(errors, [], 'Only owner-verified containers/anonymous volumes may be removed');
    receipt.cleaned_only_owned_containers_and_volumes = true;
  }
  const assertOwned=()=>{inspect(db);inspect(auth);};
  // Only these synchronous cleanup callbacks may bypass a requested stop. SQL
  // requests, startup and ordinary fixture reads retain cooperative interruption.
  const cleanupTransport=callback=>{cleanupTransportDepth++;try{return callback();}finally{cleanupTransportDepth--;}};
  const cleanupAssertOwned=()=>cleanupTransport(assertOwned);
  const cleanupQueryJson=statement=>cleanupTransport(()=>{cleanupCliDepth++;try{return queryJson(statement);}finally{cleanupCliDepth--;}});
  const sessions=createOwnedNativeSessions({assertOwned,queryJson,cleanupAssertOwned,cleanupQueryJson,redact,throwIfRequested,receipt,spawnPsql:()=>{
    assertOwned();assert.ok(localEndpoint);throwIfRequested('spawn actual owned psql');
    const environment={...process.env};
    for(const name of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete environment[name];
    return spawn('docker',['--host',localEndpoint,'exec','-i',db,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],{env:environment,stdio:['pipe','pipe','pipe']});
  }});
  return {initialize,signup,enableEngineTransport,sql,sqlAsAdmin,query,queryJson,readState,snapshot,stateDigest:snapshot,reserveProposalId:()=>reserveId('content_update'),reserveContentId:reserveId,savedCopyFixture,cleanup,redact,assertOwned,openSession:sessions.openSession};
}
