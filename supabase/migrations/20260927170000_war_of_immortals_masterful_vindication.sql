do $repair$
declare
  feat public.ability_block%rowtype;
  edge public.ability_block%rowtype;
  operation jsonb;
  changed integer;
begin
  select * into feat from public.ability_block
   where id = 43770 and name = 'Masterful Vindication'
     and type = 'feat' and level = 17 and content_source_id = 400
     and uuid = '2857467541034763'
   for update;
  if not found then
    raise exception 'War of Immortals Masterful Vindication is missing or changed';
  end if;
  if array_length(feat.operations, 1) is distinct from 1 then
    raise exception 'Masterful Vindication operations have changed';
  end if;
  operation := feat.operations[1]::jsonb;
  if operation is distinct from '{"id":"413eeb0e-bac6-408f-8ab2-c571cf48ec79","type":"addBonusToValue","data":{"variable":"SPELL_ATTACK","value":"2","type":"status","text":""}}'::jsonb then
    raise exception 'Masterful Vindication operation has changed';
  end if;
  select * into edge from public.ability_block
   where id = 43769 and name = 'Vindication Edge' and type = 'feat'
     and content_source_id = 400 for update;
  if not found or edge.meta_data->'unselectable' is distinct from 'true'::jsonb
    or edge.operations[2]::jsonb #>> '{data,conditions,0,value}' is distinct from '17'
    or edge.operations[2]::jsonb #>> '{data,trueOperations,0,data,value}' is distinct from '2'
    or coalesce(edge.operations[2]::jsonb #>> '{data,trueOperations,1,data,text}'
      not like '%-2 status penalty%', true) then
    raise exception 'Vindication Edge does not contain the level-17 upgrade';
  end if;
  if feat.meta_data->'unselectable' = 'true'::jsonb then return; end if;
  if feat.meta_data ? 'unselectable' then
    raise exception 'Masterful Vindication visibility has changed';
  end if;
  if exists (
    select 1 from public.content_update
     where type = 'ability-block' and ref_id = 43770 and status->>'state' = 'PENDING'
  ) then
    raise exception 'Masterful Vindication has a pending curator submission';
  end if;

  update public.ability_block
     set meta_data = jsonb_set(coalesce(meta_data, '{}'::jsonb), '{unselectable}', 'true'::jsonb, true)
   where id = 43770 and meta_data->'unselectable' is null;
  get diagnostics changed = row_count;
  if changed <> 1 then
    raise exception 'Masterful Vindication visibility changed during repair';
  end if;
end
$repair$;
