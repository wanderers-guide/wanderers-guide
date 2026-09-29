do $variants$
declare
  entries constant jsonb := $entries$
  [
    {
      "name": "Mythic Gogiteth",
      "uuid": 6013160830717984,
      "level": 12,
      "template_id": 10097,
      "template_name": "Gogiteth",
      "template_uuid": 5424724055360995,
      "page": "170",
      "url": "https://2e.aonprd.com/Monsters.aspx?ID=3400",
      "description": "A mythic gogiteth stalks its prey in unnatural silence. Its many eyes and long, grasping legs make it an especially dangerous ambusher in the Darklands. The blood of a fallen god can grant such a creature mythic power, though other sinister patrons might do the same.",
      "stat_block": {
        "listed_senses": ["darkvision"],
        "languages_note": "can't speak any language",
        "skills_note": "+24 to Track",
        "listed_skills": ["SKILL_ACROBATICS", "SKILL_ATHLETICS", "SKILL_STEALTH", "SKILL_SURVIVAL"],
        "defenses_note": "mythic resilience (Ref and Will)",
        "recall_knowledge": "DC 35 (includes +5 from Rare); [Aberration](link_trait_2427) (Occultism)"
      },
      "skill_variable": "SKILL_STEALTH",
      "old_skill_bonus": "+4",
      "new_skill_bonus": "+11",
      "mythic_op_id": "062cb23a-b378-4344-9b0b-0d6ddd22fe04",
      "abilities": [
        {"name":"All-Around Vision","description":"The gogiteth can see in every direction and can't be flanked."},
        {"name":"Mythic Resilience","description":"On Reflex and Will saves, the gogiteth treats its result as one degree of success better. This doesn't stack with other degree-shifting effects, except for the normal effect of a natural 1 or 20."},
        {"name":"Hazard Immunity","description":"The gogiteth doesn't trigger reactions from hazards in its own lair and is immune to harmful area effects created by those hazards."},
        {"name":"Skittering Reposition","actions":"REACTION","traits":[1505],"trigger":"A creature that started moving outside the gogiteth's reach moves into its reach.","description":"The gogiteth moves 10 feet without triggering reactions."},
        {"name":"Carry Off Prey","description":"The gogiteth can move at full Speed while a creature is grabbed in its jaws, carrying that creature along."},
        {"name":"Constrict","actions":"ONE-ACTION","description":"The gogiteth deals 3d6+12 bludgeoning damage to any number of creatures it has grabbed or restrained. Each creature attempts a DC 32 basic Fortitude save."},
        {"name":"Skittering Assault","actions":"TWO-ACTIONS","description":"The gogiteth [Strides](link_action_19855) three times. During each [Stride](link_action_19855), it can make one leg [Strike](link_action_19856) against a different creature in reach. It applies its multiple attack penalty only after all these [Strikes](link_action_19856). The activity ends if any [Strike](link_action_19856) is a critical failure."},
        {"name":"Improved Grab","actions":"FREE-ACTION","trigger":"The gogiteth hits with its jaws [Strike](link_action_19856).","description":"The gogiteth grabs the target with its jaws. It must spend an action to extend the grab beyond the end of its next turn."},
        {"name":"Mythic Power","description":"The gogiteth has a pool of 3 Mythic Points to spend on its mythic abilities."},
        {"name":"Mythic Skill","actions":"FREE-ACTION","cost":"1 Mythic Point","description":"The gogiteth's next Athletics or Stealth check gains a +4 bonus and uses mythic proficiency for that check."},
        {"name":"Remove a Condition","actions":"ONE-ACTION","traits":[1432],"cost":"1 Mythic Point","description":"The gogiteth ends one condition affecting it."}
      ]
    },
    {
      "name": "Mythic Ogre Boss",
      "uuid": 2709413115764620,
      "level": 7,
      "template_id": 10221,
      "template_name": "Ogre Boss",
      "template_uuid": 4253680518160535,
      "page": "171",
      "url": "https://2e.aonprd.com/Monsters.aspx?ID=3401",
      "description": "A mythic ogre boss rules through strength and cruelty. Its enormous might can pull down prey of any size, and its mythic resilience keeps it fighting after blows that would fell another ogre.",
      "stat_block": {
        "listed_senses": ["darkvision"],
        "listed_skills": ["SKILL_ATHLETICS", "SKILL_INTIMIDATION", "SKILL_STEALTH"],
        "resistances_note": "mythic resistance 7 against [Strikes](link_action_19856) by non-[mythic](link_trait_4072) creatures; [mythic](link_trait_4072) weapons bypass this resistance",
        "recall_knowledge": "DC 28 (includes +5 from Rare); [Humanoid](link_trait_2399) (Society)"
      },
      "skill_variable": "SKILL_ATHLETICS",
      "old_skill_bonus": "+0",
      "new_skill_bonus": "+4",
      "mythic_op_id": "340273a5-a42b-41f1-8738-3206cf17a373",
      "catalog_items": [6765],
      "abilities": [
        {"name":"Titanic Might","description":"The ogre boss ignores size restrictions when it attempts maneuvers such as [Grapple](link_action_19725) or [Trip](link_action_19865)."},
        {"name":"Mythic Resistance","description":"The ogre boss has resistance 7 against Strikes by non-mythic creatures. A mythic weapon bypasses this resistance even when wielded by a non-mythic creature."},
        {"name":"Mythic Ferocity","actions":"REACTION","cost":"1 Mythic Point","trigger":"The ogre boss is reduced to 0 Hit Points.","description":"The ogre boss remains standing and conscious at 65 Hit Points, and its wounded value increases by 1. It can't use this reaction while wounded 3."},
        {"name":"Reactive Strike","actions":"REACTION","trigger":"A creature within reach uses a manipulate action, makes a ranged attack, moves out of a square during a move action, or leaves a square within reach.","description":"The ogre boss makes a melee [Strike](link_action_19856) against the triggering creature. A critical hit disrupts a triggering manipulate action. This [Strike](link_action_19856) doesn't count toward its multiple attack penalty."},
        {"name":"Bellowing Command","actions":"ONE-ACTION","traits":[1469,1486,1487,1458,1448],"description":"The ogre boss orders its allies onward. Each ogre ally that hears and understands it is quickened until the end of that ally's next turn, but can use the extra action only to [Step](link_action_19853) or [Stride](link_action_19855)."},
        {"name":"Mythic Power","description":"The ogre boss has a pool of 3 Mythic Points to spend on its mythic abilities."},
        {"name":"Mythic Skill","actions":"FREE-ACTION","cost":"1 Mythic Point","description":"The ogre boss's next Athletics check gains a +4 bonus and uses mythic proficiency for that check."},
        {"name":"Sweeping Hook","actions":"REACTION","trigger":"The ogre boss successfully [Trips](link_action_19865) a creature with an ogre hook.","description":"The ogre boss makes an ogre hook [Strike](link_action_19856) against the creature it tripped."}
      ]
    },
    {
      "name": "Mythic Lich",
      "uuid": 4237591398100435,
      "level": 12,
      "template_id": 10176,
      "template_name": "Lich",
      "template_uuid": 8195468773785525,
      "page": "172",
      "url": "https://2e.aonprd.com/Monsters.aspx?ID=3402",
      "description": "A mythic lich may have gained divine-scale power after its transformation, or woven it into the ritual that bound its soul to a cage. The Whispering Tyrant's followers believe he drew power from Aroden's killing blow to create his own mythic soul cage.",
      "stat_block": {
        "listed_senses": ["darkvision"],
        "trait_labels": {"4214": "Unholy"},
        "listed_skills": ["SKILL_ARCANA", "SKILL_CRAFTING", "SKILL_DECEPTION", "SKILL_DIPLOMACY", "SKILL_RELIGION", "SKILL_STEALTH"],
        "skills_note": "can craft magic items",
        "items_note": "the 6th-rank magic scroll contains [teleport](link_spell_4895)",
        "defenses_note": "mythic resilience (Ref and Will)",
        "hp_note": "rejuvenation, void healing",
        "recall_knowledge": "DC 35 (includes +5 from Rare); [Undead](link_trait_2425) (Religion)"
      },
      "mythic_op_id": "c24141f4-6421-4ddb-a28e-e762852ef224",
      "catalog_items": [7830, 7734, 7051],
      "abilities": [
        {"name":"Mythic Resilience","description":"On Reflex and Will saves, the lich treats its result as one degree of success better. This doesn't stack with other degree-shifting effects, except for the normal effect of a natural 1 or 20."},
        {"name":"Frightful Presence","traits":[1492,1486,1487,1448],"description":"A creature that first enters the lich's 60-foot aura attempts a DC 29 Will save. It is immune to this lich's Frightful Presence for 1 minute afterward, regardless of the result.\n\n**Critical Success** The creature is unaffected.\n\n**Success** The creature is frightened 1.\n\n**Failure** The creature is frightened 2.\n\n**Critical Failure** The creature is frightened 4."},
        {"name":"Counterspell","actions":"REACTION","trigger":"A creature casts a spell the lich has prepared.","description":"The lich expends the same prepared spell, losing its slot, and attempts to counteract the triggering spell."},
        {"name":"Rejuvenation","description":"When destroyed, the lich's soul transfers to its soul cage. The lich can be permanently destroyed only if the soul cage is found and destroyed."},
        {"name":"Void Healing","description":"Void effects heal the lich, while vitality effects damage it."},
        {"name":"Drain Soul Cage","actions":"FREE-ACTION","frequency":"once per day","description":"The lich draws on its soul cage to cast any arcane spell of 6th rank or lower, even one it hasn't prepared. The cage need not be present."},
        {"name":"Mythic Power","description":"The lich has a pool of 3 Mythic Points to spend on its mythic abilities."},
        {"name":"Recharge Spell","actions":"ONE-ACTION","traits":[1432],"cost":"1 Mythic Point","description":"The lich regains one expended spell."},
        {"name":"Remove a Condition","actions":"ONE-ACTION","traits":[1432],"cost":"1 Mythic Point","description":"The lich ends one condition affecting it."},
        {"name":"Siphon Life","description":"When the lich damages a living creature with an unarmed attack, it gains 5 temporary Hit Points. The creature must succeed at a DC 34 Fortitude save or become drained 1. At the start of the lich's turn, each creature grabbing or restraining it must make the same save or become drained 1. Further siphoning increases a creature's drained value by 1, to a maximum of drained 4."},
        {"name":"Steady Spellcasting","description":"If a reaction would disrupt the lich's spellcasting, it attempts a DC 15 flat check. On a success, the spellcasting isn't disrupted."}
      ]
    },
    {
      "name": "Mythic Griffon",
      "uuid": 3169015473517639,
      "level": 4,
      "template_id": 10111,
      "template_name": "Griffon",
      "template_uuid": 2338463709281465,
      "page": "173",
      "url": "https://2e.aonprd.com/Monsters.aspx?ID=3403",
      "description": "A mythic griffon has the freedom and ferocity of an ordinary griffon amplified by supernatural power. Metallic feathers or a luminous aura can reveal its nature, but it remains a wild animal rather than a loyal mount.",
      "stat_block": {
        "listed_senses": ["darkvision", "scent"],
        "listed_skills": ["SKILL_ACROBATICS", "SKILL_ATHLETICS", "SKILL_INTIMIDATION", "SKILL_STEALTH", "SKILL_SURVIVAL"],
        "recall_knowledge": "DC 24 (includes +5 from Rare); [Animal](link_trait_2409) (Nature)"
      },
      "skill_variable": "SKILL_ACROBATICS",
      "old_skill_bonus": "+2",
      "new_skill_bonus": "+6",
      "mythic_op_id": "87f8534f-37f1-42dc-9bcb-cb0e9ef3d300",
      "abilities": [
        {"name":"Deadly Striker","description":"After the griffon moves at least 10 feet with a movement action, its next Strike deals 1d6 extra precision damage."},
        {"name":"Flying Strafe","actions":"TWO-ACTIONS","description":"The griffon [Flies](link_action_19721) up to its fly Speed and makes two talon [Strikes](link_action_19856) during that movement, each against a different creature. The attacks take the normal multiple attack penalty."},
        {"name":"Mythic Power","description":"The griffon has a pool of 3 Mythic Points to spend on its mythic abilities."},
        {"name":"Mythic Skill","actions":"FREE-ACTION","cost":"1 Mythic Point","description":"The griffon's next Acrobatics check gains a +4 bonus and uses mythic proficiency for that check."},
        {"name":"Pounce","actions":"ONE-ACTION","description":"The griffon [Strides](link_action_19855) and then makes a talon [Strike](link_action_19856). If it began this activity hidden, it remains hidden until after the attack."},
        {"name":"Regal Shriek","actions":"ONE-ACTION","traits":[1469,1486,1487,1448],"description":"Each creature in a 60-foot emanation attempts a DC 20 Will save. Regardless of the result, it is immune to all griffons' Regal Shrieks for 10 minutes.\n\n**Critical Success** The creature is unaffected.\n\n**Success** The creature is frightened 1.\n\n**Failure** The creature is frightened 2. Animals are slowed 1 while frightened.\n\n**Critical Failure** The creature is frightened 3. Animals are paralyzed while frightened."},
        {"name":"Unimpeded","actions":"ONE-ACTION","cost":"1 Mythic Point","description":"The griffon ends one effect that gives it a circumstance penalty to Speed. When it attempts to [Escape](link_action_19632) an effect that immobilizes, grabs, or restrains it, it automatically succeeds."}
      ]
    }
  ]
  $entries$::jsonb;
  entry jsonb;
  template public.creature;
  existing public.creature;
  creature_meta jsonb;
  creature_details jsonb;
  creature_inventory jsonb;
  creature_spells jsonb;
  creature_abilities jsonb;
  creature_operations jsonb;
  ability jsonb;
  item_entry jsonb;
  item_row public.item;
  spell_record jsonb;
  inventory_items jsonb;
begin
  if not exists (
    select 1 from public.content_source
    where id = 400 and name = 'War of Immortals' and is_published
  ) then
    raise exception 'War of Immortals source changed; review before importing mythic creatures';
  end if;

  if not exists (select 1 from public.trait where id = 4072 and name = 'Mythic')
    or not exists (select 1 from public.trait where id = 4214 and name = 'Unholy (creature)') then
    raise exception 'Required mythic creature traits are unavailable';
  end if;

  for entry in select value from jsonb_array_elements(entries) loop
    select * into template from public.creature
    where id = (entry->>'template_id')::bigint
      and name = entry->>'template_name'
      and uuid = (entry->>'template_uuid')::bigint
      and level = (entry->>'level')::integer
      and content_source_id = 8
      and type = 'creature';
    if not found then
      raise exception 'Monster Core template for % changed or is unavailable', entry->>'name';
    end if;

    if template.inventory is null or template.operations is null or template.abilities_base is null then
      raise exception 'Monster Core template for % is incomplete', entry->>'name';
    end if;

    if entry->>'name' <> 'Mythic Lich' and (select count(*) from unnest(template.operations) op
        where op::jsonb->>'type' = 'addBonusToValue'
          and op::jsonb->'data'->>'variable' = entry->>'skill_variable'
          and op::jsonb->'data'->>'value' = entry->>'old_skill_bonus') <> 1 then
      raise exception 'Skill operation for % changed; review before importing', entry->>'name';
    end if;

    if exists (
      select 1 from jsonb_array_elements(entry->'abilities') a,
        jsonb_array_elements_text(coalesce(a->'traits', '[]'::jsonb)) trait_id
      left join public.trait trait on trait.id = trait_id.value::bigint
      where trait.id is null
    ) then
      raise exception 'Ability trait for % is unavailable', entry->>'name';
    end if;

    creature_meta := jsonb_build_object(
      'source', jsonb_build_object('book', 'War of Immortals', 'page', entry->>'page', 'url', entry->>'url'),
      'stat_block', entry->'stat_block'
    );
    creature_details := jsonb_set(template.details::jsonb, '{description}', to_jsonb(entry->>'description'));

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', -1,
        'created_at', '',
        'name', a->>'name',
        'actions', a->'actions',
        'level', (entry->>'level')::integer,
        'rarity', 'COMMON',
        'frequency', a->'frequency',
        'cost', a->'cost',
        'trigger', a->'trigger',
        'requirements', a->'requirements',
        'description', a->>'description',
        'special', a->'special',
        'prerequisites', 'null'::jsonb,
        'type', 'action',
        'traits', coalesce(a->'traits', '[]'::jsonb),
        'operations', 'null'::jsonb,
        'access', 'null'::jsonb,
        'meta_data', jsonb_build_object('source', creature_meta->'source'),
        'content_source_id', 400,
        'version', '1.0'
      ) order by n
    ), '[]'::jsonb) into creature_abilities
    from jsonb_array_elements(entry->'abilities') with ordinality as abilities(a, n);

    select coalesce(jsonb_agg(
      case
        when entry->>'name' = 'Mythic Lich'
          and op::jsonb->>'type' = 'defineCastingSource'
          and op::jsonb->'data'->>'value' = 'ARCANE_PREPARED_SPELLS:::PREPARED-TRADITION:::ARCANE:::ATTRIBUTE_CHA'
          then jsonb_set(op::jsonb, '{data,value}', to_jsonb('ARCANE_PREPARED_SPELLS:::PREPARED-TRADITION:::ARCANE:::ATTRIBUTE_INT'::text))
        when entry->>'name' = 'Mythic Lich'
          and op::jsonb->>'type' = 'giveTrait'
          and op::jsonb->'data'->>'traitId' = '1846'
          then jsonb_set(op::jsonb, '{data,traitId}', '4214'::jsonb)
        when entry->>'name' = 'Mythic Lich'
          and op::jsonb->>'type' = 'giveSpell'
          then jsonb_set(op::jsonb, '{data,rank}', to_jsonb(
            case (op::jsonb->'data'->>'spellId')::bigint
              when 4572 then 4
              when 4630 then 3
              else (select s.rank from public.spell s where s.id = (op::jsonb->'data'->>'spellId')::bigint)
            end
          ))
        when entry->>'name' = 'Mythic Lich'
          and op::jsonb->>'type' = 'addBonusToValue'
          and op::jsonb->'data'->>'variable' in ('SPELL_ATTACK', 'SPELL_DC')
          and op::jsonb->'data'->>'value' = '+23'
          then jsonb_set(op::jsonb, '{data,value}', to_jsonb('+20'::text))
        when op::jsonb->>'type' = 'addBonusToValue'
          and op::jsonb->'data'->>'variable' = entry->>'skill_variable'
          and op::jsonb->'data'->>'value' = entry->>'old_skill_bonus'
          then jsonb_set(op::jsonb, '{data,value}', to_jsonb(entry->>'new_skill_bonus'))
        else op::jsonb
      end order by n
    ), '[]'::jsonb) into creature_operations
    from unnest(template.operations) with ordinality as operations(op, n)
    where not (
      entry->>'name' = 'Mythic Lich'
      and op::jsonb->>'type' = 'addBonusToValue'
      and op::jsonb->'data'->>'text' = '+1 status to all saves vs. vitality'
    );

    creature_operations := creature_operations || jsonb_build_array(jsonb_build_object(
      'id', entry->>'mythic_op_id', 'type', 'giveTrait', 'data', jsonb_build_object('traitId', 4072)
    ));

    if entry->>'name' = 'Mythic Lich' then
      if (select count(*) from unnest(template.operations) op
          where op::jsonb->>'type' = 'addBonusToValue'
            and op::jsonb->'data'->>'text' = '+1 status to all saves vs. vitality') <> 3
        or (select count(*) from unnest(template.operations) op
          where op::jsonb->>'type' = 'defineCastingSource'
            and op::jsonb->'data'->>'value' = 'ARCANE_PREPARED_SPELLS:::PREPARED-TRADITION:::ARCANE:::ATTRIBUTE_CHA') <> 1
        or (select count(*) from unnest(template.operations) op
          where op::jsonb->>'type' = 'giveTrait' and op::jsonb->'data'->>'traitId' = '1846') <> 1 then
        raise exception 'Lich template operations changed; review before importing';
      end if;
      if (select count(*) from unnest(template.operations) op
          where op::jsonb->>'type' = 'addBonusToValue'
            and op::jsonb->'data'->>'variable' in ('SPELL_ATTACK', 'SPELL_DC')
            and op::jsonb->'data'->>'value' = '+23') <> 2 then
        raise exception 'Lich spellcasting modifiers changed; review before importing';
      end if;
      if exists (
        select 1 from unnest(template.operations) op
        left join public.spell s on s.id = (op::jsonb->'data'->>'spellId')::bigint
        where op::jsonb->>'type' = 'giveSpell' and s.id is null
      ) then
        raise exception 'Lich template references a missing spell';
      end if;
      creature_operations := creature_operations || jsonb_build_array(
        jsonb_build_object('id', 'c3a0b6a8-72f7-42b4-8d66-02581e6bbae8', 'type', 'adjValue', 'data', jsonb_build_object('variable', 'RESISTANCES', 'value', 'physical (except magical bludgeoning), 10')),
        jsonb_build_object('id', 'ec99d01b-6df7-40b2-a420-3cb59de8f517', 'type', 'giveSpell', 'data', jsonb_build_object('spellId', 4663, 'type', 'NORMAL', 'castingSource', 'ARCANE_PREPARED_SPELLS', 'tradition', 'ARCANE', 'rank', 5, 'casts', 1)),
        jsonb_build_object('id', 'cdaa4d91-1ae1-4eab-90fc-ea37845229ad', 'type', 'giveSpell', 'data', jsonb_build_object('spellId', 4599, 'type', 'NORMAL', 'castingSource', 'ARCANE_PREPARED_SPELLS', 'tradition', 'ARCANE', 'rank', 1, 'casts', 1))
      );
    end if;

    select coalesce(jsonb_agg(
      jsonb_set(
        item_entry.value,
        '{item}',
        (item_entry.value->'item')
        || jsonb_build_object(
          'price', null,
          'bulk', null,
          'hands', null,
          'craft_requirements', null,
          'usage', null,
          'meta_data',
          ((item_entry.value->'item'->'meta_data') - 'reload' - 'foundry')
          || case
            when entry->>'name' <> 'Mythic Ogre Boss'
              and item_entry.value->'item'->'meta_data'->>'category' = 'unarmed_attack'
              then jsonb_build_object('unselectable', true)
            else '{}'::jsonb
          end
          || case
            when entry->>'name' = 'Mythic Ogre Boss' and item_entry.value->'item'->>'name' = 'Javelin'
              then jsonb_build_object('quantity', 6)
            when entry->>'name' = 'Mythic Ogre Boss' and item_entry.value->'item'->>'name' = 'Ogre Hook'
              then jsonb_build_object('runes', jsonb_build_object('potency', 1), 'inventory_label', '+1 ogre hook')
            when entry->>'name' = 'Mythic Lich' and item_entry.value->'item'->>'name' = 'Hand'
              then jsonb_build_object('damage', (item_entry.value->'item'->'meta_data'->'damage') || jsonb_build_object('extra', 'Siphon Life'))
            else '{}'::jsonb
          end
        )
      ) order by n
    ), '[]'::jsonb) into inventory_items
    from jsonb_array_elements(template.inventory::jsonb->'items') with ordinality as item_entry(value, n);

    for item_entry in select value from jsonb_array_elements(coalesce(entry->'catalog_items', '[]'::jsonb)) loop
      select * into item_row from public.item where id = (item_entry#>>'{}')::bigint;
      if not found or item_row.name is distinct from (case (item_entry#>>'{}')::bigint
          when 6765 then 'Breastplate'
          when 7830 then 'Staff of Fire (Greater)'
          when 7734 then 'Magic Scroll (6th-rank Spell)'
          when 7051 then 'Invisibility Potion'
          else null end) then
        raise exception 'Catalog item % changed or is unavailable', item_entry;
      end if;
      inventory_items := inventory_items || jsonb_build_array(jsonb_build_object(
        'id', md5((entry->>'uuid') || ':' || item_row.id::text),
        'item', to_jsonb(item_row) - 'search_tsv',
        'is_formula', false,
        'is_equipped', false,
        'is_invested', false,
        'is_implanted', false,
        'container_contents', '[]'::jsonb
      ));
    end loop;
    creature_inventory := jsonb_set(template.inventory::jsonb, '{items}', inventory_items);

    creature_spells := to_jsonb(template.spells);
    if entry->>'name' = 'Mythic Lich' then
      if not exists (select 1 from public.spell where id = 4895 and name = 'Teleport') then
        raise exception 'Teleport spell for the lich scroll is unavailable';
      end if;
      if exists (
        select 1 from jsonb_each_text('{
          "4431":"Chain Lightning","4581":"Dominate","4924":"Vampiric Exsanguination",
          "4663":"Howling Blizzard","4904":"Toxic Cloud","4943":"Wall of Ice",
          "4572":"Dispel Magic","4622":"Fire Shield","4628":"Fly","4906":"Translocate",
          "4418":"Blindness","4630":"Force Barrage","4704":"Locate","4925":"Vampiric Feast",
          "4421":"Blur","4614":"False Vitality","4801":"Resist Energy","4822":"See the Unseen",
          "4599":"Enfeeble","4625":"Fleet Step","4881":"Sure Strike",
          "4562":"Detect Magic","4636":"Frostbite","4720":"Message","4831":"Shield","4890":"Telekinetic Hand"
        }'::jsonb) expected(id, name)
        left join public.spell s on s.id = expected.id::bigint
        where s.name is distinct from expected.name
      ) then
        raise exception 'Lich prepared spell catalog changed; review before importing';
      end if;
      creature_spells := jsonb_build_object(
        'slots', (
          select jsonb_agg(jsonb_build_object('rank', (slot->>'rank')::integer, 'source', 'ARCANE_PREPARED_SPELLS', 'spell_id', (slot->>'id')::bigint) order by n)
          from jsonb_array_elements('[
            {"rank":6,"id":4431},{"rank":6,"id":4581},{"rank":6,"id":4924},
            {"rank":5,"id":4663},{"rank":5,"id":4663},{"rank":5,"id":4904},{"rank":5,"id":4943},
            {"rank":4,"id":4572},{"rank":4,"id":4622},{"rank":4,"id":4628},{"rank":4,"id":4906},
            {"rank":3,"id":4418},{"rank":3,"id":4630},{"rank":3,"id":4704},{"rank":3,"id":4925},
            {"rank":2,"id":4421},{"rank":2,"id":4614},{"rank":2,"id":4801},{"rank":2,"id":4822},
            {"rank":1,"id":4599},{"rank":1,"id":4599},{"rank":1,"id":4625},{"rank":1,"id":4881},
            {"rank":0,"id":4562},{"rank":0,"id":4636},{"rank":0,"id":4720},{"rank":0,"id":4831},{"rank":0,"id":4890}
          ]'::jsonb) with ordinality as prepared(slot, n)
        ),
        'list', '[]'::jsonb,
        'focus_point_current', 0,
        'innate_casts', '[]'::jsonb
      );
    end if;

    select * into existing from public.creature
    where uuid = (entry->>'uuid')::bigint for update;
    if found then
      if existing.name is distinct from entry->>'name'
        or existing.level is distinct from (entry->>'level')::integer
        or existing.rarity is distinct from 'RARE'
        or existing.content_source_id is distinct from 400
        or existing.type is distinct from 'creature'
        or existing.meta_data::jsonb is distinct from creature_meta
        or existing.details::jsonb is distinct from creature_details
        or existing.inventory::jsonb is distinct from creature_inventory
        or to_jsonb(existing.operations) is distinct from creature_operations
        or to_jsonb(existing.abilities_base) is distinct from creature_abilities
        or to_jsonb(existing.spells) is distinct from creature_spells
        or existing.hp_current is distinct from (case entry->>'name'
          when 'Mythic Gogiteth' then 250 when 'Mythic Ogre Boss' then 130
          when 'Mythic Lich' then 190 when 'Mythic Griffon' then 60 end)
        or existing.deprecated is distinct from false then
        raise exception 'Existing mythic creature % changed; review before importing', entry->>'name';
      end if;
      continue;
    end if;

    if exists (select 1 from public.creature where content_source_id = 400 and name = entry->>'name') then
      raise exception 'War of Immortals creature name % is already occupied', entry->>'name';
    end if;

    insert into public.creature (
      name, level, rarity, meta_data, content_source_id, version, uuid,
      inventory, notes, details, roll_history, operations, abilities_base,
      spells, deprecated, abilities_added, experience, hp_current, hp_temp,
      stamina_current, resolve_current, operation_data, type
    ) values (
      entry->>'name', (entry->>'level')::integer, 'RARE', creature_meta,
      400, template.version, (entry->>'uuid')::bigint,
      creature_inventory::json, template.notes, creature_details::json, template.roll_history,
      array(select value::json from jsonb_array_elements(creature_operations)),
      array(select value::json from jsonb_array_elements(creature_abilities)),
      creature_spells::json, false, template.abilities_added,
      coalesce(template.experience, 0),
      case entry->>'name' when 'Mythic Gogiteth' then 250 when 'Mythic Ogre Boss' then 130
        when 'Mythic Lich' then 190 when 'Mythic Griffon' then 60 end,
      0, 0, 0, null, 'creature'
    );
  end loop;
end
$variants$;
