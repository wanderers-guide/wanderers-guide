do $add$
declare
  expected_armor record;
  tv_entry public.item%rowtype;
  existing_count integer;
begin
  lock table public.content_update in share mode;
  if not exists (
    select 1 from public.content_source
    where id = 400 and name = 'War of Immortals' and is_published
  ) then
    raise exception 'War of Immortals source is missing or unpublished';
  end if;

  create temporary table war_armor_reprint_spec (
    tv_id bigint not null,
    name text not null,
    tv_uuid bigint not null,
    war_uuid bigint not null,
    tv_url text not null,
    war_url text not null,
    description_md5 text not null,
    bulk text not null,
    price_gp integer not null,
    category text not null,
    armor_group text not null,
    ac_bonus integer not null,
    dex_cap integer not null,
    check_penalty integer not null,
    speed_penalty integer not null,
    strength integer not null,
    traits bigint[] not null
  ) on commit drop;

  insert into pg_temp.war_armor_reprint_spec values
    (12145, 'Lattice Armor', 6101547865815677, 1142536405766694,
      'https://2e.aonprd.com/Armor.aspx?ID=67', 'https://2e.aonprd.com/Armor.aspx?ID=54',
      '5c18ad68c44d03df372627399262aa81', '2', 6, 'medium', 'chain', 4, 1, -2, -5, 3, '{}'::bigint[]),
    (12236, 'Niyaháat', 476041034844908, 5866771262234991,
      'https://2e.aonprd.com/Armor.aspx?ID=71', 'https://2e.aonprd.com/Armor.aspx?ID=55',
      'baff9d0c71cdfb04254ee9c8ca068e62', '2', 5, 'medium', 'skeletal', 3, 2, -2, -5, 2, array[2860]::bigint[]),
    (12366, 'Sankeit', 8906569033590767, 3406841990572783,
      'https://2e.aonprd.com/Armor.aspx?ID=74', 'https://2e.aonprd.com/Armor.aspx?ID=53',
      '80486dabc8d4d955181faac119e1dff2', '1', 5, 'light', 'wood', 2, 3, -1, 0, 1, array[2860]::bigint[]);

  if exists (
    select 1 from public.content_update
    where type = 'item' and status->>'state' = 'PENDING'
      and (ref_id in (select tv_id from pg_temp.war_armor_reprint_spec)
        or (content_source_id = 400 and (
          ref_id in (select id from public.item
            where uuid in (select war_uuid from pg_temp.war_armor_reprint_spec))
          or data->>'name' in (select name from pg_temp.war_armor_reprint_spec))))
  ) then
    raise exception 'A reviewed armor or War of Immortals item has a pending submission';
  end if;

  -- 20261001080000 corrects Lattice to 9 gp; replay accepts only its reviewed 6/9 gp states.
  select count(*) into existing_count from public.item actual
  where actual.uuid in (select war_uuid from pg_temp.war_armor_reprint_spec)
     or (actual.content_source_id = 400
       and actual.name in (select name from pg_temp.war_armor_reprint_spec))
     or actual.meta_data #>> '{source,url}' in
       (select war_url from pg_temp.war_armor_reprint_spec);

  if existing_count = 3 then
    if exists (
      select 1 from pg_temp.war_armor_reprint_spec expected
      left join public.item actual
        on actual.uuid = expected.war_uuid and actual.content_source_id = 400
      where actual.id is null
         or actual.name is distinct from expected.name
         or actual."group" is distinct from 'ARMOR'
         or actual.level is distinct from 0
         or actual.rarity is distinct from 'COMMON'
         or actual.size is distinct from 'MEDIUM'
         or actual.bulk is distinct from expected.bulk
         or (case when expected.tv_id = 12145 then
           actual.price::jsonb is distinct from '{"gp":6}'::jsonb
             and actual.price::jsonb is distinct from '{"gp":9}'::jsonb
           else actual.price::jsonb is distinct from jsonb_build_object('gp', expected.price_gp) end)
         or actual.traits is distinct from expected.traits
         or md5(actual.description) is distinct from expected.description_md5
         or actual.meta_data->'source' is distinct from jsonb_build_object(
           'url', expected.war_url, 'book', 'War of Immortals', 'page', '146')
         or actual.meta_data #>> '{category}' is distinct from expected.category
         or actual.meta_data #>> '{group}' is distinct from expected.armor_group
         or (actual.meta_data->>'ac_bonus')::integer is distinct from expected.ac_bonus
         or (actual.meta_data->>'dex_cap')::integer is distinct from expected.dex_cap
         or (actual.meta_data->>'check_penalty')::integer is distinct from expected.check_penalty
         or (actual.meta_data->>'speed_penalty')::integer is distinct from expected.speed_penalty
         or (actual.meta_data->>'strength')::integer is distinct from expected.strength
         or actual.operations is not null
    ) then
      raise exception 'Existing War of Immortals armor differs from the reviewed insert';
    end if;
    return;
  elsif existing_count <> 0 then
    raise exception 'War of Immortals armor is only partially present';
  end if;

  if not exists (
    select 1 from public.content_source
    where id = 16 and name = 'Treasure Vault' and is_published
  ) then
    raise exception 'Treasure Vault source is missing or unpublished';
  end if;

  for expected_armor in select * from pg_temp.war_armor_reprint_spec loop
    select * into tv_entry from public.item where id = expected_armor.tv_id for update;
    if not found
       or tv_entry.name is distinct from expected_armor.name
       or tv_entry.content_source_id is distinct from 16
       or tv_entry.uuid is distinct from expected_armor.tv_uuid
       or tv_entry."group" is distinct from 'ARMOR'
       or tv_entry.level is distinct from 0
       or tv_entry.rarity is distinct from 'COMMON'
       or tv_entry.size is distinct from 'MEDIUM'
       or tv_entry.bulk is distinct from expected_armor.bulk
       or (case when expected_armor.tv_id = 12145 then
         tv_entry.price::jsonb is distinct from '{"gp":6}'::jsonb
           and tv_entry.price::jsonb is distinct from '{"gp":9}'::jsonb
         else tv_entry.price::jsonb is distinct from jsonb_build_object('gp', expected_armor.price_gp) end)
       or tv_entry.traits is distinct from expected_armor.traits
       or md5(tv_entry.description) is distinct from expected_armor.description_md5
       or tv_entry.meta_data #>> '{source,url}' is distinct from expected_armor.tv_url
       or tv_entry.meta_data #>> '{source,book}' is distinct from 'Treasure Vault'
       or tv_entry.meta_data #>> '{category}' is distinct from expected_armor.category
       or tv_entry.meta_data #>> '{group}' is distinct from expected_armor.armor_group
       or (tv_entry.meta_data->>'ac_bonus')::integer is distinct from expected_armor.ac_bonus
       or (tv_entry.meta_data->>'dex_cap')::integer is distinct from expected_armor.dex_cap
       or (tv_entry.meta_data->>'check_penalty')::integer is distinct from expected_armor.check_penalty
       or (tv_entry.meta_data->>'speed_penalty')::integer is distinct from expected_armor.speed_penalty
       or (tv_entry.meta_data->>'strength')::integer is distinct from expected_armor.strength
       or tv_entry.operations is not null then
      raise exception 'Treasure Vault armor % differs from the reviewed record', expected_armor.name;
    end if;
  end loop;

  create temporary table war_expected_armor on commit drop as
    select * from public.item where false;

  insert into pg_temp.war_expected_armor (
    name, bulk, level, rarity, description, "group", hands, size,
    craft_requirements, usage, meta_data, operations, content_source_id,
    version, uuid, price, traits, availability
  )
  select original.name, original.bulk, original.level, original.rarity,
    original.description, original."group", original.hands, original.size,
    original.craft_requirements, original.usage,
    jsonb_set(original.meta_data, '{source}', jsonb_build_object(
      'url', armor.war_url, 'book', 'War of Immortals', 'page', '146'), true),
    original.operations, 400, original.version, armor.war_uuid,
    original.price, original.traits, original.availability
  from public.item original
  join pg_temp.war_armor_reprint_spec armor on armor.tv_id = original.id;

  insert into public.item (
    name, bulk, level, rarity, description, "group", hands, size,
    craft_requirements, usage, meta_data, operations, content_source_id,
    version, uuid, price, traits, availability
  )
  select name, bulk, level, rarity, description, "group", hands, size,
    craft_requirements, usage, meta_data, operations, content_source_id,
    version, uuid, price, traits, availability
  from pg_temp.war_expected_armor;
end
$add$;
