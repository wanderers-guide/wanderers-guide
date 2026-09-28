do $add$
declare
  existing_count integer;
begin
  if not exists (
    select 1 from public.content_source
    where id = 400 and name = 'War of Immortals' and is_published
  ) then
    raise exception 'War of Immortals source is missing or unpublished';
  end if;

  if not exists (
    select 1 from public.item
    where id = 17477 and name = 'Dreamweb' and content_source_id = 400
      and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Equipment.aspx?ID=3517'
      and description like '%Cloth items and rope made from dream web%'
      and description like '%Light armor made from dream web%'
      and description like '%Dreamweb Items%'
  ) or not exists (
    select 1 from public.trait where id = 1533 and name = 'Precious'
  ) then
    raise exception 'A required War of Immortals material base or trait has changed';
  end if;

  if exists (
    select 1 from public.content_update
    where content_source_id = 400 and type = 'item' and status->>'state' = 'PENDING'
  ) then
    raise exception 'War of Immortals has a pending item submission';
  end if;

  create temp table war_expected_materials on commit drop as
    select * from public.item where false;

  insert into pg_temp.war_expected_materials (
    name, bulk, level, rarity, description, "group", hands, size, craft_requirements,
    usage, meta_data, operations, content_source_id, version, uuid, price, traits
  )
  select material.name, null, material.level, 'RARE', material.description,
         material.item_group, null, 'MEDIUM', null, '',
         jsonb_build_object(
           'image_url', '', 'bulk', '{}'::jsonb, 'charges', '{}'::jsonb,
           'foundry', '{}'::jsonb, 'starfinder', jsonb_build_object('slots', '[]'::jsonb),
           'material', '{}'::jsonb,
           'runes', jsonb_build_object(
             'potency', 0, 'property', '[]'::jsonb, 'striking', 0, 'resilient', 0
           ),
           'damage', jsonb_build_object('damageType', '', 'dice', 1, 'die', '', 'extra', ''),
           'category', '', 'group', '', 'quantity', 1, 'is_shoddy', false,
           'unselectable', false,
           'source', jsonb_build_object(
             'url', material.url, 'book', 'War of Immortals', 'page', material.page
           )
         ),
         '{}'::json[], 400, '1.0', material.uuid,
         case when material.gp is null then '{}'::json else json_build_object('gp', material.gp) end,
         array[1533]::bigint[]
    from jsonb_to_recordset($materials$
[
  {
    "name": "Dreamweb Object (Standard-Grade)",
    "level": 5,
    "uuid": 3457441037387738,
    "gp": 150,
    "item_group": "GENERAL",
    "url": "https://2e.aonprd.com/Equipment.aspx?ID=3517",
    "page": "215",
    "description": "The listed price is per Bulk."
  },
  {
    "name": "Dreamweb Object (High-Grade)",
    "level": 14,
    "uuid": 266245674514619,
    "gp": 3000,
    "item_group": "GENERAL",
    "url": "https://2e.aonprd.com/Equipment.aspx?ID=3517",
    "page": "215",
    "description": "The listed price is per Bulk."
  },
  {
    "name": "Sloughstone",
    "level": 0,
    "uuid": 7704425324252029,
    "gp": null,
    "item_group": "MATERIAL",
    "url": "https://2e.aonprd.com/Equipment.aspx?ID=3515",
    "page": "208",
    "description": "Sloughstone comes from the transformed flesh of Verex-That-Was. Increase the DC to Craft an item from sloughstone by 4. Structures can't be made from sloughstone.\n\n| Sloughstone Items | Hardness | HP | BT |\n|---|---:|---:|---:|\n| Thin item, standard-grade | 8 | 36 | 18 |\n| Thin item, high-grade | 11 | 48 | 24 |\n| Item, standard-grade | 12 | 50 | 25 |\n| Item, high-grade | 15 | 62 | 31 |"
  },
  {
    "name": "Sloughstone Chunk",
    "level": 0,
    "uuid": 3226333068732319,
    "gp": 500,
    "item_group": "GENERAL",
    "url": "https://2e.aonprd.com/Equipment.aspx?ID=3515",
    "page": "208",
    "description": ""
  },
  {
    "name": "Sloughstone Ingot",
    "level": 0,
    "uuid": 7804866039237746,
    "gp": 5000,
    "item_group": "GENERAL",
    "url": "https://2e.aonprd.com/Equipment.aspx?ID=3515",
    "page": "208",
    "description": ""
  },
  {
    "name": "Sloughstone Object (Standard-Grade)",
    "level": 8,
    "uuid": 3859786038237066,
    "gp": 350,
    "item_group": "GENERAL",
    "url": "https://2e.aonprd.com/Equipment.aspx?ID=3515",
    "page": "208",
    "description": "The listed price is per Bulk."
  },
  {
    "name": "Sloughstone Object (High-Grade)",
    "level": 16,
    "uuid": 1355131405502684,
    "gp": 6000,
    "item_group": "GENERAL",
    "url": "https://2e.aonprd.com/Equipment.aspx?ID=3515",
    "page": "208",
    "description": "The listed price is per Bulk."
  }
]
$materials$::jsonb) as material(
      name text, level integer, uuid bigint, gp integer, item_group text,
      url text, page text, description text
    );

  update pg_temp.war_expected_materials as child
     set description = (select description from public.item where id = 17477)
       || E'\n\nThe listed price is per Bulk.'
   where child.name in ('Dreamweb Object (Standard-Grade)', 'Dreamweb Object (High-Grade)');

  update pg_temp.war_expected_materials as child
     set description = (select description from pg_temp.war_expected_materials where name = 'Sloughstone')
       || case when child.name like 'Sloughstone Object%'
           then E'\n\nThe listed price is per Bulk.' else '' end
   where child.name in (
     'Sloughstone Chunk', 'Sloughstone Ingot',
     'Sloughstone Object (Standard-Grade)', 'Sloughstone Object (High-Grade)'
   );

  select count(*) into existing_count from public.item actual
   where (actual.content_source_id = 400 and exists (
     select 1 from pg_temp.war_expected_materials expected
      where lower(expected.name) = lower(actual.name)
   )) or actual.uuid in (select uuid from pg_temp.war_expected_materials);

  if existing_count = 7 then
    if exists (
      select 1 from pg_temp.war_expected_materials expected
      left join public.item actual on actual.uuid = expected.uuid and actual.content_source_id = 400
      where actual.id is null
         or to_jsonb(actual) - '{id,created_at,updated_at,search_tsv}'::text[]
            is distinct from to_jsonb(expected) - '{id,created_at,updated_at,search_tsv}'::text[]
    ) then
      raise exception 'Existing War of Immortals materials differ from the reviewed insert';
    end if;
    return;
  elsif existing_count <> 0 then
    raise exception 'War of Immortals materials are only partially present';
  end if;

  insert into public.item (
    name, bulk, level, rarity, description, "group", hands, size, craft_requirements,
    usage, meta_data, operations, content_source_id, version, uuid, price, traits
  )
  select name, bulk, level, rarity, description, "group", hands, size, craft_requirements,
         usage, meta_data, operations, content_source_id, version, uuid, price, traits
    from pg_temp.war_expected_materials;
end
$add$;
