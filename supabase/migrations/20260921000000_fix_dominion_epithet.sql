do $$
declare
  source_operations json[];
  repaired_operations json[];
begin
  select operations
    into source_operations
    from public.content_source
   where id = 811;

  if source_operations is null then
    raise exception 'Myth-Speaker content source 811 was not found';
  end if;

  if not exists (
    select 1
      from unnest(source_operations) as entry(operation)
     where operation->>'id' = 'ac952499-0fec-4955-8566-3735a37f189b'
       and (operation->'data'->>'value')::jsonb #>> '{option,title}' = 'Trespasser in Death’s Realm'
  ) then
    raise exception 'Trespasser in Death’s Realm injection was not found';
  end if;

  select array_agg(
           case
             when operation->>'id' = 'ac952499-0fec-4955-8566-3735a37f189b' then
               jsonb_set(
                 operation::jsonb,
                 '{data,value}',
                 to_jsonb(
                   jsonb_set(
                     jsonb_set(
                       jsonb_set(
                         (operation->'data'->>'value')::jsonb,
                         '{option,id}',
                         to_jsonb('807fbb6f-25a6-4427-a8c6-1385367bf354'::text)
                       ),
                       '{option,operations,0,id}',
                       to_jsonb('09dd7689-7165-4d74-be71-c7e4b83b90ef'::text)
                     ),
                     '{option,operations,1,id}',
                     to_jsonb('e24d037b-117e-4c93-8587-81334f8bcf01'::text)
                   )::text
                 )
               )::json
             else operation
           end
           order by ordinality
         )
    into repaired_operations
    from unnest(source_operations) with ordinality as entry(operation, ordinality);

  update public.content_source
     set operations = repaired_operations
   where id = 811;
end
$$;
