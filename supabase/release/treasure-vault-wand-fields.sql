with expected(id, uuid, source, level, price, name_md5, description_md5, craft_md5, citation) as (values
  (12659,7611411327409832,16,10,'{"gp":1000}'::jsonb,'88b6dd943f307847b7e90c7f675d5ef0',null::text,null::text,
    '{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4818","book":"Treasure Vault","page":"141"}'::jsonb),
  (12675,2336719364145203,16,11,'{"gp":1400}'::jsonb,'20a6294d280a4b7dfaf05520ad57ce5d',
    '020252709e385f23c384ac83dc262bb5','e91875990c04ecd9cf6437cd0c75677f',
    '{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4822","book":"Treasure Vault","page":"142"}'::jsonb),
  (12676,3908476794355892,16,15,'{"gp":6500}'::jsonb,'2e75681c60942e873c5d5e06321ae605',
    '9a2a5e6219626b84df338a11259c5a02','e91875990c04ecd9cf6437cd0c75677f',
    '{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4822","book":"Treasure Vault","page":"142"}'::jsonb),
  (12702,7838296050281525,16,18,'{"gp":24000}'::jsonb,'340dc82d2b3694105e04b9834912daef',null::text,null::text,
    '{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4832","book":"Treasure Vault","page":"143"}'::jsonb)
)
select 'treasure-vault-wand-fields'::text as id,
  coalesce((select count(*) = 4 and bool_and((
    i.id is not null and i.uuid = e.uuid and i.content_source_id = e.source
    and i.level = e.level and i.price::jsonb = e.price and md5(i.name) = e.name_md5
    and (e.description_md5 is null or md5(i.description) = e.description_md5)
    and (e.craft_md5 is null or md5(i.craft_requirements) = e.craft_md5)
    and i.meta_data->'source' = e.citation) is true)
    from expected e left join public.item i on i.id = e.id), false)
  and exists (select 1 from public.spell where id = 5322 and name = 'Chromatic Ray'
    and uuid = 8318806142210311 and rank = 4 and content_source_id = 13
    and meta_data->'source' =
      '{"url":"https://2e.aonprd.com/Spells.aspx?ID=883","book":"Secrets of Magic","page":"95"}'::jsonb)
  as passed;
