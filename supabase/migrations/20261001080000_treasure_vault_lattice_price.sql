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
  execute $historical_original_dual$-- Correct both source-specific Lattice Armor prices without changing reprint identities or saved items.
do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"id":12145,"uuid":"6101547865815677","source":16,"citation":{"url":"https://2e.aonprd.com/Armor.aspx?ID=67","book":"Treasure Vault","page":"10"},"name":"Lattice Armor","level":0,"group":"ARMOR","rarity":"COMMON","size":"MEDIUM","bulk":"2","hands":null,"usage":null,"craft_requirements":null,"availability":null,"version":"1.0","traits":[],"description_md5":"5c18ad68c44d03df372627399262aa81","armor":{"category":"medium","group":"chain","ac_bonus":4,"dex_cap":1,"check_penalty":-2,"speed_penalty":-5,"strength":3,"runes":{"property":[]}},"before_price":{"gp":6},"after_price":{"gp":9}},
    {"uuid":"1142536405766694","source":400,"citation":{"url":"https://2e.aonprd.com/Armor.aspx?ID=54","book":"War of Immortals","page":"146"},"name":"Lattice Armor","level":0,"group":"ARMOR","rarity":"COMMON","size":"MEDIUM","bulk":"2","hands":null,"usage":null,"craft_requirements":null,"availability":null,"version":"1.0","traits":[],"description_md5":"5c18ad68c44d03df372627399262aa81","armor":{"category":"medium","group":"chain","ac_bonus":4,"dex_cap":1,"check_penalty":-2,"speed_penalty":-5,"strength":3,"runes":{"property":[]}},"before_price":{"gp":6},"after_price":{"gp":9}}
  ]
  $patches$::jsonb;
  patch jsonb;
  item_row public.item%rowtype;
  changed_rows integer;
begin
  lock table public.content_update in share mode;
  -- Acquire reviewed content rows before source cache locks.
  perform i.id from public.item i where exists (
    select 1 from jsonb_array_elements(patches) p
    where i.uuid = (p->>'uuid')::bigint and i.content_source_id = (p->>'source')::bigint
      and (not (p ? 'id') or i.id = (p->>'id')::bigint)
  ) order by i.id for update;
  -- End reviewed content row prelocks.
  perform id from public.content_source
    where (id = 16 and name = 'Treasure Vault' or id = 400 and name = 'War of Immortals')
      and user_id is null and is_published is true order by id for update;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 2 then raise exception 'Missing official Lattice Armor sources'; end if;

  for patch in select value from jsonb_array_elements(patches) order by (value->>'source')::bigint loop
    -- Reprint bootstrap allocates its numeric ID; the source-specific canonical UUID is stable.
    select * into item_row from public.item
      where uuid = (patch->>'uuid')::bigint and content_source_id = (patch->>'source')::bigint
        and (not (patch ? 'id') or id = (patch->>'id')::bigint) for update;
    if not found or item_row.name is distinct from patch->>'name'
      or item_row.level is distinct from (patch->>'level')::integer
      or item_row."group" is distinct from patch->>'group'
      or item_row.rarity is distinct from patch->>'rarity'
      or item_row.size is distinct from patch->>'size'
      or item_row.bulk is distinct from patch->>'bulk'
      or item_row.hands is distinct from patch->>'hands'
      or item_row.usage is distinct from patch->>'usage'
      or item_row.craft_requirements is distinct from patch->>'craft_requirements'
      or item_row.availability is distinct from patch->>'availability'
      or item_row.version is distinct from patch->>'version'
      or to_jsonb(item_row.traits) is distinct from patch->'traits'
      or item_row.operations is not null
      or md5(item_row.description) is distinct from patch->>'description_md5'
      or jsonb_typeof(item_row.meta_data) is distinct from 'object'
      or item_row.meta_data->'source' is distinct from patch->'citation'
      or exists (select 1 from jsonb_each(patch->'armor') field
        where item_row.meta_data->field.key is distinct from field.value)
      or (item_row.price::jsonb is distinct from patch->'before_price'
        and item_row.price::jsonb is distinct from patch->'after_price') then
      raise exception 'Missing or changed reviewed Lattice Armor: %', patch->>'source';
    end if;
    -- Pending submissions must block both the original repair and an already-correct replay.
    if exists (select 1 from public.content_update where type = 'item'
      and status->>'state' = 'PENDING' and (ref_id = item_row.id
        or (content_source_id = item_row.content_source_id and data->>'name' = item_row.name))) then
      raise exception 'Lattice Armor has a pending curator submission: %', patch->>'source';
    end if;
    if item_row.price::jsonb is distinct from patch->'after_price' then
      update public.item set price = patch->'after_price'
        where id = item_row.id and uuid is not distinct from item_row.uuid
          and content_source_id is not distinct from item_row.content_source_id
          and name is not distinct from item_row.name and level is not distinct from item_row.level
          and "group" is not distinct from item_row."group" and rarity is not distinct from item_row.rarity
          and size is not distinct from item_row.size and bulk is not distinct from item_row.bulk
          and hands is not distinct from item_row.hands and usage is not distinct from item_row.usage
          and craft_requirements is not distinct from item_row.craft_requirements
          and availability is not distinct from item_row.availability
          and version is not distinct from item_row.version and traits is not distinct from item_row.traits
          and operations is null and description is not distinct from item_row.description
          and meta_data is not distinct from item_row.meta_data
          and price::jsonb is not distinct from item_row.price::jsonb;
      get diagnostics changed_rows = row_count;
      if changed_rows <> 1 then raise exception 'Lattice Armor changed during price repair: %', patch->>'source'; end if;
    end if;
  end loop;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
