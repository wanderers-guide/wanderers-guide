do $repair$
declare
  entry public.item%rowtype;
begin
  if not exists (
    select 1 from public.content_source
    where id = 16 and name = 'Treasure Vault' and is_published
  ) then
    raise exception 'Treasure Vault source is missing or unpublished';
  end if;

  select * into entry from public.item
   where id = 12366 and name = 'Sankeit' and content_source_id = 16
   for update;
  if not found then
    raise exception 'Treasure Vault Sankeit is missing';
  end if;

  if exists (
    select 1 from public.content_update
    where type = 'item' and ref_id = 12366 and status->>'state' = 'PENDING'
  ) then
    raise exception 'Sankeit has a pending item submission';
  end if;

  if entry.uuid is distinct from 8906569033590767
     or entry.level is distinct from 0
     or entry.bulk is distinct from '1'
     or entry.price::jsonb is distinct from '{"gp":5}'::jsonb
     or entry.meta_data #>> '{source,url}' is distinct from 'https://2e.aonprd.com/Armor.aspx?ID=74'
     or entry.meta_data #>> '{category}' is distinct from 'light'
     or entry.meta_data #>> '{group}' is distinct from 'wood'
     or entry.meta_data #>> '{ac_bonus}' is distinct from '2'
     or entry.meta_data #>> '{dex_cap}' is distinct from '3'
     or entry."group" not in ('WEAPON', 'ARMOR') then
    raise exception 'Sankeit differs from the reviewed armor record';
  end if;

  if entry."group" = 'ARMOR' then
    return;
  end if;

  update public.item
     set "group" = 'ARMOR'
   where id = 12366 and content_source_id = 16 and "group" = 'WEAPON';

  if not found then
    raise exception 'Sankeit armor classification was not updated';
  end if;
end
$repair$;
