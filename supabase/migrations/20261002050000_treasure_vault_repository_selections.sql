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
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((p.prosrc)::text,'UTF8')),'hex')='306b98528f553f9089d3b46c8541b30121c9cdf1c30a48a69034842982f22c87'
    and p.prokind='f' and p.prolang=(select l.oid from pg_catalog.pg_language l where l.lanname='sql')
    and p.provolatile='s' and p.prosecdef is false and p.proisstrict is false and p.proleakproof is false
    and p.proparallel='u' and p.procost=100 and p.prorows=1
    and p.pronargs=0 and p.pronargdefaults=0 and p.proretset is true
    and p.prorettype=pg_catalog.to_regtype('record')
    and p.proallargtypes=array[pg_catalog.to_regtype('boolean')::oid,pg_catalog.to_regtype('boolean')::oid]
    and p.proargmodes=array['t','t']::"char"[] and p.proargnames=array['recognized','passed']::text[]
    and p.proconfig=array['search_path=""']::text[] and p.proowner=pg_catalog.to_regrole('postgres')
    and (select count(*)=2
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('postgres'))=1
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('service_role'))=1
      and bool_and((a.privilege_type='EXECUTE' and a.is_grantable is false
      and a.grantor=pg_catalog.to_regrole('postgres')
      and a.grantee in(pg_catalog.to_regrole('postgres'),pg_catalog.to_regrole('service_role'))) is true)
      from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a)
    and pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE')
    and pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE'))) is not true then
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
  execute $historical_original_dual$-- Preserve each Repository Lore choice through rank changes.
do $repair$
declare
  spec jsonb := $repository${"blocks":[{"id":29711,"anchor":{"id":29711,"cost":"","name":"Repository of Knowledge","type":"feat","uuid":"6603010972105935","level":1,"access":"","rarity":"COMMON","traits":[3460,3497,3479,1448],"actions":null,"special":"","trigger":"","version":null,"frequency":"","meta_data":{"source":{"url":"https://2e.aonprd.com/Relics.aspx?ID=174","book":"GM Core","page":"316"}},"description":"**Gift Type** Minor\n\n**Aspect** mind\n\nYour [relic](link_trait_3460) is imbued with the psychic impressions of ages past. While the [relic](link_trait_3460) is on your person, you are trained in 3 additional Lore skills of the GM's choice that fit the [relic's](link_trait_3460) history, decided at the time of gaining this gift. If the [relic](link_trait_3460) is 9th level, you instead have expert proficiency in these Lore skills, and if the relic is 17th level, you have master proficiency in these Lore skills.","availability":null,"requirements":"","prerequisites":[],"content_source_id":7},"before":[{"id":"e459fa40-1fdf-486d-be71-2973d37246be","data":{"conditions":[{"id":"2513c96b-2807-449f-99cd-a2fb93886440","data":{"name":"LEVEL","type":"num","value":3},"name":"LEVEL","type":"num","value":9,"operator":"LESS_THAN"}],"trueOperations":[{"id":"8bffc37b-eb2e-47e2-ac49-3ef1328ecf43","data":{"title":"Select a Lore","modeType":"FILTERED","optionType":"ADJ_VALUE","optionsFilters":{"id":"52766bc8-719b-4e58-a20b-602010b9f48c","type":"ADJ_VALUE","group":"ADD-LORE","value":{"value":"T"}},"optionsPredefined":[]},"type":"select"},{"id":"70fed59d-09e9-4ad0-a8df-05df08d79040","data":{"title":"Select a Lore","modeType":"FILTERED","optionType":"ADJ_VALUE","optionsFilters":{"id":"5086ac8f-c068-46ba-a334-86adca52ef44","type":"ADJ_VALUE","group":"ADD-LORE","value":{"value":"T"}},"optionsPredefined":[]},"type":"select"},{"id":"7a8bd1c3-7a0b-4540-a09f-8e6c72fcafe2","data":{"title":"Select a Lore","modeType":"FILTERED","optionType":"ADJ_VALUE","optionsFilters":{"id":"c52d52c8-a31c-4b3a-aca6-14fe2e0771ea","type":"ADJ_VALUE","group":"ADD-LORE","value":{"value":"T"}},"optionsPredefined":[]},"type":"select"}],"falseOperations":[]},"type":"conditional"},{"id":"5f18216a-8ec3-40df-998f-4dca16b45142","data":{"conditions":[{"id":"ccc958c8-2eef-4ef0-8a1c-69cf26c869e6","data":{"name":"LEVEL","type":"num","value":3},"name":"LEVEL","type":"num","value":9,"operator":"GREATER_THAN_OR_EQUALS"},{"id":"95f95c0f-6026-4828-b5a9-d4300eebd5c0","data":{"name":"LEVEL","type":"num","value":3},"name":"LEVEL","type":"num","value":17,"operator":"LESS_THAN"}],"trueOperations":[{"id":"12b99a0e-78fe-4f25-bd69-2d5f48b94953","data":{"title":"Select a Lore","modeType":"FILTERED","optionType":"ADJ_VALUE","optionsFilters":{"id":"59d2894d-4c47-4297-bd9a-2471d092e101","type":"ADJ_VALUE","group":"ADD-LORE","value":{"value":"E"}},"optionsPredefined":[]},"type":"select"},{"id":"b1d1ddf2-4d94-43bb-8fa9-8b8280ce0f6f","data":{"title":"Select a Lore","modeType":"FILTERED","optionType":"ADJ_VALUE","optionsFilters":{"id":"e7de1e3b-6c56-44a5-ae3b-ccf45d18297c","type":"ADJ_VALUE","group":"ADD-LORE","value":{"value":"E"}},"optionsPredefined":[]},"type":"select"},{"id":"dba4429c-31af-4eb1-9de5-4a5a38381189","data":{"title":"Select a Lore","modeType":"FILTERED","optionType":"ADJ_VALUE","optionsFilters":{"id":"82f650df-643a-4f2a-a590-02eef718b51a","type":"ADJ_VALUE","group":"ADD-LORE","value":{"value":"E"}},"optionsPredefined":[]},"type":"select"}],"falseOperations":[]},"type":"conditional"},{"id":"503ffe61-c099-49a2-9f95-8ba56be344ce","data":{"conditions":[{"id":"fb08625f-0678-4fcb-9325-8213f3ec0a27","data":{"name":"LEVEL","type":"num","value":3},"name":"LEVEL","type":"num","value":17,"operator":"GREATER_THAN_OR_EQUALS"}],"trueOperations":[{"id":"e907bb08-1951-4c07-92ef-dadb4303be3c","data":{"title":"Select a Lore","modeType":"FILTERED","optionType":"ADJ_VALUE","optionsFilters":{"id":"daeeda4d-86ec-411f-a0b6-11afc1b3166b","type":"ADJ_VALUE","group":"ADD-LORE","value":{"value":"M"}},"optionsPredefined":[]},"type":"select"},{"id":"95bce3da-e60f-4e8c-ac3d-8a1785346917","data":{"title":"Select a Lore","modeType":"FILTERED","optionType":"ADJ_VALUE","optionsFilters":{"id":"b0d2083b-d06f-48ec-89a3-76a016b07d8d","type":"ADJ_VALUE","group":"ADD-LORE","value":{"value":"M"}},"optionsPredefined":[]},"type":"select"},{"id":"4b406c3a-6196-42e3-a9bd-893dae19e992","data":{"title":"Select a Lore","modeType":"FILTERED","optionType":"ADJ_VALUE","optionsFilters":{"id":"67213601-6ad0-410b-8c17-241dacc70473","type":"ADJ_VALUE","group":"ADD-LORE","value":{"value":"M"}},"optionsPredefined":[]},"type":"select"}],"falseOperations":[]},"type":"conditional"}],"after":[{"id":"e459fa40-1fdf-486d-be71-2973d37246be","data":{"conditions":[{"id":"2513c96b-2807-449f-99cd-a2fb93886440","data":{"name":"LEVEL","type":"num","value":3},"name":"LEVEL","type":"num","value":9,"operator":"LESS_THAN"}],"trueOperations":[{"id":"8bffc37b-eb2e-47e2-ac49-3ef1328ecf43","data":{"title":"Select a Lore","modeType":"FILTERED","optionType":"ADJ_VALUE","optionsFilters":{"id":"52766bc8-719b-4e58-a20b-602010b9f48c","type":"ADJ_VALUE","group":"ADD-LORE","value":{"value":"T"}},"optionsPredefined":[],"selectionAliases":["12b99a0e-78fe-4f25-bd69-2d5f48b94953","e907bb08-1951-4c07-92ef-dadb4303be3c"]},"type":"select"},{"id":"70fed59d-09e9-4ad0-a8df-05df08d79040","data":{"title":"Select a Lore","modeType":"FILTERED","optionType":"ADJ_VALUE","optionsFilters":{"id":"5086ac8f-c068-46ba-a334-86adca52ef44","type":"ADJ_VALUE","group":"ADD-LORE","value":{"value":"T"}},"optionsPredefined":[],"selectionAliases":["b1d1ddf2-4d94-43bb-8fa9-8b8280ce0f6f","95bce3da-e60f-4e8c-ac3d-8a1785346917"]},"type":"select"},{"id":"7a8bd1c3-7a0b-4540-a09f-8e6c72fcafe2","data":{"title":"Select a Lore","modeType":"FILTERED","optionType":"ADJ_VALUE","optionsFilters":{"id":"c52d52c8-a31c-4b3a-aca6-14fe2e0771ea","type":"ADJ_VALUE","group":"ADD-LORE","value":{"value":"T"}},"optionsPredefined":[],"selectionAliases":["dba4429c-31af-4eb1-9de5-4a5a38381189","4b406c3a-6196-42e3-a9bd-893dae19e992"]},"type":"select"}],"falseOperations":[]},"type":"conditional"},{"id":"5f18216a-8ec3-40df-998f-4dca16b45142","data":{"conditions":[{"id":"ccc958c8-2eef-4ef0-8a1c-69cf26c869e6","data":{"name":"LEVEL","type":"num","value":3},"name":"LEVEL","type":"num","value":9,"operator":"GREATER_THAN_OR_EQUALS"},{"id":"95f95c0f-6026-4828-b5a9-d4300eebd5c0","data":{"name":"LEVEL","type":"num","value":3},"name":"LEVEL","type":"num","value":17,"operator":"LESS_THAN"}],"trueOperations":[{"id":"12b99a0e-78fe-4f25-bd69-2d5f48b94953","data":{"title":"Select a Lore","modeType":"FILTERED","optionType":"ADJ_VALUE","optionsFilters":{"id":"59d2894d-4c47-4297-bd9a-2471d092e101","type":"ADJ_VALUE","group":"ADD-LORE","value":{"value":"E"}},"optionsPredefined":[],"selectionAliases":["8bffc37b-eb2e-47e2-ac49-3ef1328ecf43","e907bb08-1951-4c07-92ef-dadb4303be3c"]},"type":"select"},{"id":"b1d1ddf2-4d94-43bb-8fa9-8b8280ce0f6f","data":{"title":"Select a Lore","modeType":"FILTERED","optionType":"ADJ_VALUE","optionsFilters":{"id":"e7de1e3b-6c56-44a5-ae3b-ccf45d18297c","type":"ADJ_VALUE","group":"ADD-LORE","value":{"value":"E"}},"optionsPredefined":[],"selectionAliases":["70fed59d-09e9-4ad0-a8df-05df08d79040","95bce3da-e60f-4e8c-ac3d-8a1785346917"]},"type":"select"},{"id":"dba4429c-31af-4eb1-9de5-4a5a38381189","data":{"title":"Select a Lore","modeType":"FILTERED","optionType":"ADJ_VALUE","optionsFilters":{"id":"82f650df-643a-4f2a-a590-02eef718b51a","type":"ADJ_VALUE","group":"ADD-LORE","value":{"value":"E"}},"optionsPredefined":[],"selectionAliases":["7a8bd1c3-7a0b-4540-a09f-8e6c72fcafe2","4b406c3a-6196-42e3-a9bd-893dae19e992"]},"type":"select"}],"falseOperations":[]},"type":"conditional"},{"id":"503ffe61-c099-49a2-9f95-8ba56be344ce","data":{"conditions":[{"id":"fb08625f-0678-4fcb-9325-8213f3ec0a27","data":{"name":"LEVEL","type":"num","value":3},"name":"LEVEL","type":"num","value":17,"operator":"GREATER_THAN_OR_EQUALS"}],"trueOperations":[{"id":"e907bb08-1951-4c07-92ef-dadb4303be3c","data":{"title":"Select a Lore","modeType":"FILTERED","optionType":"ADJ_VALUE","optionsFilters":{"id":"daeeda4d-86ec-411f-a0b6-11afc1b3166b","type":"ADJ_VALUE","group":"ADD-LORE","value":{"value":"M"}},"optionsPredefined":[],"selectionAliases":["12b99a0e-78fe-4f25-bd69-2d5f48b94953","8bffc37b-eb2e-47e2-ac49-3ef1328ecf43"]},"type":"select"},{"id":"95bce3da-e60f-4e8c-ac3d-8a1785346917","data":{"title":"Select a Lore","modeType":"FILTERED","optionType":"ADJ_VALUE","optionsFilters":{"id":"b0d2083b-d06f-48ec-89a3-76a016b07d8d","type":"ADJ_VALUE","group":"ADD-LORE","value":{"value":"M"}},"optionsPredefined":[],"selectionAliases":["b1d1ddf2-4d94-43bb-8fa9-8b8280ce0f6f","70fed59d-09e9-4ad0-a8df-05df08d79040"]},"type":"select"},{"id":"4b406c3a-6196-42e3-a9bd-893dae19e992","data":{"title":"Select a Lore","modeType":"FILTERED","optionType":"ADJ_VALUE","optionsFilters":{"id":"67213601-6ad0-410b-8c17-241dacc70473","type":"ADJ_VALUE","group":"ADD-LORE","value":{"value":"M"}},"optionsPredefined":[],"selectionAliases":["dba4429c-31af-4eb1-9de5-4a5a38381189","7a8bd1c3-7a0b-4540-a09f-8e6c72fcafe2"]},"type":"select"}],"falseOperations":[]},"type":"conditional"}],"adjusted":9}],"sources":[{"id":7,"name":"GM Core","user_id":null,"is_published":true,"require_key":false,"required_content_sources":[1],"group":"pathfinder-core","deprecated":null}],"primary":"https://2e.aonprd.com/Relics.aspx?ID=174"}$repository$::jsonb;
  patch jsonb; source_spec jsonb; actual jsonb; saved jsonb; changed integer;
  captured jsonb := '{}'; terminals jsonb := '{}'; sources_before jsonb := '{}';
begin
  lock table public.content_update in share mode;
  -- Lock child owners before their source-cache parents.
  for patch in select value from jsonb_array_elements(spec->'blocks') order by (value->>'id')::bigint loop
    perform 1 from public.ability_block where id=(patch->>'id')::bigint for update;
    if not found then raise exception 'treasure-vault-repository-selections: owner missing %',patch->>'id'; end if;
  end loop;
  for source_spec in select value from jsonb_array_elements(spec->'sources') order by (value->>'id')::bigint loop
    select to_jsonb(s) into actual from public.content_source s where s.id=(source_spec->>'id')::bigint for update;
    if actual is null or jsonb_typeof(actual->'meta_data') is distinct from 'object'
      or exists(select 1 from jsonb_each(source_spec) e where actual->e.key is distinct from e.value)
      then raise exception 'treasure-vault-repository-selections: source drift %',source_spec->>'id'; end if;
    sources_before:=jsonb_set(sources_before,array[source_spec->>'id'],actual-'updated_at',true);
  end loop;
  if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
    (u.type='content-source' and exists(select 1 from jsonb_array_elements(spec->'sources') s where u.ref_id=(s->>'id')::bigint or u.data->>'id'=s->>'id' or lower(btrim(u.data->>'name'))=lower(btrim(s->>'name'))))
    or (u.type='ability-block' and exists(select 1 from jsonb_array_elements(spec->'blocks') p where u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id' or u.data->>'uuid'=p#>>'{anchor,uuid}' or ((u.content_source_id=(p#>>'{anchor,content_source_id}')::bigint or u.data->>'content_source_id'=p#>>'{anchor,content_source_id}') and lower(btrim(u.data->>'name'))=lower(btrim(p#>>'{anchor,name}')))))
  )) then raise exception 'treasure-vault-repository-selections: pending content requires review'; end if;
  for patch in select value from jsonb_array_elements(spec->'blocks') order by (value->>'id')::bigint loop
    select to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text) into actual from public.ability_block a where a.id=(patch->>'id')::bigint;
    if (actual-'{created_at,updated_at,search_tsv,operations}'::text[]) is distinct from patch->'anchor'
      then raise exception 'treasure-vault-repository-selections: owner baseline drift %',patch->>'id'; end if;
    if actual->'operations' is distinct from patch->'before' and actual->'operations' is distinct from patch->'after'
      then raise exception 'treasure-vault-repository-selections: unreviewed operation graph %',patch->>'id'; end if;
    captured:=jsonb_set(captured,array[patch->>'id'],actual-'{updated_at,search_tsv}'::text[],true);
    terminals:=jsonb_set(terminals,array[patch->>'id'],(captured->(patch->>'id'))||jsonb_build_object('operations',patch->'after'),true);
  end loop;
  for patch in select value from jsonb_array_elements(spec->'blocks') order by (value->>'id')::bigint loop
    select (to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text))-'{updated_at,search_tsv}'::text[] into actual from public.ability_block a where a.id=(patch->>'id')::bigint;
    if actual is distinct from captured->(patch->>'id') then raise exception 'treasure-vault-repository-selections: captured baseline drift'; end if;
    if actual=terminals->(patch->>'id') then continue; end if;
    update public.ability_block a set operations=array(select e.value::json from jsonb_array_elements(patch->'after') with ordinality e(value,position) order by e.position)
      where a.id=(patch->>'id')::bigint and ((to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text))-'{updated_at,search_tsv}'::text[]) is not distinct from captured->(patch->>'id');
    get diagnostics changed=row_count;
    if changed<>1 then raise exception 'treasure-vault-repository-selections: captured CAS failed'; end if;
    select (to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text))-'{updated_at,search_tsv}'::text[] into saved from public.ability_block a where a.id=(patch->>'id')::bigint;
    if saved is distinct from terminals->(patch->>'id') then raise exception 'treasure-vault-repository-selections: immediate readback drift'; end if;
  end loop;
  for patch in select value from jsonb_array_elements(spec->'blocks') loop
    select (to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text))-'{updated_at,search_tsv}'::text[] into saved from public.ability_block a where a.id=(patch->>'id')::bigint;
    if saved is distinct from terminals->(patch->>'id') then raise exception 'treasure-vault-repository-selections: final owner readback drift'; end if;
  end loop;
  for source_spec in select value from jsonb_array_elements(spec->'sources') loop
    select to_jsonb(s)-'updated_at' into saved from public.content_source s where s.id=(source_spec->>'id')::bigint;
    if saved is distinct from sources_before->(source_spec->>'id') then raise exception 'treasure-vault-repository-selections: source baseline drift'; end if;
  end loop;
  if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
    (u.type='content-source' and exists(select 1 from jsonb_array_elements(spec->'sources') s where u.ref_id=(s->>'id')::bigint or u.data->>'id'=s->>'id' or lower(btrim(u.data->>'name'))=lower(btrim(s->>'name'))))
    or (u.type='ability-block' and exists(select 1 from jsonb_array_elements(spec->'blocks') p where u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id' or u.data->>'uuid'=p#>>'{anchor,uuid}' or ((u.content_source_id=(p#>>'{anchor,content_source_id}')::bigint or u.data->>'content_source_id'=p#>>'{anchor,content_source_id}') and lower(btrim(u.data->>'name'))=lower(btrim(p#>>'{anchor,name}')))))
  )) then raise exception 'treasure-vault-repository-selections: final pending content requires review'; end if;
end $repair$;
$historical_original_dual$;
end $historical_dual$;
