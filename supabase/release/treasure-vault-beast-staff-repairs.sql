with spec as (select $beast$
{
  "items": [
    {
      "id": 11744,
      "expected": {
        "id": 11744,
        "bulk": "1",
        "name": "Beast Staff (Greater)",
        "size": "MEDIUM",
        "uuid": 7650090604193117,
        "group": "WEAPON",
        "hands": null,
        "level": 11,
        "price": {
          "gp": 1400
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1504,
          1546,
          1831
        ],
        "version": "1.0",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed ranks of all listed spells."
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4779",
          "book": "Treasure Vault",
          "page": "131"
        },
        "category": "simple",
        "group": "club",
        "base_item": "staff",
        "damage": {
          "die": "d4",
          "dice": 1,
          "damageType": "bludgeoning"
        },
        "runes": {
          "potency": 2,
          "property": [],
          "striking": 1
        }
      },
      "description": {
        "before": "The visages of beasts are carved into the painted wood of a _beast staff_, with a large head on top. When used as a weapon, the staff is a _+2 striking staff_. While wielding the staff while you have it prepared, you're affected by \\[\\[Speak with Animals\\]\\]. If you have \\[\\[Animal Empathy\\]\\], you gain a +2 circumstance bonus on checks using it.\n\n**Activate** Cast a Spell\n\n**Effect** You expend a number of charges from the staff to cast a spell from its list.\n\n*   **Cantrip** \\[\\[Gouging Claw\\]\\]\n*   **1st** \\[\\[Runic Body\\]\\], \\[\\[Pest Form\\]\\]\n*   **2nd** \\[\\[Animal Form\\]\\], \\[\\[Enlarge\\]\\]\n*   **3rd** \\[\\[Animal Form\\]\\], \\[\\[Insect Form\\]\\]\n*   **4th** \\[\\[Animal Form\\]\\], \\[\\[Bestial Curse\\]\\], \\[\\[Insect Form\\]\\], \\[\\[Pest Form\\]\\]",
        "after": "The visages of beasts are carved into the painted wood of a _beast staff_, with a large head on top. When used as a weapon, the staff is a _+2 striking staff_. While wielding the staff while you have it prepared, you're affected by *[speak with animals](link_spell_4847)*. If you have [Animal Empathy](link_feat_19908), you gain a +2 circumstance bonus on checks using it.\n\n**Activate** [Cast a Spell](link_action_19611)\n\n**Effect** You expend a number of charges from the staff to cast a spell from its list.\n\n*   **Cantrip** *[gouging claw](link_spell_4645)*\n*   **1st** *[runic body](link_spell_4812)*, *[pest form](link_spell_4759)*\n*   **2nd** *[animal form](link_spell_4396)*, *[enlarge](link_spell_4601)*\n*   **3rd** *[animal form](link_spell_4396)*, *[insect form](link_spell_4685)*\n*   **4th** *[animal form](link_spell_4396)*, *[bestial curse](link_spell_6717)*, *[insect form](link_spell_4685)*, *[pest form](link_spell_4759)*",
        "before_md5": "9cf46479c2c475f67597e6e02507d371",
        "after_md5": "2830099f53ea7fbeb5e22e2b1758c745",
        "replacements": [
          {
            "from": "\\[\\[Gouging Claw\\]\\]",
            "to": "*[gouging claw](link_spell_4645)*",
            "count": 1,
            "dependency_id": 4645,
            "dependency_table": "spell"
          },
          {
            "from": "\\[\\[Runic Body\\]\\]",
            "to": "*[runic body](link_spell_4812)*",
            "count": 1,
            "dependency_id": 4812,
            "dependency_table": "spell"
          },
          {
            "from": "\\[\\[Pest Form\\]\\]",
            "to": "*[pest form](link_spell_4759)*",
            "count": 2,
            "dependency_id": 4759,
            "dependency_table": "spell"
          },
          {
            "from": "\\[\\[Animal Form\\]\\]",
            "to": "*[animal form](link_spell_4396)*",
            "count": 3,
            "dependency_id": 4396,
            "dependency_table": "spell"
          },
          {
            "from": "\\[\\[Enlarge\\]\\]",
            "to": "*[enlarge](link_spell_4601)*",
            "count": 1,
            "dependency_id": 4601,
            "dependency_table": "spell"
          },
          {
            "from": "\\[\\[Insect Form\\]\\]",
            "to": "*[insect form](link_spell_4685)*",
            "count": 2,
            "dependency_id": 4685,
            "dependency_table": "spell"
          },
          {
            "from": "\\[\\[Bestial Curse\\]\\]",
            "to": "*[bestial curse](link_spell_6717)*",
            "count": 1,
            "dependency_id": 6717,
            "dependency_table": "spell"
          },
          {
            "from": "\\[\\[Speak with Animals\\]\\]",
            "to": "*[speak with animals](link_spell_4847)*",
            "count": 1,
            "dependency_id": 4847,
            "dependency_table": "spell"
          },
          {
            "from": "\\[\\[Animal Empathy\\]\\]",
            "to": "[Animal Empathy](link_feat_19908)",
            "count": 1,
            "dependency_id": 19908,
            "dependency_table": "ability_block"
          },
          {
            "from": "Cast a Spell",
            "to": "[Cast a Spell](link_action_19611)",
            "count": 1,
            "dependency_id": 19611,
            "dependency_table": "ability_block"
          }
        ]
      },
      "operations": {
        "before": null,
        "after": [
          {
            "id": "f233ca88-d0e2-4e12-95ec-61864dca8e7c",
            "type": "addBonusToValue",
            "data": {
              "text": "to checks using Animal Empathy",
              "type": "circumstance",
              "value": 2,
              "variable": "SKILL_DIPLOMACY"
            }
          }
        ]
      }
    },
    {
      "id": 11745,
      "expected": {
        "id": 11745,
        "bulk": "1",
        "name": "Beast Staff (Major)",
        "size": "MEDIUM",
        "uuid": 3376851731016992,
        "group": "WEAPON",
        "hands": null,
        "level": 15,
        "price": {
          "gp": 6250
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1504,
          1546,
          1831
        ],
        "version": "1.0",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed ranks of all listed spells."
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4779",
          "book": "Treasure Vault",
          "page": "131"
        },
        "category": "simple",
        "group": "club",
        "base_item": "staff",
        "damage": {
          "die": "d4",
          "dice": 1,
          "damageType": "bludgeoning"
        },
        "runes": {
          "potency": 2,
          "property": [],
          "striking": 2
        }
      },
      "description": {
        "before": "The visages of beasts are carved into the painted wood of a _beast staff_, with a large head on top. When used as a weapon, the staff is a _+2 greater striking staff_. While wielding the staff while you have it prepared, you're affected by \\[\\[Speak with Animals\\]\\]. If you have \\[\\[Animal Empathy\\]\\], you gain a +2 circumstance bonus on checks using it.\n\n**Activate** Cast a Spell\n\n**Effect** You expend a number of charges from the staff to cast a spell from its list.\n\n*   **Cantrip** \\[\\[Gouging Claw\\]\\]\n*   **1st** \\[\\[Runic Body\\]\\], \\[\\[Pest Form\\]\\]\n*   **2nd** \\[\\[Animal Form\\]\\], \\[\\[Enlarge\\]\\]\n*   **3rd** \\[\\[Animal Form\\]\\], \\[\\[Insect Form\\]\\]\n*   **4th** \\[\\[Animal Form\\]\\], \\[\\[Bestial Curse\\]\\], \\[\\[Insect Form\\]\\], \\[\\[Pest Form\\]\\]\n*   **5th** \\[\\[Animal Form\\]\\], \\[\\[Insect Form\\]\\], \\[\\[Moon Frenzy\\]\\]\n*   **6th** \\[\\[Cursed Metamorphosis\\]\\], \\[\\[Moon Frenzy\\]\\]",
        "after": "The visages of beasts are carved into the painted wood of a _beast staff_, with a large head on top. When used as a weapon, the staff is a _+2 greater striking staff_. While wielding the staff while you have it prepared, you're affected by *[speak with animals](link_spell_4847)*. If you have [Animal Empathy](link_feat_19908), you gain a +2 circumstance bonus on checks using it.\n\n**Activate** [Cast a Spell](link_action_19611)\n\n**Effect** You expend a number of charges from the staff to cast a spell from its list.\n\n*   **Cantrip** *[gouging claw](link_spell_4645)*\n*   **1st** *[runic body](link_spell_4812)*, *[pest form](link_spell_4759)*\n*   **2nd** *[animal form](link_spell_4396)*, *[enlarge](link_spell_4601)*\n*   **3rd** *[animal form](link_spell_4396)*, *[insect form](link_spell_4685)*\n*   **4th** *[animal form](link_spell_4396)*, *[bestial curse](link_spell_6717)*, *[insect form](link_spell_4685)*, *[pest form](link_spell_4759)*\n*   **5th** *[animal form](link_spell_4396)*, *[insect form](link_spell_4685)*, *[moon frenzy](link_spell_4731)*\n*   **6th** *[cursed metamorphosis](link_spell_4550)*, *[moon frenzy](link_spell_4731)*",
        "before_md5": "de39caa4ab9dd8143a25dfdf7b2d7883",
        "after_md5": "b2e33fd6cbd381cc5647c55502fd413e",
        "replacements": [
          {
            "from": "\\[\\[Gouging Claw\\]\\]",
            "to": "*[gouging claw](link_spell_4645)*",
            "count": 1,
            "dependency_id": 4645,
            "dependency_table": "spell"
          },
          {
            "from": "\\[\\[Runic Body\\]\\]",
            "to": "*[runic body](link_spell_4812)*",
            "count": 1,
            "dependency_id": 4812,
            "dependency_table": "spell"
          },
          {
            "from": "\\[\\[Pest Form\\]\\]",
            "to": "*[pest form](link_spell_4759)*",
            "count": 2,
            "dependency_id": 4759,
            "dependency_table": "spell"
          },
          {
            "from": "\\[\\[Animal Form\\]\\]",
            "to": "*[animal form](link_spell_4396)*",
            "count": 4,
            "dependency_id": 4396,
            "dependency_table": "spell"
          },
          {
            "from": "\\[\\[Enlarge\\]\\]",
            "to": "*[enlarge](link_spell_4601)*",
            "count": 1,
            "dependency_id": 4601,
            "dependency_table": "spell"
          },
          {
            "from": "\\[\\[Insect Form\\]\\]",
            "to": "*[insect form](link_spell_4685)*",
            "count": 3,
            "dependency_id": 4685,
            "dependency_table": "spell"
          },
          {
            "from": "\\[\\[Bestial Curse\\]\\]",
            "to": "*[bestial curse](link_spell_6717)*",
            "count": 1,
            "dependency_id": 6717,
            "dependency_table": "spell"
          },
          {
            "from": "\\[\\[Moon Frenzy\\]\\]",
            "to": "*[moon frenzy](link_spell_4731)*",
            "count": 2,
            "dependency_id": 4731,
            "dependency_table": "spell"
          },
          {
            "from": "\\[\\[Cursed Metamorphosis\\]\\]",
            "to": "*[cursed metamorphosis](link_spell_4550)*",
            "count": 1,
            "dependency_id": 4550,
            "dependency_table": "spell"
          },
          {
            "from": "\\[\\[Speak with Animals\\]\\]",
            "to": "*[speak with animals](link_spell_4847)*",
            "count": 1,
            "dependency_id": 4847,
            "dependency_table": "spell"
          },
          {
            "from": "\\[\\[Animal Empathy\\]\\]",
            "to": "[Animal Empathy](link_feat_19908)",
            "count": 1,
            "dependency_id": 19908,
            "dependency_table": "ability_block"
          },
          {
            "from": "Cast a Spell",
            "to": "[Cast a Spell](link_action_19611)",
            "count": 1,
            "dependency_id": 19611,
            "dependency_table": "ability_block"
          }
        ]
      },
      "operations": {
        "before": null,
        "after": [
          {
            "id": "a7c0f355-75dc-4515-bce1-6bdb79e479f1",
            "type": "addBonusToValue",
            "data": {
              "text": "to checks using Animal Empathy",
              "type": "circumstance",
              "value": 2,
              "variable": "SKILL_DIPLOMACY"
            }
          }
        ]
      }
    }
  ],
  "spell": {
    "id": 4550,
    "before": {
      "traditions": [
        "arcane",
        "primal"
      ],
      "defense": null
    },
    "after": {
      "traditions": [
        "arcane",
        "occult",
        "primal"
      ],
      "defense": "Fortitude"
    }
  },
  "dependencies": [
    {
      "table": "spell",
      "id": 4645,
      "expected": {
        "id": 4645,
        "area": null,
        "cast": "TWO-ACTIONS",
        "cost": "",
        "name": "Gouging Claw",
        "rank": 0,
        "uuid": 7936654456260456,
        "range": "touch",
        "rarity": "COMMON",
        "traits": [
          1520,
          1858,
          1432,
          1433,
          1456
        ],
        "defense": "AC",
        "targets": "1 creature",
        "trigger": null,
        "version": "1.0",
        "duration": "",
        "heightened": {
          "data": {
            "type": "interval",
            "damage": {
              "0": "1d6",
              "3Pz4NTLXD2rzKgf4": "1"
            },
            "interval": 1
          },
          "text": [
            {
              "text": "The damage increases by 1d6 and the persistent bleed damage increases by 1.",
              "amount": "(+1)"
            }
          ]
        },
        "traditions": [
          "arcane",
          "primal"
        ],
        "availability": null,
        "requirements": null,
        "content_source_id": 3
      },
      "citation": {
        "url": "https://2e.aonprd.com/Spells.aspx?ID=1546",
        "book": "Player Core",
        "page": "333"
      },
      "description_md5": "1fc3830d3f43d8e9e5c8b13b3a617fe2"
    },
    {
      "table": "spell",
      "id": 4812,
      "expected": {
        "id": 4812,
        "area": null,
        "cast": "TWO-ACTIONS",
        "cost": "",
        "name": "Runic Body",
        "rank": 1,
        "uuid": 385478542821882,
        "range": "touch",
        "rarity": "COMMON",
        "traits": [
          1432,
          1433
        ],
        "defense": null,
        "targets": "1 willing creature",
        "trigger": null,
        "version": "1.0",
        "duration": "1 minute",
        "heightened": {
          "data": {},
          "text": [
            {
              "text": "The [unarmed](link_trait_2398) attacks are [+2](link_item_7951) [greater striking](link_item_7860).",
              "amount": "(6th)"
            },
            {
              "text": "The [unarmed](link_trait_2398) attacks are [+3](link_item_7952) [major striking](link_item_7861).",
              "amount": "(9th)"
            }
          ]
        },
        "traditions": [
          "arcane",
          "divine",
          "occult",
          "primal"
        ],
        "availability": null,
        "requirements": null,
        "content_source_id": 1
      },
      "citation": {
        "url": "https://2e.aonprd.com/Spells.aspx?ID=1657",
        "book": "Player Core",
        "page": "354"
      },
      "description_md5": "ad9cf6c8826d94570f449cbd53367e7b"
    },
    {
      "table": "spell",
      "id": 4759,
      "expected": {
        "id": 4759,
        "area": null,
        "cast": "TWO-ACTIONS",
        "cost": "",
        "name": "Pest Form",
        "rank": 1,
        "uuid": 7666863353548012,
        "range": "",
        "rarity": "COMMON",
        "traits": [
          1432,
          1433,
          1453
        ],
        "defense": null,
        "targets": "",
        "trigger": null,
        "version": "1.0",
        "duration": "10 minutes",
        "heightened": {
          "data": {},
          "text": [
            {
              "text": "You can turn into a flying creature, such as a bird, which grants you a fly Speed of 20 feet.",
              "amount": "(4th)"
            }
          ]
        },
        "traditions": [
          "arcane",
          "primal"
        ],
        "availability": null,
        "requirements": null,
        "content_source_id": 3
      },
      "citation": {
        "url": "https://2e.aonprd.com/Spells.aspx?ID=1626",
        "book": "Player Core",
        "page": "348"
      },
      "description_md5": "b24365f9214f71be22006e54d172fd96"
    },
    {
      "table": "spell",
      "id": 4396,
      "expected": {
        "id": 4396,
        "area": null,
        "cast": "TWO-ACTIONS",
        "cost": "",
        "name": "Animal Form",
        "rank": 2,
        "uuid": 3660260469319000,
        "range": "",
        "rarity": "COMMON",
        "traits": [
          1432,
          1433,
          1453
        ],
        "defense": null,
        "targets": "",
        "trigger": null,
        "version": "1.0",
        "duration": "1 minute",
        "heightened": {
          "data": {},
          "text": [
            {
              "text": "You instead gain 10 temporary HP, AC = 17 + your level, attack modifier +14, damage bonus +5, and Athletics +14.",
              "amount": "(3rd)"
            },
            {
              "text": "Your battle form is Large and your attacks have 10-foot reach. You must have enough space to expand into or the spell is lost. You instead gain 15 temporary HP, AC = 18 + your level, attack modifier +16, damage bonus +9, and Athletics +16.",
              "amount": "(4th)"
            },
            {
              "text": "Your battle form is Huge and your attacks have 15-foot reach. You must have enough space to expand into or the spell is lost. You instead gain 20 temporary HP, AC = 18 + your level, attack modifier +18, damage bonus +7 and double the number of damage dice, and Athletics +20.",
              "amount": "(5th)"
            }
          ]
        },
        "traditions": [
          "primal"
        ],
        "availability": null,
        "requirements": null,
        "content_source_id": 3
      },
      "citation": {
        "url": "https://2e.aonprd.com/Spells.aspx?ID=1440",
        "book": "Player Core",
        "page": "315"
      },
      "description_md5": "b367459c0f094f7b78b1929e4f070ced"
    },
    {
      "table": "spell",
      "id": 4601,
      "expected": {
        "id": 4601,
        "area": null,
        "cast": "TWO-ACTIONS",
        "cost": "",
        "name": "Enlarge",
        "rank": 2,
        "uuid": 6124057272576338,
        "range": "30 feet",
        "rarity": "COMMON",
        "traits": [
          1432,
          1433,
          1453
        ],
        "defense": null,
        "targets": "1 willing creature",
        "trigger": null,
        "version": "1.0",
        "duration": "5 minutes",
        "heightened": {
          "data": {
            "type": "fixed",
            "levels": {
              "6": {
                "target": {
                  "value": "10 willing creatures"
                }
              }
            }
          },
          "text": [
            {
              "text": "The creature instead grows to size Huge. The status bonus to melee damage is +4 and the creature's reach increases by 10 feet (or 15 feet if the creature started out Tiny). The spell has no effect on a Huge or larger creature.",
              "amount": "(4th)"
            },
            {
              "text": "Choose either the 2nd-rank or 4th-rank version of this spell and apply its effects to up to 10 willing creatures.",
              "amount": "(6th)"
            }
          ]
        },
        "traditions": [
          "arcane",
          "primal"
        ],
        "availability": null,
        "requirements": null,
        "content_source_id": 3
      },
      "citation": {
        "url": "https://2e.aonprd.com/Spells.aspx?ID=1514",
        "book": "Player Core",
        "page": "329"
      },
      "description_md5": "a8504dc9b42da4046a6b37f0ceb04db5"
    },
    {
      "table": "spell",
      "id": 4685,
      "expected": {
        "id": 4685,
        "area": null,
        "cast": "TWO-ACTIONS",
        "cost": "",
        "name": "Insect Form",
        "rank": 3,
        "uuid": 1464551210591452,
        "range": "",
        "rarity": "COMMON",
        "traits": [
          1432,
          1433,
          1453
        ],
        "defense": null,
        "targets": "",
        "trigger": null,
        "version": "1.0",
        "duration": "1 minute",
        "heightened": {
          "data": {},
          "text": [
            {
              "text": "Your battle form is Large, and your attacks have 10-foot [reach](link_trait_1573). You instead gain 15 temporary HP, attack modifier +16, damage bonus +6, and Athletics +16.",
              "amount": "(4th)"
            },
            {
              "text": "Your battle form is Huge, and your attacks have 15-foot reach. You instead gain 20 temporary HP, attack modifier +18, damage bonus +2 and double damage dice (including persistent damage), and Athletics +20.",
              "amount": "(5th)"
            }
          ]
        },
        "traditions": [
          "arcane",
          "primal"
        ],
        "availability": null,
        "requirements": null,
        "content_source_id": 3
      },
      "citation": {
        "url": "https://2e.aonprd.com/Spells.aspx?ID=1575",
        "book": "Player Core",
        "page": "338"
      },
      "description_md5": "f1837e9b582d3b73344604ec763e0656"
    },
    {
      "table": "spell",
      "id": 6717,
      "expected": {
        "id": 6717,
        "area": "",
        "cast": "TWO-ACTIONS",
        "cost": "",
        "name": "Bestial Curse",
        "rank": 4,
        "uuid": 6412580058990552,
        "range": "touch",
        "rarity": "COMMON",
        "traits": [
          1432,
          1855,
          1433,
          1453
        ],
        "defense": "Fortitude",
        "targets": "1 living humanoid",
        "trigger": "",
        "version": "1.0",
        "duration": "varies",
        "heightened": {
          "data": {},
          "text": []
        },
        "traditions": [
          "arcane",
          "occult",
          "primal"
        ],
        "availability": null,
        "requirements": "",
        "content_source_id": 256
      },
      "citation": {
        "url": "https://2e.aonprd.com/Spells.aspx?ID=1966",
        "book": "Player Core 2",
        "page": "240"
      },
      "description_md5": "492bd57e3c917c953906389bfa0e7d41"
    },
    {
      "table": "spell",
      "id": 4731,
      "expected": {
        "id": 4731,
        "area": null,
        "cast": "TWO-ACTIONS",
        "cost": "",
        "name": "Moon Frenzy",
        "rank": 5,
        "uuid": 1618977606287186,
        "range": "30 feet",
        "rarity": "COMMON",
        "traits": [
          1432,
          1433,
          1456
        ],
        "defense": null,
        "targets": "up to 5 willing creatures",
        "trigger": null,
        "version": "1.0",
        "duration": "1 minute",
        "heightened": {
          "data": {},
          "text": [
            {
              "text": "The temporary Hit Points increase to 10, the silver weakness to 10, and the damage dealt by the attacks to three dice.",
              "amount": "(6th)"
            },
            {
              "text": "The temporary Hit Points increase to 20, the silver weakness to 20, and the damage dealt by the attacks to four dice.",
              "amount": "(10th)"
            }
          ]
        },
        "traditions": [
          "primal"
        ],
        "availability": null,
        "requirements": null,
        "content_source_id": 1
      },
      "citation": {
        "url": "https://2e.aonprd.com/Spells.aspx?ID=1609",
        "book": "Player Core",
        "page": "345"
      },
      "description_md5": "0fe3f708eed7ec323abfbad37f80b23f"
    },
    {
      "table": "spell",
      "id": 4550,
      "expected": {
        "id": 4550,
        "area": null,
        "cast": "TWO-ACTIONS",
        "cost": "",
        "name": "Cursed Metamorphosis",
        "rank": 6,
        "uuid": 8435989020925318,
        "range": "30 feet",
        "rarity": "COMMON",
        "traits": [
          1432,
          1855,
          1481,
          1433,
          1453
        ],
        "defense": "Fortitude",
        "targets": "1 creature",
        "trigger": null,
        "version": "1.0",
        "duration": "varies",
        "heightened": {
          "data": {},
          "text": []
        },
        "traditions": [
          "arcane",
          "occult",
          "primal"
        ],
        "availability": null,
        "requirements": null,
        "content_source_id": 3
      },
      "citation": {
        "url": "https://2e.aonprd.com/Spells.aspx?ID=1479",
        "book": "Player Core",
        "page": "322"
      },
      "description_md5": "da87b7982a35e309c385583e97b06fb6"
    },
    {
      "table": "ability_block",
      "id": 19611,
      "expected": {
        "id": 19611,
        "operations": [],
        "name": "Cast a Spell",
        "actions": null,
        "level": 1,
        "rarity": "COMMON",
        "prerequisites": [],
        "frequency": null,
        "cost": null,
        "trigger": null,
        "requirements": null,
        "access": null,
        "special": null,
        "type": "action",
        "traits": [],
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "3222895456836016",
        "availability": null
      },
      "citation": null,
      "description_md5": "47178cd6a4d7e5fdc38cb9a4d4ad1c7c"
    },
    {
      "table": "ability_block",
      "id": 19908,
      "expected": {
        "id": 19908,
        "operations": [],
        "name": "Animal Empathy (Druid)",
        "actions": null,
        "level": 1,
        "rarity": "COMMON",
        "prerequisites": [],
        "frequency": null,
        "cost": null,
        "trigger": null,
        "requirements": null,
        "access": null,
        "special": null,
        "type": "feat",
        "traits": [
          1343
        ],
        "content_source_id": 1,
        "version": "1.0",
        "uuid": "5291244091667893",
        "availability": null
      },
      "citation": {
        "url": "https://2e.aonprd.com/Feats.aspx?ID=4709",
        "book": "Player Core",
        "page": "127"
      },
      "description_md5": "9233ae9cb0c3be785a53fc40c88afa50"
    },
    {
      "table": "spell",
      "id": 4847,
      "expected": {
        "id": 4847,
        "name": "Speak with Animals",
        "rank": 2,
        "traditions": [
          "primal"
        ],
        "rarity": "COMMON",
        "cast": "TWO-ACTIONS",
        "traits": [
          1432,
          1433
        ],
        "defense": null,
        "cost": "",
        "trigger": null,
        "requirements": null,
        "range": "",
        "area": null,
        "targets": "",
        "duration": "1 hour",
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "1234193248414972",
        "heightened": {},
        "availability": null
      },
      "citation": {
        "url": "https://2e.aonprd.com/Spells.aspx?ID=1680",
        "book": "Player Core",
        "page": "358"
      },
      "description_md5": "d3cfabdf4dc12f5c8b1dcaea965bdf65"
    },
    {
      "table": "trait",
      "id": 1546,
      "expected": {
        "id": 1546,
        "name": "Staff",
        "content_source_id": 3,
        "uuid": "1053442481403873"
      },
      "citation": {
        "url": "https://2e.aonprd.com/Traits.aspx?ID=700",
        "book": "GM Core",
        "page": "278"
      },
      "description_md5": "08c57597051c2a1b9c12acba85de1dd2"
    }
  ],
  "sources": [
    {
      "id": 256,
      "name": "Player Core 2"
    },
    {
      "id": 1,
      "name": "Player Core"
    },
    {
      "id": 3,
      "name": "Common Core"
    },
    {
      "id": 16,
      "name": "Treasure Vault"
    }
  ]
}
$beast$::jsonb as value),
owners as (
  select p.value as patch,to_jsonb(i) as actual from spec s cross join jsonb_array_elements(s.value->'items') p
  left join public.item i on i.id=(p.value->>'id')::bigint
), dependencies as (
  select d.value as dependency,case d.value->>'table'
    when 'spell' then (select to_jsonb(r) from public.spell r where r.id=(d.value->>'id')::bigint)
    when 'ability_block' then (select to_jsonb(r) from public.ability_block r where r.id=(d.value->>'id')::bigint)
    when 'trait' then (select to_jsonb(r) from public.trait r where r.id=(d.value->>'id')::bigint)
    end as actual from spec s cross join jsonb_array_elements(s.value->'dependencies') d
)
select 'treasure-vault-beast-staff-repairs' as id,coalesce(
  (select count(*)=2 and bool_and(actual is not null
    and not exists (select 1 from jsonb_each(patch->'expected') property where actual->property.key is distinct from property.value)
    and not exists (select 1 from jsonb_each(patch->'metadata') property where actual #> array['meta_data',property.key] is distinct from property.value)
    and actual->>'description' is not distinct from patch #>> '{description,after}'
    and actual->'operations' is not distinct from patch #> '{operations,after}') from owners),false) as passed
union all
select 'treasure-vault-beast-staff-dependencies',coalesce(
  (select count(*)=13 and bool_and(actual is not null
    and not exists (select 1 from jsonb_each(dependency->'expected') property where
      case when property.key='uuid' then (actual->>property.key)::bigint is distinct from (property.value #>> '{}')::bigint
        else actual->property.key is distinct from property.value end)
    and actual #> '{meta_data,source}' is not distinct from nullif(dependency->'citation','null'::jsonb)
    and md5(actual->>'description') is not distinct from dependency->>'description_md5') from dependencies),false)
union all
select 'treasure-vault-beast-staff-sources',coalesce(
  (select count(*)=4 and bool_and(c.id is not null and c.name=x.value->>'name' and c.user_id is null and c.is_published is true)
   from spec s cross join jsonb_array_elements(s.value->'sources') x left join public.content_source c on c.id=(x.value->>'id')::bigint),false)
union all
select 'treasure-vault-beast-staff-pending',not exists (select 1 from public.content_update u where u.status->>'state' = 'PENDING' and (
      (u.type = 'item' and u.ref_id in (11744,11745))
      or (u.type = 'spell' and u.ref_id in (4396,4550,4601,4645,4685,4731,4759,4812,4847,6717))
      or (u.type = 'ability-block' and u.ref_id in (19611,19908))
      or (u.type = 'trait' and u.ref_id = 1546)
      or (u.type = 'content-source' and u.ref_id in (1,3,16,256))
    ));
