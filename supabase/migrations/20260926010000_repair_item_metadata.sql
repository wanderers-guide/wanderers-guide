-- Correct malformed metadata leaves; preserve item rules, charges and embedded bases.
do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"id":23121,"name":"Conflagration Club","source":842,"path":["charges","max"],"before":"","remove":true},
    {"id":16633,"name":"Caress of the Great Serpent","source":318,"path":["base_item_content","meta_data","base_item_content","group"],"before":"FLAIL","after":"WEAPON"},
    {"id":17953,"name":"Skeletal Claw","source":35,"path":["base_item_content","meta_data","base_item_content","group"],"before":"BRAWLING","after":"WEAPON"}
  ]
  $patches$::jsonb;
  patch jsonb;
  original jsonb;
  leaf_path text[];
begin
  for patch in select value from jsonb_array_elements(patches) loop
    select meta_data::jsonb into original from public.item
     where id = (patch->>'id')::bigint and name = patch->>'name'
       and content_source_id = (patch->>'source')::bigint for update;
    if not found then
      raise exception 'Missing or changed item: %', patch->>'name';
    end if;
    select array_agg(value order by ordinal) into leaf_path
      from jsonb_array_elements_text(patch->'path') with ordinality as path(value, ordinal);
    if (patch->>'remove' = 'true' and original #> leaf_path is null)
       or original #> leaf_path = patch->'after' then
      continue;
    end if;
    if original #> leaf_path is distinct from patch->'before' then
      raise exception 'Changed item metadata; review before repair: %', patch->>'name';
    end if;
    if exists (select 1 from public.content_update
      where type = 'item' and ref_id = (patch->>'id')::bigint and status->>'state' = 'PENDING') then
      raise exception 'Item has a pending curator submission: %', patch->>'name';
    end if;
    update public.item set meta_data = case when patch->>'remove' = 'true'
      then original #- leaf_path else jsonb_set(original, leaf_path, patch->'after', false) end
     where id = (patch->>'id')::bigint;
  end loop;
end
$repair$;
