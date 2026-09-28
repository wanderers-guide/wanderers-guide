do $repair$
declare
  original json[];
  original_metadata jsonb;
  operation jsonb;
  operation_index integer;
  old_filter constant jsonb := '{"id":"c5049c9b-d105-452b-b7f4-5216fcbd797f","type":"ADJ_VALUE","group":"WEAPON","value":{"value":"T"}}'::jsonb;
  new_filter constant jsonb := '{"id":"c5049c9b-d105-452b-b7f4-5216fcbd797f","type":"ADJ_VALUE","group":"WEAPON","value":{"value":"T"},"addToFamiliarity":true,"familiarityCategories":["advanced"]}'::jsonb;
  class_citation constant jsonb := '{"url":"https://2e.aonprd.com/Archetypes.aspx?ID=285","book":"War of Immortals","page":"64"}'::jsonb;
begin
  select operations, meta_data into original, original_metadata from public.class_archetype
   where id = 30 and name = 'Vindicator' and class_id = 24 and content_source_id = 400
   for update;
  if not found then raise exception 'Missing or changed Vindicator class archetype'; end if;
  if (select count(*) from unnest(original) entry
       where entry->>'id' = 'c4a75d49-19e5-4983-8757-d5caf473627b') <> 1 then
    raise exception 'Missing or duplicate Vindicator favored-weapon selection';
  end if;
  select entry::jsonb, ordinal::integer into operation, operation_index
    from unnest(original) with ordinality as entries(entry, ordinal)
   where entry->>'id' = 'c4a75d49-19e5-4983-8757-d5caf473627b';
  if operation->>'type' <> 'select'
     or operation #>> '{data,title}' <> 'Select Deity Weapon'
     or operation #>> '{data,modeType}' <> 'FILTERED'
     or operation #>> '{data,optionType}' <> 'ADJ_VALUE' then
    raise exception 'Changed Vindicator favored-weapon selection';
  end if;
  if operation #> '{data,optionsFilters}' = new_filter then
    null;
  elsif operation #> '{data,optionsFilters}' = old_filter then
    if exists (select 1 from public.content_update
      where type = 'class-archetype' and ref_id = 30 and status->>'state' = 'PENDING') then
      raise exception 'Vindicator class archetype has a pending curator submission';
    end if;
    update public.class_archetype
       set operations[operation_index] = jsonb_set(operation, '{data,optionsFilters}', new_filter, false)::json
     where id = 30;
  else
    raise exception 'Changed Vindicator favored-weapon filter';
  end if;
  if original_metadata->'source' = class_citation then
    null;
  elsif original_metadata->'source' is null or original_metadata->'source' = 'null'::jsonb then
    if exists (select 1 from public.content_update
      where type = 'class-archetype' and ref_id = 30 and status->>'state' = 'PENDING') then
      raise exception 'Vindicator class archetype has a pending curator submission';
    end if;
    update public.class_archetype
       set meta_data = jsonb_set(coalesce(meta_data, '{}'::jsonb), '{source}', class_citation, true)
     where id = 30;
  else
    raise exception 'Changed Vindicator class archetype citation';
  end if;
end
$repair$;

do $repair$
declare
  feat public.ability_block%rowtype;
  updated_name constant text := 'Silence the Profane (Vindicator)';
  updated_trigger constant text := 'A creature you can observe within reach of your deity’s favored weapon casts a spell.';
  updated_requirements constant text := 'You are wielding your deity’s favored weapon.';
  updated_description constant text := 'Your training included instruction on how to prevent enemy priests from using their magic against you, a technique you have mastered and adapted. Make a [Strike](link_action_19856) with your deity’s favored weapon against the triggering creature. On a success, the target is off-guard until the end of your next turn. The triggering spell is disrupted on a critical success, or on a success if the target is your [hunted prey](link_feat_19728) and the spell is a [divine](link_trait_1475) spell.';
  updated_special constant text := 'If your deity’s favored weapon is a ranged weapon, this reaction can trigger if the target is within its first range increment and you can make a ranged Strike instead of a melee Strike.';
  updated_citation constant jsonb := '{"url":"https://2e.aonprd.com/Feats.aspx?ID=7258","book":"War of Immortals","page":"65"}'::jsonb;
begin
  select * into feat from public.ability_block
   where id = 39273 and type = 'feat' and content_source_id = 400
   for update;
  if not found then raise exception 'Missing Vindicator reaction feat'; end if;
  if feat.level <> 8 or feat.actions <> 'REACTION' or feat.rarity <> 'COMMON'
     or feat.prerequisites <> array['Vindicator Dedication']::varchar[]
     or feat.traits <> array[4140]::bigint[] or cardinality(feat.operations) <> 0 then
    raise exception 'Changed Vindicator reaction feat scaffolding';
  end if;
  if feat.name = updated_name then
    if feat.uuid <> 2351793770437190 or feat."trigger" <> updated_trigger
       or feat.requirements <> updated_requirements
       or feat.description <> updated_description or feat.special <> updated_special
       or feat.meta_data->'source' <> updated_citation then
      raise exception 'Partially changed Vindicator reaction feat';
    end if;
  elsif feat.name = 'Disrupt Opposed Magic'
     and feat.uuid = 2300543738305504
     and feat."trigger" = 'A creature you can observe within your reach, or within your weapon’s first range increment if you are wielding a ranged weapon, Casts a Spell.'
     and feat.requirements = 'You are wielding your deity’s favored weapon.'
     and feat.description = 'Your training included instruction on how to prevent enemy spellcasters from using their prayers against you. Make a [Strike](link_action_19856) with the required weapon against the opponent; if the [Strike](link_action_19856) is successful, the triggering spell is disrupted.'
     and feat.special = ''
     and (feat.meta_data->'source' is null or feat.meta_data->'source' = 'null'::jsonb) then
    if exists (select 1 from public.content_update
      where type = 'ability-block' and ref_id = 39273 and status->>'state' = 'PENDING') then
      raise exception 'Vindicator reaction feat has a pending curator submission';
    end if;
    if exists (select 1 from public.ability_block where uuid = 2351793770437190 and id <> 39273) then
      raise exception 'Vindicator reaction feat UUID already exists';
    end if;
    update public.ability_block
       set name = updated_name,
           uuid = 2351793770437190,
           "trigger" = updated_trigger,
           requirements = updated_requirements,
           description = updated_description,
           special = updated_special,
           meta_data = jsonb_set(coalesce(meta_data, '{}'::jsonb), '{source}', updated_citation, true)
     where id = 39273;
  else
    raise exception 'Changed Vindicator reaction feat; review before repair';
  end if;
end
$repair$;
