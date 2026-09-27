with war_records as materialized (
  select id, to_jsonb(row_data) as body from public.ability_block row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.item row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.spell row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.archetype row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.class row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.class_archetype row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.trait row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.versatile_heritage row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.creature row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.ancestry row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.background row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.language row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.content_source row_data where id = 400
)
select 'war-citations' as id,
  (select count(*) = 20 from public.ability_block
    where id in (38754, 51663, 51667, 51526, 38748, 39204, 51495, 38765, 38503, 39141,
                 38745, 39274, 43769, 38768, 39156, 39276, 39279, 39280, 39287, 39288)
      and meta_data #>> '{source,url}' like 'https://2e.aonprd.com/%')
  and (select count(*) = 2 from public.spell where id in (7271, 7280)
    and meta_data #>> '{source,url}' like 'https://2e.aonprd.com/%')
  and (select count(*) = 4 from public.item where id in (16924, 16925, 16926, 16927)
    and meta_data #>> '{source,url}' like 'https://2e.aonprd.com/%')
  and exists (select 1 from public.archetype where id = 289
    and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Archetypes.aspx?ID=284') as passed
union all
select 'war-class-rules',
  exists (select 1 from public.ability_block a, unnest(a.operations) op
    where a.id = 51667 and op->>'id' = '81b9d86d-939f-4ca1-a5b8-fa75a7d8a4a2'
      and op #>> '{data,conditions,1,value}' = 'TRUE')
  and (select count(*) = 6 from public.ability_block a, unnest(a.operations) op,
      jsonb_array_elements(op::jsonb #> '{data,slots}') slot
    where a.id = 38637 and op->>'id' = '8411d1a2-a480-468e-a45c-d8f6fa10a0d2'
      and ((slot->>'lvl')::integer, (slot->>'rank')::integer, (slot->>'amt')::integer)
        in ((13,7,1),(14,7,2),(15,8,1),(16,8,2),(17,9,1),(18,9,2)))
  and exists (select 1 from public.ability_block a, unnest(a.operations) op
    where a.id = 38709 and op->>'id' = '2cc5d640-ccd6-4532-a42c-eb00b0de6cb6'
      and op #>> '{data,trueOperations,0,data,spellId}' = '4679'
      and op #>> '{data,trueOperations,0,data,rank}' = '5')
union all
select 'war-links',
  exists (select 1 from public.ability_block where id = 38638
    and operations::text not like '%link_trait_3130%')
  and (select count(*) = 2 from public.ability_block where id in (38762, 38773)
    and operations::text like '%link_feat_38714%'
    and operations::text not like '%link_feat_28015%')
  and exists (select 1 from public.ability_block where id = 51428
    and description like '%link_feat_51429%'
    and description not like '%link_action_51429%')
  and exists (select 1 from public.ability_block where id = 51443
    and description like '%link_feat_51444%'
    and description like '%link_feat_51445%'
    and description like '%link_feat_51446%'
    and description not like '%link_action_51444%'
    and description not like '%link_action_51445%'
    and description not like '%link_action_51446%')
union all
select 'war-fields',
  (select count(*) = 2 from public.ability_block where (id = 38754 and name = 'Apparition Stabilization')
    or (id = 38768 and name = 'Whisper of Warning'))
  and exists (select 1 from public.ability_block where id = 39022 and rarity = 'RARE')
  and exists (select 1 from public.archetype where id = 292 and rarity = 'RARE')
  and exists (select 1 from public.item where id = 16928 and bulk = '1')
  and exists (select 1 from public.item where id = 16929 and usage = 'worn cloak')
  and exists (select 1 from public.item where id = 17391 and rarity = 'UNCOMMON')
union all
select 'war-vindicator',
  exists (select 1 from public.class_archetype c, unnest(c.operations) op
    where c.id = 30 and op->>'id' = 'c4a75d49-19e5-4983-8757-d5caf473627b'
      and op #>> '{data,optionsFilters,addToFamiliarity}' = 'true'
      and op::jsonb #> '{data,optionsFilters,familiarityCategories}' = '["advanced"]'::jsonb)
  and exists (select 1 from public.ability_block where id = 39273
    and name = 'Silence the Profane (Vindicator)' and uuid = 2351793770437190
    and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Feats.aspx?ID=7258')
union all
select 'war-humble-strikes',
  exists (select 1 from public.ability_block a, unnest(a.operations) op
    where a.id = 38635 and op->>'id' = '4ba64431-4832-4633-a5da-46dee7e6b756'
      and op #>> '{data,variable}' = 'EXEMPLAR_HUMBLE_STRIKES'
      and op #>> '{data,value}' = 'true')
union all
select 'war-items',
  (select count(*) = 3 from public.item where content_source_id = 400
    and ((name = 'Rattan Armor' and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Armor.aspx?ID=52')
      or (name = 'Shard of Self-Destruction' and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Equipment.aspx?ID=3516')
      or (name = 'Wandering Pipe' and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Equipment.aspx?ID=3513')))
union all
select 'war-errata',
  exists (select 1 from public.ability_block where id = 39152
    and special like '%4th rank%' and special like '%7th rank%')
  and exists (select 1 from public.ability_block where id = 39154
    and prerequisites = array['Rising Blood Magic','master in Arcana or Religion, depending on your chosen tradition']::varchar[])
  and exists (select 1 from public.ability_block where id = 39155
    and prerequisites = array['Surging Blood Magic','legendary in Arcana or Religion, depending on your chosen tradition']::varchar[]
    and description like '%master spellcasting benefits%')
  and exists (select 1 from public.ability_block where id = 38660 and prerequisites = array['Vindicator']::varchar[])
  and exists (select 1 from public.ability_block where id = 38821 and prerequisites = array['Strike Rivers, Seize Winds']::varchar[])
  and exists (select 1 from public.ability_block where id = 51462 and prerequisites = array['Ascended Celestial Dedication']::varchar[])
union all
select 'war-archetype-citations',
  (select count(*) = 4 from public.class_archetype
    where id in (14, 32, 34, 36)
      and meta_data #>> '{source,url}' like 'https://2e.aonprd.com/Archetypes.aspx?ID=%')
union all
select 'war-epithet-labels',
  (select count(*) = 2 from public.ability_block where id in (38638, 38694)
    and operations[1] #>> '{data,title}' = 'Select an Epithet')
union all
select 'war-apparition-sense',
  exists (select 1 from public.ability_block where id = 38742
    and operations[1] #>> '{data,abilityBlockId}' = '38723')
union all
select 'war-seneschal-spell',
  exists (select 1 from public.class_archetype c, unnest(c.feature_adjustments) adjustment
    where c.id = 14 and adjustment->>'fa_id' = '80493ab4-562d-4d7f-a360-9a1de1cda715'
      and adjustment #>> '{data,operations,2,data,optionsFilters,rarity}' = 'COMMON'
      and adjustment #>> '{data,operations,2,data,optionsFilters,level,min}' = '1'
      and adjustment #>> '{data,operations,2,data,optionsFilters,level,max}' = '1'
      and adjustment #>> '{data,operations,2,data,optionsFilters,traditionFromSelection,castingSource}' = 'WITCH')
union all
select 'war-dreamweb-bolt',
  exists (select 1 from public.item
    where id = 17480 and name = 'Dreamweb Bolt' and content_source_id = 400
      and "group" = 'GENERAL' and meta_data->>'group' = ''
      and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Equipment.aspx?ID=3517')
union all
select 'war-content-links',
  not exists (
    select 1 from war_records record,
      lateral regexp_matches(record.body::text, 'link_([a-z-]+)_([0-9]+)', 'g') link
    where not (
      (link[1] in ('action', 'class-feature', 'feat', 'heritage', 'sense', 'mode', 'physical-feature', 'ability-block')
        and exists (select 1 from public.ability_block target
          where target.id = link[2]::bigint and (link[1] = 'ability-block' or target.type = link[1])))
      or (link[1] = 'item' and exists (select 1 from public.item target where target.id = link[2]::bigint))
      or (link[1] = 'spell' and exists (select 1 from public.spell target where target.id = link[2]::bigint))
      or (link[1] = 'trait' and exists (select 1 from public.trait target where target.id = link[2]::bigint))
      or (link[1] = 'class' and exists (select 1 from public.class target where target.id = link[2]::bigint))
      or (link[1] = 'archetype' and exists (select 1 from public.archetype target where target.id = link[2]::bigint))
      or (link[1] = 'versatile-heritage' and exists
        (select 1 from public.versatile_heritage target where target.id = link[2]::bigint))
      or (link[1] = 'class-archetype' and exists
        (select 1 from public.class_archetype target where target.id = link[2]::bigint))
      or (link[1] = 'creature' and exists (select 1 from public.creature target where target.id = link[2]::bigint))
      or (link[1] = 'ancestry' and exists (select 1 from public.ancestry target where target.id = link[2]::bigint))
      or (link[1] = 'background' and exists (select 1 from public.background target where target.id = link[2]::bigint))
      or (link[1] = 'language' and exists (select 1 from public.language target where target.id = link[2]::bigint))
      or (link[1] = 'content-source' and exists
        (select 1 from public.content_source target where target.id = link[2]::bigint))
    )
  )
union all
select 'war-operation-references',
  not exists (
    with operation_refs as (
      select 'ability-block' as target_type, (operation->>'abilityBlockId')::bigint as target_id,
             operation->>'type' as expected_type
        from war_records record,
          lateral jsonb_path_query(record.body, '$.** ? (exists (@.abilityBlockId))') operation
      union all
      select 'spell', trim(both '"' from target::text)::bigint, null::text
        from war_records record, lateral jsonb_path_query(record.body, '$.**.spellId') target
      union all
      select 'item', trim(both '"' from target::text)::bigint, null::text
        from war_records record, lateral jsonb_path_query(record.body, '$.**.itemId') target
      union all
      select 'trait', trim(both '"' from target::text)::bigint, null::text
        from war_records record, lateral jsonb_path_query(record.body, '$.**.traitId') target
    )
    select 1 from operation_refs ref where not (
      (ref.target_type = 'ability-block' and exists
        (select 1 from public.ability_block target
          where target.id = ref.target_id and target.type = ref.expected_type))
      or (ref.target_type = 'spell' and exists
        (select 1 from public.spell target where target.id = ref.target_id))
      or (ref.target_type = 'item' and exists
        (select 1 from public.item target where target.id = ref.target_id))
      or (ref.target_type = 'trait' and exists
        (select 1 from public.trait target where target.id = ref.target_id))
    )
  );
