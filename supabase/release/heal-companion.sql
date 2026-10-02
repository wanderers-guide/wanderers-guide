select 'legacy-heal-companion-grant' as id, exists (
  select 1 from public.ability_block a where a.id = 22108
    and a.name = 'Heal Companion' and a.content_source_id = 14
    and a.meta_data->>'deprecated' = 'true'
    and to_jsonb(a.operations) = '[{"id": "8e91d541-cacb-46ed-820a-b2a1b5538f42", "type": "giveSpell", "data": {"spellId": 4977, "type": "FOCUS", "castingSource": "RANGER"}}, {"id": "4a5700ba-b678-53b5-8e4e-4a8fb9dbde93", "data": {"value": "RANGER:::-:::PRIMAL:::ATTRIBUTE_WIS", "variable": "CASTING_SOURCES"}, "type": "defineCastingSource"}, {"id": "04695e45-7d66-5e7c-b684-42d7e9f3f8d0", "data": {"value": {"value": "T"}, "variable": "SPELL_ATTACK"}, "type": "adjValue"}, {"id": "3526be96-f368-5466-8979-6aaa9f910d38", "data": {"value": {"value": "T"}, "variable": "SPELL_DC"}, "type": "adjValue"}, {"id": "2fc7cf29-1ae4-5810-9638-26c22494a5e8", "data": {"value": "spells", "variable": "PRIMARY_SHEET_TABS"}, "type": "adjValue"}]'::jsonb
    and a.description = 'You have a deep devotion to your animal companion that enables you to magically heal their wounds. You gain the [Heal Companion](link_spell_4977) warden spell and a focus pool of 1 Focus Point.'
    and exists (select 1 from public.spell s where s.id = 4977
      and s.name = 'Heal Companion' and s.content_source_id = 1 and s.rank = 1)
) as passed;
