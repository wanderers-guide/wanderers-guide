import assert from 'node:assert/strict';
import { assertNativeRestoration } from './treasure-vault-native-phases.mjs';

const tables=new Set(['ability_block','ancestry','archetype','background','class','class_archetype','creature','item','language','spell','trait','versatile_heritage']);
const q=value=>"'"+String(value).replaceAll("'","''")+"'";
const key=row=>row.table+':'+String(row.uuid);
const get=(row,path)=>path.reduce((value,part)=>value[part],row);
const set=(row,path,value)=>{path.slice(0,-1).reduce((parent,part)=>parent[part],row)[path.at(-1)]=value;};
const normal=row=>{const result=structuredClone(row);delete result.updated_at;delete result.search_tsv;if(result.uuid!=null)result.uuid=String(result.uuid);return result;};
const occurrence=(text,token)=>text.split(token).length-1;

/** Independent full literal/binding validation. Never derive expected references from after-links. */
export function verifyAllocationPhase({inputs,fixture,phase}) {
  assert.ok(['100','101'].includes(phase));
  assert.equal(inputs.input_provenance.mode,'checked-in-default');
  fixture.assertOwned();
  const contract=inputs.contract,actuals=new Map();
  assert.equal(contract.expected_entries.length,2349);assert.equal(contract.expected_sources.length,31);assert.equal(contract.expected_templates.length,11);
  assert.equal(fixture.query(`select (${inputs.helper.state});`),'t','Pinned helper metadata is required before its invocation');
  assert.deepEqual(fixture.queryJson('select row_to_json(s) from '+inputs.helper.signature+' s;'),{recognized:true,passed:true});
  let retained=0;
  for(const table of [...new Set(contract.expected_entries.map(row=>row.table))].sort()) {
    assert.ok(tables.has(table));
    const expected=contract.expected_entries.filter(row=>row.table===table),ids=expected.map(row=>row.id);
    assert.ok(ids.every(id=>Number.isSafeInteger(id)&&id>0));assert.equal(new Set(ids).size,ids.length);
    const actual=fixture.queryJson(`select coalesce(jsonb_agg((to_jsonb(r)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',r.uuid::text) order by r.id),'[]'::jsonb) from public.${table} r where r.id in(${ids.join(',')});`);
    const map=new Map(actual.map(row=>[row.id,row]));assert.equal(map.size,expected.length);
    for(const entry of expected){assert.deepEqual(map.get(entry.id),normal(entry['row_'+phase]),'Full retained identity/date/field parity '+table+':'+entry.id);retained++;}
  }
  for(const source of contract.expected_sources) {
    const actual=fixture.queryJson(`select to_jsonb(r)-'updated_at' from public.content_source r where id=${source.id};`);
    const expected=structuredClone(source['row_'+phase]);delete expected.updated_at;
    assert.deepEqual(actual,expected,'Full source parity '+source.id);
  }
  for(const template of contract.expected_templates) {
    assert.ok(['item','creature'].includes(template.table));assert.match(template.uuid,/^\d+$/);
    const rows=fixture.queryJson(`select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('uuid',r.uuid::text) order by id),'[]'::jsonb) from public.${template.table} r where uuid::text=${q(template.uuid)};`);
    assert.equal(rows.length,1,'Global UUID cardinality, not source-filtered first match');
    const actual=rows[0];assert.ok(Number.isSafeInteger(actual.id)&&actual.id>0);assert.equal(actual.content_source_id,16);assert.equal(actual.name,template.name);
    if(template.table==='creature')assert.equal(actual.type,template.type);
    actuals.set(key(template),actual);
  }
  let fields=0,selfOccurrences=0;
  for(const template of contract.expected_templates) {
    const actual=actuals.get(key(template)),expected=structuredClone(template['row_'+phase]);
    if(template.binding) {
      const op=expected.operations.filter(row=>row.id===template.binding.operation_id);assert.equal(op.length,1);assert.equal(op[0].type,'giveItem');
      const target=actuals.get('item:'+template.binding.item_uuid);assert.ok(target);op[0].data.itemId=target.id;
    }
    for(const field of template.symbolic_fields) {
      const text=get(expected,field.path),token='](link_'+field.type+'_'+field.token+')';
      const target=actuals.get(field.table+':'+field.uuid);assert.ok(target);assert.equal(target.content_source_id,16);
      const count=occurrence(text,token);
      if(phase==='101'){assert.ok(count>0);fields++;selfOccurrences+=count;}
      else assert.equal(count,0);
      set(expected,field.path,text.replaceAll(token,'](link_'+field.type+'_'+target.id+')'));
    }
    const compared=normal(actual);delete compared.id;delete compared.created_at;
    assert.deepEqual(compared,normal(expected),'Full allocated template fields/runtime bindings '+key(template));
    assert.doesNotMatch(JSON.stringify(actual),/\{\{allocated_id:/,'No unresolved symbolic helper token in native row');
  }
  assert.equal(retained,2349);
  if(phase==='101'){assert.equal(fields,6);assert.equal(selfOccurrences,9);}
  return {phase,retained:2349,sources:31,templates:11,symbolic_fields:fields,self_occurrences:selfOccurrences,
    allocations:[...actuals].map(([identity,row])=>({identity,id:row.id,created_at:row.created_at})).sort((a,b)=>a.identity.localeCompare(b.identity)),
    full_literals_and_static_references_equal:true,chair_actual_attack_binding_verified:true};
}

/** Whole-token lexical control, explicitly not a manufactured PostgreSQL allocation. */
export function proveWholeHelperTokenBoundary() {
  const before='[self](link_item_2346) [other](link_item_23460) [other](link_item_23467) [creature](link_creature_2346)';
  const exact=before.replaceAll('](link_item_2346)','](link_item_{{allocated_id:test}})');
  assert.equal(exact,'[self](link_item_{{allocated_id:test}}) [other](link_item_23460) [other](link_item_23467) [creature](link_creature_2346)');
  assert.notEqual(before.replaceAll('link_item_2346','link_item_{{allocated_id:test}}'),exact,'Bare prefix mutant must fail');
  return {passed:true,kind:'pure-string-boundary-only',physical_native_prefix_allocation_claimed:false};
}

/**
 * Two authentic fixtures, not a delete/reinsert/sequence-remap capsule. The driver
 * owns startup/cleanup and exact104 chronology; callbacks below own the evidence.
 * Importing/constructing this module executes no SQL or creates any resource.
 */
export async function runAlternateAllocations({inputs,fixture,withAlternateFixture,primaryChronology,receipt}) {
  assert.equal(typeof withAlternateFixture,'function','A reviewed second authentic fixture driver is mandatory');
  assert.equal(primaryChronology.length,104,'The primary complete chronology is explicit');
  assert.deepEqual(primaryChronology.map(row=>row.path),primaryChronology.map(row=>row.path).sort());
  assert.equal(new Set(primaryChronology.map(row=>row.path)).size,104);
  for(const row of primaryChronology){assert.match(row.path,/^[0-9]{14}_[a-z0-9_]+\.sql$/);assert.match(row.sha256,/^[a-f0-9]{64}$/);}
  const primaryBefore=fixture.snapshot();
  const primary=verifyAllocationPhase({inputs,fixture,phase:'101'});
  const hooks=new Map([
    ['20261002010000_treasure_vault_relic_seeds.sql',{item:2}],
    ['20261002030000_treasure_vault_oozeform_chair.sql',{item:2,creature:2}],
    [inputs.completion.path,{item:2}],
  ]),visited=new Set(),captures=new Map(),reservations=[];
  const secondary=await withAlternateFixture({
    async beforeStage({path,fixture:other}) {
      if(!hooks.has(path))return;
      assert.ok(!visited.has(path),'Each allocation hook executes once');visited.add(path);other.assertOwned();
      const before=other.snapshot(),ids=[];
      for(const [table,count]of Object.entries(hooks.get(path)))for(let i=0;i<count;i++) {
        const id=other.reserveContentId(table);assert.ok(Number.isSafeInteger(id)&&id>0);ids.push({table,id});
      }
      const sequenceForTable=table=>other.queryJson(`select to_jsonb(pg_get_serial_sequence('public.${table}','id'));`);
      const observed=assertNativeRestoration({before,after:other.snapshot(),expectedCalls:hooks.get(path),sequenceForTable});
      reservations.push({before:path,ids,observed});
    },
    async afterPhase({phase,fixture:other,phases}) {
      assert.ok(['100','101'].includes(phase));assert.ok(!captures.has(phase));
      const proof=verifyAllocationPhase({inputs,fixture:other,phase});
      await phases.readOnly(phase==='100'?inputs.completionWrapper:inputs.display);
      await phases.replay(phase==='100'?inputs.completionWrapper:inputs.display,'alternate-exact-replay');
      captures.set(phase,proof);
    },
  });
  assert.equal(secondary.authentic_full_chronology,true);assert.equal(secondary.generated_id_mapping,false);assert.equal(secondary.sequence_reset,false);
  assert.equal(secondary.cleaned_only_owned_containers_and_volumes,true);
  assert.deepEqual(secondary.chronology,primaryChronology,'Both genuinely owned fixtures execute the exact same104 sorted file bytes');
  assert.deepEqual(fixture.snapshot(),primaryBefore,'The second fixture never changes any primary tuple/sequence/schema/role');
  assert.deepEqual([...visited].sort(),[...hooks.keys()].sort());assert.deepEqual([...captures.keys()].sort(),['100','101']);
  const after100=captures.get('100'),after101=captures.get('101');
  assert.deepEqual(after100.allocations,after101.allocations,'Display-only update must not recreate/reidentify any authored content');
  const primaryByKey=new Map(primary.allocations.map(row=>[row.identity,row]));
  for(const allocated of after101.allocations)assert.notEqual(allocated.id,primaryByKey.get(allocated.identity).id,'Actual different allocation '+allocated.identity);
  const maxTargetId=Math.max(...inputs.contract.expected_entries.map(row=>row.id));
  const physicalPrefix=after101.allocations.some(row=>inputs.contract.expected_entries.some(target=>target.table===row.identity.split(':')[0]&&String(target.id).startsWith(String(row.id))&&target.id!==row.id));
  assert.equal(physicalPrefix,false,'Current monotonic five-digit allocation universe has no physical strict-prefix case');
  const result={passed:true,primary,secondary_100:after100,secondary_101:after101,reservations,authentic_second_fixture:true,generated_id_mapping:false,sequence_reset:false,
    token_boundary:proveWholeHelperTokenBoundary(),native_prefix_limit:{observed:false,max_static_target_id:maxTargetId,reason:'Current actual monotonic five-digit allocations cannot be a strict prefix of target IDs<=58839. Only the separate lexical mutation control exercises that form.'}};
  (receipt.alternate_allocation_controls??=[]).push(result);return result;
}
