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
  as passed;
