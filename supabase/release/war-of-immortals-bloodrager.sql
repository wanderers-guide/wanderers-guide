with expected_ranks (feat_id, name, level, op_id, variable, rank) as (
  values
    (38522, 'Bloodrager Dedication', 2, 'd04ea2eb-8ffb-47a5-9c83-dd34330f4d58', 'SPELL_ATTACK', 'T'),
    (38522, 'Bloodrager Dedication', 2, '5008a158-6c99-4196-a10d-03fa1643bcd4', 'SPELL_DC', 'T'),
    (39154, 'Surging Blood Magic', 12, 'e932fbaf-4586-48a1-b8e0-bffe3b7edf42', 'SPELL_ATTACK', 'E'),
    (39154, 'Surging Blood Magic', 12, 'd854f638-0671-405a-9106-54567e5f49e7', 'SPELL_DC', 'E'),
    (39155, 'Exultant Blood Magic', 18, '4831e8cf-5592-45c4-890f-6aabdd2c10cd', 'SPELL_ATTACK', 'M'),
    (39155, 'Exultant Blood Magic', 18, 'ded96e11-626f-49a3-958a-97c532116c30', 'SPELL_DC', 'M')
), expected_slots (level, rank, amount) as (
  values (18, 7, 2), (19, 7, 2), (20, 7, 2), (20, 8, 2)
)
select 'war-bloodrager-proficiencies' as id,
  not exists (
    select 1 from expected_ranks expected
     where (select count(*) from public.ability_block feat, unnest(feat.operations) op
       where feat.id = expected.feat_id and feat.name = expected.name
         and feat.type = 'feat' and feat.level = expected.level and feat.content_source_id = 400
         and op->>'id' = expected.op_id and op->>'type' = 'adjValue'
         and op #>> '{data,variable}' = expected.variable
         and op #>> '{data,value,value}' = expected.rank) <> 1
       or (select count(*) from public.ability_block feat, unnest(feat.operations) op
         where feat.id = expected.feat_id and op->>'id' = expected.op_id) <> 1
  ) as passed
union all
select 'war-bloodrager-master-slots',
  (select count(*) = 1 from public.ability_block feat, unnest(feat.operations) op
    where feat.id = 39155 and feat.name = 'Exultant Blood Magic' and feat.type = 'feat'
      and feat.level = 18 and feat.content_source_id = 400
      and op->>'id' = 'bdbdc81a-12a5-4b55-9d14-6090e674e69c'
      and op->>'type' = 'giveSpellSlot' and op #>> '{data,castingSource}' = 'BLOODRAGER')
  and (select count(*) = 1 from public.ability_block feat, unnest(feat.operations) op
    where feat.id = 39155 and op->>'id' = 'bdbdc81a-12a5-4b55-9d14-6090e674e69c')
  and not exists (
    select 1 from expected_slots expected
     where (select count(*) from public.ability_block feat, unnest(feat.operations) op,
       jsonb_array_elements(op::jsonb #> '{data,slots}') slot
       where feat.id = 39155 and op->>'id' = 'bdbdc81a-12a5-4b55-9d14-6090e674e69c'
         and slot->>'lvl' = expected.level::text and slot->>'rank' = expected.rank::text) <> 1
       or not exists (select 1 from public.ability_block feat, unnest(feat.operations) op,
         jsonb_array_elements(op::jsonb #> '{data,slots}') slot
         where feat.id = 39155 and op->>'id' = 'bdbdc81a-12a5-4b55-9d14-6090e674e69c'
           and slot::jsonb = jsonb_build_object('lvl', expected.level, 'rank', expected.rank, 'amt', expected.amount))
  );
