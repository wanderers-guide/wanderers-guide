do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"id":39152,"name":"Spelldrinker","field":"special","before":"If you have Surging Blood Magic, you can add the spell at 6th rank. If you have Exultant Blood Magic, you can add the spell at 8th rank.","after":"If you have Surging Blood Magic, you can add the spell at 4th rank. If you have Exultant Blood Magic, you can add the spell at 7th rank."},
    {"id":39154,"name":"Surging Blood Magic","field":"prerequisites","before":["Rising Blood Magic","master in Religion or Occultism depending on your chosen tradition"],"after":["Rising Blood Magic","master in Arcana or Religion, depending on your chosen tradition"]},
    {"id":39155,"name":"Exultant Blood Magic","field":"prerequisites","before":["Surging Blood Magic","legendary in Religion or Occultism depending on your chosen tradition"],"after":["Surging Blood Magic","legendary in Arcana or Religion, depending on your chosen tradition"]},
    {"id":39155,"name":"Exultant Blood Magic","field":"description","before":"You become a master in spell attack rolls and DC.","after":"You gain the master spellcasting benefits (Player Core 215).","replace":true},
    {"id":38660,"name":"Vindicator Dedication","field":"prerequisites","before":["Vindication"],"after":["Vindicator"]},
    {"id":38821,"name":"Remake the World","field":"prerequisites","before":["Seize Winds Strike Rivers"],"after":["Strike Rivers, Seize Winds"]},
    {"id":51462,"name":"Army of One","field":"prerequisites","before":["Celestial Armaments"],"after":["Ascended Celestial Dedication"]}
  ]
  $patches$::jsonb;
  patch jsonb;
  current_name text;
  source_id bigint;
  old_text text;
  old_prerequisites text[];
begin
  for patch in select value from jsonb_array_elements(patches) loop
    select name, content_source_id
      into current_name, source_id
      from public.ability_block where id = (patch->>'id')::bigint for update;
    if not found or current_name <> patch->>'name' or source_id <> 400 then
      raise exception 'Missing or changed War of Immortals feat: %', patch->>'name';
    end if;
    if patch->>'field' = 'special' then
      select special into old_text from public.ability_block where id = (patch->>'id')::bigint;
    elsif patch->>'field' = 'description' then
      select description into old_text from public.ability_block where id = (patch->>'id')::bigint;
    elsif patch->>'field' = 'prerequisites' then
      select prerequisites into old_prerequisites from public.ability_block where id = (patch->>'id')::bigint;
    else
      raise exception 'Unexpected errata field: %', patch->>'field';
    end if;
    if patch->>'field' = 'prerequisites' then
      if to_jsonb(old_prerequisites) = patch->'after' then continue; end if;
      if to_jsonb(old_prerequisites) is distinct from patch->'before' then
        raise exception 'Changed prerequisites for %', patch->>'name';
      end if;
    elsif patch->>'replace' = 'true' then
      if position(patch->>'before' in old_text) = 0 then
        if position(patch->>'after' in old_text) > 0 then continue; end if;
        raise exception 'Changed description for %', patch->>'name';
      end if;
      if (length(old_text) - length(replace(old_text, patch->>'before', ''))) / length(patch->>'before') <> 1 then
        raise exception 'Unexpected description occurrence for %', patch->>'name';
      end if;
    else
      if old_text = patch->>'after' then continue; end if;
      if old_text is distinct from patch->>'before' then
        raise exception 'Changed special text for %', patch->>'name';
      end if;
    end if;
    if exists (select 1 from public.content_update
      where type = 'ability-block' and ref_id = (patch->>'id')::bigint and status->>'state' = 'PENDING') then
      raise exception 'Feat has a pending curator submission: %', patch->>'name';
    end if;
    if patch->>'field' = 'prerequisites' then
      update public.ability_block
         set prerequisites = array(select jsonb_array_elements_text(patch->'after'))
       where id = (patch->>'id')::bigint;
    elsif patch->>'field' = 'description' then
      update public.ability_block
         set description = replace(description, patch->>'before', patch->>'after')
       where id = (patch->>'id')::bigint;
    else
      update public.ability_block set special = patch->>'after' where id = (patch->>'id')::bigint;
    end if;
  end loop;
end
$repair$;
