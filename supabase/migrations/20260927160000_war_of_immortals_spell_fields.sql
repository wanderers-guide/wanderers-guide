do $repair$
declare
  cast_patches constant jsonb := $casts$
  [
    {"id":7314,"name":"City of Sin","cast":"7 days","remove":"Cast 7 days; ","opening":"Secondary Casters 2","cite":{"url":"https://2e.aonprd.com/MythicRituals.aspx?ID=190","book":"War of Immortals","page":"159"}},
    {"id":7316,"name":"Curse of Calamity","cast":"3 days","remove":"**Cast** 3 days; ","opening":"**Secondary Casters** 3","cite":{"url":"https://2e.aonprd.com/MythicRituals.aspx?ID=192","book":"War of Immortals","page":"160"}}
  ]
  $casts$::jsonb;
  patch jsonb;
  current_name text;
  current_source bigint;
  current_cast text;
  current_rank integer;
  current_traits bigint[];
  current_description text;
  current_metadata jsonb;
  old_link constant text := '[plant](link_trait_2445)';
  new_link constant text := '[plant](link_trait_1654)';
  old_count integer;
  new_count integer;
begin
  for patch in select value from jsonb_array_elements(cast_patches) loop
    select name, content_source_id, "cast", description, meta_data
      into current_name, current_source, current_cast, current_description, current_metadata
      from public.spell where id = (patch->>'id')::bigint for update;

    if current_name is distinct from patch->>'name'
      or current_source is distinct from 400
      or current_metadata->'source' is distinct from patch->'cite' then
      raise exception 'Missing or changed War ritual: %', patch->>'name';
    end if;
    if current_cast = patch->>'cast' then
      if left(current_description, length(patch->>'opening')) is distinct from patch->>'opening' then
        raise exception 'Partially changed War ritual: %', patch->>'name';
      end if;
      continue;
    end if;
    if current_cast is not null
      or left(current_description, length(patch->>'remove') + length(patch->>'opening'))
        is distinct from (patch->>'remove') || (patch->>'opening') then
      raise exception 'Changed War ritual cast line: %', patch->>'name';
    end if;
    if exists (select 1 from public.content_update
      where type = 'spell' and ref_id = (patch->>'id')::bigint and status->>'state' = 'PENDING') then
      raise exception 'Ritual has a pending curator submission: %', patch->>'name';
    end if;

    update public.spell
      set "cast" = patch->>'cast',
          description = substr(description, length(patch->>'remove') + 1)
      where id = (patch->>'id')::bigint and "cast" is null and description = current_description;
  end loop;

  select name, content_source_id, description, meta_data
    into current_name, current_source, current_description, current_metadata
    from public.spell where id = 7323 for update;
  if current_name is distinct from 'Wild Feast'
    or current_source is distinct from 400
    or current_metadata->'source' is distinct from '{"url":"https://2e.aonprd.com/MythicRituals.aspx?ID=199","book":"War of Immortals","page":"163"}'::jsonb then
    raise exception 'Missing or changed War ritual: Wild Feast';
  end if;

  old_count := (length(current_description) - length(replace(current_description, old_link, ''))) / length(old_link);
  new_count := (length(current_description) - length(replace(current_description, new_link, ''))) / length(new_link);
  if old_count = 0 and new_count = 3 then
    null;
  elsif old_count is distinct from 3 or new_count is distinct from 0 then
    raise exception 'Changed Wild Feast plant links; review before repair';
  else
    if exists (select 1 from public.content_update
      where type = 'spell' and ref_id = 7323 and status->>'state' = 'PENDING') then
      raise exception 'Ritual has a pending curator submission: Wild Feast';
    end if;

    update public.spell set description = replace(description, old_link, new_link)
      where id = 7323 and description = current_description;
  end if;

  select name, content_source_id, rank, traits, meta_data
    into current_name, current_source, current_rank, current_traits, current_metadata
    from public.spell where id = 7267 for update;
  if current_name is distinct from 'Manifest Will'
    or current_source is distinct from 400
    or current_rank is distinct from 0
    or current_metadata->'source' is distinct from '{"url":"https://2e.aonprd.com/Spells.aspx?ID=2147","book":"War of Immortals","page":"63"}'::jsonb then
    raise exception 'Missing or changed War spell: Manifest Will';
  end if;
  if current_traits is distinct from array[1492,1432,1898,1347,1858,1899]::bigint[] then
    if current_traits is distinct from array[1492,1432,1898,1347,1858]::bigint[] then
      raise exception 'Changed Manifest Will traits; review before repair';
    end if;
    if exists (select 1 from public.content_update
      where type = 'spell' and ref_id = 7267 and status->>'state' = 'PENDING') then
      raise exception 'Spell has a pending curator submission: Manifest Will';
    end if;

    update public.spell set traits = array_append(traits, 1899::bigint)
      where id = 7267 and traits = array[1492,1432,1898,1347,1858]::bigint[];
  end if;
end
$repair$;
