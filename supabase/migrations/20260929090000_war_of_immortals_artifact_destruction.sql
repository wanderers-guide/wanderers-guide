do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"id":16928,"name":"Dragon-Lotus Drum","url":"https://2e.aonprd.com/Equipment.aspx?ID=3507","kind":"heading"},
    {"id":16929,"name":"Final Scalecloak","url":"https://2e.aonprd.com/Equipment.aspx?ID=3508","kind":"heading"},
    {"id":16930,"name":"Worldforge","url":"https://2e.aonprd.com/Equipment.aspx?ID=3511","kind":"heading"},
    {"id":17101,"name":"Freedom's Flame","url":"https://2e.aonprd.com/Equipment.aspx?ID=3509","kind":"craft","destruction":"Freedom’s Flame is sliced in two if struck by a final blade that has been anointed with unholy water created by a level 20 unholy creature."},
    {"id":17102,"name":"Shadowpiercer","url":"https://2e.aonprd.com/Equipment.aspx?ID=3510","kind":"craft","destruction":"Shadowpiercer simply disappears if a worshipper of Zon-Kuthon casts a 10th-rank darkness spell on it once a day for an entire month while it is unattended."}
  ]
  $patches$::jsonb;
  old_heading constant text := E'**\n\n* * *\n\nDestruction**';
  new_heading constant text := E'* * *\n\n**Destruction**';
  patch jsonb;
  item_row public.item%rowtype;
  destruction_text text;
  ending text;
begin
  for patch in select value from jsonb_array_elements(patches) loop
    select * into item_row from public.item where id = (patch->>'id')::bigint for update;
    if not found or item_row.name is distinct from patch->>'name'
       or item_row.content_source_id is distinct from 400
       or item_row.meta_data #>> '{source,url}' is distinct from patch->>'url' then
      raise exception 'Missing or changed War of Immortals artifact: %', patch->>'name';
    end if;

    if patch->>'kind' = 'heading' then
      if position(old_heading in item_row.description) = 0
         and position(new_heading in item_row.description) > 0 then
        continue;
      end if;
      if position(old_heading in item_row.description) = 0
         or position(new_heading in item_row.description) > 0
         or length(item_row.description) - length(replace(item_row.description, old_heading, '')) <> length(old_heading)
         or item_row.craft_requirements is distinct from '' then
        raise exception 'Changed Destruction heading: %', patch->>'name';
      end if;
    elsif patch->>'kind' = 'craft' then
      destruction_text := patch->>'destruction';
      ending := E'\n\n' || new_heading || ' ' || destruction_text;
      if item_row.craft_requirements = ''
         and right(item_row.description, length(ending)) = ending then
        continue;
      end if;
      if item_row.craft_requirements is distinct from destruction_text
         or position('**Destruction**' in item_row.description) > 0 then
        raise exception 'Changed Destruction text: %', patch->>'name';
      end if;
    else
      raise exception 'Unexpected artifact repair: %', patch->>'kind';
    end if;

    if exists (select 1 from public.content_update
      where type = 'item' and ref_id = item_row.id and status->>'state' = 'PENDING') then
      raise exception 'Artifact has a pending curator submission: %', patch->>'name';
    end if;

    if patch->>'kind' = 'heading' then
      update public.item
         set description = replace(item_row.description, old_heading, new_heading)
       where id = item_row.id;
    else
      update public.item
         set description = item_row.description || ending,
             craft_requirements = ''
       where id = item_row.id;
    end if;
  end loop;
end
$repair$;
