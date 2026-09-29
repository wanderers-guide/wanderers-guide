with expected(uuid, name, level, page, aon_id, hp, skill, skill_bonus, trait_ids, attack_names, ability_names) as (
  values
    (6013160830717984::bigint, 'Mythic Gogiteth', 12, '170', 3400, 250,
      'SKILL_STEALTH', '+11', '[2427,4072]'::jsonb,
      '["Jaws","Leg"]'::jsonb,
      '["All-Around Vision","Mythic Resilience","Hazard Immunity","Skittering Reposition","Carry Off Prey","Constrict","Skittering Assault","Improved Grab","Mythic Power","Mythic Skill","Remove a Condition"]'::jsonb),
    (2709413115764620::bigint, 'Mythic Ogre Boss', 7, '171', 3401, 130,
      'SKILL_ATHLETICS', '+4', '[2431,2399,4072]'::jsonb,
      '["Ogre Hook","Javelin"]'::jsonb,
      '["Titanic Might","Mythic Resistance","Mythic Ferocity","Reactive Strike","Bellowing Command","Mythic Power","Mythic Skill","Sweeping Hook"]'::jsonb),
    (4237591398100435::bigint, 'Mythic Lich', 12, '172', 3402, 190,
      null::text, null::text, '[2425,4214,4072]'::jsonb,
      '["Hand"]'::jsonb,
      '["Mythic Resilience","Frightful Presence","Counterspell","Rejuvenation","Void Healing","Drain Soul Cage","Mythic Power","Recharge Spell","Remove a Condition","Siphon Life","Steady Spellcasting"]'::jsonb),
    (3169015473517639::bigint, 'Mythic Griffon', 4, '173', 3403, 60,
      'SKILL_ACROBATICS', '+6', '[2409,4072]'::jsonb,
      '["Beak","Talon","Wing"]'::jsonb,
      '["Deadly Striker","Flying Strafe","Mythic Power","Mythic Skill","Pounce","Regal Shriek","Unimpeded"]'::jsonb)
), checked as (
  select e.name, exists (
    select 1 from public.creature c
    where c.uuid = e.uuid
      and c.name = e.name
      and c.level = e.level
      and c.rarity = 'RARE'
      and c.type = 'creature'
      and c.content_source_id = 400
      and c.deprecated = false
      and c.hp_current = e.hp
      and c.hp_temp = 0
      and c.stamina_current = 0
      and c.resolve_current = 0
      and c.meta_data::jsonb->'source' = jsonb_build_object(
        'book', 'War of Immortals', 'page', e.page,
        'url', 'https://2e.aonprd.com/Monsters.aspx?ID=' || e.aon_id
      )
      and jsonb_array_length(c.meta_data::jsonb #> '{stat_block,listed_skills}') > 0
      and length(c.meta_data::jsonb #>> '{stat_block,recall_knowledge}') > 20
      and length(c.details::jsonb->>'description') > 70
      and not (c.details::text ~ '@Check|@Template|AllAroundVision|NegativeHealing')
      and (select coalesce(jsonb_agg((op::jsonb->'data'->'traitId')::integer order by n), '[]'::jsonb)
           from unnest(c.operations) with ordinality as operations(op, n)
           where op::jsonb->>'type' = 'giveTrait') @> e.trait_ids
      and (e.skill is null or exists (
        select 1 from unnest(c.operations) op
        where op::jsonb->>'type' = 'addBonusToValue'
          and op::jsonb->'data'->>'variable' = e.skill
          and op::jsonb->'data'->>'value' = e.skill_bonus
      ))
      and (select jsonb_agg(item->'item'->>'name' order by n)
           from jsonb_array_elements(c.inventory::jsonb->'items') with ordinality as inventory(item, n)
           where item->'item'->>'name' = any(select value from jsonb_array_elements_text(e.attack_names))) = e.attack_names
      and (select jsonb_agg(ability::jsonb->>'name' order by n)
           from unnest(c.abilities_base) with ordinality as abilities(ability, n)) = e.ability_names
      and not exists (
        select 1 from unnest(c.abilities_base) ability
        where ability::jsonb->>'description' ~ '@Check|@Template|AllAroundVision|NegativeHealing|ImprovedGrab'
          or ability::jsonb->'meta_data'->'source' is distinct from c.meta_data::jsonb->'source'
      )
  ) as passed from expected e
)
select 'war-mythic-variant-' || name as id, passed from checked
union all
select 'war-mythic-variant-count', count(*) = 4
from public.creature
where content_source_id = 400 and name in (
  'Mythic Gogiteth', 'Mythic Ogre Boss', 'Mythic Lich', 'Mythic Griffon'
)
union all
select 'war-mythic-ogre-equipment', exists (
  select 1 from public.creature c
  where c.uuid = 2709413115764620
    and exists (select 1 from jsonb_array_elements(c.inventory::jsonb->'items') i
      where i->'item'->>'name' = 'Breastplate' and (i->'item'->>'id')::bigint = 6765)
    and exists (select 1 from jsonb_array_elements(c.inventory::jsonb->'items') i
      where i->'item'->>'name' = 'Javelin' and i->'item'->'meta_data'->>'quantity' = '6')
)
union all
select 'war-mythic-lich-equipment-spells', exists (
  select 1 from public.creature c
  where c.uuid = 4237591398100435
    and (select jsonb_agg((i->'item'->>'id')::bigint order by (i->'item'->>'id')::bigint)
         from jsonb_array_elements(c.inventory::jsonb->'items') i
         where (i->'item'->>'id')::bigint in (7830, 7734, 7051)) = '[7051,7734,7830]'::jsonb
    and jsonb_array_length(c.spells::jsonb->'slots') = 28
    and (select count(*) from jsonb_array_elements(c.spells::jsonb->'slots') s
         where s->>'rank' = '5' and s->>'spell_id' = '4663') = 2
    and (select count(*) from jsonb_array_elements(c.spells::jsonb->'slots') s
         where s->>'rank' = '1' and s->>'spell_id' = '4599') = 2
    and exists (select 1 from unnest(c.operations) op
      where op::jsonb->>'type' = 'defineCastingSource'
        and op::jsonb->'data'->>'value' = 'ARCANE_PREPARED_SPELLS:::PREPARED-TRADITION:::ARCANE:::ATTRIBUTE_INT')
    and not exists (select 1 from unnest(c.operations) op
      where op::jsonb->'data'->>'text' = '+1 status to all saves vs. vitality')
);
