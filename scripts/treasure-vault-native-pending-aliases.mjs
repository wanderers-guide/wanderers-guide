import assert from 'node:assert/strict';
import { selectReleaseNegativeCases } from './treasure-vault-native-negatives.mjs';

const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
const json = value => quote(JSON.stringify(value)) + '::json';
const key = value => `${value.role}:${value.table}:${value.type}`;
const normalizedAlias = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Pure structural-route recipes for the one actual shared terminal helper.
 * No files, connections, Auth users, SQL or sequence requests at construction.
 * prepare() verifies the real caller-owned GoTrue/public-user proof and reserves
 * an explicit unused proposal ID before the phase runner takes its baseline.
 */
export function createSharedHelperPendingAliasControls({inputs,userId,reserveProposalId,queryJson,receipt,releaseScope=false}) {
  assert.equal(inputs.input_provenance.mode, 'checked-in-default');
  assert.match(userId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  assert.equal(typeof reserveProposalId, 'function'); assert.equal(typeof queryJson, 'function');
  const proof = inputs.helper.proof, wrapper = inputs.completionWrapper;
  assert.equal(proof.entries.length, 2349); assert.equal(proof.templates.length, 11); assert.equal(proof.sources.length, 31);
  const neutralSource = proof.sources.find(row=>row.id===3);
  assert.ok(neutralSource, 'The neutral FK header is an exact verified public source');
  const knownIds = new Set(proof.known_pending_dependencies.map(row => row.id));
  const descriptors = [], routes = new Set();
  const unusual = 'Native unrelated pending description';
  const state = {state:'PENDING'};
  function add(domain, target, route, type, data = {}, source = null, ref = null, expected = false, status = state) {
    assert.match(type, /^[a-z-]+$/);
    assert.ok(source == null || Number.isSafeInteger(source) && source > 0);
    assert.ok(ref == null || Number.isSafeInteger(ref) && ref > 0);
    const name = `shared-helper:${domain}:${target}:${route}:${type}`;
    assert.ok(!descriptors.some(row => row.name === name));
    descriptors.push({name,domain,target,route,type,data:{description:unusual,...structuredClone(data)},source:source ?? neutralSource.id,source_independent:source==null,ref,expected,status:structuredClone(status)});
    routes.add(`${domain}:${route}:${type}`);
  }
  function identities(domain, target, row, type) {
    add(domain,target,'ref-id',type,{},null,row.id);
    add(domain,target,'data-id',type,{id:row.id});
    add(domain,target,'canonical-uuid',type,{uuid:row.uuid});
    if (String(row.before_uuid) !== String(row.uuid)) add(domain,target,'before-uuid',type,{uuid:row.before_uuid});
    const name = '  ' + row.name.toUpperCase() + '  ';
    add(domain,target,'canonical-name-top-source',type,{name},row.content_source_id);
    add(domain,target,'canonical-name-data-source',type,{name,content_source_id:row.content_source_id},row.content_source_id === 16 ? 3 : 16);
    if (row.before_name !== row.name) {
      add(domain,target,'before-name-top-source',type,{name:'  '+row.before_name.toUpperCase()+'  '},row.content_source_id);
      add(domain,target,'before-name-data-source',type,{name:'  '+row.before_name.toUpperCase()+'  ',content_source_id:row.content_source_id},row.content_source_id === 16 ? 3 : 16);
    }
    for (const [index,url] of row.url_aliases.entries()) add(domain,target,'citation-'+index,type,{meta_data:{source:{url:'  '+url.toUpperCase()+'  '}}});
  }
  const representatives = new Map();
  for (const row of proof.entries) {
    const identity = key(row);
    // One representative for each predicate/table/subtype/role shape; prefer rows with old identity aliases.
    const previous = representatives.get(identity);
    const score = value => Number(value.before_name !== value.name) + Number(String(value.before_uuid) !== String(value.uuid)) + value.url_aliases.length;
    if (!previous || score(row) > score(previous)) representatives.set(identity,row);
  }
  for (const [target,row] of [...representatives].sort(([left],[right])=>left.localeCompare(right))) {
    identities(row.role,target,row,row.type);
    if (row.table === 'ability_block' && row.type !== 'ability-block') identities(row.role,target+'-generic',row,'ability-block');
  }
  for (const row of proof.sources) {
    const target = String(row.id), type = 'content-source';
    add('source',target,'ref-id',type,{},null,row.id);
    add('source',target,'data-id',type,{id:row.id});
    add('source',target,'normalized-name',type,{name:'  '+row.name.toUpperCase()+'  '});
    for (const [index,url] of row.url_aliases.entries()) {
      add('source',target,'top-url-'+index,type,{url:'  '+url.toUpperCase()+'  '});
      add('source',target,'nested-url-'+index,type,{meta_data:{source:{url:'  '+url.toUpperCase()+'  '}}});
    }
  }
  for (const row of proof.templates) {
    const target = String(row.uuid), type = row.type;
    add('template',target,'runtime-ref-id',type,{__native_runtime_ref:target});
    add('template',target,'runtime-data-id',type,{__native_runtime_id:target});
    add('template',target,'canonical-uuid',type,{uuid:row.uuid});
    add('template',target,'canonical-name-top-source',type,{name:'  '+row.name.toUpperCase()+'  '},16);
    add('template',target,'canonical-name-data-source',type,{name:'  '+row.name.toUpperCase()+'  ',content_source_id:16},3);
    for (const [index,url] of row.url_aliases.entries()) add('template',target,'canonical-url-'+index,type,{meta_data:{source:{url:'  '+url.toUpperCase()+'  '}}});
    for (const [aliasIndex,alias] of row.aliases.entries()) {
      assert.ok(Array.isArray(alias.names) && Array.isArray(alias.citation_ids));
      for (const [nameIndex,name] of alias.names.entries()) {
        assert.equal(normalizedAlias(name),name);
        add('template',target,`alias-${aliasIndex}-name-${nameIndex}-top-source`,type,{name:'  '+name.toUpperCase().replaceAll(' ','--')+' additional printing  '},16);
        add('template',target,`alias-${aliasIndex}-name-${nameIndex}-data-source`,type,{name:'  '+name.toUpperCase().replaceAll(' ','--')+' additional printing  ',content_source_id:16},3);
      }
      for (const [index,id] of alias.citation_ids.entries()) {
        assert.match(String(id), /^[0-9]+$/);
        add('template',target,`alias-${aliasIndex}-citation-${index}`,type,{meta_data:{source:{url:`  HTTP://2E.AONPRD.COM/EQUIPMENT.ASPX?EXTRA=1&ID=${id}&PRINT=TRUE  `}}});
      }
    }
  }
  const target = proof.entries.find(row=>row.table==='item' && row.role==='owner' && row.content_source_id===16
    && !proof.entries.some(peer=>peer.type===row.type && peer.content_source_id===3
      && [peer.name,peer.before_name].some(name=>String(name).trim().toLowerCase()===row.name.trim().toLowerCase()))); assert.ok(target);
  for (const [label,status] of [['missing-state',{}],['null-state',{state:null}],['normalized-pending',{state:' pending '}],['unknown-state',{state:'SUBMITTED'}]]) add('state',String(target.id),label,target.type,{id:target.id},null,null,false,status);
  for (const [label,status] of [['normalized-approved',{state:' approved '}],['normalized-rejected',{state:' ReJeCtEd '}]]) add('state',String(target.id),label,target.type,{id:target.id},null,null,true,status);
  add('state',String(target.id),'normalized-approved-ref-id',target.type,{},null,target.id,true,{state:' approved '});
  // A matching name without either correct source is not an identity assertion.
  const wrongSource = target.content_source_id === 16 ? 3 : 16;
  add('lexical-negative',String(target.id),'same-name-wrong-source',target.type,{name:target.name},wrongSource,null,true);
  const unrelatedName='Native wholly unrelated pending proposal';
  assert.ok(!proof.entries.some(row=>[row.name,row.before_name].includes(unrelatedName)));
  assert.ok(!proof.templates.some(row=>row.name===unrelatedName || row.aliases.some(alias=>alias.names.some(name=>normalizedAlias(unrelatedName).startsWith(name)))));
  add('lexical-negative','unrelated','unique-name-valid-source','item',{name:unrelatedName},16,null,true);
  const wrongType='physical-feature';
  assert.ok(!proof.entries.some(row=>row.id===target.id && (row.type===wrongType || row.table==='ability_block' && wrongType==='ability-block')));
  add('lexical-negative',String(target.id),'wrong-queue-kind-target-id',wrongType,{id:target.id},null,null,true);

  function prepare(descriptor, terminal) {
    assert.ok(['100','101'].includes(terminal));
    assert.equal(queryJson(`select to_jsonb((${inputs.helper.state}));`),true,'Actual helper definition is exact before the fixture is added');
    assert.deepEqual(queryJson(`select to_jsonb(s) from ${inputs.helper.signature} s;`),{recognized:true,passed:true},'An unrelated baseline drift must not masquerade as the intended pending-alias rejection');
    const marker=proof.entries.find(row=>row.sha256_100!==row.sha256_101); assert.ok(marker);
    assert.match(marker.table,/^[a-z_]+$/);
    const digest=queryJson(`select to_jsonb(encode(sha256(convert_to(((to_jsonb(r)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',r.uuid::text))::text,'UTF8')),'hex')) from public.${marker.table} r where id=${marker.id};`);
    assert.equal(digest,marker['sha256_'+terminal],'Actual current complete-row phase marker, not a caller-only terminal label');
    assert.equal(receipt.owned_auth_fixture?.real_signup, true, 'Caller must supply actual GoTrue provenance');
    assert.equal(receipt.owned_auth_fixture?.auth_and_public_trigger_match, true);
    assert.equal(receipt.owned_auth_fixture?.user_id,userId);
    assert.deepEqual(queryJson(`select jsonb_build_object('auth',(select count(*) from auth.users where id=${quote(userId)}::uuid),'public',(select count(*) from public.public_user where user_id=${quote(userId)}::uuid));`),{auth:1,public:1});
    const id = reserveProposalId(); assert.ok(Number.isSafeInteger(id) && id>0 && !knownIds.has(id));
    assert.equal(queryJson(`select to_jsonb(exists(select 1 from public.content_update where id=${id}));`),false);
    const data = structuredClone(descriptor.data); let ref = descriptor.ref;
    const token = data.__native_runtime_ref ?? data.__native_runtime_id;
    if (token) {
      const template = proof.templates.find(row=>String(row.uuid)===token); assert.ok(template);
      assert.ok(['item','creature'].includes(template.table));
      const rows = queryJson(`select coalesce(jsonb_agg(jsonb_build_object('id',id,'uuid',uuid::text,'content_source_id',content_source_id)),'[]'::jsonb) from public.${template.table} where uuid::text=${quote(token)};`);
      assert.equal(rows.length,1); assert.ok(Number.isSafeInteger(rows[0].id) && rows[0].id>0); assert.equal(rows[0].uuid,token); assert.equal(rows[0].content_source_id,16);
      if (data.__native_runtime_ref) ref=rows[0].id; else data.id=rows[0].id;
      delete data.__native_runtime_ref; delete data.__native_runtime_id;
    }
    const insert = `insert into public.content_update(id,user_id,type,ref_id,content_source_id,action,data,upvotes,downvotes,status) values(${id},${quote(userId)}::uuid,${quote(descriptor.type)},${ref ?? 'null'},${descriptor.source ?? 'null'},'UPDATE',${json(data)},'{}','{}',${json(descriptor.status)});`;
    const expected = {recognized:true,passed:descriptor.expected};
    const probe = `do $native_pending_probe$ begin if (${inputs.helper.state}) is not true then raise exception 'Native shared helper definition changed';end if;if (select to_jsonb(s) from ${inputs.helper.signature} s) is distinct from ${quote(JSON.stringify(expected))}::jsonb then raise exception 'Native shared helper pending-route assertion failed';end if;end $native_pending_probe$;`;
    return {setup:insert+probe,batch:wrapper,expectedScriptExit:3,expectedSignal:null,expectedSqlState:'P0001',match:/ERROR:\s+P0001:\s+Treasure Vault catalog\/display successor is partial or unreviewed/,includeRelease:true,assertions:[],reservations:[{table:'content_update',id}],sequence_expectation:{expected_nextval_calls:{},all_other_sequences_unchanged:true},descriptor:{...descriptor,id,data,ref},expected};
  }
  const coverage = {pending_cases:descriptors.filter(row=>!row.expected).length,unrelated_or_inactive_cases:descriptors.filter(row=>row.expected).length,required_terminals:['100','101'],entry_structural_groups:representatives.size,source_headers:proof.sources.length,authored_templates:proof.templates.length,routes:[...routes].sort(),neutral_verified_FK_source_id:neutralSource.id,schema_unconstructible:[{route:'same-name-no-top-source',reason:'content_update.content_source_id is NOT NULL; absent nested data source can be tested, but a physically absent top-level source cannot exist in the actual schema.'}],scope:'Every structural owner/dependency table+subtype+role route; all31 sources; all11 templates and each authored historical name/citation alias. Not an individual insertion test for every2349 catalog entry.',private_known_row_acceptance:false};
  function atTerminal(terminal) {
    assert.ok(['100','101'].includes(terminal));
    const makeRecipe=descriptor=>({name:descriptor.name,phase:'shared-helper-pending-aliases:'+terminal,batch:wrapper,prepare:()=>prepare(descriptor,terminal)});
    return {cases:descriptors.filter(row=>!row.expected).map(makeRecipe),positiveCases:descriptors.filter(row=>row.expected).map(makeRecipe)};
  }

  /** Positive inactive/unrelated proposals must not suppress legitimate no-op repairs. */
  function positive(recipe, fixture) {
    const control=recipe.prepare(),before=fixture.snapshot();
    const result=fixture.sql('begin;'+control.setup+'\n'+wrapper.sql+'\nselect coalesce(jsonb_agg(to_jsonb(r)),\'[]\'::jsonb) from ('+wrapper.releaseSql.trim().replace(/;\s*$/,'')+') r;rollback;');
    assert.equal(result.error==null,true,'Positive transport must complete');
    assert.equal(result.status,0);assert.equal(result.signal,null,'An interrupted or failed positive cannot qualify');
    const rows=JSON.parse(result.stdout.trim()); assert.ok(rows.length && rows.every(row=>row.passed===true));
    assert.equal(new Set(rows.map(row=>row.id)).size,rows.length);
    assert.deepEqual(fixture.snapshot(),before,'Inactive/unrelated proposal fixture, wrapper and release preserve all rows/schema/roles/sequences');
    (receipt.shared_helper_pending_alias_positives ??= []).push({name:recipe.name,phase:recipe.phase,passed:true,reservations:control.reservations,actual_exit_status:result.status,actual_signal:result.signal,no_transport_error:result.error==null,actual_helper:true,actual_wrapper:true,actual_release:true,full_rollback:true});
  }
  function complete() {
    for(const terminal of ['100','101']) {
      const phase='shared-helper-pending-aliases:'+terminal,plan=atTerminal(terminal);
      if(releaseScope)plan.cases=selectReleaseNegativeCases(plan);
      const negatives=(receipt.negative_controls??[]).filter(row=>row.phase===phase);
      const positives=(receipt.shared_helper_pending_alias_positives??[]).filter(row=>row.phase===phase);
      assert.equal(negatives.length,plan.cases.length); assert.equal(new Set(negatives.map(row=>row.name)).size,negatives.length);
      assert.equal(positives.length,plan.positiveCases.length); assert.equal(new Set(positives.map(row=>row.name)).size,positives.length);
      assert.deepEqual(negatives.map(row=>row.name).sort(),plan.cases.map(row=>row.name).sort());
      assert.deepEqual(positives.map(row=>row.name).sort(),plan.positiveCases.map(row=>row.name).sort());
      assert.ok(negatives.every(row=>row.original_guard && row.guard_message_matched===true && row.setup_type_proved && row.setup_status===0 && row.setup_signal===null && row.actual_exit_status===3 && row.actual_signal===null && row.no_transport_error===true && row.expected_sqlstate==='P0001' && row.rollback_schema_tuples_saved_preserved),'Every alias negative requires exact setup/script exit/SQLSTATE/guard evidence');
      assert.ok(positives.every(row=>row.passed && row.actual_exit_status===0 && row.actual_signal===null && row.no_transport_error===true && row.actual_helper && row.actual_wrapper && row.actual_release && row.full_rollback));
    }
    if(!releaseScope)return {...coverage,both_terminals_complete:true};
    const selected=selectReleaseNegativeCases(atTerminal('100'));
    const selectedRoutes=[...new Set(selected.map(row=>{const parts=row.name.split(':');return parts[1]+':'+parts.at(-2)+':'+parts.at(-1);} ))].sort();
    return {...coverage,both_terminals_complete:true,scope:'Representative pending identity/source/template routes and all state variants at both terminals; per-row exhaustive variations are separate.',reduced_negative_coverage:true,pending_cases:selected.length,pending_cases_full:coverage.pending_cases,available_routes:coverage.routes,routes:selectedRoutes,selected_names:selected.map(row=>row.name)};
  }
  return {atTerminal,coverage,positive,complete};
}
