select 'rootball-chair-intelligence' as id, exists (
  select 1 from public.creature c
   where c.id = 12807 and c.name = 'Rootball Chair' and c.content_source_id = 16
     and (
       select count(*) = 1 and bool_and(
         operation->>'type' = 'setValue'
         and operation #>> '{data,variable}' = 'ATTRIBUTE_INT'
         and operation #>> '{data,value,value}' = '-4'
       ) from unnest(c.operations) operation
       where operation->>'id' = '14a327e5-2f66-41c1-9973-52c26257a700'
     )
) as passed;
