with expected(uuid, name, level, page, url, complexity, traits, labels, routine_actions, has_defenses) as (
  values
    (5254284387800808::bigint, 'Boneburst', 14, '209', 'https://2e.aonprd.com/Hazards.aspx?ID=464', 'COMPLEX', '[1504,1846]'::jsonb, '[]'::jsonb, 2, true),
    (2597532321321096::bigint, 'Lightning''s Dance', 11, '191', 'https://2e.aonprd.com/Hazards.aspx?ID=460', 'COMPLEX', '[4072,1454]'::jsonb, '["Kaiju"]'::jsonb, 2, false),
    (1758515304135316::bigint, 'Primal Chaos Aura', 5, '191', 'https://2e.aonprd.com/Hazards.aspx?ID=461', 'COMPLEX', '[1504,4072,1454]'::jsonb, '["Kaiju"]'::jsonb, 2, false),
    (2013769588148619::bigint, 'Trump of the Oliphaunt', 12, '196', 'https://2e.aonprd.com/Hazards.aspx?ID=463', 'COMPLEX', '[4072]'::jsonb, '["Environmental"]'::jsonb, 1, false),
    (1465735844144675::bigint, 'Wind Surge', 7, '191', 'https://2e.aonprd.com/Hazards.aspx?ID=462', 'SIMPLE', '[4072,1454]'::jsonb, '["Kaiju"]'::jsonb, null::integer, false)
)
select 'war-hazard-' || e.name as id, exists (
  select 1 from public.creature c
  where c.uuid = e.uuid
    and c.name = e.name
    and c.level = e.level
    and c.rarity = 'RARE'
    and c.type = 'hazard'
    and c.content_source_id = 400
    and c.deprecated = false
    and c.meta_data->'source' = jsonb_build_object(
      'book', 'War of Immortals', 'page', e.page, 'url', e.url
    )
    and c.details::jsonb->>'complexity' = e.complexity
    and c.details::jsonb->'trait_ids' = e.traits
    and c.details::jsonb->'trait_labels' = e.labels
    and length(c.details::jsonb->>'stealth') > 8
    and length(c.details::jsonb->>'description') > 20
    and length(c.details::jsonb->>'disable') > 20
    and length(c.details::jsonb #>> '{activation,name}') > 5
    and c.details::jsonb #>> '{activation,actions}' = 'REACTION'
    and length(c.details::jsonb #>> '{activation,trigger}') > 10
    and length(c.details::jsonb #>> '{activation,effect}') > 20
    and (e.routine_actions is null and c.details::jsonb->'routine' is null or
      (c.details::jsonb #>> '{routine,actions}')::integer = e.routine_actions
      and length(c.details::jsonb #>> '{routine,text}') > 40)
    and (e.has_defenses = (c.details::jsonb ? 'defenses'))
    and (e.routine_actions is null or length(c.details::jsonb->>'reset') > 20)
) as passed from expected e
union all
select 'war-hazard-count', count(*) = 5
from public.creature where content_source_id = 400 and type = 'hazard'
union all
select 'war-hazard-source-count', coalesce(meta_data::jsonb #>> '{counts,hazard}', '') = '5'
from public.content_source where id = 400;
