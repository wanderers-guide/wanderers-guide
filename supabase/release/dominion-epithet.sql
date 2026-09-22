with options as (
  select (entry.operation->'data'->>'value')::jsonb->'option' as option
  from public.content_source source
  cross join lateral unnest(source.operations) as entry(operation)
  where source.id = 811
    and entry.operation->>'type' = 'injectSelectOption'
    and (entry.operation->'data'->>'value')::jsonb->>'opId' =
      '0ce089ed-74cb-4051-b24b-eec5a5070614'
), option_operations as (
  select option, nested.operation
  from options
  cross join lateral jsonb_array_elements(option->'operations') as nested(operation)
)
select 'dominion-epithet-identifiers' as id,
  (select count(*) = 2 and count(distinct (option->>'id')) = 2 from options)
  and exists (
    select 1
    from options
    where option->>'title' = 'Trespasser in Death’s Realm'
      and option->>'id' = '807fbb6f-25a6-4427-a8c6-1385367bf354'
  )
  and (
    select count(*) = 4 and count(distinct (operation->>'id')) = 4
    from option_operations
  )
  and (
    select count(*) = 2
    from option_operations
    where option->>'title' = 'Trespasser in Death’s Realm'
      and operation->>'id' in (
        '09dd7689-7165-4d74-be71-c7e4b83b90ef',
        'e24d037b-117e-4c93-8587-81334f8bcf01'
      )
  ) as passed;
