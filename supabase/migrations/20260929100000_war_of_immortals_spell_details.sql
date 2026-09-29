do $repair$
declare
  current_name text;
  current_source bigint;
  current_metadata jsonb;
  current_area text;
  current_traits bigint[];
  current_cost text;
  current_description text;
  cost_text constant text := 'magic items with a value of at least 2,000 gp';
  cost_prefix constant text := '**Cost** magic items with a value of at least 2,000 gp; ';
begin
  select name, content_source_id, meta_data, area
    into current_name, current_source, current_metadata, current_area
    from public.spell where id = 7288 for update;
  if current_name is distinct from 'Rainbow''s End'
    or current_source is distinct from 400
    or current_metadata #>> '{source,url}' is distinct from 'https://2e.aonprd.com/MythicSpells.aspx?ID=2160' then
    raise exception 'Missing or changed War spell: Rainbow''s End';
  end if;
  if current_area is distinct from '10-foot emanation' then
    if current_area is distinct from '10-foot burst' then
      raise exception 'Changed Rainbow''s End area; review before repair';
    end if;
    if exists (select 1 from public.content_update
      where type = 'spell' and ref_id = 7288 and status->>'state' = 'PENDING') then
      raise exception 'Spell has a pending curator submission: Rainbow''s End';
    end if;
    update public.spell set area = '10-foot emanation'
      where id = 7288 and area = '10-foot burst';
  end if;

  select name, content_source_id, meta_data, traits
    into current_name, current_source, current_metadata, current_traits
    from public.spell where id = 7293 for update;
  if current_name is distinct from 'Trickster''s Feathers'
    or current_source is distinct from 400
    or current_metadata #>> '{source,url}' is distinct from 'https://2e.aonprd.com/MythicSpells.aspx?ID=2165' then
    raise exception 'Missing or changed War spell: Trickster''s Feathers';
  end if;
  if current_traits is distinct from array[1432,1447,1433,4072]::bigint[] then
    if current_traits is distinct from array[1432,1447,1433,4072,1479]::bigint[] then
      raise exception 'Changed Trickster''s Feathers traits; review before repair';
    end if;
    if exists (select 1 from public.content_update
      where type = 'spell' and ref_id = 7293 and status->>'state' = 'PENDING') then
      raise exception 'Spell has a pending curator submission: Trickster''s Feathers';
    end if;
    update public.spell set traits = array[1432,1447,1433,4072]::bigint[]
      where id = 7293 and traits = array[1432,1447,1433,4072,1479]::bigint[];
  end if;

  select name, content_source_id, meta_data, traits
    into current_name, current_source, current_metadata, current_traits
    from public.spell where id = 7311 for update;
  if current_name is distinct from 'Spellsurge'
    or current_source is distinct from 400
    or current_metadata #>> '{source,url}' is distinct from 'https://2e.aonprd.com/MythicSpells.aspx?ID=2150' then
    raise exception 'Missing or changed War spell: Spellsurge';
  end if;
  if current_traits is distinct from array[1439,1432,4072]::bigint[] then
    if current_traits is distinct from array[1432,4072]::bigint[] then
      raise exception 'Changed Spellsurge traits; review before repair';
    end if;
    if exists (select 1 from public.content_update
      where type = 'spell' and ref_id = 7311 and status->>'state' = 'PENDING') then
      raise exception 'Spell has a pending curator submission: Spellsurge';
    end if;
    update public.spell set traits = array[1439,1432,4072]::bigint[]
      where id = 7311 and traits = array[1432,4072]::bigint[];
  end if;

  select name, content_source_id, meta_data, cost, description
    into current_name, current_source, current_metadata, current_cost, current_description
    from public.spell where id = 7313 for update;
  if current_name is distinct from 'Embodied Font'
    or current_source is distinct from 400
    or current_metadata #>> '{source,url}' is distinct from 'https://2e.aonprd.com/Rituals.aspx?ID=187' then
    raise exception 'Missing or changed War ritual: Embodied Font';
  end if;
  if current_cost = cost_text then
    if left(current_description, length('**Primary Check**')) is distinct from '**Primary Check**' then
      raise exception 'Partially changed Embodied Font cost; review before repair';
    end if;
  else
    if current_cost is distinct from ''
      or left(current_description, length(cost_prefix || '**Primary Check**'))
        is distinct from cost_prefix || '**Primary Check**' then
      raise exception 'Changed Embodied Font cost line; review before repair';
    end if;
    if exists (select 1 from public.content_update
      where type = 'spell' and ref_id = 7313 and status->>'state' = 'PENDING') then
      raise exception 'Ritual has a pending curator submission: Embodied Font';
    end if;
    update public.spell
      set cost = cost_text,
          description = substr(description, length(cost_prefix) + 1)
      where id = 7313 and cost = '' and description = current_description;
  end if;
end
$repair$;
