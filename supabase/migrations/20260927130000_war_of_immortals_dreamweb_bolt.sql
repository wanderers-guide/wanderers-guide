do $repair$
declare
  entry public.item%rowtype;
  changed integer;
begin
  select * into entry from public.item
   where id = 17480 and name = 'Dreamweb Bolt' and content_source_id = 400
   for update;
  if not found then
    raise exception 'War of Immortals Dreamweb Bolt is missing or changed';
  end if;
  if entry.meta_data #>> '{source,url}' is distinct from 'https://2e.aonprd.com/Equipment.aspx?ID=3517' then
    raise exception 'Dreamweb Bolt citation has changed';
  end if;
  if entry."group" = 'GENERAL' and entry.meta_data->>'group' = '' then
    return;
  end if;
  if entry."group" is distinct from 'WEAPON' or entry.meta_data->>'group' is distinct from 'crossbow' then
    raise exception 'Dreamweb Bolt classification has changed';
  end if;
  if exists (
    select 1 from public.content_update
     where type = 'item' and ref_id = 17480 and status->>'state' = 'PENDING'
  ) then
    raise exception 'Dreamweb Bolt has a pending curator submission';
  end if;

  update public.item
     set "group" = 'GENERAL',
         meta_data = jsonb_set(meta_data, '{group}', '""'::jsonb, false)
   where id = 17480 and "group" = 'WEAPON' and meta_data->>'group' = 'crossbow';
  get diagnostics changed = row_count;
  if changed <> 1 then
    raise exception 'Dreamweb Bolt classification changed during repair';
  end if;
end
$repair$;
