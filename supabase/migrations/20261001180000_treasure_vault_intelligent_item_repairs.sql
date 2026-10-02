-- Restore exact intelligent-item and artifact leaves, retaining earlier equipment repairs.
do $repair$
declare
  spec constant jsonb := $intelligent$
{
  "items": [
    {
      "id": 12000,
      "name": "Faerie Queen's Bower",
      "source": 16,
      "expected": {
        "id": 12000,
        "bulk": "1",
        "name": "Faerie Queen's Bower",
        "size": "MEDIUM",
        "uuid": "7955748466843685",
        "hands": null,
        "level": 13,
        "price": {},
        "rarity": "RARE",
        "version": "1.0",
        "operations": null,
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "metadata": {
        "hp": 0,
        "bulk": {},
        "group": "wood",
        "runes": {
          "potency": 2,
          "property": [
            {
              "id": 7052,
              "name": "Invisibility"
            }
          ],
          "resilient": 1
        },
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4924",
          "book": "Treasure Vault",
          "page": "194"
        },
        "dex_cap": 4,
        "foundry": {
          "items": [],
          "rules": [],
          "container_id": null
        },
        "ac_bonus": 1,
        "category": "light",
        "hardness": 0,
        "material": {
          "type": null,
          "grade": null
        },
        "quantity": 1,
        "strength": 0,
        "base_item": "leaf-weave",
        "check_penalty": -1,
        "speed_penalty": 0,
        "broken_threshold": 0
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "base_item_content",
        "damage",
        "attack_bonus",
        "charges",
        "container_default_items",
        "is_shoddy",
        "range",
        "reload",
        "starfinder"
      ],
      "prior_states": [
        {
          "group": "WEAPON",
          "traits": [
            1475,
            1581,
            1613,
            2860
          ]
        },
        {
          "group": "ARMOR",
          "traits": [
            1475,
            1630,
            1613,
            2860,
            1527
          ]
        }
      ],
      "before": {
        "description": "**Perception** \\[\\[/r 1d20+23\\]\\]{+23}; precise vision (darkvision) 60 feet, imprecise hearing 30 feet\n\n**Communication** telepathy (Celestial, Common)\n\n**Skills** Diplomacy \\[\\[/r 1d20+25\\]\\]{+25}, Religion \\[\\[/r 1d20+25\\]\\]{+25}\n\n**Int** +4, **Wis** +4, **Cha** +6\n\n**Will** \\[\\[/r 1d20+25\\]\\]{+25}\n\nA suit of autumn's embrace armor can gain sapience when lovingly crafted by a fae monarch of sufficient power; a suit of faerie queen's bower is one such example. The armor is happy to give you and your companions counsel, hoping to guide you on a path of benevolence and aid you in battles against forces that seek to cause harm to the natural world. It refuses access to its magic to anyone who causes undue harm to plants or animals. In addition to the features and activation of autumn's embrace, faerie queen's bower has the following activation.\n\n**Activate** 2 command, envision\n\n**Effect** The armor casts 4th-rank \\[\\[Safe Passage\\]\\], with the protected area beginning from your square and extending to a place of relative safety.\n\n**Activate** 2 command, envision (aura)\n\n**Effect** You call forth a storm of leaves from _autumn's embrace_. These leaves swirl in a 20-foot emanation for 1 minute. Creatures within the area are \\[\\[Concealed\\]\\], and creatures outside the area are concealed to creatures within the leaves. However, you can see through this concealment. You can Dismiss the activation.",
        "usage": null
      },
      "after": {
        "description": "**Perception** +23; precise vision ([darkvision](link_sense_20769)) 60 feet, imprecise hearing 30 feet\n\n**Communication** telepathy (Celestial, [Common](link_language_81))\n\n**Skills** Diplomacy +25, Religion +25\n\n**Int** +4, **Wis** +4, **Cha** +6\n\n**Will** +25\n\nA suit of [autumn's embrace](link_item_11726) armor can gain sapience when lovingly crafted by a fae monarch of sufficient power; a suit of faerie queen's bower is one such example. The armor is happy to give you and your companions counsel, hoping to guide you on a path of benevolence and aid you in battles against forces that seek to cause harm to the natural world. It refuses access to its magic to anyone who causes undue harm to plants or animals. In addition to the features and activation of [autumn's embrace](link_item_11726), faerie queen's bower has the following activation.\n\n**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([concentrate](link_trait_1432)); **Frequency** once per day\n\n**Effect** The armor casts 4th-rank *[safe passage](link_spell_4814)*, with the protected area beginning from your square and extending to a place of relative safety.\n\n**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([aura](link_trait_1492), [concentrate](link_trait_1432)); **Frequency** once per day\n\n**Effect** You call forth a storm of leaves from [autumn's embrace](link_item_11726). These leaves swirl in a 20-foot emanation for 1 minute. Creatures within the area are concealed, and creatures outside the area are concealed to creatures within the leaves. However, you can see through this concealment. You can [Dismiss](link_action_19627) the activation.",
        "usage": "worn armor"
      },
      "description": {
        "before": "**Perception** \\[\\[/r 1d20+23\\]\\]{+23}; precise vision (darkvision) 60 feet, imprecise hearing 30 feet\n\n**Communication** telepathy (Celestial, Common)\n\n**Skills** Diplomacy \\[\\[/r 1d20+25\\]\\]{+25}, Religion \\[\\[/r 1d20+25\\]\\]{+25}\n\n**Int** +4, **Wis** +4, **Cha** +6\n\n**Will** \\[\\[/r 1d20+25\\]\\]{+25}\n\nA suit of autumn's embrace armor can gain sapience when lovingly crafted by a fae monarch of sufficient power; a suit of faerie queen's bower is one such example. The armor is happy to give you and your companions counsel, hoping to guide you on a path of benevolence and aid you in battles against forces that seek to cause harm to the natural world. It refuses access to its magic to anyone who causes undue harm to plants or animals. In addition to the features and activation of autumn's embrace, faerie queen's bower has the following activation.\n\n**Activate** 2 command, envision\n\n**Effect** The armor casts 4th-rank \\[\\[Safe Passage\\]\\], with the protected area beginning from your square and extending to a place of relative safety.\n\n**Activate** 2 command, envision (aura)\n\n**Effect** You call forth a storm of leaves from _autumn's embrace_. These leaves swirl in a 20-foot emanation for 1 minute. Creatures within the area are \\[\\[Concealed\\]\\], and creatures outside the area are concealed to creatures within the leaves. However, you can see through this concealment. You can Dismiss the activation.",
        "after": "**Perception** +23; precise vision ([darkvision](link_sense_20769)) 60 feet, imprecise hearing 30 feet\n\n**Communication** telepathy (Celestial, [Common](link_language_81))\n\n**Skills** Diplomacy +25, Religion +25\n\n**Int** +4, **Wis** +4, **Cha** +6\n\n**Will** +25\n\nA suit of [autumn's embrace](link_item_11726) armor can gain sapience when lovingly crafted by a fae monarch of sufficient power; a suit of faerie queen's bower is one such example. The armor is happy to give you and your companions counsel, hoping to guide you on a path of benevolence and aid you in battles against forces that seek to cause harm to the natural world. It refuses access to its magic to anyone who causes undue harm to plants or animals. In addition to the features and activation of [autumn's embrace](link_item_11726), faerie queen's bower has the following activation.\n\n**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([concentrate](link_trait_1432)); **Frequency** once per day\n\n**Effect** The armor casts 4th-rank *[safe passage](link_spell_4814)*, with the protected area beginning from your square and extending to a place of relative safety.\n\n**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([aura](link_trait_1492), [concentrate](link_trait_1432)); **Frequency** once per day\n\n**Effect** You call forth a storm of leaves from [autumn's embrace](link_item_11726). These leaves swirl in a 20-foot emanation for 1 minute. Creatures within the area are concealed, and creatures outside the area are concealed to creatures within the leaves. However, you can see through this concealment. You can [Dismiss](link_action_19627) the activation.",
        "before_md5": "9ff8361de406f58066f678c19592c133",
        "after_md5": "620890218686eac6198e63e4fcf5285b",
        "replacements": [
          {
            "from": "\\[\\[/r 1d20+23\\]\\]{+23}",
            "to": "+23",
            "count": 1
          },
          {
            "from": "\\[\\[/r 1d20+25\\]\\]{+25}",
            "to": "+25",
            "count": 3
          },
          {
            "from": "\\[\\[Safe Passage\\]\\]",
            "to": "*[safe passage](link_spell_4814)*",
            "count": 1
          },
          {
            "from": "\\[\\[Concealed\\]\\]",
            "to": "concealed",
            "count": 1
          },
          {
            "from": "**Activate** 2 command, envision\n\n**Effect**",
            "to": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([concentrate](link_trait_1432)); **Frequency** once per day\n\n**Effect**",
            "count": 1
          },
          {
            "from": "**Activate** 2 command, envision (aura)\n\n**Effect**",
            "to": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([aura](link_trait_1492), [concentrate](link_trait_1432)); **Frequency** once per day\n\n**Effect**",
            "count": 1
          },
          {
            "from": "(darkvision)",
            "to": "([darkvision](link_sense_20769))",
            "count": 1
          },
          {
            "from": "Celestial, Common",
            "to": "Celestial, [Common](link_language_81)",
            "count": 1
          },
          {
            "from": "_autumn's embrace_",
            "to": "[autumn's embrace](link_item_11726)",
            "count": 1
          },
          {
            "from": "autumn's embrace armor",
            "to": "[autumn's embrace](link_item_11726) armor",
            "count": 1
          },
          {
            "from": "activation of autumn's embrace,",
            "to": "activation of [autumn's embrace](link_item_11726),",
            "count": 1
          },
          {
            "from": "You can Dismiss the activation.",
            "to": "You can [Dismiss](link_action_19627) the activation.",
            "count": 1
          }
        ]
      }
    },
    {
      "id": 12300,
      "name": "Purloining Cloak",
      "source": 16,
      "expected": {
        "id": 12300,
        "bulk": "0.1",
        "name": "Purloining Cloak",
        "size": "MEDIUM",
        "uuid": "6161211784809503",
        "group": "GENERAL",
        "hands": null,
        "level": 18,
        "price": {
          "gp": 24000
        },
        "rarity": "RARE",
        "traits": [
          1552,
          1613,
          1527,
          1504
        ],
        "version": "1.0",
        "operations": null,
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "metadata": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4930",
          "book": "Treasure Vault",
          "page": "196"
        },
        "foundry": {
          "items": [],
          "rules": [
            {
              "key": "FlatModifier",
              "type": "item",
              "value": 3,
              "selector": [
                "acrobatics",
                "stealth"
              ]
            },
            {
              "key": "FlatModifier",
              "type": "circumstance",
              "label": "Attack from Enemy Reaction due to Movement",
              "value": 2,
              "selector": "ac",
              "predicate": [
                "reaction:movement"
              ]
            },
            {
              "key": "RollOption",
              "label": "Attack from Enemy Reaction due to Movement",
              "domain": "all",
              "option": "reaction:movement",
              "toggleable": true
            }
          ],
          "container_id": null
        },
        "hardness": 0,
        "material": {
          "type": null,
          "grade": null
        },
        "quantity": 1,
        "base_item": null,
        "broken_threshold": 0
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "base_item_content",
        "category",
        "group",
        "damage",
        "attack_bonus",
        "ac_bonus",
        "check_penalty",
        "speed_penalty",
        "dex_cap",
        "strength",
        "charges",
        "container_default_items",
        "is_shoddy",
        "range",
        "reload",
        "starfinder"
      ],
      "prior_states": [
        {}
      ],
      "before": {
        "description": "**Perception** \\[\\[/r 1d20+30\\]\\]{+30}; precise vision 30 feet, imprecise hearing 30 feet\n\n**Communication** speech (Common and two other languages, usually regional and ancestral)\n\n**Skills** Society \\[\\[/r 1d20+31\\]\\]{+31}, Thievery \\[\\[/r 1d20+31\\]\\]{+31}, Underworld Lore \\[\\[/r 1d20+31\\]\\]{+31}\n\n**Int** +5, **Wis** +5, **Cha** +5\n\n**Will** \\[\\[/r 1d20+30\\]\\]{+30}\n\nEach purloining cloak is a mercurial mantle once worn by a legendary thief or two. The cloak became infused with a daredevil spirit and a penchant for high-stakes thievery. If its owner isn't willing to partake in such activities, the cloak tries to convince them to sell or give it to someone who will. A purloining cloak can use tendrils of its cloth to attempt Thievery checks to Palm an Object or \\[\\[Steal\\]\\], proudly offering you its loot later. In addition to those of a mercurial mantle, a purloining cloak has the following activations.\n\n**Activate** 2 command, envision\n\n**Effect** The cloak casts 2nd-rank \\[\\[Illusory Disguise\\]\\] on you, usually to your specifications. However the cloak can choose the appearance of the illusion for you.\n\n**Activate** 1 command\n\n**Effect** The cloak assesses the price of valuables it can see. This valuation doesn't include the value of features the cloak can't discern, such as magical properties.\n\n**Activate** r Interact\n\n**Effect** You slip around the attacking creature with ease. You Step, without moving away from the triggering enemy, and then make a melee Strike against the triggering enemy if it's within reach. If you do make a Strike, the target attempts a Perception 38|name:Detect Reaction|showDC:all check before you roll.\n\n**Failure** This creature is \\[\\[Off-Guard\\]\\] against the Strike.\n\n**Critical Failure** This creature is off-guard against all your attacks until the end of their next turn.\n\n**Activate** 2 command, envision (conjuration, teleportation)\n\n**Effect** The cloak hums with power as your whirl it around yourself, disappearing amid a brief flash of light. Teleport up to double your Speed to a location you can see. At the end of the teleportation, you can make a melee Strike against a creature within reach, if there is one.",
        "usage": "worncloak"
      },
      "after": {
        "description": "**Perception** +30; precise vision 30 feet, imprecise hearing 30 feet\n\n**Communication** speech ([Common](link_language_81) and two other languages, usually regional and ancestral)\n\n**Skills** Society +31, Thievery +31, Underworld Lore +31\n\n**Int** +5, **Wis** +5, **Cha** +5\n\n**Will** +30\n\nEach purloining cloak is a [mercurial mantle](link_item_23287) once worn by a legendary thief or two. The cloak became infused with a daredevil spirit and a penchant for high-stakes thievery. If its owner isn't willing to partake in such activities, the cloak tries to convince them to sell or give it to someone who will. A purloining cloak can use tendrils of its cloth to attempt Thievery checks to [Palm an Object](link_action_19743) or [Steal](link_action_19852), proudly offering you its loot later. In addition to those of a [mercurial mantle](link_item_23287), a purloining cloak has the following activations.\n\n**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([concentrate](link_trait_1432))\n\n**Effect** The cloak casts 2nd-rank *[illusory disguise](link_spell_4677)* on you, usually to your specifications. However the cloak can choose the appearance of the illusion for you.\n\n**Activate** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([concentrate](link_trait_1432))\n\n**Effect** The cloak assesses the price of valuables it can see. This valuation doesn't include the value of features the cloak can't discern, such as magical properties.\n\n**Activate** <abbr cost=\"REACTION\" class=\"action-symbol\">5</abbr> ([manipulate](link_trait_1433)); **Frequency** once per hour; **Trigger** An enemy misses you with a melee [Strike](link_action_19856)\n\n**Effect** You slip around the attacking creature with ease. You [Step](link_action_19853), without moving away from the triggering enemy, and then make a melee [Strike](link_action_19856) against the triggering enemy if it's within reach. If you do make a [Strike](link_action_19856), the target attempts a DC 38 Perception check before you roll.\n\n**Failure** This creature is off-guard against the [Strike](link_action_19856).\n\n**Critical Failure** This creature is off-guard against all your attacks until the end of their next turn.\n\n**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([concentrate](link_trait_1432), [teleportation](link_trait_1470)); **Frequency** once per day\n\n**Effect** The cloak hums with power as your whirl it around yourself, disappearing amid a brief flash of light. Teleport up to double your Speed to a location you can see. At the end of the teleportation, you can make a melee [Strike](link_action_19856) against a creature within reach, if there is one.",
        "usage": "worn cloak"
      },
      "description": {
        "before": "**Perception** \\[\\[/r 1d20+30\\]\\]{+30}; precise vision 30 feet, imprecise hearing 30 feet\n\n**Communication** speech (Common and two other languages, usually regional and ancestral)\n\n**Skills** Society \\[\\[/r 1d20+31\\]\\]{+31}, Thievery \\[\\[/r 1d20+31\\]\\]{+31}, Underworld Lore \\[\\[/r 1d20+31\\]\\]{+31}\n\n**Int** +5, **Wis** +5, **Cha** +5\n\n**Will** \\[\\[/r 1d20+30\\]\\]{+30}\n\nEach purloining cloak is a mercurial mantle once worn by a legendary thief or two. The cloak became infused with a daredevil spirit and a penchant for high-stakes thievery. If its owner isn't willing to partake in such activities, the cloak tries to convince them to sell or give it to someone who will. A purloining cloak can use tendrils of its cloth to attempt Thievery checks to Palm an Object or \\[\\[Steal\\]\\], proudly offering you its loot later. In addition to those of a mercurial mantle, a purloining cloak has the following activations.\n\n**Activate** 2 command, envision\n\n**Effect** The cloak casts 2nd-rank \\[\\[Illusory Disguise\\]\\] on you, usually to your specifications. However the cloak can choose the appearance of the illusion for you.\n\n**Activate** 1 command\n\n**Effect** The cloak assesses the price of valuables it can see. This valuation doesn't include the value of features the cloak can't discern, such as magical properties.\n\n**Activate** r Interact\n\n**Effect** You slip around the attacking creature with ease. You Step, without moving away from the triggering enemy, and then make a melee Strike against the triggering enemy if it's within reach. If you do make a Strike, the target attempts a Perception 38|name:Detect Reaction|showDC:all check before you roll.\n\n**Failure** This creature is \\[\\[Off-Guard\\]\\] against the Strike.\n\n**Critical Failure** This creature is off-guard against all your attacks until the end of their next turn.\n\n**Activate** 2 command, envision (conjuration, teleportation)\n\n**Effect** The cloak hums with power as your whirl it around yourself, disappearing amid a brief flash of light. Teleport up to double your Speed to a location you can see. At the end of the teleportation, you can make a melee Strike against a creature within reach, if there is one.",
        "after": "**Perception** +30; precise vision 30 feet, imprecise hearing 30 feet\n\n**Communication** speech ([Common](link_language_81) and two other languages, usually regional and ancestral)\n\n**Skills** Society +31, Thievery +31, Underworld Lore +31\n\n**Int** +5, **Wis** +5, **Cha** +5\n\n**Will** +30\n\nEach purloining cloak is a [mercurial mantle](link_item_23287) once worn by a legendary thief or two. The cloak became infused with a daredevil spirit and a penchant for high-stakes thievery. If its owner isn't willing to partake in such activities, the cloak tries to convince them to sell or give it to someone who will. A purloining cloak can use tendrils of its cloth to attempt Thievery checks to [Palm an Object](link_action_19743) or [Steal](link_action_19852), proudly offering you its loot later. In addition to those of a [mercurial mantle](link_item_23287), a purloining cloak has the following activations.\n\n**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([concentrate](link_trait_1432))\n\n**Effect** The cloak casts 2nd-rank *[illusory disguise](link_spell_4677)* on you, usually to your specifications. However the cloak can choose the appearance of the illusion for you.\n\n**Activate** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([concentrate](link_trait_1432))\n\n**Effect** The cloak assesses the price of valuables it can see. This valuation doesn't include the value of features the cloak can't discern, such as magical properties.\n\n**Activate** <abbr cost=\"REACTION\" class=\"action-symbol\">5</abbr> ([manipulate](link_trait_1433)); **Frequency** once per hour; **Trigger** An enemy misses you with a melee [Strike](link_action_19856)\n\n**Effect** You slip around the attacking creature with ease. You [Step](link_action_19853), without moving away from the triggering enemy, and then make a melee [Strike](link_action_19856) against the triggering enemy if it's within reach. If you do make a [Strike](link_action_19856), the target attempts a DC 38 Perception check before you roll.\n\n**Failure** This creature is off-guard against the [Strike](link_action_19856).\n\n**Critical Failure** This creature is off-guard against all your attacks until the end of their next turn.\n\n**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([concentrate](link_trait_1432), [teleportation](link_trait_1470)); **Frequency** once per day\n\n**Effect** The cloak hums with power as your whirl it around yourself, disappearing amid a brief flash of light. Teleport up to double your Speed to a location you can see. At the end of the teleportation, you can make a melee [Strike](link_action_19856) against a creature within reach, if there is one.",
        "before_md5": "280118597c4f5625ac3fc279e15b1553",
        "after_md5": "eaad22753594d858030d07a6dfa68192",
        "replacements": [
          {
            "from": "\\[\\[/r 1d20+30\\]\\]{+30}",
            "to": "+30",
            "count": 2
          },
          {
            "from": "\\[\\[/r 1d20+31\\]\\]{+31}",
            "to": "+31",
            "count": 3
          },
          {
            "from": "\\[\\[Steal\\]\\]",
            "to": "[Steal](link_action_19852)",
            "count": 1
          },
          {
            "from": "\\[\\[Illusory Disguise\\]\\]",
            "to": "*[illusory disguise](link_spell_4677)*",
            "count": 1
          },
          {
            "from": "\\[\\[Off-Guard\\]\\]",
            "to": "off-guard",
            "count": 1
          },
          {
            "from": "Perception 38|name:Detect Reaction|showDC:all",
            "to": "DC 38 Perception",
            "count": 1
          },
          {
            "from": "**Activate** 2 command, envision\n\n**Effect**",
            "to": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([concentrate](link_trait_1432))\n\n**Effect**",
            "count": 1
          },
          {
            "from": "**Activate** 1 command\n\n**Effect**",
            "to": "**Activate** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([concentrate](link_trait_1432))\n\n**Effect**",
            "count": 1
          },
          {
            "from": "**Activate** r Interact\n\n**Effect**",
            "to": "**Activate** <abbr cost=\"REACTION\" class=\"action-symbol\">5</abbr> ([manipulate](link_trait_1433)); **Frequency** once per hour; **Trigger** An enemy misses you with a melee Strike\n\n**Effect**",
            "count": 1
          },
          {
            "from": "**Activate** 2 command, envision (conjuration, teleportation)\n\n**Effect**",
            "to": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([concentrate](link_trait_1432), [teleportation](link_trait_1470)); **Frequency** once per day\n\n**Effect**",
            "count": 1
          },
          {
            "from": "speech (Common and",
            "to": "speech ([Common](link_language_81) and",
            "count": 1
          },
          {
            "from": "mercurial mantle",
            "to": "[mercurial mantle](link_item_23287)",
            "count": 2
          },
          {
            "from": "Palm an Object",
            "to": "[Palm an Object](link_action_19743)",
            "count": 1
          },
          {
            "from": "a melee Strike",
            "to": "a melee [Strike](link_action_19856)",
            "count": 3
          },
          {
            "from": "If you do make a Strike,",
            "to": "If you do make a [Strike](link_action_19856),",
            "count": 1
          },
          {
            "from": "against the Strike.",
            "to": "against the [Strike](link_action_19856).",
            "count": 1
          },
          {
            "from": "You Step,",
            "to": "You [Step](link_action_19853),",
            "count": 1
          }
        ]
      }
    },
    {
      "id": 12138,
      "name": "Kaldemash's Lament",
      "source": 16,
      "expected": {
        "id": 12138,
        "bulk": "0.1",
        "name": "Kaldemash's Lament",
        "size": "MEDIUM",
        "uuid": "5365496003218960",
        "group": "WEAPON",
        "hands": null,
        "level": 20,
        "price": {},
        "usage": "held-in-one-hand",
        "rarity": "UNIQUE",
        "version": "1.0",
        "operations": null,
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "metadata": {
        "hp": 0,
        "bulk": {},
        "group": "firearm",
        "range": 90,
        "runes": {
          "potency": 3,
          "property": [
            {
              "id": 7682,
              "name": "Quickstrike"
            }
          ],
          "striking": 3
        },
        "damage": {
          "die": "d6",
          "dice": 1,
          "damageType": "force"
        },
        "hp_max": 0,
        "reload": "",
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4423",
          "book": "Treasure Vault",
          "page": "38"
        },
        "foundry": {
          "bonus": 0,
          "items": [],
          "rules": [],
          "bonus_damage": 0,
          "container_id": null,
          "splash_damage": 0
        },
        "category": "advanced",
        "hardness": 0,
        "material": {
          "type": null,
          "grade": null
        },
        "quantity": 1,
        "base_item": null,
        "broken_threshold": 0
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "base_item_content",
        "attack_bonus",
        "ac_bonus",
        "check_penalty",
        "speed_penalty",
        "dex_cap",
        "strength",
        "charges",
        "container_default_items",
        "is_shoddy",
        "starfinder"
      ],
      "prior_states": [
        {
          "traits": [
            1841,
            1686,
            3073
          ]
        },
        {
          "traits": [
            1841,
            1686,
            3073,
            1459
          ]
        }
      ],
      "before": {
        "description": "Resembling little more than a simple iron pipe with a handle, _Kaldemash's Lament_ is one of the most well-known star guns in all of Arcadia. Legends state the Crowned Regent Kaldemash helped forge one of the first star guns millennia ago. While the star gun served Kaldemash as a powerful weapon, its most notable achievement was the accidental killing of one of Kaldemash's greatest friends. This death is what caused the regent to recognize the true destructive power of the star guns and led to him developing the Star Code, a set of rules of engagement and proper use of firearms still in use in Arcadia today. Although Kaldemash never named the weapon himself, all legends that mention the weapon refer to it as _Kaldemash's Lament_.\n\nThe legendary weapon is a +3 major striking speed advanced firearm with a range increment of 90 feet. It deals 4d6 force damage (with the major striking rune included) and has the concealable, concussive, and fatal d10 traits. You don't take a penalty when dealing nonlethal damage with the weapon. Like most star guns, _Kaldemash's Lament_ uses magic to function and doesn't require ammunition or black powder.\n\nIf you use _Kaldemash's Lament_ as part of a duel in which all parties are in agreement on the terms, the gun's supernatural instincts help you make the quickest draw. You roll twice and take the higher result on your initiative roll for the duel; this is a fortune effect. In addition, you can draw _Kaldemash's Lament_ as a free action at the start of your turn during the duel. If you attempt to fire the star gun in bad faith at a dueling opponent once they have surrendered, been defeated, or the duel is over, _Kaldemash's Lament_ flies out of your hand and you can't pick it up, hold it, or wield it for 10 minutes.\n\n**Activate** f envision\n\n**Effect** You adjust the damage that _Kaldemash's Lament_ deals before firing. _Kaldemash's Lament_'s damage type changes to either electricity, fire, or force until you change the type again.\n\n**Activate** 2 command, Interact\n\n**Effect** You leave _Kaldemash's Lament_ to fire on its own. You release the star gun and it begins to move independently, flying through the air and firing. You still gain the benefits of the gun's speed rune while it's moving independently. It has a space of 5 feet but doesn't block or impede enemies attempting to move through that space. It always remains within 30 feet of you and intentionally resists being taken or otherwise moved; all attempts to Grab it fail. _Kaldemash's Lament_ moves this way for 3 rounds, after which it returns to your hand. If you don't have a free hand to hold it, the gun instead holsters itself on your person.\n\nWhile _Kaldemash's Lament_ is moving independently, you can command it to make a Strike against a creature as an action, which has the concentrate trait. It makes a ranged Strike using your attack modifier while wielding it or a +31 bonus, whichever is higher. This attack increases your multiple attack penalty as normal, and the gun uses your multiple attack penalty when determining its attack bonus. Since the star gun is constantly moving and attempting to line up the appropriate shot, creatures it targets are \\[\\[Off-Guard\\]\\] to the gun's attacks.\n\n**Activate** 3 envision, Interact\n\n**Effect** You unleash a barrage of attacks in an instant. You deal Strike damage to all creatures in a 30-foot cone (basic Reflex). This barrage counts as three attacks for your multiple attack penalty."
      },
      "after": {
        "description": "Resembling little more than a simple iron pipe with a handle, _Kaldemash's Lament_ is one of the most well-known star guns in all of Arcadia. Legends state the Crowned Regent Kaldemash helped forge one of the first star guns millennia ago. While the star gun served Kaldemash as a powerful weapon, its most notable achievement was the accidental killing of one of Kaldemash's greatest friends. This death is what caused the regent to recognize the true destructive power of the star guns and led to him developing the Star Code, a set of rules of engagement and proper use of firearms still in use in Arcadia today. Although Kaldemash never named the weapon himself, all legends that mention the weapon refer to it as _Kaldemash's Lament_.\n\nThe legendary weapon is a +3 major striking speed advanced firearm with a range increment of 90 feet. It deals 4d6 force damage (with the major striking rune included) and has the concealable, concussive, and fatal d10 traits. You don't take a penalty when dealing nonlethal damage with the weapon. Like most star guns, _Kaldemash's Lament_ uses magic to function and doesn't require ammunition or black powder.\n\nIf you use _Kaldemash's Lament_ as part of a duel in which all parties are in agreement on the terms, the gun's supernatural instincts help you make the quickest draw. You roll twice and take the higher result on your initiative roll for the duel; this is a fortune effect. In addition, you can draw _Kaldemash's Lament_ as a free action at the start of your turn during the duel. If you attempt to fire the star gun in bad faith at a dueling opponent once they have surrendered, been defeated, or the duel is over, _Kaldemash's Lament_ flies out of your hand and you can't pick it up, hold it, or wield it for 10 minutes.\n\n**Activate** <abbr cost=\"FREE-ACTION\" class=\"action-symbol\">4</abbr> ([concentrate](link_trait_1432)); **Trigger** You target a creature with an attack\n\n**Effect** You adjust the damage that _Kaldemash's Lament_ deals before firing. _Kaldemash's Lament_'s damage type changes to either electricity, fire, or force until you change the type again.\n\n**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([concentrate](link_trait_1432), [manipulate](link_trait_1433)); **Frequency** once per minute\n\n**Effect** You leave _Kaldemash's Lament_ to fire on its own. You release the star gun and it begins to move independently, flying through the air and firing. You still gain the benefits of the gun's speed rune while it's moving independently. It has a space of 5 feet but doesn't block or impede enemies attempting to move through that space. It always remains within 30 feet of you and intentionally resists being taken or otherwise moved; all attempts to Grab it fail. _Kaldemash's Lament_ moves this way for 3 rounds, after which it returns to your hand. If you don't have a free hand to hold it, the gun instead holsters itself on your person.\n\nWhile _Kaldemash's Lament_ is moving independently, you can command it to make a [Strike](link_action_19856) against a creature as an action, which has the [concentrate](link_trait_1432) trait. It makes a ranged [Strike](link_action_19856) using your attack modifier while wielding it or a +31 bonus, whichever is higher. This attack increases your multiple attack penalty as normal, and the gun uses your multiple attack penalty when determining its attack bonus. Since the star gun is constantly moving and attempting to line up the appropriate shot, creatures it targets are off-guard to the gun's attacks.\n\n**Activate** <abbr cost=\"THREE-ACTIONS\" class=\"action-symbol\">3</abbr> ([concentrate](link_trait_1432), [manipulate](link_trait_1433))\n\n**Effect** You unleash a barrage of attacks in an instant. You deal [Strike](link_action_19856) damage to all creatures in a 30-foot cone (DC 45 basic Reflex save). This barrage counts as three attacks for your multiple attack penalty."
      },
      "description": {
        "before": "Resembling little more than a simple iron pipe with a handle, _Kaldemash's Lament_ is one of the most well-known star guns in all of Arcadia. Legends state the Crowned Regent Kaldemash helped forge one of the first star guns millennia ago. While the star gun served Kaldemash as a powerful weapon, its most notable achievement was the accidental killing of one of Kaldemash's greatest friends. This death is what caused the regent to recognize the true destructive power of the star guns and led to him developing the Star Code, a set of rules of engagement and proper use of firearms still in use in Arcadia today. Although Kaldemash never named the weapon himself, all legends that mention the weapon refer to it as _Kaldemash's Lament_.\n\nThe legendary weapon is a +3 major striking speed advanced firearm with a range increment of 90 feet. It deals 4d6 force damage (with the major striking rune included) and has the concealable, concussive, and fatal d10 traits. You don't take a penalty when dealing nonlethal damage with the weapon. Like most star guns, _Kaldemash's Lament_ uses magic to function and doesn't require ammunition or black powder.\n\nIf you use _Kaldemash's Lament_ as part of a duel in which all parties are in agreement on the terms, the gun's supernatural instincts help you make the quickest draw. You roll twice and take the higher result on your initiative roll for the duel; this is a fortune effect. In addition, you can draw _Kaldemash's Lament_ as a free action at the start of your turn during the duel. If you attempt to fire the star gun in bad faith at a dueling opponent once they have surrendered, been defeated, or the duel is over, _Kaldemash's Lament_ flies out of your hand and you can't pick it up, hold it, or wield it for 10 minutes.\n\n**Activate** f envision\n\n**Effect** You adjust the damage that _Kaldemash's Lament_ deals before firing. _Kaldemash's Lament_'s damage type changes to either electricity, fire, or force until you change the type again.\n\n**Activate** 2 command, Interact\n\n**Effect** You leave _Kaldemash's Lament_ to fire on its own. You release the star gun and it begins to move independently, flying through the air and firing. You still gain the benefits of the gun's speed rune while it's moving independently. It has a space of 5 feet but doesn't block or impede enemies attempting to move through that space. It always remains within 30 feet of you and intentionally resists being taken or otherwise moved; all attempts to Grab it fail. _Kaldemash's Lament_ moves this way for 3 rounds, after which it returns to your hand. If you don't have a free hand to hold it, the gun instead holsters itself on your person.\n\nWhile _Kaldemash's Lament_ is moving independently, you can command it to make a Strike against a creature as an action, which has the concentrate trait. It makes a ranged Strike using your attack modifier while wielding it or a +31 bonus, whichever is higher. This attack increases your multiple attack penalty as normal, and the gun uses your multiple attack penalty when determining its attack bonus. Since the star gun is constantly moving and attempting to line up the appropriate shot, creatures it targets are \\[\\[Off-Guard\\]\\] to the gun's attacks.\n\n**Activate** 3 envision, Interact\n\n**Effect** You unleash a barrage of attacks in an instant. You deal Strike damage to all creatures in a 30-foot cone (basic Reflex). This barrage counts as three attacks for your multiple attack penalty.",
        "after": "Resembling little more than a simple iron pipe with a handle, _Kaldemash's Lament_ is one of the most well-known star guns in all of Arcadia. Legends state the Crowned Regent Kaldemash helped forge one of the first star guns millennia ago. While the star gun served Kaldemash as a powerful weapon, its most notable achievement was the accidental killing of one of Kaldemash's greatest friends. This death is what caused the regent to recognize the true destructive power of the star guns and led to him developing the Star Code, a set of rules of engagement and proper use of firearms still in use in Arcadia today. Although Kaldemash never named the weapon himself, all legends that mention the weapon refer to it as _Kaldemash's Lament_.\n\nThe legendary weapon is a +3 major striking speed advanced firearm with a range increment of 90 feet. It deals 4d6 force damage (with the major striking rune included) and has the concealable, concussive, and fatal d10 traits. You don't take a penalty when dealing nonlethal damage with the weapon. Like most star guns, _Kaldemash's Lament_ uses magic to function and doesn't require ammunition or black powder.\n\nIf you use _Kaldemash's Lament_ as part of a duel in which all parties are in agreement on the terms, the gun's supernatural instincts help you make the quickest draw. You roll twice and take the higher result on your initiative roll for the duel; this is a fortune effect. In addition, you can draw _Kaldemash's Lament_ as a free action at the start of your turn during the duel. If you attempt to fire the star gun in bad faith at a dueling opponent once they have surrendered, been defeated, or the duel is over, _Kaldemash's Lament_ flies out of your hand and you can't pick it up, hold it, or wield it for 10 minutes.\n\n**Activate** <abbr cost=\"FREE-ACTION\" class=\"action-symbol\">4</abbr> ([concentrate](link_trait_1432)); **Trigger** You target a creature with an attack\n\n**Effect** You adjust the damage that _Kaldemash's Lament_ deals before firing. _Kaldemash's Lament_'s damage type changes to either electricity, fire, or force until you change the type again.\n\n**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([concentrate](link_trait_1432), [manipulate](link_trait_1433)); **Frequency** once per minute\n\n**Effect** You leave _Kaldemash's Lament_ to fire on its own. You release the star gun and it begins to move independently, flying through the air and firing. You still gain the benefits of the gun's speed rune while it's moving independently. It has a space of 5 feet but doesn't block or impede enemies attempting to move through that space. It always remains within 30 feet of you and intentionally resists being taken or otherwise moved; all attempts to Grab it fail. _Kaldemash's Lament_ moves this way for 3 rounds, after which it returns to your hand. If you don't have a free hand to hold it, the gun instead holsters itself on your person.\n\nWhile _Kaldemash's Lament_ is moving independently, you can command it to make a [Strike](link_action_19856) against a creature as an action, which has the [concentrate](link_trait_1432) trait. It makes a ranged [Strike](link_action_19856) using your attack modifier while wielding it or a +31 bonus, whichever is higher. This attack increases your multiple attack penalty as normal, and the gun uses your multiple attack penalty when determining its attack bonus. Since the star gun is constantly moving and attempting to line up the appropriate shot, creatures it targets are off-guard to the gun's attacks.\n\n**Activate** <abbr cost=\"THREE-ACTIONS\" class=\"action-symbol\">3</abbr> ([concentrate](link_trait_1432), [manipulate](link_trait_1433))\n\n**Effect** You unleash a barrage of attacks in an instant. You deal [Strike](link_action_19856) damage to all creatures in a 30-foot cone (DC 45 basic Reflex save). This barrage counts as three attacks for your multiple attack penalty.",
        "before_md5": "5318468a8c3b9a8878a93a78fdc97da4",
        "after_md5": "5f254610f18300b8316a124f0ba5b1e6",
        "replacements": [
          {
            "from": "**Activate** f envision\n\n**Effect**",
            "to": "**Activate** <abbr cost=\"FREE-ACTION\" class=\"action-symbol\">4</abbr> ([concentrate](link_trait_1432)); **Trigger** You target a creature with an attack\n\n**Effect**",
            "count": 1
          },
          {
            "from": "**Activate** 2 command, Interact\n\n**Effect**",
            "to": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([concentrate](link_trait_1432), [manipulate](link_trait_1433)); **Frequency** once per minute\n\n**Effect**",
            "count": 1
          },
          {
            "from": "\\[\\[Off-Guard\\]\\]",
            "to": "off-guard",
            "count": 1
          },
          {
            "from": "**Activate** 3 envision, Interact\n\n**Effect**",
            "to": "**Activate** <abbr cost=\"THREE-ACTIONS\" class=\"action-symbol\">3</abbr> ([concentrate](link_trait_1432), [manipulate](link_trait_1433))\n\n**Effect**",
            "count": 1
          },
          {
            "from": "(basic Reflex)",
            "to": "(DC 45 basic Reflex save)",
            "count": 1
          },
          {
            "from": "make a Strike",
            "to": "make a [Strike](link_action_19856)",
            "count": 1
          },
          {
            "from": "a ranged Strike",
            "to": "a ranged [Strike](link_action_19856)",
            "count": 1
          },
          {
            "from": "deal Strike damage",
            "to": "deal [Strike](link_action_19856) damage",
            "count": 1
          },
          {
            "from": "which has the concentrate trait.",
            "to": "which has the [concentrate](link_trait_1432) trait.",
            "count": 1
          }
        ]
      }
    },
    {
      "id": 12486,
      "name": "Stargazer",
      "source": 16,
      "expected": {
        "id": 12486,
        "name": "Stargazer",
        "size": "MEDIUM",
        "uuid": "3558886440938714",
        "group": "WEAPON",
        "hands": null,
        "level": 14,
        "price": {
          "gp": 6500
        },
        "usage": "held-in-one-hand",
        "rarity": "UNCOMMON",
        "traits": [
          1527,
          1504,
          1590,
          1626
        ],
        "version": "1.0",
        "operations": null,
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "metadata": {
        "hp": 0,
        "bulk": {},
        "group": "club",
        "range": null,
        "runes": {
          "potency": 2,
          "property": [
            {
              "id": 7708,
              "name": "Returning"
            }
          ],
          "striking": 2
        },
        "damage": {
          "die": "d6",
          "dice": 1,
          "damageType": "bludgeoning"
        },
        "hp_max": 0,
        "reload": "-",
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4413",
          "book": "Treasure Vault",
          "page": "35"
        },
        "foundry": {
          "bonus": 0,
          "items": [],
          "rules": [],
          "bonus_damage": 0,
          "container_id": null,
          "splash_damage": 0
        },
        "category": "simple",
        "hardness": 0,
        "material": {
          "type": null,
          "grade": null
        },
        "quantity": 1,
        "base_item": "club",
        "broken_threshold": 0
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "base_item_content",
        "attack_bonus",
        "ac_bonus",
        "check_penalty",
        "speed_penalty",
        "dex_cap",
        "strength",
        "charges",
        "container_default_items",
        "is_shoddy",
        "starfinder"
      ],
      "prior_states": [
        {}
      ],
      "before": {
        "description": "When you invest this clear quartz crystal ball, it orbits your head like an aeon stone. As long as you have the stargazer invested, you can use an Interact action to direct it to orbit one of your hands where you can telekinetically smash the orb into foes, wielding it as a _+2 greater striking returning club_. While you're directing the stargazer, your hand is full, and you can send it back to your head with another Interact action. On a critical hit, the stargazer pulses with hypnotic starlight, \\[\\[Dazzled\\]\\]{Dazzling} the struck creature for 1 round. A stargazer doesn't add critical specialization effects.",
        "bulk": "1"
      },
      "after": {
        "description": "When you invest this clear quartz crystal ball, it orbits your head like an aeon stone. As long as you have the stargazer invested, you can use an [Interact](link_action_19733) action to direct it to orbit one of your hands where you can telekinetically smash the orb into foes, wielding it as a _+2 greater striking returning club_. While you're directing the stargazer, your hand is full, and you can send it back to your head with another [Interact](link_action_19733) action. On a critical hit, the stargazer pulses with hypnotic starlight, [dazzling](link_condition_dazzled) the struck creature for 1 round. A stargazer doesn't add critical specialization effects.",
        "bulk": "0.1"
      },
      "description": {
        "before": "When you invest this clear quartz crystal ball, it orbits your head like an aeon stone. As long as you have the stargazer invested, you can use an Interact action to direct it to orbit one of your hands where you can telekinetically smash the orb into foes, wielding it as a _+2 greater striking returning club_. While you're directing the stargazer, your hand is full, and you can send it back to your head with another Interact action. On a critical hit, the stargazer pulses with hypnotic starlight, \\[\\[Dazzled\\]\\]{Dazzling} the struck creature for 1 round. A stargazer doesn't add critical specialization effects.",
        "after": "When you invest this clear quartz crystal ball, it orbits your head like an aeon stone. As long as you have the stargazer invested, you can use an [Interact](link_action_19733) action to direct it to orbit one of your hands where you can telekinetically smash the orb into foes, wielding it as a _+2 greater striking returning club_. While you're directing the stargazer, your hand is full, and you can send it back to your head with another [Interact](link_action_19733) action. On a critical hit, the stargazer pulses with hypnotic starlight, [dazzling](link_condition_dazzled) the struck creature for 1 round. A stargazer doesn't add critical specialization effects.",
        "before_md5": "797a21b1c7b77f9f6111086f0c3cbdc9",
        "after_md5": "daf8c07922b0811ed9e947f769abaa50",
        "replacements": [
          {
            "from": "\\[\\[Dazzled\\]\\]{Dazzling}",
            "to": "[dazzling](link_condition_dazzled)",
            "count": 1
          },
          {
            "from": "an Interact action",
            "to": "an [Interact](link_action_19733) action",
            "count": 1
          },
          {
            "from": "another Interact action",
            "to": "another [Interact](link_action_19733) action",
            "count": 1
          }
        ]
      }
    }
  ],
  "dependencies": [
    {
      "table": "trait",
      "id": 1432,
      "name": "Concentrate",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 1432,
            "name": "Concentrate",
            "description": "An action with this trait requires a degree of mental concentration and discipline to perform.",
            "content_source_id": 3,
            "uuid": "3011511166869167"
          },
          "metadata": {
            "source": {
              "url": "https://2e.aonprd.com/Traits.aspx?ID=561",
              "book": "Player Core",
              "page": "454"
            }
          },
          "metadata_absent": [
            "deprecated",
            "important",
            "creature_trait",
            "unselectable",
            "class_trait",
            "ancestry_trait",
            "archetype_trait",
            "versatile_heritage_trait",
            "companion_type_trait"
          ]
        }
      ]
    },
    {
      "table": "trait",
      "id": 1433,
      "name": "Manipulate",
      "source": 3,
      "states": [
        {
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
            "versatile_heritage_trait",
            "companion_type_trait"
          ]
        }
      ]
    },
    {
      "table": "trait",
      "id": 1492,
      "name": "Aura",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 1492,
            "name": "Aura",
            "description": "An aura is an emanation that continually ebbs out from you, affecting creatures within a certain radius. Aura can also refer to the [magical](link_trait_1504) signature of an item.",
            "content_source_id": 3,
            "uuid": "7373264551834683"
          },
          "metadata": {
            "source": {
              "url": "https://2e.aonprd.com/Traits.aspx?ID=542",
              "book": "Player Core",
              "page": "453"
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
        }
      ]
    },
    {
      "table": "trait",
      "id": 1470,
      "name": "Teleportation",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 1470,
            "name": "Teleportation",
            "description": "Teleportation effects allow you to instantaneously move from one point in space to another. Teleportation does not usually trigger reactions based on movement.",
            "content_source_id": 3,
            "uuid": "5276584614830739"
          },
          "metadata": {
            "source": {
              "url": "https://2e.aonprd.com/Traits.aspx?ID=710",
              "book": "Player Core",
              "page": "462"
            }
          },
          "metadata_absent": [
            "deprecated",
            "important",
            "creature_trait",
            "unselectable",
            "class_trait",
            "ancestry_trait",
            "archetype_trait",
            "versatile_heritage_trait",
            "companion_type_trait"
          ]
        }
      ]
    },
    {
      "table": "spell",
      "id": 4814,
      "name": "Safe Passage",
      "source": 1,
      "states": [
        {
          "expected": {
            "id": 4814,
            "name": "Safe Passage",
            "rank": 3,
            "traditions": [
              "arcane",
              "divine",
              "primal"
            ],
            "rarity": "COMMON",
            "cast": "THREE-ACTIONS",
            "traits": [
              1432,
              1433
            ],
            "defense": null,
            "cost": "",
            "trigger": null,
            "requirements": null,
            "range": "touch",
            "area": "10-foot-wide, 10-foot-tall, 60-foot-long section of terrain",
            "targets": "",
            "duration": "1 minute",
            "description": "You make passage through the area safe for a brief amount of time. Anyone passing through the area gains the following benefits against harmful effects of the terrain and environment, including environmental damage, hazardous terrain, and hazards in the area. The spell grants a +2 status bonus to AC and saves against such effects, and resistance 5 to all damage from such effects. Furthermore, the spell prevents anything in the area that's prone to collapse, such as a rickety bridge or an unstable ceiling, from collapsing, except under extreme strain that would collapse a normal structure of its type.\n\n_Safe passage_ protects only against harm, not inconvenience, and it doesn't reduce difficult terrain, remove the concealed condition caused by precipitation, or the like, nor does it protect against creatures within the spell's area.",
            "content_source_id": 1,
            "version": "1.0",
            "uuid": "6425681134899699",
            "heightened": {
              "text": [
                {
                  "amount": "(5th)",
                  "text": "The granted resistance increases to 10, and the area can be 120 feet long."
                },
                {
                  "amount": "(8th)",
                  "text": "The granted resistance increases to 15, and the area can be 500 feet long."
                }
              ],
              "data": {}
            },
            "availability": null
          },
          "metadata": {
            "damage": [],
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=1659",
              "book": "Player Core",
              "page": "355"
            },
            "foundry": {
              "rules": [],
              "is_focus": false
            }
          },
          "metadata_absent": [
            "focus",
            "type",
            "ritual",
            "unselectable",
            "deprecated"
          ]
        },
        {
          "expected": {
            "id": 4814,
            "name": "Safe Passage",
            "rank": 3,
            "traditions": [
              "arcane",
              "divine",
              "primal"
            ],
            "rarity": "COMMON",
            "cast": "THREE-ACTIONS",
            "traits": [
              1432,
              1433
            ],
            "defense": null,
            "cost": "",
            "trigger": null,
            "requirements": null,
            "range": "touch",
            "area": "10-foot-wide, 10-foot-tall, 60-foot-long section of terrain",
            "targets": "",
            "duration": "sustained up to 1 minute",
            "description": "You make passage through the area safe for a brief amount of time. Anyone passing through the area gains the following benefits against harmful effects of the terrain and environment, including environmental damage, hazardous terrain, and hazards in the area. The spell grants a +2 status bonus to AC and saves against such effects, and resistance 5 to all damage from such effects. Furthermore, the spell prevents anything in the area that's prone to collapse, such as a rickety bridge or an unstable ceiling, from collapsing, except under extreme strain that would collapse a normal structure of its type.\n\n_Safe passage_ protects only against harm, not inconvenience, and it doesn't reduce difficult terrain, remove the concealed condition caused by precipitation, or the like, nor does it protect against creatures within the spell's area.",
            "content_source_id": 1,
            "version": "1.0",
            "uuid": "6425681134899699",
            "heightened": {
              "text": [
                {
                  "amount": "(5th)",
                  "text": "The granted resistance increases to 10, and the area can be 120 feet long."
                },
                {
                  "amount": "(8th)",
                  "text": "The granted resistance increases to 15, and the area can be 500 feet long."
                }
              ],
              "data": {}
            },
            "availability": null
          },
          "metadata": {
            "damage": [],
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=1659",
              "book": "Player Core",
              "page": "355"
            },
            "foundry": {
              "rules": [],
              "is_focus": false
            }
          },
          "metadata_absent": [
            "focus",
            "type",
            "ritual",
            "unselectable",
            "deprecated"
          ]
        }
      ]
    },
    {
      "table": "spell",
      "id": 4677,
      "name": "Illusory Disguise",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 4677,
            "name": "Illusory Disguise",
            "rank": 1,
            "traditions": [
              "arcane",
              "occult"
            ],
            "rarity": "COMMON",
            "cast": "TWO-ACTIONS",
            "traits": [
              1432,
              1447,
              1433,
              1479
            ],
            "defense": null,
            "cost": "",
            "trigger": null,
            "requirements": null,
            "range": "30 feet",
            "area": null,
            "targets": "1 willing creature",
            "duration": "1 hour",
            "description": "You create an illusion that causes the target to appear as another creature of the same body shape, and with roughly similar height (within 6 inches) and weight (within 50 pounds). The disguise is typically good enough to hide their identity, but not to impersonate a specific individual. The spell changes their appearance and voice, but not mannerisms. You can change the appearance of its clothing and worn items, such as making its armor look like a dress. Held items are unaffected, and any worn item removed from the creature returns to its true appearance.\n\nCasting _illusory disguise_ counts as setting up a disguise for the [Impersonate](link_action_19731) use of Deception; it ignores any circumstance penalties the target might take for disguising itself as a dissimilar creature, gives a +4 status bonus to Deception checks to prevent others from seeing through the disguise, and lets the target add its level to such Deception checks even if untrained. You can [Dismiss](link_action_19627) this spell.",
            "content_source_id": 3,
            "version": "1.0",
            "uuid": "2506771266650650",
            "heightened": {
              "text": [
                {
                  "amount": "(3rd)",
                  "text": "The target can appear as any creature of the same size, even a specific individual. You must have seen an individual to replicate its appearance, and must have heard its voice to replicate its voice."
                },
                {
                  "amount": "(4th)",
                  "text": "You can target up to 10 willing creatures. If you target multiple creatures, you can choose a different disguise for each target, but none can impersonate a specific individual. You can [Dismiss](link_action_19627) each disguise individually or all collectively."
                },
                {
                  "amount": "(7th)",
                  "text": "As 4th, but you can choose disguises that impersonate specific individuals. You must have seen an individual to replicate its appearance, and must have heard its voice to replicate its voice."
                }
              ],
              "data": {}
            },
            "availability": null
          },
          "metadata": {
            "damage": [],
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=1568",
              "book": "Player Core",
              "page": "337"
            },
            "foundry": {
              "rules": [],
              "is_focus": false
            }
          },
          "metadata_absent": [
            "focus",
            "type",
            "ritual",
            "unselectable",
            "deprecated"
          ]
        }
      ]
    },
    {
      "table": "ability-block",
      "id": 19852,
      "name": "Steal",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 19852,
            "operations": null,
            "name": "Steal",
            "actions": "ONE-ACTION",
            "level": 1,
            "rarity": "COMMON",
            "prerequisites": [],
            "frequency": null,
            "cost": null,
            "trigger": null,
            "requirements": null,
            "access": null,
            "description": "You try to take a small object from another creature without being noticed. Typically, you can Steal only an object of negligible Bulk, you must have a free hand, and you automatically fail if the creature who has the object is in combat or on guard.\n\nAttempt a Thievery check to determine if you successfully Steal the object. The DC is usually the Perception DC of the creature wearing the object. It's easiest to steal an object that is worn but not closely guarded (like a loosely carried pouch filled with coins, or an object within such a pouch). The GM might increase the DC if the object is protected or if the nature of the object makes it harder to steal (such as a very small item in a large pack, or a sheet of parchment mixed in with other documents). For instance, the DC is typically 5 higher if the object is in a pocket, held in a creature's hand, or similarly protected.\n\nYou might also need to compare your Thievery check result against the Perception DCs of observers other than the person wearing the object. The GM might impose a circumstance penalty to the DCs of observers who are distracted.\n\n**Success** You steal the item without the bearer noticing, or an observer doesn't see you take or attempt to take the item.\n\n**Failure** The item's bearer notices your attempt before you can take the object, or an observer sees you take or attempt to take the item. The GM determines the response of any creature that notices your theft.",
            "special": null,
            "type": "action",
            "traits": [
              1433,
              1438
            ],
            "content_source_id": 3,
            "version": "1.0",
            "uuid": "7030387941264189",
            "availability": null
          },
          "metadata": {
            "skill": "THIEVERY",
            "source": {
              "url": "https://2e.aonprd.com/Actions.aspx?ID=2410",
              "book": "Player Core",
              "page": "246"
            },
            "foundry": {
              "rules": []
            }
          },
          "metadata_absent": [
            "unselectable",
            "deprecated",
            "can_select_multiple_times"
          ]
        }
      ]
    },
    {
      "table": "language",
      "id": 81,
      "name": "Common",
      "source": 1,
      "states": [
        {
          "expected": {
            "id": 81,
            "name": "Common",
            "speakers": "Humans, Dwarves, Elves, Halflings, and other common ancestries",
            "script": "Common",
            "description": "Common is a relative term used to denote the most prevalent human language spoken in a particular region. In each different region there may be different dialects and variations in the common language. In general, Common is the name for the standard language in which most humanoids speak.",
            "content_source_id": 1,
            "rarity": "COMMON",
            "uuid": "3424023905255176",
            "availability": null,
            "deprecated": null
          },
          "metadata": {
            "source": {
              "url": "https://2e.aonprd.com/Languages.aspx?ID=155",
              "book": "Player Core",
              "page": "89"
            }
          },
          "metadata_absent": [
            "unselectable",
            "deprecated"
          ]
        }
      ]
    },
    {
      "table": "ability-block",
      "id": 20769,
      "name": "Darkvision",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 20769,
            "operations": [
              {
                "id": "85ad67ec-6db0-407a-a46c-a5477825b724",
                "type": "adjValue",
                "data": {
                  "variable": "SENSES_PRECISE",
                  "value": "darkvision"
                }
              }
            ],
            "name": "Darkvision",
            "actions": null,
            "level": 1,
            "rarity": "COMMON",
            "prerequisites": [],
            "frequency": "",
            "cost": "",
            "trigger": "",
            "requirements": "",
            "access": "",
            "description": "A creature with darkvision can see perfectly well in areas of darkness and dim light, though such vision is in black and white only. Some forms of magical darkness, such as a 4th-rank [darkness](link_spell_4552) spell, block normal darkvision.",
            "special": "",
            "type": "sense",
            "traits": [],
            "content_source_id": 3,
            "version": "1.0",
            "uuid": "990708369957964",
            "availability": null
          },
          "metadata": {
            "source": {
              "url": "https://2e.aonprd.com/Familiars.aspx?ID=142",
              "book": "Player Core",
              "page": "259"
            },
            "unselectable": true
          },
          "metadata_absent": [
            "deprecated",
            "can_select_multiple_times",
            "skill",
            "foundry"
          ]
        }
      ]
    },
    {
      "table": "item",
      "id": 11726,
      "name": "Autumn's Embrace",
      "source": 16,
      "states": [
        {
          "expected": {
            "id": 11726,
            "bulk": "1",
            "name": "Autumn's Embrace",
            "size": "MEDIUM",
            "uuid": "3907058889255350",
            "group": "ARMOR",
            "hands": null,
            "level": 12,
            "price": {
              "gp": 2000
            },
            "usage": "worn armor",
            "rarity": "COMMON",
            "traits": [
              1527,
              1504
            ],
            "version": "1.0",
            "operations": null,
            "description": "Woven by [fey](link_trait_2021) seamstresses as rewards for servants of nature, countless leaves continually changing colors in autumnal hues comprise _autumn's embrace_, a suit of [_+2_](link_item_6720) [_invisibility_](link_item_7052) [_resilient_](link_item_7703) [_leaf weave_](link_item_12147). Leaves shed from the armor as they might fall in autumn. When activating the armor's _invisibility_ property rune, you disappear in a swirl of colorful leaves.\n\n**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([aura](link_trait_1492), [concentrate](link_trait_1432), [manipulate](link_trait_1433)); **Frequency** once per day; **Effect** You call forth a storm of leaves from _autumn's embrace_. These leaves swirl in a 20-foot emanation for 1 minute. Creatures within the area are concealed, and creatures outside the area are concealed to creatures within the leaves. However, you can see through this concealment. You can [Dismiss](link_action_19627) the activation.",
            "availability": null,
            "content_source_id": 16,
            "craft_requirements": null
          },
          "metadata": {
            "hp": 0,
            "bulk": {},
            "group": "wood",
            "runes": {
              "potency": 2,
              "property": [
                {
                  "id": 7052,
                  "name": "Invisibility",
                  "rune": {
                    "id": 7052,
                    "bulk": "0",
                    "name": "Invisibility",
                    "size": "MEDIUM",
                    "uuid": 1312161067029585,
                    "group": "RUNE",
                    "hands": null,
                    "level": 8,
                    "price": {
                      "gp": 500
                    },
                    "usage": "etched onto light armor",
                    "rarity": "COMMON",
                    "traits": [
                      1447,
                      1504
                    ],
                    "version": "1.0",
                    "meta_data": {
                      "hp": 0,
                      "bulk": {},
                      "group": "",
                      "runes": {},
                      "damage": {
                        "die": "",
                        "dice": 1,
                        "extra": "",
                        "damageType": ""
                      },
                      "hp_max": 0,
                      "charges": {},
                      "foundry": {
                        "items": [],
                        "rules": [],
                        "container_id": null
                      },
                      "category": "",
                      "hardness": 0,
                      "material": {
                        "type": null,
                        "grade": null
                      },
                      "quantity": 1,
                      "base_item": null,
                      "image_url": "",
                      "is_shoddy": false,
                      "starfinder": {},
                      "unselectable": false,
                      "broken_threshold": 0
                    },
                    "created_at": "2024-02-06T05:18:53.01583+00:00",
                    "operations": null,
                    "description": "Light seems to partially penetrate this armor.\n\n**Activate—**[**Go Invisible**](link_spell_3390) <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([concentrate](link_trait_1432))\n\n**Frequency** Once per day\n\n**Effect** With a thought, you become invisible for 1 minute, gaining the effects of a 2nd-rank [Invisibility](link_spell_4689) spell.",
                    "availability": null,
                    "content_source_id": 7,
                    "craft_requirements": "Supply one casting of invisibility."
                  }
                }
              ],
              "resilient": 1
            },
            "damage": {
              "die": "",
              "dice": "",
              "extra": "",
              "damageType": ""
            },
            "hp_max": 0,
            "source": {
              "url": "https://2e.aonprd.com/Equipment.aspx?ID=4373",
              "book": "Treasure Vault",
              "page": "14"
            },
            "charges": {},
            "dex_cap": 4,
            "foundry": {
              "items": [],
              "rules": [],
              "container_id": null
            },
            "ac_bonus": 1,
            "category": "light",
            "hardness": 0,
            "material": {
              "type": null,
              "grade": null
            },
            "quantity": 1,
            "strength": 0,
            "base_item": "leaf-weave",
            "image_url": "",
            "is_shoddy": false,
            "starfinder": {
              "slots": []
            },
            "unselectable": false,
            "check_penalty": -1,
            "speed_penalty": 0,
            "broken_threshold": 0,
            "base_item_content": {
              "id": 12147,
              "bulk": "1",
              "name": "Leaf Weave",
              "size": "MEDIUM",
              "uuid": 693254247930899,
              "group": "WEAPON",
              "hands": null,
              "level": 0,
              "price": {
                "gp": 4
              },
              "usage": null,
              "rarity": "COMMON",
              "traits": [
                2860
              ],
              "version": "1.0",
              "meta_data": {
                "hp": 0,
                "bulk": {},
                "group": "wood",
                "runes": {
                  "potency": 0,
                  "property": [],
                  "resilient": 0
                },
                "hp_max": 0,
                "dex_cap": 4,
                "foundry": {
                  "items": [],
                  "rules": [],
                  "container_id": null
                },
                "ac_bonus": 1,
                "category": "light",
                "hardness": 0,
                "material": {
                  "type": null,
                  "grade": null
                },
                "quantity": 1,
                "strength": 0,
                "base_item": "leaf-weave",
                "check_penalty": -1,
                "speed_penalty": 0,
                "broken_threshold": 0
              },
              "created_at": "2024-04-19T04:19:21.462176+00:00",
              "operations": null,
              "description": "Specialized crafters, often elves, create leaf weave out of sturdy leaves from ancient or magically enriched trees. Such leaves, when treated properly, have the strength of leather, and other tough plant materials hold the leaves together to form the armor. Such suits are popular among those who wish to avoid materials taken from slain beasts. As a material, leaf weave has the same statistics as thin wood.",
              "availability": null,
              "content_source_id": 16,
              "craft_requirements": null
            }
          },
          "metadata_absent": [
            "deprecated",
            "attack_bonus",
            "container_default_items",
            "range",
            "reload"
          ]
        },
        {
          "expected": {
            "id": 11726,
            "bulk": "1",
            "name": "Autumn's Embrace",
            "size": "MEDIUM",
            "uuid": "3907058889255350",
            "group": "ARMOR",
            "hands": null,
            "level": 12,
            "price": {
              "gp": 2000
            },
            "usage": "worn armor",
            "rarity": "COMMON",
            "traits": [
              1527,
              1504
            ],
            "version": "1.0",
            "operations": null,
            "description": "Woven by [fey](link_trait_2021) seamstresses as rewards for servants of nature, countless leaves continually changing colors in autumnal hues comprise _autumn's embrace_, a suit of [_+2_](link_item_6720) [_invisibility_](link_item_7052) [_resilient_](link_item_7703) [_leaf weave_](link_item_12147). Leaves shed from the armor as they might fall in autumn. When activating the armor's _invisibility_ property rune, you disappear in a swirl of colorful leaves.\n\n**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([aura](link_trait_1492), [concentrate](link_trait_1432), [manipulate](link_trait_1433)); **Frequency** once per day; **Effect** You call forth a storm of leaves from _autumn's embrace_. These leaves swirl in a 20-foot emanation for 1 minute. Creatures within the area are concealed, and creatures outside the area are concealed to creatures within the leaves. However, you can see through this concealment. You can [Dismiss](link_action_19627) the activation.",
            "availability": null,
            "content_source_id": 16,
            "craft_requirements": null
          },
          "metadata": {
            "hp": 0,
            "bulk": {},
            "group": "wood",
            "runes": {
              "potency": 2,
              "property": [
                {
                  "id": 7052,
                  "name": "Invisibility",
                  "rune": {
                    "id": 7052,
                    "bulk": "0",
                    "name": "Invisibility",
                    "size": "MEDIUM",
                    "uuid": 1312161067029585,
                    "group": "RUNE",
                    "hands": null,
                    "level": 8,
                    "price": {
                      "gp": 500
                    },
                    "usage": "etched onto light armor",
                    "rarity": "COMMON",
                    "traits": [
                      1447,
                      1504
                    ],
                    "version": "1.0",
                    "meta_data": {
                      "hp": 0,
                      "bulk": {},
                      "group": "",
                      "runes": {},
                      "damage": {
                        "die": "",
                        "dice": 1,
                        "extra": "",
                        "damageType": ""
                      },
                      "hp_max": 0,
                      "charges": {},
                      "foundry": {
                        "items": [],
                        "rules": [],
                        "container_id": null
                      },
                      "category": "",
                      "hardness": 0,
                      "material": {
                        "type": null,
                        "grade": null
                      },
                      "quantity": 1,
                      "base_item": null,
                      "image_url": "",
                      "is_shoddy": false,
                      "starfinder": {},
                      "unselectable": false,
                      "broken_threshold": 0
                    },
                    "created_at": "2024-02-06T05:18:53.01583+00:00",
                    "operations": null,
                    "description": "Light seems to partially penetrate this armor.\n\n**Activate—Go Invisible** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([concentrate](link_trait_1432))\n\n**Frequency** Once per day\n\n**Effect** With a thought, you become invisible for 1 minute, gaining the effects of a 2nd-rank [Invisibility](link_spell_4689) spell.",
                    "availability": null,
                    "content_source_id": 7,
                    "craft_requirements": "Supply one casting of invisibility."
                  }
                }
              ],
              "resilient": 1
            },
            "damage": {
              "die": "",
              "dice": "",
              "extra": "",
              "damageType": ""
            },
            "hp_max": 0,
            "source": {
              "url": "https://2e.aonprd.com/Equipment.aspx?ID=4373",
              "book": "Treasure Vault",
              "page": "14"
            },
            "charges": {},
            "dex_cap": 4,
            "foundry": {
              "items": [],
              "rules": [],
              "container_id": null
            },
            "ac_bonus": 1,
            "category": "light",
            "hardness": 0,
            "material": {
              "type": null,
              "grade": null
            },
            "quantity": 1,
            "strength": 0,
            "base_item": "leaf-weave",
            "image_url": "",
            "is_shoddy": false,
            "starfinder": {
              "slots": []
            },
            "unselectable": false,
            "check_penalty": -1,
            "speed_penalty": 0,
            "broken_threshold": 0,
            "base_item_content": {
              "id": 12147,
              "bulk": "1",
              "name": "Leaf Weave",
              "size": "MEDIUM",
              "uuid": 693254247930899,
              "group": "WEAPON",
              "hands": null,
              "level": 0,
              "price": {
                "gp": 4
              },
              "usage": null,
              "rarity": "COMMON",
              "traits": [
                2860
              ],
              "version": "1.0",
              "meta_data": {
                "hp": 0,
                "bulk": {},
                "group": "wood",
                "runes": {
                  "potency": 0,
                  "property": [],
                  "resilient": 0
                },
                "hp_max": 0,
                "dex_cap": 4,
                "foundry": {
                  "items": [],
                  "rules": [],
                  "container_id": null
                },
                "ac_bonus": 1,
                "category": "light",
                "hardness": 0,
                "material": {
                  "type": null,
                  "grade": null
                },
                "quantity": 1,
                "strength": 0,
                "base_item": "leaf-weave",
                "check_penalty": -1,
                "speed_penalty": 0,
                "broken_threshold": 0
              },
              "created_at": "2024-04-19T04:19:21.462176+00:00",
              "operations": null,
              "description": "Specialized crafters, often elves, create leaf weave out of sturdy leaves from ancient or magically enriched trees. Such leaves, when treated properly, have the strength of leather, and other tough plant materials hold the leaves together to form the armor. Such suits are popular among those who wish to avoid materials taken from slain beasts. As a material, leaf weave has the same statistics as thin wood.",
              "availability": null,
              "content_source_id": 16,
              "craft_requirements": null
            }
          },
          "metadata_absent": [
            "deprecated",
            "attack_bonus",
            "container_default_items",
            "range",
            "reload"
          ]
        }
      ]
    },
    {
      "table": "item",
      "id": 23287,
      "name": "Mercurial Mantle",
      "source": 842,
      "states": [
        {
          "expected": {
            "id": 23287,
            "name": "Mercurial Mantle",
            "bulk": "0.1",
            "level": 18,
            "rarity": "COMMON",
            "description": "This deep red cloak fits lightly about your shoulders, and the edges perpetually twitch slightly, as though caught in a breeze. The cloth feels smoother than silk, rippling and swaying like liquid when in motion. You feel a lively energy infusing your arms and legs. You gain a +3 item bonus to Acrobatics and Stealth and a +2 circumstance bonus to AC against attacks from reactions triggered by your movement.\n\nWhen you invest the cloak, you either increase your Dexterity modifier by 1 or increase it to +4, whichever would give you a higher value.\n\n**Activate—Cunning Dodge** <abbr cost=\"REACTION\" class=\"action-symbol\">5</abbr> ([manipulate](link_trait_1433)) **Frequency** once per hour; **Trigger** An enemy misses you with a melee [Strike](link_action_19856); **Effect** You slip around the attacking creature with ease. You [Step](link_action_19853), without moving out of the triggering enemy’s reach, and then make a melee [Strike](link_action_19856) against the triggering enemy if it’s within your reach. If you do make a [Strike](link_action_19856), the target attempts a DC 38 Perception check before you roll.  \n**Failure** This creature is off-guard against the [Strike](link_action_19856).  \n**Critical Failure** This creature is off-guard against all your attacks until the end of its next turn.\n\n**Activate—Wandering Twirl** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([concentrate](link_trait_1432), [teleportation](link_trait_1470)) **Frequency** once per day; **Effect** The cloak hums with power as your whirl it around yourself, disappearing amid a brief flash of light. Teleport up to double your Speed to a location you can see. At the end of the teleportation, you can make a melee [Strike](link_action_19856) against a creature within reach, if there is one.",
            "group": "GENERAL",
            "hands": null,
            "size": "MEDIUM",
            "craft_requirements": "",
            "usage": "worn cloak",
            "operations": [
              {
                "id": "a09beca6-a788-4b84-a9d4-7980f1a34bdd",
                "type": "addBonusToValue",
                "data": {
                  "variable": "SKILL_ACROBATICS",
                  "value": "3",
                  "type": "item",
                  "text": ""
                }
              },
              {
                "id": "10311364-2696-4c4f-89bf-fe872a3d836e",
                "type": "addBonusToValue",
                "data": {
                  "variable": "SKILL_STEALTH",
                  "value": "3",
                  "type": "item",
                  "text": ""
                }
              },
              {
                "id": "1e31dfbc-14da-49a8-a9df-9fe7622a0036",
                "type": "addBonusToValue",
                "data": {
                  "variable": "AC_BONUS",
                  "value": "2",
                  "type": "circumstance",
                  "text": "against attacks from reactions triggered by your movement."
                }
              },
              {
                "id": "448336df-2a92-4f08-ad4c-540b73c4e77e",
                "type": "conditional",
                "data": {
                  "conditions": [
                    {
                      "id": "3cc56802-5dcb-4881-a9b3-d7fbddeeab97",
                      "name": "ATTRIBUTE_DEX",
                      "data": {
                        "name": "ATTRIBUTE_DEX",
                        "type": "attr",
                        "value": {
                          "value": 0,
                          "partial": false
                        }
                      },
                      "type": "attr",
                      "operator": "LESS_THAN",
                      "value": 4
                    }
                  ],
                  "trueOperations": [
                    {
                      "id": "7680b2b1-d8e8-4a7b-ae8b-947d3d297656",
                      "type": "setValue",
                      "data": {
                        "variable": "ATTRIBUTE_DEX",
                        "value": {
                          "value": 4,
                          "partial": false
                        }
                      }
                    }
                  ],
                  "falseOperations": [
                    {
                      "id": "316ec9d5-be3a-468f-913c-d1360b25372d",
                      "type": "adjValue",
                      "data": {
                        "variable": "ATTRIBUTE_DEX",
                        "value": {
                          "value": 1
                        }
                      }
                    },
                    {
                      "id": "93017713-ff69-4ffa-a0ab-6877787843b6",
                      "type": "adjValue",
                      "data": {
                        "variable": "ATTRIBUTE_DEX",
                        "value": {
                          "value": 1
                        }
                      }
                    }
                  ]
                }
              }
            ],
            "content_source_id": 842,
            "version": "1.0",
            "uuid": "6352935101736652",
            "price": {
              "gp": 24000
            },
            "traits": [
              1552,
              1527,
              1504
            ],
            "availability": null
          },
          "metadata": {
            "bulk": {},
            "runes": {
              "potency": 0,
              "property": [],
              "striking": 0,
              "resilient": 0
            },
            "damage": {
              "die": "",
              "dice": 1,
              "extra": "",
              "damageType": ""
            },
            "charges": {},
            "foundry": {},
            "material": {},
            "quantity": 1,
            "image_url": "",
            "is_shoddy": false,
            "starfinder": {
              "slots": []
            },
            "unselectable": false
          },
          "metadata_absent": [
            "deprecated",
            "base_item",
            "base_item_content",
            "category",
            "group",
            "attack_bonus",
            "ac_bonus",
            "check_penalty",
            "speed_penalty",
            "dex_cap",
            "strength",
            "container_default_items",
            "hardness",
            "hp",
            "hp_max",
            "broken_threshold",
            "range",
            "reload"
          ]
        }
      ]
    },
    {
      "table": "ability-block",
      "id": 19627,
      "name": "Dismiss",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 19627,
            "operations": null,
            "name": "Dismiss",
            "actions": "ONE-ACTION",
            "level": null,
            "rarity": "COMMON",
            "prerequisites": null,
            "frequency": null,
            "cost": null,
            "trigger": null,
            "requirements": null,
            "access": null,
            "description": "You end an effect that states you can Dismiss it. Dimissing ends the entire effect unless noted otherwise.",
            "special": null,
            "type": "action",
            "traits": [
              1432,
              1437
            ],
            "content_source_id": 3,
            "version": "1.0",
            "uuid": "6610017043267456",
            "availability": null
          },
          "metadata": {
            "source": {
              "url": "https://2e.aonprd.com/Actions.aspx?ID=2311",
              "book": "Player Core",
              "page": "419"
            },
            "foundry": {
              "rules": []
            }
          },
          "metadata_absent": [
            "unselectable",
            "deprecated",
            "can_select_multiple_times",
            "skill"
          ]
        }
      ]
    },
    {
      "table": "ability-block",
      "id": 19743,
      "name": "Palm an Object",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 19743,
            "operations": null,
            "name": "Palm an Object",
            "actions": "ONE-ACTION",
            "level": null,
            "rarity": "COMMON",
            "prerequisites": null,
            "frequency": null,
            "cost": null,
            "trigger": null,
            "requirements": null,
            "access": null,
            "description": "You pick up a small, unattended object and try not to be noticed. Roll a single Thievery check against the Perception DCs of all creatures who are currently observing you. You can typically only Palm Objects of negligible Bulk, though the GM might determine otherwise depending on the situation.\n\n**Success** The creature doesn't notice you Palming the Object.\n\n**Failure** The creature notices you Palming the Object.",
            "special": null,
            "type": "action",
            "traits": [
              1433,
              1438
            ],
            "content_source_id": 3,
            "version": "1.0",
            "uuid": "8765912622111081",
            "availability": null
          },
          "metadata": {
            "skill": "THIEVERY",
            "source": {
              "url": "https://2e.aonprd.com/Actions.aspx?ID=2409",
              "book": "Player Core",
              "page": "246"
            },
            "foundry": {
              "rules": []
            }
          },
          "metadata_absent": [
            "unselectable",
            "deprecated",
            "can_select_multiple_times"
          ]
        }
      ]
    },
    {
      "table": "ability-block",
      "id": 19853,
      "name": "Step",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 19853,
            "operations": null,
            "name": "Step",
            "actions": "ONE-ACTION",
            "level": null,
            "rarity": "COMMON",
            "prerequisites": null,
            "frequency": null,
            "cost": null,
            "trigger": null,
            "requirements": "Your Speed is at least 10 feet.",
            "access": null,
            "description": "You carefully move 5 feet. Unlike most types of movement, Stepping doesn't trigger reactions, such as [Reactive Strike](link_class-feature_19201), that can be triggered by move actions or upon leaving or entering a square.\n\nYou can't Step into difficult terrain, and you can't Step using a Speed other than your land Speed.",
            "special": null,
            "type": "action",
            "traits": [
              1437,
              1505
            ],
            "content_source_id": 3,
            "version": "1.0",
            "uuid": "567734121479914",
            "availability": null
          },
          "metadata": {
            "source": {
              "url": "https://2e.aonprd.com/Actions.aspx?ID=2304",
              "book": "Player Core",
              "page": "418"
            },
            "foundry": {
              "rules": []
            }
          },
          "metadata_absent": [
            "unselectable",
            "deprecated",
            "can_select_multiple_times",
            "skill"
          ]
        }
      ]
    },
    {
      "table": "ability-block",
      "id": 19856,
      "name": "Strike",
      "source": 3,
      "states": [
        {
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
            "unselectable",
            "deprecated",
            "can_select_multiple_times",
            "skill"
          ]
        }
      ]
    },
    {
      "table": "ability-block",
      "id": 19733,
      "name": "Interact",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 19733,
            "operations": null,
            "name": "Interact",
            "actions": "ONE-ACTION",
            "level": null,
            "rarity": "COMMON",
            "prerequisites": null,
            "frequency": null,
            "cost": null,
            "trigger": null,
            "requirements": null,
            "access": null,
            "description": "You use your hand or hands to manipulate an object or the terrain. You can grab an unattended or stored object, draw a weapon, swap a held item for another, open a door, or achieve a similar effect. On rare occasions, you might have to attempt a skill check to determine if your Interact action was successful.",
            "special": null,
            "type": "action",
            "traits": [
              1437,
              1433
            ],
            "content_source_id": 3,
            "version": "1.0",
            "uuid": "3402914292668269",
            "availability": null
          },
          "metadata": {
            "foundry": {
              "rules": []
            }
          },
          "metadata_absent": [
            "unselectable",
            "deprecated",
            "can_select_multiple_times",
            "skill"
          ]
        }
      ]
    }
  ],
  "sources": [
    {
      "id": 1,
      "name": "Player Core",
      "foundry_id": "Pathfinder Player Core",
      "url": "https://paizo.com/products/btq02eoj?Pathfinder-Player-Core",
      "description": "The Pathfinder Player Core presents a new entry point to Pathfinder Second Edition, with everything a player needs to learn how to play the game! Choose from eight ancestries, eight complete character classes, and hundreds of feats and spells to make unique characters ready for deadly adventures in a world beset by magic and evil! This 464-page hardcover tome is the definitive rules resource for all Pathfinder Second Edition players!",
      "operations": [],
      "user_id": null,
      "contact_info": "",
      "require_key": false,
      "is_published": true,
      "required_content_sources": [],
      "group": "pathfinder-core",
      "artwork_url": null,
      "keys": null,
      "deprecated": null
    },
    {
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
    {
      "id": 842,
      "name": "Impossible Magic",
      "foundry_id": null,
      "url": "https://store.paizo.com/pathfinder-impossible-magic/",
      "description": "The perfect spell can solve just about any problem. From simple cantrips to reality-warping magic, this new rulebook contains a plethora of options for any adventurer who wants to delve into the unknown and unlock their true magical potential.\n\nWithin the confines of these pages lies the magnificent spellcraft of four wonderfully magical and unique classes!\n\n*   Strike with both spell and blade with as a magus.\n    \n*   Command an army of the undead as a necromancer.\n    \n*   Scribe unique magic onto enemies and allies alike as a runesmith.\n    \n*   Fight alongside a powerful magical companion as a summoner.\n    \n\nYou’ll also find over 240 spells that can be cast for both mischief and wonder, new impossible spells so impactful that they scar the soul, several fantastical archetypes that will bring a magical twist to any table, new arcane schools derived from the heart of the Impossible Lands themselves, and wondrous magical items that will allow even the most mundane of characters to experience the power of magic.\n\nAll of this is made manifest before you with Impossible Magic!",
      "operations": [],
      "user_id": null,
      "contact_info": null,
      "require_key": false,
      "is_published": true,
      "required_content_sources": [
        1
      ],
      "group": "pathfinder-core",
      "artwork_url": "",
      "keys": null,
      "deprecated": null
    },
    {
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
    }
  ]
}
  $intelligent$::jsonb;
  source_spec jsonb; source_row jsonb; dependency jsonb; dependency_row jsonb;
  patch jsonb; replacement jsonb; item_row public.item%rowtype; actual_pair jsonb;
  next_text text; actual_count integer; changed_rows integer; expected_after jsonb; saved_after jsonb;
begin
  lock table public.content_update in share mode;
  if jsonb_array_length(spec->'items')<>4 or jsonb_array_length(spec->'dependencies')<>16
    or jsonb_array_length(spec->'sources')<>4 then raise exception 'Invalid reviewed intelligent-item scope'; end if;
  for source_spec in select value from jsonb_array_elements(spec->'sources') order by (value->>'id')::bigint loop
    select to_jsonb(s) into source_row from public.content_source s where s.id=(source_spec->>'id')::bigint for update;
    if not found or exists(select 1 from jsonb_each(source_spec) e where source_row->e.key is distinct from e.value) then
      raise exception 'Missing or changed official intelligent-item source: %',source_spec->>'id';
    end if;
    if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and u.type='content-source'
      and (u.ref_id=(source_spec->>'id')::bigint or u.data->>'id'=source_spec->>'id'
        or (u.ref_id is null and u.data->>'name'=source_spec->>'name'))) then
      raise exception 'Intelligent-item source has a pending curator submission: %',source_spec->>'id';
    end if;
  end loop;
  for dependency in select value from jsonb_array_elements(spec->'dependencies')
    order by value->>'table',(value->>'id')::bigint loop
    dependency_row:=null;
    case dependency->>'table'
      when 'spell' then select to_jsonb(s)||jsonb_build_object('uuid',s.uuid::text) into dependency_row from public.spell s where s.id=(dependency->>'id')::bigint for share;
      when 'ability-block' then select to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text) into dependency_row from public.ability_block a where a.id=(dependency->>'id')::bigint for share;
      when 'trait' then select to_jsonb(t)||jsonb_build_object('uuid',t.uuid::text) into dependency_row from public.trait t where t.id=(dependency->>'id')::bigint for share;
      when 'item' then select to_jsonb(i)||jsonb_build_object('uuid',i.uuid::text) into dependency_row from public.item i where i.id=(dependency->>'id')::bigint for share;
      when 'language' then select to_jsonb(l)||jsonb_build_object('uuid',l.uuid::text) into dependency_row from public.language l where l.id=(dependency->>'id')::bigint for share;
      else raise exception 'Invalid intelligent-item dependency table';
    end case;
    if dependency_row is null or jsonb_typeof(dependency_row->'meta_data') is distinct from 'object'
      or not exists(select 1 from jsonb_array_elements(dependency->'states') state
        where not exists(select 1 from jsonb_each(state->'expected') e where dependency_row->e.key is distinct from e.value)
          and not exists(select 1 from jsonb_each(state->'metadata') e where dependency_row#>array['meta_data',e.key] is distinct from e.value)
          and not exists(select 1 from jsonb_array_elements_text(state->'metadata_absent') k(key) where dependency_row->'meta_data'?k.key)) then
      raise exception 'Intelligent-item dependency differs from reviewed complete states: %',dependency->>'id';
    end if;
    if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and u.type=dependency->>'table'
      and (u.ref_id=(dependency->>'id')::bigint or u.data->>'id'=dependency->>'id' or (u.ref_id is null
        and (u.content_source_id=(dependency->>'source')::bigint or u.data->>'content_source_id'=dependency->>'source')
        and u.data->>'name'=dependency->>'name'))) then
      raise exception 'Intelligent-item dependency has a pending curator submission: %',dependency->>'id';
    end if;
  end loop;
  for patch in select value from jsonb_array_elements(spec->'items') order by (value->>'id')::bigint loop
    select * into item_row from public.item where id=(patch->>'id')::bigint for update;
    if not found or exists(select 1 from jsonb_each(patch->'expected') e
      where (to_jsonb(item_row)||jsonb_build_object('uuid',item_row.uuid::text))->e.key is distinct from e.value)
      or jsonb_typeof(item_row.meta_data) is distinct from 'object'
      or exists(select 1 from jsonb_each(patch->'metadata') e where item_row.meta_data->e.key is distinct from e.value)
      or exists(select 1 from jsonb_array_elements_text(patch->'metadata_absent') k(key) where item_row.meta_data?k.key)
      or not exists(select 1 from jsonb_array_elements(patch->'prior_states') state
        where not exists(select 1 from jsonb_each(state) e where to_jsonb(item_row)->e.key is distinct from e.value)) then
      raise exception 'Intelligent-item identity or mechanics differ from reviewed entry: %',patch->>'id';
    end if;
    if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and u.type='item'
      and (u.ref_id=item_row.id or u.data->>'id'=item_row.id::text or (u.ref_id is null
        and (u.content_source_id=item_row.content_source_id or u.data->>'content_source_id'=item_row.content_source_id::text)
        and u.data->>'name'=item_row.name))) then
      raise exception 'Intelligent item has a pending curator submission: %',patch->>'id';
    end if;
    next_text:=patch#>>'{description,before}';
    if md5(next_text) is distinct from patch#>>'{description,before_md5}' then raise exception 'Invalid intelligent-item before hash'; end if;
    for replacement in select value from jsonb_array_elements(patch#>'{description,replacements}') loop
      if coalesce(length(replacement->>'from'),0)=0 or (replacement->>'count')::integer<=0 then raise exception 'Invalid intelligent-item replacement'; end if;
      actual_count:=(length(next_text)-length(replace(next_text,replacement->>'from','')))/length(replacement->>'from');
      if actual_count is distinct from (replacement->>'count')::integer then raise exception 'Intelligent-item literal count drift'; end if;
      next_text:=replace(next_text,replacement->>'from',replacement->>'to');
    end loop;
    if next_text is distinct from patch#>>'{description,after}' or md5(next_text) is distinct from patch#>>'{description,after_md5}' then raise exception 'Invalid intelligent-item after hash'; end if;
    select jsonb_object_agg(key,to_jsonb(item_row)->key) into actual_pair from jsonb_object_keys(patch->'after') key;
    if actual_pair=patch->'after' then continue; end if;
    if actual_pair is distinct from patch->'before' then raise exception 'Unreviewed intelligent-item leaf pair: %',patch->>'id'; end if;
    expected_after:=(to_jsonb(item_row)-'updated_at'-'search_tsv')||(patch->'after');
    update public.item i set description=next_text,
      usage=case when patch->'after'?'usage' then patch#>>'{after,usage}' else i.usage end,
      bulk=case when patch->'after'?'bulk' then patch#>>'{after,bulk}' else i.bulk end
      where i.id=item_row.id and (to_jsonb(i)-'updated_at'-'search_tsv') is not distinct from (to_jsonb(item_row)-'updated_at'-'search_tsv');
    get diagnostics changed_rows=row_count;
    if changed_rows<>1 then raise exception 'Intelligent-item CAS failed: %',patch->>'id'; end if;
    select to_jsonb(i)-'updated_at'-'search_tsv' into saved_after from public.item i where i.id=item_row.id;
    if saved_after is distinct from expected_after then raise exception 'Intelligent-item readback changed unrelated data: %',patch->>'id'; end if;
  end loop;
end
$repair$;
