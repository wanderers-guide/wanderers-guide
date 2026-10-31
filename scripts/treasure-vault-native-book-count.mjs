/** Recognize the exact two published Core Rulebook Litany additions without changing content. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const BOOK_COUNT_UPGRADE_PATH = '20261027000000_curator_book_count_compatibility.sql';
export const PREVIOUS_CURATOR_TERMINAL_SHA256 = '798819e3febae6a944bd3cfdec2ae84d8ff893ee6c7859e7266a5bff3f333444';
export const bookCountSpec = JSON.parse(readFileSync(new URL('./treasure-vault-book-count-successor.json', import.meta.url), 'utf8'));
const sha = (value) => createHash('sha256').update(value).digest('hex');
const literal = (value, tag) => `$${tag}$${JSON.stringify(value).replaceAll('$', '\\u0024')}$${tag}$::jsonb`;
const prefix = 'global_terminal_source_actual as materialized(select e.value as expected,s.id as actual_id,';
const suffix = ' as row from global_terminal_settings';

assert.equal(bookCountSpec.before.id, 11);
assert.equal(bookCountSpec.before.meta_data.counts.feat, 282);
assert.deepEqual(bookCountSpec.after, { ...bookCountSpec.before, meta_data: { ...bookCountSpec.before.meta_data, counts: { ...bookCountSpec.before.meta_data.counts, feat: 284 } } });
assert.deepEqual(bookCountSpec.feats.map(({ id, type, content_source_id }) => [id, type, content_source_id]), [[60080, 'feat', 11], [60081, 'feat', 11]]);

/** Reject partial rows, changed operations, aliases and unresolved submissions before normalizing one counter. */
function projection(original) {
  const feats = literal(bookCountSpec.feats, 'book_count_feats');
  return `case when s.id=11 and (to_jsonb(s)-'updated_at')=${literal(bookCountSpec.after, 'book_count_source_after')}
 and (select count(*) from public.ability_block where content_source_id=11 and type='feat')=284
 and (select count(*)=2 and bool_and((((to_jsonb(a)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',a.uuid::text))=f.row) is true) from jsonb_array_elements(${feats}) f(row) left join public.ability_block a on a.id=(f.row->>'id')::bigint)
 and not exists(select 1 from public.ability_block a cross join jsonb_array_elements(${feats}) f(row) where a.id<>(f.row->>'id')::bigint and (a.uuid::text=f.row->>'uuid' or (a.content_source_id=11 and lower(btrim(a.name))=lower(btrim(f.row->>'name')))))
 and not exists(select 1 from public.content_update u cross join jsonb_array_elements(${feats}) f(row) where upper(btrim(coalesce(u.status->>'state','PENDING'))) not in('APPROVED','REJECTED') and u.type in('ability-block','feat') and (u.ref_id=(f.row->>'id')::bigint or u.data->>'id'=f.row->>'id' or u.data->>'uuid'=f.row->>'uuid' or ((u.content_source_id=11 or u.data->>'content_source_id'='11') and lower(btrim(u.data->>'name'))=lower(btrim(f.row->>'name')))))
 then ${literal(bookCountSpec.before, 'book_count_source_before')} else (${original}) end`;
}

/** One exact source projection changes; the entire prior function is recoverable byte for byte. */
export function bookCountReplacement(body) {
  assert.equal(sha(body), PREVIOUS_CURATOR_TERMINAL_SHA256);
  assert.equal(body.split(prefix).length, 2);
  const start = body.indexOf(prefix) + prefix.length;
  const end = body.indexOf(suffix, start);
  assert(end > start);
  const before = prefix + body.slice(start, end) + suffix;
  return [before, prefix + projection(body.slice(start, end)) + suffix];
}

export function upgradeBookCountBody(body) {
  const [before, after] = bookCountReplacement(body);
  return body.replace(before, () => after);
}

export function originalBookCountBody(body) {
  const start = body.indexOf(prefix) + prefix.length;
  const end = body.indexOf(suffix, start);
  const expression = body.slice(start, end);
  const marker = ` else (`;
  const count = expression.lastIndexOf(marker);
  assert(count > 0 && expression.endsWith(') end'));
  const original = body.slice(0, start) + expression.slice(count + marker.length, -5) + body.slice(end);
  assert.equal(sha(original), PREVIOUS_CURATOR_TERMINAL_SHA256);
  assert.equal(upgradeBookCountBody(original), body);
  return original;
}

export const BOOK_COUNT_NATIVE_CONTROLS = Object.freeze([
  'book-count-original-282',
  'book-count-counter-without-additions',
  'book-count-complete-284',
  'book-count-wrong-real-count',
  'book-count-source-metadata-drift',
  'book-count-missing-feat',
  'book-count-feat-operation-drift',
  'book-count-feat-identity-drift',
  'book-count-pending-id',
  'book-count-pending-name',
  'book-count-protected-row-drift',
  'book-count-template-drift',
  'book-count-deployed-upgrade-replay',
  'book-count-predecessor-body',
  'book-count-predecessor-metadata',
  'book-count-predecessor-acl',
  'book-count-historical-replays',
]);

/** Exercise the real helper and full rollback through the existing owned native fixture. */
export async function runNativeBookCountControls({ inputs, fixture, capsule, userId }) {
  const pass = {recognized:true,passed:true}, fail = {recognized:true,passed:false};
  const status = `select row_to_json(s) from ${inputs.helper.signature} s;`;
  const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
  const columns = fixture.queryJson("select jsonb_agg(column_name order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='ability_block' and is_generated='NEVER';").map(name=>'"'+name+'"').join(',');
  const insert = (row) => `insert into public.ability_block(${columns}) select ${columns} from jsonb_populate_record(null::public.ability_block,${quote(JSON.stringify(row))}::jsonb||jsonb_build_object('updated_at',now()));`;
  const source = `update public.content_source set meta_data=${quote(JSON.stringify(bookCountSpec.after.meta_data))}::jsonb where id=11;`;
  const additions = bookCountSpec.feats.map(insert).join('\n');
  const baselineCount = fixture.queryJson("select to_jsonb(count(*)) from public.ability_block where content_source_id=11 and type='feat';");
  assert.equal(baselineCount,282,'The pinned historical fixture contains the complete original Core Rulebook feat corpus');
  const clean = additions + source;
  // Explicit fixture-only IDs avoid sequence changes, including in rollback capsules.
  const extra = {...bookCountSpec.feats[0], id:900000001, uuid:'900000000000000001', name:'Native book count witness'};
  await capsule('book-count-original-282',status,[pass]);
  await capsule('book-count-counter-without-additions',source+status,[fail]);
  await capsule('book-count-complete-284',clean+status,[pass]);
  await capsule('book-count-wrong-real-count',clean+insert(extra)+source+status,[fail]);
  await capsule('book-count-source-metadata-drift',clean+"update public.content_source set name=name||' unreviewed' where id=11;"+status,[fail]);
  await capsule('book-count-missing-feat',clean+"delete from public.ability_block where id=60080;"+insert(extra)+source+status,[fail]);
  await capsule('book-count-feat-operation-drift',clean+"update public.ability_block set operations='{}'::json[] where id=60080;"+status,[fail]);
  await capsule('book-count-feat-identity-drift',clean+"update public.ability_block set uuid=900000000000000002 where id=60080;"+status,[fail]);
  for(const [name,data] of [['id',{id:60080}],['name',{name:bookCountSpec.feats[0].name}]]){
    const pending=`insert into public.content_update(id,type,content_source_id,action,data,upvotes,downvotes,status,user_id) values((select coalesce(max(id),0)+1 from public.content_update),'ability-block',11,'UPDATE',${quote(JSON.stringify(data))}::jsonb,'{}'::json[],'{}'::json[],'{"state":"PENDING"}'::jsonb,${quote(userId)}::uuid);`;
    await capsule('book-count-pending-'+name,clean+pending+status,[fail]);
  }
  await capsule('book-count-protected-row-drift',clean+"update public.item set description=description||' unreviewed' where id=12183;"+status,[fail]);
  const template=inputs.helper.proof.templates.find(row=>row.table==='item');
  assert(template);
  await capsule('book-count-template-drift',clean+`update public.item set name=name||' unreviewed' where uuid=${quote(template.uuid)}::bigint;`+status,[fail]);
  const original=originalBookCountBody(sha(inputs.helper.body)===MODE_COUNT_TERMINAL_SHA256?originalModeCountBody(inputs.helper.body):inputs.helper.body);
  const predecessor=inputs.helper.definition.replace(inputs.helper.body,()=>original).replace('create function ','create or replace function ');
  await capsule('book-count-deployed-upgrade-replay',predecessor+clean+status+inputs.curatorCompatibility.upgrade+status+inputs.curatorCompatibility.upgrade+status,[fail,pass,pass]);
  for(const [name,mutation] of [
    ['body',predecessor.replace(original,()=>original+'\n')],
    ['metadata',`alter function ${inputs.helper.signature} cost 1;`],
    ['acl',`grant execute on function ${inputs.helper.signature} to public;`],
  ]) await capsule('book-count-predecessor-'+name,predecessor+mutation+inputs.curatorCompatibility.upgrade,[],true);
  const replays=[...inputs.actualWrapperMetadata,inputs.completionWrapper,inputs.display];
  assert.equal(replays.length,41);
  const replay=replays.map(row=>row.sql.replace(/^begin;\n/,'').replace(/commit;\n$/,'')).join('\n');
  await capsule('book-count-historical-replays',clean+replay+status,[pass]);
}

/** The approved Overflowing addition changes only Impossible Magic's mode count. */
export const MODE_COUNT_UPGRADE_PATH = '20261029000000_overflowing_mode_count_compatibility.sql';
export const PREVIOUS_MODE_TERMINAL_SHA256 = 'a07223d6cd719e484a994ea965405c8f72820d927fb1ea3086b27b6e3981adca';
export const MODE_COUNT_TERMINAL_SHA256 = '04b8c42f598632cac674719222e79824af9f0057b7473747a5de11ae7d43f58a';
export const modeCountSpec = JSON.parse(readFileSync(new URL('./treasure-vault-mode-count-successor.json', import.meta.url), 'utf8'));
assert.equal(modeCountSpec.before.id,842);
assert.equal(modeCountSpec.before.meta_data.counts.mode,1);
assert.deepEqual(modeCountSpec.after,{...modeCountSpec.before,meta_data:{...modeCountSpec.before.meta_data,counts:{...modeCountSpec.before.meta_data.counts,mode:2}}});
assert.deepEqual([modeCountSpec.mode.id,modeCountSpec.mode.type,modeCountSpec.mode.content_source_id],[60082,'mode',842]);
assert.ok(modeCountSpec.mode.description.length>0);
const modeMarker=' else /* mode107 predecessor */ (';

/** Accept the complete reviewed mode, real count and identities before projecting one counter. */
function modeProjection(original) {
  const mode=literal(modeCountSpec.mode,'mode107_row');
  return `case when s.id=842 and (to_jsonb(s)-'updated_at')=${literal(modeCountSpec.after,'mode107_source_after')}
 and (select count(*) from public.ability_block where content_source_id=842 and type='mode')=2
 and exists(select 1 from public.ability_block a where a.id=60082 and ((to_jsonb(a)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',a.uuid::text))=${mode})
 and not exists(select 1 from public.ability_block a where a.id<>60082 and (a.uuid::text=${mode}->>'uuid' or(a.content_source_id=842 and lower(btrim(a.name))=lower(btrim(${mode}->>'name')))))
 and not exists(select 1 from public.content_update u where upper(btrim(coalesce(u.status->>'state','PENDING'))) not in('APPROVED','REJECTED') and u.type in('ability-block','mode') and (u.ref_id=60082 or u.data->>'id'='60082' or u.data->>'uuid'=${mode}->>'uuid' or((u.content_source_id=842 or u.data->>'content_source_id'='842') and lower(btrim(u.data->>'name'))=lower(btrim(${mode}->>'name')))))
 then ${literal(modeCountSpec.before,'mode107_source_before')}${modeMarker}${original}) end`;
}

/** Preserve the complete a072 predecessor and replace just its source projection. */
export function modeCountReplacement(body) {
  assert.equal(sha(body),PREVIOUS_MODE_TERMINAL_SHA256);
  assert.equal(body.split(prefix).length,2);
  const start=body.indexOf(prefix)+prefix.length,end=body.indexOf(suffix,start);
  assert(end>start);
  return [prefix+body.slice(start,end)+suffix,prefix+modeProjection(body.slice(start,end))+suffix];
}
/** Apply the single source projection to the exact reviewed predecessor. */
export function upgradeModeCountBody(body) {
  const [before,after]=modeCountReplacement(body);
  return body.replace(before,()=>after);
}
/** Recover and hash the entire predecessor, rejecting any altered allowance. */
export function originalModeCountBody(body) {
  const start=body.indexOf(prefix)+prefix.length,end=body.indexOf(suffix,start),expression=body.slice(start,end);
  assert.equal(expression.split(modeMarker).length,2);
  assert(expression.endsWith(') end'));
  const original=body.slice(0,start)+expression.slice(expression.indexOf(modeMarker)+modeMarker.length,-5)+body.slice(end);
  assert.equal(sha(original),PREVIOUS_MODE_TERMINAL_SHA256);
  assert.equal(upgradeModeCountBody(original),body);
  return original;
}

/** Upgrade only the exact installed helper and retain metadata, owner and grants. */
export function modeCountUpgrade({body,previousState,state,signature}) {
  const [before,after]=modeCountReplacement(body);
  assert.equal(sha(upgradeModeCountBody(body)),MODE_COUNT_TERMINAL_SHA256);
  return `-- Recognize only the complete approved Overflowing mode and its exact source count.
do $mode107_upgrade$
declare body text;
begin
 if (${state}) is true then return; end if;
 if (${previousState}) is not true then raise exception 'Overflowing helper predecessor differs'; end if;
 select prosrc into strict body from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('${signature}');
 body:=replace(body,$mode107_before$${before}$mode107_before$,$mode107_after$${after}$mode107_after$);
 if pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(body,'UTF8')),'hex')<>'${MODE_COUNT_TERMINAL_SHA256}' then raise exception 'Overflowing helper successor differs'; end if;
 execute 'create or replace function ${signature} returns table(recognized boolean,passed boolean) language sql stable security invoker parallel unsafe cost 100 rows 1 set search_path = '''' as '||pg_catalog.quote_literal(body)||';';
 if (${state}) is not true then raise exception 'Overflowing helper readback differs'; end if;
end $mode107_upgrade$;
`;
}

/** Preserve every previous installer byte inside the additional compatibility layer. */
export function wrapModeCountUpgrade(originalSql,upgrade,state) {
  if(originalSql.startsWith('begin;\n')){assert(originalSql.endsWith('commit;\n'));return 'begin;\n'+wrapModeCountUpgrade(originalSql.slice(7,-8),upgrade,state)+'commit;\n';}
  return `-- Preserve the exact previous compatibility installer.
do $mode107_wrapper$
begin
 if (${state}) is true then return; end if;
 execute $mode107_previous$${originalSql}$mode107_previous$;
 execute $mode107_next$${upgrade}$mode107_next$;
end $mode107_wrapper$;
`;
}

export const MODE_COUNT_NATIVE_CONTROLS=Object.freeze([
  'mode-count-original-one','mode-count-counter-without-addition','mode-count-complete-two','mode-count-wrong-real-count',
  'mode-count-source-drift','mode-count-missing-mode','mode-count-description-drift','mode-count-operation-drift','mode-count-identity-drift',
  'mode-count-uuid-alias','mode-count-name-alias','mode-count-pending-ref','mode-count-pending-id','mode-count-pending-name','mode-count-pending-uuid',
  'mode-count-protected-row-drift','mode-count-template-drift','mode-count-deployed-upgrade-replay',
  'mode-count-predecessor-body','mode-count-predecessor-metadata','mode-count-predecessor-acl','mode-count-historical-replays',
]);

/** Verify the additional allowance and every rejection in the existing owned rollback fixture. */
export async function runNativeModeCountControls({inputs,fixture,capsule,userId}) {
  const pass={recognized:true,passed:true},fail={recognized:true,passed:false};
  const status=`select row_to_json(s) from ${inputs.helper.signature} s;`;
  const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
  const columns=fixture.queryJson("select jsonb_agg(column_name order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='ability_block' and is_generated='NEVER';").map(name=>'"'+name+'"').join(',');
  const insert=row=>`insert into public.ability_block(${columns}) select ${columns} from jsonb_populate_record(null::public.ability_block,${quote(JSON.stringify(row))}::jsonb||jsonb_build_object('updated_at',now()));`;
  const source=`update public.content_source set meta_data=${quote(JSON.stringify(modeCountSpec.after.meta_data))}::jsonb where id=842;`;
  assert.equal(fixture.queryJson("select to_jsonb(count(*)) from public.ability_block where content_source_id=842 and type='mode';"),1);
  const clean=insert(modeCountSpec.mode)+source;
  const extra={...modeCountSpec.mode,id:900000051,uuid:'900000000000000051',name:'Owned native mode count witness'};
  await capsule('mode-count-original-one',status,[pass]);
  await capsule('mode-count-counter-without-addition',source+status,[fail]);
  await capsule('mode-count-complete-two',clean+status,[pass]);
  await capsule('mode-count-wrong-real-count',clean+insert(extra)+status,[fail]);
  await capsule('mode-count-source-drift',clean+"update public.content_source set name=name||' unreviewed' where id=842;"+status,[fail]);
  await capsule('mode-count-missing-mode',clean+"delete from public.ability_block where id=60082;"+insert(extra)+status,[fail]);
  await capsule('mode-count-description-drift',clean+"update public.ability_block set description='' where id=60082;"+status,[fail]);
  await capsule('mode-count-operation-drift',clean+"update public.ability_block set operations='{}'::json[] where id=60082;"+status,[fail]);
  await capsule('mode-count-identity-drift',clean+"update public.ability_block set uuid=900000000000000052 where id=60082;"+status,[fail]);
  // The owned rollback capsule removes the unique fence only to exercise the helper's
  // independent alias rejection. PostgreSQL restores the constraint on rollback.
  await capsule('mode-count-uuid-alias',clean+'alter table public.ability_block drop constraint ability_block_uuid_key;'+insert({...extra,type:'feat',uuid:modeCountSpec.mode.uuid})+status,[fail]);
  assert.equal(fixture.query("select count(*) from pg_constraint where conrelid='public.ability_block'::regclass and conname='ability_block_uuid_key';"),'1');
  await capsule('mode-count-name-alias',clean+insert({...extra,type:'feat',name:modeCountSpec.mode.name})+status,[fail]);
  for(const [name,data,ref] of [['ref',{},60082],['id',{id:60082},null],['name',{name:modeCountSpec.mode.name},null],['uuid',{uuid:modeCountSpec.mode.uuid},null]]) {
    const pending=`insert into public.content_update(id,type,ref_id,content_source_id,action,data,upvotes,downvotes,status,user_id) values((select coalesce(max(id),0)+1 from public.content_update),'ability-block',${ref??'null'},842,'UPDATE',${quote(JSON.stringify(data))}::jsonb,'{}'::json[],'{}'::json[],'{"state":"PENDING"}'::jsonb,${quote(userId)}::uuid);`;
    await capsule('mode-count-pending-'+name,clean+pending+status,[fail]);
  }
  await capsule('mode-count-protected-row-drift',clean+"update public.item set description=description||' unreviewed' where id=12183;"+status,[fail]);
  const template=inputs.helper.proof.templates.find(row=>row.table==='item');assert(template);
  await capsule('mode-count-template-drift',clean+`update public.item set name=name||' unreviewed' where uuid=${quote(template.uuid)}::bigint;`+status,[fail]);
  const original=originalModeCountBody(inputs.helper.body);
  const predecessor=inputs.helper.definition.replace(inputs.helper.body,()=>original).replace('create function ','create or replace function ');
  await capsule('mode-count-deployed-upgrade-replay',predecessor+clean+status+inputs.modeCountCompatibility.upgrade+status+inputs.modeCountCompatibility.upgrade+status,[fail,pass,pass]);
  for(const [name,mutation] of [['body',predecessor.replace(original,()=>original+'\n')],['metadata',`alter function ${inputs.helper.signature} cost 1;`],['acl',`grant execute on function ${inputs.helper.signature} to public;`]])
    await capsule('mode-count-predecessor-'+name,predecessor+mutation+inputs.modeCountCompatibility.upgrade,[],true);
  const replays=[...inputs.actualWrapperMetadata,inputs.completionWrapper,inputs.display];assert.equal(replays.length,41);
  const replay=replays.map(row=>row.sql.replace(/^begin;\n/,'').replace(/commit;\n$/,'')).join('\n');
  await capsule('mode-count-historical-replays',clean+replay+status,[pass]);
}
