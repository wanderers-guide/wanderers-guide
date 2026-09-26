with expected(id, operation_id, operation_type, data) as (values
  (58079, 'e16b5372-9e86-4d3c-86ac-c8828ef7c83f', 'giveAbilityBlock', '{"type":"sense","abilityBlockId":58078}'::jsonb),
  (47102, '37449902-05f6-445e-94be-29e6ac00490f', 'giveSpell', '{"rank":4,"type":"INNATE","casts":1,"spellId":8319,"tradition":"ARCANE"}'::jsonb),
  (23103, '8353919a-6cb7-4daa-9ece-9a1242daa7b8', 'giveSpell', '{"rank":1,"type":"INNATE","casts":1,"spellId":6759,"tradition":"PRIMAL"}'::jsonb),
  (23111, '86c25297-a1c5-4bc1-a807-bb0392d24efd', 'giveSpell', '{"rank":4,"type":"INNATE","spellId":8835,"tradition":"PRIMAL"}'::jsonb),
  (23336, 'a52e18a0-4ab0-4105-9ea2-195c41d9fe55', 'giveSpell', '{"rank":2,"type":"INNATE","casts":1,"spellId":4397,"tradition":"PRIMAL"}'::jsonb)
)
select 'feat-grant-' || e.id as id, exists (
  select 1 from public.ability_block a where a.id = e.id and (
    select count(*) = 1 and bool_and(entry->>'type' = e.operation_type and entry->'data' = e.data)
    from unnest(a.operations) op, lateral (select op::jsonb as entry) parsed
    where entry->>'id' = e.operation_id
  ) and case when e.operation_type = 'giveSpell' then exists (
    select 1 from public.spell s where s.id = (e.data->>'spellId')::bigint
  ) else exists (
    select 1 from public.ability_block target where target.id = (e.data->>'abilityBlockId')::bigint
      and target.type = 'sense'
  ) end
) as passed from expected e;
