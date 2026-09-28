do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"id":38638,"name":"Root Epithet","field":"operations","before":"[reload](link_trait_3130)","after":"reload","count":2},
    {"id":38762,"name":"Wind Seeker","field":"operations","before":"link_feat_28015","after":"link_feat_38714","count":1},
    {"id":38773,"name":"Monstrous Inclinations","field":"operations","before":"link_feat_28015","after":"link_feat_38714","count":1},
    {"id":51428,"name":"One Among The Masses","field":"description","before":"link_action_51429","after":"link_feat_51429","count":1},
    {"id":51443,"name":"Manipulate Realm","field":"description","before":"link_action_51444","after":"link_feat_51444","count":1},
    {"id":51443,"name":"Manipulate Realm","field":"description","before":"link_action_51445","after":"link_feat_51445","count":1},
    {"id":51443,"name":"Manipulate Realm","field":"description","before":"link_action_51446","after":"link_feat_51446","count":1}
  ]
  $patches$::jsonb;
  patch jsonb;
  original text;
  occurrences integer;
  operations_before json[];
  operations_after json[];
begin
  for patch in select value from jsonb_array_elements(patches) loop
    if patch->>'field' = 'operations' then
      select operations into operations_before from public.ability_block
       where id = (patch->>'id')::bigint and name = patch->>'name' and content_source_id = 400 for update;
      if not found then raise exception 'Missing or changed War of Immortals entry: %', patch->>'name'; end if;
      select string_agg(entry::text, '') into original from unnest(operations_before) as entries(entry);
    elsif patch->>'field' = 'description' then
      select description into original from public.ability_block
       where id = (patch->>'id')::bigint and name = patch->>'name' and content_source_id = 400 for update;
      if not found then raise exception 'Missing or changed War of Immortals entry: %', patch->>'name'; end if;
    else
      raise exception 'Unexpected content link field: %', patch->>'field';
    end if;
    if position(patch->>'before' in original) = 0 then
      if position(patch->>'after' in original) > 0 then continue; end if;
      raise exception 'Changed content link: %', patch->>'name';
    end if;
    occurrences := (length(original) - length(replace(original, patch->>'before', ''))) / length(patch->>'before');
    if occurrences <> (patch->>'count')::integer then
      raise exception 'Unexpected content link count for %: %', patch->>'name', occurrences;
    end if;
    if exists (select 1 from public.content_update
      where type = 'ability-block' and ref_id = (patch->>'id')::bigint and status->>'state' = 'PENDING') then
      raise exception 'Entry has a pending curator submission: %', patch->>'name';
    end if;
    if patch->>'field' = 'operations' then
      select array_agg(replace(entry::text, patch->>'before', patch->>'after')::json order by ordinal)
        into operations_after from unnest(operations_before) with ordinality as entries(entry, ordinal);
      update public.ability_block set operations = operations_after where id = (patch->>'id')::bigint;
    else
      update public.ability_block
         set description = replace(description, patch->>'before', patch->>'after')
       where id = (patch->>'id')::bigint;
    end if;
  end loop;
end
$repair$;
