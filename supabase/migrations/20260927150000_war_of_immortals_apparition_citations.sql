do $repair$
declare
  citations constant jsonb := $citations$
  [
    {"table":"ability_block","id":39036,"name":"Crafter in the Vault - Primary","type":"mode","opening":"Crafters in the vault are found in dungeons","cite":{"url":"https://2e.aonprd.com/Apparitions.aspx?ID=3","book":"War of Immortals","page":"17"}},
    {"table":"ability_block","id":39037,"name":"Custodian of Groves and Gardens - Primary","type":"mode","opening":"Custodians of groves and gardens frequent tended greenery","cite":{"url":"https://2e.aonprd.com/Apparitions.aspx?ID=4","book":"War of Immortals","page":"18"}},
    {"table":"ability_block","id":39038,"name":"Echo of Lost Moments - Primary","type":"mode","opening":"Echoes of lost moments are apparitions born from memories","cite":{"url":"https://2e.aonprd.com/Apparitions.aspx?ID=5","book":"War of Immortals","page":"18"}},
    {"table":"ability_block","id":39039,"name":"Impostor in Hidden Places - Primary","type":"mode","opening":"Impostors in hidden places whisper in quiet corners","cite":{"url":"https://2e.aonprd.com/Apparitions.aspx?ID=6","book":"War of Immortals","page":"18"}},
    {"table":"ability_block","id":39040,"name":"Lurker in Devouring Dark - Primary","type":"mode","opening":"Lurkers in devouring dark are most often near old shipwrecks","cite":{"url":"https://2e.aonprd.com/Apparitions.aspx?ID=7","book":"War of Immortals","page":"19"}},
    {"table":"ability_block","id":39041,"name":"Monarch of the Fey Courts - Primary","type":"mode","opening":"Monarchs of the fey courts make their homes","cite":{"url":"https://2e.aonprd.com/Apparitions.aspx?ID=8","book":"War of Immortals","page":"19"}},
    {"table":"ability_block","id":39042,"name":"Reveler in Lost Glee - Primary","type":"mode","opening":"Revelers in lost glee are twisted apparitions","cite":{"url":"https://2e.aonprd.com/Apparitions.aspx?ID=9","book":"War of Immortals","page":"19"}},
    {"table":"ability_block","id":39043,"name":"Stalker in Darkened Boughs - Primary","type":"mode","opening":"Stalkers in darkened boughs make their homes","cite":{"url":"https://2e.aonprd.com/Apparitions.aspx?ID=10","book":"War of Immortals","page":"20"}},
    {"table":"ability_block","id":39044,"name":"Steward of Stone and Fire - Primary","type":"mode","opening":"Stewards of stone and fire linger near volcanoes","cite":{"url":"https://2e.aonprd.com/Apparitions.aspx?ID=11","book":"War of Immortals","page":"20"}},
    {"table":"ability_block","id":39045,"name":"Vanguard of Roaring Waters - Primary","type":"mode","opening":"Vanguards of roaring waters are found where rivers carve","cite":{"url":"https://2e.aonprd.com/Apparitions.aspx?ID=12","book":"War of Immortals","page":"21"}},
    {"table":"ability_block","id":39046,"name":"Witness to Ancient Battles - Primary","type":"mode","opening":"Witnesses to ancient battles may be the lingering remnants","cite":{"url":"https://2e.aonprd.com/Apparitions.aspx?ID=13","book":"War of Immortals","page":"21"}},
    {"table":"trait","id":4092,"name":"Animist Apparition","opening":"Apparitions are spiritual entities who generally lack the power","cite":{"url":"https://2e.aonprd.com/Traits.aspx?ID=837","book":"War of Immortals","page":"216"}}
  ]
  $citations$::jsonb;
  citation jsonb;
  current_name text;
  current_type text;
  current_source bigint;
  current_description text;
  current_metadata jsonb;
  existing jsonb;
  pending_type text;
begin
  for citation in select value from jsonb_array_elements(citations) loop
    if citation->>'table' = 'ability_block' then
      select name, type, content_source_id, description, meta_data
        into current_name, current_type, current_source, current_description, current_metadata
        from public.ability_block where id = (citation->>'id')::bigint for update;
      pending_type := 'ability-block';
    elsif citation->>'table' = 'trait' then
      select name, null::text, content_source_id, description, meta_data
        into current_name, current_type, current_source, current_description, current_metadata
        from public.trait where id = (citation->>'id')::bigint for update;
      pending_type := 'trait';
    else
      raise exception 'Unexpected War citation table: %', citation->>'table';
    end if;

    if current_name is distinct from citation->>'name'
      or current_type is distinct from citation->>'type'
      or current_source is distinct from 400
      or left(current_description, length(citation->>'opening')) is distinct from citation->>'opening' then
      raise exception 'Missing or changed War apparition entry: %', citation->>'name';
    end if;

    existing := current_metadata->'source';
    if existing = citation->'cite' then
      continue;
    end if;
    if existing is not null and existing <> 'null'::jsonb then
      raise exception 'Changed source citation; review before repair: %', citation->>'name';
    end if;
    if exists (select 1 from public.content_update
      where type = pending_type and ref_id = (citation->>'id')::bigint and status->>'state' = 'PENDING') then
      raise exception 'Entry has a pending curator submission: %', citation->>'name';
    end if;

    if citation->>'table' = 'ability_block' then
      update public.ability_block
        set meta_data = jsonb_set(coalesce(meta_data, '{}'::jsonb), '{source}', citation->'cite', true)
        where id = (citation->>'id')::bigint;
    else
      update public.trait
        set meta_data = jsonb_set(coalesce(meta_data, '{}'::jsonb), '{source}', citation->'cite', true)
        where id = (citation->>'id')::bigint;
    end if;
  end loop;
end
$repair$;
