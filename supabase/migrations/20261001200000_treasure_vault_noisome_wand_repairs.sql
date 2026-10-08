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
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((p.prosrc)::text,'UTF8')),'hex')='c55d729fca4f5b25a0c725305b5d2939e49c28e3e5ecb706a909e530708bb126'
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
  execute $historical_original_dual$-- Four reviewed Noisome tiers; existing saved copies and passive operations remain unchanged.
do $repair$
declare
  spec constant jsonb := $noisome${
  "items": [
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
  ],
  "dependencies": [
    {
      "table": "ability-block",
      "id": 19611,
      "name": "Cast a Spell",
      "source": 3,
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
        "description": "Spells can vary in how many actions they take, as shown in the spell’s stat block. You cast cantrips, spells from spell slots, and focus spells using the same process, but must expend the spell when casting a spell from a spell slot and must spend 1 Focus Point to cast a focus spell. Some rules will refer to the Cast a Spell activity, such as “if the next action you use is to Cast a Spell.” Any spell qualifies as a Cast a Spell activity, and any characteristics of the spell use those of the specific spell you’re casting.\n\n### **Costs and Loci**\n\nSome spells require you to pay a cost or provide a locus. If the spell lists a cost, you must have the listed money, valuable materials, or other resources to cast the spell (such as gems or magical reagents), and they're expended during the casting.\n\nA locus is an object that funnels or directs the magical energy of the spell but is not consumed in its casting. As part of Casting the Spell, you retrieve the locus (if necessary, and if you have a free hand), and you can put it away again if you so choose. Loci tend to be expensive, and you need to acquire them in advance to cast the spell, but they aren't expended like costs are. Unless noted otherwise, a locus has negligible Bulk.\n\n### **Long Casting Times**\n\nSome spells take minutes or hours to cast. You can’t use other actions or reactions while casting such a spell, though at the GM’s discretion, you might be able to speak a few sentences. As with other activities that take a long time, these spells have the exploration trait, and you can’t cast them in an encounter. If combat breaks out while you’re casting one, your spell is disrupted.\n\n### **Disrupted and Lost Spells**\n\nSome abilities and spells can disrupt a spell, causing it to have no effect and be lost. When you lose a spell, you’ve already expended the spell slot and spent the spell’s costs and actions. If a spell is disrupted during a [Sustain](link_action_19858) action, the spell immediately ends.",
        "special": null,
        "type": "action",
        "traits": [],
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "3222895456836016",
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
        "focus",
        "type",
        "ritual",
        "source"
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
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "id": 1528,
      "name": "Acid",
      "source": 3,
      "expected": {
        "id": 1528,
        "name": "Acid",
        "description": "Effects with this trait deal acid damage. Creatures with this trait have a [magical](link_trait_1504) connection to acid.",
        "content_source_id": 3,
        "uuid": "3270346089098991"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=524",
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
      "table": "spell",
      "id": 4389,
      "name": "Acid Grip",
      "source": 3,
      "expected": {
        "id": 4389,
        "name": "Acid Grip",
        "rank": 2,
        "traditions": [
          "arcane",
          "primal"
        ],
        "rarity": "COMMON",
        "cast": "TWO-ACTIONS",
        "traits": [
          1528,
          1432,
          1433
        ],
        "defense": "Reflex",
        "cost": "",
        "trigger": null,
        "requirements": null,
        "range": "120 feet",
        "area": null,
        "targets": "1 creature",
        "duration": "",
        "description": "An ephemeral, taloned hand grips the target, burning it with magical acid. The target takes 2d8 acid damage plus 1d6 persistent acid damage depending on its Reflex save. A creature taking persistent damage from this spell takes a –10-foot status penalty to its Speeds.\n\n**Critical Success** The creature is unaffected.\n\n**Success** The creature takes half damage and no persistent damage, and the claw moves it up to 5 feet in a direction of your choice.\n\n**Failure** The creature takes full damage and persistent damage, and the claw moves it up to 10 feet in a direction of your choice.\n\n**Critical Failure** The creature takes double damage and full persistent damage, and the claw moves it up to 20 feet in a direction of your choice.",
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "7608123697809062",
        "heightened": {
          "text": [
            {
              "amount": "(+2)",
              "text": "The initial damage increases by 2d8, and the persistent acid damage increases by 1d6."
            }
          ],
          "data": {
            "damage": {
              "YBeTuItHduzXElD5": "2d8"
            },
            "interval": 2,
            "type": "interval"
          }
        },
        "availability": null
      },
      "metadata": {
        "damage": [],
        "source": {
          "url": "https://2e.aonprd.com/Spells.aspx?ID=1436",
          "book": "Player Core",
          "page": "314"
        },
        "foundry": {
          "rules": [],
          "is_focus": false
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "focus",
        "type",
        "ritual"
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
}$noisome$::jsonb;
  source_spec jsonb; source_row jsonb; dependency jsonb; dependency_row jsonb;
  patch jsonb; item_row public.item%rowtype; actual_state jsonb; state jsonb; leaf text;
  changed_rows integer; expected_after jsonb; saved_after jsonb;
  captured_rows jsonb := '{}'::jsonb; expected_terminal jsonb := '{}'::jsonb;
begin
  lock table public.content_update in share mode;
  -- Acquire reviewed content rows before source cache locks.
  perform a.id from public.ability_block a where a.id in (
    select (d->>'id')::bigint from jsonb_array_elements(spec->'dependencies') d
    where d->>'table' = 'ability-block'
  ) order by a.id for share;
  perform i.id from public.item i where i.id in (
    select (p->>'id')::bigint from jsonb_array_elements(spec->'items') p
  ) order by i.id for update;
  perform s.id from public.spell s where s.id in (
    select (d->>'id')::bigint from jsonb_array_elements(spec->'dependencies') d
    where d->>'table' = 'spell'
  ) order by s.id for share;
  perform t.id from public.trait t where t.id in (
    select (d->>'id')::bigint from jsonb_array_elements(spec->'dependencies') d
    where d->>'table' = 'trait'
  ) order by t.id for share;
  -- End reviewed content row prelocks.
  if jsonb_array_length(spec->'items')<>4 or jsonb_array_length(spec->'dependencies')<>4
    or jsonb_array_length(spec->'sources')<>2
    or (select count(distinct value->>'id') from jsonb_array_elements(spec->'items'))<>4 then raise exception 'Invalid reviewed Noisome scope'; end if;
  for source_spec in select value from jsonb_array_elements(spec->'sources') order by (value->>'id')::bigint loop
    select to_jsonb(s) into source_row from public.content_source s where s.id=(source_spec->>'id')::bigint for update;
    if not found or exists(select 1 from jsonb_each(source_spec) e where source_row->e.key is distinct from e.value) then raise exception 'Missing or changed official Noisome source: %',source_spec->>'id'; end if;
    if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and u.type='content-source' and (u.ref_id=(source_spec->>'id')::bigint or u.data->>'id'=source_spec->>'id' or (u.ref_id is null and u.data->>'name'=source_spec->>'name'))) then raise exception 'Noisome source has a pending curator submission: %',source_spec->>'id'; end if;
  end loop;
  for dependency in select value from jsonb_array_elements(spec->'dependencies') order by value->>'table',(value->>'id')::bigint loop
    dependency_row:=null;
    case dependency->>'table'
      when 'spell' then select to_jsonb(s)||jsonb_build_object('uuid',s.uuid::text) into dependency_row from public.spell s where s.id=(dependency->>'id')::bigint for share;
      when 'ability-block' then select to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text) into dependency_row from public.ability_block a where a.id=(dependency->>'id')::bigint for share;
      when 'trait' then select to_jsonb(t)||jsonb_build_object('uuid',t.uuid::text) into dependency_row from public.trait t where t.id=(dependency->>'id')::bigint for share;
      else raise exception 'Invalid Noisome dependency type';
    end case;
    if dependency_row is null or jsonb_typeof(dependency_row->'meta_data') is distinct from 'object'
      or exists(select 1 from jsonb_each(dependency->'expected') e where dependency_row->e.key is distinct from e.value)
      or exists(select 1 from jsonb_each(dependency->'metadata') e where dependency_row#>array['meta_data',e.key] is distinct from e.value)
      or exists(select 1 from jsonb_array_elements_text(dependency->'metadata_absent') k(key) where dependency_row->'meta_data'?k.key) then raise exception 'Noisome dependency differs from reviewed entry: %',dependency->>'id'; end if;
    if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and u.type=dependency->>'table' and (u.ref_id=(dependency->>'id')::bigint or u.data->>'id'=dependency->>'id' or u.data->>'uuid'=dependency#>>'{expected,uuid}' or ((u.content_source_id=(dependency->>'source')::bigint or u.data->>'content_source_id'=dependency->>'source') and u.data->>'name'=dependency->>'name'))) then raise exception 'Noisome dependency has a pending curator submission: %',dependency->>'id'; end if;
  end loop;
  -- Validate and lock every complete H/S owner before the first write.
  for patch in select value from jsonb_array_elements(spec->'items') order by (value->>'id')::bigint loop
    select * into item_row from public.item where id=(patch->>'id')::bigint for update;
    if not found or exists(select 1 from jsonb_each(patch->'expected') e where (to_jsonb(item_row)||jsonb_build_object('uuid',item_row.uuid::text))->e.key is distinct from e.value) or jsonb_typeof(item_row.meta_data) is distinct from 'object' or exists(select 1 from jsonb_array_elements_text(patch->'metadata_absent') k(key) where item_row.meta_data?k.key) then raise exception 'Noisome identity or mechanics differ from reviewed entry: %',patch->>'id'; end if;
    if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and u.type='item' and (u.ref_id=item_row.id or u.data->>'id'=item_row.id::text or u.data->>'uuid'=item_row.uuid::text or ((u.content_source_id=item_row.content_source_id or u.data->>'content_source_id'=item_row.content_source_id::text) and u.data->>'name'=item_row.name))) then raise exception 'Noisome item has a pending curator submission: %',patch->>'id'; end if;
    for state in select value from jsonb_array_elements(jsonb_build_array(patch->'before',patch->'after')) loop
      foreach leaf in array array['description','craft_requirements'] loop
        if md5(state->>leaf) is distinct from patch#>>array['hashes',leaf,(case when state=patch->'before' then 'before' else 'after' end)] then raise exception 'Invalid Noisome reviewed hash: %',patch->>'id'; end if;
      end loop;
    end loop;
    actual_state:=jsonb_build_object('description',item_row.description,'craft_requirements',item_row.craft_requirements,'source',item_row.meta_data->'source');
    if actual_state is distinct from patch->'before' and actual_state is distinct from patch->'after' then raise exception 'Unreviewed Noisome coupled state: %',patch->>'id'; end if;
    captured_rows:=jsonb_set(captured_rows,array[patch->>'id'],to_jsonb(item_row)-'updated_at'-'search_tsv',true);
    expected_terminal:=jsonb_set(expected_terminal,array[patch->>'id'],
      (captured_rows->(patch->>'id'))||jsonb_build_object('description',patch#>>'{after,description}','craft_requirements',patch#>>'{after,craft_requirements}','meta_data',jsonb_set(item_row.meta_data,'{source}',patch#>'{after,source}',true)),true);
  end loop;
  for patch in select value from jsonb_array_elements(spec->'items') order by (value->>'id')::bigint loop
    select * into item_row from public.item where id=(patch->>'id')::bigint;
    if not found or (to_jsonb(item_row)-'updated_at'-'search_tsv') is distinct from captured_rows->(patch->>'id') then raise exception 'Noisome captured baseline changed before write: %',patch->>'id'; end if;
    if jsonb_build_object('description',item_row.description,'craft_requirements',item_row.craft_requirements,'source',item_row.meta_data->'source')=patch->'after' then continue; end if;
    expected_after:=expected_terminal->(patch->>'id');
    update public.item i set description=patch#>>'{after,description}',craft_requirements=patch#>>'{after,craft_requirements}',meta_data=jsonb_set(i.meta_data,'{source}',patch#>'{after,source}',true)
      where i.id=item_row.id and (to_jsonb(i)-'updated_at'-'search_tsv') is not distinct from captured_rows->(patch->>'id');
    get diagnostics changed_rows=row_count;
    if changed_rows<>1 then raise exception 'Noisome CAS failed: %',patch->>'id'; end if;
    select to_jsonb(i)-'updated_at'-'search_tsv' into saved_after from public.item i where i.id=item_row.id;
    if saved_after is distinct from expected_after then raise exception 'Noisome readback changed unrelated data: %',patch->>'id'; end if;
  end loop;
  -- A later write must not invalidate an earlier repaired or already-terminal owner.
  for patch in select value from jsonb_array_elements(spec->'items') order by (value->>'id')::bigint loop
    select to_jsonb(i)-'updated_at'-'search_tsv' into saved_after from public.item i where i.id=(patch->>'id')::bigint;
    if not found or saved_after is distinct from expected_terminal->(patch->>'id') then raise exception 'Noisome final captured readback changed: %',patch->>'id'; end if;
  end loop;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
