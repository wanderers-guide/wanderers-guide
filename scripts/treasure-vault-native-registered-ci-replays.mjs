import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const sha=text=>createHash('sha256').update(text).digest('hex');
const migrationName=/^[0-9]{14}_[a-z0-9_]+\.sql$/;
const releaseName=/^[a-z0-9-]+\.sql$/;
const replayPrefixes=['20260927','20260928','20260929','20260930','20261001','20261002'];
const indexPaths=['supabase/release/war-of-immortals-index.sql','supabase/release/war-of-immortals-index-regression.sql'];
const workflowPath='.github/workflows/e2e.yml';
export const APPROVED_REGISTERED_CI_REPLAY_STEP_SHA256="4ee2f17d57faca47d71f16879ccc02fcc4fbb6ee89e6ca07c48f22bb5eb366d0";


/** Pin the exact reviewed shell step, not a reconstructed or normalized workflow. */
export function assertRegisteredCiWorkflowRecipe(workflow) {
  assert.equal(typeof workflow,'string');
  const marker="      - name: Verify and replay registered content repairs\n";
  const start=workflow.indexOf(marker),end=workflow.indexOf('\n      - name:',start+marker.length);
  assert.ok(start>=0&&end>start,'Exactly one bounded actual CI replay step');
  assert.equal(workflow.lastIndexOf(marker),start);
  const step=workflow.slice(start,end);
  assert.equal(sha(step),APPROVED_REGISTERED_CI_REPLAY_STEP_SHA256,'Changed CI commands or layout need explicit recipe review');
  assert.ok(step.startsWith(marker+'        run: |\n'));
  assert.ok(step.includes('          set -euo pipefail\n'));
  assert.ok(step.includes('readFileSync("supabase/release/requirements.json", "utf8")'));
  assert.ok(step.includes('const names = [...new Set(Object.values(requirements).map(row => row.check))].sort();'));
  assert.ok(step.includes("printf 'BEGIN READ ONLY;\\n'"));
  assert.ok(step.includes('cat "$check"'));
  assert.ok(step.includes("printf '\\nROLLBACK;\\n'"));
  assert.equal([...step.matchAll(/^          verify_registered$/gm)].length,1);
  assert.equal([...step.matchAll(/^            verify_registered$/gm)].length,1);
  const replayBlock='          for pass in 1 2; do\n'+
    '            for migration in '+replayPrefixes.map(prefix=>'supabase/migrations/'+prefix+'*.sql').join(' ')+'; do\n'+
    '              docker compose exec -T db psql -X -U postgres -v ON_ERROR_STOP=1 -q -f - < "$migration"\n'+
    '            done\n            verify_registered\n          done\n';
  assert.ok(step.includes(replayBlock),'Exact two date-glob passes and verification order');
  assert.ok(step.includes('          { cat '+indexPaths[0]+'; cat '+indexPaths[1]+'; }'));
  const readers=[...step.matchAll(/awk -F'\|' '([^'\n]*)'/g)].map(match=>match[1]);
  assert.equal(readers.length,2);
  for(const reader of readers){
    assert.ok(reader.includes('NF != 2 || $1 !~ /[^[:space:]]/ || $2 != "t"'));
    assert.ok(reader.includes('END { if (NR == 0)'));
    assert.ok(reader.endsWith('exit failed }'));
  }
  return {path:workflowPath,sha256:sha(workflow),recipe_step_sha256:sha(step),exact_bytes:true};
}

/** Strict nonempty id|t results, including the actual CI awk two-column gate. */
export function assertRegisteredCiRows(stdout,label) {
  assert.equal(typeof stdout,'string');
  const lines=(stdout.endsWith('\n')?stdout.slice(0,-1):stdout).split('\n');
  assert.ok(stdout.length&&lines.length,label+': no registered checks ran');
  for(const line of lines) {
    const cells=line.split('|');
    assert.equal(cells.length,2,label+': exact two-column release result');
    assert.ok(cells[0].trim(),label+': a nonempty check ID is required');
    assert.equal(cells[1],'t',label+': strict boolean success for '+cells[0]);
  }
  return lines.map(line=>line.split('|')[0]);
}

/**
 * Construction performs no SQL, Docker operations, file reads or allocations.
 * Only the already captured checked-in input manifest is accepted. The two
 * unregistered index footer files must also be explicitly captured before this
 * family can execute; no late read or private fallback is provided.
 */
export function createNativeRegisteredCiReplayControls({inputManifest,fixture,stage,receipt,checkpoint=async()=>{}}) {
  for(const name of ['readRelative','verify'])assert.equal(typeof inputManifest[name],'function');
  for(const name of ['assertOwned','snapshot'])assert.equal(typeof fixture[name],'function');
  assert.equal(typeof stage,'function');assert.equal(typeof checkpoint,'function');
  const manifest=inputManifest.manifest;
  assert.equal(manifest.external_private_inputs.length,0);
  const captured=new Map(manifest.entries.map(row=>[row.path,row]));
  assert.equal(captured.size,manifest.entries.length);
  function read(path) {
    const record=captured.get(path);assert.ok(record,'CI replay file must be captured: '+path);
    const text=inputManifest.readRelative(path);
    assert.equal(sha(text),record.sha256);assert.equal(Buffer.byteLength(text),record.bytes);
    return text;
  }
  const workflow=assertRegisteredCiWorkflowRecipe(read(workflowPath));
  const requirements=JSON.parse(read('supabase/release/requirements.json'));
  const chronology=inputManifest.migrations;
  assert.equal(chronology.length,106);
  const names=chronology.map(row=>row.path);
  assert.deepEqual([...names].sort(),names);assert.equal(new Set(names).size,names.length);
  for(const name of names)assert.match(name,migrationName);
  for(const [name,requirement]of Object.entries(requirements)) {
    assert.match(name,migrationName);assert.ok(names.includes(name),'Registered migration is absent: '+name);
    assert.ok(requirement&&typeof requirement==='object');assert.match(requirement.check,releaseName);
  }
  const checkNames=[...new Set(Object.values(requirements).map(row=>row.check))].sort();
  assert.ok(checkNames.length,'Nonempty exact registered check inventory');
  const checks=checkNames.map(name=>({path:'supabase/release/'+name,sql:read('supabase/release/'+name)}));
  const replays=chronology.filter(row=>replayPrefixes.some(prefix=>row.path.startsWith(prefix))).map(row=>{
    const sql=read('supabase/migrations/'+row.path);assert.equal(sha(sql),row.sha256);
    assert.equal(sql,row.sql);return{path:row.path,sql,sha256:row.sha256};
  });
  assert.ok(replays.length);assert.deepEqual(replays.map(row=>row.path),replays.map(row=>row.path).sort());
  // In these disjoint date groups, lexical date-prefix expansion and a single
  // sorted chronology have the same order as the proposed Bash glob loop.
  const globOrder=replayPrefixes.flatMap(prefix=>replays.filter(row=>row.path.startsWith(prefix)).map(row=>row.path));
  assert.deepEqual(globOrder,replays.map(row=>row.path));
  const indexSql=indexPaths.map(read).join('');
  const plan={schema:'wg-tv-native-registered-ci-replays-v3',workflow,registered_requirements:Object.keys(requirements).length,
    checks:checks.map(({path,sql})=>({path,sha256:sha(sql)})),replays:replays.map(({path,sha256})=>({path,sha256})),
    passes:2,registered_verification_rounds:3,
    index_footer:{paths:indexPaths,read_only:false,temporary_session_schema:true,mutations_rolled_back:true},
    exact_workflow_recipe:'verify_registered; two date-sorted replay passes each followed by verify_registered; exact concatenated War index/footer',
    registered_release_read_only_transactions:true,full_state_after_each_statement:true,
    expected_native_statements:checks.length*3+replays.length*2+1,passed:false};
  async function run() {
    assert.equal(receipt.registered_ci_replays,undefined,'CI replay family may execute once');
    receipt.registered_ci_replays={...plan,stages:[],passed:false};
    const proof=receipt.registered_ci_replays;
    await checkpoint('before registered CI replay family');await inputManifest.verify();fixture.assertOwned();
    const baseline=fixture.snapshot();
    async function execute(label,statement,kind,meta) {
      await checkpoint('registered CI '+label);fixture.assertOwned();
      const start=Date.now(),stdout=await stage('registered-ci:'+label,statement);
      const ids=kind==='release'||kind==='footer'?assertRegisteredCiRows(stdout,label):null;
      // Each statement is checked against the same complete native terminal
      // baseline, including tuples, saved/Auth/queue rows, all sequences,
      // helper schema/ACLs, roles and generated fields. No reset/remap occurs.
      assert.deepEqual(fixture.snapshot(),baseline,label+': whole terminal must remain unchanged');
      proof.stages.push({label,kind,...meta,sql_sha256:sha(statement),elapsed_ms:Date.now()-start,
        ...(ids?{ids,strict_boolean_checks:ids.length,read_only:kind==='release'}:{}),
        ...(kind==='footer'?{schema_temp_scope:true,mutations_rolled_back:true}:{}),full_state_preserved:true});
      await checkpoint('after registered CI '+label);
    }
    async function verify(round) {
      for(const check of checks)await execute('verify-'+round+':'+check.path,
        'BEGIN READ ONLY;\n'+check.sql+'\nROLLBACK;\n','release',{round,path:check.path});
    }
    await verify(0);
    for(const pass of [1,2]) {
      for(const replay of replays)await execute('pass-'+pass+':'+replay.path,replay.sql,'migration',{pass,path:replay.path});
      await verify(pass);
    }
    // Preserve the workflow footer's ordinary same-session execution exactly.
    // The index creates temporary objects; the regression deliberately deletes
    // and edits an actual War row within its own BEGIN/ROLLBACK capsules. An
    // outer read-only transaction would be wrong. Only the full post-session
    // native snapshot may establish that every permanent mutation rolled back.
    await execute('war-index-regression-footer',indexSql,'footer',{paths:indexPaths});
    assert.equal(proof.stages.length,plan.expected_native_statements);
    await inputManifest.verify();assert.deepEqual(fixture.snapshot(),baseline);
    proof.baseline_sha256=baseline.sha256;proof.passed=true;
    proof.scope='Actual generic workflow checks/replays only; this does not replace any mandatory native negative, allocation, writer or history family.';
    return proof;
  }
  return {plan,run};
}
