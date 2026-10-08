import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createOwnedNativeFixture} from './treasure-vault-native-fixture.mjs';
import {createNativePhaseRunner} from './treasure-vault-native-phases.mjs';
import {createAuthenticSharedHistoryControls} from './treasure-vault-native-history.mjs';
import {createHistoricalPositiveProjections} from './treasure-vault-native-positive-projections.mjs';
import {createHistorical023FreshImportCapsule} from './treasure-vault-native-fresh-equipment.mjs';
import {createNativeRegisteredCiReplayControls} from './treasure-vault-native-registered-ci-replays.mjs';
import {nativeDiagnostic} from './treasure-vault-native-diagnostics.mjs';
import {HISTORICAL_CONTENT_FIXTURE} from './historical-content-fixture.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');

/**
 * A second genuine positive-only chronology. It never resets a sequence or
 * remaps catalog IDs/dates. The independently required primary negatives and
 * their real reservation/late-rejection consumption are not rerun here.
 */
export function createAuthenticAlternateFixtureDriver({root,inputs,migrations,inputManifest,receipt,log,stop}) {
  let invoked=false;
  return async function withAlternateFixture({beforeStage,afterPhase}) {
    assert.equal(invoked,false,'Exactly one independent authentic alternate fixture');invoked=true;
    assert.equal(typeof beforeStage,'function');assert.equal(typeof afterPhase,'function');
    const evidence={stages:[],passed:false,positive_only_chronology:true,generated_id_mapping:false,sequence_reset:false,
      allocation_difference_basis:['Reviewed extra real nextval hooks in the secondary fixture','Actual primary setup reservations and failed-insert nextvals from required negative/writer controls'],
      negative_suite_repeated:false};
    receipt.alternate_fixture=evidence;
    let other;
    try {other=createOwnedNativeFixture({root,receipt:evidence,log:row=>log({fixture:'alternate',...row}),bootstrapRead:inputManifest.readRelative,
      contentDump:inputManifest.readHistoricalBootstrap(),contentDumpProvenance:HISTORICAL_CONTENT_FIXTURE,throwIfRequested:stop.throwIfRequested});}
    catch(error){evidence.failure=nativeDiagnostic(error,{remember:true,summary:'Alternate fixture failed before safe diagnostics were available'});throw error;}
    async function stage(name,sql) {
      await stop.checkpoint('alternate before '+name);
      const started=Date.now(),result=other.sql(sql,true);
      const entry={name,sql_sha256:sha(sql),bytes:Buffer.byteLength(sql),elapsed_ms:Date.now()-started,status:result.status,signal:result.signal,stderr:other.redact(result.stderr),passed:result.status===0&&result.signal===null&&result.error==null};
      evidence.stages.push(entry);log({fixture:'alternate',kind:'stage',...entry});
      assert.equal(result.error==null,true);assert.equal(result.signal,null);assert.equal(result.status,0,name+': '+other.redact(result.stderr));
      await stop.checkpoint('alternate after '+name);return result.stdout;
    }
    let result;
    try {
      evidence.starting_input_verification=await inputManifest.verify();
      await other.initialize(stage);const userId=other.signup();other.savedCopyFixture(userId);
      await other.enableEngineTransport();
      const phases=createNativePhaseRunner({fixture:other,receipt:evidence,stage,checkpoint:stop.checkpoint,log:row=>log({fixture:'alternate',...row})});
      const history=createAuthenticSharedHistoryControls({inputs,query:other.query,sql:other.sql,stateDigest:other.stateDigest,receipt:evidence,stage,checkpoint:stop.checkpoint});
      const positives=createHistoricalPositiveProjections({inputs,fixture:other,receipt:evidence});
      const fresh023=createHistorical023FreshImportCapsule({inputs,fixture:other,receipt:evidence,checkpoint:stop.checkpoint});
      const chronology=[];
      for(const migration of migrations) {
        await stop.checkpoint('alternate chronology '+migration.path);
        assert.equal(sha(migration.sql),migration.sha256);chronology.push({path:migration.path,sha256:migration.sha256});
        await beforeStage({path:migration.path,fixture:other});
        if(migration.path===inputs.helper.path) {
          await stage('alternate-helper-install',inputs.helper.sql);assert.equal(history.status().recognized,false);
          await phases.readOnly(inputs.helper);await phases.replay(inputs.helper,'alternate-installer-replay');
        } else if(migration.path===inputs.completion.path||migration.path===inputs.display.path) {
          const phase=migration.path===inputs.completion.path?'100':'101';
          const batch=phase==='100'?inputs.completionWrapper:inputs.display;
          await stage('alternate-actual'+phase,batch.sql);await phases.readOnly(batch);await phases.replay(batch,'alternate-positive-exact-replay');
          await history.terminalPhase(phase);await afterPhase({phase,fixture:other,phases});
        } else {
          if(migration.path===fresh023.path)await fresh023.run();
          const projection=positives.paths.includes(migration.path)?positives.capture(migration.path):null;
          const wrapper=inputs.actualWrapperMetadata.find(row=>row.path===migration.path);
          if(wrapper)await history.ownStage(wrapper);else await stage(migration.path,migration.sql);
          if(projection){await stop.checkpoint('alternate projection '+migration.path);projection.verify();}
        }
      }
      assert.equal(chronology.length,110);evidence.historical14=positives.complete();
      assert.equal(evidence.historical023_fresh_import_capsule?.passed,true);
      assert.equal(evidence.shared_history.own_stage.length,39);assert.equal(evidence.shared_history.terminal.length,2);
      assert.equal(other.query('select count(*) from public.content_update;'),'0');
      const registeredCi=createNativeRegisteredCiReplayControls({inputManifest,fixture:other,stage,receipt:evidence,checkpoint:stop.checkpoint});
      await registeredCi.run();
      assert.equal(evidence.registered_ci_replays.passed,true);
      evidence.final_input_verification=await inputManifest.verify();evidence.passed=true;
      result={chronology,authentic_full_chronology:true,generated_id_mapping:false,sequence_reset:false,positive_only_chronology:true,negative_suite_repeated:false,
        actual_auth:true,independent_historical14:true,fresh023_capsule:true,own_stage39:true,both_terminal_replays40:true,registered_ci_replays:true};
    } catch(error) {evidence.passed=false;evidence.failure=nativeDiagnostic(error,{redact:other.redact,remember:true,summary:'Alternate fixture diagnostic unavailable'});throw error;}
    finally {
      try{await other.cleanup();}catch(error){evidence.passed=false;evidence.cleanup_failure=nativeDiagnostic(error,{redact:other.redact,remember:true,summary:'Alternate fixture cleanup diagnostic unavailable'});throw error;}
    }
    assert.equal(evidence.cleaned_only_owned_containers_and_volumes,true);
    return {...result,cleaned_only_owned_containers_and_volumes:true};
  };
}
