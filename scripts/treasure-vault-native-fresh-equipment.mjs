import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { originalNativeBatches } from './treasure-vault-native-negatives.mjs';
import { assertNativeRestoration } from './treasure-vault-native-phases.mjs';

const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
const json=value=>quote(JSON.stringify(value))+'::jsonb';
const sha=value=>createHash('sha256').update(value).digest('hex');
const identifier=value=>{assert.match(value,/^[a-z_]+$/);return '"'+value+'"';};
const canonicalIds=new Map([
  ['3657591025546460',23437],['4421008231316681',23438],
  ['8502463443227114',23439],['38891152761114',23440],
]);
const normalize=value=>{
  const row=structuredClone(value);delete row.updated_at;delete row.search_tsv;
  if(row.uuid!=null)row.uuid=String(row.uuid);return row;
};
const template=value=>{const row=normalize(value);delete row.id;delete row.created_at;return row;};
const normalizeSource=value=>{const row=structuredClone(value);delete row.updated_at;return row;};

/** Pure complete-row projection validator; unit callers must label their JSON models separately. */
export function assertFreshEquipmentProjection({typedRows,actual,before,after,sourceBefore,itemSequence}){
  assert.equal(typedRows.length,4);assert.equal(actual.rows.length,4);
  assert.deepEqual(typedRows.map(row=>String(row.uuid)).sort(),[...canonicalIds.keys()].sort());
  assert.equal(new Set(actual.rows.map(row=>String(row.uuid))).size,4);
  const initial=before.sequences[itemSequence];assert.ok(initial);
  assert.equal(initial.cache,'1');assert.equal(initial.cycle,false);
  const ids=Array.from({length:4},(_,index)=>Number(BigInt(initial.last_value)+BigInt(initial.increment)*BigInt(index+(initial.is_called?1:0))));
  assert.ok(ids.every(id=>Number.isSafeInteger(id)&&id>0));
  assert.deepEqual(actual.rows.map(row=>row.id).sort((a,b)=>a-b),ids.slice().sort((a,b)=>a-b),'Fresh insert IDs derive from actual untouched native sequence');
  for(const expected of typedRows){
    const rows=actual.rows.filter(row=>String(row.uuid)===String(expected.uuid));assert.equal(rows.length,1);
    const row=rows[0];assert.deepEqual(template(row),template(expected),'Complete non-generated fresh row equals independent PostgreSQL-typed approved literal');
    assert.ok(typeof row.created_at==='string'&&Number.isFinite(Date.parse(row.created_at)),'Actual fresh generated timestamp');
    assert.equal(row.created_at,actual.transaction_time,'Fresh row uses the actual transaction default creation timestamp');
    assert.notEqual(row.id,canonicalIds.get(String(row.uuid)),'Fresh allocated row is not a remapped canonical published identity');
  }
  assert.deepEqual(normalizeSource(actual.source),normalizeSource(sourceBefore),'Final full source/count siblings match canonical pre-capsule source');
  assert.equal(actual.source.meta_data.counts.item,1113);assert.equal(actual.actual_item_count,1113);
  assert.deepEqual(actual.unrelated_after,actual.unrelated_before,'Every unrelated public/Auth/saved/proof/source tuple remains exact inside fresh import');
  assert.ok(Object.keys(actual.unrelated_before).length>3,'Actual full relation snapshot, not a tiny owner-only model');
  const calls=assertNativeRestoration({before,after,expectedCalls:{item:4},sequenceForTable:table=>{assert.equal(table,'item');return itemSequence;}});
  return {allocations:actual.rows.map(row=>({id:row.id,uuid:String(row.uuid),created_at:row.created_at})),sequence_consumption:calls};
}

/**
 * Real own-stage fresh-import capsule only. Construction performs no reads,
 * connections, SQL, signup or identity allocation. run() uses the caller-owned
 * actual schema fixture, exact original023 body, one rollback transaction, and
 * real sequence consumption. Canonical primary chronology is never remapped.
 */
export function createHistorical023FreshImportCapsule({inputs,fixture,receipt,checkpoint=async()=>{}}){
  assert.equal(inputs.input_provenance.mode,'checked-in-default');
  for(const method of ['queryJson','sql','snapshot'])assert.equal(typeof fixture[method],'function');
  assert.equal(typeof checkpoint,'function');
  const batch=originalNativeBatches(inputs).equipment,spec=batch.spec;
  assert.equal(spec.items.length,4);assert.equal(spec.baseline_item_count,1109);assert.equal(spec.terminal_item_count,1113);
  assert.deepEqual(spec.items.map(row=>String(row.uuid)).sort(),[...canonicalIds.keys()].sort());
  assert.doesNotMatch(batch.sql,/\$native_fresh023_original\$/);
  const uuidList=[...canonicalIds.keys()].map(quote).join(',');
  function tupleSql(relations){
    const branches=relations.map(({schema,table})=>{
      assert.ok(['public','auth','proof'].includes(schema));
      let filter='';
      if(schema==='public'&&table==='item')filter=` where r.uuid::text not in(${uuidList})`;
      if(schema==='public'&&table==='content_source')filter=' where r.id<>16';
      return `select ${quote(schema+'.'+table)} name,count(*)||':'||md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'')) value from ${identifier(schema)}.${identifier(table)} r${filter}`;
    });
    return 'select jsonb_object_agg(name,value order by name) from('+branches.join(' union all ')+') tuples';
  }
  async function run(){
    await checkpoint('before historical023 fresh-import capsule');
    assert.equal(receipt.historical023_fresh_import_capsule,undefined,'One genuine capsule only');
    assert.equal(fixture.queryJson(`select to_jsonb((${inputs.helper.state}));`),true);
    const helperStatus=fixture.queryJson(`select to_jsonb(s) from ${inputs.helper.signature} s;`);
    assert.equal(helperStatus.recognized,false,'Genuine historical023 own-stage, not final100/101');
    const canonical=fixture.queryJson(`select coalesce(jsonb_agg(to_jsonb(i) order by id),'[]'::jsonb) from public.item i where uuid::text in(${uuidList});`);
    assert.equal(canonical.length,4);
    const typedRows=[];
    for(const item of spec.items){
      await checkpoint('historical023 independently typed '+item.name);
      const rows=canonical.filter(row=>String(row.uuid)===String(item.uuid));assert.equal(rows.length,1);assert.equal(rows[0].id,canonicalIds.get(String(item.uuid)));
      const typed=fixture.queryJson(`select to_jsonb(r) from jsonb_populate_record(null::public.item,${json(item.row)}) r;`);
      assert.deepEqual(template(rows[0]),template(typed),'Delete only exact approved full canonical row, not a modified printing');
      typedRows.push(typed);
    }
    const sourceBefore=fixture.queryJson('select to_jsonb(s) from public.content_source s where id=16;');
    assert.equal(sourceBefore.meta_data.counts.item,1113);
    assert.equal(fixture.queryJson('select to_jsonb(count(*)) from public.item where content_source_id=16;'),1113);
    const itemSequence=fixture.queryJson("select to_jsonb(pg_get_serial_sequence('public.item','id'));");assert.match(itemSequence,/^public\.[a-z_]+$/);
    const relations=fixture.queryJson("select coalesce(jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename) order by schemaname,tablename),'[]'::jsonb) from pg_tables where schemaname in('public','auth','proof');");
    assert.ok(relations.some(row=>row.schema==='auth'&&row.table==='users'));assert.ok(relations.some(row=>row.schema==='public'&&row.table==='character'));assert.ok(relations.some(row=>row.schema==='public'&&row.table==='content_update'));
    assert.equal(new Set(relations.map(row=>row.schema+'.'+row.table)).size,relations.length);
    const unrelated=tupleSql(relations),before=fixture.snapshot();
    const statement=`begin;set local lock_timeout='5s';set local statement_timeout='600s';
create temporary table native_fresh023_receipt(value jsonb) on commit drop;
do $native_fresh023$
declare unrelated_before jsonb;unrelated_after jsonb;row_count bigint;actual_rows jsonb;source_after jsonb;actual_count bigint;
begin
  lock table public.item in share row exclusive mode;
  lock table public.content_source in share row exclusive mode;
  lock table public.content_update in share mode;
  unrelated_before:=(${unrelated});
  delete from public.item i using jsonb_array_elements(${json(canonical)}) p
    where i.id=(p->>'id')::bigint and to_jsonb(i) is not distinct from p;
  get diagnostics row_count=row_count;
  if row_count<>4 then raise exception 'Native fresh023 canonical delete CAS failed';end if;
  update public.content_source s set meta_data=jsonb_set(s.meta_data::jsonb,'{counts,item}','1109'::jsonb,false)::json
    where s.id=16 and(to_jsonb(s)-'updated_at') is not distinct from(${json(sourceBefore)}-'updated_at');
  get diagnostics row_count=row_count;
  if row_count<>1 then raise exception 'Native fresh023 predecessor source CAS failed';end if;
  execute $native_fresh023_original$${batch.sql}$native_fresh023_original$;
  select coalesce(jsonb_agg(to_jsonb(i) order by id),'[]'::jsonb) into actual_rows from public.item i where uuid::text in(${uuidList});
  select to_jsonb(s) into source_after from public.content_source s where id=16;
  select count(*) into actual_count from public.item where content_source_id=16;
  unrelated_after:=(${unrelated});
  insert into pg_temp.native_fresh023_receipt(value) values(jsonb_build_object('rows',actual_rows,'source',source_after,'actual_item_count',actual_count,'transaction_time',transaction_timestamp(),'unrelated_before',unrelated_before,'unrelated_after',unrelated_after));
end $native_fresh023$;
select value from pg_temp.native_fresh023_receipt;rollback;`;
    await checkpoint('execute genuine historical023 rollback capsule');
    const result=fixture.sql(statement,true);
    assert.equal(result.error==null,true);assert.equal(result.signal,null);assert.equal(result.status,0,'Actual original023 fresh branch must succeed, not a guard failure');
    const lines=result.stdout.trim().split('\n').filter(Boolean);assert.equal(lines.length,1);
    const actual=JSON.parse(lines[0]),after=fixture.snapshot();
    const proof=assertFreshEquipmentProjection({typedRows,actual,before,after,sourceBefore,itemSequence});
    receipt.historical023_fresh_import_capsule={passed:true,path:batch.path,original_sql_sha256:sha(batch.sql),capsule_sql_sha256:sha(statement),canonical_ids_preserved:canonical.map(row=>row.id),canonical_full_tuple_rollback:true,source_count_predecessor:1109,source_count_terminal:1113,complete_independent_typed_projection:true,unrelated_full_tuples_inside_and_after_preserved:true,schema_roles_saved_queue_preserved:true,...proof,exemptions:{fresh_rows:['actual nextval-derived id','actual created_at','updated_at','search_tsv'],affected_source:['updated_at inside capsule only'],after_rollback:['exactly four item nextvals, no identity reset']},scope:'Own-stage rollback capsule of the true missing-four import branch. Not the unchanged canonical primary CI bootstrap or a final100/101 catalog assertion.'};
    await checkpoint('after genuine historical023 rollback capsule');
    return receipt.historical023_fresh_import_capsule;
  }
  return {path:batch.path,run,scope:'Own-stage rollback capsule only, construction executes no SQL'};
}
