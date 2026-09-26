select 'conflagration-club-charges' as id, exists (
  select 1 from public.item where id = 23121 and name = 'Conflagration Club'
    and jsonb_typeof(meta_data::jsonb->'charges') = 'object'
    and not (meta_data::jsonb->'charges' ? 'max')
) as passed
union all
select 'embedded-weapon-group-' || expected.id, exists (
  select 1 from public.item i where i.id = expected.id and i.name = expected.name
    and i.meta_data #>> '{base_item_content,meta_data,base_item_content,group}' = 'WEAPON'
) from (values (16633, 'Caress of the Great Serpent'), (17953, 'Skeletal Claw')) expected(id, name);
