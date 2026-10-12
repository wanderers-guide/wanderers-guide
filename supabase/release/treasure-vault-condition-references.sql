-- Preserve original check IDs and predicates; use the pinned shared terminal check.
with terminal_function as materialized(select (exists(select 1 from pg_catalog.pg_proc p
  where p.oid=pg_catalog.to_regprocedure('public.treasure_vault_terminal_status_v1()')
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((p.prosrc)::text,'UTF8')),'hex')='fbdf75894b97980ba3382a2a74ee2dd8f28929a129b21ca423942e0aeba544b2'
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
    and pg_catalog.has_function_privilege('supabase_read_only_user',p.oid,'EXECUTE'))) as valid),
terminal_status as materialized(select case when f.valid is true then
  coalesce((select pg_catalog.to_jsonb(s) from public.treasure_vault_terminal_status_v1() s),'{"recognized":true,"passed":false}'::jsonb)
  else '{"recognized":true,"passed":false}'::jsonb end as value from terminal_function f),
original_checks as(
with prose_spec as (select $prose${
  "items": [
    {
      "id": 11901,
      "expected": {
        "id": 11901,
        "name": "Curare",
        "bulk": "0.1",
        "level": 8,
        "rarity": "COMMON",
        "group": "GENERAL",
        "hands": null,
        "size": "MEDIUM",
        "craft_requirements": null,
        "operations": null,
        "content_source_id": 16,
        "version": "1.0",
        "uuid": "5321157015758660",
        "price": {
          "gp": 100
        },
        "availability": null
      },
      "metadata": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "foundry": {
          "items": [],
          "rules": [],
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
        "important",
        "focus",
        "type",
        "ritual"
      ],
      "raw": {
        "traits": [
          1529,
          1531,
          1564,
          1476
        ],
        "usage": "held-in-two-hands",
        "description": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 1}, and \\[\\[Enfeebled\\]\\]{Enfeebled 1} (1 round)\n\n**Stage 2** 3d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 2}, \\[\\[Enfeebled\\]\\]{Enfeebled 2}, and \\[\\[Slowed\\]\\]{Slowed 1} (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is \\[\\[Paralyzed\\]\\] for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}.",
        "craft_requirements": null,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4532",
          "book": "Treasure Vault",
          "page": "68"
        }
      },
      "legacy_states": [
        {
          "traits": [
            1529,
            1531,
            1564,
            1476
          ],
          "description": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 1}, and \\[\\[Enfeebled\\]\\]{Enfeebled 1} (1 round)\n\n**Stage 2** 3d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 2}, \\[\\[Enfeebled\\]\\]{Enfeebled 2}, and \\[\\[Slowed\\]\\]{Slowed 1} (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is \\[\\[Paralyzed\\]\\] for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}.",
          "usage": "held-in-two-hands",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4532",
            "book": "Treasure Vault",
            "page": "68"
          }
        },
        {
          "traits": [
            1529,
            1531,
            1564,
            1476
          ],
          "description": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, clumsy 1, and enfeebled 1 (1 round)\n\n**Stage 2** 3d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is paralyzed for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}.",
          "usage": "held-in-two-hands",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4532",
            "book": "Treasure Vault",
            "page": "68"
          }
        },
        {
          "traits": [
            1529,
            1531,
            1564,
            1476,
            1481
          ],
          "description": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 1}, and \\[\\[Enfeebled\\]\\]{Enfeebled 1} (1 round)\n\n**Stage 2** 3d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 2}, \\[\\[Enfeebled\\]\\]{Enfeebled 2}, and \\[\\[Slowed\\]\\]{Slowed 1} (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is \\[\\[Paralyzed\\]\\] for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}.",
          "usage": "held-in-two-hands",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4532",
            "book": "Treasure Vault",
            "page": "68"
          }
        },
        {
          "traits": [
            1529,
            1531,
            1564,
            1476,
            1481
          ],
          "description": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, clumsy 1, and enfeebled 1 (1 round)\n\n**Stage 2** 3d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is paralyzed for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}.",
          "usage": "held-in-two-hands",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4532",
            "book": "Treasure Vault",
            "page": "68"
          }
        }
      ],
      "before_states": [
        {
          "traits": [
            1529,
            1531,
            1564,
            1476,
            1481
          ],
          "usage": "held-in-two-hands",
          "description": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 1}, and \\[\\[Enfeebled\\]\\]{Enfeebled 1} (1 round)\n\n**Stage 2** 3d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 2}, \\[\\[Enfeebled\\]\\]{Enfeebled 2}, and \\[\\[Slowed\\]\\]{Slowed 1} (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is \\[\\[Paralyzed\\]\\] for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}.",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4532",
            "book": "Treasure Vault",
            "page": "68"
          }
        },
        {
          "traits": [
            1529,
            1531,
            1564,
            1476,
            1481
          ],
          "usage": "held-in-two-hands",
          "description": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, clumsy 1, and enfeebled 1 (1 round)\n\n**Stage 2** 3d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is paralyzed for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}.",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4532",
            "book": "Treasure Vault",
            "page": "68"
          }
        }
      ],
      "after": {
        "traits": [
          1529,
          1531,
          1564,
          1476,
          1481
        ],
        "usage": "held-in-two-hands",
        "description": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([manipulate](link_trait_1433))\n\n* * *\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** DC 25 Fortitude\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 [poison](link_trait_1476) damage, clumsy 1, and enfeebled 1 (1 round)\n\n**Stage 2** 3d6 [poison](link_trait_1476) damage, clumsy 2, enfeebled 2, and slowed 1 (1 minute)\n\n**Stage 3** 4d6 [poison](link_trait_1476) damage, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at Stage 3, the poison ends and the victim is paralyzed for 2d6 minutes.",
        "craft_requirements": null,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=1999",
          "book": "Treasure Vault (Remastered)",
          "page": "68"
        }
      },
      "hashes": {
        "before": [
          "e30822a6889eea2b301562dbc7bb3a10",
          "6407e087a61e937e6c919f1b04c5fb7a"
        ],
        "after": "0130c87981a64623dc37736b773a7bdb"
      }
    },
    {
      "id": 12024,
      "expected": {
        "id": 12024,
        "name": "Freeze Ammunition",
        "bulk": "0",
        "level": 5,
        "rarity": "COMMON",
        "group": "GENERAL",
        "hands": null,
        "size": "MEDIUM",
        "craft_requirements": null,
        "operations": null,
        "content_source_id": 16,
        "version": "1.0",
        "uuid": "960541811768889",
        "price": {
          "gp": 28
        },
        "availability": null
      },
      "metadata": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "foundry": {
          "items": [],
          "rules": [],
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
        "important",
        "focus",
        "type",
        "ritual"
      ],
      "raw": {
        "traits": [
          1529,
          1531,
          1532
        ],
        "usage": "held-in-one-hand",
        "description": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall \\[\\[Prone\\]\\]. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly",
        "craft_requirements": null,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4431",
          "book": "Treasure Vault",
          "page": "42"
        }
      },
      "legacy_states": [
        {
          "traits": [
            1529,
            1531,
            1532
          ],
          "description": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall \\[\\[Prone\\]\\]. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly",
          "usage": "held-in-one-hand",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4431",
            "book": "Treasure Vault",
            "page": "42"
          }
        },
        {
          "traits": [
            1529,
            1531,
            1532
          ],
          "description": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall prone. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly",
          "usage": "held-in-one-hand",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4431",
            "book": "Treasure Vault",
            "page": "42"
          }
        },
        {
          "traits": [
            1529,
            1531,
            1532,
            1519
          ],
          "description": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall \\[\\[Prone\\]\\]. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly",
          "usage": "held-in-one-hand",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4431",
            "book": "Treasure Vault",
            "page": "42"
          }
        },
        {
          "traits": [
            1529,
            1531,
            1532,
            1519
          ],
          "description": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall prone. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly",
          "usage": "held-in-one-hand",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4431",
            "book": "Treasure Vault",
            "page": "42"
          }
        }
      ],
      "before_states": [
        {
          "traits": [
            1529,
            1531,
            1532,
            1519
          ],
          "usage": "held-in-one-hand",
          "description": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall \\[\\[Prone\\]\\]. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4431",
            "book": "Treasure Vault",
            "page": "42"
          }
        },
        {
          "traits": [
            1529,
            1531,
            1532,
            1519
          ],
          "usage": "held-in-one-hand",
          "description": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall prone. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4431",
            "book": "Treasure Vault",
            "page": "42"
          }
        }
      ],
      "after": {
        "traits": [
          1529,
          1531,
          1532,
          1519
        ],
        "usage": "",
        "description": "**Ammunition** any\n\n**Activate** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([manipulate](link_trait_1433))\n\n* * *\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes [cold](link_trait_1519) damage instead of the weapon's normal damage type, plus 2 [cold](link_trait_1519) [splash](link_trait_1532) damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 [cold](link_trait_1519) [splash](link_trait_1532) damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a DC 20 Reflex save or Acrobatics check or else fall prone. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to [Balance](link_action_19608). Creatures that [Step](link_action_19853) or [Crawl](link_action_19618) don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of [fire](link_trait_1542) damage to the ice removes it instantly",
        "craft_requirements": null,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=1898",
          "book": "Treasure Vault (Remastered)",
          "page": "42"
        }
      },
      "hashes": {
        "before": [
          "7400fa02f2d8aef6666df2560bf199db",
          "3b56442f13f70dc1eb5721ff87f90f7f"
        ],
        "after": "2499ec316ae7d669207e9340ee75e13c"
      }
    },
    {
      "id": 12507,
      "expected": {
        "id": 12507,
        "name": "Talespinner's Lyre",
        "bulk": "0.1",
        "level": 11,
        "rarity": "UNCOMMON",
        "group": "GENERAL",
        "hands": null,
        "size": "MEDIUM",
        "craft_requirements": null,
        "operations": null,
        "content_source_id": 16,
        "version": "1.0",
        "uuid": "1965816783971423",
        "price": {
          "gp": 235
        },
        "availability": null
      },
      "metadata": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "foundry": {
          "items": [],
          "rules": [],
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
        "important",
        "focus",
        "type",
        "ritual"
      ],
      "raw": {
        "traits": [
          1469,
          1531,
          1447,
          1504,
          1479
        ],
        "usage": "held-in-two-hands",
        "description": "**Activate** 2 envision, Interact\n\nPlucking a talespinner's lyre while focusing on an event you witnessed causes the instrument to create an illusion in a 50-foot emanation that plays out your memory of the event in real time, complete with sights, sounds, and smells. You can Sustain the Activation for up to 1 minute to keep it playing. The scene reproduces only what's in its area, including nothing beyond that even if present in the memory. The scene is realistic, but all observers can clearly tell it's an illusion. Observers can't interact with the scene directly nor can they taste or touch elements of it to get a sensation you didn't personally experience, but they can attempt skill checks to discern more about the scene without altering its contents. For example, no one could see something you didn't, such as the true form of a creature polymorphed into a squirrel, but an observer might be able to use Perception and \\[\\[Sense Motive\\]\\] to discern the squirrel was acting unlike a squirrel should. Once the magic is used, the lyre remains as a non-magical virtuoso instrument.",
        "craft_requirements": null,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4660",
          "book": "Treasure Vault",
          "page": "98"
        }
      },
      "legacy_states": [
        {
          "traits": [
            1469,
            1531,
            1447,
            1504,
            1479
          ],
          "description": "**Activate** 2 envision, Interact\n\nPlucking a talespinner's lyre while focusing on an event you witnessed causes the instrument to create an illusion in a 50-foot emanation that plays out your memory of the event in real time, complete with sights, sounds, and smells. You can Sustain the Activation for up to 1 minute to keep it playing. The scene reproduces only what's in its area, including nothing beyond that even if present in the memory. The scene is realistic, but all observers can clearly tell it's an illusion. Observers can't interact with the scene directly nor can they taste or touch elements of it to get a sensation you didn't personally experience, but they can attempt skill checks to discern more about the scene without altering its contents. For example, no one could see something you didn't, such as the true form of a creature polymorphed into a squirrel, but an observer might be able to use Perception and \\[\\[Sense Motive\\]\\] to discern the squirrel was acting unlike a squirrel should. Once the magic is used, the lyre remains as a non-magical virtuoso instrument.",
          "usage": "held-in-two-hands",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4660",
            "book": "Treasure Vault",
            "page": "98"
          }
        },
        {
          "traits": [
            1469,
            1531,
            1447,
            1504,
            1479,
            2131
          ],
          "description": "**Activate** 2 envision, Interact\n\nPlucking a talespinner's lyre while focusing on an event you witnessed causes the instrument to create an illusion in a 50-foot emanation that plays out your memory of the event in real time, complete with sights, sounds, and smells. You can Sustain the Activation for up to 1 minute to keep it playing. The scene reproduces only what's in its area, including nothing beyond that even if present in the memory. The scene is realistic, but all observers can clearly tell it's an illusion. Observers can't interact with the scene directly nor can they taste or touch elements of it to get a sensation you didn't personally experience, but they can attempt skill checks to discern more about the scene without altering its contents. For example, no one could see something you didn't, such as the true form of a creature polymorphed into a squirrel, but an observer might be able to use Perception and \\[\\[Sense Motive\\]\\] to discern the squirrel was acting unlike a squirrel should. Once the magic is used, the lyre remains as a non-magical virtuoso instrument.",
          "usage": "held-in-two-hands",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4660",
            "book": "Treasure Vault",
            "page": "98"
          }
        }
      ],
      "before_states": [
        {
          "traits": [
            1469,
            1531,
            1447,
            1504,
            1479,
            2131
          ],
          "usage": "held-in-two-hands",
          "description": "**Activate** 2 envision, Interact\n\nPlucking a talespinner's lyre while focusing on an event you witnessed causes the instrument to create an illusion in a 50-foot emanation that plays out your memory of the event in real time, complete with sights, sounds, and smells. You can Sustain the Activation for up to 1 minute to keep it playing. The scene reproduces only what's in its area, including nothing beyond that even if present in the memory. The scene is realistic, but all observers can clearly tell it's an illusion. Observers can't interact with the scene directly nor can they taste or touch elements of it to get a sensation you didn't personally experience, but they can attempt skill checks to discern more about the scene without altering its contents. For example, no one could see something you didn't, such as the true form of a creature polymorphed into a squirrel, but an observer might be able to use Perception and \\[\\[Sense Motive\\]\\] to discern the squirrel was acting unlike a squirrel should. Once the magic is used, the lyre remains as a non-magical virtuoso instrument.",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4660",
            "book": "Treasure Vault",
            "page": "98"
          }
        }
      ],
      "after": {
        "traits": [
          1469,
          1531,
          1504,
          1479,
          2131
        ],
        "usage": "held-in-two-hands",
        "description": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([concentrate](link_trait_1432), [manipulate](link_trait_1433))\n\n* * *\n\nPlucking a talespinner's lyre while focusing on an event you witnessed causes the instrument to create an illusion in a 50-foot emanation that plays out your memory of the event in real time, complete with sights, sounds, and smells. You can [Sustain the Activation](link_action_19858) for up to 1 minute to keep it playing. The scene reproduces only what's in its area, including nothing beyond that even if present in the memory. The scene is realistic, but all observers can clearly tell it's an illusion. Observers can't interact with the scene directly nor can they taste or touch elements of it to get a sensation you didn't personally experience, but they can attempt skill checks to discern more about the scene without altering its contents. For example, no one could see something you didn't, such as the true form of a creature polymorphed into a squirrel, but an observer might be able to use Perception and [Sense Motive](link_action_19847) to discern the squirrel was acting unlike a squirrel should. Once the magic is used, the lyre remains as a non-magical [virtuoso instrument](link_item_7604).",
        "craft_requirements": null,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2127",
          "book": "Treasure Vault (Remastered)",
          "page": "98"
        }
      },
      "hashes": {
        "before": [
          "75ea940b7fa3b1b314b4e4b3a764610b"
        ],
        "after": "3e7ea74f66f0d523917501e13e13768c"
      }
    },
    {
      "id": 12709,
      "expected": {
        "id": 12709,
        "name": "Warpwobble Poison",
        "bulk": "0.1",
        "level": 8,
        "rarity": "COMMON",
        "group": "GENERAL",
        "hands": null,
        "size": "MEDIUM",
        "craft_requirements": null,
        "operations": null,
        "content_source_id": 16,
        "version": "1.0",
        "uuid": "1246852420845927",
        "price": {
          "gp": 90
        },
        "availability": null
      },
      "metadata": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "foundry": {
          "items": [],
          "rules": [],
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
        "important",
        "focus",
        "type",
        "ritual"
      ],
      "raw": {
        "traits": [
          1529,
          1531,
          1476
        ],
        "usage": "held-in-two-hands",
        "description": "**Activate** 2 Interact\n\nWarpwobble poison causes hallucinations of space bending and stretching, leading to vertigo and an inability to discern a stable place to move.\n\n**Saving Throw** Will 26\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** treat all squares as difficult terrain (1 round)\n\n**Stage 2** treat all squares as greater difficult terrain (1 round)\n\n**Stage 3** treat all squares as uneven ground (DC 26), treating a critical success to \\[\\[Balance\\]\\] as a success, and a success as a success but moving on greater difficult terrain (1 round)",
        "craft_requirements": null,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4553",
          "book": "Treasure Vault",
          "page": "71"
        }
      },
      "legacy_states": [
        {
          "traits": [
            1529,
            1531,
            1476
          ],
          "description": "**Activate** 2 Interact\n\nWarpwobble poison causes hallucinations of space bending and stretching, leading to vertigo and an inability to discern a stable place to move.\n\n**Saving Throw** Will 26\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** treat all squares as difficult terrain (1 round)\n\n**Stage 2** treat all squares as greater difficult terrain (1 round)\n\n**Stage 3** treat all squares as uneven ground (DC 26), treating a critical success to \\[\\[Balance\\]\\] as a success, and a success as a success but moving on greater difficult terrain (1 round)",
          "usage": "held-in-two-hands",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4553",
            "book": "Treasure Vault",
            "page": "71"
          }
        },
        {
          "traits": [
            1529,
            1531,
            1476,
            1564,
            1448
          ],
          "description": "**Activate** 2 Interact\n\nWarpwobble poison causes hallucinations of space bending and stretching, leading to vertigo and an inability to discern a stable place to move.\n\n**Saving Throw** Will 26\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** treat all squares as difficult terrain (1 round)\n\n**Stage 2** treat all squares as greater difficult terrain (1 round)\n\n**Stage 3** treat all squares as uneven ground (DC 26), treating a critical success to \\[\\[Balance\\]\\] as a success, and a success as a success but moving on greater difficult terrain (1 round)",
          "usage": "held-in-two-hands",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4553",
            "book": "Treasure Vault",
            "page": "71"
          }
        }
      ],
      "before_states": [
        {
          "traits": [
            1529,
            1531,
            1476,
            1564,
            1448
          ],
          "usage": "held-in-two-hands",
          "description": "**Activate** 2 Interact\n\nWarpwobble poison causes hallucinations of space bending and stretching, leading to vertigo and an inability to discern a stable place to move.\n\n**Saving Throw** Will 26\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** treat all squares as difficult terrain (1 round)\n\n**Stage 2** treat all squares as greater difficult terrain (1 round)\n\n**Stage 3** treat all squares as uneven ground (DC 26), treating a critical success to \\[\\[Balance\\]\\] as a success, and a success as a success but moving on greater difficult terrain (1 round)",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4553",
            "book": "Treasure Vault",
            "page": "71"
          }
        }
      ],
      "after": {
        "traits": [
          1529,
          1531,
          1476,
          1564,
          1448
        ],
        "usage": "held-in-two-hands",
        "description": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([manipulate](link_trait_1433))\n\n* * *\n\nWarpwobble poison causes hallucinations of space bending and stretching, leading to vertigo and an inability to discern a stable place to move.\n\n**Saving Throw** DC 26 Will\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** treat all squares as difficult terrain (1 round)\n\n**Stage 2** treat all squares as greater difficult terrain (1 round)\n\n**Stage 3** treat all squares as uneven ground (DC 26), treating a critical success to [Balance](link_action_19608) as a success, and a success as a success but moving on greater difficult terrain (1 round)",
        "craft_requirements": null,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2020",
          "book": "Treasure Vault (Remastered)",
          "page": "71"
        }
      },
      "hashes": {
        "before": [
          "912aa4024dca53ddc86a07aa84e466b1"
        ],
        "after": "e807c976027c3127991883e79e1634f4"
      }
    }
  ],
  "dependencies": [
    {
      "table": "ability_block",
      "type": "ability-block",
      "id": 19608,
      "expected": {
        "id": 19608,
        "operations": null,
        "name": "Balance",
        "actions": "ONE-ACTION",
        "level": null,
        "rarity": "COMMON",
        "prerequisites": null,
        "frequency": null,
        "cost": null,
        "trigger": null,
        "requirements": "You are in a square that contains a narrow surface, uneven ground, or another similar feature.",
        "access": null,
        "description": "You move across a narrow surface or uneven ground, attempting an Acrobatics check against its Balance DC. You are Off-Guard while on a narrow surface or uneven ground.\n\n**Critical Success** You move up to your Speed.\n\n**Success** You move up to your Speed, treating it as difficult terrain (every 5 feet costs 10 feet of movement).\n\n**Failure** You must remain stationary to keep your balance (wasting the action) or you fall. If you fall, your turn ends.\n\n**Critical Failure** You fall and your turn ends.\n\nSample Balance Tasks\n--------------------\n\n*   **Untrained** tangled roots, uneven cobblestones\n*   **Trained** wooden beam\n*   **Expert** deep, loose gravel\n*   **Master** tightrope, smooth sheet of ice\n*   **Legendary** razor's edge, chunks of floor falling in midair",
        "special": null,
        "type": "action",
        "traits": [
          1505,
          1438
        ],
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "7614015615752326",
        "availability": null
      },
      "metadata": {
        "skill": "ACROBATICS",
        "source": {
          "url": "https://2e.aonprd.com/Actions.aspx?ID=2369",
          "book": "Player Core",
          "page": "233"
        },
        "foundry": {
          "rules": []
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "ability_block",
      "type": "ability-block",
      "id": 19618,
      "expected": {
        "id": 19618,
        "operations": null,
        "name": "Crawl",
        "actions": "ONE-ACTION",
        "level": null,
        "rarity": "COMMON",
        "prerequisites": null,
        "frequency": null,
        "cost": null,
        "trigger": null,
        "requirements": "You are prone and your Speed is at least 10 feet.",
        "access": null,
        "description": "You move 5 feet by crawling and continue to stay Prone.",
        "special": null,
        "type": "action",
        "traits": [
          1505
        ],
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "5129533339137004",
        "availability": null
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Actions.aspx?ID=2293",
          "book": "Player Core",
          "page": "416"
        },
        "foundry": {
          "rules": []
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "ability_block",
      "type": "ability-block",
      "id": 19847,
      "expected": {
        "id": 19847,
        "operations": null,
        "name": "Sense Motive",
        "actions": "ONE-ACTION",
        "level": null,
        "rarity": "COMMON",
        "prerequisites": null,
        "frequency": null,
        "cost": null,
        "trigger": null,
        "requirements": null,
        "access": null,
        "description": "You try to tell whether a creature's behavior is abnormal. Choose one creature and assess it for odd body language, signs of nervousness, and other indicators that it might be trying to deceive someone. The GM attempts a single secret Perception check for you and compares the result to the Deception DC of the creature, the DC of a spell affecting the creature's mental state, or another appropriate DC determined by the GM. You typically can't try to Sense the Motive of the same creature again until the situation changes significantly.\n\n**Critical Success** You determine the creature's true intentions and get a solid idea of any mental magic affecting it.\n\n**Success** You can tell whether the creature is behaving normally, but you don't know its exact intentions or what magic might be affecting it.\n\n**Failure** You detect what a deceptive creature wants you to believe. If they're not being deceptive, you believe they're behaving normally.\n\n**Critical Failure** You get a false sense of the creature's intentions.",
        "special": null,
        "type": "action",
        "traits": [
          1432,
          1437,
          1463
        ],
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "6909398769181112",
        "availability": null
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Actions.aspx?ID=2302",
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
        "important",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "ability_block",
      "type": "ability-block",
      "id": 19853,
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
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "ability_block",
      "type": "ability-block",
      "id": 19858,
      "expected": {
        "id": 19858,
        "operations": null,
        "name": "Sustain",
        "actions": "ONE-ACTION",
        "level": null,
        "rarity": "COMMON",
        "prerequisites": null,
        "frequency": null,
        "cost": null,
        "trigger": null,
        "requirements": null,
        "access": null,
        "description": "Choose one of your effects that has a sustained duration or lists a special benefit when you Sustain it. Most such effects come from spells or magic item activations. If the effect has a sustained duration, its duration extends until the end of your next turn. (Sustaining more than once in the same turn doesn't extend the duration to subsequent turns.) If an ability can be sustained but doesn't list how long, it can be sustained up to 10 minutes.\n\nAn effect might list an additional benefit that occurs if you Sustain it, and this can even appear on effects that don't have a sustained duration. If the effect has both a special benefit and a sustained duration, your Sustain action extends the duration as well as having the special benefit.\n\nIf your Sustain action is disrupted, the ability ends.",
        "special": null,
        "type": "action",
        "traits": [
          1432
        ],
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "7845751305633010",
        "availability": null
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Actions.aspx?ID=2317",
          "book": "Player Core",
          "page": "419"
        },
        "foundry": {
          "rules": []
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "ability_block",
      "type": "ability-block",
      "id": 19733,
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
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1432,
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
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1476,
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
        "important",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1519,
      "expected": {
        "id": 1519,
        "name": "Cold",
        "description": "Effects with this trait deal cold damage. Creatures with this trait have a connection to [magical](link_trait_1504) cold.",
        "content_source_id": 3,
        "uuid": "196418167509"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=555",
          "book": "Player Core",
          "page": "454"
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
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1504,
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
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 2131,
      "expected": {
        "id": 2131,
        "name": "Olfactory",
        "description": "An olfactory effect can affect only creatures that can smell it. This applies only to olfactory parts of the effect, as determined by the GM.",
        "content_source_id": 3,
        "uuid": "6785598362016579"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=664",
          "book": "Player Core",
          "page": "459"
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1479,
      "expected": {
        "id": 1479,
        "name": "Visual",
        "description": "A visual effect can affect only creatures that can see it. This applies only to visible parts of the effect, as determined by the GM.",
        "content_source_id": 3,
        "uuid": "4675954693812974"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=727",
          "book": "Player Core",
          "page": "463"
        },
        "important": true
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1447,
      "expected": {
        "id": 1447,
        "name": "Illusion",
        "description": "Effects and magic items with this trait involve false sensory stimuli.",
        "content_source_id": 3,
        "uuid": "4088330681988942"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=629",
          "book": "Player Core",
          "page": "457"
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
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1433,
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
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1564,
      "expected": {
        "id": 1564,
        "name": "Injury",
        "description": "An injury [poison](link_trait_1476) is activated by applying it to a weapon, and it affects the target of the first [Strike](link_action_19856) made using the poisoned weapon. If that [Strike](link_action_19856) is a success and deals piercing or slashing damage, the target must attempt a saving throw against the poison. On a failed [Strike](link_action_19856), the target is unaffected, but the poison remains on the weapon and you can try again. On a critical failure, or if the [Strike](link_action_19856) fails to deal slashing or piercing damage for some other reason, the poison is spent but the target is unaffected.",
        "content_source_id": 3,
        "uuid": "7440020828746294"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=635",
          "book": "GM Core",
          "page": "248"
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
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1469,
      "expected": {
        "id": 1469,
        "name": "Auditory",
        "description": "Auditory actions and effects rely on sound. An action with the auditory trait can be successfully performed only if the creature using the action can speak or otherwise produce the required sounds. A spell or effect with the auditory trait has its effect only if the target can hear it. This applies only to sound-based parts of the effect, as determined by the GM. This is different from a [sonic](link_trait_1484) effect, which still affects targets who can’t hear it (such as deaf targets) as long as the effect itself makes sound.",
        "content_source_id": 3,
        "uuid": "6475190443898764"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=541",
          "book": "Player Core",
          "page": "453"
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
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1529,
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
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1531,
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
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1481,
      "expected": {
        "id": 1481,
        "name": "Incapacitation",
        "description": "An ability with this trait can take a character completely out of the fight or even kill them, and it’s harder to use on a more powerful character. If a spell has the incapacitation trait, any creature of more than twice the spell’s level treats the result of their check to prevent being incapacitated by the spell as one degree of success better, or the result of any check the spellcaster made to incapacitate them as one degree of success worse. If any other effect has the incapacitation trait, a creature of higher level than the item, creature, or hazard generating the effect gains the same benefits.",
        "content_source_id": 3,
        "uuid": "1508160825751788"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=631",
          "book": "Player Core",
          "page": "457"
        },
        "important": true
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1532,
      "expected": {
        "id": 1532,
        "name": "Splash",
        "description": "Some weapons and effects, such as [alchemical](link_trait_1529) [bombs](link_trait_1530), have the splash trait. You don’t add your Strength modifier to the damage roll for any thrown weapon with the splash trait (even if the item doesn’t have the [bomb](link_trait_1530) trait). A splash weapon or effect deals any listed splash damage to the target on a failure, success, or critical success, and to all other creatures within 5 feet of the target on a success or critical success. On a critical failure, the weapon or effect misses entirely, dealing no damage. Add splash damage together with the initial damage against the target before applying the target’s resistance or weakness. You don’t multiply splash damage on a critical hit.",
        "content_source_id": 3,
        "uuid": "5053816479032278"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=699",
          "book": "GM Core",
          "page": "244"
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
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1448,
      "expected": {
        "id": 1448,
        "name": "Mental",
        "description": "A mental effect can alter the target’s mind. It has no effect on an object or a [mindless](link_trait_2411) creature.",
        "content_source_id": 3,
        "uuid": "3793398752936386"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=647",
          "book": "Player Core",
          "page": "458"
        },
        "important": true,
        "class_trait": false,
        "unselectable": false,
        "ancestry_trait": false,
        "creature_trait": true,
        "archetype_trait": false,
        "versatile_heritage_trait": false
      },
      "metadata_absent": [
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1542,
      "expected": {
        "id": 1542,
        "name": "Fire",
        "description": "Effects with the fire trait deal fire damage or either conjure or manipulate fire. Those that manipulate fire have no effect in an area without fire. Creatures with this trait consist primarily of fire or have a [magical](link_trait_1504) connection to that element. Planes with this trait are composed of flames that continually burn with no fuel source. Fire planes are extremely hostile to non-fire creatures.",
        "content_source_id": 3,
        "uuid": "3316639745394270"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=604",
          "book": "Player Core",
          "page": "456"
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
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "item",
      "type": "item",
      "id": 7604,
      "expected": {
        "id": 7604,
        "name": "Musical Instrument (Virtuoso Handheld)",
        "bulk": "1",
        "level": 3,
        "rarity": "COMMON",
        "description": "Handheld instruments include bagpipes, a small set of chimes, small drums, fiddles and viols, flutes and recorders, small harps, lutes, trumpets, and similarly sized instruments. The GM might rule that an especially large handheld instrument (like a tuba) has greater Bulk. [Heavy instruments](link_item_7603) such as large drums, a full set of chimes, and keyboard instruments are less portable and generally need to be stationary while being played.\n\nA virtuoso instrument is more finely made and gives a +1 item bonus to Performance checks using that instrument.",
        "group": "GENERAL",
        "hands": "2",
        "size": "MEDIUM",
        "craft_requirements": null,
        "usage": "held in 2 hands",
        "operations": [
          {
            "id": "1b9f63c4-4123-47f4-a871-6690f0d1a1a0",
            "type": "addBonusToValue",
            "data": {
              "variable": "SKILL_PERFORMANCE",
              "value": 1,
              "type": "item",
              "text": "while playing the virtuoso instrument."
            }
          }
        ],
        "content_source_id": 1,
        "version": "1.0",
        "uuid": "8612506017744150",
        "price": {
          "gp": 50
        },
        "traits": [],
        "availability": null
      },
      "metadata": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": {
          "die": "",
          "dice": "",
          "extra": "",
          "damageType": ""
        },
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2737",
          "book": "Player Core",
          "page": "290"
        },
        "charges": {},
        "foundry": {
          "items": [],
          "rules": [
            {
              "key": "FlatModifier",
              "type": "item",
              "label": "Virtuoso Instrument (playing it)",
              "value": 1,
              "selector": "performance",
              "predicate": [
                "playing"
              ]
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
        "image_url": "",
        "is_shoddy": false,
        "starfinder": {},
        "unselectable": false,
        "broken_threshold": 0
      },
      "metadata_absent": [
        "deprecated",
        "important",
        "focus",
        "type",
        "ritual"
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
      "id": 16,
      "name": "Treasure Vault",
      "foundry_id": "Pathfinder Treasure Vault",
      "url": "https://paizo.com/products/btq02eav?Pathfinder-Treasure-Vault",
      "description": "Pathfinder Treasure Vault reveals the glittering hoard of a terrifying dragon, as presented by the creature’s plucky kobold assistant. This 224-page hardcover rulebook presents a catalog of new gear from nearly every category of equipment and magic item available in the Pathfinder RPG while also introducing entirely new categories of items as well. Give your character the perfect tool for the job with signature weapons, customizable relics, and wondrous items to fit your every need while preparing for any eventuality with potions, elixirs, wands, and more!",
      "operations": null,
      "user_id": null,
      "contact_info": null,
      "require_key": false,
      "is_published": true,
      "required_content_sources": [
        1
      ],
      "group": "pathfinder-core",
      "artwork_url": null,
      "keys": null,
      "deprecated": null
    }
  ]
}$prose$::jsonb as value),
prose_owners as (select p as prose_patch from prose_spec,jsonb_array_elements(value->'items') p),
prose_dependencies as (select d as prose_dependency from prose_spec,jsonb_array_elements(value->'dependencies') d),
prose_sources as (select s as prose_source from prose_spec,jsonb_array_elements(value->'sources') s),
prose_dependency_rows as (select prose_dependency,case prose_dependency->>'table'
  when 'trait' then (select to_jsonb(t)||jsonb_build_object('uuid',t.uuid::text) from public.trait t where t.id=(prose_dependency->>'id')::bigint)
  when 'ability_block' then (select to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text) from public.ability_block a where a.id=(prose_dependency->>'id')::bigint)
  when 'item' then (select to_jsonb(i)||jsonb_build_object('uuid',i.uuid::text) from public.item i where i.id=(prose_dependency->>'id')::bigint)
  else null end as row from prose_dependencies),
prose_complete as (select prose_patch->>'id' as id from prose_owners join public.item i on i.id=(prose_patch->>'id')::bigint where (jsonb_typeof(i.meta_data) is not distinct from 'object'
      and not exists(select 1 from jsonb_each(prose_patch->'expected') e where (to_jsonb(i)||jsonb_build_object('uuid',i.uuid::text))->e.key is distinct from e.value)
      and not exists(select 1 from jsonb_each(prose_patch->'metadata') e where i.meta_data->e.key is distinct from e.value)
      and not exists(select 1 from jsonb_array_elements_text(prose_patch->'metadata_absent') k(key) where i.meta_data?k.key)
      and jsonb_build_object('traits',i.traits,'usage',i.usage,'description',i.description,'craft_requirements',i.craft_requirements,'source',i.meta_data->'source')=prose_patch->'after')),
prose_legacy_complete as (select prose_patch->>'id' as id from prose_owners join public.item i on i.id=(prose_patch->>'id')::bigint where (jsonb_typeof(i.meta_data) is not distinct from 'object'
      and not exists(select 1 from jsonb_each(prose_patch->'expected') e where (to_jsonb(i)||jsonb_build_object('uuid',i.uuid::text))->e.key is distinct from e.value)
      and not exists(select 1 from jsonb_each(prose_patch->'metadata') e where i.meta_data->e.key is distinct from e.value)
      and not exists(select 1 from jsonb_array_elements_text(prose_patch->'metadata_absent') k(key) where i.meta_data?k.key)
      and jsonb_build_object('traits',i.traits,'usage',i.usage,'description',i.description,'craft_requirements',i.craft_requirements,'source',i.meta_data->'source')in (select value from jsonb_array_elements(prose_patch->'legacy_states')))),
noisome as (select value as successor from jsonb_array_elements($noisome$[
  {
    "id": 12658,
    "rank": 2,
    "expected": {
      "id": 12658,
      "name": "Wand of Noisome Acid (2nd-Level Spell)",
      "uuid": "8183994509694895",
      "content_source_id": 16,
      "level": 6,
      "price": {
        "gp": 250
      },
      "bulk": "0.1",
      "usage": "held-in-one-hand",
      "group": "GENERAL",
      "rarity": "UNCOMMON",
      "size": "MEDIUM",
      "hands": null,
      "traits": [
        1528,
        1504,
        1665
      ],
      "availability": null,
      "operations": null,
      "version": "1.0"
    },
    "metadata_absent": [
      "deprecated",
      "unselectable",
      "focus",
      "type",
      "ritual"
    ],
    "raw": {
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 2nd rank. A creature that takes initial acid damage from this spell become \\[\\[Sickened\\]\\]{Sickened 1}. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
      "craft_requirements": "Supply a casting of Acid Arrow at 2nd level",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
        "book": "Treasure Vault",
        "page": "141"
      }
    },
    "before": {
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 2nd rank. A creature that takes initial acid damage from this spell become sickened 1. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
      "craft_requirements": "Supply a casting of Acid Arrow at 2nd level",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
        "book": "Treasure Vault",
        "page": "141"
      }
    },
    "after": {
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 2nd-rank *[acid grip](link_spell_4389)*. A creature that takes initial [acid](link_trait_1528) damage from this spell become sickened 1. Use your spell DC if the creature attempts to recover from this sickness. This is an [olfactory](link_trait_2131) effect.",
      "craft_requirements": "Supply a casting of *[acid grip](link_spell_4389)* of the appropriate rank.",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2284",
        "book": "Treasure Vault (Remastered)",
        "page": "141"
      }
    },
    "hashes": {
      "description": {
        "raw": "d3c12d3dacc877275d6bf6c0e4b9949d",
        "before": "86bc95d48109bb1832c7f73672465553",
        "after": "94f3ac70dad23d4ec65d7ae65f47764a"
      },
      "craft_requirements": {
        "raw": "e96e30c364af6926b851c4694ead2da4",
        "before": "e96e30c364af6926b851c4694ead2da4",
        "after": "ac1308c588ba266aa09b4ef3f6c8dc22"
      }
    }
  },
  {
    "id": 12659,
    "rank": 4,
    "expected": {
      "id": 12659,
      "name": "Wand of Noisome Acid (4th-Level Spell)",
      "uuid": "7611411327409832",
      "content_source_id": 16,
      "level": 10,
      "price": {
        "gp": 1000
      },
      "bulk": "0.1",
      "usage": "held-in-one-hand",
      "group": "GENERAL",
      "rarity": "UNCOMMON",
      "size": "MEDIUM",
      "hands": null,
      "traits": [
        1528,
        1504,
        1665
      ],
      "availability": null,
      "operations": null,
      "version": "1.0"
    },
    "metadata_absent": [
      "deprecated",
      "unselectable",
      "focus",
      "type",
      "ritual"
    ],
    "raw": {
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 4th rank.A creature that takes initial acid damage from this spell become \\[\\[Sickened\\]\\]{Sickened 1}. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
      "craft_requirements": "Supply a casting of Acid Arrow at 4th rank.",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
        "book": "Treasure Vault",
        "page": "141"
      }
    },
    "before": {
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 4th rank.A creature that takes initial acid damage from this spell become sickened 1. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
      "craft_requirements": "Supply a casting of Acid Arrow at 4th rank.",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
        "book": "Treasure Vault",
        "page": "141"
      }
    },
    "after": {
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 4th-rank *[acid grip](link_spell_4389)*. A creature that takes initial [acid](link_trait_1528) damage from this spell become sickened 1. Use your spell DC if the creature attempts to recover from this sickness. This is an [olfactory](link_trait_2131) effect.",
      "craft_requirements": "Supply a casting of *[acid grip](link_spell_4389)* of the appropriate rank.",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2284",
        "book": "Treasure Vault (Remastered)",
        "page": "141"
      }
    },
    "hashes": {
      "description": {
        "raw": "2e81ce88d96bae4f45fc2b1bde9c3055",
        "before": "5fa726a9ae0630c282adb21fb7cd94cf",
        "after": "1f256d29afabfb68e3d56ed478c5c61d"
      },
      "craft_requirements": {
        "raw": "2d7cb96abe09ffe43144a8d4f159f25d",
        "before": "2d7cb96abe09ffe43144a8d4f159f25d",
        "after": "ac1308c588ba266aa09b4ef3f6c8dc22"
      }
    }
  },
  {
    "id": 12660,
    "rank": 6,
    "expected": {
      "id": 12660,
      "name": "Wand of Noisome Acid (6th-Level Spell)",
      "uuid": "2253459097543392",
      "content_source_id": 16,
      "level": 14,
      "price": {
        "gp": 4500
      },
      "bulk": "0.1",
      "usage": "held-in-one-hand",
      "group": "GENERAL",
      "rarity": "UNCOMMON",
      "size": "MEDIUM",
      "hands": null,
      "traits": [
        1528,
        1504,
        1665
      ],
      "availability": null,
      "operations": null,
      "version": "1.0"
    },
    "metadata_absent": [
      "deprecated",
      "unselectable",
      "focus",
      "type",
      "ritual"
    ],
    "raw": {
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 6th rank. A creature that takes initial acid damage from this spell become \\[\\[Sickened\\]\\]{Sickened 1}. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
      "craft_requirements": "Supply a casting of Acid Arrow at 6th rank.",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
        "book": "Treasure Vault",
        "page": "141"
      }
    },
    "before": {
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 6th rank. A creature that takes initial acid damage from this spell become sickened 1. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
      "craft_requirements": "Supply a casting of Acid Arrow at 6th rank.",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
        "book": "Treasure Vault",
        "page": "141"
      }
    },
    "after": {
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 6th-rank *[acid grip](link_spell_4389)*. A creature that takes initial [acid](link_trait_1528) damage from this spell become sickened 1. Use your spell DC if the creature attempts to recover from this sickness. This is an [olfactory](link_trait_2131) effect.",
      "craft_requirements": "Supply a casting of *[acid grip](link_spell_4389)* of the appropriate rank.",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2284",
        "book": "Treasure Vault (Remastered)",
        "page": "141"
      }
    },
    "hashes": {
      "description": {
        "raw": "c6335f66af29440f5e906b4166efefa8",
        "before": "617bc9ff1110fc6e669cf3a965756a2d",
        "after": "13afb9991ed5c5f5d739c7de4678360e"
      },
      "craft_requirements": {
        "raw": "b7f866c038686e172ddfb08a564ce53b",
        "before": "b7f866c038686e172ddfb08a564ce53b",
        "after": "ac1308c588ba266aa09b4ef3f6c8dc22"
      }
    }
  },
  {
    "id": 12661,
    "rank": 8,
    "expected": {
      "id": 12661,
      "name": "Wand of Noisome Acid (8th-Level Spell)",
      "uuid": "4314531124729452",
      "content_source_id": 16,
      "level": 18,
      "price": {
        "gp": 24000
      },
      "bulk": "0.1",
      "usage": "held-in-one-hand",
      "group": "GENERAL",
      "rarity": "UNCOMMON",
      "size": "MEDIUM",
      "hands": null,
      "traits": [
        1528,
        1504,
        1665
      ],
      "availability": null,
      "operations": null,
      "version": "1.0"
    },
    "metadata_absent": [
      "deprecated",
      "unselectable",
      "focus",
      "type",
      "ritual"
    ],
    "raw": {
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 8th rank. A creature that takes initial acid damage from this spell become \\[\\[Sickened\\]\\]{Sickened 1}. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
      "craft_requirements": "Supply a casting of Acid Arrow at 8th rank.",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
        "book": "Treasure Vault",
        "page": "141"
      }
    },
    "before": {
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 8th rank. A creature that takes initial acid damage from this spell become sickened 1. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
      "craft_requirements": "Supply a casting of Acid Arrow at 8th rank.",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
        "book": "Treasure Vault",
        "page": "141"
      }
    },
    "after": {
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 8th-rank *[acid grip](link_spell_4389)*. A creature that takes initial [acid](link_trait_1528) damage from this spell become sickened 1. Use your spell DC if the creature attempts to recover from this sickness. This is an [olfactory](link_trait_2131) effect.",
      "craft_requirements": "Supply a casting of *[acid grip](link_spell_4389)* of the appropriate rank.",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2284",
        "book": "Treasure Vault (Remastered)",
        "page": "141"
      }
    },
    "hashes": {
      "description": {
        "raw": "ce87ac205541aa396d22d536e5c212dd",
        "before": "764eb75dc0ebc61850b9011c4d6dca93",
        "after": "f5b82ce94b5478494583331d3dc5f7ff"
      },
      "craft_requirements": {
        "raw": "7d92bacbdb3349ccad578b41aee33220",
        "before": "7d92bacbdb3349ccad578b41aee33220",
        "after": "ac1308c588ba266aa09b4ef3f6c8dc22"
      }
    }
  }
]$noisome$::jsonb)),
expected as (
  select value as patch from jsonb_array_elements($expected$
[
  {
    "id": 11727,
    "name": "Avalanche Boots",
    "uuid": "925704570733986",
    "source": 16,
    "level": 17,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4668",
      "book": "Treasure Vault",
      "page": "102"
    },
    "description_md5": "5259071352adfe0bb8a44546ff3ef7a8"
  },
  {
    "id": 11772,
    "name": "Blending Brooch",
    "uuid": "6028558870698059",
    "source": 16,
    "level": 11,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4630",
      "book": "Treasure Vault",
      "page": "92"
    },
    "description_md5": "0896de30db623f6b182d3ccf3e58af41"
  },
  {
    "id": 11774,
    "name": "Blightburn Bomb (Greater)",
    "uuid": "4147634037626075",
    "source": 16,
    "level": 20,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4435",
      "book": "Treasure Vault",
      "page": "44"
    },
    "description_md5": "6151a4cc7af50381d435916c2114db6c"
  },
  {
    "id": 11775,
    "name": "Blightburn Bomb",
    "uuid": "6977801521699596",
    "source": 16,
    "level": 15,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4435",
      "book": "Treasure Vault",
      "page": "44"
    },
    "description_md5": "0416a96b9b3e331578dfecb355c3fb82"
  },
  {
    "id": 11796,
    "name": "Boulder Seed (Greater)",
    "uuid": "3258236377882296",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4436",
      "book": "Treasure Vault",
      "page": "44"
    },
    "description_md5": "fd0ef4dee479ece7ffb38aed39427a28"
  },
  {
    "id": 11797,
    "name": "Boulder Seed",
    "uuid": "8042468708367882",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4436",
      "book": "Treasure Vault",
      "page": "44"
    },
    "description_md5": "50e03b98e856f5dd18ab0dd9d4e5b0db"
  },
  {
    "id": 11824,
    "name": "Careless Delight",
    "uuid": "8726275612272611",
    "source": 16,
    "level": 9,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4528",
      "book": "Treasure Vault",
      "page": "67"
    },
    "description_md5": "e142f767e4a66b5f0ad389f1a78e15f1"
  },
  {
    "id": 11831,
    "name": "Cayden's Tankard",
    "uuid": "578544378028616",
    "source": 16,
    "level": 25,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4889",
      "book": "Treasure Vault",
      "page": "178"
    },
    "description_md5": "9233e91101aa031e886b83d41a16b864"
  },
  {
    "id": 11859,
    "name": "Clown Monarch",
    "uuid": "5531536345345289",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4530",
      "book": "Treasure Vault",
      "page": "68"
    },
    "description_md5": "887cfb8754938a26ad5a108e6e643ea7"
  },
  {
    "id": 11860,
    "name": "Clubhead Poison",
    "uuid": "5108747944059799",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4531",
      "book": "Treasure Vault",
      "page": "68"
    },
    "description_md5": "ba70ebdab8a59a6ca9eeb705d2da0bc0"
  },
  {
    "id": 11889,
    "name": "Corrosive Engravings",
    "uuid": "784469931024561",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4709",
      "book": "Treasure Vault",
      "page": "111"
    },
    "description_md5": "40535ff93e0187c7e9a446e92b83c3ad"
  },
  {
    "id": 11899,
    "name": "Crushing Coils",
    "uuid": "1774782858444590",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4906",
      "book": "Treasure Vault",
      "page": "191"
    },
    "description_md5": "902331d529ec5eb52c934c8472a24f50"
  },
  {
    "id": 11901,
    "name": "Curare",
    "uuid": "5321157015758660",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4532",
      "book": "Treasure Vault",
      "page": "68"
    },
    "description_md5": "6407e087a61e937e6c919f1b04c5fb7a"
  },
  {
    "id": 11926,
    "name": "Dezullon Fountain",
    "uuid": "7352965332877344",
    "source": 16,
    "level": 11,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4416",
      "book": "Treasure Vault",
      "page": "36"
    },
    "description_md5": "3fff0a89a61f3741a73fb151c5110066"
  },
  {
    "id": 11951,
    "name": "Dullahan Codex",
    "uuid": "1150991488142670",
    "source": 16,
    "level": 20,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4908",
      "book": "Treasure Vault",
      "page": "191"
    },
    "description_md5": "ad43e56bc723c45987914720004810f6"
  },
  {
    "id": 11963,
    "name": "Elysian Dew",
    "uuid": "7948864290485660",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4615",
      "book": "Treasure Vault",
      "page": "89"
    },
    "description_md5": "e07e750ad66c36d147e455c2a0d8db9b"
  },
  {
    "id": 11967,
    "name": "Emetic Paste (Moderate)",
    "uuid": "2220308294088219",
    "source": 16,
    "level": 9,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4472",
      "book": "Treasure Vault",
      "page": "54"
    },
    "description_md5": "daebd7e2996fff2c76adba25297ed578"
  },
  {
    "id": 11971,
    "name": "Energizing Treat",
    "uuid": "4226413200766035",
    "source": 16,
    "level": 7,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4651",
      "book": "Treasure Vault",
      "page": "96"
    },
    "description_md5": "d7d08ed7400d41835c73ad48fad893cd"
  },
  {
    "id": 11987,
    "name": "Euphoric Loop (Greater)",
    "uuid": "6750115442850256",
    "source": 16,
    "level": 13,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4556",
      "book": "Treasure Vault",
      "page": "74"
    },
    "description_md5": "a0a83627242ceacbc900a527862bacc4"
  },
  {
    "id": 11988,
    "name": "Euphoric Loop",
    "uuid": "3049663714269387",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4556",
      "book": "Treasure Vault",
      "page": "74"
    },
    "description_md5": "4959993ebfd20cd2547d3a2c83f18243"
  },
  {
    "id": 12006,
    "name": "Falconsight Eye",
    "uuid": "7779120612797869",
    "source": 16,
    "level": 6,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4691",
      "book": "Treasure Vault",
      "page": "108"
    },
    "description_md5": "4eb590e14ad0ad3b475a0665eb41ceb0"
  },
  {
    "id": 12012,
    "name": "Fearcracker (legacy)",
    "uuid": "6138651179720069",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4557",
      "book": "Treasure Vault",
      "page": "74"
    },
    "description_md5": "574287a69d8a3f4c02adc72fdbed4bd9"
  },
  {
    "id": 12013,
    "name": "Fearless Sash",
    "uuid": "5166068302848362",
    "source": 16,
    "level": 7,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4843",
      "book": "Treasure Vault",
      "page": "146"
    },
    "description_md5": "59f3c9731f767a334a6ad78eaaf8091b"
  },
  {
    "id": 12024,
    "name": "Freeze Ammunition",
    "uuid": "960541811768889",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4431",
      "book": "Treasure Vault",
      "page": "42"
    },
    "description_md5": "3b56442f13f70dc1eb5721ff87f90f7f"
  },
  {
    "id": 12028,
    "name": "Fury Cocktail (Greater)",
    "uuid": "5584085442397161",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4450",
      "book": "Treasure Vault",
      "page": "48"
    },
    "description_md5": "cafc3013c48763a6e02be6ba9d046746"
  },
  {
    "id": 12039,
    "name": "Gearbinder Oil (Lesser)",
    "uuid": "1472503890128627",
    "source": 16,
    "level": 6,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4473",
      "book": "Treasure Vault",
      "page": "54"
    },
    "description_md5": "c8de5508f8d42182ea1a4699d8366cc0"
  },
  {
    "id": 12060,
    "name": "Gravemist Taper",
    "uuid": "6031426014160445",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4558",
      "book": "Treasure Vault",
      "page": "74"
    },
    "description_md5": "bec34e6156893e18e629d0f7c5239571"
  },
  {
    "id": 12061,
    "name": "Grounding Spike",
    "uuid": "8539826978545700",
    "source": 16,
    "level": 10,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4407",
      "book": "Treasure Vault",
      "page": "34"
    },
    "description_md5": "4acd62a7eccd5a971cbb582cde6e29af"
  },
  {
    "id": 12096,
    "name": "Hippogriff in a Jar",
    "uuid": "617515831477348",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4482",
      "book": "Treasure Vault",
      "page": "56"
    },
    "description_md5": "e0b1f049e8b5ad47724a1c0c4f55efcb"
  },
  {
    "id": 12098,
    "name": "Horrid Figurine",
    "uuid": "2410292548939842",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4726",
      "book": "Treasure Vault",
      "page": "115"
    },
    "description_md5": "39b4840d526c9fce9739f7fec0672fae"
  },
  {
    "id": 12105,
    "name": "Immovable Potion",
    "uuid": "2156578209461492",
    "source": 16,
    "level": 10,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4620",
      "book": "Treasure Vault",
      "page": "90"
    },
    "description_md5": "78f714f951ce35d6f6010f2b08486168"
  },
  {
    "id": 12106,
    "name": "Immovable",
    "uuid": "4183796929585080",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4365",
      "book": "Treasure Vault",
      "page": "12"
    },
    "description_md5": "22ff89d979f36887f84cff1bbc876cae"
  },
  {
    "id": 12119,
    "name": "Instinct Crown (Fury)",
    "uuid": "6043174096370110",
    "source": 16,
    "level": 10,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4870",
      "book": "Treasure Vault",
      "page": "152"
    },
    "description_md5": "d17463310133982a208e266a301ed8b3"
  },
  {
    "id": 12133,
    "name": "Jug of Fond Remembrance",
    "uuid": "1907653507143413",
    "source": 16,
    "level": 4,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4727",
      "book": "Treasure Vault",
      "page": "115"
    },
    "description_md5": "84ae35d818e081b072f497597009be6e"
  },
  {
    "id": 12142,
    "name": "Kraken Bottle",
    "uuid": "1030515443560831",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4483",
      "book": "Treasure Vault",
      "page": "56"
    },
    "description_md5": "8191cfa660b2673f78245f129b584228"
  },
  {
    "id": 12162,
    "name": "Life Shot (Greater)",
    "uuid": "3116026975684982",
    "source": 16,
    "level": 14,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4432",
      "book": "Treasure Vault",
      "page": "43"
    },
    "description_md5": "5e72f49bd8126e99829b902ab0c98964"
  },
  {
    "id": 12163,
    "name": "Life Shot (Lesser)",
    "uuid": "6324942867221290",
    "source": 16,
    "level": 6,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4432",
      "book": "Treasure Vault",
      "page": "43"
    },
    "description_md5": "521880d838fcbf1b015e76ac247044be"
  },
  {
    "id": 12164,
    "name": "Life Shot (Major)",
    "uuid": "6885746820678841",
    "source": 16,
    "level": 16,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4432",
      "book": "Treasure Vault",
      "page": "43"
    },
    "description_md5": "ef17c3f18d918b7c81e24e1ffe407867"
  },
  {
    "id": 12166,
    "name": "Life Shot (Moderate)",
    "uuid": "1161857233645080",
    "source": 16,
    "level": 10,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4432",
      "book": "Treasure Vault",
      "page": "43"
    },
    "description_md5": "9d50dc77f108f9f6a317272c3cb02815"
  },
  {
    "id": 12167,
    "name": "Life Shot (True)",
    "uuid": "7177988535822777",
    "source": 16,
    "level": 20,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4432",
      "book": "Treasure Vault",
      "page": "43"
    },
    "description_md5": "0777de64d4976a4869b7635f80cdf7f7"
  },
  {
    "id": 12176,
    "name": "Lodestone Bomb (Greater)",
    "uuid": "8006317605703353",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4437",
      "book": "Treasure Vault",
      "page": "44"
    },
    "description_md5": "76a35ec5f40937f98e5f4ce2d70a4587"
  },
  {
    "id": 12177,
    "name": "Lodestone Bomb",
    "uuid": "1960473164426432",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4437",
      "book": "Treasure Vault",
      "page": "44"
    },
    "description_md5": "2b4a33b8b23ad414ea55d745ab0702b9"
  },
  {
    "id": 12179,
    "name": "Looter's Lethargy",
    "uuid": "6629457174254296",
    "source": 16,
    "level": 2,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4540",
      "book": "Treasure Vault",
      "page": "69"
    },
    "description_md5": "c5dcfb6213569667ba752fa1ccec072b"
  },
  {
    "id": 12190,
    "name": "Majordomo Torc",
    "uuid": "4654706127841833",
    "source": 16,
    "level": 6,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4927",
      "book": "Treasure Vault",
      "page": "195"
    },
    "description_md5": "7b8b53704fd67ab7dd1db01884bd6cd8"
  },
  {
    "id": 12198,
    "name": "Maw of Hungry Shadows",
    "uuid": "7191324741794684",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4715",
      "book": "Treasure Vault",
      "page": "112"
    },
    "description_md5": "5e241891eb6c9e9fe4493746ead363c9"
  },
  {
    "id": 12210,
    "name": "Mindlance",
    "uuid": "4460414445708153",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4424",
      "book": "Treasure Vault",
      "page": "39"
    },
    "description_md5": "3c8378091fd9462a8284c196b07c80cc"
  },
  {
    "id": 12213,
    "name": "Mirror Goggles (Greater)",
    "uuid": "3895742967478340",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4847",
      "book": "Treasure Vault",
      "page": "147"
    },
    "description_md5": "b501b082fae5e0797c640ac8952a88cd"
  },
  {
    "id": 12215,
    "name": "Mirror Goggles (Moderate)",
    "uuid": "8772573582599563",
    "source": 16,
    "level": 11,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4847",
      "book": "Treasure Vault",
      "page": "147"
    },
    "description_md5": "742f51f56aa5eab058fd6b68a730da3f"
  },
  {
    "id": 12216,
    "name": "Misleading",
    "uuid": "2630337807608825",
    "source": 16,
    "level": 16,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4367",
      "book": "Treasure Vault",
      "page": "13"
    },
    "description_md5": "8b2b178f0f647db47cf8a041346dd4f0"
  },
  {
    "id": 12228,
    "name": "Mustard Powder",
    "uuid": "4645507244279286",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4541",
      "book": "Treasure Vault",
      "page": "70"
    },
    "description_md5": "7aa3116fcac84f6a62386486176650ee"
  },
  {
    "id": 12253,
    "name": "Ooze Ammunition (Greater)",
    "uuid": "2484768822097062",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4433",
      "book": "Treasure Vault",
      "page": "43"
    },
    "description_md5": "4e573911df88a17915edfe0fcd9cb347"
  },
  {
    "id": 12254,
    "name": "Ooze Ammunition (Lesser)",
    "uuid": "4794371300591972",
    "source": 16,
    "level": 2,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4433",
      "book": "Treasure Vault",
      "page": "43"
    },
    "description_md5": "0dffe7048809705cb0b5c044913042ec"
  },
  {
    "id": 12255,
    "name": "Ooze Ammunition (Major)",
    "uuid": "6589199283736217",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4433",
      "book": "Treasure Vault",
      "page": "43"
    },
    "description_md5": "2e7eca00c04681c4d3881e4a2377d7a0"
  },
  {
    "id": 12256,
    "name": "Ooze Ammunition (Moderate)",
    "uuid": "2033114112023663",
    "source": 16,
    "level": 6,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4433",
      "book": "Treasure Vault",
      "page": "43"
    },
    "description_md5": "c7809b11943560dc8c4bc2676cd15a1e"
  },
  {
    "id": 12263,
    "name": "Pale Fade",
    "uuid": "5948113490346242",
    "source": 16,
    "level": 19,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4543",
      "book": "Treasure Vault",
      "page": "70"
    },
    "description_md5": "f8cfb461143575eda2b921ae89378f5f"
  },
  {
    "id": 12266,
    "name": "Perfected Robes",
    "uuid": "3737331301044921",
    "source": 16,
    "level": 22,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4893",
      "book": "Treasure Vault",
      "page": "179"
    },
    "description_md5": "7225165fd3980bdfa99f85fe9678796a"
  },
  {
    "id": 12284,
    "name": "Poison Fizz (Greater)",
    "uuid": "4708729184163253",
    "source": 16,
    "level": 15,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4459",
      "book": "Treasure Vault",
      "page": "50"
    },
    "description_md5": "2ef70edb969449ea4ec28a00d532093f"
  },
  {
    "id": 12286,
    "name": "Poison Fizz (Moderate)",
    "uuid": "926755848108420",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4459",
      "book": "Treasure Vault",
      "page": "50"
    },
    "description_md5": "142a1adec7caffb9ee046c72fb4fa279"
  },
  {
    "id": 12299,
    "name": "Pummel-Growth Toxin",
    "uuid": "1501044049068081",
    "source": 16,
    "level": 13,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4544",
      "book": "Treasure Vault",
      "page": "70"
    },
    "description_md5": "503eea162a14df1f1441e7bd2e03e185"
  },
  {
    "id": 12315,
    "name": "Rebirth Potion",
    "uuid": "636933431291160",
    "source": 16,
    "level": 9,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4623",
      "book": "Treasure Vault",
      "page": "90"
    },
    "description_md5": "2f3e172f66199b370909d078ddd9fd3e"
  },
  {
    "id": 12331,
    "name": "Revealing Mist (Greater)",
    "uuid": "8342823743295041",
    "source": 16,
    "level": 7,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4476",
      "book": "Treasure Vault",
      "page": "55"
    },
    "description_md5": "19d88135e1a4e14c6ae1f8cd9f545949"
  },
  {
    "id": 12332,
    "name": "Revealing Mist (Lesser)",
    "uuid": "5040957997987194",
    "source": 16,
    "level": 3,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4476",
      "book": "Treasure Vault",
      "page": "55"
    },
    "description_md5": "d92ba49efe7e5b3701fc0ee02b81dd71"
  },
  {
    "id": 12341,
    "name": "Roaring Potion (Greater)",
    "uuid": "1565096681194645",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4624",
      "book": "Treasure Vault",
      "page": "90"
    },
    "description_md5": "ae936519726d90ae18f0e8df03f1d1ad"
  },
  {
    "id": 12342,
    "name": "Roaring Potion (Lesser)",
    "uuid": "7452246520225925",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4624",
      "book": "Treasure Vault",
      "page": "90"
    },
    "description_md5": "ecce0e30a3015be5b38aff81234b7421"
  },
  {
    "id": 12343,
    "name": "Roaring Potion (Moderate)",
    "uuid": "8193835860349576",
    "source": 16,
    "level": 13,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4624",
      "book": "Treasure Vault",
      "page": "90"
    },
    "description_md5": "b7aa0e0397009972e1360dbe75604bf8"
  },
  {
    "id": 12377,
    "name": "Scale of Igroon",
    "uuid": "6953171332710115",
    "source": 16,
    "level": 21,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4894",
      "book": "Treasure Vault",
      "page": "180"
    },
    "description_md5": "7d3c44995175bc5c2a3895210a855df0"
  },
  {
    "id": 12379,
    "name": "Scholar's Drop",
    "uuid": "8676599844148252",
    "source": 16,
    "level": 6,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4462",
      "book": "Treasure Vault",
      "page": "50"
    },
    "description_md5": "48dfa51185c7c90fd0cf00650d654c96"
  },
  {
    "id": 12401,
    "name": "Shatterstone (Greater)",
    "uuid": "7798780290692263",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4438",
      "book": "Treasure Vault",
      "page": "44"
    },
    "description_md5": "a43b6d99c984ddd10a2245701956ee5b"
  },
  {
    "id": 12402,
    "name": "Shatterstone",
    "uuid": "1183390171996376",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4438",
      "book": "Treasure Vault",
      "page": "44"
    },
    "description_md5": "e8815d090cc3afb43cd552bd170416a1"
  },
  {
    "id": 12410,
    "name": "Skinsaw Mask",
    "uuid": "8304668112940097",
    "source": 16,
    "level": 3,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4886",
      "book": "Treasure Vault",
      "page": "155"
    },
    "description_md5": "c25896a21e45467db66d37f2d13c8aa1"
  },
  {
    "id": 12411,
    "name": "Skittering Mask (Greater)",
    "uuid": "2984523373022883",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4887",
      "book": "Treasure Vault",
      "page": "155"
    },
    "description_md5": "3d1fb8adc999a3d4158c573a95fc2dd9"
  },
  {
    "id": 12412,
    "name": "Skittering Mask",
    "uuid": "1312629449489689",
    "source": 16,
    "level": 2,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4887",
      "book": "Treasure Vault",
      "page": "155"
    },
    "description_md5": "88f3dc8ef68f04ea6b3c71c753ebfd60"
  },
  {
    "id": 12413,
    "name": "Skunk Bomb (Greater)",
    "uuid": "6925434332775559",
    "source": 16,
    "level": 11,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4439",
      "book": "Treasure Vault",
      "page": "45"
    },
    "description_md5": "8918528836e0782b5430bcb8bae20976"
  },
  {
    "id": 12414,
    "name": "Skunk Bomb (Lesser)",
    "uuid": "5115852800833693",
    "source": 16,
    "level": 1,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4439",
      "book": "Treasure Vault",
      "page": "45"
    },
    "description_md5": "db3831d8ed219731a064dffd8d7f1492"
  },
  {
    "id": 12415,
    "name": "Skunk Bomb (Major)",
    "uuid": "5225244616013789",
    "source": 16,
    "level": 17,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4439",
      "book": "Treasure Vault",
      "page": "45"
    },
    "description_md5": "2ff2c4442aad3911e3a96240c79ebd3d"
  },
  {
    "id": 12416,
    "name": "Skunk Bomb (Moderate)",
    "uuid": "1361105339584093",
    "source": 16,
    "level": 3,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4439",
      "book": "Treasure Vault",
      "page": "45"
    },
    "description_md5": "b2bf0c52cbfcd2ae229e885d90046b7b"
  },
  {
    "id": 12418,
    "name": "Smother Shroud",
    "uuid": "4607545521624809",
    "source": 16,
    "level": 7,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4547",
      "book": "Treasure Vault",
      "page": "70"
    },
    "description_md5": "5c948bcccddd34c140990206d3bdc0d6"
  },
  {
    "id": 12468,
    "name": "Spurned Lute",
    "uuid": "6523838997023638",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4918",
      "book": "Treasure Vault",
      "page": "193"
    },
    "description_md5": "975a4f57a6cfe8df2a30d20f2e6d401d"
  },
  {
    "id": 12482,
    "name": "Stage Fright Missive",
    "uuid": "5475751053637342",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4599",
      "book": "Treasure Vault",
      "page": "85"
    },
    "description_md5": "608deb92d7a0f18c21cc4373e2e11e65"
  },
  {
    "id": 12487,
    "name": "Staring Skull",
    "uuid": "3535368526839412",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4751",
      "book": "Treasure Vault",
      "page": "122"
    },
    "description_md5": "3e49d76dfc14286dd860c3f3e67382fd"
  },
  {
    "id": 12493,
    "name": "Stumbling Fulu",
    "uuid": "4801839758949704",
    "source": 16,
    "level": 3,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4576",
      "book": "Treasure Vault",
      "page": "79"
    },
    "description_md5": "a943c39d94c9d990b2c0419731b1cd37"
  },
  {
    "id": 12496,
    "name": "Sun Dazzler",
    "uuid": "4964329723781549",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4517",
      "book": "Treasure Vault",
      "page": "65"
    },
    "description_md5": "47db1a6ce845e94a19bff1081bae0e1e"
  },
  {
    "id": 12498,
    "name": "Sure-Step Crampons",
    "uuid": "1982910621943248",
    "source": 16,
    "level": 6,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4844",
      "book": "Treasure Vault",
      "page": "146"
    },
    "description_md5": "0b07be575a7d6a577de41f5942313ce6"
  },
  {
    "id": 12509,
    "name": "Taster's Folly",
    "uuid": "1725921262650474",
    "source": 16,
    "level": 4,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4550",
      "book": "Treasure Vault",
      "page": "71"
    },
    "description_md5": "59b096d660415c493c7de9be5c0b135d"
  },
  {
    "id": 12514,
    "name": "Tattletale Orb (Selenite)",
    "uuid": "483346499495579",
    "source": 16,
    "level": 15,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4919",
      "book": "Treasure Vault",
      "page": "193"
    },
    "description_md5": "6af1d1a8366e20275d7112835eec030b"
  },
  {
    "id": 12519,
    "name": "Theatrical Mutagen (Greater)",
    "uuid": "5304011940133327",
    "source": 16,
    "level": 11,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4501",
      "book": "Treasure Vault",
      "page": "61"
    },
    "description_md5": "40e4b68d6179100d9b4b6978fb117465"
  },
  {
    "id": 12520,
    "name": "Theatrical Mutagen (Lesser)",
    "uuid": "1232395091233440",
    "source": 16,
    "level": 1,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4501",
      "book": "Treasure Vault",
      "page": "61"
    },
    "description_md5": "7baa25e216af61578a90f711af219f2c"
  },
  {
    "id": 12521,
    "name": "Theatrical Mutagen (Major)",
    "uuid": "3902366831888139",
    "source": 16,
    "level": 17,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4501",
      "book": "Treasure Vault",
      "page": "61"
    },
    "description_md5": "19d09cdf9fdcda69d486902eb2a70c1a"
  },
  {
    "id": 12522,
    "name": "Theatrical Mutagen (Moderate)",
    "uuid": "7378845883140605",
    "source": 16,
    "level": 3,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4501",
      "book": "Treasure Vault",
      "page": "61"
    },
    "description_md5": "f7358b6528096d7e9e75a8dfea9ac073"
  },
  {
    "id": 12533,
    "name": "Thunderblast Slippers (Greater)",
    "uuid": "2038577180803105",
    "source": 16,
    "level": 15,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4863",
      "book": "Treasure Vault",
      "page": "151"
    },
    "description_md5": "4871c6e279e4fd7d582d432ed202c3c1"
  },
  {
    "id": 12534,
    "name": "Thunderblast Slippers",
    "uuid": "4479008997353398",
    "source": 16,
    "level": 9,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4863",
      "book": "Treasure Vault",
      "page": "151"
    },
    "description_md5": "c07cfdf26aab3c6e410bc5cafe7fd9ef"
  },
  {
    "id": 12535,
    "name": "Thundercrasher",
    "uuid": "2524622805310747",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4427",
      "book": "Treasure Vault",
      "page": "39"
    },
    "description_md5": "9a005f620359c347ab60bb00d369bf39"
  },
  {
    "id": 12536,
    "name": "Tlil Mask (Greater)",
    "uuid": "2406197973325610",
    "source": 16,
    "level": 9,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4888",
      "book": "Treasure Vault",
      "page": "155"
    },
    "description_md5": "4b39a6f594355f57c369b447504c6346"
  },
  {
    "id": 12537,
    "name": "Tlil Mask",
    "uuid": "730379165811802",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4888",
      "book": "Treasure Vault",
      "page": "155"
    },
    "description_md5": "c4728fd46a42e549c7436f72f85fc920"
  },
  {
    "id": 12541,
    "name": "Tome of Scintillating Sleet",
    "uuid": "7424710747203965",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4718",
      "book": "Treasure Vault",
      "page": "113"
    },
    "description_md5": "99e79259c89bcb09a9d1183a1ba525b3"
  },
  {
    "id": 12550,
    "name": "Toshigami Blossom",
    "uuid": "5687150503269700",
    "source": 16,
    "level": 15,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4932",
      "book": "Treasure Vault",
      "page": "197"
    },
    "description_md5": "b15c8873c1c29ad0ef7d3d30452dafa5"
  },
  {
    "id": 12576,
    "name": "Vaporous Pipe",
    "uuid": "3790951613607195",
    "source": 16,
    "level": 7,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4732",
      "book": "Treasure Vault",
      "page": "116"
    },
    "description_md5": "93b927d0c84bcbe08f2c108149b53129"
  },
  {
    "id": 12631,
    "name": "Wand of Legerdemain (1st-level)",
    "uuid": "1571039557728623",
    "source": 16,
    "level": 4,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4815",
      "book": "Treasure Vault",
      "page": "140"
    },
    "description_md5": "11bb8e21b21255e324744ef287703c92"
  },
  {
    "id": 12632,
    "name": "Wand of Legerdemain (2nd-level)",
    "uuid": "142928225801459",
    "source": 16,
    "level": 6,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4815",
      "book": "Treasure Vault",
      "page": "140"
    },
    "description_md5": "11bb8e21b21255e324744ef287703c92"
  },
  {
    "id": 12633,
    "name": "Wand of Legerdemain (3rd-level)",
    "uuid": "5092156059476082",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4815",
      "book": "Treasure Vault",
      "page": "140"
    },
    "description_md5": "11bb8e21b21255e324744ef287703c92"
  },
  {
    "id": 12634,
    "name": "Wand of Legerdemain (4th-level)",
    "uuid": "4228746469123515",
    "source": 16,
    "level": 10,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4815",
      "book": "Treasure Vault",
      "page": "140"
    },
    "description_md5": "11bb8e21b21255e324744ef287703c92"
  },
  {
    "id": 12635,
    "name": "Wand of Legerdemain (5th-level)",
    "uuid": "8203978991539215",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4815",
      "book": "Treasure Vault",
      "page": "140"
    },
    "description_md5": "11bb8e21b21255e324744ef287703c92"
  },
  {
    "id": 12636,
    "name": "Wand of Legerdemain (6th-level)",
    "uuid": "5608364032748675",
    "source": 16,
    "level": 14,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4815",
      "book": "Treasure Vault",
      "page": "140"
    },
    "description_md5": "11bb8e21b21255e324744ef287703c92"
  },
  {
    "id": 12637,
    "name": "Wand of Legerdemain (7th-level)",
    "uuid": "1757579373563218",
    "source": 16,
    "level": 16,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4815",
      "book": "Treasure Vault",
      "page": "140"
    },
    "description_md5": "11bb8e21b21255e324744ef287703c92"
  },
  {
    "id": 12638,
    "name": "Wand of Legerdemain (8th-level)",
    "uuid": "773095938864587",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4815",
      "book": "Treasure Vault",
      "page": "140"
    },
    "description_md5": "11bb8e21b21255e324744ef287703c92"
  },
  {
    "id": 12639,
    "name": "Wand of Legerdemain (9th-level)",
    "uuid": "2543340744708360",
    "source": 16,
    "level": 20,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4815",
      "book": "Treasure Vault",
      "page": "140"
    },
    "description_md5": "11bb8e21b21255e324744ef287703c92"
  },
  {
    "id": 12658,
    "name": "Wand of Noisome Acid (2nd-Level Spell)",
    "uuid": "8183994509694895",
    "source": 16,
    "level": 6,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
      "book": "Treasure Vault",
      "page": "141"
    },
    "description_md5": "86bc95d48109bb1832c7f73672465553"
  },
  {
    "id": 12659,
    "name": "Wand of Noisome Acid (4th-Level Spell)",
    "uuid": "7611411327409832",
    "source": 16,
    "level": 10,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
      "book": "Treasure Vault",
      "page": "141"
    },
    "description_md5": "5fa726a9ae0630c282adb21fb7cd94cf"
  },
  {
    "id": 12660,
    "name": "Wand of Noisome Acid (6th-Level Spell)",
    "uuid": "2253459097543392",
    "source": 16,
    "level": 14,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
      "book": "Treasure Vault",
      "page": "141"
    },
    "description_md5": "617bc9ff1110fc6e669cf3a965756a2d"
  },
  {
    "id": 12661,
    "name": "Wand of Noisome Acid (8th-Level Spell)",
    "uuid": "4314531124729452",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
      "book": "Treasure Vault",
      "page": "141"
    },
    "description_md5": "764eb75dc0ebc61850b9011c4d6dca93"
  },
  {
    "id": 12719,
    "name": "Whelming Scrimshaw",
    "uuid": "8320473602266644",
    "source": 16,
    "level": 13,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4663",
      "book": "Treasure Vault",
      "page": "99"
    },
    "description_md5": "a25f22ce6bbeb168bc666d2dd9de1a07"
  }
]
  $expected$::jsonb)
)
select 'treasure-vault-condition-references'::text as id,
  coalesce((select count(*) = 111 and count(distinct patch->>'id') = 111 and bool_and((
    i.id is not null and i.name = patch->>'name' and i.uuid = (patch->>'uuid')::bigint
    and i.content_source_id = (patch->>'source')::bigint and i.level = (patch->>'level')::integer
    and ((jsonb_typeof(i.meta_data) = 'object' and (case when patch->>'id' in ('12658','12659','12660','12661') then exists(select 1 from noisome where successor->>'id'=patch->>'id' and ((jsonb_typeof(i.meta_data)='object' and jsonb_build_object('description',i.description,'craft_requirements',i.craft_requirements,'source',i.meta_data->'source')=successor->'before') or (jsonb_typeof(i.meta_data)='object' and jsonb_build_object('description',i.description,'craft_requirements',i.craft_requirements,'source',i.meta_data->'source')=successor->'after' and not exists(select 1 from jsonb_each(successor->'expected') f where (to_jsonb(i)||jsonb_build_object('uuid',i.uuid::text))->f.key is distinct from f.value) and not exists(select 1 from jsonb_array_elements_text(successor->'metadata_absent') k(key) where i.meta_data?k.key)))) else i.meta_data->'source' = patch->'citation' end)
    and (md5(i.description) = patch->>'description_md5' or exists(select 1 from noisome where successor->>'id'=patch->>'id' and jsonb_typeof(i.meta_data)='object' and jsonb_build_object('description',i.description,'craft_requirements',i.craft_requirements,'source',i.meta_data->'source')=successor->'after' and not exists(select 1 from jsonb_each(successor->'expected') f where (to_jsonb(i)||jsonb_build_object('uuid',i.uuid::text))->f.key is distinct from f.value) and not exists(select 1 from jsonb_array_elements_text(successor->'metadata_absent') k(key) where i.meta_data?k.key)))) and (patch->>'id' not in ('11901','12024') or exists(select 1 from prose_legacy_complete where id=patch->>'id'))) or exists(select 1 from prose_complete where id=patch->>'id')) is true)
    from expected left join public.item i on i.id = (patch->>'id')::bigint),false)
  and exists (select 1 from public.content_source where id = 16 and name = 'Treasure Vault'
    and user_id is null and is_published is true)
  and not exists (select 1 from public.content_update u where u.status->>'state' = 'PENDING'
    and ((u.type = 'item' and u.ref_id in (select (patch->>'id')::bigint from expected))
      or (u.type = 'content-source' and u.ref_id = 16)))
  and coalesce((select count(*)=23 and count(distinct (prose_dependency->>'table',prose_dependency->>'id'))=23 and bool_and((row is not null and jsonb_typeof(row->'meta_data') is not distinct from 'object'
    and not exists(select 1 from jsonb_each(prose_dependency->'expected') e where row->e.key is distinct from e.value)
    and not exists(select 1 from jsonb_each(prose_dependency->'metadata') e where row#>array['meta_data',e.key] is distinct from e.value)
    and not exists(select 1 from jsonb_array_elements_text(prose_dependency->'metadata_absent') k(key) where row->'meta_data'?k.key)) is true) from prose_dependency_rows),false)
  and coalesce((select count(*)=3 and count(distinct s.id)=3 and bool_and((s.id is not null and not exists(select 1 from jsonb_each(prose_source) e where to_jsonb(s)->e.key is distinct from e.value)) is true) from prose_sources left join public.content_source s on s.id=(prose_source->>'id')::bigint),false)
  and not exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
    exists(select 1 from prose_sources where u.type='content-source' and (u.ref_id=(prose_source->>'id')::bigint or u.data->>'id'=prose_source->>'id' or u.data->>'name'=prose_source->>'name'))
    or exists(select 1 from prose_dependencies where u.type=prose_dependency->>'type' and (u.ref_id=(prose_dependency->>'id')::bigint or u.data->>'id'=prose_dependency->>'id' or u.data->>'uuid'=prose_dependency#>>'{expected,uuid}' or ((u.content_source_id=(prose_dependency#>>'{expected,content_source_id}')::bigint or u.data->>'content_source_id'=prose_dependency#>>'{expected,content_source_id}') and u.data->>'name'=prose_dependency#>>'{expected,name}')))
    or exists(select 1 from prose_owners where u.type='item' and (u.ref_id=(prose_patch->>'id')::bigint or u.data->>'id'=prose_patch->>'id' or u.data->>'uuid'=prose_patch#>>'{expected,uuid}' or ((u.content_source_id=(prose_patch#>>'{expected,content_source_id}')::bigint or u.data->>'content_source_id'=prose_patch#>>'{expected,content_source_id}') and u.data->>'name'=prose_patch#>>'{expected,name}')))
  ))
  as passed
)
select original_checks.id,case when coalesce((status.value->>'recognized')::boolean,true) then coalesce((status.value->>'passed')::boolean,false) else original_checks.passed end as passed from original_checks cross join terminal_status status;
