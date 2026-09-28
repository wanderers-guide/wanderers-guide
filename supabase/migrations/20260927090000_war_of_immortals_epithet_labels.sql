do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"id":38638,"name":"Root Epithet","operation_id":"523e838e-957b-4930-8f54-a48fcd7bd789","options":6},
    {"id":38694,"name":"Sovereignty Epithet","operation_id":"474f717b-c89e-4f05-b20c-75ce90d1f181","options":4}
  ]
  $patches$::jsonb;
  patch jsonb;
  original json[];
  operation jsonb;
  title text;
begin
  for patch in select value from jsonb_array_elements(patches) loop
    select operations into original from public.ability_block
     where id = (patch->>'id')::bigint
       and name = patch->>'name'
       and type = 'class-feature'
       and content_source_id = 400
     for update;
    if not found or array_length(original, 1) is distinct from 1 then
      raise exception 'Missing or changed Epithet feature: %', patch->>'name';
    end if;
    operation := original[1]::jsonb;
    if operation->>'id' is distinct from patch->>'operation_id'
       or operation->>'type' is distinct from 'select'
       or operation #>> '{data,modeType}' is distinct from 'PREDEFINED'
       or operation #>> '{data,optionType}' is distinct from 'CUSTOM'
       or jsonb_array_length(operation #> '{data,optionsPredefined}') is distinct from (patch->>'options')::integer then
      raise exception 'Changed Epithet selection: %', patch->>'name';
    end if;
    title := operation #>> '{data,title}';
    if title = 'Select an Epithet' then continue; end if;
    if title is distinct from 'Select an Epither' then
      raise exception 'Changed Epithet selection label: %', patch->>'name';
    end if;
    if exists (select 1 from public.content_update
      where type = 'ability-block'
        and ref_id = (patch->>'id')::bigint
        and status->>'state' = 'PENDING') then
      raise exception 'Epithet feature has a pending curator submission: %', patch->>'name';
    end if;
    update public.ability_block
       set operations[1] = jsonb_set(operation, '{data,title}', '"Select an Epithet"'::jsonb, false)::json
     where id = (patch->>'id')::bigint;
  end loop;
end
$repair$;
