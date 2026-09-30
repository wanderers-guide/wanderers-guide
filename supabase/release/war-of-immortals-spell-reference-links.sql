with expected(id, name, uuid, description_md5, url) as (values
  (7268, 'Traveling Workshop', 6560926359615486::bigint, '816395781801df4b23c36c3b20d01be9', 'https://2e.aonprd.com/Spells.aspx?ID=2137'),
  (7285, 'Garden of the Green Man''s Growth', 5894872194542704, '39681f3a2b6ac3a4d4a93bbfd66d5061', 'https://2e.aonprd.com/MythicSpells.aspx?ID=2156'),
  (7278, 'Embodiment of Battle', 8286863436103064, '1914504f72aad1a08e07b913c0a2c224', 'https://2e.aonprd.com/Spells.aspx?ID=2146'),
  (7315, 'Create Demiplane', 3084503812004038, '05b17f4d029cf7270ab1cbcf6aea674b', 'https://2e.aonprd.com/MythicRituals.aspx?ID=191'),
  (7317, 'Freedom', 2578725875317887, 'eb4c5935f99664356461bdcea53a0f97', 'https://2e.aonprd.com/MythicRituals.aspx?ID=193'),
  (7318, 'Imprisonment', 3996631344551247, '806ce4a64c3f9a9ead1ddf6640462a03', 'https://2e.aonprd.com/MythicRituals.aspx?ID=194'),
  (7324, 'World in Shadow', 7448948841209054, '791d18a5d348b902a5a7152d03d65d45', 'https://2e.aonprd.com/MythicRituals.aspx?ID=200')
), targets(table_name, id, name, uuid, source_id, type) as (values
  ('item', 6693, 'Alchemist''s Lab', 981315748264688::bigint, 1, 'item'),
  ('ability_block', 38707, 'Crafter in the Vault', 5805084005545995, 400, 'feat'),
  ('trait', 2938, 'Plant', 339889839350251, 3, 'trait'),
  ('trait', 4075, 'Apparition', 8054066192161682, 400, 'trait'),
  ('spell', 4687, 'Interplanar Teleport', 7609947194314161, 3, 'spell'),
  ('spell', 7318, 'Imprisonment', 3996631344551247, 400, 'spell'),
  ('spell', 7317, 'Freedom', 2578725875317887, 400, 'spell'),
  ('ability_block', 20769, 'Darkvision', 990708369957964, 3, 'sense'),
  ('spell', 4699, 'Light', 2956398977648258, 3, 'spell')
), actual_targets as (
  select 'item' as table_name, id, name, uuid, content_source_id as source_id, 'item' as type from public.item
  union all select 'ability_block', id, name, uuid, content_source_id, type from public.ability_block
  union all select 'trait', id, name, uuid, content_source_id, 'trait' from public.trait
  union all select 'spell', id, name, uuid, content_source_id, 'spell' from public.spell
)
select 'war-spell-reference-links' as id,
  (select count(*) = 7 from expected e join public.spell s on s.id = e.id
    where s.name = e.name and s.uuid = e.uuid and s.content_source_id = 400
      and s.meta_data #>> '{source,url}' = e.url and md5(s.description) = e.description_md5)
  and (select count(*) = 9 from targets t join actual_targets a
    on a.table_name = t.table_name and a.id = t.id and a.name = t.name
      and a.uuid = t.uuid and a.source_id = t.source_id and a.type = t.type) as passed;
