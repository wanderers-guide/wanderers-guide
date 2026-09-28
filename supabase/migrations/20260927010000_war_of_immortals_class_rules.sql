do $repair$
declare
  original json[];
  operation jsonb;
  operation_index integer;
  slots jsonb;
  slot jsonb;
  patch jsonb;
  slot_count integer;
  changed boolean := false;
  slot_patches constant jsonb := $slot_patches$
  [
    {"lvl":13,"rank":7,"after":1},
    {"lvl":14,"rank":7,"before":1,"after":2},
    {"lvl":15,"rank":8,"after":1},
    {"lvl":16,"rank":8,"before":1,"after":2},
    {"lvl":17,"rank":9,"after":1},
    {"lvl":18,"rank":9,"before":1,"after":2}
  ]
  $slot_patches$::jsonb;
begin
  select operations into original from public.ability_block
   where id = 51667 and name = 'Bloodrager Instinct' and content_source_id = 400 for update;
  if not found then raise exception 'Missing or changed Bloodrager Instinct'; end if;
  select entry::jsonb, ordinal::integer into operation, operation_index
    from unnest(original) with ordinality as entries(entry, ordinal)
   where entry->>'id' = '81b9d86d-939f-4ca1-a5b8-fa75a7d8a4a2';
  if not found or operation->>'type' <> 'conditional'
     or operation #>> '{data,conditions,1,name}' <> 'WEAPON_SPECIALIZATION_GREATER' then
    raise exception 'Changed Bloodrager damage condition';
  end if;
  if operation #>> '{data,conditions,1,value}' = 'TRUE' then
    null;
  elsif operation #>> '{data,conditions,1,value}' = '' then
    if exists (select 1 from public.content_update where type = 'ability-block' and ref_id = 51667 and status->>'state' = 'PENDING') then
      raise exception 'Bloodrager Instinct has a pending curator submission';
    end if;
    update public.ability_block
       set operations[operation_index] = jsonb_set(operation, '{data,conditions,1,value}', '"TRUE"'::jsonb, false)::json
     where id = 51667;
  else
    raise exception 'Changed Bloodrager damage condition value';
  end if;

  select operations into original from public.ability_block
   where id = 38637 and name = 'Animist & Apparition Spellcasting' and content_source_id = 400 for update;
  if not found then raise exception 'Missing or changed Animist spellcasting feature'; end if;
  select entry::jsonb, ordinal::integer into operation, operation_index
    from unnest(original) with ordinality as entries(entry, ordinal)
   where entry->>'id' = '8411d1a2-a480-468e-a45c-d8f6fa10a0d2';
  if not found or operation->>'type' <> 'giveSpellSlot'
     or operation #>> '{data,castingSource}' <> 'ANIMIST' then
    raise exception 'Changed Animist prepared slot operation';
  end if;
  slots := operation #> '{data,slots}';
  for patch in select value from jsonb_array_elements(slot_patches) loop
    select count(*) into slot_count
      from jsonb_array_elements(slots) as entries(value)
     where value->>'lvl' = patch->>'lvl' and value->>'rank' = patch->>'rank';
    select value into slot from jsonb_array_elements(slots) as entries(value)
     where value->>'lvl' = patch->>'lvl' and value->>'rank' = patch->>'rank' limit 1;
    if slot_count > 1 then
      raise exception 'Duplicate Animist slot at level %, rank %', patch->>'lvl', patch->>'rank';
    end if;
    if slot_count = 1 and slot->>'amt' = patch->>'after' then
      continue;
    end if;
    if (slot_count = 0 and patch ? 'before')
       or (slot_count = 1 and (not patch ? 'before' or slot->>'amt' is distinct from patch->>'before')) then
      raise exception 'Changed Animist slot at level %, rank %', patch->>'lvl', patch->>'rank';
    end if;
    if slot_count = 0 then
      slots := slots || jsonb_build_array(jsonb_build_object(
        'lvl', (patch->>'lvl')::integer, 'rank', (patch->>'rank')::integer, 'amt', (patch->>'after')::integer));
    else
      select jsonb_agg(
        case when value->>'lvl' = patch->>'lvl' and value->>'rank' = patch->>'rank'
          then jsonb_set(value, '{amt}', patch->'after', false) else value end order by ordinal)
        into slots from jsonb_array_elements(slots) with ordinality as entries(value, ordinal);
    end if;
    changed := true;
  end loop;
  if changed then
    if exists (select 1 from public.content_update where type = 'ability-block' and ref_id = 38637 and status->>'state' = 'PENDING') then
      raise exception 'Animist spellcasting has a pending curator submission';
    end if;
    update public.ability_block
       set operations[operation_index] = jsonb_set(operation, '{data,slots}', slots, false)::json
     where id = 38637;
  end if;

  select operations into original from public.ability_block
   where id = 38709 and name = 'Echo of Lost Moments' and content_source_id = 400 for update;
  if not found then raise exception 'Missing or changed Echo of Lost Moments'; end if;
  select entry::jsonb, ordinal::integer into operation, operation_index
    from unnest(original) with ordinality as entries(entry, ordinal)
   where entry->>'id' = '2cc5d640-ccd6-4532-a42c-eb00b0de6cb6';
  if not found or operation->>'type' <> 'conditional'
     or operation #>> '{data,trueOperations,0,id}' <> 'e57b1671-6485-4b1a-9d15-bc9eaa8d953f'
     or operation #>> '{data,trueOperations,0,type}' <> 'giveSpell' then
    raise exception 'Changed Echo of Lost Moments spell grant';
  end if;
  if operation #>> '{data,trueOperations,0,data,spellId}' = '4679'
     and operation #>> '{data,trueOperations,0,data,rank}' = '5' then
    null;
  elsif operation #>> '{data,trueOperations,0,data,spellId}' = '4677'
     and operation #>> '{data,trueOperations,0,data,rank}' = '1' then
    if not exists (select 1 from public.spell where id = 4679 and name = 'Illusory Scene' and rank = 5) then
      raise exception 'Illusory Scene spell target has changed';
    end if;
    if exists (select 1 from public.content_update where type = 'ability-block' and ref_id = 38709 and status->>'state' = 'PENDING') then
      raise exception 'Echo of Lost Moments has a pending curator submission';
    end if;
    operation := jsonb_set(operation, '{data,trueOperations,0,data,spellId}', '4679'::jsonb, false);
    operation := jsonb_set(operation, '{data,trueOperations,0,data,rank}', '5'::jsonb, false);
    update public.ability_block set operations[operation_index] = operation::json where id = 38709;
  else
    raise exception 'Changed Echo of Lost Moments spell grant data';
  end if;
end
$repair$;
