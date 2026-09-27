do $repair$
declare
  original jsonb[];
  adjustment jsonb;
  adjustment_index integer;
  original_filter constant jsonb := '{"id":"75a64669-7b57-4a72-9a07-b4bb5f6a25af","type":"SPELL","level":{"max":1},"traits":[],"spellData":{"type":"NORMAL","castingSource":"WITCH"},"traditions":[]}'::jsonb;
  corrected_filter constant jsonb := '{"id":"75a64669-7b57-4a72-9a07-b4bb5f6a25af","type":"SPELL","level":{"min":1,"max":1},"traits":[],"spellData":{"type":"NORMAL","castingSource":"WITCH"},"traditions":[],"rarity":"COMMON","traditionFromSelection":{"key":"class-feature-4615129260014645_5bb6ce93-064a-43fa-b51a-911d7561ba95","castingSource":"WITCH"}}'::jsonb;
begin
  select feature_adjustments into original from public.class_archetype
   where id = 14 and name = 'Seneschal' and class_id = 27 and content_source_id = 400
   for update;
  if not found then raise exception 'Missing or changed Seneschal class archetype'; end if;
  if (select count(*) from unnest(original) entry
       where entry->>'fa_id' = '80493ab4-562d-4d7f-a360-9a1de1cda715') <> 1 then
    raise exception 'Missing or duplicate Seneschal Knowledge adjustment';
  end if;
  select entry, ordinal::integer into adjustment, adjustment_index
    from unnest(original) with ordinality as entries(entry, ordinal)
   where entry->>'fa_id' = '80493ab4-562d-4d7f-a360-9a1de1cda715';
  if adjustment->>'type' <> 'REPLACE'
     or adjustment->>'prev_id' <> '21164'
     or adjustment #>> '{data,id}' <> '4615129260014645'
     or adjustment #>> '{data,name}' <> 'Seneschal Knowledge'
     or jsonb_array_length(adjustment #> '{data,operations}') <> 3
     or adjustment #>> '{data,operations,2,id}' <> 'bbeee74e-5424-471f-b1d7-8c74b3b12e14'
     or adjustment #>> '{data,operations,2,type}' <> 'select' then
    raise exception 'Changed Seneschal Knowledge spell selection';
  end if;
  if adjustment #> '{data,operations,2,data,optionsFilters}' = corrected_filter then
    null;
  elsif adjustment #> '{data,operations,2,data,optionsFilters}' = original_filter then
    if exists (select 1 from public.content_update
      where type = 'class-archetype' and ref_id = 14 and status->>'state' = 'PENDING') then
      raise exception 'Seneschal class archetype has a pending curator submission';
    end if;
    update public.class_archetype
       set feature_adjustments[adjustment_index] = jsonb_set(
         adjustment,
         '{data,operations,2,data,optionsFilters}',
         corrected_filter,
         false
       )
     where id = 14;
  else
    raise exception 'Changed Seneschal Knowledge spell filter';
  end if;
end
$repair$;
