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
-- Verify the two reviewed Harnessed leaves and the intended official link targets.
with repair_spec as (
  select $harnessed$
{
  "id": 2886,
  "name": "Harnessed",
  "uuid": 6134123836252393,
  "content_source_id": 16,
  "description_before": "",
  "description_after": "This shield features a special brace or opening designed to hold lances or other [jousting](link_trait_2748) weapons. Jousters often use these shields as a backup in narrow passages and other places where they're unable to ride a mount. You can [Interact](link_action_19733) to lock a weapon with the [jousting](link_trait_2748) trait in place in the shield, enabling you to use two hands to wield the shield and weapon simultaneously. If you're not wielding the combined unit with both hands, you can use neither the weapon nor the shield.\n\nWhile you have the shield [raised](link_action_19750), you can gain the [jousting](link_trait_2748) benefit of a weapon as if you were mounted. Because a significant portion of the weapon needs to be braced behind the shield, the weapon's reach is reduced by 5 feet if it is greater than 5 feet.",
  "source_before": {
    "url": "https://2e.aonprd.com/Traits.aspx?ID=930",
    "book": "Treasure Vault",
    "page": "219"
  },
  "source_after": {
    "url": "https://2e.aonprd.com/Traits.aspx?ID=477",
    "book": "Treasure Vault (Remastered)",
    "page": "219"
  },
  "dependencies": [
    {
      "table": "trait",
      "id": 2748,
      "name": "Jousting",
      "uuid": 438922509591800,
      "content_source_id": 3,
      "citation": {
        "url": "https://2e.aonprd.com/Traits.aspx?ID=638",
        "book": "Player Core",
        "page": "282"
      }
    },
    {
      "table": "ability-block",
      "id": 19733,
      "name": "Interact",
      "uuid": 3402914292668269,
      "content_source_id": 3,
      "type": "action"
    },
    {
      "table": "ability-block",
      "id": 19750,
      "name": "Raise a Shield",
      "uuid": 1182629222392591,
      "content_source_id": 3,
      "type": "action",
      "citation": {
        "url": "https://2e.aonprd.com/Actions.aspx?ID=2316",
        "book": "Player Core",
        "page": "419"
      }
    }
  ]
}
  $harnessed$::jsonb as value
), dependency_spec as (
  select value from jsonb_array_elements((select value->'dependencies' from repair_spec))
), dependency_actual as (
  select 'trait'::text as table_name, to_jsonb(t) as row from public.trait t
    where t.id in (select (value->>'id')::bigint from dependency_spec where value->>'table' = 'trait')
  union all
  select 'ability-block', to_jsonb(a) from public.ability_block a
    where a.id in (select (value->>'id')::bigint from dependency_spec where value->>'table' = 'ability-block')
)
select 'treasure-vault-harnessed-trait'::text as id,
  coalesce((select t.name = s.value->>'name'
    and t.uuid = (s.value->>'uuid')::bigint
    and t.content_source_id = (s.value->>'content_source_id')::bigint
    and t.description = s.value->>'description_after'
    and t.meta_data->'source' = s.value->'source_after'
    from repair_spec s left join public.trait t on t.id = (s.value->>'id')::bigint), false) as passed
union all
select 'treasure-vault-harnessed-links',
  (select count(*) = 2 from public.content_source where id in (3,16)
    and user_id is null and is_published is true and (id <> 16 or name = 'Treasure Vault'))
  and coalesce((select count(*) = 3 and bool_and((
    a.row is not null and not exists (
      select 1 from jsonb_each(d.value - 'table' - 'citation') property
        where a.row->property.key is distinct from property.value
    ) and (not (d.value ? 'citation') or a.row #> '{meta_data,source}' = d.value->'citation')
  ) is true)
  from dependency_spec d left join dependency_actual a
    on a.table_name = d.value->>'table' and a.row->>'id' = d.value->>'id'), false)
)
select original_checks.id,case when coalesce((status.value->>'recognized')::boolean,true) then coalesce((status.value->>'passed')::boolean,false) else original_checks.passed end as passed from original_checks cross join terminal_status status;
