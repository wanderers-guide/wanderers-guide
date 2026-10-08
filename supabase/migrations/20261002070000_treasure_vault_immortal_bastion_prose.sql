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
  execute $historical_original_dual$-- Restore both printed reaction limits and triggers without changing armor mechanics.
do $repair$
declare
  spec constant jsonb := $bastion$
{
  "id": 12104,
  "anchor": {
    "id": 12104,
    "bulk": "5",
    "name": "Immortal Bastion",
    "size": "MEDIUM",
    "uuid": "8298670509031158",
    "group": "ARMOR",
    "hands": null,
    "level": 20,
    "price": {
      "gp": 70000
    },
    "usage": null,
    "rarity": "COMMON",
    "traits": [
      1594,
      2865,
      1527
    ],
    "version": "1.0",
    "meta_data": {
      "hp": 0,
      "bulk": {},
      "group": "plate",
      "runes": {
        "potency": 3,
        "property": [
          {
            "id": 6973,
            "name": "Fortification (Greater)"
          }
        ],
        "resilient": 2
      },
      "hp_max": 0,
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=4380",
        "book": "Treasure Vault",
        "page": "15"
      },
      "dex_cap": 0,
      "foundry": {
        "items": [],
        "rules": [],
        "container_id": null
      },
      "ac_bonus": 6,
      "category": "heavy",
      "hardness": 0,
      "material": {
        "type": null,
        "grade": null
      },
      "quantity": 1,
      "strength": 4,
      "base_item": "bastion-plate",
      "check_penalty": -3,
      "speed_penalty": -10,
      "broken_threshold": 0
    },
    "created_at": "2024-04-19T04:18:52.757443+00:00",
    "operations": null,
    "availability": null,
    "content_source_id": 16,
    "craft_requirements": null
  },
  "before": "This impressive _+3 greater resilient greater fortification bastion plate_ is built like an impregnable castle, with multiple layers of defense and no weak points. When you activate the armor's deflect melee trait, you gain a +2 circumstance bonus to AC against melee attacks instead of +1, and you gain 10 temporary Hit Points that last until the start of your next turn.\n\n\\[\\[Effect: Immortal Bastion\\]\\]\n\n**Activate** r envision\n\n**Effect** You drop to 1 Hit Point instead of being reduced to 0 HP or dying, and you gain 100 temporary Hit Points that last until the start of your next turn.\n\n**Activate** r envision\n\n**Effect** You avoid gaining or increasing the condition. If the triggering effect imposes both doomed and wounded, choose only one to prevent. This doesn't remove either of the conditions if you already have them, nor does it prevent the same triggering effect from giving or increasing the prevented condition later.",
  "after": "This impressive _[+3](link_item_6721) [greater resilient](link_item_7701) [greater fortification](link_item_6973) [bastion plate](link_item_11740)_ is built like an impregnable castle, with multiple layers of defense and no weak points. When you activate the armor's deflect melee trait, you gain a +2 circumstance bonus to AC against melee attacks instead of +1, and you gain 10 temporary Hit Points that last until the start of your next turn.\n\n**Activate** <abbr cost=\"REACTION\" class=\"action-symbol\">R</abbr> ([concentrate](link_trait_1432)); **Frequency** once per day; **Trigger** You are reduced to 0 Hit Points or would die from a [death](link_trait_1904) effect; **Effect** You drop to 1 Hit Point instead of being reduced to 0 HP or dying, and you gain 100 temporary Hit Points that last until the start of your next turn.\n\n**Activate** <abbr cost=\"REACTION\" class=\"action-symbol\">R</abbr> ([concentrate](link_trait_1432)); **Frequency** once per day; **Trigger** You would gain or increase the doomed or wounded condition; **Effect** You avoid gaining or increasing the condition. If the triggering effect imposes both doomed and wounded, choose only one to prevent. This doesn't remove either of the conditions if you already have them, nor does it prevent the same triggering effect from giving or increasing the prevented condition later.",
  "evidence": [
    "https://2e.aonprd.com/Equipment.aspx?ID=1847",
    "https://2e.aonprd.com/Equipment.aspx?ID=4380&NoRedirect=1"
  ],
  "dependencies": [
    {
      "table": "trait",
      "id": 1432,
      "name": "Concentrate",
      "uuid": "3011511166869167",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1904,
      "name": "Death",
      "uuid": "2476643980238200",
      "content_source_id": 3
    },
    {
      "table": "item",
      "id": 11740,
      "name": "Bastion Plate",
      "uuid": "6057257467120112",
      "content_source_id": 16
    },
    {
      "table": "item",
      "id": 7701,
      "name": "Resilient (Greater)",
      "uuid": "171697191389370",
      "content_source_id": 7
    },
    {
      "table": "item",
      "id": 6721,
      "name": "Armor Potency (+3)",
      "uuid": "7377851285138054",
      "content_source_id": 7
    },
    {
      "table": "item",
      "id": 6973,
      "name": "Fortification (Greater)",
      "uuid": "3048641492215121",
      "content_source_id": 7
    }
  ],
  "sources": [
    {
      "id": 3,
      "name": "Common Core"
    },
    {
      "id": 7,
      "name": "GM Core"
    },
    {
      "id": 16,
      "name": "Treasure Vault"
    }
  ]
}
$bastion$::jsonb;
  dependency jsonb;
  actual jsonb;
  owner jsonb;
  dependencies jsonb := '{}'::jsonb;
  sources jsonb;
  changed integer;
begin
  lock table public.content_update in share mode;
  -- All reviewed children are locked before the source cache rows.
  perform id from public.item where id in (select (value->>'id')::bigint from jsonb_array_elements(spec->'dependencies') where value->>'table'='item') order by id for share;
  perform id from public.item where id=12104 for update;
  perform id from public.trait where id in (select (value->>'id')::bigint from jsonb_array_elements(spec->'dependencies') where value->>'table'='trait') order by id for share;
  perform s.id from public.content_source s join jsonb_array_elements(spec->'sources') p on s.id=(p->>'id')::bigint where s.name=p->>'name' and s.user_id is null and s.is_published is true order by s.id for update;
  get diagnostics changed=row_count;
  if changed<>3 then raise exception 'Immortal Bastion sources changed'; end if;
  if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
  (u.type='content-source' and (u.ref_id in (3,7,16) or u.data->>'id' in ('3','7','16')))
  or (u.type='item' and (u.ref_id=12104 or u.data->>'id'='12104' or u.data->>'uuid'=spec#>>'{anchor,uuid}' or (coalesce(u.content_source_id::text,u.data->>'content_source_id')='16' and (lower(btrim(u.data->>'name'))='immortal bastion' or lower(u.data#>>'{meta_data,source,url}') in (lower(spec#>>'{anchor,meta_data,source,url}'),lower(spec#>>'{evidence,0}'))))))
  or exists(select 1 from jsonb_array_elements(spec->'dependencies') d where u.type=replace(d->>'table','_','-') and (u.ref_id=(d->>'id')::bigint or u.data->>'id'=d->>'id' or u.data->>'uuid'=d->>'uuid' or (coalesce(u.content_source_id::text,u.data->>'content_source_id')=d->>'content_source_id' and lower(btrim(u.data->>'name'))=lower(d->>'name'))))
)) then raise exception 'Immortal Bastion pending curator submission'; end if;
  for dependency in select value from jsonb_array_elements(spec->'dependencies') loop
    if dependency->>'table'='trait' then select (to_jsonb(t)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',t.uuid::text) into actual from public.trait t where t.id=(dependency->>'id')::bigint;
    else select (to_jsonb(i)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',i.uuid::text) into actual from public.item i where i.id=(dependency->>'id')::bigint; end if;
    if actual is null or not(actual @> (dependency-'table')) then raise exception 'Immortal Bastion dependency changed'; end if;
    dependencies:=jsonb_set(dependencies,array[(dependency->>'table')||':'||(dependency->>'id')],actual,true);
  end loop;
  select jsonb_object_agg(s.id::text,to_jsonb(s)-'updated_at') into sources from public.content_source s where s.id in (3,7,16);
  select (to_jsonb(i)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',i.uuid::text) into owner from public.item i where i.id=12104;
  if owner is null or owner-'description' is distinct from spec->'anchor' then raise exception 'Immortal Bastion anchor changed'; end if;
  if owner->'description' is distinct from spec->'before' and owner->'description' is distinct from spec->'after' then raise exception 'Immortal Bastion description changed'; end if;
  if owner->'description' is distinct from spec->'after' then
    update public.item i set description=spec->>'after' where i.id=12104 and ((to_jsonb(i)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',i.uuid::text))=owner;
    get diagnostics changed=row_count;
    if changed<>1 then raise exception 'Immortal Bastion captured CAS failed'; end if;
  end if;
  select (to_jsonb(i)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',i.uuid::text) into actual from public.item i where i.id=12104;
  if actual is distinct from owner||jsonb_build_object('description',spec->'after') then raise exception 'Immortal Bastion final owner drift'; end if;
  for dependency in select value from jsonb_array_elements(spec->'dependencies') loop
    if dependency->>'table'='trait' then select (to_jsonb(t)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',t.uuid::text) into actual from public.trait t where t.id=(dependency->>'id')::bigint;
    else select (to_jsonb(i)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',i.uuid::text) into actual from public.item i where i.id=(dependency->>'id')::bigint; end if;
    if actual is distinct from dependencies->((dependency->>'table')||':'||(dependency->>'id')) then raise exception 'Immortal Bastion final dependency drift'; end if;
  end loop;
  select jsonb_object_agg(s.id::text,to_jsonb(s)-'updated_at') into actual from public.content_source s where s.id in (3,7,16);
  if actual is distinct from sources then raise exception 'Immortal Bastion final source drift'; end if;
  if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
  (u.type='content-source' and (u.ref_id in (3,7,16) or u.data->>'id' in ('3','7','16')))
  or (u.type='item' and (u.ref_id=12104 or u.data->>'id'='12104' or u.data->>'uuid'=spec#>>'{anchor,uuid}' or (coalesce(u.content_source_id::text,u.data->>'content_source_id')='16' and (lower(btrim(u.data->>'name'))='immortal bastion' or lower(u.data#>>'{meta_data,source,url}') in (lower(spec#>>'{anchor,meta_data,source,url}'),lower(spec#>>'{evidence,0}'))))))
  or exists(select 1 from jsonb_array_elements(spec->'dependencies') d where u.type=replace(d->>'table','_','-') and (u.ref_id=(d->>'id')::bigint or u.data->>'id'=d->>'id' or u.data->>'uuid'=d->>'uuid' or (coalesce(u.content_source_id::text,u.data->>'content_source_id')=d->>'content_source_id' and lower(btrim(u.data->>'name'))=lower(d->>'name'))))
)) then raise exception 'Immortal Bastion final curator drift'; end if;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
