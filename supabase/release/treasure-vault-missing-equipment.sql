with settings as (select $equipment$
{
  "items": [
    {
      "name": "Violet Venom",
      "uuid": "3657591025546460",
      "row": {
        "name": "Violet Venom",
        "bulk": "0.1",
        "level": 3,
        "rarity": "UNCOMMON",
        "description": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([manipulate](link_trait_1433))\n\n* * *\n\nThe delicate process of extracting violet venom from a [violet fungus](link_creature_11195) leaves it diluted at the best of times. Alchemists are still on the hunt for a truly pure, unadulterated version of this highly toxic poison.\n\n**Saving Throw** DC 17 Fortitude; **Onset** 1 minute; **Maximum Duration** 6 rounds; **Stage 1** 1d6 [poison](link_trait_1476) plus enfeebled 1 (1 round); **Stage 2** 1d6 [poison](link_trait_1476) plus drained 1 (1 round); **Stage 3** 2d6 [poison](link_trait_1476) plus enfeebled 1 (1 round)",
        "group": "GENERAL",
        "hands": null,
        "size": "MEDIUM",
        "craft_requirements": null,
        "usage": "held in 2 hands",
        "meta_data": {
          "bulk": {},
          "charges": {},
          "image_url": "",
          "is_shoddy": false,
          "unselectable": false,
          "starfinder": {},
          "quantity": 1,
          "source": {
            "book": "Treasure Vault (Remastered)",
            "page": "71",
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=2019"
          }
        },
        "operations": [],
        "content_source_id": 16,
        "version": "1.0",
        "uuid": 3657591025546460,
        "price": {
          "gp": 12
        },
        "traits": [
          1529,
          1531,
          1566,
          1476
        ],
        "availability": null
      },
      "metadata_absent": [
        "deprecated",
        "base_item",
        "base_item_content",
        "category",
        "group",
        "damage",
        "runes",
        "attack_bonus",
        "ac_bonus",
        "range",
        "reload",
        "hp",
        "hardness",
        "container_default_items",
        "display_traits",
        "inventory_label"
      ]
    },
    {
      "name": "Spiritsight Ring",
      "uuid": "4421008231316681",
      "row": {
        "name": "Spiritsight Ring",
        "bulk": "0",
        "level": 6,
        "rarity": "UNCOMMON",
        "description": "The opal set in the intricately carved ivory spiritsight ring eventually becomes translucent and tickles your finger whenever an [incorporeal](link_trait_2424) creature is nearby. When in the presence of a nearby [incorporeal](link_trait_2424) creature, even if it's within a solid object, you eventually detect the creature, though you might not do so instantly, and you can't pinpoint the location. This acts as a vague sense, like humans' sense of smell.\n\nAn [incorporeal](link_trait_2424) creature trying to hide its presence from this sense attempts a Stealth check against your Perception DC to hide from your vague sense, as normal for attempting to foil special senses. You gain a +2 item bonus when using the [Seek](link_action_19845) action to find hidden or undetected [incorporeal](link_trait_2424) creatures within 30 feet of you.",
        "group": "GENERAL",
        "hands": null,
        "size": "MEDIUM",
        "craft_requirements": null,
        "usage": "worn",
        "meta_data": {
          "bulk": {},
          "charges": {},
          "image_url": "",
          "is_shoddy": false,
          "unselectable": false,
          "starfinder": {},
          "quantity": 1,
          "source": {
            "book": "Treasure Vault (Remastered)",
            "page": "154",
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=2346"
          }
        },
        "operations": [
          {
            "id": "dc4a86b2-1699-4195-aa72-9b8bb277a46d",
            "type": "addBonusToValue",
            "data": {
              "variable": "PERCEPTION",
              "value": 2,
              "type": "item",
              "text": "when using the Seek action to find hidden or undetected incorporeal creatures within 30 feet of you"
            }
          },
          {
            "id": "9a2e77db-5793-46c9-bdd5-56e977195293",
            "type": "adjValue",
            "data": {
              "variable": "SENSES_VAGUE",
              "value": "incorporeal creatures"
            }
          }
        ],
        "content_source_id": 16,
        "version": "1.0",
        "uuid": 4421008231316681,
        "price": {
          "gp": 225
        },
        "traits": [
          1527,
          1504
        ],
        "availability": null
      },
      "metadata_absent": [
        "deprecated",
        "base_item",
        "base_item_content",
        "category",
        "group",
        "damage",
        "runes",
        "attack_bonus",
        "ac_bonus",
        "range",
        "reload",
        "hp",
        "hardness",
        "container_default_items",
        "display_traits",
        "inventory_label"
      ]
    },
    {
      "name": "Rhinoceros Mask",
      "uuid": "8502463443227114",
      "row": {
        "name": "Rhinoceros Mask",
        "bulk": "0",
        "level": 4,
        "rarity": "UNCOMMON",
        "description": "Covered with thick armor and bearing a thicker horn, a rhinoceros mask grants you increased momentum. If you [Stride](link_action_19855) at least 10 feet, your next melee [Strike](link_action_19856) before the end of your turn ignores the Hardness of objects with a Hardness of 5 or less. If the object has more than Hardness 5, the mask grants no benefit.",
        "group": "GENERAL",
        "hands": null,
        "size": "MEDIUM",
        "craft_requirements": null,
        "usage": "worn mask",
        "meta_data": {
          "bulk": {},
          "charges": {},
          "image_url": "",
          "is_shoddy": false,
          "unselectable": false,
          "starfinder": {},
          "quantity": 1,
          "source": {
            "book": "Treasure Vault (Remastered)",
            "page": "155",
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=2352"
          }
        },
        "operations": [],
        "content_source_id": 16,
        "version": "1.0",
        "uuid": 8502463443227114,
        "price": {
          "gp": 90
        },
        "traits": [
          1527,
          1504
        ],
        "availability": null
      },
      "metadata_absent": [
        "deprecated",
        "base_item",
        "base_item_content",
        "category",
        "group",
        "damage",
        "runes",
        "attack_bonus",
        "ac_bonus",
        "range",
        "reload",
        "hp",
        "hardness",
        "container_default_items",
        "display_traits",
        "inventory_label"
      ]
    },
    {
      "name": "Rhinoceros Mask (Greater)",
      "uuid": "38891152761114",
      "row": {
        "name": "Rhinoceros Mask (Greater)",
        "bulk": "0",
        "level": 8,
        "rarity": "UNCOMMON",
        "description": "Covered with thick armor and bearing a thicker horn, a rhinoceros mask grants you increased momentum. If you [Stride](link_action_19855) at least 10 feet, your next melee [Strike](link_action_19856) before the end of your turn ignores the Hardness of objects with a Hardness of 10 or less. If the object has more than Hardness 10, the mask grants no benefit.",
        "group": "GENERAL",
        "hands": null,
        "size": "MEDIUM",
        "craft_requirements": null,
        "usage": "worn mask",
        "meta_data": {
          "bulk": {},
          "charges": {},
          "image_url": "",
          "is_shoddy": false,
          "unselectable": false,
          "starfinder": {},
          "quantity": 1,
          "source": {
            "book": "Treasure Vault (Remastered)",
            "page": "155",
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=2352"
          }
        },
        "operations": [],
        "content_source_id": 16,
        "version": "1.0",
        "uuid": 38891152761114,
        "price": {
          "gp": 425
        },
        "traits": [
          1527,
          1504
        ],
        "availability": null
      },
      "metadata_absent": [
        "deprecated",
        "base_item",
        "base_item_content",
        "category",
        "group",
        "damage",
        "runes",
        "attack_bonus",
        "ac_bonus",
        "range",
        "reload",
        "hp",
        "hardness",
        "container_default_items",
        "display_traits",
        "inventory_label"
      ]
    }
  ],
  "dependencies": [
    {
      "table": "ability_block",
      "queue_type": "ability-block",
      "id": 19845,
      "name": "Seek",
      "uuid": "2039728856448174",
      "source": 3,
      "expected": {
        "id": 19845,
        "operations": null,
        "name": "Seek",
        "actions": "ONE-ACTION",
        "level": 1,
        "rarity": "COMMON",
        "prerequisites": [],
        "frequency": null,
        "cost": null,
        "trigger": null,
        "requirements": null,
        "access": null,
        "description": "You scan an area for signs of creatures or objects, possibly including secret doors or hazards. Choose an area to scan. The GM determines the area you can scan with one Seek action--almost always 30 feet or less in any dimension. The GM might impose a penalty if you search far away from you or adjust the number of actions it takes to Seek a particularly cluttered area.\n\nThe GM attempts a single secret Perception check for you and compares the result to the Stealth DCs of any undetected or hidden creatures in the area, or the DC to detect each object in the area (as determined by the GM or by someone [Concealing the Object](link_action_19615)). A creature you detect might remain hidden, rather than becoming observed, if you're using an imprecise sense or if an effect (such as [invisibility](link_spell_4689)) prevents the subject from being observed.\n\n**Critical Success** Any undetected or hidden creature you critically succeeded against becomes observed by you. You learn the location of objects in the area you critically succeeded against.\n\n**Success** Any undetected creature you suceeded against becomes hidden from you instead of undetected, and any hidden creature you succeeded against becomes observed by you. You learn the location of any object or get a clue to its whereabouts, as determined by the GM.",
        "special": null,
        "type": "action",
        "traits": [
          1432,
          1463
        ],
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "2039728856448174",
        "availability": null
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Actions.aspx?ID=2301",
          "book": "Player Core",
          "page": "417"
        },
        "foundry": {
          "rules": []
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "hidden",
        "apex",
        "focus",
        "ritual",
        "type",
        "class_trait",
        "ancestry_trait"
      ]
    },
    {
      "table": "ability_block",
      "queue_type": "ability-block",
      "id": 19856,
      "name": "Strike",
      "uuid": "2549047613995403",
      "source": 3,
      "expected": {
        "id": 19856,
        "operations": null,
        "name": "Strike",
        "actions": "ONE-ACTION",
        "level": null,
        "rarity": "COMMON",
        "prerequisites": null,
        "frequency": null,
        "cost": null,
        "trigger": null,
        "requirements": null,
        "access": null,
        "description": "You attack with a weapon you're wielding or with an unarmed attack, targeting one creature within your reach (for a melee attack) or within range (for a ranged attack). Roll an attack roll using the attack modifier for the weapon or unarmed attack you're using, and compare the result to the target creature's AC to determine the effect.\n\n**Critical Success** You make a damage roll according to the weapon or unarmed attack and deal double damage.\n\n**Success** You make a damage roll according to the weapon or unarmed attack and deal damage.",
        "special": null,
        "type": "action",
        "traits": [
          1520
        ],
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "2549047613995403",
        "availability": null
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Actions.aspx?ID=2306",
          "book": "Player Core",
          "page": "418"
        },
        "foundry": {
          "rules": []
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "hidden",
        "apex",
        "focus",
        "ritual",
        "type",
        "class_trait",
        "ancestry_trait"
      ]
    },
    {
      "table": "ability_block",
      "queue_type": "ability-block",
      "id": 19855,
      "name": "Stride",
      "uuid": "3622379426522088",
      "source": 3,
      "expected": {
        "id": 19855,
        "operations": null,
        "name": "Stride",
        "actions": "ONE-ACTION",
        "level": 1,
        "rarity": "COMMON",
        "prerequisites": [],
        "frequency": null,
        "cost": null,
        "trigger": null,
        "requirements": null,
        "access": null,
        "description": "You move up to your Speed.",
        "special": null,
        "type": "action",
        "traits": [
          1505
        ],
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "3622379426522088",
        "availability": null
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Actions.aspx?ID=2305",
          "book": "Player Core",
          "page": "418"
        },
        "foundry": {
          "rules": []
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "hidden",
        "apex",
        "focus",
        "ritual",
        "type",
        "class_trait",
        "ancestry_trait"
      ]
    },
    {
      "table": "trait",
      "queue_type": "trait",
      "id": 1476,
      "name": "Poison",
      "uuid": "7663047166217896",
      "source": 3,
      "expected": {
        "id": 1476,
        "name": "Poison",
        "description": "An effect with this trait delivers a poison or deals poison damage. An item with this trait is poisonous and might cause an affliction.",
        "content_source_id": 3,
        "uuid": "7663047166217896"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=669",
          "book": "Player Core",
          "page": "459"
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "class_trait",
        "ancestry_trait",
        "creature_trait",
        "archetype_trait",
        "companion_type_trait",
        "versatile_heritage_trait",
        "important"
      ]
    },
    {
      "table": "trait",
      "queue_type": "trait",
      "id": 1504,
      "name": "Magical",
      "uuid": "445811995976648",
      "source": 3,
      "expected": {
        "id": 1504,
        "name": "Magical",
        "description": "Something with the magical trait is imbued with magical energies not tied to a specific tradition of magic. Some items or effects are closely tied to a particular tradition of magic. In these cases, the item has the [arcane](link_trait_1459), [divine](link_trait_1475), [occult](link_trait_1514), or [primal](link_trait_1454) trait instead of the magical trait. Any of these traits indicate that the item is magical.",
        "content_source_id": 3,
        "uuid": "445811995976648"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=644",
          "book": "Player Core",
          "page": "458"
        },
        "important": false,
        "class_trait": false,
        "unselectable": false,
        "ancestry_trait": false,
        "creature_trait": false,
        "archetype_trait": false,
        "versatile_heritage_trait": false
      },
      "metadata_absent": [
        "deprecated",
        "companion_type_trait"
      ]
    },
    {
      "table": "trait",
      "queue_type": "trait",
      "id": 1566,
      "name": "Contact",
      "uuid": "2595928930756541",
      "source": 3,
      "expected": {
        "id": 1566,
        "name": "Contact",
        "description": "A contact poison is activated by applying it to an item or directly onto a living creature’s skin. The first creature to touch the affected item must attempt a saving throw against the poison; if the poison is applied directly, the creature must attempt a saving throw immediately when the poison touches its skin. Contact poisons are infeasible to apply to a creature via a weapon attack due to the logistics of delivering them without poisoning yourself.",
        "content_source_id": 3,
        "uuid": "2595928930756541"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=565",
          "book": "GM Core",
          "page": "248"
        },
        "important": true
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "class_trait",
        "ancestry_trait",
        "creature_trait",
        "archetype_trait",
        "companion_type_trait",
        "versatile_heritage_trait"
      ]
    },
    {
      "table": "trait",
      "queue_type": "trait",
      "id": 1433,
      "name": "Manipulate",
      "uuid": "2971108648217689",
      "source": 3,
      "expected": {
        "id": 1433,
        "name": "Manipulate",
        "description": "You must physically manipulate an item or make gestures to use an action with this trait. Creatures without a suitable appendage can’t perform actions with this trait. Manipulate actions often trigger reactions.",
        "content_source_id": 3,
        "uuid": "2971108648217689"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=645",
          "book": "Player Core",
          "page": "458"
        },
        "important": true,
        "class_trait": false,
        "unselectable": false,
        "ancestry_trait": false,
        "creature_trait": false
      },
      "metadata_absent": [
        "deprecated",
        "archetype_trait",
        "companion_type_trait",
        "versatile_heritage_trait"
      ]
    },
    {
      "table": "trait",
      "queue_type": "trait",
      "id": 1529,
      "name": "Alchemical",
      "uuid": "8219993619182426",
      "source": 3,
      "expected": {
        "id": 1529,
        "name": "Alchemical",
        "description": "Alchemical items are powered by reactions of alchemical reagents. Unless otherwise noted, alchemical items aren’t [magical](link_trait_1504) and don’t radiate a magical aura.\n\nAlchemical creatures are partially powered by alchemical reactions.",
        "content_source_id": 3,
        "uuid": "8219993619182426"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=528",
          "book": "Player Core",
          "page": "452"
        },
        "important": false,
        "class_trait": false,
        "unselectable": false,
        "ancestry_trait": false,
        "creature_trait": true,
        "archetype_trait": false,
        "companion_type_trait": false,
        "versatile_heritage_trait": false
      },
      "metadata_absent": [
        "deprecated"
      ]
    },
    {
      "table": "trait",
      "queue_type": "trait",
      "id": 1531,
      "name": "Consumable",
      "uuid": "1807927279366527",
      "source": 3,
      "expected": {
        "id": 1531,
        "name": "Consumable",
        "description": "An item with this trait can be used only once. Unless stated otherwise, it’s destroyed after activation. Consumable items include [alchemical](link_trait_1529) items and [magical](link_trait_1504) consumables such as [scrolls](link_trait_1692) and [talismans](link_trait_1544). When a character creates consumable items, they can make them in batches of four.",
        "content_source_id": 3,
        "uuid": "1807927279366527"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=564",
          "book": "Player Core",
          "page": "454"
        },
        "important": false,
        "class_trait": false,
        "unselectable": false,
        "ancestry_trait": false,
        "creature_trait": false,
        "archetype_trait": false,
        "companion_type_trait": false,
        "versatile_heritage_trait": false
      },
      "metadata_absent": [
        "deprecated"
      ]
    },
    {
      "table": "trait",
      "queue_type": "trait",
      "id": 2424,
      "name": "Incorporeal",
      "uuid": "4212621418999330",
      "source": 3,
      "expected": {
        "id": 2424,
        "name": "Incorporeal",
        "description": "An incorporeal creature or object has no physical form. It can pass through solid objects, including walls. When inside an object, an incorporeal creature can’t perceive, attack, or [interact](link_action_19733) with anything outside the object, and if it starts its turn in an object, it’s slowed 1 until the end of its turn. A corporeal and an incorporeal creature can pass through one another, but they can’t end their movement in each other’s space.\n\nAn incorporeal creature can’t attempt Strength-based checks against physical creatures or objects—only against incorporeal ones—unless those objects have the [ghost touch](link_item_6992) property rune. Likewise, a corporeal creature can’t attempt Strength-based checks against incorporeal creatures or objects.\n\nIncorporeal creatures usually have immunity to effects or conditions that require a physical body, like [disease](link_trait_1857), [poison](link_trait_1476), and precision damage. They usually have resistance against all damage (except force damage and damage from Strikes with the [ghost touch](link_item_6992) property rune), with double the resistance against non-[magical](link_trait_1504) damage.",
        "content_source_id": 3,
        "uuid": "4212621418999330"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=632",
          "book": "GM Core",
          "page": "330"
        },
        "important": false,
        "class_trait": false,
        "unselectable": false,
        "ancestry_trait": false,
        "creature_trait": true,
        "archetype_trait": false,
        "versatile_heritage_trait": false
      },
      "metadata_absent": [
        "deprecated",
        "companion_type_trait"
      ]
    },
    {
      "table": "trait",
      "queue_type": "trait",
      "id": 1527,
      "name": "Invested",
      "uuid": "370388764978504",
      "source": 3,
      "expected": {
        "id": 1527,
        "name": "Invested",
        "description": "A character can [invest](link_action_20775) only 10 magical items that have the invested trait. None of the [magical](link_trait_1504) effects of the item apply if the character hasn’t invested it, nor can it be activated, though the character still gains any normal benefits from wearing the physical item (like a hat keeping rain off their head).",
        "content_source_id": 3,
        "uuid": "370388764978504"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=637",
          "book": "GM Core",
          "page": "219"
        },
        "important": true,
        "class_trait": false,
        "unselectable": false,
        "ancestry_trait": false,
        "creature_trait": false,
        "archetype_trait": false,
        "companion_type_trait": false,
        "versatile_heritage_trait": false
      },
      "metadata_absent": [
        "deprecated"
      ]
    },
    {
      "table": "creature",
      "queue_type": "creature",
      "id": 11195,
      "name": "Violet Fungus",
      "uuid": "8171277498647651",
      "source": 240,
      "expected": {
        "id": 11195,
        "name": "Violet Fungus",
        "level": 3,
        "rarity": "COMMON",
        "content_source_id": 240,
        "version": "1.0",
        "uuid": "8171277498647651",
        "inventory": {
          "coins": {
            "cp": 0,
            "sp": 0,
            "gp": 0,
            "pp": 0
          },
          "items": [
            {
              "id": "87dc1378-79c3-48cf-a788-59680cb5b190",
              "item": {
                "id": 2013488871661870,
                "created_at": "",
                "name": "Tentacle",
                "level": 0,
                "rarity": "COMMON",
                "traits": [
                  1569,
                  4173
                ],
                "description": "",
                "group": "WEAPON",
                "size": "MEDIUM",
                "meta_data": {
                  "category": "unarmed_attack",
                  "group": "brawling",
                  "damage": {
                    "damageType": "bludgeoning",
                    "dice": 1,
                    "die": "d10",
                    "extra": "Violet Rot"
                  },
                  "attack_bonus": 7,
                  "bulk": {},
                  "quantity": 1,
                  "reload": "null",
                  "foundry": {}
                },
                "operations": [],
                "content_source_id": 1,
                "version": ""
              },
              "is_formula": false,
              "is_equipped": true,
              "is_invested": false,
              "is_implanted": false,
              "container_contents": []
            }
          ]
        },
        "notes": null,
        "details": {
          "description": "At a glance, a violet fungus might seem to be little more than an unsightly and sickeningly purple mushroom of unusual size. Only once one draws closer-once whip-like tentacles dripping with flesh-rotting venom slither out from the fungus's cratered cap-does the terrifying truth of this carnivorous toadstool become apparent. Many amateur spelunkers have met untimely ends in the clutches of this monstrous fungus's tentacles, since violet fungi are practically synonymous with caverns on Golarion.\n\nAnyone who has ever braved the world's caves for an extended period of time know the dangers of the deadly violet fungus. Darklands dwellers such as drow and duergars often bear the long, whip-like scars of at least one brush with this vicious plant's cruel, poison-infused tentacles. Canny subterranean trappers and scouts sometimes make use of cultivated violent fungi to catch game in the enormous caverns below the surface world. Some Darklands peoples also cultivate violet fungi as a means to defend their territory. Xulgaths in particular place violet fungi around the perimeters of their settlements as a first line of defense."
        },
        "roll_history": null,
        "operations": [
          {
            "id": "dd84ee8f-c0ed-439a-a46f-c8eab45c38d3",
            "type": "setValue",
            "data": {
              "variable": "ATTRIBUTE_STR",
              "value": {
                "value": 4,
                "partial": false
              }
            }
          },
          {
            "id": "586ac2f5-b8bd-4407-b94f-1efbb3f1ddbb",
            "type": "setValue",
            "data": {
              "variable": "ATTRIBUTE_DEX",
              "value": {
                "value": 0,
                "partial": false
              }
            }
          },
          {
            "id": "72a27ddf-4da0-4655-82c1-771bf70ab513",
            "type": "setValue",
            "data": {
              "variable": "ATTRIBUTE_CON",
              "value": {
                "value": 3,
                "partial": false
              }
            }
          },
          {
            "id": "b2674dc0-c84e-49cd-8fb7-7a6814355371",
            "type": "setValue",
            "data": {
              "variable": "ATTRIBUTE_INT",
              "value": {
                "value": -5,
                "partial": false
              }
            }
          },
          {
            "id": "78b2c27e-b417-4172-82b8-eadf6e3a6f56",
            "type": "setValue",
            "data": {
              "variable": "ATTRIBUTE_WIS",
              "value": {
                "value": 1,
                "partial": false
              }
            }
          },
          {
            "id": "3cc7b8fb-5d5b-4e0f-8009-83497f1a830b",
            "type": "setValue",
            "data": {
              "variable": "ATTRIBUTE_CHA",
              "value": {
                "value": -2,
                "partial": false
              }
            }
          },
          {
            "id": "72bd439e-e12f-43d3-b653-717f7cf0ebce",
            "type": "adjValue",
            "data": {
              "variable": "IMMUNITIES",
              "value": "bleed, "
            }
          },
          {
            "id": "eceabcad-ce81-40e3-8c78-ce558d75f5cd",
            "type": "adjValue",
            "data": {
              "variable": "IMMUNITIES",
              "value": "fatigued, "
            }
          },
          {
            "id": "4f3ca71a-ee4b-4d98-8577-069d85b9b546",
            "type": "adjValue",
            "data": {
              "variable": "IMMUNITIES",
              "value": "poison, "
            }
          },
          {
            "id": "7839f0f3-d018-4977-982c-b166f197f353",
            "type": "adjValue",
            "data": {
              "variable": "IMMUNITIES",
              "value": "sleep, "
            }
          },
          {
            "id": "ffd9621a-5a3d-403c-ae3e-064aa7b11891",
            "type": "adjValue",
            "data": {
              "variable": "IMMUNITIES",
              "value": "unconscious, "
            }
          },
          {
            "id": "4ed6d691-b96d-48ec-b4a6-408d12c3a68e",
            "type": "adjValue",
            "data": {
              "variable": "WEAKNESSES",
              "value": "fire, 5"
            }
          },
          {
            "id": "edc59279-4fdc-4477-a902-6ddbfe50d415",
            "type": "setValue",
            "data": {
              "variable": "SPEED",
              "value": 10
            }
          },
          {
            "id": "d9d03913-9e9e-48aa-b0cf-a545c1f7c171",
            "type": "adjValue",
            "data": {
              "variable": "SENSES_IMPRECISE",
              "value": "tremorsense, 60"
            }
          },
          {
            "id": "122aea87-7818-4665-a8f9-253046cdc943",
            "type": "adjValue",
            "data": {
              "variable": "SKILL_STEALTH",
              "value": {
                "value": "T"
              }
            }
          },
          {
            "id": "09b9d640-49ad-4217-9fbe-04aab5261340",
            "type": "setValue",
            "data": {
              "variable": "SIZE",
              "value": "MEDIUM"
            }
          },
          {
            "id": "860a2eed-9587-474f-88fa-c018bdbb0e66",
            "type": "giveTrait",
            "data": {
              "traitId": 2445
            }
          },
          {
            "id": "5348a294-850a-474b-bc81-7a21a9e6a822",
            "type": "giveTrait",
            "data": {
              "traitId": 2411
            }
          },
          {
            "id": "f357044f-1818-4178-9abe-44f0592d066f",
            "type": "adjValue",
            "data": {
              "variable": "AC_BONUS",
              "value": 7
            }
          },
          {
            "id": "11c06071-2640-4866-b2c9-8a658764f5d3",
            "type": "addBonusToValue",
            "data": {
              "variable": "SAVE_FORT",
              "text": "",
              "value": "+7"
            }
          },
          {
            "id": "93deb272-a85d-4dd8-80a7-7945be4e1dcd",
            "type": "addBonusToValue",
            "data": {
              "variable": "SAVE_REFLEX",
              "text": "",
              "value": "+7"
            }
          },
          {
            "id": "9b2e0822-f98c-4563-b7f8-6c14a99e48ad",
            "type": "addBonusToValue",
            "data": {
              "variable": "SAVE_WILL",
              "text": "",
              "value": "+5"
            }
          },
          {
            "id": "f7878fa8-2ab7-4e48-8fd7-d94e76f63ec2",
            "type": "adjValue",
            "data": {
              "variable": "MAX_HEALTH_BONUS",
              "value": 51
            }
          },
          {
            "id": "b0168afa-bb34-42bc-bcbf-477fc6a26a73",
            "type": "addBonusToValue",
            "data": {
              "variable": "PERCEPTION",
              "text": "",
              "value": "+7"
            }
          },
          {
            "id": "155823bb-5de3-47c5-8ec8-b34d55776f1a",
            "type": "addBonusToValue",
            "data": {
              "variable": "SKILL_STEALTH",
              "text": "",
              "value": "+4"
            }
          }
        ],
        "abilities_base": [
          {
            "id": -1,
            "created_at": "",
            "name": "Tremorsense 60 feet",
            "actions": null,
            "level": 3,
            "rarity": "COMMON",
            "description": "Tremorsense",
            "type": "action",
            "meta_data": {
              "foundry": {
                "category": "interaction"
              }
            },
            "traits": [],
            "content_source_id": 240,
            "version": "1.0"
          },
          {
            "id": -1,
            "created_at": "",
            "name": "Violet Rot",
            "actions": null,
            "level": 3,
            "rarity": "COMMON",
            "description": "**Saving Throw** @Check\\[fortitude|dc:20\\]\n\n* * *\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** 1d6 poison damage plus \\[\\[Enfeebled\\]\\]{Enfeebled 1} (1 round)\n\n**Stage 2** 1d6 poison damage plus enfeebled 1 and \\[\\[Drained\\]\\]{Drained 1} (1 round)\n\n**Stage 3** 2d6 poison damage plus enfeebled 1 and drained 1 (1 round)",
            "type": "action",
            "meta_data": {
              "foundry": {
                "category": "offensive"
              }
            },
            "traits": [
              1476
            ],
            "content_source_id": 240,
            "version": "1.0"
          }
        ],
        "spells": {
          "slots": [],
          "list": [],
          "focus_point_current": 0,
          "innate_casts": []
        },
        "deprecated": null,
        "abilities_added": null,
        "experience": null,
        "hp_current": null,
        "hp_temp": null,
        "stamina_current": null,
        "resolve_current": null,
        "operation_data": null
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Monsters.aspx?ID=853",
          "book": "Bestiary 2",
          "page": "286"
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "type",
        "hidden"
      ]
    }
  ],
  "sources": [
    {
      "id": 3,
      "expected": {
        "id": 3,
        "name": "Common Core",
        "foundry_id": null,
        "url": null,
        "description": "Content that's shared between Pathfinder Second Edition and Starfinder Second Edition.",
        "operations": [],
        "user_id": null,
        "contact_info": null,
        "require_key": false,
        "is_published": true,
        "required_content_sources": [],
        "group": "common-core",
        "artwork_url": null,
        "keys": null,
        "deprecated": false
      },
      "metadata_known_noncount": {},
      "metadata_counts_item": null,
      "metadata_contract": "Object required; preserve every unrelated live metadata/count sibling from captured prewrite baseline. Source identity/config expected fields pinned; counts other than source16 item are not stale-static identity."
    },
    {
      "id": 240,
      "expected": {
        "id": 240,
        "name": "Bestiary 2 (in progress)",
        "foundry_id": "Pathfinder Bestiary 2",
        "url": "https://paizo.com/products/btq022yq",
        "description": "With more than 350 classic and brand new monsters, this 320-page hardcover rulebook greatly expands on the foes found in the Pathfinder Bestiary. From classic creatures like serpentfolk and jabberwock, returning favorites like the primal dragons or the Sandpoint devil, to brand new menaces sure to test even the bravest of heroes, this must-have tome of monsters designed to challenge characters of any level is an essential companion to your Pathfinder game!",
        "operations": null,
        "user_id": null,
        "contact_info": null,
        "require_key": false,
        "is_published": true,
        "required_content_sources": [
          1
        ],
        "group": "legacy",
        "artwork_url": null,
        "keys": null,
        "deprecated": null
      },
      "metadata_known_noncount": {},
      "metadata_counts_item": null,
      "metadata_contract": "Object required; preserve every unrelated live metadata/count sibling from captured prewrite baseline. Source identity/config expected fields pinned; counts other than source16 item are not stale-static identity."
    },
    {
      "id": 16,
      "expected": {
        "id": 16,
        "url": "https://paizo.com/products/btq02eav?Pathfinder-Treasure-Vault",
        "keys": null,
        "name": "Treasure Vault",
        "group": "pathfinder-core",
        "user_id": null,
        "deprecated": null,
        "foundry_id": "Pathfinder Treasure Vault",
        "operations": null,
        "artwork_url": null,
        "description": "Pathfinder Treasure Vault reveals the glittering hoard of a terrifying dragon, as presented by the creature’s plucky kobold assistant. This 224-page hardcover rulebook presents a catalog of new gear from nearly every category of equipment and magic item available in the Pathfinder RPG while also introducing entirely new categories of items as well. Give your character the perfect tool for the job with signature weapons, customizable relics, and wondrous items to fit your every need while preparing for any eventuality with potions, elixirs, wands, and more!",
        "require_key": false,
        "contact_info": null,
        "is_published": true,
        "required_content_sources": [
          1
        ]
      },
      "metadata_known_noncount": {},
      "metadata_counts_item": {
        "before": 1109,
        "after": 1113
      },
      "metadata_contract": "Object required; preserve every unrelated live metadata/count sibling from captured prewrite baseline. Source identity/config expected fields pinned; counts other than source16 item are not stale-static identity."
    }
  ],
  "baseline_item_count": 1109,
  "terminal_item_count": 1113,
  "aliases": [
    {
      "family": "Violet Venom",
      "names": [
        "violet venom"
      ],
      "citation_ids": [
        2019,
        4552
      ]
    },
    {
      "family": "Spiritsight Ring",
      "names": [
        "spiritsight ring",
        "spiritsight sight"
      ],
      "citation_ids": [
        2346,
        4878
      ]
    },
    {
      "family": "Rhinoceros Mask",
      "names": [
        "rhinoceros mask",
        "rhinoceros mask (greater)",
        "greater rhinoceros mask"
      ],
      "citation_ids": [
        2352,
        4884
      ]
    }
  ],
  "official_collision_policy": "Source16 unconditional; other-source name/citation matches official user_id NULL (including unpublished), unknown source rejects; global canonical UUID unconditional; user-owned different-source/different-UUID copies preserved."
}
$equipment$::jsonb as spec),
items as(select value as patch from settings cross join lateral jsonb_array_elements(spec->'items')),
source_specs as(select value as source_spec from settings cross join lateral jsonb_array_elements(spec->'sources')),
dependencies as(select value as dependency from settings cross join lateral jsonb_array_elements(spec->'dependencies')),
actual_dependencies as(
 select d.dependency,to_jsonb(t)||jsonb_build_object('uuid',t.uuid::text) as actual from dependencies d left join public.trait t on t.id=(d.dependency->>'id')::bigint where d.dependency->>'table'='trait'
 union all select d.dependency,to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text) from dependencies d left join public.ability_block a on a.id=(d.dependency->>'id')::bigint where d.dependency->>'table'='ability_block'
 union all select d.dependency,to_jsonb(c)||jsonb_build_object('uuid',c.uuid::text) from dependencies d left join public.creature c on c.id=(d.dependency->>'id')::bigint where d.dependency->>'table'='creature'
)
select 'treasure-vault-missing-equipment'::text as id, coalesce((
 (select count(*)=4 and count(distinct i.id)=4 and bool_and((i.id>0 and jsonb_typeof(i.meta_data)='object'
   and not exists(select 1 from jsonb_each((patch->'row')-'meta_data') e where to_jsonb(i)->e.key is distinct from e.value)
   and not exists(select 1 from jsonb_each(patch#>'{row,meta_data}') e where i.meta_data->e.key is distinct from e.value)
   and not exists(select 1 from jsonb_array_elements_text(patch->'metadata_absent') k(key) where i.meta_data?k.key)) is true)
   from items left join public.item i on i.uuid=(patch->>'uuid')::bigint)
 and (select count(*)=3 and bool_and((s.id is not null and jsonb_typeof(s.meta_data::jsonb)='object'
   and not exists(select 1 from jsonb_each(source_spec->'expected') e where to_jsonb(s)->e.key is distinct from e.value)
   and not exists(select 1 from jsonb_each(source_spec->'metadata_known_noncount') e where s.meta_data::jsonb->e.key is distinct from e.value)) is true)
   from source_specs left join public.content_source s on s.id=(source_spec->>'id')::bigint)
 and (select count(*)=12 and bool_and((actual is not null and jsonb_typeof(actual->'meta_data')='object'
   and not exists(select 1 from jsonb_each(dependency->'expected') e where actual->e.key is distinct from e.value)
   and not exists(select 1 from jsonb_each(dependency->'metadata') e where actual#>array['meta_data',e.key] is distinct from e.value)
   and not exists(select 1 from jsonb_array_elements_text(dependency->'metadata_absent') k(key) where actual->'meta_data'?k.key)) is true) from actual_dependencies)
 and (select count(*)=(spec->>'terminal_item_count')::bigint from public.item where content_source_id=16)
 and (select meta_data::jsonb#>'{counts,item}' is not distinct from spec->'terminal_item_count' from public.content_source where id=16)
 and not exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
    (u.type='content-source' and exists(select 1 from jsonb_array_elements(spec->'sources') s where u.ref_id=(s->>'id')::bigint or u.data->>'id'=s->>'id' or (u.ref_id is null and u.data->>'name'=s#>>'{expected,name}')))
    or (u.type='item' and exists(select 1 from jsonb_array_elements(spec->'items') p where
      u.data->>'uuid'=p->>'uuid'
      or exists(select 1 from public.item i where i.uuid=(p->>'uuid')::bigint and (u.ref_id=i.id or u.data->>'id'=i.id::text))
      or ((u.content_source_id=16 or u.data->>'content_source_id'='16') and
        exists(select 1 from jsonb_array_elements(spec->'aliases') a where
          exists(select 1 from jsonb_array_elements_text(a->'names') n(name)
            where btrim(regexp_replace(lower(u.data->>'name'),'[^a-z0-9]+',' ','g')) like n.name||'%')
          or (coalesce(u.data#>>'{meta_data,source,url}','') ~* '^https?://2e[.]aonprd[.]com/Equipment[.]aspx[?]'
            and substring(lower(u.data#>>'{meta_data,source,url}') from '[?&]id=([0-9]+)') in(select jsonb_array_elements_text(a->'citation_ids')))))))
    or exists(select 1 from jsonb_array_elements(spec->'dependencies') d where u.type=d->>'queue_type' and
      (u.ref_id=(d->>'id')::bigint or u.data->>'id'=d->>'id' or u.data->>'uuid'=d->>'uuid'
        or ((u.content_source_id=(d->>'source')::bigint or u.data->>'content_source_id'=d->>'source') and u.data->>'name'=d->>'name')))
  ))
 and not exists(select 1 from public.item i left join public.content_source s on s.id=i.content_source_id where
    (i.uuid in(select (p->>'uuid')::bigint from jsonb_array_elements(spec->'items') p)
      and (i.content_source_id<>16 or not exists(select 1 from jsonb_array_elements(spec->'items') p where p->>'uuid'=i.uuid::text and p->>'name'=i.name)))
    or (
      exists(select 1 from jsonb_array_elements(spec->'aliases') a where
        exists(select 1 from jsonb_array_elements_text(a->'names') n(name)
          where btrim(regexp_replace(lower(i.name),'[^a-z0-9]+',' ','g')) like n.name||'%')
        or (coalesce(i.meta_data#>>'{source,url}','') ~* '^https?://2e[.]aonprd[.]com/Equipment[.]aspx[?]'
          and substring(lower(i.meta_data#>>'{source,url}') from '[?&]id=([0-9]+)') in(select jsonb_array_elements_text(a->'citation_ids'))))
      and (i.content_source_id=16 or s.id is null or s.user_id is null)
      and not exists(select 1 from jsonb_array_elements(spec->'items') p where p->>'uuid'=i.uuid::text and p->>'name'=i.name and i.content_source_id=16)
    )
  )
),false) as passed from settings;
