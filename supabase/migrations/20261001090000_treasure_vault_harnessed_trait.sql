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
  execute $historical_original_dual$-- Fill the omitted Harnessed rules and cite their identical remaster printing.
-- Only trait 2886's description and source citation change; source 16 stays in place.
do $repair$
declare
  spec constant jsonb := $harnessed$
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
  $harnessed$::jsonb;
  actual public.trait%rowtype;
  dependency jsonb;
  dependency_row jsonb;
  property record;
  affected integer;
begin
  lock table public.content_update in share mode;
  -- Acquire every reviewed child before source locks or cache-trigger writes.
  perform a.id from public.ability_block a where a.id in (
    select (value->>'id')::bigint from jsonb_array_elements(spec->'dependencies')
      where value->>'table' = 'ability-block'
  ) order by a.id for share;
  perform t.id from public.trait t where t.id in (
    select (value->>'id')::bigint from jsonb_array_elements(spec->'dependencies')
      where value->>'table' = 'trait'
  ) order by t.id for share;
  perform id from public.trait where id = (spec->>'id')::bigint for update;
  perform id from public.content_source where id in (3,16)
    and user_id is null and is_published is true
    and (id <> 16 or name = 'Treasure Vault')
    order by id for update;
  get diagnostics affected = row_count;
  if affected <> 2 then raise exception 'Missing or changed official Harnessed sources'; end if;

  -- Ref checks do not depend on payload fields: partial pending edits still block replay.
  if exists (select 1 from public.content_update u where u.status->>'state' = 'PENDING'
    and (
      (u.type = 'content-source' and u.ref_id in (3,16))
      or (u.type = 'trait' and u.ref_id in (2886,2748))
      or (u.type = 'ability-block' and u.ref_id in (19733,19750))
      or (u.type = 'trait' and u.content_source_id = 16 and (
        lower(btrim(u.data->>'name')) = lower(spec->>'name')
        or u.data->>'uuid' = spec->>'uuid'
        or u.data #>> '{meta_data,source,url}' in
          (spec #>> '{source_before,url}', spec #>> '{source_after,url}')
      ))
    )) then raise exception 'Harnessed repair has a pending curator submission'; end if;

  for dependency in select value from jsonb_array_elements(spec->'dependencies')
    order by value->>'table', (value->>'id')::bigint loop
    dependency_row := null;
    case dependency->>'table'
      when 'trait' then
        select to_jsonb(t) into dependency_row from public.trait t
          where t.id = (dependency->>'id')::bigint for share;
      when 'ability-block' then
        select to_jsonb(a) into dependency_row from public.ability_block a
          where a.id = (dependency->>'id')::bigint for share;
      else raise exception 'Unsupported Harnessed dependency table';
    end case;
    if dependency_row is null then raise exception 'Missing Harnessed dependency: %', dependency->>'id'; end if;
    for property in select key, value from jsonb_each(dependency - 'table' - 'citation') loop
      if dependency_row->property.key is distinct from property.value then
        raise exception 'Harnessed dependency identity changed: %', dependency->>'id';
      end if;
    end loop;
    if dependency ? 'citation'
      and dependency_row #> '{meta_data,source}' is distinct from dependency->'citation' then
      raise exception 'Harnessed dependency citation changed: %', dependency->>'id';
    end if;
  end loop;

  select * into actual from public.trait where id = (spec->>'id')::bigint for update;
  if not found or actual.name is distinct from spec->>'name'
    or actual.uuid is distinct from (spec->>'uuid')::bigint
    or actual.content_source_id is distinct from (spec->>'content_source_id')::bigint then
    raise exception 'Harnessed identity differs from reviewed trait';
  end if;
  if (
    (actual.description = spec->>'description_before' and actual.meta_data->'source' = spec->'source_before')
    or (actual.description = spec->>'description_after' and actual.meta_data->'source' = spec->'source_after')
  ) is not true then
    raise exception 'Harnessed description/citation differs from reviewed pair';
  end if;
  if actual.description = spec->>'description_after' then return; end if;

  update public.trait
    set description = spec->>'description_after',
        meta_data = jsonb_set(meta_data, '{source}', spec->'source_after', false)
    where id = (spec->>'id')::bigint
      and description = spec->>'description_before'
      and meta_data->'source' = spec->'source_before';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Harnessed repair did not update exactly one trait'; end if;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
