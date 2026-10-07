import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {nativeDatabaseResourceLimits} from './treasure-vault-native-resources.mjs';

/** Exact-file and snapshot dispatch only; CLI cleanup authority is independent of a failed worker. */
export function createNativeEngineSqlDispatch({getEngine,engineEnableAttempted,cliCleanup,databaseId,cliInspect,cliDocker,resources}) {
  for(const callback of [getEngine,engineEnableAttempted,cliCleanup,databaseId,cliInspect,cliDocker])assert.equal(typeof callback,'function');
  const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
  function engine() {
    const current=getEngine();
    if(cliCleanup())return null;
    assert.ok(!engineEnableAttempted()||current,'No SQL fallback after an Engine constructor failure');
    return current;
  }
  function inspect() {
    const current=engine();if(!current)return cliInspect();
    const seen=current.inspect();
    assert.equal(seen.owned_identity_verified,true);assert.equal(seen.container_id,databaseId());
    assert.equal(seen.resource_limits_freshly_verified,true);assert.deepEqual(seen.resources,nativeDatabaseResourceLimits());
    resources.last_observed={...seen.resources};resources.fresh_verified_inspections++;
    return seen.container_id;
  }
  function command(args,input,allowFailure) {
    const current=engine();if(!current)return cliDocker(args,input,allowFailure);
    assert.equal(input,undefined);assert.equal(allowFailure,true);
    if(args[0]==='exec') {assert.equal(args[1],databaseId());return current.exec(args.slice(2));}
    assert.equal(args[0],'cp');assert.equal(args.length,3);
    const match=args[2].match(/^([a-f0-9]{64}):(\/tmp\/wg-tv-native-sql-[A-Za-z0-9]{6})\/statement\.sql$/);
    assert.ok(match);assert.equal(match[1],databaseId());
    const bytes=readFileSync(args[1]);
    const uploaded=current.archive({sourcePath:args[1],expectedSize:bytes.length,expectedSha256:sha(bytes),destinationDirectory:match[2]});
    assert.equal(uploaded.archive_uploaded,true);assert.equal(uploaded.remote_sha256_verified,false,'Exact grouped program verifies the uploaded SHA');
    return {status:0,signal:null,error:null,stdout:'',stderr:''};
  }
  return {inspect,command};
}
