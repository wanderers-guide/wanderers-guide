-- Preserve original check IDs and predicates; use the pinned shared terminal check.
with terminal_function as materialized(select (exists(select 1 from pg_catalog.pg_proc p
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
  select value as patch from jsonb_array_elements($expected$
  [
    {"id":12041,"name":"Gelid Shard","uuid":"8754698536326669","source":16,"level":2,"traits":[1459,1568,1519,1527],"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4898","book":"Treasure Vault","page":"184"},"description_md5":"aaa2cf56d8c43bafc5c18bf896f21ad1","operations":[{"id":"1ea4abe0-2aab-45f0-a5c7-1edd7f3c0210","type":"adjValue","data":{"variable":"RESISTANCES","value":"cold, {{level}}"}},{"id":"d4b7796e-a060-4103-b4a9-c4846b9286ce","type":"addBonusToValue","data":{"variable":"SAVE_FORT","value":2,"type":"status","text":"against [emotion](link_trait_1486) effects"}},{"id":"394ee897-9a5e-42db-bcf0-879f513e45bf","type":"addBonusToValue","data":{"variable":"SAVE_REFLEX","value":2,"type":"status","text":"against [emotion](link_trait_1486) effects"}},{"id":"2b29bc66-3b77-4e3a-81eb-a443d7df12d7","type":"addBonusToValue","data":{"variable":"SAVE_WILL","value":2,"type":"status","text":"against [emotion](link_trait_1486) effects"}}]},
    {"id":12573,"name":"Ursine Avenger Hood","uuid":"2453284399945122","source":16,"level":2,"traits":[1568,1527,1454],"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4897","book":"Treasure Vault","page":"183"},"description_md5":"0a6868a9bbd15d010621eab400616c82","operations":[{"id":"e06b2490-12a0-4673-b28c-43e246695f80","type":"addBonusToValue","data":{"variable":"SKILL_NATURE","value":1,"type":"item","text":"to [Command an Animal](link_action_19614) (+2 if the animal is a bear)"}}]}
  ]
  $expected$::jsonb)
), dependencies as (
  select value as dependency from jsonb_array_elements($dependencies$
  [
    {"table":"trait","id":1486,"name":"Emotion","uuid":"3036864546165598","source":3},
    {"table":"trait","id":1527,"name":"Invested","uuid":"370388764978504","source":3},
    {"table":"ability-block","id":19614,"name":"Command an Animal","uuid":"4398828153695138","source":3,"type":"action"},
    {"table":"ability-block","id":19739,"name":"Make an Impression","uuid":"3944295765726991","source":3,"type":"action"}
  ]
  $dependencies$::jsonb)
)
select 'treasure-vault-passive-bonuses'::text as id,
  coalesce((select count(*) = 2 and bool_and((
    i.id is not null and i.name = patch->>'name' and i.uuid = (patch->>'uuid')::bigint
    and i.content_source_id = (patch->>'source')::bigint and i.level = (patch->>'level')::integer
    and i."group" = 'GENERAL' and i.usage = case when i.id = 12041 then 'other' else 'worn' end
    and to_jsonb(i.traits) = patch->'traits' and i.meta_data->'source' = patch->'citation'
    and md5(i.description) = patch->>'description_md5'
    and to_jsonb(i.operations) = patch->'operations') is true)
    from expected left join public.item i on i.id = (patch->>'id')::bigint), false)
  and (select count(*) = 2 from public.content_source where id in (3,16)
    and user_id is null and is_published is true)
  and coalesce((select count(*) = 4 and bool_and((
    case when dependency->>'table' = 'trait' then
      t.id is not null and t.name = dependency->>'name' and t.uuid = (dependency->>'uuid')::bigint
        and t.content_source_id = (dependency->>'source')::bigint
    else a.id is not null and a.name = dependency->>'name' and a.uuid = (dependency->>'uuid')::bigint
        and a.content_source_id = (dependency->>'source')::bigint and a.type = dependency->>'type'
    end) is true)
    from dependencies
    left join public.trait t on dependency->>'table' = 'trait' and t.id = (dependency->>'id')::bigint
    left join public.ability_block a on dependency->>'table' = 'ability-block' and a.id = (dependency->>'id')::bigint), false)
  as passed
)
select original_checks.id,case when coalesce((status.value->>'recognized')::boolean,true) then coalesce((status.value->>'passed')::boolean,false) else original_checks.passed end as passed from original_checks cross join terminal_status status;
