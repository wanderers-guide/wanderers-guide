select 'champion-domain-casting-source' as id, exists (
  select 1 from public.ability_block feat
  where feat.id = 31855 and feat.name = 'Deity''s Domain'
    and feat.type = 'feat' and feat.content_source_id = 256
    and (select count(*) from unnest(feat.operations) op
      where op->>'type' = 'defineCastingSource'
        and split_part(op #>> '{data,value}', ':::', 1) = 'CHAMPION') = 1
    and to_jsonb(feat.operations) @> '[{"type":"defineCastingSource","data":{"variable":"CASTING_SOURCES","value":"CHAMPION:::-:::DIVINE:::ATTRIBUTE_CHA"}}]'
    and to_jsonb(feat.operations) @> '[{"type":"select","data":{"optionsFilters":{"spellData":{"type":"FOCUS","castingSource":"CHAMPION"}}}}]'
) as passed;
