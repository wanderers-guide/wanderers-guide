do $repair$
declare
  item_row public.item%rowtype;
  changed_rows integer;
begin
  lock table public.content_update in share mode;
  perform id from public.content_source where id = 16
    and user_id is null and is_published is true for update;
  if not found then raise exception 'Missing official Treasure Vault source'; end if;

  select * into item_row from public.item where id = 12183 for update;
  if not found or item_row.name is distinct from 'Lyrakien Staff'
    or item_row.uuid is distinct from 2395682957455828
    or item_row.content_source_id is distinct from 16
    or item_row.level is distinct from 6
    or item_row.meta_data->'source' is distinct from
      '{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4789","book":"Treasure Vault","page":"133"}'::jsonb
    or (item_row.price::jsonb = '{"gp":255}'::jsonb
      or item_row.price::jsonb = '{"gp":225}'::jsonb) is not true then
    raise exception 'Lyrakien Staff differs from reviewed entry';
  end if;
  if exists (select 1 from public.content_update where type = 'item'
    and ref_id = 12183 and status->>'state' = 'PENDING') then
    raise exception 'Lyrakien Staff has a pending curator submission';
  end if;

  if item_row.price::jsonb = '{"gp":255}'::jsonb then
    update public.item set price = '{"gp":225}'::json
      where id = 12183 and price::jsonb = '{"gp":255}'::jsonb;
    get diagnostics changed_rows = row_count;
    if changed_rows <> 1 then raise exception 'Lyrakien Staff price changed during repair'; end if;
  end if;
end
$repair$;
