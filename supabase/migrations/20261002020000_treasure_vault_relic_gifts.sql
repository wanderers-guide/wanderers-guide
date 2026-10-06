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
  execute $historical_original_dual$-- Correct three Treasure Vault relic gifts without changing their grants or saved selections.
do $repair$
declare
  spec jsonb := $gifts${"blocks":[{"id":29513,"expected":{"id":29513,"cost":"","name":"Fervor","type":"feat","uuid":"1690381693754808","level":1,"access":"","rarity":"COMMON","actions":"ONE-ACTION","special":"","trigger":"","version":null,"frequency":"once per hour","operations":[],"availability":null,"requirements":"","prerequisites":[],"content_source_id":16},"metadata":{},"metadata_absent":["deprecated","unselectable","hidden"],"before":{"traits":[3460,3489,3479,1486,1448,1469,1432],"description":"**Gift Type** Minor\n\n**Aspect** emotion\n\nYou gain the emotional fervor benefits for your [relic's](link_trait_3460) [emotional state](link_feat_22493) for the next 3 rounds, but ignore the spell associated with the fervor. The feeling wears off quickly, so you experience no emotional fallout.","source":{"url":"https://2e.aonprd.com/Relics.aspx?ID=205","book":"Treasure Vault","page":"199"}},"after":{"traits":[3460,3489,3479,1486,1448,1432],"description":"**Gift Type** Minor\n\n**Aspect** emotion\n\nYou gain the emotional fervor benefits for your [relic's](link_trait_3460) [emotional state](link_feat_22493) for the next 3 rounds, but ignore the spell associated with the fervor. The feeling wears off quickly, so you experience no emotional fallout.","source":{"url":"https://2e.aonprd.com/Relics.aspx?ID=93","book":"Treasure Vault (Remastered)","page":"199"}}},{"id":29806,"expected":{"id":29806,"cost":"","name":"Sands of the Hourglass","type":"feat","uuid":"874046999605701","level":5,"access":"","rarity":"COMMON","actions":"TWO-ACTIONS","special":"","trigger":"","version":null,"frequency":"once per hour","operations":[],"availability":null,"requirements":"","prerequisites":["The relic is 5th level or higher"],"content_source_id":16},"metadata":{},"metadata_absent":["deprecated","unselectable","hidden"],"before":{"traits":[3460,3501,3479,1469,1432,1433],"description":"**Gift Type** Minor\n\n**Aspect** time\n\nYou target one creature within 30 feet, temporarily imposing the decrepitude of time on it. The target must attempt a Fortitude saving throw. The clumsy and enfeebled conditions last 1 minute.\n\n**Critical Success** The target is unaffected.\n\n**Success** The target becomes clumsy 1 and enfeebled 1.\n\n**Failure** The target becomes clumsy 2, enfeebled 2, and drained 1.\n\n**Critical Failure** The target becomes clumsy 3, enfeebled 3, and drained 2.","source":{"url":"https://2e.aonprd.com/Relics.aspx?ID=216","book":"Treasure Vault","page":"200"}},"after":{"traits":[3460,3501,3479,1432,1433],"description":"**Gift Type** Minor\n\n**Aspect** time\n\nYou target one creature within 30 feet, temporarily imposing the decrepitude of time on it. The target must attempt a Fortitude saving throw. The clumsy and enfeebled conditions last 1 minute.\n\n**Critical Success** The target is unaffected.\n\n**Success** The target becomes clumsy 1 and enfeebled 1.\n\n**Failure** The target becomes clumsy 2, enfeebled 2, and drained 1.\n\n**Critical Failure** The target becomes clumsy 3, enfeebled 3, and drained 2.","source":{"url":"https://2e.aonprd.com/Relics.aspx?ID=104","book":"Treasure Vault (Remastered)","page":"200"}}},{"id":29688,"expected":{"id":29688,"cost":"","name":"Intelligent Relic","type":"feat","uuid":"3638174940965762","level":1,"access":"","rarity":"COMMON","actions":null,"special":"","trigger":"","version":null,"frequency":"","operations":[],"availability":null,"requirements":"","prerequisites":[],"content_source_id":16},"metadata":{},"metadata_absent":["deprecated","unselectable","hidden"],"before":{"traits":[3460,3493,3479,1613],"description":"**Gift Type** Minor\n\n**Aspect** intelligent relic\n\nYour [relic](link_trait_3460) becomes an [intelligent](link_trait_1613) item. The [relic](link_trait_3460) possesses [precise sight](link_sense_20776) at a range of 30 feet and [imprecise hearing](link_sense_21081) at a range of 30 feet. It is trained in Perception, increasing its proficiency when you increase yours. Choose whether it can speak aloud or communicate with you [telepathically](link_physical-feature_28884). It knows languages fitting its backstory, usually from among those you know.\n\nThe [relic](link_trait_3460) is also trained in three skills, increasing one skill's proficiency each time the [relic](link_trait_3460) gains a new gift. Your [relic's](link_trait_3460) mental attribute modifiers begin at +3, +2, and +1, arranged as you choose. The [relic](link_trait_3460) is also trained in Will saves, and its proficiency increases as yours does. Each time you gain a new gift, increase one of the [relic's](link_trait_3460) mental modifiers scores by 2 or two by 1. The relic otherwise functions as normal for an [intelligent](link_trait_1613) item.\n\nIf you’re sanctified to [holy](link_trait_1630) or to [unholy](link_trait_1846), you can choose to have your relic sanctified in the same way.","source":{"url":"https://2e.aonprd.com/Relics.aspx?ID=221","book":"Treasure Vault","page":"200"}},"after":{"traits":[3460,3493,3479,1613],"description":"**Gift Type** Minor\n\n**Aspect** intelligent relic\n\nYour [relic](link_trait_3460) becomes an [intelligent](link_trait_1613) item. The [relic](link_trait_3460) possesses [precise sight](link_sense_20776) at a range of 30 feet and [imprecise hearing](link_sense_21081) at a range of 30 feet. It is trained in Perception, increasing its proficiency when you increase yours. Choose whether it can speak aloud or communicate with you [telepathically](link_physical-feature_28884). It knows languages fitting its backstory, usually from among those you know.\n\nThe [relic](link_trait_3460) is also trained in three skills, increasing one skill's proficiency each time the [relic](link_trait_3460) gains a new gift. Your [relic's](link_trait_3460) mental attribute modifiers begin at +3, +2, and +1, arranged as you choose. The [relic](link_trait_3460) is also trained in Will saves, and its proficiency increases as yours does. Each time you gain a new gift, increase one of the [relic's](link_trait_3460) mental attribute modifiers by 1. The [relic](link_trait_3460) otherwise functions as normal for an [intelligent](link_trait_1613) item.\n\nIf you’re sanctified to [holy](link_trait_1630) or to [unholy](link_trait_1846), you can choose to have your [relic](link_trait_3460) sanctified in the same way.","source":{"url":"https://2e.aonprd.com/Relics.aspx?ID=109","book":"Treasure Vault (Remastered)","page":"200"}}}],"dependencies":[{"table":"ability_block","queue_type":"ability-block","id":28884,"expected":{"id":28884,"name":"Telepathy","uuid":"7747103247218751","content_source_id":8,"type":"physical-feature"},"metadata":{},"metadata_absent":["deprecated","unselectable","hidden"]},{"table":"ability_block","queue_type":"ability-block","id":21081,"expected":{"id":21081,"name":"Hearing","uuid":"7294419213926000","content_source_id":3,"type":"sense"},"metadata":{"unselectable":true},"metadata_absent":["deprecated","hidden"]},{"table":"ability_block","queue_type":"ability-block","id":20776,"expected":{"id":20776,"name":"Normal Vision","uuid":"423202486919968","content_source_id":3,"type":"sense"},"metadata":{"unselectable":true},"metadata_absent":["deprecated","hidden"]},{"table":"ability_block","queue_type":"ability-block","id":22493,"expected":{"id":22493,"name":"Cathartic Mage Dedication","uuid":"3294312627250973","content_source_id":13,"type":"feat"},"metadata":{},"metadata_absent":["deprecated","unselectable","hidden"]},{"table":"trait","queue_type":"trait","id":1432,"expected":{"id":1432,"name":"Concentrate","uuid":"3011511166869167","content_source_id":3},"metadata":{},"metadata_absent":["deprecated","unselectable","hidden"]},{"table":"trait","queue_type":"trait","id":1613,"expected":{"id":1613,"name":"Intelligent","uuid":"6224381249579276","content_source_id":3},"metadata":{},"metadata_absent":["deprecated","unselectable","hidden"]},{"table":"trait","queue_type":"trait","id":1433,"expected":{"id":1433,"name":"Manipulate","uuid":"2971108648217689","content_source_id":3},"metadata":{"unselectable":false},"metadata_absent":["deprecated","hidden"]},{"table":"trait","queue_type":"trait","id":1630,"expected":{"id":1630,"name":"Holy","uuid":"4298428703725190","content_source_id":3},"metadata":{"unselectable":false},"metadata_absent":["deprecated","hidden"]},{"table":"trait","queue_type":"trait","id":1486,"expected":{"id":1486,"name":"Emotion","uuid":"3036864546165598","content_source_id":3},"metadata":{"unselectable":false},"metadata_absent":["deprecated","hidden"]},{"table":"trait","queue_type":"trait","id":1448,"expected":{"id":1448,"name":"Mental","uuid":"3793398752936386","content_source_id":3},"metadata":{"unselectable":false},"metadata_absent":["deprecated","hidden"]},{"table":"trait","queue_type":"trait","id":3460,"expected":{"id":3460,"name":"Relic","uuid":"2735161210254535","content_source_id":7},"metadata":{"unselectable":false},"metadata_absent":["deprecated","hidden"]},{"table":"trait","queue_type":"trait","id":3489,"expected":{"id":3489,"name":"Aspect Emotion","uuid":"4222561294876350","content_source_id":16},"metadata":{"unselectable":false},"metadata_absent":["deprecated","hidden"]},{"table":"trait","queue_type":"trait","id":3501,"expected":{"id":3501,"name":"Aspect Time","uuid":"4920206426614602","content_source_id":16},"metadata":{"unselectable":false},"metadata_absent":["deprecated","hidden"]},{"table":"trait","queue_type":"trait","id":1846,"expected":{"id":1846,"name":"Unholy","uuid":"6117148032754070","content_source_id":3},"metadata":{"unselectable":false},"metadata_absent":["deprecated","hidden"]},{"table":"trait","queue_type":"trait","id":3479,"expected":{"id":3479,"name":"Minor Gift","uuid":"1932552509696843","content_source_id":7},"metadata":{"unselectable":false},"metadata_absent":["deprecated","hidden"]},{"table":"trait","queue_type":"trait","id":3493,"expected":{"id":3493,"name":"Aspect Intelligent Relic","uuid":"1901020094331899","content_source_id":16},"metadata":{"unselectable":false},"metadata_absent":["deprecated","hidden"]}],"sources":[{"id":7,"name":"GM Core","user_id":null,"is_published":true,"require_key":false,"required_content_sources":[1],"group":"pathfinder-core","deprecated":null},{"id":13,"name":"Secrets of Magic (in progress)","user_id":null,"is_published":true,"require_key":false,"required_content_sources":[11],"group":"legacy","deprecated":null},{"id":3,"name":"Common Core","user_id":null,"is_published":true,"require_key":false,"required_content_sources":[],"group":"common-core","deprecated":false},{"id":8,"name":"Monster Core","user_id":null,"is_published":true,"require_key":false,"required_content_sources":[1],"group":"pathfinder-core","deprecated":null},{"id":16,"name":"Treasure Vault","user_id":null,"is_published":true,"require_key":false,"required_content_sources":[1],"group":"pathfinder-core","deprecated":null}]}$gifts$::jsonb;
  patch jsonb; dependency jsonb; source_spec jsonb; actual jsonb; tuple jsonb; saved jsonb;
  captured jsonb := '{}'; terminals jsonb := '{}'; captured_deps jsonb := '{}'; captured_sources jsonb := '{}'; changed integer;
begin
  lock table public.content_update in share mode;
  -- Children precede their source-cache parents in the ordinary write path.
  for patch in select value from jsonb_array_elements(spec->'blocks') order by (value->>'id')::bigint loop
    perform 1 from public.ability_block where id=(patch->>'id')::bigint for update;
    if not found then raise exception 'Relic gift owner missing %',patch->>'id'; end if;
  end loop;
  for dependency in select value from jsonb_array_elements(spec->'dependencies') order by value->>'table',(value->>'id')::bigint loop
    if dependency->>'table'='trait' then select to_jsonb(t)||jsonb_build_object('uuid',t.uuid::text) into actual from public.trait t where t.id=(dependency->>'id')::bigint for share;
    else select to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text) into actual from public.ability_block a where a.id=(dependency->>'id')::bigint for share; end if;
    if actual is null or jsonb_typeof(actual->'meta_data') is distinct from 'object'
      or exists(select 1 from jsonb_each(dependency->'expected') e where actual->e.key is distinct from e.value)
      or exists(select 1 from jsonb_each(dependency->'metadata') e where actual#>array['meta_data',e.key] is distinct from e.value)
      or exists(select 1 from jsonb_array_elements_text(dependency->'metadata_absent') k(key) where actual->'meta_data'?k.key)
      then raise exception 'Relic gift dependency drift %:%',dependency->>'table',dependency->>'id'; end if;
    captured_deps:=jsonb_set(captured_deps,array[(dependency->>'table')||':'||(dependency->>'id')],actual-'{updated_at,search_tsv}'::text[],true);
  end loop;
  for source_spec in select value from jsonb_array_elements(spec->'sources') order by (value->>'id')::bigint loop
    select to_jsonb(s) into actual from public.content_source s where s.id=(source_spec->>'id')::bigint for update;
    if actual is null or jsonb_typeof(actual->'meta_data') is distinct from 'object' or exists(select 1 from jsonb_each(source_spec) e where actual->e.key is distinct from e.value)
      then raise exception 'Relic gift source drift %',source_spec->>'id'; end if;
    captured_sources:=jsonb_set(captured_sources,array[source_spec->>'id'],actual-'updated_at',true);
  end loop;
  if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
    (u.type='content-source' and exists(select 1 from jsonb_array_elements(spec->'sources') s where u.ref_id=(s->>'id')::bigint or u.data->>'id'=s->>'id' or u.data->>'name'=s->>'name'))
    or (u.type='ability-block' and exists(select 1 from jsonb_array_elements(spec->'blocks') p where u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id' or u.data->>'uuid'=p#>>'{expected,uuid}' or ((u.content_source_id=(p#>>'{expected,content_source_id}')::bigint or u.data->>'content_source_id'=p#>>'{expected,content_source_id}') and u.data->>'name'=p#>>'{expected,name}')))
    or exists(select 1 from jsonb_array_elements(spec->'dependencies') d where u.type=d->>'queue_type' and (u.ref_id=(d->>'id')::bigint or u.data->>'id'=d->>'id' or u.data->>'uuid'=d#>>'{expected,uuid}' or ((u.content_source_id=(d#>>'{expected,content_source_id}')::bigint or u.data->>'content_source_id'=d#>>'{expected,content_source_id}') and u.data->>'name'=d#>>'{expected,name}')))
  )) then raise exception 'Relic gifts pending content requires review'; end if;
  for patch in select value from jsonb_array_elements(spec->'blocks') order by (value->>'id')::bigint loop
    select to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text) into actual from public.ability_block a where a.id=(patch->>'id')::bigint;
    if actual is null or jsonb_typeof(actual->'meta_data') is distinct from 'object'
      or exists(select 1 from jsonb_each(patch->'expected') e where actual->e.key is distinct from e.value)
      or exists(select 1 from jsonb_each(patch->'metadata') e where actual#>array['meta_data',e.key] is distinct from e.value)
      or exists(select 1 from jsonb_array_elements_text(patch->'metadata_absent') k(key) where actual->'meta_data'?k.key)
      then raise exception 'Relic gift identity/mechanics drift %',patch->>'id'; end if;
    tuple:=jsonb_build_object('traits',actual->'traits','description',actual->'description','source',actual#>'{meta_data,source}');
    if tuple is distinct from patch->'before' and tuple is distinct from patch->'after' then raise exception 'Unreviewed relic gift complete tuple %',patch->>'id'; end if;
    captured:=jsonb_set(captured,array[patch->>'id'],actual-'{updated_at,search_tsv}'::text[],true);
    terminals:=jsonb_set(terminals,array[patch->>'id'],(captured->(patch->>'id'))||jsonb_build_object('traits',patch#>'{after,traits}','description',patch#>'{after,description}','meta_data',jsonb_set(actual->'meta_data','{source}',patch#>'{after,source}',false)),true);
  end loop;
  for patch in select value from jsonb_array_elements(spec->'blocks') order by (value->>'id')::bigint loop
    select (to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text))-'{updated_at,search_tsv}'::text[] into actual from public.ability_block a where a.id=(patch->>'id')::bigint;
    if actual is distinct from captured->(patch->>'id') then raise exception 'Relic gift captured baseline drift %',patch->>'id'; end if;
    if actual=terminals->(patch->>'id') then continue; end if;
    update public.ability_block a set traits=array(select jsonb_array_elements_text(patch#>'{after,traits}')::bigint),description=patch#>>'{after,description}',meta_data=jsonb_set(a.meta_data,'{source}',patch#>'{after,source}',false)
      where a.id=(patch->>'id')::bigint and ((to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text))-'{updated_at,search_tsv}'::text[]) is not distinct from captured->(patch->>'id');
    get diagnostics changed=row_count;
    if changed<>1 then raise exception 'Relic gift captured CAS failed %',patch->>'id'; end if;
    select (to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text))-'{updated_at,search_tsv}'::text[] into saved from public.ability_block a where a.id=(patch->>'id')::bigint;
    if saved is distinct from terminals->(patch->>'id') then raise exception 'Relic gift immediate readback drift %',patch->>'id'; end if;
  end loop;
  for patch in select value from jsonb_array_elements(spec->'blocks') loop
    select (to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text))-'{updated_at,search_tsv}'::text[] into saved from public.ability_block a where a.id=(patch->>'id')::bigint;
    if saved is distinct from terminals->(patch->>'id') then raise exception 'Relic gift final owner readback drift %',patch->>'id'; end if;
  end loop;
  for source_spec in select value from jsonb_array_elements(spec->'sources') loop
    select to_jsonb(s)-'updated_at' into saved from public.content_source s where s.id=(source_spec->>'id')::bigint;
    if saved is distinct from captured_sources->(source_spec->>'id') then raise exception 'Relic gift final source baseline drift %',source_spec->>'id'; end if;
  end loop;
  for dependency in select value from jsonb_array_elements(spec->'dependencies') loop
    if dependency->>'table'='trait' then select to_jsonb(t)||jsonb_build_object('uuid',t.uuid::text) into saved from public.trait t where t.id=(dependency->>'id')::bigint;
    else select to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text) into saved from public.ability_block a where a.id=(dependency->>'id')::bigint; end if;
    if (saved-'{updated_at,search_tsv}'::text[]) is distinct from captured_deps->((dependency->>'table')||':'||(dependency->>'id')) then raise exception 'Relic gift final dependency baseline drift'; end if;
  end loop;
  if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
    (u.type='content-source' and exists(select 1 from jsonb_array_elements(spec->'sources') s where u.ref_id=(s->>'id')::bigint or u.data->>'id'=s->>'id' or u.data->>'name'=s->>'name'))
    or (u.type='ability-block' and exists(select 1 from jsonb_array_elements(spec->'blocks') p where u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id' or u.data->>'uuid'=p#>>'{expected,uuid}' or ((u.content_source_id=(p#>>'{expected,content_source_id}')::bigint or u.data->>'content_source_id'=p#>>'{expected,content_source_id}') and u.data->>'name'=p#>>'{expected,name}')))
    or exists(select 1 from jsonb_array_elements(spec->'dependencies') d where u.type=d->>'queue_type' and (u.ref_id=(d->>'id')::bigint or u.data->>'id'=d->>'id' or u.data->>'uuid'=d#>>'{expected,uuid}' or ((u.content_source_id=(d#>>'{expected,content_source_id}')::bigint or u.data->>'content_source_id'=d#>>'{expected,content_source_id}') and u.data->>'name'=d#>>'{expected,name}')))
  )) then raise exception 'Relic gifts final curator guard changed'; end if;
end $repair$;
$historical_original_dual$;
end $historical_dual$;
