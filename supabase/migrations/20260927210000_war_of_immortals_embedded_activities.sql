do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"parent":{"id":51428,"name":"One Among The Masses","level":14,"uuid":3826661012936875,"url":"https://2e.aonprd.com/Feats.aspx?ID=7308"},"child":{"id":51429,"name":"Overawe Crowd","level":1,"actions":"TWO-ACTIONS","uuid":6494856751326130},"grant":{"id":"9896af20-5cae-46e5-8b46-2fc953f1aa65","type":"giveAbilityBlock","data":{"type":"feat","abilityBlockId":51429}}},
    {"parent":{"id":51505,"name":"Legend of Combat","level":18,"uuid":8312927930720281,"url":"https://2e.aonprd.com/Feats.aspx?ID=7386"},"child":{"id":51506,"name":"Speed of Arms","level":1,"actions":"REACTION","uuid":45359890581666},"grant":{"id":"b1ecc0b7-c64e-4f27-8562-731f24147a4f","type":"giveAbilityBlock","data":{"type":"feat","abilityBlockId":51506}}}
  ]
  $patches$::jsonb;
  patch jsonb;
  parent public.ability_block%rowtype;
  child public.ability_block%rowtype;
  changed integer;
begin
  for patch in select value from jsonb_array_elements(patches) loop
    select * into parent from public.ability_block
     where id = (patch #>> '{parent,id}')::bigint for update;
    if not found
       or parent.name is distinct from patch #>> '{parent,name}'
       or parent.type is distinct from 'feat'
       or parent.level is distinct from (patch #>> '{parent,level}')::integer
       or parent.content_source_id is distinct from 400
       or parent.uuid is distinct from (patch #>> '{parent,uuid}')::bigint
       or parent.meta_data #>> '{source,url}' is distinct from patch #>> '{parent,url}'
       or position(patch #>> '{child,name}' in parent.description) = 0 then
      raise exception 'Missing or changed parent feat: %', patch #>> '{parent,name}';
    end if;

    select * into child from public.ability_block
     where id = (patch #>> '{child,id}')::bigint for update;
    if not found
       or child.name is distinct from patch #>> '{child,name}'
       or child.type is distinct from 'feat'
       or child.level is distinct from (patch #>> '{child,level}')::integer
       or child.actions is distinct from patch #>> '{child,actions}'
       or child.content_source_id is distinct from 400
       or child.uuid is distinct from (patch #>> '{child,uuid}')::bigint
       or cardinality(child.operations) is distinct from 0 then
      raise exception 'Missing or changed embedded activity: %', patch #>> '{child,name}';
    end if;

    if cardinality(parent.operations) = 1
       and parent.operations[1]::jsonb = patch->'grant'
       and child.meta_data->'unselectable' = 'true'::jsonb then
      continue;
    end if;
    if cardinality(parent.operations) is distinct from 0
       or child.meta_data is distinct from '{}'::jsonb then
      raise exception 'Changed activity grant or visibility; review before repair: %', patch #>> '{parent,name}';
    end if;
    if exists (select 1 from public.content_update
      where type = 'ability-block'
        and ref_id in ((patch #>> '{parent,id}')::bigint, (patch #>> '{child,id}')::bigint)
        and status->>'state' = 'PENDING') then
      raise exception 'Embedded activity has a pending curator submission: %', patch #>> '{parent,name}';
    end if;

    update public.ability_block
       set operations = array[(patch->'grant')::json]
     where id = (patch #>> '{parent,id}')::bigint and cardinality(operations) = 0;
    get diagnostics changed = row_count;
    if changed <> 1 then
      raise exception 'Parent activity grant changed during repair: %', patch #>> '{parent,name}';
    end if;

    update public.ability_block
       set meta_data = jsonb_set(child.meta_data, '{unselectable}', 'true'::jsonb, true)
     where id = (patch #>> '{child,id}')::bigint and meta_data = '{}'::jsonb;
    get diagnostics changed = row_count;
    if changed <> 1 then
      raise exception 'Embedded activity visibility changed during repair: %', patch #>> '{child,name}';
    end if;
  end loop;
end
$repair$;
