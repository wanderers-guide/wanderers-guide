import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {captureNativeInputManifest} from './treasure-vault-native-input-manifest.mjs';
import {assertRegisteredCiRows,assertRegisteredCiWorkflowRecipe,createNativeRegisteredCiReplayControls} from './treasure-vault-native-registered-ci-replays.mjs';
import {assertRequiredNativeEvidence,parseNativeOptions,REQUIRED_NATIVE_OBLIGATIONS} from './treasure-vault-native-safety.mjs';
import {SOURCE_CORRECTION_CONTROL_NAMES} from './treasure-vault-native-source-corrections.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=text=>createHash('sha256').update(text).digest('hex');
const captured=await captureNativeInputManifest({root});
const footerPaths=['supabase/release/war-of-immortals-index.sql','supabase/release/war-of-immortals-index-regression.sql'];
const workflowPath='.github/workflows/e2e.yml';
const forbidden=()=>{throw new Error('Constructor model cannot execute SQL, Docker, allocations or native snapshots');};
const constructorContext={inputManifest:captured,fixture:{assertOwned:forbidden,snapshot:forbidden},stage:forbidden,receipt:{},checkpoint:forbidden};

/** Mutation inputs are actual captured checked-in bytes. No candidates or private ledger fallback. */
function withText(path,text,{recomputeHash=true}={}) {
  return {...captured,manifest:{...captured.manifest,entries:captured.manifest.entries.map(row=>row.path===path&&recomputeHash?{path,bytes:Buffer.byteLength(text),sha256:sha(text)}:row)},
    readRelative:target=>target===path?text:captured.readRelative(target)};
}

/** These objects model the orchestration boundary, not PostgreSQL or native success. */
function executionModel({badResultAt=null,badStdoutAt=null,mutateSnapshotAt=null,failStageAt=null}={}) {
  const receipt={},calls=[];
  const state={tuples:{'public.item':'1:'+ 'a'.repeat(32),'auth.users':'1:'+ 'b'.repeat(32),'public.character':'1:'+ 'c'.repeat(32)},
    sequences:{'public.item_id_seq':{last_value:'1',is_called:true,increment:'1',cache:'1',cycle:false}},schema_sha256:'d'.repeat(64),roles_sha256:'e'.repeat(64)};
  const baseline={...state,sha256:sha(JSON.stringify(state))};
  let snapshots=0;
  const fixture={assertOwned:()=>{},snapshot:()=>{
    snapshots++;const value=structuredClone(baseline);if(mutateSnapshotAt?.at===snapshots)mutateSnapshotAt.change(value);return value;
  }};
  const inputManifest={...captured,verify:async()=>({model_only:true})};
  const stage=async(name,sql)=>{
    if(calls.length===failStageAt)throw new Error('Model native transport failure');
    calls.push({name,sql,status:0,signal:null,passed:true,sql_sha256:sha(sql)});
    if(calls.length===badStdoutAt?.at)return badStdoutAt.stdout;
    return calls.length===badResultAt?'check|f':sql.startsWith('BEGIN READ ONLY;')||name.endsWith('war-index-regression-footer')?'check|t':'';
  };
  const family=createNativeRegisteredCiReplayControls({inputManifest,fixture,stage,receipt});
  return{family,receipt,calls};
}

/** Model of separately asserted receipt fields, not PostgreSQL execution evidence. */
function otherFamilyModel({proof,calls}) {
  const metadata=Array.from({length:113},(_,index)=>({name:index===0?'reject-leakproof-metadata':index===1?'execute-supabase_read_only_user':'model-'+index,phase:'100',passed:true,full_state_preserved:true,
    actual_signal:null,no_transport_error:true,actual_exit_status:0,sql_kind:index===1?'privilege':'release',setup_login:index<2?'supabase_admin':'postgres',execution_role:index===1?'supabase_read_only_user':'postgres'}));
  return{input_manifest:captured.manifest,source_corrections:{passed:true,native_executed:true,owner_ids:[11937,11944,12325],controls:SOURCE_CORRECTION_CONTROL_NAMES.map(name=>{const rejects=/^(?:changed-old-helper-rejection|mixed-successor-[1-6]|unreviewed-field-(?:11937|11944|12325)|pending-curator|late-failure-full-rollback)$/.test(name);return{name,passed:true,full_state_preserved:true,no_transport_error:true,actual_signal:null,actual_exit_status:rejects?3:0,...(rejects?{sqlstate:'P0001'}:{})};})},fresh_native_ledger_verified:{catalog:2349,sources:31,templates:11,all_native_digests_reproduced:true},
    historical023_fresh_import_capsule:{passed:true},historical14_verified:{historical14:true,independent_complete_owner_projection:true,full_unrelated_saved_source_queue_preservation:true},
    shared_helper_pending_alias_verified:{both_terminals_complete:true,required_terminals:['100','101']},
    native_writer_controls:['before100','before101'].map(phase=>({phase,passed:true,cases:Array(6).fill({}),full_tuples_saved_auth_queue_schema_roles_restored:true,all_other_sequences_unchanged:true})),
    alternate_allocation_controls:[{passed:true,authentic_second_fixture:true,generated_id_mapping:false,sequence_reset:false,token_boundary:{passed:true,physical_native_prefix_allocation_claimed:false}}],
    alternate_fixture:{passed:true,cleaned_only_owned_containers_and_volumes:true,positive_only_chronology:true,negative_suite_repeated:false,registered_ci_replays:proof,stages:calls},
    shared_history:{own_stage:Array.from({length:39},()=>({passed:true,original_and_wrapped_values_equal:true,replay_full_state_preserved:true})),
      terminal:['100','101'].map(phase=>({phase,passed:true,historical_migrations:39,completion100_wrapper:1})),
      metadata_authorities:['postgres','supabase_admin'].map(login=>({login,phase:'100',actual_exit_status:0,actual_signal:null,no_transport_error:true,full_state_preserved:true})),metadata}};
}

test('Construction only: actual workflow/footer bytes and every registered replay input are captured',()=>{
  assert.equal(captured.manifest.schema,'wg-tv-native-checked-in-input-manifest-v1');
  assert.deepEqual(captured.manifest.registered_ci_paths,[workflowPath,...footerPaths]);
  assert.deepEqual(captured.manifest.external_private_inputs,[]);
  assert.equal(captured.migrations.length,108);
  assert.equal(captured.migrations.at(-1).path,'20261008110000_treasure_vault_source_corrections.sql');
  const {plan}=createNativeRegisteredCiReplayControls(constructorContext);
  assert.equal(plan.registered_requirements,101);assert.equal(plan.checks.length,64);assert.equal(plan.replays.length,89);assert.equal(plan.expected_native_statements,371);
  assert.equal(plan.passed,false);assert.equal(constructorContext.receipt.registered_ci_replays,undefined);
  assert.equal(plan.workflow.sha256,sha(captured.readRelative(workflowPath)));
  assert.ok(plan.workflow.exact_bytes);assert.deepEqual(plan.index_footer.paths,footerPaths);assert.equal(plan.index_footer.read_only,false);
  assert.ok(plan.checks.some(row=>row.path==='supabase/release/weapon-stat-fields.sql'));
  assert.equal(plan.checks.filter(row=>row.path==='supabase/release/content-selection-rules.sql').length,1);
  assert.equal(plan.replays.some(row=>row.path==='20261005000000_repair_content_selection_rules.sql'),false,'Preserve the exact reviewed replay date groups');
  assert.deepEqual(['20260927','20260928','20260929','20260930','20261001','20261002'].map(prefix=>plan.replays.filter(row=>row.path.startsWith(prefix)).length),[25,3,15,3,27,16]);
});

test('Construction only: changed CI commands/layout and missing/drifted captured files reject',()=>{
  const workflow=captured.readRelative(workflowPath);
  const marker='      - name: Verify and replay registered content repairs\n';
  const start=workflow.indexOf(marker),end=workflow.indexOf('\n      - name:',start+marker.length);
  assert.ok(start>=0&&end>start);const step=workflow.slice(start,end);
  for(const [before,after]of [
    ['for pass in 1 2; do','for pass in 1; do'],['20261002*.sql','20261001*.sql'],
    ["printf 'BEGIN READ ONLY;\\n'","printf 'BEGIN;\\n'"],
    ['NF != 2 || $1 !~ /[^[:space:]]/ || $2 != "t"','NF != 2 || $2 != "t"'],
    ['exit failed }','exit 0 }'],['cat supabase/release/war-of-immortals-index-regression.sql','true'],
    ['        run: |','        run: >'],['set -euo pipefail','set -eu'],
  ]){
    assert.ok(step.includes(before));const changed=workflow.slice(0,start)+step.replace(before,after)+workflow.slice(end);
    assert.throws(()=>assertRegisteredCiWorkflowRecipe(changed));
    assert.throws(()=>createNativeRegisteredCiReplayControls({...constructorContext,inputManifest:withText(workflowPath,changed)}));
  }
  for(const path of [workflowPath,...footerPaths])assert.throws(()=>createNativeRegisteredCiReplayControls({...constructorContext,inputManifest:{...captured,
    manifest:{...captured.manifest,entries:captured.manifest.entries.filter(row=>row.path!==path)}}}),/must be captured/);
  assert.throws(()=>createNativeRegisteredCiReplayControls({...constructorContext,inputManifest:withText(footerPaths[0],captured.readRelative(footerPaths[0])+'\n',{recomputeHash:false})}));
});

test('Reader models require exact nonempty two-column true results, not blank/false/null/status labels',()=>{
  assert.deepEqual(assertRegisteredCiRows('first|t\nsecond|t\n','model'),['first','second']);
  for(const value of ['', '\n', '|t\n', ' \t|t\n', '\nfirst|t\n', 'first|t\n\n', 'first|f\n', 'first|\n', 'first|null\n',
    'first|NULL\n', 'first|true\n', 'first| t\n', 'first|t \n', 'first|T\n', 'first|t|extra\n', 'BEGIN\nfirst|t\n'])assert.throws(()=>assertRegisteredCiRows(value,'model'));
});

test('Orchestration model sends exact371 statements in CI order; footer uses direct cat bytes and ordinary session',async()=>{
  const model=executionModel(),proof=await model.family.run();
  assert.equal(proof.passed,true);assert.equal(model.calls.length,371);
  const expected=[];
  const verify=round=>{for(const check of model.family.plan.checks)expected.push({name:'registered-ci:verify-'+round+':'+check.path,sql:'BEGIN READ ONLY;\n'+captured.readRelative(check.path)+'\nROLLBACK;\n'});};
  verify(0);for(const pass of [1,2]){for(const replay of model.family.plan.replays)expected.push({name:'registered-ci:pass-'+pass+':'+replay.path,sql:captured.readRelative('supabase/migrations/'+replay.path)});verify(pass);}
  expected.push({name:'registered-ci:war-index-regression-footer',sql:footerPaths.map(path=>captured.readRelative(path)).join('')});
  assert.deepEqual(model.calls.map(({name,sql})=>({name,sql})),expected);
  assert.equal(proof.stages.at(-1).read_only,false);assert.equal(proof.stages.at(-1).schema_temp_scope,true);
  assert.equal(proof.stages.at(-1).mutations_rolled_back,true);
  await assert.rejects(()=>model.family.run(),/execute once/);
});

test('Orchestration models do not complete on result rejection, transport failure or any full snapshot drift',async()=>{
  for(const options of [{badResultAt:1},{failStageAt:0},
    {badStdoutAt:{at:1,stdout:'\ncheck|t\n'}},{badStdoutAt:{at:1,stdout:'check|t\n\n'}},
    {mutateSnapshotAt:{at:2,change:row=>{row.schema_sha256='f'.repeat(64);}}},
    {mutateSnapshotAt:{at:2,change:row=>{row.roles_sha256='f'.repeat(64);}}},
    {mutateSnapshotAt:{at:2,change:row=>{row.tuples['public.character']='0:'+'f'.repeat(32);}}},
    {mutateSnapshotAt:{at:2,change:row=>{row.sequences['public.item_id_seq'].last_value='2';}}},
  ]){const model=executionModel(options);await assert.rejects(()=>model.family.run());assert.equal(model.receipt.registered_ci_replays.passed,false);}
});

test('Receipt models require fresh completed371-stage evidence and all eight native obligations',async()=>{
  const model=executionModel(),proof=await model.family.run(),baseline=otherFamilyModel({proof,calls:model.calls});
  assert.equal(REQUIRED_NATIVE_OBLIGATIONS.length,8);
  assert.equal(assertRequiredNativeEvidence(baseline).length,8);
  for(const mutate of [
    row=>{delete row.alternate_fixture.registered_ci_replays;},row=>{row.alternate_fixture.registered_ci_replays.passed=false;},
    row=>{row.alternate_fixture.registered_ci_replays.stages.pop();},row=>{row.alternate_fixture.registered_ci_replays.stages[1].label=row.alternate_fixture.registered_ci_replays.stages[0].label;},
    row=>{row.alternate_fixture.stages[0].status=3;},row=>{row.alternate_fixture.stages[0].signal='SIGTERM';},row=>{row.alternate_fixture.stages[0].passed=false;},
    row=>{row.alternate_fixture.registered_ci_replays.stages[0].full_state_preserved=false;},row=>{row.alternate_fixture.registered_ci_replays.workflow.recipe_step_sha256='f'.repeat(64);},
    row=>{row.alternate_fixture.registered_ci_replays.workflow.sha256='f'.repeat(64);},row=>{row.alternate_fixture.registered_ci_replays.stages[0].ids=[''];},
    row=>{row.registered_ci_replays={passed:true};},row=>{row.alternate_fixture.cleaned_only_owned_containers_and_volumes=false;},
    row=>{row.fresh_native_ledger_verified.catalog=2348;},row=>{row.native_writer_controls.pop();},row=>{row.shared_helper_pending_alias_verified.both_terminals_complete=false;},
    row=>{delete row.source_corrections;},row=>{row.source_corrections.passed=false;},row=>{row.source_corrections.controls.pop();},row=>{row.source_corrections.controls[0].actual_signal='SIGTERM';},row=>{row.source_corrections.controls.find(control=>control.name==='pending-curator').actual_exit_status=0;},row=>{row.source_corrections.controls.find(control=>control.name==='pending-curator').sqlstate='57014';},
  ]){const changed=structuredClone(baseline);mutate(changed);assert.throws(()=>assertRequiredNativeEvidence(changed));}
});

test('Integration source model executes recipe once after alternate chronology, never through focused negative selection',()=>{
  const alternate=captured.readRelative('scripts/treasure-vault-native-alternate-fixture.mjs');
  assert.equal(alternate.split('await registeredCi.run();').length,2);
  const chronologyEnd=alternate.indexOf('assert.equal(chronology.length,108)'),run=alternate.indexOf('await registeredCi.run();'),verify=alternate.indexOf('evidence.final_input_verification=');
  assert.ok(chronologyEnd>=0&&run>chronologyEnd&&verify>run);
  assert.doesNotMatch(alternate,/selectedNegativeFiles/);
  assert.ok(alternate.includes("await stop.checkpoint('alternate after '+name);return result.stdout;"),'Exact CI reader receives raw stdout');
  assert.doesNotMatch(alternate,/return result\.stdout\.trim\(\)/,'Boundary trim must not mask blank rows rejected by CI');
  assert.equal(captured.manifest.native_modules.includes('scripts/treasure-vault-native-registered-ci-replays.mjs'),true);
});

/** Exercise the actual single reporting assignment only, never native execution or cleanup. */
test('Receipt reporting model never labels focused negative coverage as full native execution',()=>{
  const safety=captured.readRelative('scripts/treasure-vault-native-safety.mjs');
  const assignments=safety.match(/^[ \t]*receipt\.full_native_execution_complete\s*=\s*[^\r\n]+;$/gm)??[];
  assert.equal(assignments.length,1,'Exactly one success-path completion report');
  const report=new Function('receipt','selectedNegativeFiles','releaseScope',assignments[0]);
  const filename='20261002100000_treasure_vault_complete_catalog.sql';
  const display='20261002101000_treasure_vault_complete_display.sql';
  for(const {args,full}of [{args:[],full:true},{args:['--release'],full:false},{args:['--only-negative='+filename],full:false},{args:['--only-negative='+filename+','+display],full:false}]){
    const {selectedNegativeFiles,releaseScope}=parseNativeOptions(args,root);
    const before={passed:true,cleaned_only_owned_containers_and_volumes:true,execution_family_proofs:['unchanged'],full_native_execution_complete:false};
    const receipt=structuredClone(before);report(receipt,selectedNegativeFiles,releaseScope);
    assert.deepEqual(receipt,{...before,full_native_execution_complete:full},'Only the full-coverage label changes; scoped pass, cleanup and family evidence remain intact');
  }
  const reportPosition=safety.indexOf(assignments[0]);
  const evidencePosition=safety.indexOf('receipt.execution_family_proofs=assertRequiredNativeEvidence(receipt);');
  assert.ok(evidencePosition>=0&&evidencePosition<reportPosition,'Required-family aggregation still precedes the success report');
  assert.ok(safety.indexOf('receipt.passed = true;',reportPosition)>reportPosition);
});

test('Release scope cannot be combined with arbitrary file filtering',()=>{
  const file='--only-negative=20261002100000_treasure_vault_complete_catalog.sql';
  for(const args of [['--release',file],[file,'--release'],['--release','--release']])assert.throws(()=>parseNativeOptions(args,root),{name:'AssertionError'});
});
