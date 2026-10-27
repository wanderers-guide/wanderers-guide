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
  const original=originalBookCountBody(inputs.helper.body);
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
