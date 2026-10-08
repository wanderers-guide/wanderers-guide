-- Preserve the original repair; use the pinned shared terminal check.
do $historical_dual$
declare completion_recognized boolean;completion_passed boolean;
begin
  lock table public.content_update in share mode;
  lock table public.content_source in share mode;
  lock table public.ability_block in share row exclusive mode;
  lock table public.ancestry in share row exclusive mode;
  lock table public.archetype in share row exclusive mode;
  lock table public.class in share row exclusive mode;
  lock table public.creature in share row exclusive mode;
  lock table public.item in share row exclusive mode;
  lock table public.language in share row exclusive mode;
  lock table public.spell in share row exclusive mode;
  lock table public.trait in share row exclusive mode;
  perform s.id from public.content_source s where s.id in(1,3,7,8,11,12,13,14,15,16,17,18,19,22,23,28,29,33,34,37,51,185,239,240,241,256,400,420,476,493,842) order by s.id for share;
  if (exists(select 1 from pg_catalog.pg_proc p
  where p.oid=pg_catalog.to_regprocedure('public.treasure_vault_terminal_status_v1()')
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((p.prosrc)::text,'UTF8')),'hex')='daea9d6e1e03e4adbb63c5ab1e06ad540f09b032ae32a1a0b85e421f43d07ded'
    and p.prokind='f' and p.prolang=(select l.oid from pg_catalog.pg_language l where l.lanname='sql')
    and p.provolatile='s' and p.prosecdef is false and p.proisstrict is false and p.proleakproof is false
    and p.proparallel='u' and p.procost=100 and p.prorows=1
    and p.pronargs=0 and p.pronargdefaults=0 and p.proretset is true
    and p.prorettype=pg_catalog.to_regtype('record')
    and p.proallargtypes=array[pg_catalog.to_regtype('boolean')::oid,pg_catalog.to_regtype('boolean')::oid]
    and p.proargmodes=array['t','t']::"char"[] and p.proargnames=array['recognized','passed']::text[]
    and p.proconfig=array['search_path=""']::text[] and p.proowner=pg_catalog.to_regrole('postgres')
    and (select count(*)=3
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('postgres'))=1
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('service_role'))=1
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('supabase_read_only_user'))=1
      and bool_and((a.privilege_type='EXECUTE' and a.is_grantable is false
      and a.grantor=pg_catalog.to_regrole('postgres')
      and a.grantee in(pg_catalog.to_regrole('postgres'),pg_catalog.to_regrole('service_role'),pg_catalog.to_regrole('supabase_read_only_user'))) is true)
      from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a)
    and pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE')
    and pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
    and pg_catalog.has_function_privilege('supabase_read_only_user',p.oid,'EXECUTE'))) is not true then
    raise exception 'Treasure Vault terminal helper is missing or differs from the reviewed definition';
  end if;
  select s.recognized,s.passed into strict completion_recognized,completion_passed from public.treasure_vault_terminal_status_v1() s;
  if completion_recognized is null or completion_passed is null then
    raise exception 'Treasure Vault terminal helper returned an invalid status';
  end if;
  if completion_recognized then
    if completion_passed is not true then raise exception 'Treasure Vault catalog/display successor is partial or unreviewed';end if;
    return;
  end if;
  execute $historical_original_dual$-- Beast Staff tiers: canonical references and the existing conditional circumstance-bonus model.
-- Cursed Metamorphosis shares this batch so dependency checks recognize its exact repaired state.
do $repair$
declare
  spec constant jsonb := $beast$
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
  $beast$::jsonb;
  patch jsonb;
  dependency jsonb;
  property record;
  actual jsonb;
  replacement jsonb;
  repaired text;
  affected integer;
begin
  lock table public.content_update in share mode;
  -- Acquire every reviewed child before source locks or cache-trigger writes.
  perform id from public.ability_block where id in (19611,19908) order by id for share;
  perform id from public.item where id in (11744,11745) order by id for update;
  perform id from public.spell where id in (4396,4550,4601,4645,4685,4731,4759,4812,4847,6717) order by id for update;
  perform id from public.trait where id=1546 for share;
  perform id from public.content_source where id in (1,3,16,256) order by id for share;
  if (select count(*) from public.content_source s join jsonb_array_elements(spec->'sources') x on s.id=(x->>'id')::bigint
      where s.name=x->>'name' and s.user_id is null and s.is_published is true) <> 4 then
    raise exception 'Beast Staff official source identity/publication changed';
  end if;
  -- ref_id is authoritative even for UPDATE/DELETE submissions with empty data.
  if exists (select 1 from public.content_update u where u.status->>'state' = 'PENDING' and (
      (u.type = 'item' and u.ref_id in (11744,11745))
      or (u.type = 'spell' and u.ref_id in (4396,4550,4601,4645,4685,4731,4759,4812,4847,6717))
      or (u.type = 'ability-block' and u.ref_id in (19611,19908))
      or (u.type = 'trait' and u.ref_id = 1546)
      or (u.type = 'content-source' and u.ref_id in (1,3,16,256))
    )) then
    raise exception 'Beast Staff repair has a pending owner/dependency/source submission';
  end if;
  for dependency in select value from jsonb_array_elements(spec->'dependencies') loop
    actual := null;
    case dependency->>'table'
      when 'spell' then select to_jsonb(s) into actual from public.spell s where s.id=(dependency->>'id')::bigint;
      when 'ability_block' then select to_jsonb(a) into actual from public.ability_block a where a.id=(dependency->>'id')::bigint;
      when 'trait' then select to_jsonb(t) into actual from public.trait t where t.id=(dependency->>'id')::bigint;
      else raise exception 'Unexpected Beast Staff dependency table';
    end case;
    if actual is null or actual #> '{meta_data,source}' is distinct from nullif(dependency->'citation','null'::jsonb)
        or md5(actual->>'description') is distinct from dependency->>'description_md5' then
      raise exception 'Beast Staff dependency % identity/citation/content changed', dependency->>'id';
    end if;
    for property in select key,value from jsonb_each(dependency->'expected') loop
      if (dependency->>'id')::bigint=4550 and property.key in ('traditions','defense') then continue; end if;
      -- Database UUIDs are bigint; sanitized JSON fixtures can serialize them as strings.
      if (case when property.key='uuid' then (actual->>property.key)::bigint is distinct from (property.value #>> '{}')::bigint
          else actual->property.key is distinct from property.value end) then
        raise exception 'Beast Staff dependency % field % changed', dependency->>'id', property.key;
      end if;
    end loop;
    if (dependency->>'id')::bigint=4550 and
        jsonb_build_object('traditions',actual->'traditions','defense',actual->'defense') is distinct from spec #> '{spell,before}' and
        jsonb_build_object('traditions',actual->'traditions','defense',actual->'defense') is distinct from spec #> '{spell,after}' then
      raise exception 'Cursed Metamorphosis traditions/defense differs from reviewed pair';
    end if;
  end loop;

  -- Validate the whole batch before changing any leaf. A reviewed owner pair is atomic.
  for patch in select value from jsonb_array_elements(spec->'items') loop
    select to_jsonb(i) into actual from public.item i where i.id=(patch->>'id')::bigint;
    if actual is null then raise exception 'Missing Beast Staff %', patch->>'id'; end if;
    for property in select key,value from jsonb_each(patch->'expected') loop
      if actual->property.key is distinct from property.value then
        raise exception 'Beast Staff % field % changed', patch->>'id',property.key;
      end if;
    end loop;
    for property in select key,value from jsonb_each(patch->'metadata') loop
      if actual #> array['meta_data',property.key] is distinct from property.value then
        raise exception 'Beast Staff % metadata % changed', patch->>'id',property.key;
      end if;
    end loop;
    if not (
      (actual->>'description' is not distinct from patch #>> '{description,before}' and actual->'operations' is not distinct from patch #> '{operations,before}')
      or (actual->>'description' is not distinct from patch #>> '{description,after}' and actual->'operations' is not distinct from patch #> '{operations,after}')
    ) then raise exception 'Beast Staff % description/operations differs from reviewed pair',patch->>'id'; end if;
    repaired := patch #>> '{description,before}';
    if md5(repaired) is distinct from patch #>> '{description,before_md5}' then raise exception 'Invalid Beast Staff before hash'; end if;
    for replacement in select value from jsonb_array_elements(patch #> '{description,replacements}') loop
      if (length(repaired)-length(replace(repaired,replacement->>'from','')))/length(replacement->>'from') <> (replacement->>'count')::integer then
        raise exception 'Beast Staff % reference occurrence count changed',patch->>'id';
      end if;
      repaired := replace(repaired,replacement->>'from',replacement->>'to');
    end loop;
    if repaired is distinct from patch #>> '{description,after}' or md5(repaired) is distinct from patch #>> '{description,after_md5}' then raise exception 'Invalid Beast Staff after text/hash'; end if;
  end loop;

  update public.spell
    set traditions = array(select jsonb_array_elements_text(spec #> '{spell,after,traditions}')),
        defense = spec #>> '{spell,after,defense}'
    where id=4550 and to_jsonb(traditions) is not distinct from spec #> '{spell,before,traditions}'
      and to_jsonb(defense) is not distinct from nullif(spec #> '{spell,before,defense}','null'::jsonb);
  get diagnostics affected = row_count;
  if affected > 1 or (affected=0 and not exists (
    select 1 from public.spell s where s.id=4550
      and to_jsonb(s.traditions) is not distinct from spec #> '{spell,after,traditions}'
      and s.defense is not distinct from spec #>> '{spell,after,defense}'
  )) then raise exception 'Cursed Metamorphosis leaf compare-and-set failed'; end if;
  for patch in select value from jsonb_array_elements(spec->'items') loop
    if exists (select 1 from public.item i where i.id=(patch->>'id')::bigint
        and i.description is not distinct from patch #>> '{description,after}'
        and to_jsonb(i.operations) is not distinct from patch #> '{operations,after}') then continue; end if;
    update public.item
      set description = patch #>> '{description,after}',
          operations = array(select value::json from jsonb_array_elements(patch #> '{operations,after}'))
      where id=(patch->>'id')::bigint and description is not distinct from patch #>> '{description,before}'
        and to_jsonb(operations) is not distinct from nullif(patch #> '{operations,before}','null'::jsonb);
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Beast Staff % leaf compare-and-set failed',patch->>'id'; end if;
  end loop;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
