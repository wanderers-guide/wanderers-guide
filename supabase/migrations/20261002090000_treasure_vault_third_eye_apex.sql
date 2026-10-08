-- Preserve the original repair; use the pinned shared terminal check.
do $historical_dual$
declare completion_recognized boolean;completion_passed boolean;
begin
  lock table public.content_update in share mode;
  lock table public.content_source in share mode;
  lock table public.ability_block in share row exclusive mode;
  lock table public.ancestry in share row exclusive mode;
  lock table public.archetype in share row exclusive mode;
  lock table public.class in share row exclusive mode;
  lock table public.creature in share row exclusive mode;
  lock table public.item in share row exclusive mode;
  lock table public.language in share row exclusive mode;
  lock table public.spell in share row exclusive mode;
  lock table public.trait in share row exclusive mode;
  perform s.id from public.content_source s where s.id in(1,3,7,8,11,12,13,14,15,16,17,18,19,22,23,28,29,33,34,37,51,185,239,240,241,256,400,420,476,493,842) order by s.id for share;
  if (exists(select 1 from pg_catalog.pg_proc p
  where p.oid=pg_catalog.to_regprocedure('public.treasure_vault_terminal_status_v1()')
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((p.prosrc)::text,'UTF8')),'hex')='18134f9ceb5b974368dcfba9e6a145c839b63a762014424005872665b4dce869'
    and p.prokind='f' and p.prolang=(select l.oid from pg_catalog.pg_language l where l.lanname='sql')
    and p.provolatile='s' and p.prosecdef is false and p.proisstrict is false and p.proleakproof is false
    and p.proparallel='u' and p.procost=100 and p.prorows=1
    and p.pronargs=0 and p.pronargdefaults=0 and p.proretset is true
    and p.prorettype=pg_catalog.to_regtype('record')
    and p.proallargtypes=array[pg_catalog.to_regtype('boolean')::oid,pg_catalog.to_regtype('boolean')::oid]
    and p.proargmodes=array['t','t']::"char"[] and p.proargnames=array['recognized','passed']::text[]
    and p.proconfig=array['search_path=""']::text[] and p.proowner=pg_catalog.to_regrole('postgres')
    and (select count(*)=3
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('postgres'))=1
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('service_role'))=1
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('supabase_read_only_user'))=1
      and bool_and((a.privilege_type='EXECUTE' and a.is_grantable is false
      and a.grantor=pg_catalog.to_regrole('postgres')
      and a.grantee in(pg_catalog.to_regrole('postgres'),pg_catalog.to_regrole('service_role'),pg_catalog.to_regrole('supabase_read_only_user'))) is true)
      from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a)
    and pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE')
    and pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
    and pg_catalog.has_function_privilege('supabase_read_only_user',p.oid,'EXECUTE'))) is not true then
    raise exception 'Treasure Vault terminal helper is missing or differs from the reviewed definition';
  end if;
  select s.recognized,s.passed into strict completion_recognized,completion_passed from public.treasure_vault_terminal_status_v1() s;
  if completion_recognized is null or completion_passed is null then
    raise exception 'Treasure Vault terminal helper returned an invalid status';
  end if;
  if completion_recognized then
    if completion_passed is not true then raise exception 'Treasure Vault catalog/display successor is partial or unreviewed';end if;
    return;
  end if;
  execute $historical_original_dual$-- Apply the printed full Wisdom increase for the existing Third Eye apex operation.
do $repair$
declare
  spec jsonb := $third_eye${"items":[{"id":11696,"anchor":{"id":11696,"bulk":"0.1","name":"Amulet of the Third Eye","size":"MEDIUM","uuid":"8545288026709121","group":"GENERAL","hands":null,"level":17,"price":{"gp":15000},"usage":"worn","rarity":"COMMON","traits":[1552,1527,1504],"version":"1.0","meta_data":{"hp":0,"bulk":{},"group":"","runes":{},"damage":{"die":"","dice":"","extra":"","damageType":""},"hp_max":0,"source":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4665","book":"Treasure Vault","page":"102"},"charges":{},"foundry":{"items":[],"rules":[{"key":"FlatModifier","type":"item","value":2,"selector":"perception"}],"container_id":null},"category":"","cleaning":{"updatedAt":"2026-04-12T06:03:50.541Z"},"hardness":0,"material":{"type":null,"grade":null},"quantity":1,"base_item":null,"image_url":"","is_shoddy":false,"starfinder":{"slots":[]},"unselectable":false,"broken_threshold":0},"description":"This large brass medallion hangs low on the torso. It's shaped in the form of an unblinking eye, with a ring of turquoise as the iris and an orb of jet serving as the pupil. The amulet grants you a +2 item bonus to Perception checks. When you [invest](link_action_20775) the amulet, you either increase your Wisdom modifier by 1 or increase it to +4, whichever would give you a higher value.\n\n**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([concentrate](link_trait_1432)); **Frequency** once per day; **Effect** You cast [truesight](link_spell_4912).","availability":null,"content_source_id":16,"craft_requirements":null},"before":[{"id":"13923fa3-2df4-4f76-96af-d692afd60ad3","data":{"text":"","type":"item","value":2,"variable":"PERCEPTION"},"type":"addBonusToValue"},{"id":"82d5f011-36b4-4f02-8b3c-8777f543649d","data":{"conditions":[{"id":"8fc0a98d-19f0-4bfc-aa93-c1e1d4ddb0a9","data":{"name":"ATTRIBUTE_WIS","type":"attr","value":{"value":0,"partial":false}},"name":"ATTRIBUTE_WIS","type":"attr","value":4,"operator":"LESS_THAN"}],"trueOperations":[{"id":"d796d121-87ae-4517-9189-d988f1d4b2c7","data":{"value":{"value":4},"variable":"ATTRIBUTE_WIS"},"type":"setValue"}],"falseOperations":[{"id":"2d958fbe-7678-491e-9598-985fd1deb0e5","data":{"value":{"value":1},"variable":"ATTRIBUTE_WIS"},"type":"adjValue"}]},"type":"conditional"}],"after":[{"id":"13923fa3-2df4-4f76-96af-d692afd60ad3","data":{"text":"","type":"item","value":2,"variable":"PERCEPTION"},"type":"addBonusToValue"},{"id":"82d5f011-36b4-4f02-8b3c-8777f543649d","data":{"conditions":[{"id":"8fc0a98d-19f0-4bfc-aa93-c1e1d4ddb0a9","data":{"name":"ATTRIBUTE_WIS","type":"attr","value":{"value":0,"partial":false}},"name":"ATTRIBUTE_WIS","type":"attr","value":4,"operator":"LESS_THAN"}],"trueOperations":[{"id":"d796d121-87ae-4517-9189-d988f1d4b2c7","data":{"value":{"value":4},"variable":"ATTRIBUTE_WIS"},"type":"setValue"}],"falseOperations":[{"id":"2d958fbe-7678-491e-9598-985fd1deb0e5","data":{"value":{"value":1},"variable":"ATTRIBUTE_WIS"},"type":"adjValue"},{"id":"29cd408a-d3c4-4968-a36e-f16ddc4fcb60","data":{"value":{"value":1},"variable":"ATTRIBUTE_WIS"},"type":"adjValue"}]},"type":"conditional"}],"additional_boost_id":"29cd408a-d3c4-4968-a36e-f16ddc4fcb60"}],"sources":[{"id":1,"name":"Player Core","user_id":null,"is_published":true,"require_key":false,"required_content_sources":[],"group":"pathfinder-core","deprecated":null},{"id":16,"name":"Treasure Vault","user_id":null,"is_published":true,"require_key":false,"required_content_sources":[1],"group":"pathfinder-core","deprecated":null}],"primary":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=2132","sha256":"bb44b394fa51e99e47b208da2ebcd4256f39b611e41c1c17a6a2125850da4d8c"},"boundary":"Existing automated item only. No currently manual apex item is automated. Multiple-apex selection and saved manual adjustments remain unchanged and cannot safely be inferred."}$third_eye$::jsonb;
  patch jsonb; source_spec jsonb; actual jsonb; saved jsonb; changed integer;
  captured jsonb := '{}'; terminals jsonb := '{}'; sources_before jsonb := '{}';
begin
  lock table public.content_update in share mode;
  -- Lock child owners before their source-cache parents.
  for patch in select value from jsonb_array_elements(spec->'items') order by (value->>'id')::bigint loop
    perform 1 from public.item where id=(patch->>'id')::bigint for update;
    if not found then raise exception 'treasure-vault-third-eye-apex: owner missing %',patch->>'id'; end if;
  end loop;
  for source_spec in select value from jsonb_array_elements(spec->'sources') order by (value->>'id')::bigint loop
    select to_jsonb(s) into actual from public.content_source s where s.id=(source_spec->>'id')::bigint for update;
    if actual is null or jsonb_typeof(actual->'meta_data') is distinct from 'object'
      or exists(select 1 from jsonb_each(source_spec) e where actual->e.key is distinct from e.value)
      then raise exception 'treasure-vault-third-eye-apex: source drift %',source_spec->>'id'; end if;
    sources_before:=jsonb_set(sources_before,array[source_spec->>'id'],actual-'updated_at',true);
  end loop;
  if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
    (u.type='content-source' and exists(select 1 from jsonb_array_elements(spec->'sources') s where u.ref_id=(s->>'id')::bigint or u.data->>'id'=s->>'id' or lower(btrim(u.data->>'name'))=lower(btrim(s->>'name'))))
    or (u.type='item' and exists(select 1 from jsonb_array_elements(spec->'items') p where u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id' or u.data->>'uuid'=p#>>'{anchor,uuid}' or ((u.content_source_id=(p#>>'{anchor,content_source_id}')::bigint or u.data->>'content_source_id'=p#>>'{anchor,content_source_id}') and lower(btrim(u.data->>'name'))=lower(btrim(p#>>'{anchor,name}')))))
  )) then raise exception 'treasure-vault-third-eye-apex: pending content requires review'; end if;
  for patch in select value from jsonb_array_elements(spec->'items') order by (value->>'id')::bigint loop
    select to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text) into actual from public.item a where a.id=(patch->>'id')::bigint;
    if (actual-'{created_at,updated_at,search_tsv,operations}'::text[]) is distinct from patch->'anchor'
      then raise exception 'treasure-vault-third-eye-apex: owner baseline drift %',patch->>'id'; end if;
    if actual->'operations' is distinct from patch->'before' and actual->'operations' is distinct from patch->'after'
      then raise exception 'treasure-vault-third-eye-apex: unreviewed operation graph %',patch->>'id'; end if;
    captured:=jsonb_set(captured,array[patch->>'id'],actual-'{updated_at,search_tsv}'::text[],true);
    terminals:=jsonb_set(terminals,array[patch->>'id'],(captured->(patch->>'id'))||jsonb_build_object('operations',patch->'after'),true);
  end loop;
  for patch in select value from jsonb_array_elements(spec->'items') order by (value->>'id')::bigint loop
    select (to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text))-'{updated_at,search_tsv}'::text[] into actual from public.item a where a.id=(patch->>'id')::bigint;
    if actual is distinct from captured->(patch->>'id') then raise exception 'treasure-vault-third-eye-apex: captured baseline drift'; end if;
    if actual=terminals->(patch->>'id') then continue; end if;
    update public.item a set operations=array(select e.value::json from jsonb_array_elements(patch->'after') with ordinality e(value,position) order by e.position)
      where a.id=(patch->>'id')::bigint and ((to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text))-'{updated_at,search_tsv}'::text[]) is not distinct from captured->(patch->>'id');
    get diagnostics changed=row_count;
    if changed<>1 then raise exception 'treasure-vault-third-eye-apex: captured CAS failed'; end if;
    select (to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text))-'{updated_at,search_tsv}'::text[] into saved from public.item a where a.id=(patch->>'id')::bigint;
    if saved is distinct from terminals->(patch->>'id') then raise exception 'treasure-vault-third-eye-apex: immediate readback drift'; end if;
  end loop;
  for patch in select value from jsonb_array_elements(spec->'items') loop
    select (to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text))-'{updated_at,search_tsv}'::text[] into saved from public.item a where a.id=(patch->>'id')::bigint;
    if saved is distinct from terminals->(patch->>'id') then raise exception 'treasure-vault-third-eye-apex: final owner readback drift'; end if;
  end loop;
  for source_spec in select value from jsonb_array_elements(spec->'sources') loop
    select to_jsonb(s)-'updated_at' into saved from public.content_source s where s.id=(source_spec->>'id')::bigint;
    if saved is distinct from sources_before->(source_spec->>'id') then raise exception 'treasure-vault-third-eye-apex: source baseline drift'; end if;
  end loop;
  if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
    (u.type='content-source' and exists(select 1 from jsonb_array_elements(spec->'sources') s where u.ref_id=(s->>'id')::bigint or u.data->>'id'=s->>'id' or lower(btrim(u.data->>'name'))=lower(btrim(s->>'name'))))
    or (u.type='item' and exists(select 1 from jsonb_array_elements(spec->'items') p where u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id' or u.data->>'uuid'=p#>>'{anchor,uuid}' or ((u.content_source_id=(p#>>'{anchor,content_source_id}')::bigint or u.data->>'content_source_id'=p#>>'{anchor,content_source_id}') and lower(btrim(u.data->>'name'))=lower(btrim(p#>>'{anchor,name}')))))
  )) then raise exception 'treasure-vault-third-eye-apex: final pending content requires review'; end if;
end $repair$;
$historical_original_dual$;
end $historical_dual$;
