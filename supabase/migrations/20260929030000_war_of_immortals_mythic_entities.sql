do $mythic_entities$
declare
  entries constant jsonb := $entries$
  [
    {
      "name": "Sublime Breath",
      "level": 6,
      "uuid": 8402624232398678,
      "page": "201",
      "url": "https://2e.aonprd.com/Monsters.aspx?ID=3408",
      "size": "MEDIUM",
      "traits": [2021, 4072],
      "attributes": {"STR": 2, "DEX": 4, "CON": 2, "INT": 4, "WIS": 2, "CHA": 5},
      "perception": 16,
      "senses": [],
      "languages": [81, 90],
      "skills": [
        {"name": "ACROBATICS", "value": 14, "attribute": "DEX"},
        {"name": "ATHLETICS", "value": 12, "attribute": "STR"},
        {"name": "CRAFTING", "value": 26, "attribute": "INT"},
        {"name": "DECEPTION", "value": 18, "attribute": "CHA"},
        {"name": "DIPLOMACY", "value": 16, "attribute": "CHA"},
        {"name": "NATURE", "value": 15, "attribute": "WIS"},
        {"name": "PERFORMANCE", "value": 26, "attribute": "CHA"}
      ],
      "ac": 24,
      "saves": {"FORT": 11, "REFLEX": 14, "WILL": 17},
      "hp": 111,
      "speeds": {"SPEED": 25},
      "immunities": [],
      "resistances": [],
      "weaknesses": [],
      "stat_block": {
        "listed_senses": [],
        "recall_knowledge": "DC 22 (32 if Unique applies) • [Fey](link_trait_2021) (Nature)",
        "languages_note": "[truespeech](link_spell_4913)",
        "defenses_note": "mythic resilience (Will)",
        "listed_skills": ["SKILL_ACROBATICS", "SKILL_ATHLETICS", "SKILL_CRAFTING", "SKILL_DECEPTION", "SKILL_DIPLOMACY", "SKILL_NATURE", "SKILL_PERFORMANCE"]
      },
      "description": "A fey artist who pursues perfection and inspires exceptional work in others.",
      "attacks": [
        {"name": "soft touch", "attack_type": "melee", "bonus": 16, "traits": [1448, 1556], "damage": {"dice": 2, "die": "d4", "type": "bludgeoning", "bonus": 8, "extra": "1d6 mental + 1d6 spirit"}},
        {"name": "feigned strike", "attack_type": "ranged", "bonus": 16, "range": 60, "traits": [1448, 1556], "damage": {"dice": 2, "die": "d6", "type": "mental", "bonus": 0, "extra": "2d6 spirit"}}
      ],
      "item_ids": [17478],
      "spells": [],
      "abilities": [
        {"name": "Immaculate Instrument", "actions": null, "traits": [], "description": "The sublime breath carries an [immaculate instrument](link_item_17478) for their craft. While they possess it, critical failures on Crafting or Performance checks become failures."},
        {"name": "Artistic Specialist", "actions": null, "traits": [], "description": "For a recital, competition, or other artistic challenge, use the sublime breath as a 12th-level challenge."},
        {"name": "Thought Slips Away", "actions": null, "traits": [], "description": "The sublime breath uses Performance instead of the usual modifier for [Escape](link_action_19632), [Tumble Through](link_action_19867), [High Jump](link_action_19727), and [Long Jump](link_action_19738). Their [Leap](link_action_19735), [High Jump](link_action_19727), and [Long Jump](link_action_19738) movement does not trigger reactions."},
        {"name": "Mythic Resilience", "actions": null, "traits": [], "description": "Improve the degree of success of the sublime breath's Will saves by one step, from critical failure to failure, failure to success, or success to critical success."},
        {"name": "Artistic Creation", "actions": "ONE-ACTION", "traits": [1447, 1448], "frequency": "once per round", "description": "The sublime breath creates a tangible illusion in a 10-foot burst within 60 feet. Creatures that have not disbelieved it can interact with it, such as climbing a ladder or using a fire for heat. A hazardous creation deals 4d6 damage of a type fitting its form to a creature that enters or begins its turn there, with a DC 24 basic Will save. It lasts until the end of the sublime breath's next turn. [Sustaining](link_action_19858) it extends the duration, up to 1 minute, and a single [Sustain](link_action_19858) action can maintain any number of Artistic Creations."},
        {"name": "Artistic Destruction", "actions": "ONE-ACTION", "traits": [1447, 1448], "requirements": "The sublime breath used Artistic Creation or [Sustained](link_action_19858) one this turn.", "description": "All currently [Sustained](link_action_19858) Artistic Creations detonate. Enemies in a creation or within a 10-foot burst of one take 8d6 damage of the creation's type, with a DC 24 basic Will save. A creature in overlapping bursts takes damage only once and chooses the damage type. The sublime breath cannot use Artistic Creation for 1d4 turns afterward."},
        {"name": "Change Shape", "actions": "ONE-ACTION", "traits": [1432, 1475, 1453], "description": "The sublime breath assumes the appearance of a Medium or Large humanoid without changing Speed or [Strike](link_action_19856) bonuses, though a [Strike](link_action_19856)'s damage type might change. On first becoming observed, they use this ability as a free action even if unaware of the observer, choosing a form inspired by one observer's innermost hopes or artistic interests. While that observer can see the maintained form, the observer gains a +1 circumstance bonus to Crafting and Performance and takes a -1 circumstance penalty to Will saves against the sublime breath and to checks or DCs used to capture or restrain them."},
        {"name": "Hours Go By", "actions": "ONE-ACTION", "traits": [1486, 1448], "description": "One creature within 60 feet becomes quickened. The extra action can be used only to [Sustain](link_action_19858) a spell or other ability."},
        {"name": "Mythic Power", "actions": null, "traits": [], "description": "3 Mythic Points."},
        {"name": "Remove a Condition", "actions": "ONE-ACTION", "traits": [1432], "cost": "1 Mythic Point", "description": "The sublime breath removes one condition currently affecting them."}
      ]
    },
    {
      "name": "Verex-That-Was",
      "level": 24,
      "uuid": 8784846156440862,
      "page": "207",
      "url": "https://2e.aonprd.com/Monsters.aspx?ID=3409",
      "size": "GARGANTUAN",
      "traits": [2427, 4072],
      "attributes": {"STR": 12, "DEX": 9, "CON": 11, "INT": 7, "WIS": 7, "CHA": 4},
      "perception": 42,
      "senses": [{"name": "darkvision", "acuity": "precise"}, {"name": "truesight", "acuity": "precise"}],
      "languages": [93, 81, 89],
      "skills": [
        {"name": "ATHLETICS", "value": 45, "attribute": "STR"},
        {"name": "INTIMIDATION", "value": 45, "attribute": "CHA"}
      ],
      "ac": 51,
      "saves": {"FORT": 42, "REFLEX": 38, "WILL": 36},
      "hp": 550,
      "speeds": {"SPEED": 50, "SPEED_BURROW": 30},
      "immunities": ["acid", "death effects", "disease", "mental", "poison"],
      "resistances": ["cold, 25", "fire, 25", "physical (except sloughstone and holy), 20"],
      "weaknesses": ["holy, 20"],
      "stat_block": {
        "listed_senses": ["darkvision", "truesight"],
        "recall_knowledge": "DC 48 (58 if Unique applies) • [Aberration](link_trait_2427) (Occultism)",
        "defenses_note": "mythic resilience (all saves)",
        "immunities_note": "mythic immunity",
        "hp_note": "regeneration 30 (deactivated by sloughstone weapons)",
        "listed_skills": ["SKILL_ATHLETICS", "SKILL_INTIMIDATION"]
      },
      "description": "Rovagug's corrupting power and Gorum's blood transformed the former orc god into a monstrous Spawn of Rovagug.",
      "attacks": [
        {"name": "claw", "attack_type": "melee", "bonus": 44, "traits": [1504, 1846, 4174], "damage": {"dice": 5, "die": "d10", "type": "slashing", "bonus": 22, "extra": "bloodboils"}},
        {"name": "jaws", "attack_type": "melee", "bonus": 44, "traits": [1504, 1846, 4173], "damage": {"dice": 4, "die": "d12", "type": "piercing", "bonus": 22, "extra": "bloodboils and Improved Grab"}},
        {"name": "tail", "attack_type": "melee", "bonus": 44, "traits": [1569, 1504, 1846, 4175], "damage": {"dice": 3, "die": "d8", "type": "bludgeoning", "bonus": 22, "extra": "bloodboils"}},
        {"name": "teeth", "attack_type": "ranged", "bonus": 42, "range": 60, "traits": [1504, 1846], "damage": {"dice": 5, "die": "d6", "type": "piercing", "bonus": 16, "extra": ""}}
      ],
      "item_ids": [],
      "spells": [],
      "abilities": [
        {"name": "Frightful Presence", "actions": null, "traits": [1492, 1486, 1487, 1448], "description": "When a creature first enters this 150-foot [aura](link_trait_1492), it attempts a DC 45 Will save and then becomes temporarily immune to this presence for 1 minute. Critical success: unaffected. Success: frightened 1. Failure: frightened 2. Critical failure: frightened 4."},
        {"name": "Mythic Immunity", "actions": null, "traits": [], "description": "Verex-That-Was is immune to harmful spells cast by non-[mythic](link_trait_4072) creatures, [Strikes](link_action_19856) using non-[mythic](link_trait_4072) weapons, and [unarmed](link_trait_2398) [Strikes](link_action_19856) by non-[mythic](link_trait_4072) characters."},
        {"name": "Mythic Resilience", "actions": null, "traits": [], "description": "Improve the degree of success of all Verex-That-Was's saving throws by one step, from critical failure to failure, failure to success, or success to critical success."},
        {"name": "Symphony of Pain", "actions": "REACTION", "traits": [], "trigger": "A creature inside Verex-That-Was's frightful presence damages him.", "description": "Every creature within 150 feet, ally or enemy, takes [mental](link_trait_1448) damage equal to half the damage Verex-That-Was just sustained, with a DC 45 basic Fortitude save."},
        {"name": "Battlefield Eruption", "actions": "THREE-ACTIONS", "traits": [4072, 1470], "cost": "1 Mythic Point", "description": "Verex-That-Was burrows into the ground and emerges anywhere on the same plane where he or his worshippers previously killed at least 10 sapient creatures in battle. On arrival, a 30-foot emanation deals 16d10 piercing damage, with a DC 48 basic Reflex save."},
        {"name": "Bloodboils", "actions": null, "traits": [1857], "description": "A creature struck by Verex-That-Was's jaws or tail must succeed at a DC 45 Fortitude save or gain weakness 10 to physical damage for 1 day. A 3rd-rank or higher *[cleanse affliction](link_spell_4522)* can counteract the [disease](link_trait_1857), which also ends if [magical](link_trait_1504) [healing](link_trait_1442) restores the creature to its maximum Hit Points."},
        {"name": "Leap into the Fray", "actions": "THREE-ACTIONS", "traits": [], "description": "Verex-That-Was [Leaps](link_action_19735) up to 20 feet horizontally and 10 feet vertically, then makes one claw, one jaws, and one tail [Strike](link_action_19856) in any order. Spending 1 Mythic Point doubles both [Leap](link_action_19735) distances and makes each creature he lands adjacent to off-guard until the end of his turn."},
        {"name": "Mythic Power", "actions": null, "traits": [], "description": "3 Mythic Points."},
        {"name": "Undying Myth", "actions": "FREE-ACTION", "traits": [], "cost": "All remaining Mythic Points", "trigger": "Verex-That-Was would die and has at least 1 Mythic Point.", "description": "Verex-That-Was stays standing and conscious and recovers half his maximum Hit Points."},
        {"name": "Improved Grab", "actions": "FREE-ACTION", "traits": [], "trigger": "Verex-That-Was hits with his jaws [Strike](link_action_19856).", "description": "Verex-That-Was can Grab the struck creature as a free action. Extending an existing grab still costs an action."},
        {"name": "Swallow Whole", "actions": "ONE-ACTION", "traits": [1520], "description": "Verex-That-Was attempts an Athletics check against the Reflex DC of a Huge or smaller creature he has grabbed or restrained in his jaws. On a success, he swallows it and releases the jaws' hold. A swallowed creature is grabbed, slowed 1, must hold its breath, and takes 4d10+10 bludgeoning damage when swallowed and at the end of each of its turns. Verex cannot attack a creature he has swallowed. A victim can [Escape](link_action_19632) through his mouth, freeing any other creature held in his jaws, or cut free by dealing 50 piercing or slashing damage with one attack or spell. It can attack him only with an [unarmed](link_trait_2398) attack or a light-Bulk weapon, and he is off-guard against that attack. A creature that gets free can immediately breathe and leaves Verex's space. A Huge swallowed creature prevents him from swallowing another creature; the GM determines the capacity for smaller creatures. If Verex dies, adjacent creatures can free a victim with a combined 3 actions spent cutting with piercing or slashing weapons or [unarmed](link_trait_2398) attacks."},
        {"name": "War Cry of Destruction", "actions": "TWO-ACTIONS", "traits": [1484, 1846, 1485], "description": "A 60-foot cone deals 12d6 [sonic](link_trait_1484) and 12d6 [void](link_trait_1485) damage to all creatures, with a DC 45 basic Fortitude save. The damage bypasses up to 25 Hardness except for sloughstone. An [orc](link_ancestry_10) in the area can roar in defiance as a reaction, gaining a +2 circumstance bonus to the save while expanding the cry by a 30-foot emanation centered on that [orc](link_ancestry_10). [Orcs](link_ancestry_10) reduced to 0 Hit Points by this effect howl automatically. The area can continue extending through other [orcs](link_ancestry_10) that choose to roar. Overlapping areas require only one save. This ability cannot be used again for 1d4 rounds."},
        {"name": "Absolute Regeneration", "actions": null, "traits": [], "description": "As a Spawn of Rovagug, Verex-That-Was's regeneration can restore him after a [death](link_trait_1904) effect. If he fails a save against an effect that would kill him instantly, he returns 3 rounds later at 1 Hit Point. Banishment, imprisonment, transport, or continuous damage that keeps him dying can still contain him."},
        {"name": "Slumbering Armageddon", "actions": null, "traits": [], "description": "While in regenerative hibernation, Verex-That-Was needs no food, water, or air, his resistances double, [detection](link_trait_1508), [revelation](link_trait_1907), and [scrying](link_trait_1590) cannot locate him, and his saves improve by one degree of success. Destructive natural disasters increase within 1 mile of his resting place, with the radius growing roughly 1 mile per decade of slumber."}
      ]
    },
    {
      "name": "Weaver of Webs",
      "level": 15,
      "uuid": 3704851072954059,
      "page": "214",
      "url": "https://2e.aonprd.com/Monsters.aspx?ID=3410",
      "size": "GARGANTUAN",
      "traits": [2422, 4072],
      "attributes": {"STR": 6, "DEX": 4, "CON": 6, "INT": 8, "WIS": 6, "CHA": 6},
      "perception": 32,
      "senses": [{"name": "all-around vision", "acuity": "precise"}, {"name": "greater darkvision", "acuity": "precise"}, {"name": "tremorsense", "acuity": "imprecise"}],
      "languages": [93, 92, 81, 99, 82, 83, 307, 88, 91],
      "skills": [
        {"name": "ACROBATICS", "value": 25, "attribute": "DEX"},
        {"name": "ATHLETICS", "value": 30, "attribute": "STR"},
        {"name": "CRAFTING", "value": 21, "attribute": "INT"},
        {"name": "DECEPTION", "value": 30, "attribute": "CHA"},
        {"name": "DIPLOMACY", "value": 27, "attribute": "CHA"},
        {"name": "INTIMIDATION", "value": 30, "attribute": "CHA"},
        {"name": "NATURE", "value": 25, "attribute": "WIS"},
        {"name": "OCCULTISM", "value": 27, "attribute": "INT"},
        {"name": "RELIGION", "value": 27, "attribute": "WIS"},
        {"name": "SOCIETY", "value": 27, "attribute": "INT"},
        {"name": "STEALTH", "value": 30, "attribute": "DEX"}
      ],
      "ac": 36,
      "saves": {"FORT": 26, "REFLEX": 23, "WILL": 29},
      "hp": 335,
      "speeds": {"SPEED": 60, "SPEED_CLIMB": 60},
      "immunities": ["mental", "poison"],
      "resistances": ["cold, 10", "void, 10"],
      "weaknesses": [],
      "stat_block": {
        "listed_senses": ["all-around vision", "greater darkvision", "tremorsense"],
        "recall_knowledge": "DC 34 (44 if Unique applies) • [Beast](link_trait_2422) (Arcana, Nature)",
        "languages_note": "[truespeech](link_spell_4913)",
        "resistances_note": "mythic resistance 15",
        "hp_note": "regeneration 10 (deactivated by bright light)",
        "listed_skills": ["SKILL_ACROBATICS", "SKILL_ATHLETICS", "SKILL_CRAFTING", "SKILL_DECEPTION", "SKILL_DIPLOMACY", "SKILL_INTIMIDATION", "SKILL_NATURE", "SKILL_OCCULTISM", "SKILL_RELIGION", "SKILL_SOCIETY", "SKILL_STEALTH"],
        "innate_spell_frequencies": {
          "5:sending": "AT-WILL",
          "4:darkness": "AT-WILL",
          "4:web": "AT-WILL",
          "2:see the unseen": "AT-WILL",
          "7:truespeech": "CONSTANT"
        }
      },
      "description": "An ancient keeper of secrets who now seeks divine power for herself.",
      "attacks": [
        {"name": "fangs", "attack_type": "melee", "bonus": 28, "traits": [1504, 4173], "damage": {"dice": 2, "die": "d8", "type": "piercing", "bonus": 16, "extra": "Weaver venom"}},
        {"name": "tarsal claw", "attack_type": "melee", "bonus": 28, "traits": [1504, 4174], "damage": {"dice": 2, "die": "d6", "type": "slashing", "bonus": 16, "extra": "Improved Grab"}},
        {"name": "web", "attack_type": "ranged", "bonus": 24, "range": 120, "traits": [1571, 1504], "damage": {"dice": 4, "die": "d4", "type": "bludgeoning", "bonus": 10, "extra": "Nightmare Cocoon and Weaver venom"}}
      ],
      "item_ids": [],
      "spell_dc": 36,
      "spell_attack": 28,
      "spells": [
        {"id": 6736, "name": "Dream Council", "rank": 8, "casts": 1},
        {"id": 4805, "name": "Retrocognition", "rank": 7, "casts": 1},
        {"id": 4947, "name": "Warp Mind", "rank": 7, "casts": 1},
        {"id": 4763, "name": "Phantasmal Calamity", "rank": 6, "casts": 1},
        {"id": 4800, "name": "Repulsion", "rank": 6, "casts": 1},
        {"id": 4821, "name": "Scrying", "rank": 6, "casts": 1},
        {"id": 4895, "name": "Teleport", "rank": 6, "casts": 1},
        {"id": 4824, "name": "Sending", "rank": 5, "casts": 0},
        {"id": 4552, "name": "Darkness", "rank": 4, "casts": 0},
        {"id": 4689, "name": "Invisibility", "rank": 4, "casts": 1},
        {"id": 4741, "name": "Nightmare", "rank": 4, "casts": 1},
        {"id": 4796, "name": "Read Omens", "rank": 4, "casts": 1},
        {"id": 6788, "name": "Web", "rank": 4, "casts": 0},
        {"id": 4584, "name": "Dream Message", "rank": 3, "casts": 1},
        {"id": 4616, "name": "Fear", "rank": 3, "casts": 1},
        {"id": 4724, "name": "Mind Reading", "rank": 3, "casts": 1},
        {"id": 4822, "name": "See the Unseen", "rank": 2, "casts": 0},
        {"id": 4913, "name": "Truespeech", "rank": 7, "casts": 0}
      ],
      "abilities": [
        {"name": "Countless Eyes", "actions": null, "traits": [1590], "description": "The Weaver of Webs sees through the eyes of any living or dead spider in one of her lairs. When she casts *[scrying](link_spell_4821)* on such a spider, the spell is not expended and the spider automatically critically fails its save."},
        {"name": "Greater Web Sense", "actions": null, "traits": [], "description": "The Weaver's tremorsense reaches any of her webs regardless of distance or area and becomes precise against a creature touching one of those webs."},
        {"name": "All-Around Vision", "actions": null, "traits": [], "description": "The Weaver of Webs can see in every direction at once and cannot be flanked."},
        {"name": "Mythic Resistance", "actions": null, "traits": [], "description": "The Weaver of Webs has resistance 15 against attacks made with non-[mythic](link_trait_4072) weapons and [unarmed](link_trait_2398) attacks by non-[mythic](link_trait_4072) creatures."},
        {"name": "Spilled Secrets", "actions": null, "traits": [1492, 1448], "description": "In a 60-foot [aura](link_trait_1492), a creature that speaks must attempt a DC 34 Will save or speak a secret instead of its intended words. [Linguistic](link_trait_1458) spells and effects gain the [concentrate](link_trait_1432) trait if necessary and are wasted on a failed save. On a critical failure, the creature reveals the secret it most wishes to keep from those present."},
        {"name": "Adopted Brood", "actions": "REACTION", "traits": [], "trigger": "A creature deals precision damage to the Weaver of Webs.", "description": "Spiders emerging from the wound deal 3d6 piercing damage to one creature within 15 feet of the Weaver and expose it to Weaver venom."},
        {"name": "Mythic Power", "actions": null, "traits": [], "description": "3 Mythic Points."},
        {"name": "Remove a Condition", "actions": "ONE-ACTION", "traits": [1432], "cost": "1 Mythic Point", "description": "The Weaver removes one condition currently affecting her."},
        {"name": "Nightmare Cocoon", "actions": null, "traits": [1481, 1448], "description": "A creature hit by the Weaver's web [Strike](link_action_19856) must succeed at a DC 34 Reflex save or become immobilized ([Escape](link_action_19632) DC 34). When a creature fails, the Weaver can spend 1 Mythic Point as a free action to also paralyze it. By [Sustaining](link_action_19858) the effect, she observes its nightmares and gives it a -2 circumstance penalty to Will saves against her spells until the start of her next turn. At the end of each paralyzed victim's turn, a DC 34 Will save ends paralysis, but not immobilization."},
        {"name": "Weaver Venom", "actions": null, "traits": [1476], "description": "[Poison](link_trait_1476), saving throw DC 34, maximum duration 6 rounds. Stage 1: 2d10 [poison](link_trait_1476) damage for 1 round. Stage 2: 2d10 [poison](link_trait_1476) damage and slowed 1 for 2 rounds. Stage 3: 3d10 [poison](link_trait_1476) damage and slowed 2 for 1 round. Stage 4: 4d10 [poison](link_trait_1476) damage for 1 round and permanent loss of all memory of the Weaver of Webs, including prior references to her."},
        {"name": "Webbed Conveyance", "actions": "ONE-ACTION", "traits": [], "requirements": "The Weaver is within 15 feet of a creature paralyzed in her nightmare cocoon.", "description": "The Weaver grabs the target, webs it to her body, and [Strides](link_action_19855). While the target remains immobilized by nightmare cocoon, it shares her space and moves with her. [Escape](link_action_19632) DC increases to 36."},
        {"name": "Improved Grab", "actions": "FREE-ACTION", "traits": [], "trigger": "The Weaver of Webs hits with her tarsal claw [Strike](link_action_19856).", "description": "The Weaver can Grab the struck creature as a free action. Extending an existing grab still costs an action."}
      ]
    }
  ]
  $entries$::jsonb;
  entry jsonb;
  existing public.creature;
  source_data jsonb;
  details_data jsonb;
  spells_data jsonb := '{"slots":[],"list":[],"focus_point_current":0,"innate_casts":[]}'::jsonb;
  inventory_data jsonb;
  inventory_items jsonb;
  item_data jsonb;
  attack_item jsonb;
  ability_row jsonb;
  skill jsonb;
  sense jsonb;
  spell jsonb;
  attack jsonb;
  ability jsonb;
  operation_rows json[];
  ability_rows json[];
  attr_name text;
  attr_value integer;
  speed_name text;
  speed_value integer;
  list_value text;
  trait_id bigint;
  language_id bigint;
  item_id bigint;
  attack_index integer;
  ability_index integer;
  operation_index integer;
  attack_attribute integer;
  damage_adjustment integer;
  damage_extra text;
  hash_value text;
  stable_id text;
begin
  if not exists (
    select 1 from public.content_source
    where id = 400 and name = 'War of Immortals' and is_published
  ) then
    raise exception 'War of Immortals source changed; review before importing creatures';
  end if;

  for entry in select value from jsonb_array_elements(entries) loop
    if exists (
      select 1 from (
        select value::bigint as id from jsonb_array_elements_text(entry->'traits')
        union all
        select trait.value::bigint from jsonb_array_elements(entry->'attacks') as attack_ref(value)
        cross join lateral jsonb_array_elements_text(attack_ref.value->'traits') as trait(value)
        union all
        select trait.value::bigint from jsonb_array_elements(entry->'abilities') as ability_ref(value)
        cross join lateral jsonb_array_elements_text(ability_ref.value->'traits') as trait(value)
      ) as referenced
      left join public.trait on public.trait.id = referenced.id
      where public.trait.id is null
    ) then
      raise exception 'Creature % references an unavailable trait', entry->>'name';
    end if;

    if exists (
      select 1 from jsonb_array_elements_text(entry->'languages') as referenced(value)
      left join public.language on public.language.id = referenced.value::bigint
      where public.language.id is null
    ) then
      raise exception 'Creature % references an unavailable language', entry->>'name';
    end if;

    if exists (
      select 1 from jsonb_array_elements(entry->'spells') as referenced(value)
      left join public.spell on public.spell.id = (referenced.value->>'id')::bigint
      where public.spell.id is null
        or lower(public.spell.name) <> lower(referenced.value->>'name')
    ) then
      raise exception 'Creature % references an unavailable or renamed spell', entry->>'name';
    end if;

    if exists (
      select 1 from jsonb_array_elements_text(entry->'item_ids') as referenced(value)
      left join public.item on public.item.id = referenced.value::bigint
      where public.item.id is null
        or public.item.content_source_id <> 400
        or public.item.name <> 'Immaculate Instrument'
    ) then
      raise exception 'Creature % references an unavailable item', entry->>'name';
    end if;

    source_data := jsonb_build_object(
      'source', jsonb_build_object('book', 'War of Immortals', 'page', entry->>'page', 'url', entry->>'url'),
      'stat_block', entry->'stat_block'
    );
    details_data := jsonb_build_object('description', entry->>'description');
    inventory_items := '[]'::jsonb;
    operation_rows := '{}'::json[];
    ability_rows := '{}'::json[];

    for attr_name, attr_value in
      select key, value::integer from jsonb_each_text(entry->'attributes')
    loop
      operation_rows := array_append(operation_rows, jsonb_build_object(
        'type', 'setValue', 'data', jsonb_build_object(
          'variable', 'ATTRIBUTE_' || attr_name,
          'value', jsonb_build_object('value', attr_value, 'partial', false)
        )
      )::json);
    end loop;

    operation_rows := array_append(operation_rows, jsonb_build_object(
      'type', 'setValue', 'data', jsonb_build_object(
        'variable', 'SIZE', 'value', entry->>'size'
      )
    )::json);
    operation_rows := array_append(operation_rows, jsonb_build_object(
      'type', 'setValue', 'data', jsonb_build_object(
        'variable', 'AC_BONUS',
        'value', (entry->>'ac')::integer - 10 - (entry->'attributes'->>'DEX')::integer
      )
    )::json);
    operation_rows := array_append(operation_rows, jsonb_build_object(
      'type', 'setValue', 'data', jsonb_build_object(
        'variable', 'MAX_HEALTH_BONUS',
        'value', (entry->>'hp')::integer - (entry->>'level')::integer * (entry->'attributes'->>'CON')::integer
      )
    )::json);

    for attr_name, attr_value in
      select key, value::integer from jsonb_each_text(entry->'saves')
    loop
      operation_rows := array_append(operation_rows, jsonb_build_object(
        'type', 'addBonusToValue', 'data', jsonb_build_object(
          'variable', 'SAVE_' || attr_name,
          'value', attr_value - (entry->'attributes'->>(case attr_name
            when 'FORT' then 'CON' when 'REFLEX' then 'DEX' else 'WIS' end))::integer,
          'text', ''
        )
      )::json);
    end loop;
    operation_rows := array_append(operation_rows, jsonb_build_object(
      'type', 'addBonusToValue', 'data', jsonb_build_object(
        'variable', 'PERCEPTION',
        'value', (entry->>'perception')::integer - (entry->'attributes'->>'WIS')::integer,
        'text', ''
      )
    )::json);

    for speed_name, speed_value in
      select key, value::integer from jsonb_each_text(entry->'speeds')
    loop
      operation_rows := array_append(operation_rows, jsonb_build_object(
        'type', 'setValue', 'data', jsonb_build_object('variable', speed_name, 'value', speed_value)
      )::json);
    end loop;

    for trait_id in select value::bigint from jsonb_array_elements_text(entry->'traits') loop
      operation_rows := array_append(operation_rows, jsonb_build_object(
        'type', 'giveTrait', 'data', jsonb_build_object('traitId', trait_id)
      )::json);
    end loop;
    for language_id in select value::bigint from jsonb_array_elements_text(entry->'languages') loop
      operation_rows := array_append(operation_rows, jsonb_build_object(
        'type', 'giveLanguage', 'data', jsonb_build_object('languageId', language_id)
      )::json);
    end loop;

    for sense in select value from jsonb_array_elements(entry->'senses') loop
      operation_rows := array_append(operation_rows, jsonb_build_object(
        'type', 'adjValue', 'data', jsonb_build_object(
          'variable', case when sense->>'acuity' = 'imprecise' then 'SENSES_IMPRECISE' else 'SENSES_PRECISE' end,
          'value', sense->>'name'
        )
      )::json);
    end loop;

    for skill in select value from jsonb_array_elements(entry->'skills') loop
      operation_rows := array_append(operation_rows, jsonb_build_object(
        'type', 'adjValue', 'data', jsonb_build_object(
          'variable', 'SKILL_' || (skill->>'name'), 'value', jsonb_build_object('value', 'T')
        )
      )::json);
      operation_rows := array_append(operation_rows, jsonb_build_object(
        'type', 'addBonusToValue', 'data', jsonb_build_object(
          'variable', 'SKILL_' || (skill->>'name'),
          'value', (skill->>'value')::integer - (entry->>'level')::integer - 2
            - (entry->'attributes'->>(skill->>'attribute'))::integer,
          'text', ''
        )
      )::json);
    end loop;

    for list_value in select value from jsonb_array_elements_text(entry->'immunities') loop
      operation_rows := array_append(operation_rows, jsonb_build_object(
        'type', 'adjValue', 'data', jsonb_build_object('variable', 'IMMUNITIES', 'value', list_value)
      )::json);
    end loop;
    for list_value in select value from jsonb_array_elements_text(entry->'resistances') loop
      operation_rows := array_append(operation_rows, jsonb_build_object(
        'type', 'adjValue', 'data', jsonb_build_object('variable', 'RESISTANCES', 'value', list_value)
      )::json);
    end loop;
    for list_value in select value from jsonb_array_elements_text(entry->'weaknesses') loop
      operation_rows := array_append(operation_rows, jsonb_build_object(
        'type', 'adjValue', 'data', jsonb_build_object('variable', 'WEAKNESSES', 'value', list_value)
      )::json);
    end loop;

    if jsonb_array_length(entry->'spells') > 0 then
      operation_rows := array_append(operation_rows, jsonb_build_object(
        'type', 'defineCastingSource', 'data', jsonb_build_object(
          'variable', 'CASTING_SOURCES', 'value', upper(entry->>'name') || ' INNATE:::null:::OCCULT:::ATTRIBUTE_CHA'
        )
      )::json);
      operation_rows := array_append(operation_rows, jsonb_build_object(
        'type', 'addBonusToValue', 'data', jsonb_build_object(
          'variable', 'SPELL_ATTACK',
          'value', (entry->>'spell_attack')::integer - (entry->>'level')::integer
            - case when (entry->>'level')::integer >= 12 then 4 else 2 end
            - (entry->'attributes'->>'CHA')::integer,
          'text', ''
        )
      )::json);
      operation_rows := array_append(operation_rows, jsonb_build_object(
        'type', 'addBonusToValue', 'data', jsonb_build_object(
          'variable', 'SPELL_DC',
          'value', (entry->>'spell_dc')::integer - 10 - (entry->>'level')::integer
            - case when (entry->>'level')::integer >= 12 then 4 else 2 end
            - (entry->'attributes'->>'CHA')::integer,
          'text', ''
        )
      )::json);
      for spell in select value from jsonb_array_elements(entry->'spells') loop
        operation_rows := array_append(operation_rows, jsonb_build_object(
          'type', 'giveSpell', 'data', jsonb_build_object(
            'spellId', (spell->>'id')::bigint,
            'type', 'INNATE',
            'castingSource', upper(entry->>'name') || ' INNATE',
            'rank', (spell->>'rank')::integer,
            'tradition', 'OCCULT',
            'casts', (spell->>'casts')::integer
          )
        )::json);
      end loop;
    end if;

    attack_index := 0;
    for attack in select value from jsonb_array_elements(entry->'attacks') loop
      attack_index := attack_index + 1;
      attack_attribute := case when attack->>'attack_type' = 'ranged'
        then (entry->'attributes'->>'DEX')::integer
        else (entry->'attributes'->>'STR')::integer end;
      damage_adjustment := (attack->'damage'->>'bonus')::integer
        - case when attack->>'attack_type' = 'ranged' then 0 else (entry->'attributes'->>'STR')::integer end;
      damage_extra := concat_ws(' + ',
        nullif(damage_adjustment, 0)::text,
        nullif(attack->'damage'->>'extra', '')
      );
      attack_item := jsonb_build_object(
        'id', -(((entry->>'uuid')::bigint % 1000000000) * 10 + attack_index),
        'created_at', '',
        'name', attack->>'name',
        'level', 0,
        'rarity', 'COMMON',
        'traits', attack->'traits',
        'description', '',
        'group', 'WEAPON',
        'size', entry->>'size',
        'meta_data', jsonb_build_object(
          'category', 'unarmed_attack',
          'group', 'brawling',
          'damage', jsonb_build_object(
            'damageType', attack->'damage'->>'type',
            'dice', (attack->'damage'->>'dice')::integer,
            'die', attack->'damage'->>'die',
            'extra', damage_extra
          ),
          'attack_bonus', (attack->>'bonus')::integer - attack_attribute,
          'bulk', '{}'::jsonb,
          'unselectable', true,
          'quantity', 1,
          'range', case when attack->>'attack_type' = 'ranged' then (attack->>'range')::integer else null end,
          'foundry', '{}'::jsonb,
          'source', source_data->'source'
        ),
        'operations', '[]'::jsonb,
        'price', null,
        'bulk', null,
        'hands', null,
        'craft_requirements', null,
        'usage', null,
        'content_source_id', 400,
        'version', '1.0'
      );
      hash_value := md5((entry->>'uuid') || ':attack:' || attack_index);
      stable_id := substr(hash_value, 1, 8) || '-' || substr(hash_value, 9, 4) || '-'
        || substr(hash_value, 13, 4) || '-' || substr(hash_value, 17, 4) || '-' || substr(hash_value, 21, 12);
      inventory_items := inventory_items || jsonb_build_array(jsonb_build_object(
        'id', stable_id,
        'item', attack_item,
        'is_formula', false,
        'is_equipped', true,
        'is_invested', false,
        'is_implanted', false,
        'container_contents', '[]'::jsonb
      ));
    end loop;

    for item_id in select value::bigint from jsonb_array_elements_text(entry->'item_ids') loop
      select to_jsonb(item) - 'search_tsv' into item_data from public.item where id = item_id;
      hash_value := md5((entry->>'uuid') || ':item:' || item_id);
      stable_id := substr(hash_value, 1, 8) || '-' || substr(hash_value, 9, 4) || '-'
        || substr(hash_value, 13, 4) || '-' || substr(hash_value, 17, 4) || '-' || substr(hash_value, 21, 12);
      inventory_items := inventory_items || jsonb_build_array(jsonb_build_object(
        'id', stable_id,
        'item', item_data,
        'is_formula', false,
        'is_equipped', false,
        'is_invested', false,
        'is_implanted', false,
        'container_contents', '[]'::jsonb
      ));
    end loop;
    inventory_data := jsonb_build_object(
      'coins', jsonb_build_object('cp', 0, 'sp', 0, 'gp', 0, 'pp', 0),
      'items', inventory_items
    );

    ability_index := 0;
    for ability in select value from jsonb_array_elements(entry->'abilities') loop
      ability_index := ability_index + 1;
      ability_row := jsonb_build_object(
        'id', -(((entry->>'uuid')::bigint % 1000000000) * 100 + ability_index),
        'created_at', '',
        'name', ability->>'name',
        'actions', ability->>'actions',
        'level', (entry->>'level')::integer,
        'rarity', 'COMMON',
        'frequency', ability->>'frequency',
        'trigger', ability->>'trigger',
        'requirements', ability->>'requirements',
        'description', ability->>'description',
        'special', null,
        'prerequisites', null,
        'type', 'action',
        'traits', ability->'traits',
        'operations', null,
        'cost', ability->>'cost',
        'access', null,
        'meta_data', jsonb_build_object('source', source_data->'source'),
        'content_source_id', 400,
        'version', '1.0'
      );
      ability_rows := array_append(ability_rows, ability_row::json);
    end loop;

    for operation_index in 1..coalesce(array_length(operation_rows, 1), 0) loop
      hash_value := md5((entry->>'uuid') || ':operation:' || operation_index);
      stable_id := substr(hash_value, 1, 8) || '-' || substr(hash_value, 9, 4) || '-'
        || substr(hash_value, 13, 4) || '-' || substr(hash_value, 17, 4) || '-' || substr(hash_value, 21, 12);
      operation_rows[operation_index] := jsonb_set(
        operation_rows[operation_index]::jsonb, '{id}', to_jsonb(stable_id)
      )::json;
    end loop;

    select * into existing from public.creature
    where uuid = (entry->>'uuid')::bigint for update;
    if found then
      if existing.name is distinct from entry->>'name'
        or existing.level is distinct from (entry->>'level')::integer
        or existing.rarity is distinct from 'UNIQUE'
        or existing.content_source_id is distinct from 400
        or existing.type is distinct from 'creature'
        or existing.meta_data::jsonb is distinct from source_data
        or existing.details::jsonb is distinct from details_data
        or existing.inventory::jsonb is distinct from inventory_data
        or to_jsonb(existing.operations) is distinct from to_jsonb(operation_rows)
        or to_jsonb(existing.abilities_base) is distinct from to_jsonb(ability_rows)
        or existing.spells::jsonb is distinct from spells_data
        or existing.deprecated is distinct from false
        or existing.experience is distinct from 0
        or existing.hp_current is distinct from (entry->>'hp')::integer
        or existing.hp_temp is distinct from 0
        or existing.stamina_current is distinct from 0
        or existing.resolve_current is distinct from 0
        or existing.operation_data is not null then
        raise exception 'Existing War of Immortals creature % changed; review before importing', entry->>'name';
      end if;
      continue;
    end if;

    if exists (
      select 1 from public.creature
      where content_source_id = 400 and name = entry->>'name'
    ) then
      raise exception 'War of Immortals creature name % is already occupied', entry->>'name';
    end if;

    insert into public.creature (
      name, level, rarity, meta_data, content_source_id, version, uuid,
      inventory, notes, details, roll_history, operations, abilities_base,
      spells, deprecated, abilities_added, experience, hp_current, hp_temp,
      stamina_current, resolve_current, operation_data, type
    ) values (
      entry->>'name', (entry->>'level')::integer, 'UNIQUE', source_data,
      400, '1.0', (entry->>'uuid')::bigint,
      inventory_data::json, null, details_data::json, null, operation_rows, ability_rows,
      spells_data::json, false, null, 0, (entry->>'hp')::integer, 0,
      0, 0, null, 'creature'
    );
  end loop;
end
$mythic_entities$;
