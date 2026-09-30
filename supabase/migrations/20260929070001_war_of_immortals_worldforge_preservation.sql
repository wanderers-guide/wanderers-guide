do $preserve$
declare
  worldforge public.item%rowtype;
begin
  select * into worldforge from public.item where id = 16930 for update;
  if not found
     or worldforge.name is distinct from 'Worldforge'
     or worldforge.uuid is distinct from 5574690037466395
     or worldforge.content_source_id is distinct from 400
     or worldforge.level is distinct from 25
     or worldforge.meta_data #>> '{source,url}' is distinct from 'https://2e.aonprd.com/Equipment.aspx?ID=3511'
     or worldforge.meta_data #>> '{source,book}' is distinct from 'War of Immortals'
     or worldforge.meta_data #>> '{source,page}' is distinct from '152' then
    raise exception 'Worldforge identity or citation differs from the reviewed record';
  end if;

  if exists (
    select 1 from public.content_update
    where type = 'item' and ref_id = 16930 and status->>'state' = 'PENDING'
  ) then
    raise exception 'Worldforge has a pending curator submission';
  end if;
  if worldforge.bulk = '15' and worldforge.usage = '' then
    return;
  end if;
  if worldforge.bulk is distinct from '1'
     or worldforge.usage is distinct from 'held in 1 hand' then
    raise exception 'Worldforge bulk or usage differs from the reviewed correction';
  end if;

  update public.item
  set bulk = '15', usage = ''
  where id = 16930 and name = 'Worldforge' and uuid = 5574690037466395
    and content_source_id = 400 and bulk = '1' and usage = 'held in 1 hand'
    and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Equipment.aspx?ID=3511';
  if not found then
    raise exception 'Worldforge changed before its bulk and usage could be preserved';
  end if;
end
$preserve$;
