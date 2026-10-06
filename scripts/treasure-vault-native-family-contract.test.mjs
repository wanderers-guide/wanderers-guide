import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { loadTreasureVaultDefaultNativeInputs } from './treasure-vault-native-inputs.mjs';
import { createNativeNegativeGroups, originalNativeBatches } from './treasure-vault-native-negatives.mjs';
import { createHistoricalPositiveProjections } from './treasure-vault-native-positive-projections.mjs';
import { createSharedHelperPendingAliasControls } from './treasure-vault-native-pending-aliases.mjs';
import { assertFreshEquipmentProjection } from './treasure-vault-native-fresh-equipment.mjs';

/**
 * Pure JSON database-boundary counterexamples. No database, SQL, GoTrue, service,
 * Docker or native migration is executed, and PostgreSQL typing is not proved.
 * Approved literals come only from the strict checked-in release loader, which
 * verifies and extracts exact original historical bodies from their wrappers.
 * This file belongs under scripts/ and requires the complete release files.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inputs = await loadTreasureVaultDefaultNativeInputs({ root });
const batches = originalNativeBatches(inputs);
const digest = value => createHash('sha256').update(value).digest('hex');
const tables = ['ability_block','ancestry','archetype','background','class','class_archetype','creature','item','language','spell','trait','versatile_heritage'];
const knownCreated = '2026-10-03T12:00:00.000Z';
const sequence = last=>({last_value:String(last),is_called:true,increment:'1',cache:'1',cycle:false});

/** Only the external database boundary is modelled; public capture/verify is real. */
function model(family) {
  const content=Object.fromEntries(tables.map(table=>[table,[]]));
  const source={...structuredClone(batches.seeds.spec.sources.find(row=>row.id===16).expected),created_at:knownCreated,updated_at:knownCreated,meta_data:{counts:{...batches.seeds.spec.baseline_counts,feat:54},unrelated:'must remain'}};
  const sources=[source];
  const state={
    content,sources,
    saved:{character:{id:1,details:{custom:'unchanged'},inventory:{items:[{
      id:'saved-copy',name:'Existing snapshot',
      operations:[{id:'custom',type:'adjValue',data:{variable:'HP_MAX',value:1}}],
    }]}}},
    queue:[],proof:{sentinel:'unchanged'},
    sequences:{'public.item_id_seq':sequence(50000),'public.creature_id_seq':sequence(12000),'public.content_update_id_seq':sequence(1)},
    schema:'unit-schema',roles:'unit-roles',
  };
  if(family==='gifts') for(const block of batches.gifts.spec.blocks) content.ability_block.push({...structuredClone(block.expected),traits:structuredClone(block.before.traits),description:block.before.description,meta_data:{...structuredClone(block.metadata),source:structuredClone(block.before.source)},created_at:knownCreated,updated_at:knownCreated,search_tsv:'unit model search'});
  const unchanged=structuredClone(batches.legacyGrips.spec.patches[0].anchor);
  unchanged.updated_at=knownCreated;unchanged.search_tsv='unchanged search';
  content.item.push(unchanged);
  const snapshot=()=>{
    const tuples=Object.fromEntries(tables.map(table=>['public.'+table,digest(JSON.stringify(state.content[table]))]));
    tuples['public.content_source']=digest(JSON.stringify(state.sources));
    tuples['public.character']=digest(JSON.stringify(state.saved));
    tuples['public.content_update']=digest(JSON.stringify(state.queue));
    tuples['proof.sentinel']=digest(JSON.stringify(state.proof));
    const result={tuples,sequences:structuredClone(state.sequences),schema_sha256:state.schema,roles_sha256:state.roles};
    return {...result,sha256:digest(JSON.stringify(result))};
  };
  const fixture={
    readState:()=>structuredClone(state.content),snapshot,
    queryJson(sql){
      if(sql.includes('from public.content_source'))return structuredClone(state.sources);
      const seq=/pg_get_serial_sequence\('public\.(item|creature)'/.exec(sql);
      if(seq)return 'public.'+seq[1]+'_id_seq';
      const literal=/jsonb_populate_record\(null::public\.(item|creature),'((?:[^']|'')*)'::jsonb\)/.exec(sql);
      assert.ok(literal,'Only the three documented model-boundary queries are supported');
      // This is a JSON-only stand-in, not a claim of PostgreSQL typing coverage.
      return {...JSON.parse(literal[2].replaceAll("''","'")),id:null,created_at:null,updated_at:null,search_tsv:null};
    },
  };
  const receipt={unit_model_only:true,native_executed:false};
  const controller=createHistoricalPositiveProjections({inputs,fixture,receipt});
  const capture=controller.capture(batches[family].path);
  function emulateApprovedAfter() {
    if(family==='gifts') for(const block of batches.gifts.spec.blocks){
      const row=state.content.ability_block.find(row=>row.id===block.id);
      row.traits=structuredClone(block.after.traits);row.description=block.after.description;row.meta_data.source=structuredClone(block.after.source);
      row.updated_at='2026-10-03T12:01:00.000Z';row.search_tsv='updated model search';
    }
    else if(family==='seeds') {
      // Worked-example allocations only, not IDs substituted into a real fixture.
      for(const [index,item]of batches.seeds.spec.items.entries())state.content.item.push({...structuredClone(item.row),id:50001+index,created_at:knownCreated,updated_at:knownCreated,search_tsv:'insert search'});
      state.sequences['public.item_id_seq']=sequence(50005);
      state.sources[0].meta_data.counts.item=1118;state.sources[0].meta_data.counts.trait=24;
    } else assert.fail('Only bounded gifts/seeds model examples are implemented');
    state.sources[0].updated_at='2026-10-03T12:01:00.000Z';
  }
  return {state,receipt,capture,controller,emulateApprovedAfter};
}

test('JSON model: exact approved gifts leaves and unrelated state are accepted',()=>{
  const control=model('gifts');control.emulateApprovedAfter();
  assert.equal(control.capture.verify().complete_content_domains,true);
  assert.equal(control.receipt.native_executed,false);
});
test('JSON model: an omitted approved gift trait repair is rejected',()=>{
  const control=model('gifts');control.emulateApprovedAfter();
  control.state.content.ability_block[0].traits=structuredClone(batches.gifts.spec.blocks[0].before.traits);
  assert.throws(()=>control.capture.verify(),/entire ability_block domain/);
});
test('JSON model: a missing unrelated owner field is rejected',()=>{
  const control=model('gifts');control.emulateApprovedAfter();
  delete control.state.content.ability_block[0].requirements;
  assert.throws(()=>control.capture.verify(),/entire ability_block domain/);
});
test('JSON model: a cached source-count sibling mutation is rejected',()=>{
  const control=model('gifts');control.emulateApprovedAfter();
  control.state.sources[0].meta_data.counts.feat=55;
  assert.throws(()=>control.capture.verify(),/All source columns\/count siblings/);
});
test('JSON model: a saved custom operation mutation is rejected',()=>{
  const control=model('gifts');control.emulateApprovedAfter();
  control.state.saved.character.inventory.items[0].operations[0].data.value=2;
  assert.throws(()=>control.capture.verify(),/public.character: all unrelated/);
});
test('JSON model: all five exact seed payloads and IDs50001..50005 are accepted',()=>{
  const control=model('seeds');control.emulateApprovedAfter();
  assert.deepEqual(control.capture.verify().actual_insert_allocations.map(row=>row.id),[50001,50002,50003,50004,50005]);
});
test('JSON model: missing authored insert payload is rejected',()=>{
  const control=model('seeds');control.emulateApprovedAfter();
  delete control.state.content.item.at(-1).availability;
  assert.throws(()=>control.capture.verify(),/non-generated insert columns/);
});
test('JSON model: changed actual allocated ID is rejected even with correct terminal counter',()=>{
  const control=model('seeds');control.emulateApprovedAfter();
  control.state.content.item.at(-1).id=60000;
  assert.throws(()=>control.capture.verify(),/Actual IDs derive from untouched real sequence/);
});
test('JSON model: unexpected nextval consumption is rejected despite correct actual IDs',()=>{
  const control=model('seeds');control.emulateApprovedAfter();
  control.state.sequences['public.item_id_seq'].last_value='50006';
  assert.throws(()=>control.capture.verify(),/Only independently expected migration identity allocation/);
});
test('JSON model: an unrelated sequence counter mutation is rejected',()=>{
  const control=model('gifts');control.emulateApprovedAfter();
  control.state.sequences['public.content_update_id_seq'].last_value='2';
  assert.throws(()=>control.capture.verify(),/Every unrelated sequence remains exact/);
});
test('JSON model: incomplete historical14 projection coverage cannot be declared complete',()=>{
  const control=model('gifts');control.emulateApprovedAfter();control.capture.verify();
  assert.throws(()=>control.controller.complete(),{name:'AssertionError'});
});
test('Construction only: alias matrix includes actual-schema neutral FK and both terminal obligations',()=>{
  const aliases=createSharedHelperPendingAliasControls({inputs,userId:'11111111-1111-4111-8111-111111111111',reserveProposalId:()=>assert.fail('No database sequence requested during construction'),queryJson:()=>assert.fail('No SQL requested during construction'),receipt:{unit_model_only:true,native_executed:false}});
  assert.deepEqual(aliases.coverage.required_terminals,['100','101']);
  assert.equal(aliases.coverage.neutral_verified_FK_source_id,3);
  assert.equal(aliases.coverage.schema_unconstructible.length,1);
  for(const terminal of ['100','101']){
    const plan=aliases.atTerminal(terminal);
    assert.ok(plan.cases.length>0);
    assert.ok(plan.positiveCases.some(row=>row.name.includes('unique-name-valid-source')));
    assert.ok(plan.positiveCases.some(row=>row.name.includes('wrong-queue-kind-target-id')));
    assert.ok(plan.positiveCases.some(row=>row.name.includes('normalized-approved-ref-id')));
    assert.ok([...plan.cases,...plan.positiveCases].every(row=>row.phase==='shared-helper-pending-aliases:'+terminal));
  }
  assert.throws(()=>aliases.complete(),{name:'AssertionError'});
});
test('JSON boundary model: pre-existing full-terminal drift rejects before an alias reservation',()=>{
  const aliases=createSharedHelperPendingAliasControls({
    inputs:{...inputs,helper:{...inputs.helper,state:'unit_definition_only',signature:'unit_helper_only()'}},
    userId:'11111111-1111-4111-8111-111111111111',
    reserveProposalId:()=>assert.fail('A drifted baseline cannot reserve a fixture identity'),
    queryJson:sql=>sql.includes('unit_definition_only')?true:{recognized:true,passed:false},
    receipt:{unit_model_only:true,native_executed:false},
  });
  assert.throws(()=>aliases.atTerminal('100').cases[0].prepare(),/unrelated baseline drift/);
});
test('Construction only: removing the verified neutral FK header rejects, not a fabricated source',()=>{
  const proof=structuredClone(inputs.helper.proof);
  proof.sources=proof.sources.map(row=>row.id===3?{...row,id:99999999}:row);
  assert.throws(()=>createSharedHelperPendingAliasControls({
    inputs:{...inputs,helper:{...inputs.helper,proof}},
    userId:'11111111-1111-4111-8111-111111111111',
    reserveProposalId:()=>assert.fail('No reservation during construction'),queryJson:()=>assert.fail('No SQL during construction'),receipt:{unit_model_only:true,native_executed:false},
  }),/neutral FK header/);
});
test('JSON receipt model: completeness rejects wrong exit/SQLSTATE/setup/guard evidence at either terminal',()=>{
  const receipt={unit_model_only:true,native_executed:false,negative_controls:[],shared_helper_pending_alias_positives:[]};
  const aliases=createSharedHelperPendingAliasControls({
    inputs,userId:'11111111-1111-4111-8111-111111111111',
    reserveProposalId:()=>assert.fail('No model sequence requests'),queryJson:()=>assert.fail('No model SQL requests'),receipt,
  });
  for(const terminal of ['100','101']){
    const plan=aliases.atTerminal(terminal);
    receipt.negative_controls.push(...plan.cases.map(row=>({name:row.name,phase:row.phase,original_guard:true,guard_message_matched:true,setup_type_proved:true,setup_status:0,setup_signal:null,actual_exit_status:3,actual_signal:null,no_transport_error:true,expected_sqlstate:'P0001',rollback_schema_tuples_saved_preserved:true})));
    receipt.shared_helper_pending_alias_positives.push(...plan.positiveCases.map(row=>({name:row.name,phase:row.phase,passed:true,actual_exit_status:0,actual_signal:null,no_transport_error:true,actual_helper:true,actual_wrapper:true,actual_release:true,full_rollback:true})));
  }
  assert.equal(aliases.complete().both_terminals_complete,true,'Model acceptance only, no actual execution claim');
  const mutants=[{actual_exit_status:0},{actual_exit_status:1},{actual_exit_status:2},{actual_signal:'SIGTERM'},{no_transport_error:false},{expected_sqlstate:'23502'},{setup_status:3},{setup_signal:'SIGTERM'},{guard_message_matched:false}];
  for(const terminal of ['100','101'])for(const change of mutants){
    const index=receipt.negative_controls.findIndex(row=>row.phase==='shared-helper-pending-aliases:'+terminal);
    const original=receipt.negative_controls[index];receipt.negative_controls[index]={...original,...change};
    assert.throws(()=>aliases.complete(),/exact setup\/script exit\/SQLSTATE\/guard evidence/);
    receipt.negative_controls[index]=original;
  }
});

const equipmentSql=batches.equipment.sql,equipmentSpec=batches.equipment.spec;
assert.equal(equipmentSpec.items.length,4);
const freshTimestamp='2026-10-03T19:00:00+00:00';

/** JSON-only stand-ins for full capsule snapshots and independent approved literals. */
function freshEquipmentModel(){
  const itemSequence='public.item_id_seq';
  const before={tuples:{'public.item':'all canonical rows','public.content_source':'canonical source','public.character':'actual saved-shape stand-in','auth.users':'unit model only'},schema_sha256:'unchanged model schema',roles_sha256:'unchanged model roles',sequences:{[itemSequence]:sequence(23440),'public.content_update_id_seq':sequence(1)}};
  const after=structuredClone(before);after.sequences[itemSequence]=sequence(23444);
  const sourceBefore={id:16,name:'Treasure Vault',created_at:'2024-01-01T00:00:00+00:00',updated_at:'2026-10-03T18:00:00+00:00',meta_data:{counts:{item:1113,feat:54,trait:45,creature:1},untouched:'preserve'}};
  // These are JSON stand-ins for independent PG typing; no PG type proof claimed.
  const typedRows=equipmentSpec.items.map(item=>({...structuredClone(item.row),id:null,created_at:null,updated_at:null,search_tsv:null}));
  const actual={rows:equipmentSpec.items.map((item,index)=>({...structuredClone(item.row),id:23441+index,created_at:freshTimestamp,updated_at:freshTimestamp,search_tsv:'new generated field'})),source:{...structuredClone(sourceBefore),updated_at:freshTimestamp},actual_item_count:1113,transaction_time:freshTimestamp,unrelated_before:structuredClone(before.tuples),unrelated_after:structuredClone(before.tuples)};
  return {typedRows,actual,before,after,sourceBefore,itemSequence};
}
test('JSON model: exact four authored rows with real-rule23441..23444 allocations are accepted',()=>{
  const projection=assertFreshEquipmentProjection(freshEquipmentModel());
  assert.deepEqual(projection.allocations.map(row=>row.id),[23441,23442,23443,23444]);
  assert.equal(projection.sequence_consumption[0].calls,4);
});
test('JSON model: missing fresh row is rejected',()=>{
  const value=freshEquipmentModel();value.actual.rows.pop();assert.throws(()=>assertFreshEquipmentProjection(value),{name:'AssertionError'});
});
test('JSON model: missing non-generated payload field is rejected',()=>{
  const value=freshEquipmentModel();delete value.actual.rows[0].availability;assert.throws(()=>assertFreshEquipmentProjection(value),/Complete non-generated/);
});
test('JSON model: wrong native identity cannot hide behind correct nextval count',()=>{
  const value=freshEquipmentModel();value.actual.rows[0].id=30000;assert.throws(()=>assertFreshEquipmentProjection(value),/actual untouched native sequence/);
});
test('JSON model: old canonical identity reimport is rejected even with a rolled-back sequence predecessor',()=>{
  const value=freshEquipmentModel();value.before.sequences[value.itemSequence]=sequence(23436);value.after.sequences[value.itemSequence]=sequence(23440);
  value.actual.rows.forEach((row,index)=>{row.id=23437+index;});
  assert.throws(()=>assertFreshEquipmentProjection(value),/remapped canonical published identity/);
});
test('JSON model: stale generated creation time is rejected',()=>{
  const value=freshEquipmentModel();value.actual.rows[0].created_at='2024-01-01T00:00:00+00:00';assert.throws(()=>assertFreshEquipmentProjection(value),/actual transaction default/);
});
test('JSON model: source count sibling drift is rejected',()=>{
  const value=freshEquipmentModel();value.actual.source.meta_data.counts.feat=55;assert.throws(()=>assertFreshEquipmentProjection(value),/full source\/count siblings/);
});
test('JSON model: incorrect actual source item cardinality is rejected',()=>{
  const value=freshEquipmentModel();value.actual.actual_item_count=1112;assert.throws(()=>assertFreshEquipmentProjection(value),{name:'AssertionError'});
});
test('JSON model: unrelated saved tuple mutation inside capsule is rejected despite later rollback',()=>{
  const value=freshEquipmentModel();value.actual.unrelated_after['public.character']='changed';assert.throws(()=>assertFreshEquipmentProjection(value),/inside fresh import/);
});
test('JSON model: missing unrelated relation evidence is rejected',()=>{
  const value=freshEquipmentModel();delete value.actual.unrelated_after['auth.users'];assert.throws(()=>assertFreshEquipmentProjection(value),/inside fresh import/);
});
test('JSON model: incomplete canonical tuple rollback is rejected',()=>{
  const value=freshEquipmentModel();value.after.tuples['public.item']='changed';assert.throws(()=>assertFreshEquipmentProjection(value),/Every public\/Auth\/saved tuple restored/);
});
test('JSON model: schema drift is rejected',()=>{
  const value=freshEquipmentModel();value.after.schema_sha256='changed';assert.throws(()=>assertFreshEquipmentProjection(value),/Schema, helper body\/ACL/);
});
test('JSON model: fifth consumed nextval is rejected, never reset or concealed',()=>{
  const value=freshEquipmentModel();value.after.sequences[value.itemSequence]=sequence(23445);assert.throws(()=>assertFreshEquipmentProjection(value),/only the declared original insert path/);
});
test('JSON model: unrelated sequence consumption is rejected',()=>{
  const value=freshEquipmentModel();value.after.sequences['public.content_update_id_seq']=sequence(2);assert.throws(()=>assertFreshEquipmentProjection(value),/no unreviewed identity consumption/);
});
console.log(JSON.stringify({mode:'JSON-model-only',native_executed:false,sql_executed:false,Auth_proved:false,PostgreSQL_typing_proved:false,original_equipment_sql_sha256:digest(equipmentSql),original_literal_sha256:digest(equipmentSql.split('$equipment$')[1])}));


/** Construction counterexample only; the native runner separately verifies FK setup and guard rollback. */
function wrongDedicationRecipe(feats) {
  const groups = createNativeNegativeGroups({
    inputs,
    userId: '11111111-1111-4111-8111-111111111111',
    reserveProposalId: () => assert.fail('This control must not allocate a proposal'),
    reserveContentId: () => assert.fail('This control must not allocate content'),
    readState: () => ({
      ability_block: structuredClone(feats),
      spell: [{ id: 99999999, content_source_id: 3 }],
    }),
    queryJson: () => assert.fail('This construction must use the captured fixture state'),
  });
  return groups.beforeOriginal(batches.artifactAccess.path).cases.find(
    (row) => row.name === 'artifact-access-archetype-110-wrong-dedication',
  ).prepare();
}

test('Construction counterexample: wrong dedication uses an existing unrelated feat instead of missing ID 1', () => {
  const owner = batches.artifactAccess.spec.patches.find(row => row.table === 'archetype');
  const control = wrongDedicationRecipe([
    { id: owner.anchor.dedication_feat_id, type: 'feat' },
    { id: owner.final.dedication_feat_id, type: 'feat' },
    { id: 123456, type: 'action' },
    { id: 234567, type: 'feat' },
  ]);
  assert.equal(control.setup, 'update public.archetype set dedication_feat_id=234567 where id=110;');
  assert.equal(control.expectedSqlState, 'P0001');
  assert.match('Treasure Vault artifact owner changed: archetype:110', control.match);
  assert.deepEqual(control.reservations, []);
});

test('Construction counterexample: no existing unrelated feat rejects before a fabricated FK setup', () => {
  const owner = batches.artifactAccess.spec.patches.find(row => row.table === 'archetype');
  assert.throws(() => wrongDedicationRecipe([
    { id: owner.anchor.dedication_feat_id, type: 'feat' },
    { id: owner.final.dedication_feat_id, type: 'feat' },
    { id: 123456, type: 'action' },
  ]), /requires an existing unrelated feat/);
});
