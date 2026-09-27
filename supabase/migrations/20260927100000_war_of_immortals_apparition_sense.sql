do $repair$
declare
  original json[];
  operation jsonb;
begin
  if not exists (select 1 from public.ability_block
    where id = 38723 and name = 'Apparition Sight (imprecise 30 ft)'
      and type = 'sense' and content_source_id = 400) then
    raise exception 'War of Immortals apparition sight is missing or changed';
  end if;

  select operations into original from public.ability_block
   where id = 38742 and name = 'Apparition Sense'
     and type = 'feat' and content_source_id = 400
   for update;
  if not found or array_length(original, 1) is distinct from 1 then
    raise exception 'Missing or changed Apparition Sense feature';
  end if;
  operation := original[1]::jsonb;
  if operation->>'id' is distinct from '3b0d3ea9-eddf-4c84-8b10-80a25e6f3745'
     or operation->>'type' is distinct from 'giveAbilityBlock'
     or operation #>> '{data,type}' is distinct from 'sense' then
    raise exception 'Changed Apparition Sense grant';
  end if;
  if operation #>> '{data,abilityBlockId}' = '38723' then return; end if;
  if operation #>> '{data,abilityBlockId}' is distinct from '28396' then
    raise exception 'Changed Apparition Sense target';
  end if;
  if exists (select 1 from public.content_update
    where type = 'ability-block' and ref_id = 38742
      and status->>'state' = 'PENDING') then
    raise exception 'Apparition Sense has a pending curator submission';
  end if;
  update public.ability_block
     set operations[1] = jsonb_set(operation, '{data,abilityBlockId}', '38723'::jsonb, false)::json
   where id = 38742;
end
$repair$;
