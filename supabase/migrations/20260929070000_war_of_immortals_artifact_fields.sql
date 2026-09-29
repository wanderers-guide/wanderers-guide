do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"id":16929,"name":"Final Scalecloak","url":"https://2e.aonprd.com/Equipment.aspx?ID=3508","field":"bulk","before":"0.1","after":"1"},
    {"id":17101,"name":"Freedom's Flame","url":"https://2e.aonprd.com/Equipment.aspx?ID=3509","field":"bulk","before":"1","after":"0.1"},
    {"id":16930,"name":"Worldforge","url":"https://2e.aonprd.com/Equipment.aspx?ID=3511","field":"bulk","before":"15","after":"1"},
    {"id":16930,"name":"Worldforge","url":"https://2e.aonprd.com/Equipment.aspx?ID=3511","field":"usage","before":"","after":"held in 1 hand"}
  ]
  $patches$::jsonb;
  patch jsonb;
  item_row public.item%rowtype;
  original text;
begin
  for patch in select value from jsonb_array_elements(patches) loop
    if patch->>'field' not in ('bulk', 'usage') then
      raise exception 'Unexpected War of Immortals artifact field: %', patch->>'field';
    end if;
    select * into item_row from public.item where id = (patch->>'id')::bigint for update;
    if not found or item_row.name is distinct from patch->>'name'
       or item_row.content_source_id is distinct from 400
       or item_row.meta_data #>> '{source,url}' is distinct from patch->>'url' then
      raise exception 'Missing or changed War of Immortals artifact: %', patch->>'name';
    end if;
    execute format('select %I from public.item where id = $1', patch->>'field')
      into original using item_row.id;
    if original = patch->>'after' then continue; end if;
    if original is distinct from patch->>'before' then
      raise exception 'Changed War of Immortals artifact field: %.%', patch->>'name', patch->>'field';
    end if;
    if exists (select 1 from public.content_update
      where type = 'item' and ref_id = item_row.id and status->>'state' = 'PENDING') then
      raise exception 'Artifact has a pending curator submission: %', patch->>'name';
    end if;
    execute format('update public.item set %I = $1 where id = $2', patch->>'field')
      using patch->>'after', item_row.id;
  end loop;
end
$repair$;
