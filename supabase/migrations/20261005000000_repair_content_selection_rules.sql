-- Correct audited content selectors without changing saved choice IDs or unrelated curator edits.
-- Greater Spell Runes: https://2e.aonprd.com/Feats.aspx?ID=916
-- Advanced Thaumaturgy: https://2e.aonprd.com/Archetypes.aspx?ID=186&NoRedirect=1
do $repair$
declare
  patches constant jsonb := $patches$
[
  {"id":22643,"name":"Advanced Thaumaturgy","source":12,"operation":"eef43af3-d13d-4cb0-bb25-b23e3c71fc9f","operation_path":["0"],"path":["0","data","optionsFilters","level","max"],"before":10,"after":"{{LEVEL/2}}"},
  {"id":30205,"name":"Greater Spell Runes","source":31,"operation":"58c9f06e-c3b0-43f6-8957-80f23d9ddbcf","operation_path":["0","data","trueOperations","0"],"path":["0","data","trueOperations","0","data","optionsFilters","spellData","rank"],"before":4,"after":5},
  {"id":30205,"name":"Greater Spell Runes","source":31,"operation":"58c9f06e-c3b0-43f6-8957-80f23d9ddbcf","operation_path":["0","data","trueOperations","0"],"path":["0","data","trueOperations","0","data","optionsFilters","spellData","tradition"],"before":null,"after":"ARCANE"},
  {"id":30205,"name":"Greater Spell Runes","source":31,"operation":"7d8f9fc1-24f2-4814-a7d2-d2f61f7534ec","operation_path":["1","data","trueOperations","0"],"path":["1","data","trueOperations","0","data","optionsFilters","spellData","tradition"],"before":null,"after":"ARCANE"},
  {"id":30205,"name":"Greater Spell Runes","source":31,"operation":"f5bcbef7-94c8-4b4e-967f-b3b28e0ffab0","operation_path":["2"],"path":["2","data","optionsFilters","spellData","tradition"],"before":null,"after":"ARCANE"}
]
  $patches$;
  patch jsonb;
  current_ops jsonb;
  leaf_path text[];
  operation_path text[];
  current_value jsonb;
begin
  for patch in select value from jsonb_array_elements(patches) loop
    if exists (
      select 1 from public.content_update
      where type = 'ability-block' and ref_id = (patch->>'id')::bigint and status->>'state' = 'PENDING'
    ) then
      raise exception 'Pending curator submission for ability block %', patch->>'id';
    end if;

    select to_jsonb(operations) into current_ops
    from public.ability_block
    where id = (patch->>'id')::bigint and name = patch->>'name' and content_source_id = (patch->>'source')::bigint
    for update;
    if not found then raise exception 'Content identity changed for %', patch->>'id'; end if;
    select array_agg(value) into leaf_path from jsonb_array_elements_text(patch->'path');
    select array_agg(value) into operation_path from jsonb_array_elements_text(patch->'operation_path');
    if current_ops #>> (operation_path || array['id']) is distinct from patch->>'operation' then
      raise exception 'Operation identity changed for %', patch->>'id';
    end if;
    current_value := coalesce(current_ops #> leaf_path, 'null'::jsonb);
    if current_value = patch->'after' then continue; end if;
    if current_value is distinct from patch->'before' then
      raise exception 'Content leaf changed for %, path %', patch->>'id', leaf_path;
    end if;
    current_ops := jsonb_set(current_ops, leaf_path, patch->'after', true);
    update public.ability_block
    set operations = array(select value::json from jsonb_array_elements(current_ops))
    where id = (patch->>'id')::bigint;
  end loop;
end
$repair$;
