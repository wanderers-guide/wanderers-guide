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
  execute $historical_original_dual$do $repair$
declare
  item_row public.item%rowtype;
  changed_rows integer;
begin
  lock table public.content_update in share mode;
  -- Acquire the reviewed child before source locks or cache-trigger writes.
  perform id from public.item where id = 12183 for update;
  perform id from public.content_source where id = 16
    and user_id is null and is_published is true for update;
  if not found then raise exception 'Missing official Treasure Vault source'; end if;

  select * into item_row from public.item where id = 12183 for update;
  if not found or item_row.name is distinct from 'Lyrakien Staff'
    or item_row.uuid is distinct from 2395682957455828
    or item_row.content_source_id is distinct from 16
    or item_row.level is distinct from 6
    or item_row.meta_data->'source' is distinct from
      '{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4789","book":"Treasure Vault","page":"133"}'::jsonb
    or (item_row.price::jsonb = '{"gp":255}'::jsonb
      or item_row.price::jsonb = '{"gp":225}'::jsonb) is not true then
    raise exception 'Lyrakien Staff differs from reviewed entry';
  end if;
  if exists (select 1 from public.content_update where type = 'item'
    and ref_id = 12183 and status->>'state' = 'PENDING') then
    raise exception 'Lyrakien Staff has a pending curator submission';
  end if;

  if item_row.price::jsonb = '{"gp":255}'::jsonb then
    update public.item set price = '{"gp":225}'::json
      where id = 12183 and price::jsonb = '{"gp":255}'::jsonb;
    get diagnostics changed_rows = row_count;
    if changed_rows <> 1 then raise exception 'Lyrakien Staff price changed during repair'; end if;
  end if;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
