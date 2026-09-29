do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"id":16924,"name":"Armor Potency (Mythic)","activation":"Survive Devastation","url":"https://2e.aonprd.com/Equipment.aspx?ID=3498"},
    {"id":16925,"name":"Resilient (Mythic)","activation":"Defy Obliteration","url":"https://2e.aonprd.com/Equipment.aspx?ID=3499"},
    {"id":16926,"name":"Striking (Mythic)","activation":"Unstoppable Devastation","url":"https://2e.aonprd.com/Equipment.aspx?ID=3500"},
    {"id":16927,"name":"Weapon Potency (Mythic)","activation":"Unerring Blow","url":"https://2e.aonprd.com/Equipment.aspx?ID=3501"}
  ]
  $patches$::jsonb;
  patch jsonb;
  item_row public.item%rowtype;
  old_fragment text;
  new_fragment text;
begin
  for patch in select value from jsonb_array_elements(patches) loop
    select * into item_row from public.item where id = (patch->>'id')::bigint for update;
    if not found or item_row.name is distinct from patch->>'name'
       or item_row.content_source_id is distinct from 400
       or item_row.meta_data #>> '{source,url}' is distinct from patch->>'url' then
      raise exception 'Missing or changed War of Immortals rune: %', patch->>'name';
    end if;

    old_fragment := format('**Activate—%s** <abbr cost="REACTION" class="action-symbol">5</abbr> ([concentration](link_trait_1432))', patch->>'activation');
    new_fragment := format('**Activate—%s** <abbr cost="REACTION" class="action-symbol">5</abbr> ([concentrate](link_trait_1432))', patch->>'activation');
    if position(new_fragment in item_row.description) > 0
       and position(old_fragment in item_row.description) = 0 then
      continue;
    end if;
    if position(old_fragment in item_row.description) = 0
       or position(new_fragment in item_row.description) > 0
       or length(item_row.description) - length(replace(item_row.description, old_fragment, '')) <> length(old_fragment) then
      raise exception 'Changed rune activation: %', patch->>'name';
    end if;
    if exists (select 1 from public.content_update
      where type = 'item' and ref_id = item_row.id and status->>'state' = 'PENDING') then
      raise exception 'Rune has a pending curator submission: %', patch->>'name';
    end if;

    update public.item
       set description = replace(item_row.description, old_fragment, new_fragment)
     where id = item_row.id and description = item_row.description;
    if not found then
      raise exception 'Rune changed during repair: %', patch->>'name';
    end if;
  end loop;
end
$repair$;
