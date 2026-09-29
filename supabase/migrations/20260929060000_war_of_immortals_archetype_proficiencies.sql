do $repair$
declare
  additions constant jsonb := $additions$
  [
    {
      "id": 39021,
      "name": "Animist Dedication",
      "before_count": 4,
      "append": [
        {"id":"06815cbe-d9e0-4cad-ae94-c44dc6f7623e","type":"adjValue","data":{"variable":"SPELL_ATTACK","value":{"value":"T"}}},
        {"id":"202d6a68-5900-4f7a-8e21-090947f634a4","type":"adjValue","data":{"variable":"SPELL_DC","value":{"value":"T"}}}
      ]
    },
    {
      "id": 39022,
      "name": "Exemplar Dedication",
      "before_count": 4,
      "append": [
        {"id":"d411e382-85fb-491d-9c2a-76cd68f17b3a","type":"adjValue","data":{"variable":"MARTIAL_WEAPONS","value":{"value":"T"}}}
      ]
    },
    {
      "id": 39206,
      "name": "Exemplar Expertise",
      "before_count": 0,
      "append": [
        {"id":"09844148-da84-45f6-9e96-6777501ebc53","type":"conditional","data":{"conditions":[
          {"id":"167ab1f1-2eb3-498c-a7e6-938bed3b337e","name":"FEAT_NAMES","data":{"name":"FEAT_NAMES","type":"list-str","value":[]},"type":"list-str","operator":"INCLUDES","value":"exemplar resiliency"},
          {"id":"eb193a01-30ef-4668-8410-edcfb9e4cfe7","name":"MAX_HEALTH_CLASS_PER_LEVEL","data":{"name":"MAX_HEALTH_CLASS_PER_LEVEL","type":"num","value":0},"type":"num","operator":"LESS_THAN_OR_EQUALS","value":8}
        ],"trueOperations":[
          {"id":"7b5bdc6e-4399-47fa-9711-08e2eab789a7","type":"addBonusToValue","data":{"variable":"MAX_HEALTH_BONUS","value":"3","text":""}}
        ],"falseOperations":[]}}
      ]
    }
  ]
  $additions$::jsonb;
  rank_updates constant jsonb := $rank_updates$
  [
    {"operation_id":"d90cc16a-9da0-4d1e-94c9-62ba6b9735f6","variable":"SPELL_ATTACK","before":"U","after":"M"},
    {"operation_id":"c7ecb9c2-394c-4e12-b736-ac59f680de0b","variable":"SPELL_DC","before":"U","after":"M"}
  ]
  $rank_updates$::jsonb;
  patch jsonb;
  feature public.ability_block%rowtype;
  suffix jsonb;
  before_count integer;
  append_count integer;
  operation jsonb;
  operation_index integer;
  operation_count integer;
  changed boolean := false;
begin
  for patch in select value from jsonb_array_elements(additions) loop
    select * into feature from public.ability_block
     where id = (patch->>'id')::bigint for update;
    if not found or feature.name is distinct from patch->>'name'
       or feature.type is distinct from 'feat' or feature.content_source_id is distinct from 400 then
      raise exception 'Missing or changed War of Immortals archetype feat: %', patch->>'name';
    end if;
    before_count := (patch->>'before_count')::integer;
    append_count := jsonb_array_length(patch->'append');
    if feature.id = 39021 and not exists (
      select 1 from unnest(feature.operations) op
       where op->>'id' = 'a516bbc7-cf26-4faa-8e3b-63e50ba22e5c'
         and op->>'type' = 'defineCastingSource'
         and op #>> '{data,value}' = 'ANIMIST:::PREPARED-TRADITION:::DIVINE:::ATTRIBUTE_WIS'
    ) then
      raise exception 'Changed Animist Dedication casting source';
    end if;
    if feature.id = 39022 and not exists (
      select 1 from unnest(feature.operations) op
       where op->>'id' = 'f31b797c-8c52-4848-bed0-0e658c4507ee'
         and op->>'type' = 'select'
         and op #>> '{data,optionsFilters,abilityBlockType}' = 'feat'
    ) then
      raise exception 'Changed Exemplar Dedication ikon selection';
    end if;

    select coalesce(jsonb_agg(entry::jsonb order by ordinal), '[]'::jsonb)
      into suffix
      from unnest(feature.operations) with ordinality as entries(entry, ordinal)
     where ordinal > before_count;
    if cardinality(feature.operations) = before_count + append_count
       and suffix = patch->'append' then
      continue;
    end if;
    if cardinality(feature.operations) is distinct from before_count
       or suffix <> '[]'::jsonb
       or exists (
         select 1 from unnest(feature.operations) existing,
           jsonb_array_elements(patch->'append') added
          where existing->>'id' = added->>'id'
       ) then
      raise exception 'Changed archetype feat operations: %', patch->>'name';
    end if;
    if exists (select 1 from public.content_update
      where type = 'ability-block' and ref_id = feature.id and status->>'state' = 'PENDING') then
      raise exception 'Archetype feat has a pending curator submission: %', patch->>'name';
    end if;
    update public.ability_block
       set operations = feature.operations || array(
         select value::json from jsonb_array_elements(patch->'append') with ordinality as additions(value, ordinal)
          order by ordinal
       )
     where id = feature.id;
  end loop;

  select * into feature from public.ability_block
   where id = 39213 for update;
  if not found or feature.name is distinct from 'Master Animist Spellcasting'
     or feature.type is distinct from 'feat' or feature.content_source_id is distinct from 400
     or cardinality(feature.operations) is distinct from 3 then
    raise exception 'Missing or changed Master Animist Spellcasting';
  end if;
  changed := false;
  for patch in select value from jsonb_array_elements(rank_updates) loop
    select count(*) into operation_count from unnest(feature.operations) entry
     where entry->>'id' = patch->>'operation_id';
    if operation_count <> 1 then
      raise exception 'Missing or duplicate Master Animist rank operation: %', patch->>'variable';
    end if;
    select entry::jsonb, ordinal::integer into operation, operation_index
      from unnest(feature.operations) with ordinality as entries(entry, ordinal)
     where entry->>'id' = patch->>'operation_id';
    if operation->>'type' is distinct from 'adjValue'
       or operation #>> '{data,variable}' is distinct from patch->>'variable'
       or operation #> '{data,value,increases}' is distinct from '0'::jsonb then
      raise exception 'Changed Master Animist rank operation: %', patch->>'variable';
    end if;
    if operation #>> '{data,value,value}' = patch->>'after' then continue; end if;
    if operation #>> '{data,value,value}' is distinct from patch->>'before' then
      raise exception 'Changed Master Animist rank: %', patch->>'variable';
    end if;
    feature.operations[operation_index] := jsonb_set(
      operation, '{data,value,value}', to_jsonb(patch->>'after'), false
    )::json;
    changed := true;
  end loop;
  if changed then
    if exists (select 1 from public.content_update
      where type = 'ability-block' and ref_id = 39213 and status->>'state' = 'PENDING') then
      raise exception 'Master Animist Spellcasting has a pending curator submission';
    end if;
    update public.ability_block set operations = feature.operations where id = 39213;
  end if;
end
$repair$;
