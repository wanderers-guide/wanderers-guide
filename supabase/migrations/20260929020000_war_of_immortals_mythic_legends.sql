do $legends$
declare
  entries constant jsonb := $entries$
  [
    {
      "name": "Vulot", "level": 21, "uuid": 4812683280104077, "page": "177", "aon_id": 3404,
      "rarity": "UNIQUE", "size": "LARGE", "trait_ids": [2428, 2415, 4072, 4214],
      "attributes": {"STR": 4, "DEX": 6, "CON": 4, "INT": 7, "WIS": 7, "CHA": 10},
      "perception": 38, "senses": [{"name": "darkvision", "acuity": "PRECISE"}],
      "languages": [92, 81, 82, 307],
      "skills": {"DECEPTION": 43, "DIPLOMACY": 40, "SOCIETY": 40, "THIEVERY": 40},
      "ac": 46, "saves": {"FORT": 32, "REFLEX": 35, "WILL": 38}, "hp": 425,
      "immunities": ["mental"], "resistances": [], "weaknesses": ["cold iron, 10", "holy, 15"],
      "speeds": {"SPEED": 30}, "spell_dc": 44, "tradition": "DIVINE",
      "spells": [
        {"name": "Dominate", "id": 4581, "rank": 10, "casts": 1},
        {"name": "Manifestation", "id": 4714, "rank": 10, "casts": 1},
        {"name": "Shadow Blast", "id": 4825, "rank": 10, "casts": 2},
        {"name": "Overwhelming Presence", "id": 4750, "rank": 9, "casts": 1},
        {"name": "Divine Decree", "id": 4575, "rank": 7, "casts": 2},
        {"name": "Mislead", "id": 4727, "rank": 6, "casts": 3},
        {"name": "Repulsion", "id": 4800, "rank": 6, "casts": 1},
        {"name": "Translocate", "id": 4906, "rank": 5, "casts": 0},
        {"name": "Daze", "id": 4554, "rank": 10, "casts": 0},
        {"name": "Figment", "id": 4620, "rank": 10, "casts": 0},
        {"name": "Truesight", "id": 4912, "rank": 6, "casts": 0}
      ],
      "rituals": [{"name": "Demonic Pact", "id": 8350, "rank": 1}],
      "attacks": [
        {"name": "claw", "kind": "melee", "bonus": 37, "attribute": "DEX", "damage_attribute": "STR", "traits": [1569, 1570, 1504, 1846], "dice": 4, "die": "d8", "damage_type": "slashing", "flat": 14, "extra": "2d6 bleed"},
        {"name": "thought spike", "kind": "ranged", "bonus": 37, "attribute": "DEX", "damage_attribute": "NONE", "traits": [1504, 1448, 1846], "range": 120, "dice": 4, "die": "d6", "damage_type": "mental", "flat": 14, "extra": "Steal Thoughts"}
      ],
      "stat_block": {
        "listed_senses": ["darkvision"],
        "trait_labels": {"4214": "Unholy"},
        "recall_knowledge": "DC 42 (52 if Unique applies) • [Fiend](link_trait_2415) (Religion)",
        "perception_note": "many eyes in many places, [truesight](link_spell_4912)",
        "languages_note": "all languages spoken by their collective identities; [telepathy](link_ability_block_28884) 200 feet (unlimited range to cultists wearing stolen identities)",
        "immunities_note": "mythic immunity",
        "listed_skills": ["SKILL_DECEPTION", "SKILL_DIPLOMACY", "SKILL_SOCIETY", "SKILL_THIEVERY"],
        "innate_spell_frequencies": {"5:translocate": "AT-WILL", "6:truesight": "CONSTANT"},
        "omit_innate_attack": true
      },
      "abilities": [
        {"name": "Absolute Surety", "description": "When Vulot fails to deceive someone, including failing a Deception check to convince an observer that a *[mislead](link_spell_4727)* duplicate acted instead, Vulot takes 4d6 [mental](link_trait_1448) damage. This damage ignores Vulot's [mental](link_trait_1448) immunity."},
        {"name": "Many Eyes in Many Places", "description": "Vulot can extend their senses through up to three cultists wearing stolen identities in the Universe or Outer Rifts at once. Vulot cannot speak through those cultists."},
        {"name": "Another Face", "description": "At 0 Hit Points, Vulot reforms from a stolen identity of their choice in 24 hours. If no stolen identity remains or Vulot cannot reach one, Vulot dies permanently."},
        {"name": "Mythic Immunity", "description": "Vulot is immune to harmful spells cast by non-[mythic](link_trait_4072) creatures, [Strikes](link_action_19856) made with non-[mythic](link_trait_4072) weapons, and [unarmed](link_trait_2398) [Strikes](link_action_19856) made by non-[mythic](link_trait_4072) characters."},
        {"name": "Suffocated by a Thousand Breaths", "traits": [1492, 1481], "description": "[Aura](link_trait_1492) 30 feet. A creature starting its turn in the [aura](link_trait_1492) attempts a DC 41 Fortitude save. Critical success: unaffected. Success: off-guard until the beginning of its next turn. Failure: it cannot speak or use [auditory](link_trait_1469) actions until the beginning of its next turn, including casting spells without the [subtle](link_trait_1899) trait. Critical failure: it begins to suffocate. After succeeding at the save to regain consciousness, it is fatigued until a full night's rest."},
        {"name": "Perfect Mimicry", "actions": "REACTION", "traits": [1504, 1448], "trigger": "A spell is cast within 60 feet of Vulot.", "description": "Vulot copies the spell and can cast it once by spending 1 Mythic Point within 24 hours. Vulot can hold no more than two copied spells."},
        {"name": "Mythic Power", "description": "Vulot has 3 Mythic Points."},
        {"name": "Recharge Spell", "actions": "ONE-ACTION", "traits": [1432], "cost": "1 Mythic Point", "description": "Vulot gains one additional use of any innate spell."},
        {"name": "Remove a Condition", "actions": "ONE-ACTION", "traits": [1432], "cost": "1 Mythic Point", "description": "Vulot removes one condition currently affecting them."},
        {"name": "Steal Face", "actions": "TWO-ACTIONS", "cost": "1 Mythic Point", "description": "Vulot makes a claw [Strike](link_action_19856). On a hit, Vulot attempts Deception against the target's Will DC to steal its face; on a critical hit, increase the Deception result by one degree. Success steals the face for 1d4 rounds, or 1 minute on a critical success. While its face is stolen, no creature considers the target an ally."},
        {"name": "Steal Thoughts", "traits": [1486, 1448], "description": "A creature hit by thought spike attempts a DC 44 Will save. A target stupefied by this ability is off-guard to Steal Face. Critical success: unaffected. Success: stupefied 1 for 1 round. Failure: stupefied 1 for 1 minute; if already stupefied, increase that value by 1 instead, to a maximum of 4. Critical failure: as failure, and confused for 1 minute."}
      ]
    },
    {
      "name": "Immortal Trickster", "level": 11, "uuid": 4509376621863460, "page": "183", "aon_id": 3405,
      "rarity": "UNIQUE", "size": "MEDIUM", "trait_ids": [2422, 2399, 4072, 1556],
      "attributes": {"STR": 4, "DEX": 7, "CON": 4, "INT": 3, "WIS": 3, "CHA": 7},
      "perception": 24, "senses": [{"name": "darkvision", "acuity": "PRECISE"}],
      "languages": [81], "items": ["Wandering Pipe"],
      "skills": {"DECEPTION": 26, "DIPLOMACY": 23, "NATURE": 21, "SOCIETY": 21, "STEALTH": 23, "THIEVERY": 26},
      "ac": 31, "saves": {"FORT": 21, "REFLEX": 26, "WILL": 23}, "hp": 198,
      "immunities": ["disease", "paralyzed"], "resistances": [], "weaknesses": [],
      "speeds": {"SPEED": 30}, "spell_dc": 31, "tradition": "PRIMAL",
      "spells": [
        {"name": "Cursed Metamorphosis", "id": 4550, "rank": 6, "casts": 1},
        {"name": "Magic Passage", "id": 4710, "rank": 5, "casts": 1},
        {"name": "Wall of Stone", "id": 4944, "rank": 5, "casts": 1},
        {"name": "Creation", "id": 4545, "rank": 4, "casts": 2},
        {"name": "Detect Magic", "id": 4562, "rank": 6, "casts": 0},
        {"name": "Prestidigitation", "id": 4778, "rank": 6, "casts": 0},
        {"name": "Tangle Vine", "id": 4888, "rank": 6, "casts": 0},
        {"name": "Truespeech", "id": 4913, "rank": 5, "casts": 0}
      ],
      "attacks": [
        {"name": "pipe", "kind": "melee", "bonus": 23, "attribute": "DEX", "damage_attribute": "STR", "traits": [1569, 1570, 1504, 1542], "dice": 2, "die": "d6", "damage_type": "bludgeoning", "flat": 7, "extra": "2d6 fire"},
        {"name": "telekinetic manipulation", "kind": "ranged", "bonus": 23, "attribute": "DEX", "damage_attribute": "NONE", "traits": [1560, 1504], "range": 60, "dice": 2, "die": "d6", "damage_type": "force", "flat": 7, "extra": "Pull or Push"}
      ],
      "stat_block": {
        "listed_senses": ["darkvision"],
        "recall_knowledge": "DC 28 (38 if Unique applies) • [Beast](link_trait_2422) (Arcana, Nature), [Humanoid](link_trait_2399) (Society), [Spirit](link_trait_1556) (Occultism)",
        "languages_note": "[truespeech](link_spell_4913)",
        "resistances_note": "mythic resistance 11 to damage from attacks and spells by non-[mythic](link_trait_4072) creatures",
        "listed_skills": ["SKILL_DECEPTION", "SKILL_DIPLOMACY", "SKILL_NATURE", "SKILL_SOCIETY", "SKILL_STEALTH", "SKILL_THIEVERY"],
        "innate_spell_frequencies": {"5:truespeech": "CONSTANT"},
        "omit_innate_attack": true
      },
      "abilities": [
        {"name": "Trickster's Network", "description": "The Trickster can extend his senses through up to three coyotes, foxes, or ravens anywhere in the Universe at once. He can speak through each sensory animal in a single phrase of no more than two words. He has little control over their actions but can use a sensory animal to determine line of effect for spells and abilities."},
        {"name": "Immortal Tricks", "description": "At 0 Hit Points, the Trickster returns to life after 24 hours with full health and all abilities and Mythic Points restored. He usually returns where he died, but can appear anywhere on the same world where coyotes, foxes, or ravens exist."},
        {"name": "Mythic Resistance", "description": "The Trickster has resistance 11 to all damage from attacks and spells made by non-[mythic](link_trait_4072) creatures."},
        {"name": "Bond with Mortals", "actions": "TWO-ACTIONS", "traits": [1448, 1454], "frequency": "once per day", "description": "The Trickster bonds with one mortal. A bonded mortal gains 10 current and maximum Hit Points and a +2 status bonus to attack and damage rolls and to Deception, Stealth, and Thievery checks. The Trickster can communicate telepathically with bonded mortals on the same plane. Each week, their doomed value increases by 1 to a maximum of 3 and cannot decrease while bonded. Up to six mortals can be bonded; this action can end or form a bond, and death also ends it. When a bonded mortal dies, the Trickster gains drained 1 or increases drained by 1 and gains a +2 status bonus to his next attack roll or skill check."},
        {"name": "Change Shape", "actions": "ONE-ACTION", "traits": [1432, 1454, 1453], "description": "The Trickster takes the form of a coyote, fox, raven, or a locally appropriate Tiny or Small trickster animal. He loses his innate spells, attacks, and special actions while transformed, but otherwise keeps his statistics and can speak. Fox form is Tiny, coyote form is Small, both have Speed 35 feet and a bite +23 for 2d6+4 piercing damage. Raven form is Tiny with fly Speed 25 feet and an [agile](link_trait_1569) beak +23 for 2d4+4 piercing damage."},
        {"name": "Confounding Theft", "actions": "TWO-ACTIONS", "traits": [1433], "cost": "1 Mythic Point", "description": "The Trickster attempts Thievery against the Perception DC of one creature he can see within 60 feet. On a success, he takes one item of up to 2 Bulk that the target holds, wears, wields, or has stowed. This cannot be a full set of clothing, armor, or garments."},
        {"name": "Cunning Escape", "actions": "ONE-ACTION", "traits": [1432, 1470], "frequency": "once per day", "description": "The Trickster trades places with a sensory animal, taking all his possessions. A creature that witnessed Change Shape must succeed at a DC 38 Perception check to [Sense Motive](link_action_19847) or mistake the teleportation for another change of shape."},
        {"name": "Mythic Power", "description": "The Trickster has 3 Mythic Points."},
        {"name": "Mythic Skill", "actions": "FREE-ACTION", "cost": "1 Mythic Point", "description": "When making a Deception or Thievery check, the Trickster spends a Mythic Point to attempt it at [mythic](link_trait_4072) proficiency."},
        {"name": "Recharge Spell", "actions": "ONE-ACTION", "traits": [1432], "cost": "1 Mythic Point", "description": "The Trickster gains another casting of an innate primal spell he has already cast."},
        {"name": "Remove a Condition", "actions": "ONE-ACTION", "traits": [1432], "cost": "1 Mythic Point", "description": "The Trickster removes one condition currently affecting him."}
      ]
    },
    {
      "name": "Agyra", "level": 23, "uuid": 6892231756030293, "page": "189", "aon_id": 3406,
      "rarity": "UNIQUE", "size": "GARGANTUAN", "trait_ids": [2422, 4072], "kaiju": true,
      "attributes": {"STR": 10, "DEX": 11, "CON": 9, "INT": -2, "WIS": 6, "CHA": 6},
      "perception": 38, "senses": [{"name": "darkvision", "acuity": "PRECISE"}],
      "languages": [417],
      "skills": {"ACROBATICS": 43, "ATHLETICS": 41},
      "ac": 49, "saves": {"FORT": 37, "REFLEX": 40, "WILL": 34}, "hp": 475,
      "immunities": ["death effects", "disease", "drained", "electricity", "fear", "paralyzed"],
      "resistances": ["acid, 20", "fire, 20", "sonic, 20"], "weaknesses": [],
      "speeds": {"SPEED": 40, "SPEED_FLY": 60},
      "attacks": [
        {"name": "talon", "kind": "melee", "bonus": 40, "attribute": "STR", "damage_attribute": "STR", "traits": [1569, 1504, 4174], "dice": 4, "die": "d10", "damage_type": "slashing", "flat": 14, "extra": "2d8 electricity"},
        {"name": "jaws", "kind": "melee", "bonus": 40, "attribute": "STR", "damage_attribute": "STR", "traits": [1504, 4173], "dice": 3, "die": "d12", "damage_type": "piercing", "flat": 14, "extra": "2d8 electricity"},
        {"name": "tail", "kind": "melee", "bonus": 40, "attribute": "STR", "damage_attribute": "STR", "traits": [1706, 1504, 4175], "dice": 4, "die": "d8", "damage_type": "bludgeoning", "flat": 14, "extra": "2d6 persistent bleed"},
        {"name": "spike", "kind": "ranged", "bonus": 42, "attribute": "DEX", "damage_attribute": "NONE", "traits": [1504], "range": 60, "dice": 7, "die": "d6", "damage_type": "piercing", "flat": 10}
      ],
      "stat_block": {
        "listed_senses": ["darkvision"],
        "recall_knowledge": "DC 46 (56 if Unique applies) • [Beast](link_trait_2422) (Arcana, Nature)",
        "perception_note": "stormsight",
        "languages_note": "cannot speak any language",
        "defenses_note": "mythic resilience (Fortitude and Reflex)",
        "immunities_note": "mythic immunity ([Strikes](link_action_19856))",
        "hp_note": "regeneration 30",
        "listed_skills": ["SKILL_ACROBATICS", "SKILL_ATHLETICS"]
      },
      "abilities": [
        {"name": "Stormsight", "description": "Wind, precipitation, clouds, storms, and mist do not impair Agyra's vision. She ignores concealment caused by these conditions."},
        {"name": "Electrified Rebirth", "traits": [1576, 1454], "frequency": "once per year", "description": "When Agyra dies, touching her body within 1 hour deals 11d6 [electricity](link_trait_1576) damage (DC 43 basic Reflex save). After 1 minute she is resurrected in the same place at full health with all abilities restored. If she dies again in the same year, that death is permanent."},
        {"name": "Regeneration", "description": "Agyra regenerates 30 Hit Points each round."},
        {"name": "Mythic Immunity", "description": "Agyra is immune to [Strikes](link_action_19856) made with non-[mythic](link_trait_4072) weapons and [unarmed](link_trait_2398) [Strikes](link_action_19856) from non-[mythic](link_trait_4072) characters. This immunity does not cover spells."},
        {"name": "Mythic Resilience", "description": "Agyra treats Fortitude and Reflex saves as one degree of success better than rolled, subject to the normal limits on changing degrees of success."},
        {"name": "Mythic Defenses", "description": "Whenever a character rolls a critical hit against Agyra, that character rerolls the attack roll and uses the new result."},
        {"name": "Blinding Flash", "actions": "THREE-ACTIONS", "traits": [1517, 1433, 1454, 1479], "cost": "1 Mythic Point", "description": "While standing on the ground, Agyra flashes light at all creatures within 100 feet. Each target attempts a DC 43 Fortitude save. Critical success: unaffected. Success: dazzled and stupefied 1 for 1d4 rounds. Failure: blinded and stupefied 2 for 1 minute. Critical failure: blinded and stupefied 2 for 10 minutes."},
        {"name": "Conjure Hurricane", "actions": "THREE-ACTIONS", "traits": [1524, 1433, 1454], "frequency": "once per day", "cost": "1 Mythic Point", "description": "Agyra creates a hurricane in a 4-mile radius for 24 hours, with a 500-foot calm eye centered on her when formed. The hurricane then moves with weather conditions at the GM's discretion."},
        {"name": "Lightning Breath", "actions": "TWO-ACTIONS", "traits": [1576, 1454], "description": "Agyra exhales two 120-foot lines of [electricity](link_trait_1576), each 10 feet wide and aimed independently. A creature in either line takes 22d6 [electricity](link_trait_1576) damage (DC 44 basic Reflex save); on a failed save it is slowed 1 for 1d4 rounds. Overlapping lines affect a creature only once. A creature slain by the breath remains electrified for 2d4 rounds; touching its corpse deals 3d6 [electricity](link_trait_1576) damage without a save. Agyra cannot use Lightning Breath again for 1d4 rounds."},
        {"name": "Mythic Power", "description": "Agyra has 3 Mythic Points."},
        {"name": "Recharge Ability", "actions": "ONE-ACTION", "traits": [1432], "cost": "1 Mythic Point", "description": "Agyra gains one additional use of Lightning Breath."},
        {"name": "Remove a Condition", "actions": "ONE-ACTION", "traits": [1432], "cost": "1 Mythic Point", "description": "Agyra removes one condition currently affecting her."},
        {"name": "Stormflight", "description": "Agyra ignores difficult terrain from wind and does not need to [Maneuver in Flight](link_action_19740) in high winds."},
        {"name": "Thunderous Departure", "actions": "THREE-ACTIONS", "traits": [1454, 1484], "frequency": "once per day", "description": "Agyra [Flies](link_action_19721) in a straight line at least 120 feet and up to 1 mile without provoking reactions. A 100-foot burst centered on her departure point deals 15d10 [sonic](link_trait_1484) damage (DC 46 basic Fortitude save). Failure also knocks a creature prone; critical failure knocks it prone and deafens it permanently."}
      ]
    },
    {
      "name": "Oliphaunt of Jandelay", "level": 25, "uuid": 6724325327115429, "page": "195", "aon_id": 3407,
      "rarity": "UNIQUE", "size": "GARGANTUAN", "trait_ids": [2408, 4072],
      "attributes": {"STR": 12, "DEX": 5, "CON": 10, "INT": -1, "WIS": 7, "CHA": 7},
      "perception": 39, "senses": [{"name": "darkvision", "acuity": "PRECISE"}, {"name": "scent", "acuity": "IMPRECISE", "range": 120}],
      "languages": [93], "skills": {"ATHLETICS": 50},
      "ac": 48, "saves": {"FORT": 48, "REFLEX": 37, "WILL": 39}, "hp": 680,
      "immunities": ["clumsy", "cold", "disease", "drained", "enfeebled", "mental", "paralyzed", "persistent damage", "petrified", "poison", "polymorph", "prone", "slowed", "stunned", "stupefied"],
      "resistances": ["acid, 20", "fire, 20", "physical, 15"], "weaknesses": [],
      "speeds": {"SPEED": 60, "SPEED_FLY": 40}, "spell_dc": 46, "tradition": "DIVINE",
      "spells": [
        {"name": "Cataclysm", "id": 4429, "rank": 10, "casts": 1},
        {"name": "Unfettered Movement", "id": 4916, "rank": 4, "casts": 0}
      ],
      "attacks": [
        {"name": "tusk", "kind": "melee", "bonus": 45, "attribute": "STR", "damage_attribute": "STR", "traits": [1504, 4175], "dice": 4, "die": "d10", "damage_type": "piercing", "flat": 22, "extra": "Improved Grab"},
        {"name": "foot", "kind": "melee", "bonus": 45, "attribute": "STR", "damage_attribute": "STR", "traits": [1569, 1504, 4174], "dice": 4, "die": "d6", "damage_type": "bludgeoning", "flat": 22, "extra": "Improved Knockdown"},
        {"name": "trunk", "kind": "melee", "bonus": 45, "attribute": "STR", "damage_attribute": "STR", "traits": [1504, 4179], "dice": 2, "die": "d12", "damage_type": "bludgeoning", "flat": 22},
        {"name": "debris toss", "kind": "ranged", "bonus": 43, "attribute": "DEX", "damage_attribute": "STR_HALF", "traits": [1579], "display_traits": ["deadly 2d8"], "range": 150, "dice": 4, "die": "d8", "damage_type": "bludgeoning", "flat": 16}
      ],
      "stat_block": {
        "listed_senses": ["darkvision", "scent"],
        "recall_knowledge": "DC 50 (60 if Unique applies) • [Monitor](link_trait_2408) (Religion)",
        "languages_note": "cannot speak any language",
        "defenses_note": "mythic resilience (all saves)",
        "immunities_note": "mythic immunity",
        "hp_note": "regeneration 30",
        "listed_skills": ["SKILL_ATHLETICS"],
        "innate_spell_frequencies": {"4:unfettered movement": "CONSTANT"},
        "omit_innate_attack": true
      },
      "abilities": [
        {"name": "Frightful Presence", "traits": [1492, 1486, 1487, 1448], "description": "[Aura](link_trait_1492) 300 feet. A creature entering the [aura](link_trait_1492) for the first time attempts a DC 46 Will save and then becomes temporarily immune to this presence for 1 minute. Critical success: unaffected. Success: frightened 1. Failure: frightened 2. Critical failure: frightened 4."},
        {"name": "Regeneration", "description": "The Oliphaunt regenerates 30 Hit Points each round."},
        {"name": "Mythic Immunity", "description": "The Oliphaunt is immune to harmful spells cast by non-[mythic](link_trait_4072) creatures, [Strikes](link_action_19856) made with non-[mythic](link_trait_4072) weapons, and [unarmed](link_trait_2398) [Strikes](link_action_19856) made by non-[mythic](link_trait_4072) characters."},
        {"name": "Mythic Resilience", "description": "The Oliphaunt treats Fortitude, Reflex, and Will saves as one degree of success better than rolled, subject to the normal limits on changing degrees of success."},
        {"name": "Mythic Defenses", "description": "The first time each round a character rolls a critical hit against the Oliphaunt, that character rerolls the attack roll and uses the new result."},
        {"name": "Reactive", "description": "The Oliphaunt gains 3 reactions each round, but can use only one reaction for each trigger."},
        {"name": "Reactive Strike", "actions": "REACTION", "trigger": "A creature within the Oliphaunt's reach uses a [manipulate](link_trait_1433) or [move](link_trait_1505) action, makes a ranged attack, or leaves a square during a [move](link_trait_1505) action.", "description": "The Oliphaunt makes a melee [Strike](link_action_19856) against the triggering creature. On a critical hit against a [manipulate](link_trait_1433) action, it disrupts that action. This [Strike](link_action_19856) neither counts toward nor is affected by the Oliphaunt's multiple attack penalty."},
        {"name": "Brutal Drag", "description": "When the Oliphaunt [Strides](link_action_19855), a creature grabbed by its tusk moves with it to a square within 20 feet of the Oliphaunt's ending position chosen by the GM, and remains grabbed."},
        {"name": "Destructive Frenzy", "actions": "THREE-ACTIONS", "description": "The Oliphaunt makes two tusk [Strikes](link_action_19856), two foot [Strikes](link_action_19856), and one trunk [Strike](link_action_19856) in any order."},
        {"name": "Devastating Launch", "actions": "TWO-ACTIONS", "cost": "1 Mythic Point", "description": "The Oliphaunt buries its tusks into the ground in a 15-foot burst centered within 20 feet, then flings everything there, including a creature grabbed by its tusks, up to 120 feet. Everything lands in a GM-chosen square of a 30-foot burst. The impact deals 12d6 bludgeoning damage to creatures there and to flung creatures, vehicles, and objects (DC 51 basic Reflex save). A flung creature that succeeds or critically succeeds remains where it began."},
        {"name": "Legendary Vigor", "description": "The Oliphaunt is immune to penalties to its Speeds and ignores difficult terrain and greater difficult terrain."},
        {"name": "Mythic Power", "description": "The Oliphaunt has 3 Mythic Points."},
        {"name": "Remove a Condition", "actions": "ONE-ACTION", "traits": [1432], "cost": "1 Mythic Point", "description": "The Oliphaunt removes one condition currently affecting it."},
        {"name": "Undying Myth", "actions": "FREE-ACTION", "cost": "All remaining Mythic Points", "trigger": "The Oliphaunt would die and has at least 1 Mythic Point.", "description": "The Oliphaunt remains standing and conscious and recovers 50% of its maximum Hit Points."},
        {"name": "Trample", "actions": "THREE-ACTIONS", "description": "Huge or smaller creatures, foot, DC 46. The Oliphaunt can [Stride](link_action_19855) up to triple its Speed; a creature that fails or critically fails the Reflex save is knocked prone."},
        {"name": "Trumpeting Blast", "actions": "TWO-ACTIONS", "traits": [1484], "description": "The Oliphaunt releases a 120-foot cone of sound. Each creature attempts a DC 49 Fortitude save. It can spend 1 Mythic Point to raise the DC to 51 and change the damage dice to d12s. It cannot use Trumpeting Blast again for 1d4 rounds. Critical success: unaffected. Success: 7d10 [sonic](link_trait_1484) damage and deafened for 1 round. Failure: 14d10 [sonic](link_trait_1484) damage, slowed 1 for 2 rounds, deafened for 2 rounds. Critical failure: 28d10 [sonic](link_trait_1484) damage, slowed 2 for 2 rounds, deafened for 4 rounds."}
      ]
    }
  ]
  $entries$::jsonb;
  entry jsonb;
  pair record;
  part jsonb;
  attack jsonb;
  spell jsonb;
  ability jsonb;
  item_name text;
  item_data jsonb;
  inventory_items jsonb;
  expected_meta_data jsonb;
  expected_inventory jsonb;
  expected_details jsonb;
  expected_spells jsonb;
  expected_content jsonb;
  actual_content jsonb;
  normalized_operations jsonb;
  normalized_inventory_items jsonb;
  operations json[];
  abilities json[];
  existing_creature public.creature;
  existing_count integer;
  existing_id bigint;
  source_id bigint := 400;
  kaiju_trait_id bigint;
  trait_id bigint;
  language_id bigint;
  adjustment integer;
  damage_adjustment integer;
  attribute_value integer;
  source_name text;
begin
  if not exists (select 1 from public.content_source where id = source_id and name = 'War of Immortals' and is_published) then
    raise exception 'War of Immortals source changed; review before importing mythic legends';
  end if;

  if exists (select 1 from public.content_update where content_source_id = source_id and type = 'creature' and status->>'state' = 'PENDING') then
    raise exception 'War of Immortals has a pending creature submission';
  end if;

  select id into kaiju_trait_id from public.trait where uuid = 7063249107400705 and name = 'Kaiju' and content_source_id = 3;
  if kaiju_trait_id is null then
    raise exception 'Kaiju trait is missing';
  end if;
  if not exists (
    select 1 from public.trait
    where id = 4214 and uuid = 2953289258892922 and name = 'Unholy (creature)'
      and meta_data->>'creature_trait' = 'true'
  ) then
    raise exception 'Unholy creature trait is missing';
  end if;

  if jsonb_array_length(entries) <> 4 then
    raise exception 'Mythic legend catalog has changed; review before importing';
  end if;

  for entry in select value from jsonb_array_elements(entries) loop
    operations := '{}'::json[];
    abilities := '{}'::json[];
    inventory_items := '[]'::jsonb;
    source_name := upper(replace(entry->>'name', ' ', '_')) || '_INNATE';

    for pair in select key, value from jsonb_each_text(entry->'attributes') loop
      operations := array_append(operations, json_build_object(
        'id', gen_random_uuid(), 'type', 'setValue',
        'data', json_build_object('variable', 'ATTRIBUTE_' || pair.key, 'value', json_build_object('value', pair.value::integer, 'partial', false))
      ));
    end loop;

    for item_name in select value from jsonb_array_elements_text('["UNARMORED_DEFENSE", "UNARMED_ATTACKS", "PERCEPTION", "SAVE_FORT", "SAVE_REFLEX", "SAVE_WILL"]'::jsonb) loop
      operations := array_append(operations, json_build_object(
        'id', gen_random_uuid(), 'type', 'adjValue',
        'data', json_build_object('variable', item_name, 'value', json_build_object('value', 'T'))
      ));
    end loop;

    operations := array_append(operations, json_build_object(
      'id', gen_random_uuid(), 'type', 'adjValue',
      'data', json_build_object('variable', 'AC_BONUS', 'value', (entry->>'ac')::integer - 10 - (entry->>'level')::integer - 2 - (entry->'attributes'->>'DEX')::integer)
    ));
    operations := array_append(operations, json_build_object(
      'id', gen_random_uuid(), 'type', 'adjValue',
      'data', json_build_object('variable', 'MAX_HEALTH_BONUS', 'value', (entry->>'hp')::integer - (entry->>'level')::integer * (entry->'attributes'->>'CON')::integer)
    ));
    operations := array_append(operations, json_build_object(
      'id', gen_random_uuid(), 'type', 'addBonusToValue',
      'data', json_build_object('variable', 'PERCEPTION', 'value', (entry->>'perception')::integer - (entry->>'level')::integer - 2 - (entry->'attributes'->>'WIS')::integer, 'text', '')
    ));

    for pair in select key, value from jsonb_each_text(entry->'saves') loop
      attribute_value := (entry->'attributes'->>case pair.key when 'FORT' then 'CON' when 'REFLEX' then 'DEX' else 'WIS' end)::integer;
      operations := array_append(operations, json_build_object(
        'id', gen_random_uuid(), 'type', 'addBonusToValue',
        'data', json_build_object('variable', 'SAVE_' || pair.key, 'value', pair.value::integer - (entry->>'level')::integer - 2 - attribute_value, 'text', '')
      ));
    end loop;

    for pair in select key, value from jsonb_each_text(entry->'skills') loop
      operations := array_append(operations, json_build_object(
        'id', gen_random_uuid(), 'type', 'adjValue',
        'data', json_build_object('variable', 'SKILL_' || pair.key, 'value', json_build_object('value', 'T'))
      ));
      attribute_value := (entry->'attributes'->>case pair.key
        when 'ACROBATICS' then 'DEX' when 'ATHLETICS' then 'STR' when 'DECEPTION' then 'CHA'
        when 'DIPLOMACY' then 'CHA' when 'NATURE' then 'WIS' when 'SOCIETY' then 'INT'
        when 'STEALTH' then 'DEX' when 'THIEVERY' then 'DEX' end)::integer;
      if attribute_value is null then
        raise exception 'Unmapped skill % for %', pair.key, entry->>'name';
      end if;
      adjustment := pair.value::integer - (entry->>'level')::integer - 2 - attribute_value;
      operations := array_append(operations, json_build_object(
        'id', gen_random_uuid(), 'type', 'addBonusToValue',
        'data', json_build_object('variable', 'SKILL_' || pair.key, 'value', adjustment, 'text', '')
      ));
    end loop;

    operations := array_append(operations, json_build_object(
      'id', gen_random_uuid(), 'type', 'setValue',
      'data', json_build_object('variable', 'SIZE', 'value', entry->>'size')
    ));

    for trait_id in select value::bigint from jsonb_array_elements_text(entry->'trait_ids') loop
      if not exists (select 1 from public.trait where id = trait_id) then
        raise exception 'Missing creature trait % for %', trait_id, entry->>'name';
      end if;
      operations := array_append(operations, json_build_object(
        'id', gen_random_uuid(), 'type', 'giveTrait', 'data', json_build_object('traitId', trait_id)
      ));
    end loop;
    if coalesce((entry->>'kaiju')::boolean, false) then
      operations := array_append(operations, json_build_object(
        'id', gen_random_uuid(), 'type', 'giveTrait', 'data', json_build_object('traitId', kaiju_trait_id)
      ));
    end if;

    for language_id in select value::bigint from jsonb_array_elements_text(entry->'languages') loop
      if not exists (select 1 from public.language where id = language_id) then
        raise exception 'Missing language % for %', language_id, entry->>'name';
      end if;
      operations := array_append(operations, json_build_object(
        'id', gen_random_uuid(), 'type', 'giveLanguage', 'data', json_build_object('languageId', language_id)
      ));
    end loop;

    for part in select value from jsonb_array_elements(entry->'senses') loop
      operations := array_append(operations, json_build_object(
        'id', gen_random_uuid(), 'type', 'adjValue',
        'data', json_build_object('variable', 'SENSES_' || (part->>'acuity'),
          'value', (part->>'name') || case when part ? 'range' then ', ' || (part->>'range') else '' end)
      ));
    end loop;

    for pair in select key, value from jsonb_each_text(entry->'speeds') loop
      operations := array_append(operations, json_build_object(
        'id', gen_random_uuid(), 'type', 'setValue',
        'data', json_build_object('variable', pair.key, 'value', pair.value::integer)
      ));
    end loop;

    for part in select value from jsonb_array_elements(entry->'immunities') loop
      operations := array_append(operations, json_build_object(
        'id', gen_random_uuid(), 'type', 'adjValue',
        'data', json_build_object('variable', 'IMMUNITIES', 'value', trim(both '"' from part::text))
      ));
    end loop;
    for part in select value from jsonb_array_elements(entry->'resistances') loop
      operations := array_append(operations, json_build_object(
        'id', gen_random_uuid(), 'type', 'adjValue',
        'data', json_build_object('variable', 'RESISTANCES', 'value', trim(both '"' from part::text))
      ));
    end loop;
    for part in select value from jsonb_array_elements(entry->'weaknesses') loop
      operations := array_append(operations, json_build_object(
        'id', gen_random_uuid(), 'type', 'adjValue',
        'data', json_build_object('variable', 'WEAKNESSES', 'value', trim(both '"' from part::text))
      ));
    end loop;

    if entry ? 'spell_dc' then
      operations := array_append(operations, json_build_object(
        'id', gen_random_uuid(), 'type', 'addBonusToValue',
        'data', json_build_object('variable', 'SPELL_DC', 'value', (entry->>'spell_dc')::integer - 10 - (entry->>'level')::integer
          - case when (entry->>'level')::integer >= 12 then 4 else 2 end - (entry->'attributes'->>'CHA')::integer, 'text', '')
      ));
      operations := array_append(operations, json_build_object(
        'id', gen_random_uuid(), 'type', 'defineCastingSource',
        'data', json_build_object('variable', 'CASTING_SOURCES', 'value', source_name || ':::null:::' || (entry->>'tradition') || ':::ATTRIBUTE_CHA')
      ));
    end if;
    for spell in select value from jsonb_array_elements(coalesce(entry->'spells', '[]'::jsonb)) loop
      if not exists (select 1 from public.spell s where s.id = (spell->>'id')::bigint and lower(s.name) = lower(spell->>'name')) then
        raise exception 'Missing spell % for %', spell->>'name', entry->>'name';
      end if;
      operations := array_append(operations, json_build_object(
        'id', gen_random_uuid(), 'type', 'giveSpell',
        'data', json_build_object('spellId', (spell->>'id')::integer, 'type', 'INNATE',
          'castingSource', source_name, 'rank', (spell->>'rank')::integer,
          'tradition', entry->>'tradition', 'casts', (spell->>'casts')::integer)
      ));
    end loop;
    for spell in select value from jsonb_array_elements(coalesce(entry->'rituals', '[]'::jsonb)) loop
      if not exists (select 1 from public.spell s where s.id = (spell->>'id')::bigint and lower(s.name) = lower(spell->>'name')) then
        raise exception 'Missing ritual % for %', spell->>'name', entry->>'name';
      end if;
      operations := array_append(operations, json_build_object(
        'id', gen_random_uuid(), 'type', 'giveSpell',
        'data', json_build_object('spellId', (spell->>'id')::integer, 'type', 'NORMAL',
          'castingSource', 'RITUALS', 'rank', (spell->>'rank')::integer,
          'tradition', entry->>'tradition', 'casts', 1)
      ));
    end loop;

    for attack in select value from jsonb_array_elements(entry->'attacks') loop
      for trait_id in select value::bigint from jsonb_array_elements_text(attack->'traits') loop
        if not exists (select 1 from public.trait where id = trait_id) then
          raise exception 'Missing attack trait % for %', trait_id, entry->>'name';
        end if;
      end loop;
      attribute_value := (entry->'attributes'->>(attack->>'attribute'))::integer;
      adjustment := (attack->>'bonus')::integer - (entry->>'level')::integer - 2 - attribute_value;
      damage_adjustment := (attack->>'flat')::integer - case attack->>'damage_attribute'
        when 'STR' then (entry->'attributes'->>'STR')::integer
        when 'STR_HALF' then floor((entry->'attributes'->>'STR')::numeric / 2)::integer
        else 0 end;
      item_data := jsonb_build_object(
        'id', 5000000000000000::bigint + abs(hashtext((entry->>'name') || ':' || (attack->>'name'))::bigint),
        'created_at', '', 'name', attack->>'name', 'level', 0, 'rarity', 'COMMON',
        'traits', attack->'traits', 'description', '', 'group', 'WEAPON', 'size', 'MEDIUM',
        'meta_data', jsonb_strip_nulls(jsonb_build_object(
          'category', 'unarmed_attack', 'group', 'brawling',
          'damage', jsonb_build_object('damageType', attack->>'damage_type', 'dice', (attack->>'dice')::integer,
            'die', attack->>'die', 'extra', damage_adjustment::text || case when attack ? 'extra' then ' + ' || (attack->>'extra') else '' end),
          'attack_bonus', adjustment, 'range', case when attack ? 'range' then (attack->>'range')::integer else null end,
          'display_traits', attack->'display_traits', 'bulk', '{}'::jsonb,
          'unselectable', true, 'quantity', 1, 'foundry', '{}'::jsonb,
          'source', jsonb_build_object('book', 'War of Immortals', 'page', entry->>'page',
            'url', 'https://2e.aonprd.com/Monsters.aspx?ID=' || (entry->>'aon_id'))
        )),
        'operations', '[]'::jsonb, 'price', null, 'bulk', null, 'hands', null,
        'craft_requirements', null, 'usage', null, 'content_source_id', source_id, 'version', '1.0'
      );
      inventory_items := inventory_items || jsonb_build_array(jsonb_build_object(
        'id', gen_random_uuid(), 'item', item_data, 'is_formula', false,
        'is_equipped', true, 'is_invested', false, 'is_implanted', false,
        'container_contents', '[]'::jsonb
      ));
    end loop;

    for item_name in select value from jsonb_array_elements_text(coalesce(entry->'items', '[]'::jsonb)) loop
      select to_jsonb(i) - 'search_tsv' into item_data from public.item i
        where i.name = item_name and i.content_source_id = source_id;
      if item_data is null then
        raise exception 'Missing item % for %', item_name, entry->>'name';
      end if;
      inventory_items := inventory_items || jsonb_build_array(jsonb_build_object(
        'id', gen_random_uuid(), 'item', item_data, 'is_formula', false,
        'is_equipped', true, 'is_invested', true, 'is_implanted', false,
        'container_contents', '[]'::jsonb
      ));
    end loop;

    for ability in select value from jsonb_array_elements(entry->'abilities') loop
      for trait_id in select value::bigint from jsonb_array_elements_text(coalesce(ability->'traits', '[]'::jsonb)) loop
        if not exists (select 1 from public.trait where id = trait_id) then
          raise exception 'Missing ability trait % for %', trait_id, entry->>'name';
        end if;
      end loop;
      abilities := array_append(abilities, json_build_object(
        'id', -1, 'created_at', '', 'name', ability->>'name',
        'actions', ability->>'actions', 'level', (entry->>'level')::integer,
        'rarity', 'COMMON', 'frequency', ability->>'frequency',
        'trigger', ability->>'trigger', 'requirements', ability->>'requirements',
        'description', ability->>'description', 'special', null, 'prerequisites', null,
        'type', 'action', 'traits', coalesce(ability->'traits', '[]'::jsonb),
        'operations', null, 'cost', ability->>'cost', 'access', null, 'meta_data', null,
        'content_source_id', source_id, 'version', '1.0'
      ));
    end loop;

    expected_meta_data := jsonb_build_object(
      'source', jsonb_build_object('book', 'War of Immortals', 'page', entry->>'page',
        'url', 'https://2e.aonprd.com/Monsters.aspx?ID=' || (entry->>'aon_id')),
      'stat_block', entry->'stat_block', 'mythic_points', 3
    );
    expected_inventory := jsonb_build_object(
      'coins', jsonb_build_object('cp', 0, 'sp', 0, 'gp', 0, 'pp', 0), 'items', inventory_items
    );
    expected_details := jsonb_build_object('description', '', 'image_url', '');
    expected_spells := jsonb_build_object(
      'slots', '[]'::jsonb, 'list', '[]'::jsonb, 'focus_point_current', 0, 'innate_casts', '[]'::jsonb
    );

    select coalesce(jsonb_agg(op.value - 'id' order by op.ordinality), '[]'::jsonb)
      into normalized_operations
      from jsonb_array_elements(to_jsonb(operations)) with ordinality as op(value, ordinality);
    select coalesce(jsonb_agg(inv.value - 'id' order by inv.ordinality), '[]'::jsonb)
      into normalized_inventory_items
      from jsonb_array_elements(inventory_items) with ordinality as inv(value, ordinality);
    expected_content := jsonb_build_object(
      'name', entry->>'name', 'level', (entry->>'level')::integer, 'rarity', entry->>'rarity',
      'meta_data', expected_meta_data, 'content_source_id', source_id, 'version', '1.0',
      'uuid', (entry->>'uuid')::bigint, 'type', 'creature',
      'inventory', jsonb_set(expected_inventory, '{items}', normalized_inventory_items),
      'notes', null, 'details', expected_details, 'roll_history', null,
      'operations', normalized_operations, 'abilities_base', to_jsonb(abilities),
      'spells', expected_spells, 'deprecated', false, 'abilities_added', '[]'::jsonb,
      'experience', 0, 'hp_current', (entry->>'hp')::integer, 'hp_temp', 0,
      'stamina_current', 0, 'resolve_current', 0, 'operation_data', '{}'::jsonb
    );

    select count(*), max(c.id) into existing_count, existing_id
      from public.creature c
      where c.uuid = (entry->>'uuid')::bigint
        or (c.content_source_id = source_id and lower(c.name) = lower(entry->>'name'))
        or (c.meta_data->'source'->>'url') = ('https://2e.aonprd.com/Monsters.aspx?ID=' || (entry->>'aon_id'));
    if existing_count > 0 then
      if existing_count <> 1 then
        raise exception 'Mythic legend catalog has changed; review before importing';
      end if;
      select * into existing_creature from public.creature where id = existing_id;
      actual_content := to_jsonb(existing_creature) - '{id,created_at,updated_at,search_tsv}'::text[];
      select jsonb_set(actual_content, '{operations}',
        coalesce(jsonb_agg(op.value - 'id' order by op.ordinality), '[]'::jsonb))
        into actual_content
        from jsonb_array_elements(actual_content->'operations') with ordinality as op(value, ordinality);
      select jsonb_set(actual_content, '{inventory,items}',
        coalesce(jsonb_agg(inv.value - 'id' order by inv.ordinality), '[]'::jsonb))
        into actual_content
        from jsonb_array_elements(actual_content->'inventory'->'items') with ordinality as inv(value, ordinality);
      if actual_content is distinct from expected_content then
        raise exception 'Existing mythic legend % differs from reviewed content', entry->>'name';
      end if;
      continue;
    end if;

    insert into public.creature (
      name, level, rarity, meta_data, content_source_id, version, uuid,
      inventory, notes, details, roll_history, operations, abilities_base, spells,
      deprecated, abilities_added, experience, hp_current, hp_temp,
      stamina_current, resolve_current, operation_data
    ) values (
      entry->>'name', (entry->>'level')::integer, entry->>'rarity',
      expected_meta_data,
      source_id, '1.0', (entry->>'uuid')::bigint,
      expected_inventory::json,
      null, expected_details::json,
      null, operations, abilities,
      expected_spells::json,
      false, '{}'::bigint[], 0, (entry->>'hp')::integer, 0, 0, 0, '{}'::json
    );
  end loop;
end;
$legends$;
