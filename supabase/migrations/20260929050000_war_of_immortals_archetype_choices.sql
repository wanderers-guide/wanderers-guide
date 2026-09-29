do $repair$
declare
  repairs constant jsonb := $choices$
  [
    {
      "id": 39210,
      "name": "Animist's Power",
      "operation_id": "3d3b3a73-14f7-4bf0-8be0-f3bfca8e1c37",
      "filter_id": "9a6e7855-1e59-499e-b807-621801c8ace6",
      "trait": "Animist",
      "excluded_traits": [4076]
    },
    {
      "id": 39205,
      "name": "Advanced Glory",
      "operation_id": "4c94682e-f4c9-43a2-b35e-27f3672261ed",
      "filter_id": "f2b8564b-43c3-40ce-be3e-d06f22d09362",
      "trait": "Exemplar"
    }
  ]
  $choices$::jsonb;
  repair jsonb;
  feat public.ability_block%rowtype;
  operation jsonb;
  operation_index integer;
  matching_operations integer;
  desired jsonb;
begin
  for repair in select value from jsonb_array_elements(repairs) loop
    select * into feat from public.ability_block
     where id = (repair->>'id')::bigint for update;
    if not found or feat.name is distinct from repair->>'name'
       or feat.type is distinct from 'feat' or feat.content_source_id is distinct from 400 then
      raise exception 'Missing or changed War of Immortals archetype feat: %', repair->>'name';
    end if;

    select count(*) into matching_operations from unnest(feat.operations) entry
     where entry->>'id' = repair->>'operation_id';
    if matching_operations <> 1 then
      raise exception 'Missing or duplicate selection operation: %', repair->>'name';
    end if;
    select entry::jsonb, ordinal::integer into operation, operation_index
      from unnest(feat.operations) with ordinality as entries(entry, ordinal)
     where entry->>'id' = repair->>'operation_id';
    if operation->>'type' is distinct from 'select'
       or operation #>> '{data,modeType}' is distinct from 'FILTERED'
       or operation #>> '{data,optionType}' is distinct from 'ABILITY_BLOCK'
       or operation #>> '{data,optionsFilters,id}' is distinct from repair->>'filter_id'
       or operation #>> '{data,optionsFilters,type}' is distinct from 'ABILITY_BLOCK'
       or operation #>> '{data,optionsFilters,abilityBlockType}' is distinct from 'feat'
       or operation #> '{data,optionsFilters,traits}' is distinct from jsonb_build_array(repair->>'trait') then
      raise exception 'Changed archetype feat selection filters: %', repair->>'name';
    end if;
    if operation #> '{data,optionsFilters,level}' is distinct from '{"max":10}'::jsonb
       and operation #> '{data,optionsFilters,level}' is distinct from '{"max":"{{LEVEL/2}}"}'::jsonb then
      raise exception 'Changed archetype feat level filter: %', repair->>'name';
    end if;

    desired := jsonb_set(operation, '{data,optionsFilters,level,max}', '"{{LEVEL/2}}"'::jsonb, false);
    if repair ? 'excluded_traits' then
      desired := jsonb_set(desired, '{data,optionsFilters,excludedTraits}', repair->'excluded_traits', true);
    end if;
    if operation = desired then continue; end if;
    if operation #> '{data,optionsFilters,level}' is distinct from '{"max":10}'::jsonb
       or operation #> '{data,optionsFilters,excludedTraits}' is not null then
      raise exception 'Changed archetype feat level or trait filters: %', repair->>'name';
    end if;
    if exists (select 1 from public.content_update
      where type = 'ability-block' and ref_id = feat.id and status->>'state' = 'PENDING') then
      raise exception 'Archetype feat has a pending curator submission: %', repair->>'name';
    end if;
    update public.ability_block
       set operations[operation_index] = desired::json
     where id = feat.id;
  end loop;
end
$repair$;
