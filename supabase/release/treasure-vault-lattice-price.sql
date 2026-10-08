-- Preserve original check IDs and predicates; use the pinned shared terminal check.
with terminal_function as materialized(select (exists(select 1 from pg_catalog.pg_proc p
  where p.oid=pg_catalog.to_regprocedure('public.treasure_vault_terminal_status_v1()')
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((p.prosrc)::text,'UTF8')),'hex')='c55d729fca4f5b25a0c725305b5d2939e49c28e3e5ecb706a909e530708bb126'
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
    and pg_catalog.has_function_privilege('supabase_read_only_user',p.oid,'EXECUTE'))) as valid),
terminal_status as materialized(select case when f.valid is true then
  coalesce((select pg_catalog.to_jsonb(s) from public.treasure_vault_terminal_status_v1() s),'{"recognized":true,"passed":false}'::jsonb)
  else '{"recognized":true,"passed":false}'::jsonb end as value from terminal_function f),
original_checks as(
with expected as (
  select * from jsonb_to_recordset($expected$
  [
    {"id":12145,"uuid":"6101547865815677","source":16,"citation":{"url":"https://2e.aonprd.com/Armor.aspx?ID=67","book":"Treasure Vault","page":"10"},"name":"Lattice Armor","level":0,"group":"ARMOR","rarity":"COMMON","size":"MEDIUM","bulk":"2","hands":null,"usage":null,"craft_requirements":null,"availability":null,"version":"1.0","traits":[],"description_md5":"5c18ad68c44d03df372627399262aa81","armor":{"category":"medium","group":"chain","ac_bonus":4,"dex_cap":1,"check_penalty":-2,"speed_penalty":-5,"strength":3,"runes":{"property":[]}},"price":{"gp":9}},
    {"uuid":"1142536405766694","source":400,"citation":{"url":"https://2e.aonprd.com/Armor.aspx?ID=54","book":"War of Immortals","page":"146"},"name":"Lattice Armor","level":0,"group":"ARMOR","rarity":"COMMON","size":"MEDIUM","bulk":"2","hands":null,"usage":null,"craft_requirements":null,"availability":null,"version":"1.0","traits":[],"description_md5":"5c18ad68c44d03df372627399262aa81","armor":{"category":"medium","group":"chain","ac_bonus":4,"dex_cap":1,"check_penalty":-2,"speed_penalty":-5,"strength":3,"runes":{"property":[]}},"price":{"gp":9}}
  ]
  $expected$::jsonb) as e(id bigint, uuid bigint, source bigint, citation jsonb, name text,
    level integer, "group" text, rarity text, size text, bulk text, hands text, usage text,
    craft_requirements text, availability text, version text, traits jsonb,
    description_md5 text, armor jsonb, price jsonb)
)
select 'treasure-vault-lattice-price'::text as id,
  coalesce((select count(*) = 2 and bool_and((
    i.id is not null and (e.id is null or i.id = e.id) and i.uuid = e.uuid and i.content_source_id = e.source
    and i.name = e.name and i.level = e.level and i."group" = e."group"
    and i.rarity = e.rarity and i.size = e.size and i.bulk = e.bulk
    and i.hands is not distinct from e.hands and i.usage is not distinct from e.usage
    and i.craft_requirements is not distinct from e.craft_requirements
    and i.availability is not distinct from e.availability and i.version = e.version
    and to_jsonb(i.traits) = e.traits and i.operations is null
    and md5(i.description) = e.description_md5 and jsonb_typeof(i.meta_data) = 'object'
    and i.meta_data->'source' = e.citation and i.price::jsonb = e.price
    and not exists (select 1 from jsonb_each(e.armor) field
      where i.meta_data->field.key is distinct from field.value)) is true)
    from expected e left join public.item i on i.uuid = e.uuid and i.content_source_id = e.source), false)
  and (select count(*) = 2 from public.content_source
    where (id = 16 and name = 'Treasure Vault' or id = 400 and name = 'War of Immortals')
      and user_id is null and is_published is true)
  as passed
)
select original_checks.id,case when coalesce((status.value->>'recognized')::boolean,true) then coalesce((status.value->>'passed')::boolean,false) else original_checks.passed end as passed from original_checks cross join terminal_status status;
