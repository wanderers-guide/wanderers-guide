do $add$
begin
  if not exists (
    select 1 from public.content_source
    where id = 400 and name = 'War of Immortals' and is_published
  ) then
    raise exception 'War of Immortals source is missing or unpublished';
  end if;

  if exists (
    select 1 from public.content_update
    where content_source_id = 400 and type = 'item' and status->>'state' = 'PENDING'
  ) then
    raise exception 'War of Immortals has a pending item submission';
  end if;

  if exists (
    select 1 from public.item
    where (content_source_id = 400 and lower(name) in (
      'rattan armor', 'shard of self-destruction', 'wandering pipe'
    ))
      or meta_data->'source'->>'url' in (
        'https://2e.aonprd.com/Armor.aspx?ID=52',
        'https://2e.aonprd.com/Equipment.aspx?ID=3516',
        'https://2e.aonprd.com/Equipment.aspx?ID=3513'
      )
  ) then
    raise exception 'A War of Immortals item was added after this audit';
  end if;

  if not exists (select 1 from public.item where id = 6854 and name = 'Dagger' and "group" = 'WEAPON')
     or not exists (select 1 from public.trait where id = 2879 and name = 'Aquadynamic')
     or not exists (select 1 from public.trait where id = 1558 and name = 'Cursed')
     or not exists (select 1 from public.trait where id = 1568 and name = 'Artifact')
     or not exists (select 1 from public.trait where id = 1527 and name = 'Invested')
     or not exists (select 1 from public.trait where id = 1504 and name = 'Magical')
     or not exists (select 1 from public.trait where id = 4072 and name = 'Mythic') then
    raise exception 'A required item base or trait has changed';
  end if;

  insert into public.item (
    name, bulk, level, rarity, description, "group", hands, size, craft_requirements,
    usage, meta_data, operations, content_source_id, version, uuid, price, traits
  ) values (
    'Rattan Armor', '1', 0, 'COMMON',
    $wgdesc$This armor is made from rattan reeds bent and woven into shaped layers, then treated with oil to harden them. Its construction makes it naturally buoyant, so it doesn't hinder its wearer when moving through water.$wgdesc$,
    'ARMOR', null, 'MEDIUM', null, '',
    jsonb_build_object(
      'image_url', '', 'bulk', '{}'::jsonb, 'charges', '{}'::jsonb,
      'foundry', '{}'::jsonb, 'starfinder', jsonb_build_object('slots', '[]'::jsonb),
      'material', '{}'::jsonb, 'runes', jsonb_build_object('property', '[]'::jsonb),
      'damage', jsonb_build_object('damageType', '', 'dice', '', 'die', null, 'extra', ''),
      'category', 'light', 'group', 'wood', 'ac_bonus', 1, 'dex_cap', 4,
      'check_penalty', -1, 'speed_penalty', 0, 'strength', 0,
      'hardness', 0, 'hp_max', 0, 'broken_threshold', 0,
      'quantity', 1, 'is_shoddy', false, 'unselectable', false,
      'source', jsonb_build_object(
        'url', 'https://2e.aonprd.com/Armor.aspx?ID=52',
        'book', 'War of Immortals', 'page', '146'
      )
    ),
    '{}'::json[], 400, '1.0', 6217033776854047, '{"gp":2}'::json, array[2879]::bigint[]
  );

  insert into public.item (
    name, bulk, level, rarity, description, "group", hands, size, craft_requirements,
    usage, meta_data, operations, content_source_id, version, uuid, price, traits
  ) values (
    'Shard of Self-Destruction', '0.1', 5, 'RARE',
    $wgdesc$This jagged bone shard functions as a [+1](link_item_7950) [striking](link_item_7862) [dagger](link_item_6854). Its edge is perpetually stained with blood. Whenever you critically hit with the weapon, you deal an additional 1d6 persistent bleed damage, but you also take 1d6 persistent bleed damage.

You take a –2 penalty to the flat check to remove this bleed damage. When you succeed at that flat check, you are exposed to Verex's ruin as the injury becomes red and inflamed, with blood vessels swelling and discoloring. Once the curse activates for the first time, the weapon fuses to you. You can sheathe the [dagger](link_item_6854) outside combat, but it appears in your hand when a fight begins, and you can't sheathe it while you perceive an enemy.

**Verex's Ruin** ([disease](link_trait_1857), [unholy](link_trait_1846)) **Saving Throw** DC 22 Fortitude; **Onset** 1 hour; **Stage 1** enfeebled 1 (1 day); **Stage 2** enfeebled 2, fatigued, and 1d6 [spirit](link_trait_1556) damage each time you would take persistent bleed damage (1 week); **Stage 3** as stage 2, but the [spirit](link_trait_1556) damage increases to 2d6 (1 week); **Stage 4** enfeebled 3, fatigued, and 4d6 [spirit](link_trait_1556) damage each time you would take persistent bleed damage (1 week); **Stage 5** death$wgdesc$,
    'WEAPON', '1', 'MEDIUM', null, 'held in 1 hand',
    jsonb_build_object(
      'image_url', '', 'bulk', '{}'::jsonb, 'charges', '{}'::jsonb,
      'foundry', '{}'::jsonb, 'starfinder', jsonb_build_object('slots', '[]'::jsonb),
      'material', '{}'::jsonb,
      'runes', jsonb_build_object('potency', 1, 'striking', 1, 'property', '[]'::jsonb),
      'damage', jsonb_build_object('damageType', 'piercing', 'dice', 1, 'die', 'd4', 'extra', ''),
      'category', 'simple', 'group', 'knife', 'base_item', 'dagger',
      'hardness', 5, 'hp_max', 20, 'broken_threshold', 10,
      'quantity', 1, 'is_shoddy', false, 'unselectable', false,
      'source', jsonb_build_object(
        'url', 'https://2e.aonprd.com/Equipment.aspx?ID=3516',
        'book', 'War of Immortals', 'page', '208'
      )
    ),
    '{}'::json[], 400, '1.0', 7611178820435355, '{}'::json, array[1558,1504]::bigint[]
  );

  insert into public.item (
    name, bulk, level, rarity, description, "group", hands, size, craft_requirements,
    usage, meta_data, operations, content_source_id, version, uuid, price, traits
  ) values (
    'Wandering Pipe', '0', 11, 'UNIQUE',
    $wgdesc$This long-stemmed pipe always emits a thin plume of smoke, even when it isn't lit or in use. Accounts disagree on its material: polished oak, ebony, stone, or even ice that somehow holds a flame. Though it isn't intelligent, the pipe is said to leave the possession of mortals whose lives aren't exciting enough, only to find its way back to its true owner.

When held in one hand, the pipe grants you a +2 circumstance bonus to Deception checks, but its smoke imposes a –1 circumstance penalty to Stealth checks to [Hide](link_action_19726) or [Sneak](link_action_19850).

**Activate—Smoky Protections** <abbr cost="TWO-ACTIONS" class="action-symbol">2</abbr> ([concentrate](link_trait_1432), [manipulate](link_trait_1433), [primal](link_trait_1454)); **Cost** 1 Mythic Point; **Frequency** once per day; **Effect** For 10 minutes, smoke gathers around you, buoying your steps and protecting you. You gain a fly Speed equal to your land Speed, automatically hover in place, and have concealment from ranged attacks.

**Destruction** The wandering pipe can be broken as easily as any wooden pipe, but it always reforms in the hands of the Immortal Trickster or one of his bonded mortals. Only an honest bonded mortal acting with good intent can break it permanently; doing so is said to weaken the Trickster significantly.$wgdesc$,
    'GENERAL', '1', 'MEDIUM', null, 'held in 1 hand',
    jsonb_build_object(
      'image_url', '', 'bulk', '{}'::jsonb, 'charges', '{}'::jsonb,
      'foundry', '{}'::jsonb, 'starfinder', jsonb_build_object('slots', '[]'::jsonb),
      'material', '{}'::jsonb, 'runes', jsonb_build_object('property', '[]'::jsonb),
      'damage', jsonb_build_object('damageType', '', 'dice', 1, 'die', '', 'extra', ''),
      'quantity', 1, 'is_shoddy', false, 'unselectable', false,
      'source', jsonb_build_object(
        'url', 'https://2e.aonprd.com/Equipment.aspx?ID=3513',
        'book', 'War of Immortals', 'page', '184'
      )
    ),
    array[
      json_build_object(
        'id', '8e5c7147-8405-4b9d-a368-25941b669b92',
        'type', 'addBonusToValue',
        'data', json_build_object(
          'variable', 'SKILL_DECEPTION', 'value', 2, 'type', 'circumstance',
          'text', 'to Deception checks while holding the wandering pipe'
        )
      ),
      json_build_object(
        'id', '280cb48d-c991-48ee-acd5-c4939cd26246',
        'type', 'addBonusToValue',
        'data', json_build_object(
          'variable', 'SKILL_STEALTH', 'value', -1, 'type', 'circumstance',
          'text', 'to Hide or Sneak checks while holding the wandering pipe'
        )
      )
    ],
    400, '1.0', 2644622431749501, '{}'::json,
    array[1568,1527,1504,4072]::bigint[]
  );
end
$add$;
