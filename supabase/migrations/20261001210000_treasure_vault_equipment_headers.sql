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
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((p.prosrc)::text,'UTF8')),'hex')='306b98528f553f9089d3b46c8541b30121c9cdf1c30a48a69034842982f22c87'
    and p.prokind='f' and p.prolang=(select l.oid from pg_catalog.pg_language l where l.lanname='sql')
    and p.provolatile='s' and p.prosecdef is false and p.proisstrict is false and p.proleakproof is false
    and p.proparallel='u' and p.procost=100 and p.prorows=1
    and p.pronargs=0 and p.pronargdefaults=0 and p.proretset is true
    and p.prorettype=pg_catalog.to_regtype('record')
    and p.proallargtypes=array[pg_catalog.to_regtype('boolean')::oid,pg_catalog.to_regtype('boolean')::oid]
    and p.proargmodes=array['t','t']::"char"[] and p.proargnames=array['recognized','passed']::text[]
    and p.proconfig=array['search_path=""']::text[] and p.proowner=pg_catalog.to_regrole('postgres')
    and (select count(*)=2
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('postgres'))=1
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('service_role'))=1
      and bool_and((a.privilege_type='EXECUTE' and a.is_grantable is false
      and a.grantor=pg_catalog.to_regrole('postgres')
      and a.grantee in(pg_catalog.to_regrole('postgres'),pg_catalog.to_regrole('service_role'))) is true)
      from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a)
    and pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE')
    and pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE'))) is not true then
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
  execute $historical_original_dual$-- Eight reviewed equipment headers; descriptions, operations and saved copies remain unchanged.
do $repair$
declare
  spec constant jsonb := $headers${
  "items": [
    {
      "id": 11707,
      "expected": {
        "id": 11707,
        "name": "Apparition Gloves",
        "bulk": "0.1",
        "level": 2,
        "rarity": "COMMON",
        "group": "GENERAL",
        "hands": null,
        "size": "MEDIUM",
        "craft_requirements": null,
        "operations": null,
        "content_source_id": 16,
        "version": "1.0",
        "uuid": "1199845434955862",
        "price": {
          "gp": 25
        },
        "availability": null
      },
      "metadata": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4699",
          "book": "Treasure Vault",
          "page": "109"
        },
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
      "before": {
        "traits": [
          1504
        ],
        "usage": "worngloves"
      },
      "after": {
        "traits": [
          1504,
          1447
        ],
        "usage": "worn gloves"
      },
      "descriptions": [
        {
          "state": "raw",
          "text": "This set of gloves translates whatever the wearer says into the signed version of that language by projecting a ghostly, translucent version of the wearer's hands in front of them. The apparition is a purely visual illusion used for communication, so it can't move on its own, nor can it hold or manipulate objects, or attack.",
          "md5": "c725ad45bb8684ddf5c30673d681f563"
        }
      ],
      "before_states": [
        {
          "traits": [
            1504
          ],
          "usage": "worngloves",
          "description": "This set of gloves translates whatever the wearer says into the signed version of that language by projecting a ghostly, translucent version of the wearer's hands in front of them. The apparition is a purely visual illusion used for communication, so it can't move on its own, nor can it hold or manipulate objects, or attack."
        }
      ],
      "after_states": [
        {
          "traits": [
            1504,
            1447
          ],
          "usage": "worn gloves",
          "description": "This set of gloves translates whatever the wearer says into the signed version of that language by projecting a ghostly, translucent version of the wearer's hands in front of them. The apparition is a purely visual illusion used for communication, so it can't move on its own, nor can it hold or manipulate objects, or attack."
        }
      ],
      "evidence": {
        "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2165",
        "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4699"
      }
    },
    {
      "id": 11779,
      "expected": {
        "id": 11779,
        "name": "Blisterwort",
        "level": 11,
        "rarity": "COMMON",
        "group": "GENERAL",
        "hands": null,
        "size": "MEDIUM",
        "craft_requirements": null,
        "usage": "held-in-two-hands",
        "operations": null,
        "content_source_id": 16,
        "version": "1.0",
        "uuid": "3751798341889265",
        "price": {
          "gp": 280
        },
        "availability": null
      },
      "metadata": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4524",
          "book": "Treasure Vault",
          "page": "67"
        },
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
      "before": {
        "traits": [
          1531,
          1564,
          1476
        ],
        "bulk": "0"
      },
      "after": {
        "traits": [
          1531,
          1564,
          1476,
          1529
        ],
        "bulk": "0.1"
      },
      "descriptions": [
        {
          "state": "raw",
          "text": "**Activate** 2 Interact\n\nThis clear, viscous liquid causes lesions and blisters that spread quickly. The victim's pain response increases and flesh breaks easily under physical stress.\n\n**Saving Throw** Fortitude 30\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** 4d6 poison and weakness 2 to physical and force damage\n\n**Stage 2** 5d6 poison and weakness 4 to physical and force damage\n\n**Stage 3** 7d6 poison and weakness 6 to physical and force damage",
          "md5": "db0fd4a8f3b7679c33a807cd3963f470"
        }
      ],
      "before_states": [
        {
          "traits": [
            1531,
            1564,
            1476
          ],
          "bulk": "0",
          "description": "**Activate** 2 Interact\n\nThis clear, viscous liquid causes lesions and blisters that spread quickly. The victim's pain response increases and flesh breaks easily under physical stress.\n\n**Saving Throw** Fortitude 30\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** 4d6 poison and weakness 2 to physical and force damage\n\n**Stage 2** 5d6 poison and weakness 4 to physical and force damage\n\n**Stage 3** 7d6 poison and weakness 6 to physical and force damage"
        }
      ],
      "after_states": [
        {
          "traits": [
            1531,
            1564,
            1476,
            1529
          ],
          "bulk": "0.1",
          "description": "**Activate** 2 Interact\n\nThis clear, viscous liquid causes lesions and blisters that spread quickly. The victim's pain response increases and flesh breaks easily under physical stress.\n\n**Saving Throw** Fortitude 30\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** 4d6 poison and weakness 2 to physical and force damage\n\n**Stage 2** 5d6 poison and weakness 4 to physical and force damage\n\n**Stage 3** 7d6 poison and weakness 6 to physical and force damage"
        }
      ],
      "evidence": {
        "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=1991",
        "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4524"
      }
    },
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
        "usage": "held-in-two-hands",
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
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4532",
          "book": "Treasure Vault",
          "page": "68"
        },
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
      "before": {
        "traits": [
          1529,
          1531,
          1564,
          1476
        ]
      },
      "after": {
        "traits": [
          1529,
          1531,
          1564,
          1476,
          1481
        ]
      },
      "descriptions": [
        {
          "state": "raw",
          "text": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 1}, and \\[\\[Enfeebled\\]\\]{Enfeebled 1} (1 round)\n\n**Stage 2** 3d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 2}, \\[\\[Enfeebled\\]\\]{Enfeebled 2}, and \\[\\[Slowed\\]\\]{Slowed 1} (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is \\[\\[Paralyzed\\]\\] for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}.",
          "md5": "e30822a6889eea2b301562dbc7bb3a10"
        },
        {
          "state": "condition-repaired",
          "text": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, clumsy 1, and enfeebled 1 (1 round)\n\n**Stage 2** 3d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is paralyzed for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}.",
          "md5": "6407e087a61e937e6c919f1b04c5fb7a"
        }
      ],
      "before_states": [
        {
          "traits": [
            1529,
            1531,
            1564,
            1476
          ],
          "description": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 1}, and \\[\\[Enfeebled\\]\\]{Enfeebled 1} (1 round)\n\n**Stage 2** 3d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 2}, \\[\\[Enfeebled\\]\\]{Enfeebled 2}, and \\[\\[Slowed\\]\\]{Slowed 1} (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is \\[\\[Paralyzed\\]\\] for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}."
        },
        {
          "traits": [
            1529,
            1531,
            1564,
            1476
          ],
          "description": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, clumsy 1, and enfeebled 1 (1 round)\n\n**Stage 2** 3d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is paralyzed for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}."
        }
      ],
      "after_states": [
        {
          "traits": [
            1529,
            1531,
            1564,
            1476,
            1481
          ],
          "description": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 1}, and \\[\\[Enfeebled\\]\\]{Enfeebled 1} (1 round)\n\n**Stage 2** 3d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 2}, \\[\\[Enfeebled\\]\\]{Enfeebled 2}, and \\[\\[Slowed\\]\\]{Slowed 1} (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is \\[\\[Paralyzed\\]\\] for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}."
        },
        {
          "traits": [
            1529,
            1531,
            1564,
            1476,
            1481
          ],
          "description": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, clumsy 1, and enfeebled 1 (1 round)\n\n**Stage 2** 3d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is paralyzed for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}."
        }
      ],
      "evidence": {
        "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=1999",
        "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4532"
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
        "usage": "held-in-one-hand",
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
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4431",
          "book": "Treasure Vault",
          "page": "42"
        },
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
      "before": {
        "traits": [
          1529,
          1531,
          1532
        ]
      },
      "after": {
        "traits": [
          1529,
          1531,
          1532,
          1519
        ]
      },
      "descriptions": [
        {
          "state": "raw",
          "text": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall \\[\\[Prone\\]\\]. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly",
          "md5": "7400fa02f2d8aef6666df2560bf199db"
        },
        {
          "state": "condition-repaired",
          "text": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall prone. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly",
          "md5": "3b56442f13f70dc1eb5721ff87f90f7f"
        }
      ],
      "before_states": [
        {
          "traits": [
            1529,
            1531,
            1532
          ],
          "description": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall \\[\\[Prone\\]\\]. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly"
        },
        {
          "traits": [
            1529,
            1531,
            1532
          ],
          "description": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall prone. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly"
        }
      ],
      "after_states": [
        {
          "traits": [
            1529,
            1531,
            1532,
            1519
          ],
          "description": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall \\[\\[Prone\\]\\]. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly"
        },
        {
          "traits": [
            1529,
            1531,
            1532,
            1519
          ],
          "description": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall prone. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly"
        }
      ],
      "evidence": {
        "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=1898",
        "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4431"
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
        "usage": "held-in-two-hands",
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
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4660",
          "book": "Treasure Vault",
          "page": "98"
        },
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
      "before": {
        "traits": [
          1469,
          1531,
          1447,
          1504,
          1479
        ]
      },
      "after": {
        "traits": [
          1469,
          1531,
          1447,
          1504,
          1479,
          2131
        ]
      },
      "descriptions": [
        {
          "state": "raw",
          "text": "**Activate** 2 envision, Interact\n\nPlucking a talespinner's lyre while focusing on an event you witnessed causes the instrument to create an illusion in a 50-foot emanation that plays out your memory of the event in real time, complete with sights, sounds, and smells. You can Sustain the Activation for up to 1 minute to keep it playing. The scene reproduces only what's in its area, including nothing beyond that even if present in the memory. The scene is realistic, but all observers can clearly tell it's an illusion. Observers can't interact with the scene directly nor can they taste or touch elements of it to get a sensation you didn't personally experience, but they can attempt skill checks to discern more about the scene without altering its contents. For example, no one could see something you didn't, such as the true form of a creature polymorphed into a squirrel, but an observer might be able to use Perception and \\[\\[Sense Motive\\]\\] to discern the squirrel was acting unlike a squirrel should. Once the magic is used, the lyre remains as a non-magical virtuoso instrument.",
          "md5": "75ea940b7fa3b1b314b4e4b3a764610b"
        }
      ],
      "before_states": [
        {
          "traits": [
            1469,
            1531,
            1447,
            1504,
            1479
          ],
          "description": "**Activate** 2 envision, Interact\n\nPlucking a talespinner's lyre while focusing on an event you witnessed causes the instrument to create an illusion in a 50-foot emanation that plays out your memory of the event in real time, complete with sights, sounds, and smells. You can Sustain the Activation for up to 1 minute to keep it playing. The scene reproduces only what's in its area, including nothing beyond that even if present in the memory. The scene is realistic, but all observers can clearly tell it's an illusion. Observers can't interact with the scene directly nor can they taste or touch elements of it to get a sensation you didn't personally experience, but they can attempt skill checks to discern more about the scene without altering its contents. For example, no one could see something you didn't, such as the true form of a creature polymorphed into a squirrel, but an observer might be able to use Perception and \\[\\[Sense Motive\\]\\] to discern the squirrel was acting unlike a squirrel should. Once the magic is used, the lyre remains as a non-magical virtuoso instrument."
        }
      ],
      "after_states": [
        {
          "traits": [
            1469,
            1531,
            1447,
            1504,
            1479,
            2131
          ],
          "description": "**Activate** 2 envision, Interact\n\nPlucking a talespinner's lyre while focusing on an event you witnessed causes the instrument to create an illusion in a 50-foot emanation that plays out your memory of the event in real time, complete with sights, sounds, and smells. You can Sustain the Activation for up to 1 minute to keep it playing. The scene reproduces only what's in its area, including nothing beyond that even if present in the memory. The scene is realistic, but all observers can clearly tell it's an illusion. Observers can't interact with the scene directly nor can they taste or touch elements of it to get a sensation you didn't personally experience, but they can attempt skill checks to discern more about the scene without altering its contents. For example, no one could see something you didn't, such as the true form of a creature polymorphed into a squirrel, but an observer might be able to use Perception and \\[\\[Sense Motive\\]\\] to discern the squirrel was acting unlike a squirrel should. Once the magic is used, the lyre remains as a non-magical virtuoso instrument."
        }
      ],
      "evidence": {
        "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2127",
        "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4660"
      }
    },
    {
      "id": 12546,
      "expected": {
        "id": 12546,
        "name": "Torrent Spellgun (Greater)",
        "bulk": "0.1",
        "level": 11,
        "rarity": "COMMON",
        "group": "GENERAL",
        "hands": null,
        "size": "MEDIUM",
        "craft_requirements": null,
        "usage": "held in 1 hand",
        "operations": null,
        "content_source_id": 16,
        "version": "1.0",
        "uuid": "3599034895821989",
        "price": {
          "gp": 275
        },
        "availability": null
      },
      "metadata": {
        "hp": 0,
        "bulk": {},
        "group": "",
        "runes": {},
        "damage": {
          "die": "",
          "dice": "",
          "extra": "",
          "damageType": ""
        },
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4661",
          "book": "Treasure Vault",
          "page": "98"
        },
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
      "metadata_absent": [
        "deprecated",
        "important",
        "focus",
        "type",
        "ritual"
      ],
      "before": {
        "traits": [
          1531,
          1504,
          2868,
          1584
        ]
      },
      "after": {
        "traits": [
          1531,
          1504,
          2868,
          1584,
          1520
        ]
      },
      "descriptions": [
        {
          "state": "raw",
          "text": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> [Interact](link_action_19733), [Strike](link_action_19856)\n\n* * *\n\nCarved of seashell, a _torrent spellgun_ is damp to the touch, and seaweed wraps around its grip. You Activate the spellgun by aiming it at one creature and making your choice of a spell attack roll or a firearm attack roll against the target's AC. This spellgun has a range increment of 30 feet. The spellgun blasts a powerful jet of water that deals 12d6 bludgeoning damage, then disintegrates into sand.\n\n**Critical Success** The target takes double damage and is knocked back 10 feet.\n\n**Success** The target takes full damage and is knocked back 5 feet.",
          "md5": "6a88564b5007c45b2944b6015baaafd1"
        }
      ],
      "before_states": [
        {
          "traits": [
            1531,
            1504,
            2868,
            1584
          ],
          "description": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> [Interact](link_action_19733), [Strike](link_action_19856)\n\n* * *\n\nCarved of seashell, a _torrent spellgun_ is damp to the touch, and seaweed wraps around its grip. You Activate the spellgun by aiming it at one creature and making your choice of a spell attack roll or a firearm attack roll against the target's AC. This spellgun has a range increment of 30 feet. The spellgun blasts a powerful jet of water that deals 12d6 bludgeoning damage, then disintegrates into sand.\n\n**Critical Success** The target takes double damage and is knocked back 10 feet.\n\n**Success** The target takes full damage and is knocked back 5 feet."
        }
      ],
      "after_states": [
        {
          "traits": [
            1531,
            1504,
            2868,
            1584,
            1520
          ],
          "description": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> [Interact](link_action_19733), [Strike](link_action_19856)\n\n* * *\n\nCarved of seashell, a _torrent spellgun_ is damp to the touch, and seaweed wraps around its grip. You Activate the spellgun by aiming it at one creature and making your choice of a spell attack roll or a firearm attack roll against the target's AC. This spellgun has a range increment of 30 feet. The spellgun blasts a powerful jet of water that deals 12d6 bludgeoning damage, then disintegrates into sand.\n\n**Critical Success** The target takes double damage and is knocked back 10 feet.\n\n**Success** The target takes full damage and is knocked back 5 feet."
        }
      ],
      "evidence": {
        "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2128",
        "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4661"
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
        "usage": "held-in-two-hands",
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
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4553",
          "book": "Treasure Vault",
          "page": "71"
        },
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
      "before": {
        "traits": [
          1529,
          1531,
          1476
        ]
      },
      "after": {
        "traits": [
          1529,
          1531,
          1476,
          1564,
          1448
        ]
      },
      "descriptions": [
        {
          "state": "raw",
          "text": "**Activate** 2 Interact\n\nWarpwobble poison causes hallucinations of space bending and stretching, leading to vertigo and an inability to discern a stable place to move.\n\n**Saving Throw** Will 26\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** treat all squares as difficult terrain (1 round)\n\n**Stage 2** treat all squares as greater difficult terrain (1 round)\n\n**Stage 3** treat all squares as uneven ground (DC 26), treating a critical success to \\[\\[Balance\\]\\] as a success, and a success as a success but moving on greater difficult terrain (1 round)",
          "md5": "912aa4024dca53ddc86a07aa84e466b1"
        }
      ],
      "before_states": [
        {
          "traits": [
            1529,
            1531,
            1476
          ],
          "description": "**Activate** 2 Interact\n\nWarpwobble poison causes hallucinations of space bending and stretching, leading to vertigo and an inability to discern a stable place to move.\n\n**Saving Throw** Will 26\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** treat all squares as difficult terrain (1 round)\n\n**Stage 2** treat all squares as greater difficult terrain (1 round)\n\n**Stage 3** treat all squares as uneven ground (DC 26), treating a critical success to \\[\\[Balance\\]\\] as a success, and a success as a success but moving on greater difficult terrain (1 round)"
        }
      ],
      "after_states": [
        {
          "traits": [
            1529,
            1531,
            1476,
            1564,
            1448
          ],
          "description": "**Activate** 2 Interact\n\nWarpwobble poison causes hallucinations of space bending and stretching, leading to vertigo and an inability to discern a stable place to move.\n\n**Saving Throw** Will 26\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** treat all squares as difficult terrain (1 round)\n\n**Stage 2** treat all squares as greater difficult terrain (1 round)\n\n**Stage 3** treat all squares as uneven ground (DC 26), treating a critical success to \\[\\[Balance\\]\\] as a success, and a success as a success but moving on greater difficult terrain (1 round)"
        }
      ],
      "evidence": {
        "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2020",
        "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4553"
      }
    },
    {
      "id": 12719,
      "expected": {
        "id": 12719,
        "name": "Whelming Scrimshaw",
        "bulk": "0.1",
        "level": 13,
        "rarity": "COMMON",
        "group": "GENERAL",
        "hands": null,
        "size": "MEDIUM",
        "craft_requirements": null,
        "usage": "held-in-one-hand",
        "operations": null,
        "content_source_id": 16,
        "version": "1.0",
        "uuid": "8320473602266644",
        "price": {
          "gp": 500
        },
        "availability": null
      },
      "metadata": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4663",
          "book": "Treasure Vault",
          "page": "99"
        },
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
      "before": {
        "traits": [
          1531,
          1504
        ]
      },
      "after": {
        "traits": [
          1531,
          1504,
          1855
        ]
      },
      "descriptions": [
        {
          "state": "raw",
          "text": "**Activate** 2 Interact\n\nAn etching of some aquatic beast dragging a figure beneath the waves adorns the ivory of a whelming scrimshaw. When you Activate this item, you break it and choose one creature within 30 feet. The target must attempt a Fortitude 30 save; amphibious and aquatic creatures are immune.\n\n**Critical Success** The creature is unaffected.\n\n**Success** The target becomes \\[\\[Sickened\\]\\]{Sickened 1} and unable to breathe until this sickened condition ends.\n\n**Failure** As success, but \\[\\[Sickened\\]\\]{Sickened 2}.\n\n**Critical Failure** As success, but \\[\\[Sickened\\]\\]{Sickened 3}.",
          "md5": "07cda3f3a8945cac161fb5c7e7719d9c"
        },
        {
          "state": "condition-repaired",
          "text": "**Activate** 2 Interact\n\nAn etching of some aquatic beast dragging a figure beneath the waves adorns the ivory of a whelming scrimshaw. When you Activate this item, you break it and choose one creature within 30 feet. The target must attempt a Fortitude 30 save; amphibious and aquatic creatures are immune.\n\n**Critical Success** The creature is unaffected.\n\n**Success** The target becomes sickened 1 and unable to breathe until this sickened condition ends.\n\n**Failure** As success, but sickened 2.\n\n**Critical Failure** As success, but sickened 3.",
          "md5": "a25f22ce6bbeb168bc666d2dd9de1a07"
        }
      ],
      "before_states": [
        {
          "traits": [
            1531,
            1504
          ],
          "description": "**Activate** 2 Interact\n\nAn etching of some aquatic beast dragging a figure beneath the waves adorns the ivory of a whelming scrimshaw. When you Activate this item, you break it and choose one creature within 30 feet. The target must attempt a Fortitude 30 save; amphibious and aquatic creatures are immune.\n\n**Critical Success** The creature is unaffected.\n\n**Success** The target becomes \\[\\[Sickened\\]\\]{Sickened 1} and unable to breathe until this sickened condition ends.\n\n**Failure** As success, but \\[\\[Sickened\\]\\]{Sickened 2}.\n\n**Critical Failure** As success, but \\[\\[Sickened\\]\\]{Sickened 3}."
        },
        {
          "traits": [
            1531,
            1504
          ],
          "description": "**Activate** 2 Interact\n\nAn etching of some aquatic beast dragging a figure beneath the waves adorns the ivory of a whelming scrimshaw. When you Activate this item, you break it and choose one creature within 30 feet. The target must attempt a Fortitude 30 save; amphibious and aquatic creatures are immune.\n\n**Critical Success** The creature is unaffected.\n\n**Success** The target becomes sickened 1 and unable to breathe until this sickened condition ends.\n\n**Failure** As success, but sickened 2.\n\n**Critical Failure** As success, but sickened 3."
        }
      ],
      "after_states": [
        {
          "traits": [
            1531,
            1504,
            1855
          ],
          "description": "**Activate** 2 Interact\n\nAn etching of some aquatic beast dragging a figure beneath the waves adorns the ivory of a whelming scrimshaw. When you Activate this item, you break it and choose one creature within 30 feet. The target must attempt a Fortitude 30 save; amphibious and aquatic creatures are immune.\n\n**Critical Success** The creature is unaffected.\n\n**Success** The target becomes \\[\\[Sickened\\]\\]{Sickened 1} and unable to breathe until this sickened condition ends.\n\n**Failure** As success, but \\[\\[Sickened\\]\\]{Sickened 2}.\n\n**Critical Failure** As success, but \\[\\[Sickened\\]\\]{Sickened 3}."
        },
        {
          "traits": [
            1531,
            1504,
            1855
          ],
          "description": "**Activate** 2 Interact\n\nAn etching of some aquatic beast dragging a figure beneath the waves adorns the ivory of a whelming scrimshaw. When you Activate this item, you break it and choose one creature within 30 feet. The target must attempt a Fortitude 30 save; amphibious and aquatic creatures are immune.\n\n**Critical Success** The creature is unaffected.\n\n**Success** The target becomes sickened 1 and unable to breathe until this sickened condition ends.\n\n**Failure** As success, but sickened 2.\n\n**Critical Failure** As success, but sickened 3."
        }
      ],
      "evidence": {
        "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2130",
        "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4663"
      }
    }
  ],
  "dependencies": [
    {
      "table": "trait",
      "id": 1447,
      "name": "Illusion",
      "source": 3,
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
        "companion_type_trait"
      ]
    },
    {
      "table": "trait",
      "id": 1529,
      "name": "Alchemical",
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
      "id": 1481,
      "name": "Incapacitation",
      "source": 3,
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
        "class_trait",
        "ancestry_trait",
        "archetype_trait",
        "versatile_heritage_trait",
        "companion_type_trait",
        "creature_trait"
      ]
    },
    {
      "table": "trait",
      "id": 1519,
      "name": "Cold",
      "source": 3,
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
        "deprecated"
      ]
    },
    {
      "table": "trait",
      "id": 2131,
      "name": "Olfactory",
      "source": 3,
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
        "class_trait",
        "ancestry_trait",
        "archetype_trait",
        "versatile_heritage_trait",
        "companion_type_trait",
        "creature_trait"
      ]
    },
    {
      "table": "trait",
      "id": 1520,
      "name": "Attack",
      "source": 3,
      "expected": {
        "id": 1520,
        "name": "Attack",
        "description": "An ability with this trait involves an attack. For each attack you make beyond the first on your turn, you take a multiple attack penalty.",
        "content_source_id": 3,
        "uuid": "1285342290589006"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=540",
          "book": "Player Core",
          "page": "452"
        },
        "important": true
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "class_trait",
        "ancestry_trait",
        "archetype_trait",
        "versatile_heritage_trait",
        "companion_type_trait",
        "creature_trait"
      ]
    },
    {
      "table": "trait",
      "id": 1564,
      "name": "Injury",
      "source": 3,
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
        "deprecated"
      ]
    },
    {
      "table": "trait",
      "id": 1448,
      "name": "Mental",
      "source": 3,
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
        "companion_type_trait"
      ]
    },
    {
      "table": "trait",
      "id": 1855,
      "name": "Curse",
      "source": 3,
      "expected": {
        "id": 1855,
        "name": "Curse",
        "description": "A curse is an effect that places some long-term affliction on a creature. Curses are always [magical](link_trait_1504) and are typically the result of a spell or [trap](link_trait_1541). Effects with this trait can be removed only by effects that specifically target curses.",
        "content_source_id": 3,
        "uuid": "4723231793974020"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=566",
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
    }
  ],
  "sources": [
    {
      "id": 3,
      "name": "Common Core",
      "user_id": null,
      "is_published": true,
      "group": "common-core",
      "required_content_sources": []
    },
    {
      "id": 16,
      "name": "Treasure Vault",
      "user_id": null,
      "is_published": true,
      "group": "pathfinder-core",
      "required_content_sources": [
        1
      ]
    }
  ]
}$headers$::jsonb;
  prose constant jsonb := $prose${
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
}$prose$::jsonb;
  prose_patch jsonb; prose_state jsonb; prose_source jsonb; prose_source_row jsonb;
  prose_dependency jsonb; prose_dependency_row jsonb;
  prose_saved jsonb; prose_current jsonb;
  prose_source_captured jsonb := '{}'::jsonb; prose_dependency_captured jsonb := '{}'::jsonb;
  source_spec jsonb; source_row jsonb; dependency jsonb; dependency_row jsonb;
  patch jsonb; item_row public.item%rowtype; actual_state jsonb; state jsonb;
  captured_rows jsonb := '{}'::jsonb; expected_terminal jsonb := '{}'::jsonb;
  expected_after jsonb; saved_after jsonb; changed_rows integer;
begin
  lock table public.content_update in share mode;
  if jsonb_array_length(spec->'items')<>8 or jsonb_array_length(spec->'dependencies')<>9
    or jsonb_array_length(spec->'sources')<>2
    or (select count(distinct value->>'id') from jsonb_array_elements(spec->'items'))<>8
    then raise exception 'Invalid reviewed equipment header scope'; end if;
  -- These gates remain before every original, successor and already-terminal recognition.
  if jsonb_array_length(prose->'items')<>4 or jsonb_array_length(prose->'dependencies')<>23
    or jsonb_array_length(prose->'sources')<>3
    or (select count(distinct (p->>'table',p->>'id')) from jsonb_array_elements(prose->'dependencies') p)<>23
    or (select count(distinct p->>'id') from jsonb_array_elements(prose->'sources') p)<>3
    or (select array_agg((p->>'id')::bigint order by (p->>'id')::bigint) from jsonb_array_elements(prose->'items') p) is distinct from array[11901,12024,12507,12709]::bigint[]
    then raise exception 'Invalid reviewed equipment prose scope'; end if;
  for prose_patch in select value from jsonb_array_elements(prose->'items') loop
    if md5(prose_patch#>>'{after,description}') is distinct from prose_patch#>>'{hashes,after}'
      or jsonb_array_length(prose_patch->'before_states')<>jsonb_array_length(prose_patch#>'{hashes,before}')
      then raise exception 'Invalid equipment prose successor literal: %',prose_patch->>'id'; end if;
    for prose_state in select value from jsonb_array_elements(prose_patch->'before_states') with ordinality s(value,index) where md5(value->>'description') is distinct from prose_patch#>>array['hashes','before',(index-1)::text] loop
      raise exception 'Invalid equipment prose predecessor literal: %',prose_patch->>'id';
    end loop;
  end loop;
  -- Ordinary single-row writers lock children before the unchanged source-cache trigger.
  -- This pure initial pass precedes every source lock; original validation still follows.
  for patch in select value from jsonb_array_elements(spec->'items') order by (value->>'id')::bigint loop
    perform 1 from public.item where id=(patch->>'id')::bigint for update;
    if not found then raise exception 'Equipment header owner missing during initial child lock: %',patch->>'id'; end if;
  end loop;
  for dependency in select value from jsonb_array_elements(spec->'dependencies') order by (value->>'id')::bigint loop
    perform 1 from public.trait where id=(dependency->>'id')::bigint for share;
    if not found then raise exception 'Equipment header trait missing during initial child lock: %',dependency->>'id'; end if;
  end loop;
  for prose_dependency in select value from jsonb_array_elements(prose->'dependencies') order by value->>'table',(value->>'id')::bigint loop
    if prose_dependency->>'table'='trait' then
      perform 1 from public.trait where id=(prose_dependency->>'id')::bigint for share;
    elsif prose_dependency->>'table'='ability_block' then
      perform 1 from public.ability_block where id=(prose_dependency->>'id')::bigint for share;
    elsif prose_dependency->>'table'='item' then
      perform 1 from public.item where id=(prose_dependency->>'id')::bigint for share;
    else raise exception 'Invalid equipment prose initial dependency lock table'; end if;
    if not found then raise exception 'Equipment prose dependency missing during initial lock: %/%',prose_dependency->>'table',prose_dependency->>'id'; end if;
  end loop;
  for prose_source in select value from jsonb_array_elements(prose->'sources') order by (value->>'id')::bigint loop
    select to_jsonb(s) into prose_source_row from public.content_source s where s.id=(prose_source->>'id')::bigint for update;
    if not found or exists(select 1 from jsonb_each(prose_source) e where prose_source_row->e.key is distinct from e.value)
      then raise exception 'Equipment prose official source drift: %',prose_source->>'id'; end if;
    prose_source_captured:=jsonb_set(prose_source_captured,array[prose_source->>'id'],prose_source_row-'updated_at'-'search_tsv',true);
    if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and u.type='content-source' and (u.ref_id=(prose_source->>'id')::bigint or u.data->>'id'=prose_source->>'id' or u.data->>'name'=prose_source->>'name'))
      then raise exception 'Equipment prose source has unresolved curator submission: %',prose_source->>'id'; end if;
  end loop;
  for prose_dependency in select value from jsonb_array_elements(prose->'dependencies') order by value->>'table',(value->>'id')::bigint loop
    if prose_dependency->>'table'='trait' then
      select to_jsonb(t)||jsonb_build_object('uuid',t.uuid::text) into prose_dependency_row from public.trait t where t.id=(prose_dependency->>'id')::bigint for share;
    elsif prose_dependency->>'table'='ability_block' then
      select to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text) into prose_dependency_row from public.ability_block a where a.id=(prose_dependency->>'id')::bigint for share;
    elsif prose_dependency->>'table'='item' then
      select to_jsonb(i)||jsonb_build_object('uuid',i.uuid::text) into prose_dependency_row from public.item i where i.id=(prose_dependency->>'id')::bigint for share;
    else raise exception 'Invalid equipment prose dependency table'; end if;
    if not found or jsonb_typeof(prose_dependency_row->'meta_data') is distinct from 'object'
      or exists(select 1 from jsonb_each(prose_dependency->'expected') e where prose_dependency_row->e.key is distinct from e.value)
      or exists(select 1 from jsonb_each(prose_dependency->'metadata') e where prose_dependency_row#>array['meta_data',e.key] is distinct from e.value)
      or exists(select 1 from jsonb_array_elements_text(prose_dependency->'metadata_absent') k(key) where prose_dependency_row->'meta_data'?k.key)
      then raise exception 'Equipment prose dependency drift: %/%',prose_dependency->>'table',prose_dependency->>'id'; end if;
    prose_dependency_captured:=jsonb_set(prose_dependency_captured,array[(prose_dependency->>'table')||':'||(prose_dependency->>'id')],prose_dependency_row-'updated_at'-'search_tsv',true);
    if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and u.type=prose_dependency->>'type' and (u.ref_id=(prose_dependency->>'id')::bigint or u.data->>'id'=prose_dependency->>'id' or u.data->>'uuid'=prose_dependency#>>'{expected,uuid}' or ((u.content_source_id=(prose_dependency#>>'{expected,content_source_id}')::bigint or u.data->>'content_source_id'=prose_dependency#>>'{expected,content_source_id}') and u.data->>'name'=prose_dependency#>>'{expected,name}')))
      then raise exception 'Equipment prose dependency has unresolved curator submission: %/%',prose_dependency->>'table',prose_dependency->>'id'; end if;
  end loop;
  for source_spec in select value from jsonb_array_elements(spec->'sources') order by (value->>'id')::bigint loop
    select to_jsonb(s) into source_row from public.content_source s where s.id=(source_spec->>'id')::bigint for update;
    if not found or exists(select 1 from jsonb_each(source_spec) e where source_row->e.key is distinct from e.value)
      then raise exception 'Missing or changed official equipment header source: %',source_spec->>'id'; end if;
    if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and u.type='content-source' and (u.ref_id=(source_spec->>'id')::bigint or u.data->>'id'=source_spec->>'id' or (u.ref_id is null and u.data->>'name'=source_spec->>'name')))
      then raise exception 'Equipment header source has a pending curator submission: %',source_spec->>'id'; end if;
  end loop;
  for dependency in select value from jsonb_array_elements(spec->'dependencies') order by (value->>'id')::bigint loop
    select to_jsonb(t)||jsonb_build_object('uuid',t.uuid::text) into dependency_row from public.trait t where t.id=(dependency->>'id')::bigint for share;
    if not found or jsonb_typeof(dependency_row->'meta_data') is distinct from 'object'
      or exists(select 1 from jsonb_each(dependency->'expected') e where dependency_row->e.key is distinct from e.value)
      or exists(select 1 from jsonb_each(dependency->'metadata') e where dependency_row#>array['meta_data',e.key] is distinct from e.value)
      or exists(select 1 from jsonb_array_elements_text(dependency->'metadata_absent') k(key) where dependency_row->'meta_data'?k.key)
      then raise exception 'Equipment header trait differs from reviewed entry: %',dependency->>'id'; end if;
    if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and u.type='trait' and (u.ref_id=(dependency->>'id')::bigint or u.data->>'id'=dependency->>'id' or u.data->>'uuid'=dependency#>>'{expected,uuid}' or ((u.content_source_id=(dependency->>'source')::bigint or u.data->>'content_source_id'=dependency->>'source') and u.data->>'name'=dependency->>'name')))
      then raise exception 'Equipment header trait has a pending curator submission: %',dependency->>'id'; end if;
  end loop;
  -- Lock and capture every validated owner before any write, including already-terminal rows.
  for patch in select value from jsonb_array_elements(spec->'items') order by (value->>'id')::bigint loop
    select * into item_row from public.item where id=(patch->>'id')::bigint for update;
    if not found then raise exception 'Equipment header owner missing: %',patch->>'id'; end if;
    if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and u.type='item' and (u.ref_id=item_row.id or u.data->>'id'=item_row.id::text or u.data->>'uuid'=item_row.uuid::text or ((u.content_source_id=item_row.content_source_id or u.data->>'content_source_id'=item_row.content_source_id::text) and u.data->>'name'=item_row.name)))
      then raise exception 'Equipment header item has a pending curator submission: %',patch->>'id'; end if;
    for state in select value from jsonb_array_elements(patch->'descriptions') loop
      if md5(state->>'text') is distinct from state->>'md5'
        then raise exception 'Invalid equipment header description hash: %',patch->>'id'; end if;
    end loop;
    select value into prose_patch from jsonb_array_elements(prose->'items') where value->>'id'=patch->>'id';
    if prose_patch is not null then
    if not found or jsonb_typeof(item_row.meta_data) is distinct from 'object'
      or exists(select 1 from jsonb_each(prose_patch->'expected') e where (to_jsonb(item_row)||jsonb_build_object('uuid',item_row.uuid::text))->e.key is distinct from e.value)
      or exists(select 1 from jsonb_each(prose_patch->'metadata') e where item_row.meta_data->e.key is distinct from e.value)
      or exists(select 1 from jsonb_array_elements_text(prose_patch->'metadata_absent') k(key) where item_row.meta_data?k.key)
      then raise exception 'Equipment prose owner identity or mechanics drift: %',prose_patch->>'id'; end if;
    if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and u.type='item' and (u.ref_id=item_row.id or u.data->>'id'=item_row.id::text or u.data->>'uuid'=item_row.uuid::text or ((u.content_source_id=item_row.content_source_id or u.data->>'content_source_id'=item_row.content_source_id::text) and u.data->>'name'=item_row.name))) then raise exception 'Equipment prose owner has unresolved curator submission: %',prose_patch->>'id'; end if;
    prose_current:=jsonb_build_object('traits',item_row.traits,'usage',item_row.usage,'description',item_row.description,'craft_requirements',item_row.craft_requirements,'source',item_row.meta_data->'source');
    if prose_current is distinct from prose_patch->'after'
      and not exists(select 1 from jsonb_array_elements(prose_patch->'legacy_states') s where s=prose_current)
      then raise exception 'Unreviewed equipment prose coupled tuple: %',prose_patch->>'id'; end if;
      if prose_current=prose_patch->'after' then
        -- Capture the exact terminal successor; never overlay the old header after leaves.
        captured_rows:=jsonb_set(captured_rows,array[patch->>'id'],to_jsonb(item_row)-'updated_at'-'search_tsv',true);
        expected_terminal:=jsonb_set(expected_terminal,array[patch->>'id'],captured_rows->(patch->>'id'),true);
        continue;
      end if;
    end if;
    if item_row.id is null or exists(select 1 from jsonb_each(patch->'expected') e where (to_jsonb(item_row)||jsonb_build_object('uuid',item_row.uuid::text))->e.key is distinct from e.value)
      or jsonb_typeof(item_row.meta_data) is distinct from 'object'
      or exists(select 1 from jsonb_each(patch->'metadata') e where item_row.meta_data->e.key is distinct from e.value)
      or exists(select 1 from jsonb_array_elements_text(patch->'metadata_absent') k(key) where item_row.meta_data?k.key)
      then raise exception 'Equipment header identity or mechanics differ from reviewed entry: %',patch->>'id'; end if;
    actual_state:=(select jsonb_object_agg(k.key,to_jsonb(item_row)->k.key) from jsonb_object_keys(patch->'before') k(key))||jsonb_build_object('description',item_row.description);
    if not exists(select 1 from jsonb_array_elements((patch->'before_states')||(patch->'after_states')) s(value) where s.value=actual_state)
      then raise exception 'Unreviewed equipment header coupled state: %',patch->>'id'; end if;
    captured_rows:=jsonb_set(captured_rows,array[patch->>'id'],to_jsonb(item_row)-'updated_at'-'search_tsv',true);
    expected_terminal:=jsonb_set(expected_terminal,array[patch->>'id'],(captured_rows->(patch->>'id'))||(patch->'after'),true);
  end loop;
  for patch in select value from jsonb_array_elements(spec->'items') order by (value->>'id')::bigint loop
    select * into item_row from public.item where id=(patch->>'id')::bigint;
    if not found or (to_jsonb(item_row)-'updated_at'-'search_tsv') is distinct from captured_rows->(patch->>'id')
      then raise exception 'Equipment header captured baseline changed before write: %',patch->>'id'; end if;
    expected_after:=expected_terminal->(patch->>'id');
    if (to_jsonb(item_row)-'updated_at'-'search_tsv')=expected_after then continue; end if;
    update public.item i set
      traits=array(select jsonb_array_elements_text(patch#>'{after,traits}')::bigint),
      usage=(case when patch->'after'?'usage' then patch#>>'{after,usage}' else i.usage end),
      bulk=(case when patch->'after'?'bulk' then patch#>>'{after,bulk}' else i.bulk end)
      where i.id=item_row.id and (to_jsonb(i)-'updated_at'-'search_tsv') is not distinct from captured_rows->(patch->>'id');
    get diagnostics changed_rows=row_count;
    if changed_rows<>1 then raise exception 'Equipment header CAS failed: %',patch->>'id'; end if;
    select to_jsonb(i)-'updated_at'-'search_tsv' into saved_after from public.item i where i.id=item_row.id;
    if saved_after is distinct from expected_after then raise exception 'Equipment header readback changed unrelated data: %',patch->>'id'; end if;
  end loop;
  -- Later writes cannot silently invalidate an earlier repaired or already-terminal owner.
  for patch in select value from jsonb_array_elements(spec->'items') order by (value->>'id')::bigint loop
    select to_jsonb(i)-'updated_at'-'search_tsv' into saved_after from public.item i where i.id=(patch->>'id')::bigint;
    if not found or saved_after is distinct from expected_terminal->(patch->>'id')
      then raise exception 'Equipment header final captured readback changed: %',patch->>'id'; end if;
  end loop;
  -- Cache timestamps may advance; every other source/dependency field must remain unchanged.
  for prose_source in select value from jsonb_array_elements(prose->'sources') loop
    select to_jsonb(s)-'updated_at'-'search_tsv' into prose_saved from public.content_source s where s.id=(prose_source->>'id')::bigint;
    if not found or prose_saved is distinct from prose_source_captured->(prose_source->>'id') then raise exception 'Equipment prose source final readback drift: %',prose_source->>'id'; end if;
  end loop;
  for prose_dependency in select value from jsonb_array_elements(prose->'dependencies') loop
    if prose_dependency->>'table'='trait' then
      select (to_jsonb(t)||jsonb_build_object('uuid',t.uuid::text))-'updated_at'-'search_tsv' into prose_saved from public.trait t where t.id=(prose_dependency->>'id')::bigint;
    elsif prose_dependency->>'table'='ability_block' then
      select (to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text))-'updated_at'-'search_tsv' into prose_saved from public.ability_block a where a.id=(prose_dependency->>'id')::bigint;
    elsif prose_dependency->>'table'='item' then
      select (to_jsonb(i)||jsonb_build_object('uuid',i.uuid::text))-'updated_at'-'search_tsv' into prose_saved from public.item i where i.id=(prose_dependency->>'id')::bigint;
    else raise exception 'Invalid equipment prose final dependency table'; end if;
    if not found or prose_saved is distinct from prose_dependency_captured->((prose_dependency->>'table')||':'||(prose_dependency->>'id')) then raise exception 'Equipment prose dependency final readback drift: %/%',prose_dependency->>'table',prose_dependency->>'id'; end if;
  end loop;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
