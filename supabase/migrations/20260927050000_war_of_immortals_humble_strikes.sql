-- Mark Humble Strikes for its simple-weapon die increase.
-- https://2e.aonprd.com/Classes.aspx?ID=65
do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"id":38635,"name":"Humble Strikes","source":400,"before_hash":"d751713988987e9331980363e24189ce","before_count":0,"after":{"id":"4ba64431-4832-4633-a5da-46dee7e6b756","type":"setValue","data":{"variable":"EXEMPLAR_HUMBLE_STRIKES","value":true}}}
  ]
  $patches$::jsonb;
  patch jsonb;
  original json[];
begin
  for patch in select value from jsonb_array_elements(patches) loop
    select operations into original from public.ability_block
     where id = (patch->>'id')::bigint
       and name = patch->>'name'
       and type = 'class-feature'
       and content_source_id = (patch->>'source')::bigint
     for update;
    if not found then
      raise exception 'Missing or changed Exemplar class feature: %', patch->>'name';
    end if;
    if original[cardinality(original)]::jsonb = patch->'after' then
      continue;
    end if;
    if cardinality(original) is distinct from (patch->>'before_count')::integer
       or md5(to_jsonb(original)::text) is distinct from patch->>'before_hash' then
      raise exception 'Changed Exemplar class-feature operations; review before repair: %', patch->>'name';
    end if;
    if exists (select 1 from public.content_update
       where type = 'ability-block' and ref_id = (patch->>'id')::bigint
         and status->>'state' = 'PENDING') then
      raise exception 'Exemplar class feature has a pending curator submission: %', patch->>'name';
    end if;
    update public.ability_block
       set operations = array_append(original, (patch->'after')::json)
     where id = (patch->>'id')::bigint;
  end loop;
end
$repair$;
