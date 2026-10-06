import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { open, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTreasureVaultDefaultNativeInputs } from './treasure-vault-native-inputs.mjs';
import { createNativeNegativeGroups, originalNativeBatches } from './treasure-vault-native-negatives.mjs';
import { createOwnedNativeFixture } from './treasure-vault-native-fixture.mjs';
import { createNativePhaseRunner } from './treasure-vault-native-phases.mjs';
import { createAuthenticSharedHistoryControls } from './treasure-vault-native-history.mjs';
import { createAuthenticDualExporter } from './treasure-vault-native-ledger.mjs';
import { createNativeStopController, finalizeNativeStopReceipt } from './treasure-vault-native-stop.mjs';
import { captureNativeInputManifest } from './treasure-vault-native-input-manifest.mjs';
import { createHistoricalPositiveProjections } from './treasure-vault-native-positive-projections.mjs';
import { createHistorical023FreshImportCapsule } from './treasure-vault-native-fresh-equipment.mjs';
import { createSharedHelperPendingAliasControls } from './treasure-vault-native-pending-aliases.mjs';
import { runNativeWriterOrdering } from './treasure-vault-native-writers.mjs';
import { runAlternateAllocations } from './treasure-vault-native-allocations.mjs';
import { createAuthenticAlternateFixtureDriver } from './treasure-vault-native-alternate-fixture.mjs';
import { APPROVED_REGISTERED_CI_REPLAY_STEP_SHA256 } from './treasure-vault-native-registered-ci-replays.mjs';
import { nativeDiagnostic } from './treasure-vault-native-diagnostics.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const completionPath = '20261002100000_treasure_vault_complete_catalog.sql';
const displayPath = '20261002101000_treasure_vault_complete_display.sql';

/**
 * Implementation membership is not execution evidence. Every named family
 * must produce fresh independently validated receipts before default success.
 * There is no candidate/old receipt/private path fallback.
 */
export const REQUIRED_NATIVE_OBLIGATIONS = Object.freeze([
  {name:'fresh-postgresql-dual-ledger',implemented:true,reason:'Fresh actual-row PostgreSQL derivation and exact loader verifier, never an embedded prior receipt.'},
  {name:'historical023-fresh-four-insert-bootstrap',implemented:true,reason:'Genuine own-stage rollback import, independent four typed literals and explicit native identity consumption.'},
  {name:'alternate101-allocation-and-full-token-prefix',implemented:true,reason:'Second authentic106 positive chronology and full11 allocated bindings; the separate lexical prefix proof is not a fabricated physical allocation.'},
  {name:'concurrent-writer-and-count-phantom-ordering',implemented:true,reason:'Actual persistent two-session positive bodies, observed native locks/PIDs and exact55P03/script-exit3.'},
  {name:'shared-helper-all-pending-alias-routes',implemented:true,reason:'Mandatory structural pending-route matrix at both terminals using real GoTrue, full rollback and exact script evidence.'},
  {name:'historical14-exact-approved-positive-projection',implemented:true,reason:'Independent complete before/after approved leaf projections, actual allocations and full unrelated/saved/source preservation.'},
  {name:'exact-registered-CI-replay-recipe',implemented:true,reason:'Captured actual workflow/registered files and same-session footer, once after alternate positive chronology with full preservation and exact current input verification.'},
]);

/** Fail closed unless every required fresh native family actually completed. */
export function assertRequiredNativeEvidence(receipt) {
  assert.deepEqual(receipt.fresh_native_ledger_verified,{catalog:2349,sources:31,templates:11,all_native_digests_reproduced:true});
  assert.equal(receipt.historical023_fresh_import_capsule?.passed,true);
  assert.deepEqual(receipt.historical14_verified,{historical14:true,independent_complete_owner_projection:true,full_unrelated_saved_source_queue_preservation:true});
  assert.equal(receipt.shared_helper_pending_alias_verified?.both_terminals_complete,true);
  assert.deepEqual(receipt.shared_helper_pending_alias_verified.required_terminals,['100','101']);
  const writers=receipt.native_writer_controls??[];
  assert.equal(writers.length,2);assert.deepEqual(writers.map(row=>row.phase).sort(),['before100','before101']);
  assert.ok(writers.every(row=>row.passed===true&&row.cases.length===6&&row.full_tuples_saved_auth_queue_schema_roles_restored===true&&row.all_other_sequences_unchanged===true));
  const alternate=receipt.alternate_allocation_controls??[];assert.equal(alternate.length,1);
  assert.equal(alternate[0].passed,true);assert.equal(alternate[0].authentic_second_fixture,true);
  assert.equal(alternate[0].generated_id_mapping,false);assert.equal(alternate[0].sequence_reset,false);
  assert.equal(alternate[0].token_boundary.passed,true);assert.equal(alternate[0].token_boundary.physical_native_prefix_allocation_claimed,false);
  assert.equal(receipt.alternate_fixture?.passed,true);assert.equal(receipt.alternate_fixture.cleaned_only_owned_containers_and_volumes,true);
  assert.equal(receipt.alternate_fixture.positive_only_chronology,true);assert.equal(receipt.alternate_fixture.negative_suite_repeated,false);
  assert.equal(receipt.shared_history.own_stage.length,39);assert.equal(receipt.shared_history.terminal.length,2);
  assert.ok(receipt.shared_history.own_stage.every(row=>row.passed===true&&row.original_and_wrapped_values_equal===true&&row.replay_full_state_preserved===true));
  assert.deepEqual(receipt.shared_history.terminal.map(row=>row.phase).sort(),['100','101']);
  assert.ok(receipt.shared_history.terminal.every(row=>row.passed===true&&row.historical_migrations===39&&row.completion100_wrapper===1));
  const authorities=receipt.shared_history.metadata_authorities??[];
  assert.equal(authorities.length,2);
  assert.deepEqual(authorities.map(row=>row.login).sort(),['postgres','supabase_admin']);
  assert.ok(authorities.every(row=>row.phase==='100'&&row.actual_exit_status===0&&row.actual_signal===null&&row.no_transport_error===true&&row.full_state_preserved===true));
  const metadata=receipt.shared_history.metadata;
  assert.equal(metadata.length,113);assert.equal(new Set(metadata.map(row=>row.name)).size,113);
  assert.ok(metadata.every(row=>row.phase==='100'&&row.passed===true&&row.full_state_preserved===true&&row.actual_signal===null&&row.no_transport_error===true&&row.actual_exit_status===(row.sql_kind==='sql-rejection'?3:0)));
  const privileged=metadata.filter(row=>row.setup_login==='supabase_admin');
  assert.equal(privileged.length,2);
  assert.deepEqual(privileged.map(row=>row.name).sort(),['execute-supabase_read_only_user','reject-leakproof-metadata']);
  const leakproof=privileged.find(row=>row.name==='reject-leakproof-metadata');assert.equal(leakproof.execution_role,'postgres');
  const verifier=privileged.find(row=>row.name==='execute-supabase_read_only_user');assert.equal(verifier.execution_role,'supabase_read_only_user');assert.equal(verifier.sql_kind,'privilege');
  assert.ok(metadata.filter(row=>!privileged.includes(row)).every(row=>row.setup_login==='postgres'));
  const ci=receipt.alternate_fixture.registered_ci_replays;
  assert.equal(ci?.schema,'wg-tv-native-registered-ci-replays-v3');assert.equal(ci.passed,true);
  assert.equal(ci.registered_requirements,99);assert.equal(ci.checks.length,62);assert.equal(ci.replays.length,89);
  assert.equal(ci.passes,2);assert.equal(ci.registered_verification_rounds,3);assert.equal(ci.expected_native_statements,365);
  assert.equal(ci.stages.length,365);assert.equal(new Set(ci.stages.map(row=>row.label)).size,365);
  assert.equal(ci.workflow.path,'.github/workflows/e2e.yml');assert.equal(ci.workflow.exact_bytes,true);
  const workflow=receipt.input_manifest.entries.find(row=>row.path===ci.workflow.path);
  assert.ok(workflow);assert.equal(ci.workflow.sha256,workflow.sha256);
  assert.equal(ci.workflow.recipe_step_sha256,APPROVED_REGISTERED_CI_REPLAY_STEP_SHA256);
  assert.equal(ci.registered_release_read_only_transactions,true);assert.equal(ci.full_state_after_each_statement,true);
  assert.match(ci.baseline_sha256,/^[a-f0-9]{64}$/);
  const nativeCiStages=receipt.alternate_fixture.stages.filter(row=>row.name.startsWith('registered-ci:'));
  assert.equal(nativeCiStages.length,365);assert.equal(new Set(nativeCiStages.map(row=>row.name)).size,365);
  const actualStages=new Map(receipt.alternate_fixture.stages.map(row=>[row.name,row]));
  for(const row of ci.stages){
    assert.equal(row.full_state_preserved,true);
    const actual=actualStages.get('registered-ci:'+row.label);assert.ok(actual);
    assert.equal(actual.sql_sha256,row.sql_sha256);assert.equal(actual.status,0);assert.equal(actual.signal,null);assert.equal(actual.passed,true);
  }
  assert.deepEqual(ci.stages.filter(row=>row.kind==='release').map(row=>row.round),[...Array(62).fill(0),...Array(62).fill(1),...Array(62).fill(2)]);
  assert.ok(ci.stages.filter(row=>row.kind==='release').every(row=>row.read_only===true&&row.strict_boolean_checks>0&&Array.isArray(row.ids)&&row.ids.length===row.strict_boolean_checks&&row.ids.every(id=>typeof id==='string'&&id.trim())));
  assert.deepEqual(ci.stages.filter(row=>row.kind==='migration').map(row=>row.pass),[...Array(89).fill(1),...Array(89).fill(2)]);
  assert.deepEqual(ci.stages.filter(row=>row.kind==='footer').map(row=>({paths:row.paths,read_only:row.read_only,schema_temp_scope:row.schema_temp_scope,mutations_rolled_back:row.mutations_rolled_back})),
    [{paths:['supabase/release/war-of-immortals-index.sql','supabase/release/war-of-immortals-index-regression.sql'],read_only:false,schema_temp_scope:true,mutations_rolled_back:true}]);
  assert.equal(receipt.registered_ci_replays,undefined,'Generic CI replay runs only once, in the positive-only alternate fixture');
  return REQUIRED_NATIVE_OBLIGATIONS.map(row=>({name:row.name,implemented:true,fresh_native_evidence_verified:true}));
}

/** Pure plan: explicit membership/chronology, never glob-skip unknown or future migrations. */
export function buildNativeVerificationPlan({inputs,files,selectedNegativeFiles = null}) {
  assert.equal(inputs.input_provenance.mode, 'checked-in-default');
  assert.equal(files.length, 106, 'Exact reviewed complete CI chronology');
  assert.deepEqual([...files].sort(), files);
  assert.equal(new Set(files).size, files.length);
  assert.ok(files.includes('20261001010000_repair_weapon_stat_fields.sql'));
  for (const path of [inputs.helper.path,completionPath,displayPath]) assert.ok(files.includes(path));
  const firstWrapper = inputs.actualWrapperMetadata.map(row => row.path).sort()[0];
  assert.ok(inputs.helper.path < firstWrapper);
  assert.equal(inputs.actualWrapperMetadata.length, 39);
  const originalBatches = originalNativeBatches(inputs);
  const allowedNegativeFiles = new Set([...Object.values(originalBatches).map(row => row.path),completionPath,displayPath]);
  if (selectedNegativeFiles) for (const path of selectedNegativeFiles) assert.ok(allowedNegativeFiles.has(path), 'Unknown --only-negative migration ' + path);
  return {
    mode:'checked-in-default',chronology:files,original_bodies_verified:39,actual_history_wrappers:39,
    actual_completion_wrapper:completionPath,actual_display:displayPath,helper:inputs.helper.path,
    negative_scope:selectedNegativeFiles ? {mode:'focused',files:[...selectedNegativeFiles].sort(),reduced_negative_coverage:true} : {mode:'full',reduced_negative_coverage:false},
    mandatory_common_history:{both_terminals:true,wrappers:40,metadata:true,War34_original_booleans:true},
    required_obligations:REQUIRED_NATIVE_OBLIGATIONS,
    missing_coverage:REQUIRED_NATIVE_OBLIGATIONS.filter(row => !row.implemented).map(row => row.name),
    private_external_inputs:[],coverage_complete:false,
  };
}

/** Execute only after reviewer approval; implementation presence never grants a pass. */
export async function executeNativeBase({root,inputs,migrations,inputManifest,output,selectedNegativeFiles = null,receipt,log,stop}) {
  assert.equal(typeof output, 'string');
  assert.equal(typeof stop.checkpoint, 'function');
  assert.equal(typeof inputManifest.verify,'function');
  const fixture = createOwnedNativeFixture({root,receipt,log,bootstrapRead:inputManifest.readRelative,throwIfRequested:stop.throwIfRequested});
  let phase = 'fixture-bootstrap';
  async function stage(name, statement) {
    await stop.checkpoint('before '+name);
    phase = name; const start = Date.now(), result = fixture.sql(statement, true);
    const row = {name,sql_sha256:sha(statement),bytes:Buffer.byteLength(statement),elapsed_ms:Date.now()-start,status:result.status,signal:result.signal,stderr:fixture.redact(result.stderr),passed:result.status===0&&result.signal===null&&result.error==null};
    receipt.stages.push(row); log({kind:'stage',...row});
    await stop.checkpoint('after '+name);
    assert.equal(result.error==null,true);assert.equal(result.signal,null);assert.equal(result.status, 0, name + ': ' + fixture.redact(result.stderr));
    return result.stdout.trim();
  }
  try {
    receipt.starting_input_verification=await inputManifest.verify();
    await fixture.initialize(stage);
    const userId = fixture.signup();
    fixture.savedCopyFixture(userId);
    const phases = createNativePhaseRunner({fixture,receipt,stage,selectedNegativeFiles,checkpoint:stop.checkpoint,log});
    const negatives = createNativeNegativeGroups({inputs,userId,reserveProposalId:fixture.reserveProposalId,reserveContentId:fixture.reserveContentId,readState:fixture.readState,queryJson:fixture.queryJson});
    const history = createAuthenticSharedHistoryControls({inputs,query:fixture.query,sql:fixture.sql,sqlAsAdmin:fixture.sqlAsAdmin,stateDigest:fixture.stateDigest,receipt,stage,checkpoint:stop.checkpoint});
    const exporter = createAuthenticDualExporter({contract:inputs.contract,completion:inputs.completion,display:inputs.display,query:fixture.query,output,receipt,verifyHistoricalFiles:inputs.verifyHistoricalFiles,checkpoint:stop.checkpoint});
    const positives=createHistoricalPositiveProjections({inputs,fixture,receipt});
    const fresh023=createHistorical023FreshImportCapsule({inputs,fixture,receipt,checkpoint:stop.checkpoint});
    const aliases=createSharedHelperPendingAliasControls({inputs,userId,reserveProposalId:fixture.reserveProposalId,queryJson:fixture.queryJson,receipt});
    async function pendingAtTerminal(terminal) {
      const plan=aliases.atTerminal(terminal);
      await phases.negatives(plan,{mandatory:true});
      for(const recipe of plan.positiveCases){await stop.checkpoint('pending positive '+terminal+':'+recipe.name);aliases.positive(recipe,fixture);await stop.checkpoint('after pending positive '+recipe.name);}
    }
    phases.strictReleaseEdges(negatives.strictReleaseEdges);
    const originalBatches = originalNativeBatches(inputs);
    const originalPaths = new Set(Object.values(originalBatches).filter(row => row !== originalBatches.equipment).map(row => row.path));
    for (const migration of migrations) {
      await stop.checkpoint('chronology '+migration.path);
      phase = migration.path;
      if (migration.path === completionPath) {
        await phases.negatives(negatives.beforeCompletion());
        await stop.checkpoint('actual writer family before100');
        await runNativeWriterOrdering({inputs,fixture,phase:'before100',userId,receipt});
        await exporter.capture('before100');
        await stage('actual100-wrapper-positive', inputs.completionWrapper.sql);
        await phases.readOnly(inputs.completionWrapper);
        await exporter.capture('100');
        history.status({recognized:true,passed:true});
        await phases.replay(inputs.completionWrapper);
        await history.terminalPhase('100');
        await history.metadataControls('100');
        await pendingAtTerminal('100');
        await phases.knownQueueLifecycle(negatives.knownQueueLifecycle('100'));
      } else if (migration.path === displayPath) {
        await phases.negatives(negatives.beforeDisplay());
        await stop.checkpoint('actual writer family before101');
        await runNativeWriterOrdering({inputs,fixture,phase:'before101',userId,receipt});
        await stage('actual101-positive', inputs.display.sql);
        await phases.readOnly(inputs.display);
        await exporter.capture('101');
        history.status({recognized:true,passed:true});
        await phases.replay(inputs.display);
        await history.terminalPhase('101');
        await pendingAtTerminal('101');
        await phases.knownQueueLifecycle(negatives.knownQueueLifecycle('101'));
      } else if (migration.path === inputs.helper.path) {
        await stage('actual-terminal-helper-install', inputs.helper.sql);
        assert.equal(history.status().recognized, false);
        await phases.readOnly(inputs.helper);
        await phases.replay(inputs.helper, 'installer-replay');
      } else {
        if (originalPaths.has(migration.path)) await phases.negatives(negatives.beforeOriginal(migration.path));
        if(migration.path===fresh023.path)await fresh023.run();
        const projection=positives.paths.includes(migration.path)?positives.capture(migration.path):null;
        const wrapper = inputs.actualWrapperMetadata.find(row => row.path === migration.path);
        if (wrapper) await history.ownStage(wrapper);
        else await stage(migration.path, migration.sql);
        if(projection){await stop.checkpoint('independent projection '+migration.path);projection.verify();}
        if (originalPaths.has(migration.path)) await phases.after(negatives.afterOriginal(migration.path));
      }
    }
    assert.equal(receipt.shared_history.own_stage.length, 39);
    assert.equal(receipt.shared_history.terminal.length, 2);
    const freshLedger = await exporter.finish();
    receipt.fresh_native_ledger_verified = await inputs.verifyFreshNativeLedger(freshLedger);
    receipt.historical14_verified=positives.complete();
    receipt.shared_helper_pending_alias_verified=aliases.complete();
    await history.commonNegatives();
    await stop.checkpoint('authentic alternate allocation fixture');
    const withAlternateFixture=createAuthenticAlternateFixtureDriver({root,inputs,migrations,inputManifest,receipt,log,stop});
    await runAlternateAllocations({inputs,fixture,withAlternateFixture,primaryChronology:migrations.map(({path,sha256})=>({path,sha256})),receipt});
    await inputs.verifyHistoricalFiles(inputs.contract.historical_files);
    assert.equal(fixture.query('select count(*) from public.content_update;'), '0');
    receipt.execution_family_proofs=assertRequiredNativeEvidence(receipt);
    receipt.full_native_execution_complete = selectedNegativeFiles === null;
    receipt.final_state = fixture.snapshot();
    receipt.final_input_verification=await inputManifest.verify();
    receipt.missing_coverage = [];
    receipt.limits=['Exact known private curator-body-present acceptance is untested because sanitized CI intentionally excludes those bodies. Absence/removal and incorrect-present rejection are actually exercised.',...receipt.shared_helper_pending_alias_verified.schema_unconstructible.map(row=>row.reason),receipt.alternate_allocation_controls[0].native_prefix_limit.reason];
    receipt.passed = true;
  } catch (error) {
    receipt.passed = false; receipt.failure = {phase,...nativeDiagnostic(error,{redact:fixture.redact,summary:'Native fixture diagnostic unavailable'})};
    throw error;
  } finally {
    try { await fixture.cleanup(); }
    catch (error) {
      receipt.passed = false;
      receipt.cleanup_failure = nativeDiagnostic(error,{redact:fixture.redact,summary:'Native fixture cleanup diagnostic unavailable'});
      throw error;
    }
  }
}

/** Strict CLI retains the documented focused-negative option without weakening mandatory positives. */
export function parseNativeOptions(args, defaultRoot) {
  let root = defaultRoot, output = null, selectedNegativeFiles = null, planOnly = false, rootSupplied = false;
  for (const argument of args) {
    if (argument.startsWith('--root=')) {
      assert.equal(rootSupplied, false); assert.ok(argument.slice(7));
      rootSupplied = true; root = resolve(argument.slice(7));
    }
    else if (argument.startsWith('--only-negative=')) {
      assert.equal(selectedNegativeFiles, null);
      const paths = argument.slice('--only-negative='.length).split(',');
      assert.ok(paths.length && paths.every(path => /^[0-9]{14}_[a-z0-9_]+\.sql$/.test(path)));
      assert.equal(new Set(paths).size, paths.length); selectedNegativeFiles = new Set(paths);
    } else if (argument === '--plan-only') { assert.equal(planOnly, false); planOnly = true; }
    else { assert.ok(!argument.startsWith('--') && output == null, 'Unknown or duplicate native argument'); output = resolve(argument); }
  }
  return {root,output,selectedNegativeFiles,planOnly};
}

/** Default mode uses only reviewed checked-in bytes and fresh execution evidence. */
export async function main(args = process.argv.slice(2)) {
  const options = parseNativeOptions(args, resolve(dirname(fileURLToPath(import.meta.url)), '..'));
  assert.equal(dirname(fileURLToPath(import.meta.url)),resolve(options.root,'scripts'),'Default execution must use this selected checkout\'s actual captured native modules');
  const inputManifest=await captureNativeInputManifest({root:options.root});
  const inputs = await loadTreasureVaultDefaultNativeInputs({root:options.root,readText:inputManifest.readCurrentText});
  const files = inputManifest.migrations.map(row=>row.path);
  const plan = buildNativeVerificationPlan({inputs,files,selectedNegativeFiles:options.selectedNegativeFiles});
  if (options.planOnly) { console.log(JSON.stringify(plan,null,2)); return plan; }
  assert.deepEqual(plan.missing_coverage, [], 'Unimplemented required families reject before SQL/container startup');
  const directory = options.root+'/.agents/legacy'; await mkdir(directory,{recursive:true});
  const output = options.output ?? directory+'/treasure-vault-native-'+randomUUID()+'.json';
  const file = await open(output, 'wx', 0o600), stream = await open(output+'.log', 'wx', 0o600);
  const receipt = {schema:'wg-tv-authentic-native-default-checkpoint-v9',started_at:new Date().toISOString(),plan,input_provenance:inputs.input_provenance,stages:[],passed:false};
  receipt.input_manifest=inputManifest.manifest;
  const stop=createNativeStopController({receipt});
  receipt.stop_policy=stop.limits;
  let logWrites = Promise.resolve();
  const log = row => {
    const line = JSON.stringify(row)+'\n'; logWrites = logWrites.then(() => stream.write(line));
    // Observe rejection immediately; the original chain still rejects at final flush.
    void logWrites.catch(()=>{});
  };
  try {
    const migrations = inputManifest.migrations;
    receipt.migrations = migrations.map(({path,sha256}) => ({path,sha256}));
    await executeNativeBase({root:options.root,inputs,migrations,inputManifest,output,selectedNegativeFiles:options.selectedNegativeFiles,receipt,log,stop});
  } catch (error) { receipt.passed = false; process.exitCode = error.exitCode??1; receipt.failure ??= nativeDiagnostic(error,{summary:'Native verification failed before safe fixture diagnostics were available'}); }
  finally {
    try { await logWrites; } catch (error) { receipt.passed = false; process.exitCode??=1; receipt.log_failure = nativeDiagnostic(error,{summary:'Native diagnostic log could not be written'}); }
    const lateStopExitCode = await finalizeNativeStopReceipt({receipt,stop});
    if (lateStopExitCode !== null) process.exitCode = lateStopExitCode;
    receipt.finished_at = new Date().toISOString();
    try {await file.writeFile(JSON.stringify(receipt,null,2)+'\n');await file.close();await stream.close();}
    finally {stop.close();}
  }
  return receipt;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
