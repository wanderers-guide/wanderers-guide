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
  entry public.item%rowtype;
  corrected text;
  link record;
begin
  select * into entry from public.item
   where id = 11940 and name = 'Dragonprism Staff' and content_source_id = 16
   for update;
  if not found
     or entry.uuid is distinct from 982148341471611
     or entry.meta_data #>> '{source,url}' is distinct from 'https://2e.aonprd.com/Equipment.aspx?ID=4784' then
    raise exception 'Treasure Vault Dragonprism Staff is missing or changed';
  end if;

  if md5(entry.description) = '8098f54e420d89eadfb852aae690b8c3' then
    return;
  end if;
  if md5(entry.description) is distinct from 'b4b3e5ee7a8b92e7eea230368d3571f3' then
    raise exception 'Dragonprism Staff description differs from the reviewed record';
  end if;
  if exists (
    select 1 from public.content_update
    where type = 'item' and ref_id = 11940 and status->>'state' = 'PENDING'
  ) then
    raise exception 'Dragonprism Staff has a pending item submission';
  end if;

  corrected := entry.description;
  for link in
    select * from (values
      ('Demoralize', '[Demoralize](link_action_19624)'),
      ('Gouging Claw', '[Gouging Claw](link_spell_4645)'),
      ('Puff of Poison', '[Puff of Poison](link_spell_6760)'),
      ('Breathe Fire', '[Breathe Fire](link_spell_4423)'),
      ('Fear', '[Fear](link_spell_4616)'),
      ('Acid Arrow', '[Acid Arrow](link_spell_6347)'),
      ('Resist Energy', '[Resist Energy](link_spell_4801)'),
      ('Lightning Bolt', '[Lightning Bolt](link_spell_4700)'),
      ('Fly', '[Fly](link_spell_4628)'),
      ('Reflective Scales', '[Reflective Scales](link_spell_6197)'),
      ('Cone of Cold', 'Cone of Cold'),
      ('Summon Dragon', '[Summon Dragon](link_spell_4869)'),
      ('Dragon Form', '[Dragon Form](link_spell_4583)')
    ) as links(name, replacement)
  loop
    corrected := replace(corrected, '\[\[' || link.name || '\]\]', link.replacement);
  end loop;
  if md5(corrected) is distinct from '8098f54e420d89eadfb852aae690b8c3' then
    raise exception 'Dragonprism Staff token cleanup did not match the reviewed result';
  end if;

  update public.item
     set description = corrected
   where id = 11940 and content_source_id = 16 and description = entry.description;
  if not found then
    raise exception 'Dragonprism Staff description was not updated';
  end if;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
