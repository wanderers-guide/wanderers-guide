do $repair$
declare
  trained_operations constant jsonb := $trained_operations$
  [
    {"id":"d04ea2eb-8ffb-47a5-9c83-dd34330f4d58","type":"adjValue","data":{"variable":"SPELL_ATTACK","value":{"value":"T"}}},
    {"id":"5008a158-6c99-4196-a10d-03fa1643bcd4","type":"adjValue","data":{"variable":"SPELL_DC","value":{"value":"T"}}}
  ]
  $trained_operations$::jsonb;
  expert_operations constant jsonb := $expert_operations$
  [
    {"operation_id":"e932fbaf-4586-48a1-b8e0-bffe3b7edf42","variable":"SPELL_ATTACK"},
    {"operation_id":"d854f638-0671-405a-9106-54567e5f49e7","variable":"SPELL_DC"}
  ]
  $expert_operations$::jsonb;
  master_slots constant jsonb := $master_slots$
  [
    {"lvl":18,"rank":7,"amt":2},
    {"lvl":19,"rank":7,"amt":2},
    {"lvl":20,"rank":7,"amt":2},
    {"lvl":20,"rank":8,"amt":2}
  ]
  $master_slots$::jsonb;
  feature public.ability_block%rowtype;
  operation jsonb;
  operation_index integer;
  suffix jsonb;
  slots jsonb;
  slot jsonb;
  patch jsonb;
  matches integer;
  changed boolean;
begin
  select * into feature from public.ability_block where id = 38522 for update;
  if not found or feature.name is distinct from 'Bloodrager Dedication'
     or feature.type is distinct from 'feat' or feature.level is distinct from 2
     or feature.content_source_id is distinct from 400
     or feature.uuid is distinct from 8861568153829664 then
    raise exception 'Missing or changed Bloodrager Dedication';
  end if;
  if exists (select 1 from public.content_update
    where type = 'ability-block' and ref_id = feature.id and status->>'state' = 'PENDING') then
    raise exception 'Bloodrager Dedication has a pending curator submission';
  end if;
  if feature.operations[1]->>'id' is distinct from '95b015f2-e0f0-4d5b-ac1e-43539f7cae60'
     or feature.operations[1]->>'type' is distinct from 'select'
     or feature.operations[1] #>> '{data,optionsPredefined,0,operations,0,data,value}'
       is distinct from 'BLOODRAGER:::SPONTANEOUS-REPERTOIRE:::ARCANE:::ATTRIBUTE_CHA'
     or feature.operations[1] #>> '{data,optionsPredefined,1,operations,0,data,value}'
       is distinct from 'BLOODRAGER:::SPONTANEOUS-REPERTOIRE:::DIVINE:::ATTRIBUTE_CHA'
     or feature.operations[2]::jsonb is distinct from
       '{"id":"0ac80629-0f43-4493-8c00-300f92bf48aa","type":"giveAbilityBlock","data":{"type":"feat","abilityBlockId":38523}}'::jsonb then
    raise exception 'Changed Bloodrager Dedication choices or Harvest Blood grant';
  end if;
  select coalesce(jsonb_agg(entry::jsonb order by ordinal), '[]'::jsonb) into suffix
    from unnest(feature.operations) with ordinality as entries(entry, ordinal) where ordinal > 2;
  if cardinality(feature.operations) = 4 and suffix = trained_operations then
    null;
  elsif cardinality(feature.operations) = 2 and not exists (
    select 1 from unnest(feature.operations) existing, jsonb_array_elements(trained_operations) added
     where existing->>'id' = added->>'id'
  ) then
    update public.ability_block set operations = feature.operations || array(
      select value::json from jsonb_array_elements(trained_operations) with ordinality as additions(value, ordinal)
       order by ordinal
    ) where id = feature.id;
  else
    raise exception 'Changed Bloodrager Dedication proficiency operations';
  end if;

  select * into feature from public.ability_block where id = 39154 for update;
  if not found or feature.name is distinct from 'Surging Blood Magic'
     or feature.type is distinct from 'feat' or feature.level is distinct from 12
     or feature.content_source_id is distinct from 400
     or feature.uuid is distinct from 2396101506630193
     or cardinality(feature.operations) is distinct from 3 then
    raise exception 'Missing or changed Surging Blood Magic';
  end if;
  if exists (select 1 from public.content_update
    where type = 'ability-block' and ref_id = feature.id and status->>'state' = 'PENDING') then
    raise exception 'Surging Blood Magic has a pending curator submission';
  end if;
  changed := false;
  for patch in select value from jsonb_array_elements(expert_operations) loop
    select count(*) into matches from unnest(feature.operations) entry
     where entry->>'id' = patch->>'operation_id';
    if matches <> 1 then raise exception 'Missing or duplicate Bloodrager expert operation'; end if;
    select entry::jsonb, ordinal::integer into operation, operation_index
      from unnest(feature.operations) with ordinality as entries(entry, ordinal)
     where entry->>'id' = patch->>'operation_id';
    if operation->>'type' is distinct from 'adjValue'
       or operation #>> '{data,variable}' is distinct from patch->>'variable'
       or operation #> '{data,value,increases}' is distinct from '0'::jsonb then
      raise exception 'Changed Bloodrager expert operation';
    end if;
    if operation #>> '{data,value,value}' = 'E' then continue; end if;
    if operation #>> '{data,value,value}' is distinct from 'U' then
      raise exception 'Changed Bloodrager expert proficiency';
    end if;
    feature.operations[operation_index] := jsonb_set(operation, '{data,value,value}', '"E"'::jsonb, false)::json;
    changed := true;
  end loop;
  if changed then
    update public.ability_block set operations = feature.operations where id = feature.id;
  end if;

  select * into feature from public.ability_block where id = 39155 for update;
  if not found or feature.name is distinct from 'Exultant Blood Magic'
     or feature.type is distinct from 'feat' or feature.level is distinct from 18
     or feature.content_source_id is distinct from 400
     or feature.uuid is distinct from 2486425192952
     or cardinality(feature.operations) is distinct from 3 then
    raise exception 'Missing or changed Exultant Blood Magic';
  end if;
  if exists (select 1 from public.content_update
    where type = 'ability-block' and ref_id = feature.id and status->>'state' = 'PENDING') then
    raise exception 'Exultant Blood Magic has a pending curator submission';
  end if;
  select count(*) into matches from unnest(feature.operations) entry
   where entry->>'id' = 'bdbdc81a-12a5-4b55-9d14-6090e674e69c';
  if matches <> 1 then raise exception 'Missing or duplicate Bloodrager master slot operation'; end if;
  select entry::jsonb, ordinal::integer into operation, operation_index
    from unnest(feature.operations) with ordinality as entries(entry, ordinal)
   where entry->>'id' = 'bdbdc81a-12a5-4b55-9d14-6090e674e69c';
  if operation->>'type' is distinct from 'giveSpellSlot'
     or operation #>> '{data,castingSource}' is distinct from 'BLOODRAGER'
     or jsonb_typeof(operation #> '{data,slots}') is distinct from 'array' then
    raise exception 'Changed Bloodrager master slot operation';
  end if;
  slots := operation #> '{data,slots}';
  changed := false;
  for patch in select value from jsonb_array_elements(master_slots) loop
    select count(*) into matches from jsonb_array_elements(slots) entry
     where entry->>'lvl' = patch->>'lvl' and entry->>'rank' = patch->>'rank';
    if matches > 1 then raise exception 'Duplicate Bloodrager master slot'; end if;
    if matches = 1 then
      select value into slot from jsonb_array_elements(slots)
       where value->>'lvl' = patch->>'lvl' and value->>'rank' = patch->>'rank';
      if slot is distinct from patch then raise exception 'Changed Bloodrager master slot'; end if;
    else
      slots := slots || jsonb_build_array(patch);
      changed := true;
    end if;
  end loop;
  if changed then
    update public.ability_block
       set operations[operation_index] = jsonb_set(operation, '{data,slots}', slots, false)::json
     where id = feature.id;
  end if;
end
$repair$;
