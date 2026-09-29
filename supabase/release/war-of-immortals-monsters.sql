create temporary table war_monster_expected (
  uuid bigint primary key,
  name text not null,
  level integer not null,
  rarity text not null,
  page text not null,
  url text not null
);

insert into war_monster_expected (uuid, name, level, rarity, page, url) values
  (6013160830717984, 'Mythic Gogiteth', 12, 'RARE', '170', 'https://2e.aonprd.com/Monsters.aspx?ID=3400'),
  (2709413115764620, 'Mythic Ogre Boss', 7, 'RARE', '171', 'https://2e.aonprd.com/Monsters.aspx?ID=3401'),
  (4237591398100435, 'Mythic Lich', 12, 'RARE', '172', 'https://2e.aonprd.com/Monsters.aspx?ID=3402'),
  (3169015473517639, 'Mythic Griffon', 4, 'RARE', '173', 'https://2e.aonprd.com/Monsters.aspx?ID=3403'),
  (4812683280104077, 'Vulot', 21, 'UNIQUE', '177', 'https://2e.aonprd.com/Monsters.aspx?ID=3404'),
  (4509376621863460, 'Immortal Trickster', 11, 'UNIQUE', '183', 'https://2e.aonprd.com/Monsters.aspx?ID=3405'),
  (6892231756030293, 'Agyra', 23, 'UNIQUE', '189', 'https://2e.aonprd.com/Monsters.aspx?ID=3406'),
  (6724325327115429, 'Oliphaunt of Jandelay', 25, 'UNIQUE', '195', 'https://2e.aonprd.com/Monsters.aspx?ID=3407'),
  (8402624232398678, 'Sublime Breath', 6, 'UNIQUE', '201', 'https://2e.aonprd.com/Monsters.aspx?ID=3408'),
  (8784846156440862, 'Verex-That-Was', 24, 'UNIQUE', '207', 'https://2e.aonprd.com/Monsters.aspx?ID=3409'),
  (3704851072954059, 'Weaver of Webs', 15, 'UNIQUE', '214', 'https://2e.aonprd.com/Monsters.aspx?ID=3410');

select 'war-monsters-source' as id,
  (select count(*) = 11 from war_monster_expected)
  and (select count(*) = 11 from public.creature where content_source_id = 400 and type = 'creature')
  and not exists (
    select 1 from war_monster_expected expected
    left join public.creature actual on actual.uuid = expected.uuid
    where actual.id is null
      or actual.name is distinct from expected.name
      or actual.level is distinct from expected.level
      or actual.rarity is distinct from expected.rarity
      or actual.content_source_id is distinct from 400
      or actual.type is distinct from 'creature'
      or actual.meta_data #>> '{source,book}' is distinct from 'War of Immortals'
      or actual.meta_data #>> '{source,page}' is distinct from expected.page
      or actual.meta_data #>> '{source,url}' is distinct from expected.url
  ) as passed;

select 'war-monsters-stat-blocks' as id,
  not exists (
    select 1 from public.creature actual
    join war_monster_expected expected on expected.uuid = actual.uuid
    where actual.hp_current is null
      or actual.hp_temp is null
      or actual.stamina_current is null
      or actual.resolve_current is null
      or actual.inventory is null
      or actual.operations is null
      or cardinality(actual.operations) = 0
      or actual.abilities_base is null
      or cardinality(actual.abilities_base) = 0
      or jsonb_typeof(actual.meta_data::jsonb #> '{stat_block,listed_senses}') is distinct from 'array'
      or jsonb_typeof(actual.meta_data::jsonb #> '{stat_block,listed_skills}') is distinct from 'array'
      or not exists (
        select 1 from unnest(actual.operations) operation
        where operation::jsonb->>'type' = 'giveTrait'
          and operation::jsonb #>> '{data,traitId}' = '4072'
      )
      or not exists (
        select 1 from unnest(actual.abilities_base) ability
        where lower(ability::jsonb->>'name') = 'mythic power'
      )
  ) as passed;

select 'war-monsters-kaiju' as id,
  (select count(*) = 1 from public.trait
    where uuid = 7063249107400705
      and name = 'Kaiju'
      and content_source_id = 3
      and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Traits.aspx?ID=383')
  and exists (
    select 1 from public.creature creature
    cross join lateral unnest(creature.operations) operation
    join public.trait trait on trait.id = (operation::jsonb #>> '{data,traitId}')::bigint
    where creature.uuid = 6892231756030293
      and operation::jsonb->>'type' = 'giveTrait'
      and trait.uuid = 7063249107400705
  ) as passed;

select 'war-monsters-mythic-trait' as id,
  (select count(*) = 1 from public.trait
    where id = 4072
      and uuid = 4605683250679547
      and name = 'Mythic'
      and content_source_id = 400
      and meta_data->>'creature_trait' = 'true') as passed;

select 'war-monsters-count' as id,
  (select meta_data #>> '{counts,creature}' = '11'
   from public.content_source where id = 400 and name = 'War of Immortals') as passed;

select 'war-monsters-clean-text' as id,
  not exists (
    select 1 from public.creature actual
    join war_monster_expected expected on expected.uuid = actual.uuid
    where coalesce(actual.details::text, '') || coalesce(to_jsonb(actual.abilities_base)::text, '')
      ~* '(@UUID|@Check|@Template|\[\[)'
  ) as passed;
