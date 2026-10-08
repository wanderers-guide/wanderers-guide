-- Preserve original check IDs and predicates; use the pinned shared terminal check.
with terminal_function as materialized(select (exists(select 1 from pg_catalog.pg_proc p
  where p.oid=pg_catalog.to_regprocedure('public.treasure_vault_terminal_status_v1()')
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((p.prosrc)::text,'UTF8')),'hex')='18134f9ceb5b974368dcfba9e6a145c839b63a762014424005872665b4dce869'
    and p.prokind='f' and p.prolang=(select l.oid from pg_catalog.pg_language l where l.lanname='sql')
    and p.provolatile='s' and p.prosecdef is false and p.proisstrict is false and p.proleakproof is false
    and p.proparallel='u' and p.procost=100 and p.prorows=1
    and p.pronargs=0 and p.pronargdefaults=0 and p.proretset is true
    and p.prorettype=pg_catalog.to_regtype('record')
    and p.proallargtypes=array[pg_catalog.to_regtype('boolean')::oid,pg_catalog.to_regtype('boolean')::oid]
    and p.proargmodes=array['t','t']::"char"[] and p.proargnames=array['recognized','passed']::text[]
    and p.proconfig=array['search_path=""']::text[] and p.proowner=pg_catalog.to_regrole('postgres')
    and (select count(*)=3
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('postgres'))=1
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('service_role'))=1
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('supabase_read_only_user'))=1
      and bool_and((a.privilege_type='EXECUTE' and a.is_grantable is false
      and a.grantor=pg_catalog.to_regrole('postgres')
      and a.grantee in(pg_catalog.to_regrole('postgres'),pg_catalog.to_regrole('service_role'),pg_catalog.to_regrole('supabase_read_only_user'))) is true)
      from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a)
    and pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE')
    and pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
    and pg_catalog.has_function_privilege('supabase_read_only_user',p.oid,'EXECUTE'))) as valid),
terminal_status as materialized(select case when f.valid is true then
  coalesce((select pg_catalog.to_jsonb(s) from public.treasure_vault_terminal_status_v1() s),'{"recognized":true,"passed":false}'::jsonb)
  else '{"recognized":true,"passed":false}'::jsonb end as value from terminal_function f),
original_checks as(
with war_records as materialized (
  select id, to_jsonb(row_data) as body from public.ability_block row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.item row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.spell row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.archetype row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.class row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.class_archetype row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.trait row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.versatile_heritage row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.creature row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.ancestry row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.background row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.language row_data where content_source_id = 400
  union all select id, to_jsonb(row_data) from public.content_source row_data where id = 400
), warrior_expected_ops (prev_id, op_id, variable, rank) as (
  values
    (20764, '7b2ab962-eb1b-4a4c-adb9-feaf4b76682c', 'WEAPON_GROUP_SPEAR_SIMPLE', 'M'),
    (20764, 'de0ab549-bff3-478b-a9c9-06c501b157b4', 'WEAPON_GROUP_SPEAR_MARTIAL', 'M'),
    (20764, '266f14b5-2aba-4895-973a-a2405c124195', 'WEAPON_GROUP_SPEAR_ADVANCED', 'E'),
    (20764, '64a95f6d-f6ee-44e1-b8cd-46b4909e0edb', 'WEAPON_GROUP_SPEAR_UNARMED_ATTACK', 'M'),
    (20764, 'af2cd211-b570-4d9c-807b-0b9c37fd3820', 'WEAPON_GROUP_POLEARM_SIMPLE', 'M'),
    (20764, '7f4c261c-7d6d-4ee4-91ab-18072d73b007', 'WEAPON_GROUP_POLEARM_MARTIAL', 'M'),
    (20764, 'af3a85f7-eb20-40bd-aaf7-9cd5b45e8f11', 'WEAPON_GROUP_POLEARM_ADVANCED', 'E'),
    (20764, 'c5da8516-537e-4aff-9150-4d4d658388a1', 'WEAPON_GROUP_POLEARM_UNARMED_ATTACK', 'M'),
    (19270, '21eb95b6-873e-4202-af91-d2d73debdc50', 'SIMPLE_WEAPONS', 'M'),
    (19270, '4f6ff374-cfca-4af8-a4bc-45348f4713e1', 'MARTIAL_WEAPONS', 'M'),
    (19270, 'ea3ddcd5-65d5-4b35-9142-fb58a1460f83', 'UNARMED_ATTACKS', 'M'),
    (19270, 'ae1447cb-cfbc-464c-a610-e4823af64291', 'ADVANCED_WEAPONS', 'E'),
    (19270, 'b8860303-4c3b-4a90-889e-3dabb4fdf8cd', 'WEAPON_GROUP_SPEAR_SIMPLE', 'L'),
    (19270, '77f9c867-7c4f-4578-85b7-342db31a7593', 'WEAPON_GROUP_SPEAR_MARTIAL', 'L'),
    (19270, '692f70f3-ae7e-43bb-b45d-b451cfeca006', 'WEAPON_GROUP_SPEAR_ADVANCED', 'M'),
    (19270, 'e623891b-cb03-4337-89fd-50b942b07940', 'WEAPON_GROUP_SPEAR_UNARMED_ATTACK', 'L'),
    (19270, '975705e5-f08e-4138-b3f6-f273eac03bad', 'WEAPON_GROUP_POLEARM_SIMPLE', 'L'),
    (19270, 'a0ffc289-01b6-4f4f-8164-8855e5fde6ef', 'WEAPON_GROUP_POLEARM_MARTIAL', 'L'),
    (19270, '502af567-8937-403e-9587-387f9db67a50', 'WEAPON_GROUP_POLEARM_ADVANCED', 'M'),
    (19270, '4b479fd2-5ff2-46bd-a909-e26b91f10142', 'WEAPON_GROUP_POLEARM_UNARMED_ATTACK', 'L')
)
select 'war-citations' as id,
  (select count(*) = 20 from public.ability_block
    where id in (38754, 51663, 51667, 51526, 38748, 39204, 51495, 38765, 38503, 39141,
                 38745, 39274, 43769, 38768, 39156, 39276, 39279, 39280, 39287, 39288)
      and meta_data #>> '{source,url}' like 'https://2e.aonprd.com/%')
  and (select count(*) = 2 from public.spell where id in (7271, 7280)
    and meta_data #>> '{source,url}' like 'https://2e.aonprd.com/%')
  and (select count(*) = 4 from public.item where id in (16924, 16925, 16926, 16927)
    and meta_data #>> '{source,url}' like 'https://2e.aonprd.com/%')
  and exists (select 1 from public.archetype where id = 289
    and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Archetypes.aspx?ID=284') as passed
union all
select 'war-class-rules',
  exists (select 1 from public.ability_block a, unnest(a.operations) op
    where a.id = 51667 and op->>'id' = '81b9d86d-939f-4ca1-a5b8-fa75a7d8a4a2'
      and op #>> '{data,conditions,1,value}' = 'TRUE')
  and (select count(*) = 6 from public.ability_block a, unnest(a.operations) op,
      jsonb_array_elements(op::jsonb #> '{data,slots}') slot
    where a.id = 38637 and op->>'id' = '8411d1a2-a480-468e-a45c-d8f6fa10a0d2'
      and ((slot->>'lvl')::integer, (slot->>'rank')::integer, (slot->>'amt')::integer)
        in ((13,7,1),(14,7,2),(15,8,1),(16,8,2),(17,9,1),(18,9,2)))
  and exists (select 1 from public.ability_block a, unnest(a.operations) op
    where a.id = 38709 and op->>'id' = '2cc5d640-ccd6-4532-a42c-eb00b0de6cb6'
      and op #>> '{data,trueOperations,0,data,spellId}' = '4679'
      and op #>> '{data,trueOperations,0,data,rank}' = '5')
union all
select 'war-links',
  exists (select 1 from public.ability_block where id = 38638
    and operations::text not like '%link_trait_3130%')
  and (select count(*) = 2 from public.ability_block where id in (38762, 38773)
    and operations::text like '%link_feat_38714%'
    and operations::text not like '%link_feat_28015%')
  and exists (select 1 from public.ability_block where id = 51428
    and description like '%link_feat_51429%'
    and description not like '%link_action_51429%')
  and exists (select 1 from public.ability_block where id = 51443
    and description like '%link_feat_51444%'
    and description like '%link_feat_51445%'
    and description like '%link_feat_51446%'
    and description not like '%link_action_51444%'
    and description not like '%link_action_51445%'
    and description not like '%link_action_51446%')
union all
select 'war-fields',
  (select count(*) = 2 from public.ability_block where (id = 38754 and name = 'Apparition Stabilization')
    or (id = 38768 and name = 'Whisper of Warning'))
  and exists (select 1 from public.ability_block where id = 39022 and rarity = 'RARE')
  and exists (select 1 from public.archetype where id = 292 and rarity = 'RARE')
  and exists (select 1 from public.item where id = 16928 and bulk = '1')
  and exists (select 1 from public.item where id = 16929 and usage = 'worn cloak')
  and exists (select 1 from public.item where id = 17391 and rarity = 'UNCOMMON')
union all
select 'war-archetype-choices',
  exists (select 1 from public.ability_block a, unnest(a.operations) op
    where a.id = 39210 and a.content_source_id = 400
      and op->>'id' = '3d3b3a73-14f7-4bf0-8be0-f3bfca8e1c37'
      and op #>> '{data,optionsFilters,level,max}' = '{{LEVEL/2}}'
      and op::jsonb #> '{data,optionsFilters,excludedTraits}' = '[4076]'::jsonb)
  and exists (select 1 from public.ability_block a, unnest(a.operations) op
    where a.id = 39205 and a.content_source_id = 400
      and op->>'id' = '4c94682e-f4c9-43a2-b35e-27f3672261ed'
      and op #>> '{data,optionsFilters,level,max}' = '{{LEVEL/2}}'
      and op::jsonb #> '{data,optionsFilters,excludedTraits}' is null)
union all
select 'war-archetype-proficiencies',
  (select count(*) = 2 from public.ability_block a, unnest(a.operations) op
    where a.id = 39021 and a.content_source_id = 400
      and ((op->>'id' = '06815cbe-d9e0-4cad-ae94-c44dc6f7623e'
          and op #>> '{data,variable}' = 'SPELL_ATTACK')
        or (op->>'id' = '202d6a68-5900-4f7a-8e21-090947f634a4'
          and op #>> '{data,variable}' = 'SPELL_DC'))
      and op #>> '{data,value,value}' = 'T')
  and exists (select 1 from public.ability_block a, unnest(a.operations) op
    where a.id = 39022 and a.content_source_id = 400
      and op->>'id' = 'd411e382-85fb-491d-9c2a-76cd68f17b3a'
      and op #>> '{data,variable}' = 'MARTIAL_WEAPONS'
      and op #>> '{data,value,value}' = 'T')
  and exists (select 1 from public.ability_block a
    where a.id = 39206 and a.content_source_id = 400
      and cardinality(a.operations) = 1
      and a.operations[1]->>'id' = '09844148-da84-45f6-9e96-6777501ebc53'
      and a.operations[1] #>> '{data,conditions,0,value}' = 'exemplar resiliency'
      and a.operations[1] #>> '{data,conditions,1,value}' = '8'
      and a.operations[1] #>> '{data,trueOperations,0,data,value}' = '3')
  and (select count(*) = 2 from public.ability_block a, unnest(a.operations) op
    where a.id = 39213 and a.content_source_id = 400
      and ((op->>'id' = 'd90cc16a-9da0-4d1e-94c9-62ba6b9735f6'
          and op #>> '{data,variable}' = 'SPELL_ATTACK')
        or (op->>'id' = 'c7ecb9c2-394c-4e12-b736-ac59f680de0b'
          and op #>> '{data,variable}' = 'SPELL_DC'))
      and op #>> '{data,value,value}' = 'M')
union all
select 'war-vindicator',
  exists (select 1 from public.class_archetype c, unnest(c.operations) op
    where c.id = 30 and op->>'id' = 'c4a75d49-19e5-4983-8757-d5caf473627b'
      and op #>> '{data,optionsFilters,addToFamiliarity}' = 'true'
      and op::jsonb #> '{data,optionsFilters,familiarityCategories}' = '["advanced"]'::jsonb)
  and exists (select 1 from public.ability_block where id = 39273
    and name = 'Silence the Profane (Vindicator)' and uuid = 2351793770437190
    and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Feats.aspx?ID=7258')
union all
select 'war-humble-strikes',
  exists (select 1 from public.ability_block a, unnest(a.operations) op
    where a.id = 38635 and op->>'id' = '4ba64431-4832-4633-a5da-46dee7e6b756'
      and op #>> '{data,variable}' = 'EXEMPLAR_HUMBLE_STRIKES'
      and op #>> '{data,value}' = 'true')
union all
select 'war-items',
  (select count(*) = 3 from public.item where content_source_id = 400
    and ((name = 'Rattan Armor' and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Armor.aspx?ID=52')
      or (name = 'Shard of Self-Destruction' and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Equipment.aspx?ID=3516')
      or (name = 'Wandering Pipe' and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Equipment.aspx?ID=3513')))
union all
select 'war-artifact-fields',
  (select count(*) = 2 from public.item where content_source_id = 400
    and ((id = 16929 and name = 'Final Scalecloak' and bulk = '1'
      and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Equipment.aspx?ID=3508')
    or (id = 17101 and name = 'Freedom''s Flame' and bulk = '0.1'
      and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Equipment.aspx?ID=3509')))
union all
select 'war-worldforge-preservation',
  exists (select 1 from public.item
    where id = 16930 and name = 'Worldforge' and uuid = 5574690037466395
      and content_source_id = 400 and level = 25
      and bulk = '15' and usage = ''
      and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Equipment.aspx?ID=3511'
      and meta_data #>> '{source,book}' = 'War of Immortals'
      and meta_data #>> '{source,page}' = '152')
union all
select 'war-holy-rune',
  exists (select 1 from public.item where id = 17101 and name = 'Freedom''s Flame'
    and content_source_id = 400
    and jsonb_array_length(meta_data::jsonb #> '{runes,property}') = 1
    and meta_data #>> '{runes,property,0,id}' = '7040'
    and meta_data #>> '{runes,property,0,name}' = 'Holy'
    and not (meta_data::jsonb #> '{runes,property,0,rune}' ? 'search_tsv')
    and meta_data::jsonb #> '{runes,property,0,rune,traits}' = '[1504,1630]'::jsonb
    and meta_data #>> '{runes,property,0,rune,meta_data,damage,die}' = 'd4'
    and meta_data #>> '{runes,property,0,rune,meta_data,damage,damageType}' = 'spirit'
    and meta_data #>> '{runes,property,0,rune,meta_data,source,url}' = 'https://2e.aonprd.com/Equipment.aspx?ID=2842'
    and meta_data #>> '{runes,property,0,rune,description}' like '%**Holy Healing**%'
    and meta_data #>> '{runes,property,0,rune,description}' not like '%link_spell_3371%')
  and exists (select 1 from public.item where id = 7040 and name = 'Holy'
    and description like '%**Holy Healing**%' and description not like '%link_spell_3371%')
union all
select 'war-artifact-destruction',
  (select count(*) = 5
    from (values
      (16928, 'Dragon-Lotus Drum', 'https://2e.aonprd.com/Equipment.aspx?ID=3507', '537d623647bde4b8eb249634fb05dc9a'),
      (16929, 'Final Scalecloak', 'https://2e.aonprd.com/Equipment.aspx?ID=3508', 'e9e1b106c502d0696773342dbaa521d7'),
      (16930, 'Worldforge', 'https://2e.aonprd.com/Equipment.aspx?ID=3511', '181e0e536dc405ca394b06deca3480f0'),
      (17101, 'Freedom''s Flame', 'https://2e.aonprd.com/Equipment.aspx?ID=3509', '01af182622590c0681114bccca90632f'),
      (17102, 'Shadowpiercer', 'https://2e.aonprd.com/Equipment.aspx?ID=3510', '4500e776b62677b4c41c58a96dad01b2')
    ) expected(id, name, url, description_hash)
    join public.item item_row on item_row.id = expected.id
    where item_row.name = expected.name and item_row.content_source_id = 400
      and item_row.meta_data #>> '{source,url}' = expected.url
      and md5(item_row.description) = expected.description_hash
      and item_row.craft_requirements = '')
union all
select 'war-errata',
  exists (select 1 from public.ability_block where id = 39152
    and special like '%4th rank%' and special like '%7th rank%')
  and exists (select 1 from public.ability_block where id = 39154
    and prerequisites = array['Rising Blood Magic','master in Arcana or Religion, depending on your chosen tradition']::varchar[])
  and exists (select 1 from public.ability_block where id = 39155
    and prerequisites = array['Surging Blood Magic','legendary in Arcana or Religion, depending on your chosen tradition']::varchar[]
    and description like '%master spellcasting benefits%')
  and exists (select 1 from public.ability_block where id = 38660 and prerequisites = array['Vindicator']::varchar[])
  and exists (select 1 from public.ability_block where id = 38821 and prerequisites = array['Strike Rivers, Seize Winds']::varchar[])
  and exists (select 1 from public.ability_block where id = 51462 and prerequisites = array['Ascended Celestial Dedication']::varchar[])
union all
select 'war-archetype-citations',
  (select count(*) = 4 from public.class_archetype
    where id in (14, 32, 34, 36)
      and meta_data #>> '{source,url}' like 'https://2e.aonprd.com/Archetypes.aspx?ID=%')
union all
select 'war-epithet-labels',
  (select count(*) = 2 from public.ability_block where id in (38638, 38694)
    and operations[1] #>> '{data,title}' = 'Select an Epithet')
union all
select 'war-apparition-sense',
  exists (select 1 from public.ability_block where id = 38742
    and operations[1] #>> '{data,abilityBlockId}' = '38723')
union all
select 'war-seneschal-spell',
  exists (select 1 from public.class_archetype c, unnest(c.feature_adjustments) adjustment
    where c.id = 14 and adjustment->>'fa_id' = '80493ab4-562d-4d7f-a360-9a1de1cda715'
      and adjustment #>> '{data,operations,2,data,optionsFilters,rarity}' = 'COMMON'
      and adjustment #>> '{data,operations,2,data,optionsFilters,level,min}' = '1'
      and adjustment #>> '{data,operations,2,data,optionsFilters,level,max}' = '1'
      and adjustment #>> '{data,operations,2,data,optionsFilters,traditionFromSelection,castingSource}' = 'WITCH')
union all
select 'war-dreamweb-bolt',
  exists (select 1 from public.item
    where id = 17480 and name = 'Dreamweb Bolt' and content_source_id = 400
      and "group" = 'GENERAL' and meta_data->>'group' = ''
      and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Equipment.aspx?ID=3517')
union all
select 'war-materials',
  (select count(*) = 7 from public.item
    where content_source_id = 400 and uuid in (
      3457441037387738, 266245674514619, 7704425324252029,
      3226333068732319, 7804866039237746, 3859786038237066, 1355131405502684
    ))
  and not exists (
    select 1 from (values
      ('Dreamweb Object (Standard-Grade)', 5, 150, 'GENERAL', '3517', '215', 3457441037387738::bigint),
      ('Dreamweb Object (High-Grade)', 14, 3000, 'GENERAL', '3517', '215', 266245674514619::bigint),
      ('Sloughstone', 0, null::integer, 'MATERIAL', '3515', '208', 7704425324252029::bigint),
      ('Sloughstone Chunk', 0, 500, 'GENERAL', '3515', '208', 3226333068732319::bigint),
      ('Sloughstone Ingot', 0, 5000, 'GENERAL', '3515', '208', 7804866039237746::bigint),
      ('Sloughstone Object (Standard-Grade)', 8, 350, 'GENERAL', '3515', '208', 3859786038237066::bigint),
      ('Sloughstone Object (High-Grade)', 16, 6000, 'GENERAL', '3515', '208', 1355131405502684::bigint)
    ) expected(name, level, gp, item_group, aon_id, page, uuid)
    left join public.item actual on actual.uuid = expected.uuid and actual.content_source_id = 400
    where actual.id is null or actual.name is distinct from expected.name
      or actual.level is distinct from expected.level
      or actual.price::jsonb is distinct from case
        when expected.gp is null then '{}'::jsonb else jsonb_build_object('gp', expected.gp) end
      or actual.bulk is not null or actual."group" is distinct from expected.item_group
      or actual.rarity is distinct from 'RARE'
      or actual.traits is distinct from array[1533]::bigint[]
      or cardinality(actual.operations) is distinct from 0
      or actual.meta_data #>> '{source,book}' is distinct from 'War of Immortals'
      or actual.meta_data #>> '{source,page}' is distinct from expected.page
      or actual.meta_data #>> '{source,url}' is distinct from
        'https://2e.aonprd.com/Equipment.aspx?ID=' || expected.aon_id
  )
  and (select count(*) = 2 from public.item child
    where child.content_source_id = 400
      and child.name in ('Dreamweb Object (Standard-Grade)', 'Dreamweb Object (High-Grade)')
      and left(child.description, length((select description from public.item where id = 17477)))
        = (select description from public.item where id = 17477))
  and (select count(*) = 4 from public.item child
    where child.content_source_id = 400
      and child.name in ('Sloughstone Chunk', 'Sloughstone Ingot',
        'Sloughstone Object (Standard-Grade)', 'Sloughstone Object (High-Grade)')
      and left(child.description, length((select description from public.item
        where content_source_id = 400 and name = 'Sloughstone')))
        = (select description from public.item
          where content_source_id = 400 and name = 'Sloughstone'))
union all
select 'war-apparition-citations',
  (select count(*) = 11 from (values
      (39036, 3, '17'), (39037, 4, '18'), (39038, 5, '18'),
      (39039, 6, '18'), (39040, 7, '19'), (39041, 8, '19'),
      (39042, 9, '19'), (39043, 10, '20'), (39044, 11, '20'),
      (39045, 12, '21'), (39046, 13, '21')
    ) expected(id, aon_id, page)
    join public.ability_block actual on actual.id = expected.id
    where actual.type = 'mode' and actual.content_source_id = 400
      and actual.meta_data #>> '{source,book}' = 'War of Immortals'
      and actual.meta_data #>> '{source,page}' = expected.page
      and actual.meta_data #>> '{source,url}' =
        'https://2e.aonprd.com/Apparitions.aspx?ID=' || expected.aon_id)
  and exists (select 1 from public.trait
    where id = 4092 and name = 'Animist Apparition' and content_source_id = 400
      and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Traits.aspx?ID=837'
      and meta_data #>> '{source,book}' = 'War of Immortals'
      and meta_data #>> '{source,page}' = '216')
union all
select 'war-spell-fields',
  exists (select 1 from public.spell where id = 7314 and name = 'City of Sin'
    and "cast" = '7 days' and description like 'Secondary Casters 2%')
  and exists (select 1 from public.spell where id = 7316 and name = 'Curse of Calamity'
    and "cast" = '3 days' and description like '**Secondary Casters** 3%')
  and exists (select 1 from public.spell where id = 7323 and name = 'Wild Feast'
    and description not like '%[plant](link_trait_2445)%'
    and description like '%[plant](link_trait_1654)%')
  and exists (select 1 from public.spell where id = 7267 and name = 'Manifest Will'
    and traits @> array[1899]::bigint[])
union all
select 'war-spell-details',
  exists (select 1 from public.spell where id = 7288 and name = 'Rainbow''s End'
    and content_source_id = 400 and area = '10-foot emanation'
    and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/MythicSpells.aspx?ID=2160')
  and exists (select 1 from public.spell where id = 7293 and name = 'Trickster''s Feathers'
    and content_source_id = 400 and traits = array[1432,1447,1433,4072]::bigint[]
    and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/MythicSpells.aspx?ID=2165')
  and exists (select 1 from public.spell where id = 7311 and name = 'Spellsurge'
    and content_source_id = 400 and traits = array[1439,1432,4072]::bigint[]
    and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/MythicSpells.aspx?ID=2150')
  and exists (select 1 from public.spell where id = 7313 and name = 'Embodied Font'
    and content_source_id = 400 and cost = 'magic items with a value of at least 2,000 gp'
    and description like '**Primary Check**%'
    and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Rituals.aspx?ID=187')
union all
select 'war-shift-immanence',
  exists (select 1 from public.ability_block where id = 38584 and name = 'Shift Immanence'
    and type = 'feat' and content_source_id = 400 and actions = 'ONE-ACTION'
    and frequency = '' and special like '%free action triggered when you roll initiative%'
    and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Actions.aspx?ID=3030')
union all
select 'war-masterful-vindication',
  exists (select 1 from public.ability_block
    where id = 43770 and name = 'Masterful Vindication' and type = 'feat'
      and content_source_id = 400 and meta_data->'unselectable' = 'true'::jsonb)
  and exists (select 1 from public.ability_block
    where id = 43769 and name = 'Vindication Edge' and type = 'feat'
      and content_source_id = 400
      and operations[2]::jsonb #>> '{data,conditions,0,value}' = '17'
      and operations[2]::jsonb #>> '{data,trueOperations,0,data,value}' = '2')
union all
select 'war-reprint-citations',
  (select count(*) = 14 from (values
    (38746, 4997), (38792, 5832), (39146, 4831), (39271, 4701),
    (39270, 4691), (39277, 8364), (38785, 4783), (39148, 4844),
    (39145, 4796), (39144, 4864), (39147, 4895), (39158, 6101),
    (39278, 5949), (39269, 4669)
  ) expected(id, aon_id)
  join public.ability_block actual on actual.id = expected.id
  where actual.type = 'feat' and actual.content_source_id = 400
    and actual.meta_data->'source' = jsonb_build_object(
      'url', 'https://2e.aonprd.com/Feats.aspx?ID=' || expected.aon_id))
union all
select 'war-bespell-fields',
  exists (select 1 from public.ability_block
    where id = 39157 and name = 'Bespell Strikes' and type = 'feat'
      and content_source_id = 400 and actions = 'FREE-ACTION'
      and frequency = 'once per turn'
      and requirements = 'Your most recent action was to cast a non-cantrip spell')
union all
select 'war-warrior-ranks',
  exists (select 1 from public.class_archetype
    where id = 36 and name = 'Warrior of Legend' and class_id = 20 and content_source_id = 400)
  and (select count(*) = 2 from public.class_archetype c,
      unnest(c.feature_adjustments) feature,
      (values (20764, 'Fighter Weapon Mastery', 8),
              (19270, 'Weapon Legend', 12)) expected(prev_id, name, operation_count)
    where c.id = 36 and c.content_source_id = 400
      and feature->>'type' = 'REPLACE'
      and (feature->>'prev_id')::integer = expected.prev_id
      and feature #>> '{data,name}' = expected.name
      and jsonb_array_length(feature::jsonb #> '{data,operations}') = expected.operation_count
      and not exists (select 1 from jsonb_array_elements(feature::jsonb #> '{data,operations}') op
        where op #>> '{data,variable}' in ('WEAPON_GROUP_SPEAR', 'WEAPON_GROUP_POLEARM')))
  and (select count(*) = 20 and count(distinct expected.op_id) = 20
    from warrior_expected_ops expected
    join public.class_archetype c on c.id = 36 and c.content_source_id = 400
    join lateral unnest(c.feature_adjustments) feature
      on feature->>'type' = 'REPLACE' and (feature->>'prev_id')::integer = expected.prev_id
    join lateral jsonb_array_elements(feature::jsonb #> '{data,operations}') op
      on op->>'id' = expected.op_id and op->>'type' = 'adjValue'
        and op #>> '{data,variable}' = expected.variable
        and op #>> '{data,value,value}' = expected.rank)
union all
select 'war-embedded-activities',
  (select count(*) = 2 from (values
    (51428, 'One Among The Masses', 3826661012936875::bigint,
      51429, 'Overawe Crowd', 6494856751326130::bigint, 'TWO-ACTIONS',
      '9896af20-5cae-46e5-8b46-2fc953f1aa65'),
    (51505, 'Legend of Combat', 8312927930720281::bigint,
      51506, 'Speed of Arms', 45359890581666::bigint, 'REACTION',
      'b1ecc0b7-c64e-4f27-8562-731f24147a4f')
  ) expected(parent_id, parent_name, parent_uuid, child_id, child_name, child_uuid, child_actions, grant_id)
  join public.ability_block parent on parent.id = expected.parent_id
  join public.ability_block child on child.id = expected.child_id
  where parent.name = expected.parent_name and parent.uuid = expected.parent_uuid
    and parent.type = 'feat' and parent.content_source_id = 400
    and cardinality(parent.operations) = 1
    and parent.operations[1]::jsonb = jsonb_build_object(
      'id', expected.grant_id, 'type', 'giveAbilityBlock',
      'data', jsonb_build_object('type', 'feat', 'abilityBlockId', expected.child_id))
    and child.name = expected.child_name and child.uuid = expected.child_uuid
    and child.type = 'feat' and child.content_source_id = 400
    and child.actions = expected.child_actions and cardinality(child.operations) = 0
    and child.meta_data = '{"unselectable":true}'::jsonb)
union all
select 'treasure-vault-sankeit-armor',
  exists (select 1 from public.item
    where id = 12366 and name = 'Sankeit' and content_source_id = 16
      and uuid = 8906569033590767 and "group" = 'ARMOR'
      and level = 0 and bulk = '1' and price::jsonb = '{"gp":5}'::jsonb
      and meta_data #>> '{category}' = 'light'
      and meta_data #>> '{group}' = 'wood'
      and meta_data #>> '{ac_bonus}' = '2'
      and meta_data #>> '{dex_cap}' = '3'
      and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Armor.aspx?ID=74')
union all
select 'war-armor-reprints',
  (select count(*) = 3 from public.item
    where content_source_id = 400
      and uuid in (1142536405766694, 5866771262234991, 3406841990572783))
  and not exists (
    select 1 from (values
      (1142536405766694, 'Lattice Armor', 'https://2e.aonprd.com/Armor.aspx?ID=54',
        '5c18ad68c44d03df372627399262aa81', '2', 6, 'medium', 'chain', 4, 1, -2, -5, 3, '{}'::bigint[]),
      (5866771262234991, 'Niyaháat', 'https://2e.aonprd.com/Armor.aspx?ID=55',
        'baff9d0c71cdfb04254ee9c8ca068e62', '2', 5, 'medium', 'skeletal', 3, 2, -2, -5, 2, array[2860]::bigint[]),
      (3406841990572783, 'Sankeit', 'https://2e.aonprd.com/Armor.aspx?ID=53',
        '80486dabc8d4d955181faac119e1dff2', '1', 5, 'light', 'wood', 2, 3, -1, 0, 1, array[2860]::bigint[])
    ) expected(war_uuid, name, war_url, description_md5, bulk, price_gp,
      category, armor_group, ac_bonus, dex_cap, check_penalty, speed_penalty, strength, traits)
    left join public.item actual on actual.uuid = expected.war_uuid
      and actual.content_source_id = 400
    where actual.id is null
      or actual.name is distinct from expected.name
      or actual."group" is distinct from 'ARMOR'
      or actual.level is distinct from 0
      or actual.rarity is distinct from 'COMMON'
      or actual.size is distinct from 'MEDIUM'
      or actual.bulk is distinct from expected.bulk
      -- The newer Lattice price repair requires 9 gp; this bootstrap/replay gate recognizes only 6/9.
      or case when expected.war_uuid = 1142536405766694 then
        actual.price::jsonb is distinct from '{"gp":6}'::jsonb
          and actual.price::jsonb is distinct from '{"gp":9}'::jsonb
        else actual.price::jsonb is distinct from jsonb_build_object('gp', expected.price_gp) end
      or actual.traits is distinct from expected.traits
      or md5(actual.description) is distinct from expected.description_md5
      or actual.meta_data->'source' is distinct from jsonb_build_object(
        'url', expected.war_url, 'book', 'War of Immortals', 'page', '146')
      or actual.meta_data #>> '{category}' is distinct from expected.category
      or actual.meta_data #>> '{group}' is distinct from expected.armor_group
      or (actual.meta_data->>'ac_bonus')::integer is distinct from expected.ac_bonus
      or (actual.meta_data->>'dex_cap')::integer is distinct from expected.dex_cap
      or (actual.meta_data->>'check_penalty')::integer is distinct from expected.check_penalty
      or (actual.meta_data->>'speed_penalty')::integer is distinct from expected.speed_penalty
      or (actual.meta_data->>'strength')::integer is distinct from expected.strength
      or actual.operations is not null
  )
union all
select 'war-restless-epithet',
  exists (select 1 from public.ability_block
    where id = 38691 and name = 'Dominion Epithet' and type = 'class-feature'
      and content_source_id = 400 and cardinality(operations) = 1
      and operations[1] #>> '{id}' = '0ce089ed-74cb-4051-b24b-eec5a5070614'
      and operations[1] #>> '{data,optionsPredefined,4,id}' = '18a731d1-6507-461d-9f40-3081ee17e04c'
      and operations[1] #>> '{data,optionsPredefined,4,title}' = 'Restless as the Tides'
      and operations[1] #>> '{data,optionsPredefined,4,operations,1,id}' =
        '6b05ec0d-238b-45b7-bebc-27f25dc460f1'
      and operations[1] #>> '{data,optionsPredefined,4,operations,1,data,id}' = '38705'
      and operations[1] #>> '{data,optionsPredefined,4,operations,1,data,text}'
        like '**Dominion Epithet—Restless as the Tides**%')
union all
select 'treasure-vault-dragonprism-links',
  exists (select 1 from public.item
    where id = 11940 and name = 'Dragonprism Staff' and content_source_id = 16
      and uuid = 982148341471611
      and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Equipment.aspx?ID=4784'
      and md5(description) = '8098f54e420d89eadfb852aae690b8c3')
union all
select 'war-content-links',
  not exists (
    select 1 from war_records record,
      lateral regexp_matches(record.body::text, 'link_([a-z-]+)_([0-9]+)', 'g') link
    where not (
      (link[1] in ('action', 'class-feature', 'feat', 'heritage', 'sense', 'mode', 'physical-feature', 'ability-block')
        and exists (select 1 from public.ability_block target
          where target.id = link[2]::bigint and (link[1] = 'ability-block' or target.type = link[1])))
      or (link[1] = 'item' and exists (select 1 from public.item target where target.id = link[2]::bigint))
      or (link[1] = 'spell' and exists (select 1 from public.spell target where target.id = link[2]::bigint))
      or (link[1] = 'trait' and exists (select 1 from public.trait target where target.id = link[2]::bigint))
      or (link[1] = 'class' and exists (select 1 from public.class target where target.id = link[2]::bigint))
      or (link[1] = 'archetype' and exists (select 1 from public.archetype target where target.id = link[2]::bigint))
      or (link[1] = 'versatile-heritage' and exists
        (select 1 from public.versatile_heritage target where target.id = link[2]::bigint))
      or (link[1] = 'class-archetype' and exists
        (select 1 from public.class_archetype target where target.id = link[2]::bigint))
      or (link[1] = 'creature' and exists (select 1 from public.creature target where target.id = link[2]::bigint))
      or (link[1] = 'ancestry' and exists (select 1 from public.ancestry target where target.id = link[2]::bigint))
      or (link[1] = 'background' and exists (select 1 from public.background target where target.id = link[2]::bigint))
      or (link[1] = 'language' and exists (select 1 from public.language target where target.id = link[2]::bigint))
      or (link[1] = 'content-source' and exists
        (select 1 from public.content_source target where target.id = link[2]::bigint))
    )
  )
union all
select 'war-operation-references',
  not exists (
    with operation_refs as (
      select 'ability-block' as target_type, (operation->>'abilityBlockId')::bigint as target_id,
             operation->>'type' as expected_type
        from war_records record,
          lateral jsonb_path_query(record.body, '$.** ? (exists (@.abilityBlockId))') operation
      union all
      select 'spell', trim(both '"' from target::text)::bigint, null::text
        from war_records record, lateral jsonb_path_query(record.body, '$.**.spellId') target
      union all
      select 'item', trim(both '"' from target::text)::bigint, null::text
        from war_records record, lateral jsonb_path_query(record.body, '$.**.itemId') target
      union all
      select 'trait', trim(both '"' from target::text)::bigint, null::text
        from war_records record, lateral jsonb_path_query(record.body, '$.**.traitId') target
    )
    select 1 from operation_refs ref where not (
      (ref.target_type = 'ability-block' and exists
        (select 1 from public.ability_block target
          where target.id = ref.target_id and target.type = ref.expected_type))
      or (ref.target_type = 'spell' and exists
        (select 1 from public.spell target where target.id = ref.target_id))
      or (ref.target_type = 'item' and exists
        (select 1 from public.item target where target.id = ref.target_id))
      or (ref.target_type = 'trait' and exists
        (select 1 from public.trait target where target.id = ref.target_id))
    )
  )
)
select original_checks.id,case when original_checks.id='treasure-vault-dragonprism-links' and coalesce((status.value->>'recognized')::boolean,true) then coalesce((status.value->>'passed')::boolean,false) else original_checks.passed end as passed from original_checks cross join terminal_status status;
