-- Treasure Vault p. 107: Rootball Chair has Intelligence -4, not +4.
-- https://2e.aonprd.com/AnimalCompanions.aspx?ID=125&NoRedirect=1
do $repair$
declare
  patch constant jsonb := $patch$
  {"id":"14a327e5-2f66-41c1-9973-52c26257a700","before":4,"after":-4}
  $patch$::jsonb;
  original json[];
  operation jsonb;
  operation_index integer;
begin
  select operations into original from public.creature
   where id = 12807 and name = 'Rootball Chair' and content_source_id = 16
   for update;
  if original is null then
    raise exception 'Rootball Chair was not found';
  end if;
  if (select count(*) from unnest(original) entry
       where entry->>'id' = patch->>'id') <> 1 then
    raise exception 'Rootball Chair Intelligence operation changed; review before repair';
  end if;
  select entry::jsonb, ordinal::integer into operation, operation_index
    from unnest(original) with ordinality as operations(entry, ordinal)
   where entry->>'id' = patch->>'id';
  if operation->>'type' is distinct from 'setValue'
     or operation #>> '{data,variable}' is distinct from 'ATTRIBUTE_INT' then
    raise exception 'Rootball Chair Intelligence operation changed; review before repair';
  end if;
  if operation #> '{data,value,value}' = patch->'after' then
    return;
  end if;
  if operation #> '{data,value,value}' is distinct from patch->'before' then
    raise exception 'Rootball Chair Intelligence changed; review before repair';
  end if;
  if exists (
    select 1 from public.content_update
     where type = 'creature' and ref_id = 12807 and status->>'state' = 'PENDING'
  ) then
    raise exception 'Rootball Chair has a pending curator submission';
  end if;
  update public.creature
     set operations[operation_index] = jsonb_set(operation, '{data,value,value}', patch->'after', false)::json
   where id = 12807;
end
$repair$;
