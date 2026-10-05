with expected(id, source, operation_id, operation_path, leaf_path, value) as (values
  (22643, 12, 'eef43af3-d13d-4cb0-bb25-b23e3c71fc9f', array['0'], array['0','data','optionsFilters','level','max'], '"{{LEVEL/2}}"'::jsonb),
  (30205, 31, '58c9f06e-c3b0-43f6-8957-80f23d9ddbcf', array['0','data','trueOperations','0'], array['0','data','trueOperations','0','data','optionsFilters','spellData','rank'], '5'::jsonb),
  (30205, 31, '58c9f06e-c3b0-43f6-8957-80f23d9ddbcf', array['0','data','trueOperations','0'], array['0','data','trueOperations','0','data','optionsFilters','spellData','tradition'], '"ARCANE"'::jsonb),
  (30205, 31, '7d8f9fc1-24f2-4814-a7d2-d2f61f7534ec', array['1','data','trueOperations','0'], array['1','data','trueOperations','0','data','optionsFilters','spellData','tradition'], '"ARCANE"'::jsonb),
  (30205, 31, 'f5bcbef7-94c8-4b4e-967f-b3b28e0ffab0', array['2'], array['2','data','optionsFilters','spellData','tradition'], '"ARCANE"'::jsonb)
)
select 'content-selection-' || e.id || '-' || array_to_string(e.leaf_path, '-') as id,
  exists (select 1 from public.ability_block a where a.id = e.id and a.content_source_id = e.source
    and to_jsonb(a.operations) #>> (e.operation_path || array['id']) = e.operation_id
    and to_jsonb(a.operations) #> e.leaf_path = e.value) as passed
from expected e;
