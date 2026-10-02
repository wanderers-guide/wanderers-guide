select 'treasure-vault-staff-price'::text as id,
  exists (select 1 from public.item i join public.content_source s on s.id = i.content_source_id
    where i.id = 12183 and i.name = 'Lyrakien Staff'
      and i.uuid = 2395682957455828 and i.content_source_id = 16 and i.level = 6
      and i.price::jsonb = '{"gp":225}'::jsonb
      and i.meta_data->'source' =
        '{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4789","book":"Treasure Vault","page":"133"}'::jsonb
      and s.user_id is null and s.is_published is true) as passed;
