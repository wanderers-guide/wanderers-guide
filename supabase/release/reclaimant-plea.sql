with feats as (
  select id, operations from public.ability_block
  where id in (28549, 29011, 29012) and content_source_id = 25 and type = 'feat'
), operations as (
  select id, entry.operation::jsonb as operation
  from feats cross join lateral unnest(operations) as entry(operation)
), checks as (
  select condition.value as condition
  from operations
  cross join lateral jsonb_array_elements(coalesce(operation #> '{data,optionsPredefined}', '[]')) as choice
  cross join lateral jsonb_array_elements(coalesce(choice.value->'operations', '[]')) as nested
  cross join lateral jsonb_array_elements(coalesce(nested.value #> '{data,conditions}', '[]')) as condition
  where id in (28549, 29011)
), third_spells as (
  select choice.value #> '{operation,data}' as spell
  from operations
  cross join lateral jsonb_array_elements(coalesce(operation #> '{data,optionsPredefined}', '[]')) as choice
  where id = 29012
)
select 'reclaimant-plea-content' as id,
  (select count(*) = 3 from feats)
  and (select count(*) = 3 from operations
       where operation->>'type' = 'createValue'
         and operation #>> '{data,variable}' = 'KRP_LAST'
         and operation #> '{data,value}' = 'false'::jsonb)
  and (select count(*) = 1 from operations
       where id = 29012 and operation->>'type' = 'adjValue'
         and operation #>> '{data,variable}' = 'KRP_LAST'
         and operation #> '{data,value}' = 'true'::jsonb)
  and (select count(*) = 14 from checks
       where condition->>'name' = 'KRP_LAST' and condition->>'value' = 'TRUE')
  and not exists (select 1 from checks
       where condition->>'name' = 'KRP_LAST' and condition->>'value' not in ('TRUE', 'FALSE'))
  and (select count(*) = 9 and bool_and(
       spell->>'type' = 'INNATE' and spell->>'rank' = '7'
       and spell->>'tradition' = 'DIVINE' and spell->>'casts' = '1') from third_spells)
  as passed;
