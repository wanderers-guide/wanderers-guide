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
  execute $historical_original_dual$-- Only 13 reviewed wand tier leaves. No shared-spell, runtime, saved-copy or source-name rewrite.
do $repair$
declare
  spec constant jsonb := $wandfamilies${
  "items": [
    {
      "id": 12600,
      "family": "rime",
      "rank": 7,
      "spell_id": 8891,
      "expected": {
        "id": 12600,
        "bulk": "0.1",
        "name": "Wand of Clinging Rime (7th-level)",
        "size": "MEDIUM",
        "uuid": "570631861696589",
        "group": "GENERAL",
        "hands": null,
        "level": 16,
        "price": {
          "gp": 10000
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "version": "1.0",
        "operations": null,
        "availability": null,
        "content_source_id": 16
      },
      "before": {
        "description": "A thin layer of frost coats this gnarled holly wand.\n\n**Activate** Cast a Spell\n\n**Effect** You cast 7th-rank \\[\\[Frigid Flurry\\]\\]. After you cast the spell, the ice crystals freeze to flesh and other surfaces, clinging to the creatures in the area. Each creature that fails its save takes 1d6 persistent,cold damage.",
        "craft_requirements": "Supply a casting of [[Frigid Flurry]] of the appropriate rank.",
        "traits": [
          1519,
          1504,
          1665,
          1584
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4808",
          "book": "Treasure Vault",
          "page": "139"
        }
      },
      "after": {
        "description": "A thin layer of frost coats this gnarled holly wand.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 7th-rank *[frigid flurry](link_spell_8891)*. After you cast the spell, the ice crystals freeze to flesh and other surfaces, clinging to the creatures in the area. Each creature that fails its save takes 1d6 persistent cold damage.",
        "craft_requirements": "Supply a casting of *[frigid flurry](link_spell_8891)* of the appropriate rank.",
        "traits": [
          1519,
          1504,
          1665,
          1584
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2274",
          "book": "Treasure Vault (Remastered)",
          "page": "139"
        }
      },
      "hashes": {
        "description": {
          "before": "55dc5c7fc9d144794fcf979aa695ccfd",
          "after": "9b064e2e6512fd6da652358d673abf08"
        },
        "craft_requirements": {
          "before": "42f458be123ee11d026f901076583031",
          "after": "315c4bbe9998524d5f7ab7072bddd8de"
        }
      }
    },
    {
      "id": 12601,
      "family": "rime",
      "rank": 8,
      "spell_id": 8891,
      "expected": {
        "id": 12601,
        "bulk": "0.1",
        "name": "Wand of Clinging Rime (8th-level)",
        "size": "MEDIUM",
        "uuid": "5745361874509162",
        "group": "GENERAL",
        "hands": null,
        "level": 18,
        "price": {
          "gp": 24000
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "version": "1.0",
        "operations": null,
        "availability": null,
        "content_source_id": 16
      },
      "before": {
        "description": "A thin layer of frost coats this gnarled holly wand.\n\n**Activate** Cast a Spell\n\n**Effect** You cast 8th-rank \\[\\[Frigid Flurry\\]\\]. After you cast the spell, the ice crystals freeze to flesh and other surfaces, clinging to the creatures in the area. Each creature that fails its save takes 2d6 persistent,cold damage.",
        "craft_requirements": "Supply a casting of [[Frigid Flurry]] of the appropriate rank.",
        "traits": [
          1519,
          1504,
          1665,
          1584
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4808",
          "book": "Treasure Vault",
          "page": "139"
        }
      },
      "after": {
        "description": "A thin layer of frost coats this gnarled holly wand.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 8th-rank *[frigid flurry](link_spell_8891)*. After you cast the spell, the ice crystals freeze to flesh and other surfaces, clinging to the creatures in the area. Each creature that fails its save takes 2d6 persistent cold damage.",
        "craft_requirements": "Supply a casting of *[frigid flurry](link_spell_8891)* of the appropriate rank.",
        "traits": [
          1519,
          1504,
          1665,
          1584
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2274",
          "book": "Treasure Vault (Remastered)",
          "page": "139"
        }
      },
      "hashes": {
        "description": {
          "before": "2b4ea74ba5d422c5b4e4fd50183aadc0",
          "after": "829d95c1ee2d633598cc477d611bd9a6"
        },
        "craft_requirements": {
          "before": "42f458be123ee11d026f901076583031",
          "after": "315c4bbe9998524d5f7ab7072bddd8de"
        }
      }
    },
    {
      "id": 12602,
      "family": "rime",
      "rank": 9,
      "spell_id": 8891,
      "expected": {
        "id": 12602,
        "bulk": "0.1",
        "name": "Wand of Clinging Rime (9th-level)",
        "size": "MEDIUM",
        "uuid": "1114280326880610",
        "group": "GENERAL",
        "hands": null,
        "level": 20,
        "price": {
          "gp": 70000
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "version": "1.0",
        "operations": null,
        "availability": null,
        "content_source_id": 16
      },
      "before": {
        "description": "A thin layer of frost coats this gnarled holly wand.\n\n**Activate** Cast a Spell\n\n**Effect** You cast 9th-rank \\[\\[Frigid Flurry\\]\\]. After you cast the spell, the ice crystals freeze to flesh and other surfaces, clinging to the creatures in the area. Each creature that fails its save takes 3d6 persistent,cold damage.",
        "craft_requirements": "Supply a casting of [[Frigid Flurry]] of the appropriate rank.",
        "traits": [
          1519,
          1504,
          1665,
          1584
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4808",
          "book": "Treasure Vault",
          "page": "139"
        }
      },
      "after": {
        "description": "A thin layer of frost coats this gnarled holly wand.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 9th-rank *[frigid flurry](link_spell_8891)*. After you cast the spell, the ice crystals freeze to flesh and other surfaces, clinging to the creatures in the area. Each creature that fails its save takes 3d6 persistent cold damage.",
        "craft_requirements": "Supply a casting of *[frigid flurry](link_spell_8891)* of the appropriate rank.",
        "traits": [
          1519,
          1504,
          1665,
          1584
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2274",
          "book": "Treasure Vault (Remastered)",
          "page": "139"
        }
      },
      "hashes": {
        "description": {
          "before": "1dc3a38fdf5cfcbf2f52c8f8533f6db5",
          "after": "1604e9ead0cf81d4e8f3a783d5a39ee5"
        },
        "craft_requirements": {
          "before": "42f458be123ee11d026f901076583031",
          "after": "315c4bbe9998524d5f7ab7072bddd8de"
        }
      }
    },
    {
      "id": 12677,
      "family": "flames",
      "rank": 2,
      "spell_id": 4627,
      "expected": {
        "id": 12677,
        "bulk": "0.1",
        "name": "Wand of Rolling Flames (2nd-level)",
        "size": "MEDIUM",
        "uuid": "4272745256535884",
        "group": "GENERAL",
        "hands": null,
        "level": 6,
        "price": {
          "gp": 250
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "version": "1.0",
        "operations": null,
        "availability": null,
        "content_source_id": 16
      },
      "before": {
        "description": "The luminous design of red-orange cracks on this black obsidian wand suggests cooling lava.\n\n**Activate** Cast a Spell\n\n**Effect** You cast 2nd-rank \\[\\[Floating Flame\\]\\]. The ground in the sphere's square and all adjacent squares are coated in rolling flames until the start of your next turn. These are difficult terrain and hazardous terrain. A creature that moves on the ground takes 1 fire damage for every square of rolling flames it moves into. If a creature in the flames doesn't move on its turn, it takes the damage for each of the squares it's in at the end of its turn. The first time you Sustain the Spell each round, the sphere creates rolling flames again in its new location (or the same location if you chose not to move it).",
        "craft_requirements": "Supply a casting of [[Floating Flame]] of the appropriate rank.",
        "traits": [
          1542,
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4823",
          "book": "Treasure Vault",
          "page": "142"
        }
      },
      "after": {
        "description": "The luminous design of red-orange cracks on this black obsidian wand suggests cooling lava.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 2nd-rank *[floating flame](link_spell_4627)*. If you create the flame on the ground, the ground in the sphere's square and all adjacent squares are coated in rolling flames until the start of your next turn. These are difficult terrain and hazardous terrain. A creature that moves on the ground takes 1 [fire](link_trait_1542) damage for every square of rolling flames it moves into. If a creature in the flames doesn't move on its turn, it takes the damage for each of the squares it's in at the end of its turn. The first time you [Sustain](link_action_19858) the Spell each round, the sphere creates rolling flames again in its new location (or the same location if you chose not to move it), provided it's on the ground.",
        "craft_requirements": "Supply a casting of *[floating flame](link_spell_4627)* of the appropriate rank.",
        "traits": [
          1542,
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2289",
          "book": "Treasure Vault (Remastered)",
          "page": "142"
        }
      },
      "hashes": {
        "description": {
          "before": "276a5bcdb4ba17f6ee2d438fd8584495",
          "after": "9fcdb195da4404619b1a8ebfc4cc33e5"
        },
        "craft_requirements": {
          "before": "014d9fa59132d0d48c442280eda857e2",
          "after": "6b6c3b03131d8f6d7e44e357bfea0461"
        }
      }
    },
    {
      "id": 12678,
      "family": "flames",
      "rank": 3,
      "spell_id": 4627,
      "expected": {
        "id": 12678,
        "bulk": "0.1",
        "name": "Wand of Rolling Flames (3rd-level)",
        "size": "MEDIUM",
        "uuid": "5937623084728154",
        "group": "GENERAL",
        "hands": null,
        "level": 8,
        "price": {
          "gp": 500
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "version": "1.0",
        "operations": null,
        "availability": null,
        "content_source_id": 16
      },
      "before": {
        "description": "The luminous design of red-orange cracks on this black obsidian wand suggests cooling lava.\n\n**Activate** Cast a Spell\n\n**Effect** You cast 3rd-rank \\[\\[Floating Flame\\]\\]. The ground in the sphere's square and all adjacent squares are coated in rolling flames until the start of your next turn. These are difficult terrain and hazardous terrain. A creature that moves on the ground takes 2 fire damage for every square of rolling flames it moves into. If a creature in the flames doesn't move on its turn, it takes the damage for each of the squares it's in at the end of its turn. The first time you Sustain the Spell each round, the sphere creates rolling flames again in its new location (or the same location if you chose not to move it).",
        "craft_requirements": "Supply a casting of [[Floating Flame]] of the appropriate rank.",
        "traits": [
          1542,
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4823",
          "book": "Treasure Vault",
          "page": "142"
        }
      },
      "after": {
        "description": "The luminous design of red-orange cracks on this black obsidian wand suggests cooling lava.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 3rd-rank *[floating flame](link_spell_4627)*. If you create the flame on the ground, the ground in the sphere's square and all adjacent squares are coated in rolling flames until the start of your next turn. These are difficult terrain and hazardous terrain. A creature that moves on the ground takes 2 [fire](link_trait_1542) damage for every square of rolling flames it moves into. If a creature in the flames doesn't move on its turn, it takes the damage for each of the squares it's in at the end of its turn. The first time you [Sustain](link_action_19858) the Spell each round, the sphere creates rolling flames again in its new location (or the same location if you chose not to move it), provided it's on the ground.",
        "craft_requirements": "Supply a casting of *[floating flame](link_spell_4627)* of the appropriate rank.",
        "traits": [
          1542,
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2289",
          "book": "Treasure Vault (Remastered)",
          "page": "142"
        }
      },
      "hashes": {
        "description": {
          "before": "c3f788596ba8c6e6dc96aba8880cc6d3",
          "after": "6a073c70814ff3f4b7e2f3fd4f7b769e"
        },
        "craft_requirements": {
          "before": "014d9fa59132d0d48c442280eda857e2",
          "after": "6b6c3b03131d8f6d7e44e357bfea0461"
        }
      }
    },
    {
      "id": 12679,
      "family": "flames",
      "rank": 4,
      "spell_id": 4627,
      "expected": {
        "id": 12679,
        "bulk": "0.1",
        "name": "Wand of Rolling Flames (4th-level)",
        "size": "MEDIUM",
        "uuid": "4027160713300416",
        "group": "GENERAL",
        "hands": null,
        "level": 10,
        "price": {
          "gp": 1000
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "version": "1.0",
        "operations": null,
        "availability": null,
        "content_source_id": 16
      },
      "before": {
        "description": "The luminous design of red-orange cracks on this black obsidian wand suggests cooling lava.\n\n**Activate** Cast a Spell\n\n**Effect** You cast 4th-rank \\[\\[Floating Flame\\]\\]. The ground in the sphere's square and all adjacent squares are coated in rolling flames until the start of your next turn. These are difficult terrain and hazardous terrain. A creature that moves on the ground takes 3 fire damage for every square of rolling flames it moves into. If a creature in the flames doesn't move on its turn, it takes the damage for each of the squares it's in at the end of its turn. The first time you Sustain the Spell each round, the sphere creates rolling flames again in its new location (or the same location if you chose not to move it).",
        "craft_requirements": "Supply a casting of [[Floating Flame]] of the appropriate rank.",
        "traits": [
          1542,
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4823",
          "book": "Treasure Vault",
          "page": "142"
        }
      },
      "after": {
        "description": "The luminous design of red-orange cracks on this black obsidian wand suggests cooling lava.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 4th-rank *[floating flame](link_spell_4627)*. If you create the flame on the ground, the ground in the sphere's square and all adjacent squares are coated in rolling flames until the start of your next turn. These are difficult terrain and hazardous terrain. A creature that moves on the ground takes 3 [fire](link_trait_1542) damage for every square of rolling flames it moves into. If a creature in the flames doesn't move on its turn, it takes the damage for each of the squares it's in at the end of its turn. The first time you [Sustain](link_action_19858) the Spell each round, the sphere creates rolling flames again in its new location (or the same location if you chose not to move it), provided it's on the ground.",
        "craft_requirements": "Supply a casting of *[floating flame](link_spell_4627)* of the appropriate rank.",
        "traits": [
          1542,
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2289",
          "book": "Treasure Vault (Remastered)",
          "page": "142"
        }
      },
      "hashes": {
        "description": {
          "before": "a2696af7b557fe9284d8ed920e2bf56c",
          "after": "050e8bd5752d928699b1298f7942276e"
        },
        "craft_requirements": {
          "before": "014d9fa59132d0d48c442280eda857e2",
          "after": "6b6c3b03131d8f6d7e44e357bfea0461"
        }
      }
    },
    {
      "id": 12680,
      "family": "flames",
      "rank": 5,
      "spell_id": 4627,
      "expected": {
        "id": 12680,
        "bulk": "0.1",
        "name": "Wand of Rolling Flames (5th-level)",
        "size": "MEDIUM",
        "uuid": "1052346310007492",
        "group": "GENERAL",
        "hands": null,
        "level": 12,
        "price": {
          "gp": 2000
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "version": "1.0",
        "operations": null,
        "availability": null,
        "content_source_id": 16
      },
      "before": {
        "description": "The luminous design of red-orange cracks on this black obsidian wand suggests cooling lava.\n\n**Activate** Cast a Spell\n\n**Effect** You cast 5th-rank \\[\\[Floating Flame\\]\\]. The ground in the sphere's square and all adjacent squares are coated in rolling flames until the start of your next turn. These are difficult terrain and hazardous terrain. A creature that moves on the ground takes 4 fire damage for every square of rolling flames it moves into. If a creature in the flames doesn't move on its turn, it takes the damage for each of the squares it's in at the end of its turn. The first time you Sustain the Spell each round, the sphere creates rolling flames again in its new location (or the same location if you chose not to move it).",
        "craft_requirements": "Supply a casting of [[Floating Flame]] of the appropriate rank.",
        "traits": [
          1542,
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4823",
          "book": "Treasure Vault",
          "page": "142"
        }
      },
      "after": {
        "description": "The luminous design of red-orange cracks on this black obsidian wand suggests cooling lava.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 5th-rank *[floating flame](link_spell_4627)*. If you create the flame on the ground, the ground in the sphere's square and all adjacent squares are coated in rolling flames until the start of your next turn. These are difficult terrain and hazardous terrain. A creature that moves on the ground takes 4 [fire](link_trait_1542) damage for every square of rolling flames it moves into. If a creature in the flames doesn't move on its turn, it takes the damage for each of the squares it's in at the end of its turn. The first time you [Sustain](link_action_19858) the Spell each round, the sphere creates rolling flames again in its new location (or the same location if you chose not to move it), provided it's on the ground.",
        "craft_requirements": "Supply a casting of *[floating flame](link_spell_4627)* of the appropriate rank.",
        "traits": [
          1542,
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2289",
          "book": "Treasure Vault (Remastered)",
          "page": "142"
        }
      },
      "hashes": {
        "description": {
          "before": "f7716727e27f35bcbf406041496d1b77",
          "after": "0f206bb0c5b944f7f81a5e5b9f760172"
        },
        "craft_requirements": {
          "before": "014d9fa59132d0d48c442280eda857e2",
          "after": "6b6c3b03131d8f6d7e44e357bfea0461"
        }
      }
    },
    {
      "id": 12681,
      "family": "flames",
      "rank": 6,
      "spell_id": 4627,
      "expected": {
        "id": 12681,
        "bulk": "0.1",
        "name": "Wand of Rolling Flames (6th-level)",
        "size": "MEDIUM",
        "uuid": "8249673081259164",
        "group": "GENERAL",
        "hands": null,
        "level": 14,
        "price": {
          "gp": 4500
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "version": "1.0",
        "operations": null,
        "availability": null,
        "content_source_id": 16
      },
      "before": {
        "description": "The luminous design of red-orange cracks on this black obsidian wand suggests cooling lava.\n\n**Activate** Cast a Spell\n\n**Effect** You cast 6th-rank \\[\\[Floating Flame\\]\\]. The ground in the sphere's square and all adjacent squares are coated in rolling flames until the start of your next turn. These are difficult terrain and hazardous terrain. A creature that moves on the ground takes 5 fire damage for every square of rolling flames it moves into. If a creature in the flames doesn't move on its turn, it takes the damage for each of the squares it's in at the end of its turn. The first time you Sustain the Spell each round, the sphere creates rolling flames again in its new location (or the same location if you chose not to move it).",
        "craft_requirements": "Supply a casting of [[Floating Flame]] of the appropriate rank.",
        "traits": [
          1542,
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4823",
          "book": "Treasure Vault",
          "page": "142"
        }
      },
      "after": {
        "description": "The luminous design of red-orange cracks on this black obsidian wand suggests cooling lava.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 6th-rank *[floating flame](link_spell_4627)*. If you create the flame on the ground, the ground in the sphere's square and all adjacent squares are coated in rolling flames until the start of your next turn. These are difficult terrain and hazardous terrain. A creature that moves on the ground takes 5 [fire](link_trait_1542) damage for every square of rolling flames it moves into. If a creature in the flames doesn't move on its turn, it takes the damage for each of the squares it's in at the end of its turn. The first time you [Sustain](link_action_19858) the Spell each round, the sphere creates rolling flames again in its new location (or the same location if you chose not to move it), provided it's on the ground.",
        "craft_requirements": "Supply a casting of *[floating flame](link_spell_4627)* of the appropriate rank.",
        "traits": [
          1542,
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2289",
          "book": "Treasure Vault (Remastered)",
          "page": "142"
        }
      },
      "hashes": {
        "description": {
          "before": "38374908b6a5a19e05a46ad5e1e68113",
          "after": "003431d0dc4b1ff47bf39b4a3355f0a8"
        },
        "craft_requirements": {
          "before": "014d9fa59132d0d48c442280eda857e2",
          "after": "6b6c3b03131d8f6d7e44e357bfea0461"
        }
      }
    },
    {
      "id": 12682,
      "family": "flames",
      "rank": 7,
      "spell_id": 4627,
      "expected": {
        "id": 12682,
        "bulk": "0.1",
        "name": "Wand of Rolling Flames (7th-level)",
        "size": "MEDIUM",
        "uuid": "6722509049363652",
        "group": "GENERAL",
        "hands": null,
        "level": 16,
        "price": {
          "gp": 10000
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "version": "1.0",
        "operations": null,
        "availability": null,
        "content_source_id": 16
      },
      "before": {
        "description": "The luminous design of red-orange cracks on this black obsidian wand suggests cooling lava.\n\n**Activate** Cast a Spell\n\n**Effect** You cast 7th-rank \\[\\[Floating Flame\\]\\]. The ground in the sphere's square and all adjacent squares are coated in rolling flames until the start of your next turn. These are difficult terrain and hazardous terrain. A creature that moves on the ground takes 6 fire damage for every square of rolling flames it moves into. If a creature in the flames doesn't move on its turn, it takes the damage for each of the squares it's in at the end of its turn. The first time you Sustain the Spell each round, the sphere creates rolling flames again in its new location (or the same location if you chose not to move it).",
        "craft_requirements": "Supply a casting of [[Floating Flame]] of the appropriate rank.",
        "traits": [
          1542,
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4823",
          "book": "Treasure Vault",
          "page": "142"
        }
      },
      "after": {
        "description": "The luminous design of red-orange cracks on this black obsidian wand suggests cooling lava.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 7th-rank *[floating flame](link_spell_4627)*. If you create the flame on the ground, the ground in the sphere's square and all adjacent squares are coated in rolling flames until the start of your next turn. These are difficult terrain and hazardous terrain. A creature that moves on the ground takes 6 [fire](link_trait_1542) damage for every square of rolling flames it moves into. If a creature in the flames doesn't move on its turn, it takes the damage for each of the squares it's in at the end of its turn. The first time you [Sustain](link_action_19858) the Spell each round, the sphere creates rolling flames again in its new location (or the same location if you chose not to move it), provided it's on the ground.",
        "craft_requirements": "Supply a casting of *[floating flame](link_spell_4627)* of the appropriate rank.",
        "traits": [
          1542,
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2289",
          "book": "Treasure Vault (Remastered)",
          "page": "142"
        }
      },
      "hashes": {
        "description": {
          "before": "3595cbe5e8cc7284644099c06bd5aa89",
          "after": "c6afcc8b2d4298b68705ab27ddbd5d78"
        },
        "craft_requirements": {
          "before": "014d9fa59132d0d48c442280eda857e2",
          "after": "6b6c3b03131d8f6d7e44e357bfea0461"
        }
      }
    },
    {
      "id": 12683,
      "family": "flames",
      "rank": 8,
      "spell_id": 4627,
      "expected": {
        "id": 12683,
        "bulk": "0.1",
        "name": "Wand of Rolling Flames (8th-level)",
        "size": "MEDIUM",
        "uuid": "4695052514320992",
        "group": "GENERAL",
        "hands": null,
        "level": 18,
        "price": {
          "gp": 24000
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "version": "1.0",
        "operations": null,
        "availability": null,
        "content_source_id": 16
      },
      "before": {
        "description": "The luminous design of red-orange cracks on this black obsidian wand suggests cooling lava.\n\n**Activate** Cast a Spell\n\n**Effect** You cast 8th-rank \\[\\[Floating Flame\\]\\]. The ground in the sphere's square and all adjacent squares are coated in rolling flames until the start of your next turn. These are difficult terrain and hazardous terrain. A creature that moves on the ground takes 7 fire damage for every square of rolling flames it moves into. If a creature in the flames doesn't move on its turn, it takes the damage for each of the squares it's in at the end of its turn. The first time you Sustain the Spell each round, the sphere creates rolling flames again in its new location (or the same location if you chose not to move it).",
        "craft_requirements": "Supply a casting of [[Floating Flame]] of the appropriate rank.",
        "traits": [
          1542,
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4823",
          "book": "Treasure Vault",
          "page": "142"
        }
      },
      "after": {
        "description": "The luminous design of red-orange cracks on this black obsidian wand suggests cooling lava.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 8th-rank *[floating flame](link_spell_4627)*. If you create the flame on the ground, the ground in the sphere's square and all adjacent squares are coated in rolling flames until the start of your next turn. These are difficult terrain and hazardous terrain. A creature that moves on the ground takes 7 [fire](link_trait_1542) damage for every square of rolling flames it moves into. If a creature in the flames doesn't move on its turn, it takes the damage for each of the squares it's in at the end of its turn. The first time you [Sustain](link_action_19858) the Spell each round, the sphere creates rolling flames again in its new location (or the same location if you chose not to move it), provided it's on the ground.",
        "craft_requirements": "Supply a casting of *[floating flame](link_spell_4627)* of the appropriate rank.",
        "traits": [
          1542,
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2289",
          "book": "Treasure Vault (Remastered)",
          "page": "142"
        }
      },
      "hashes": {
        "description": {
          "before": "fd3cfbc1d47c5cf6518f9ac0f57887b7",
          "after": "31fba4758660f87f01c94a6c1c5d6ba7"
        },
        "craft_requirements": {
          "before": "014d9fa59132d0d48c442280eda857e2",
          "after": "6b6c3b03131d8f6d7e44e357bfea0461"
        }
      }
    },
    {
      "id": 12684,
      "family": "flames",
      "rank": 9,
      "spell_id": 4627,
      "expected": {
        "id": 12684,
        "bulk": "0.1",
        "name": "Wand of Rolling Flames (9th-level)",
        "size": "MEDIUM",
        "uuid": "4584861336980995",
        "group": "GENERAL",
        "hands": null,
        "level": 20,
        "price": {
          "gp": 70000
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "version": "1.0",
        "operations": null,
        "availability": null,
        "content_source_id": 16
      },
      "before": {
        "description": "The luminous design of red-orange cracks on this black obsidian wand suggests cooling lava.\n\n**Activate** Cast a Spell\n\n**Effect** You cast 9th-rank \\[\\[Floating Flame\\]\\]. The ground in the sphere's square and all adjacent squares are coated in rolling flames until the start of your next turn. These are difficult terrain and hazardous terrain. A creature that moves on the ground takes 8 fire damage for every square of rolling flames it moves into. If a creature in the flames doesn't move on its turn, it takes the damage for each of the squares it's in at the end of its turn. The first time you Sustain the Spell each round, the sphere creates rolling flames again in its new location (or the same location if you chose not to move it).",
        "craft_requirements": "Supply a casting of [[Floating Flame]] of the appropriate rank.",
        "traits": [
          1542,
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4823",
          "book": "Treasure Vault",
          "page": "142"
        }
      },
      "after": {
        "description": "The luminous design of red-orange cracks on this black obsidian wand suggests cooling lava.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 9th-rank *[floating flame](link_spell_4627)*. If you create the flame on the ground, the ground in the sphere's square and all adjacent squares are coated in rolling flames until the start of your next turn. These are difficult terrain and hazardous terrain. A creature that moves on the ground takes 8 [fire](link_trait_1542) damage for every square of rolling flames it moves into. If a creature in the flames doesn't move on its turn, it takes the damage for each of the squares it's in at the end of its turn. The first time you [Sustain](link_action_19858) the Spell each round, the sphere creates rolling flames again in its new location (or the same location if you chose not to move it), provided it's on the ground.",
        "craft_requirements": "Supply a casting of *[floating flame](link_spell_4627)* of the appropriate rank.",
        "traits": [
          1542,
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2289",
          "book": "Treasure Vault (Remastered)",
          "page": "142"
        }
      },
      "hashes": {
        "description": {
          "before": "75775e14cb5e4a17f6e220c2712b4c20",
          "after": "43533f8bd9f9f671e7626d34741ae668"
        },
        "craft_requirements": {
          "before": "014d9fa59132d0d48c442280eda857e2",
          "after": "6b6c3b03131d8f6d7e44e357bfea0461"
        }
      }
    },
    {
      "id": 12598,
      "family": "chromatic",
      "rank": 4,
      "spell_id": 5139,
      "expected": {
        "id": 12598,
        "bulk": "0.1",
        "name": "Wand of Chromatic Burst (4th-level)",
        "size": "MEDIUM",
        "uuid": "4934538241165281",
        "group": "GENERAL",
        "hands": null,
        "level": 10,
        "price": {
          "gp": 1000
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "version": "1.0",
        "operations": null,
        "availability": null,
        "content_source_id": 16
      },
      "before": {
        "description": "This intricately carved quartz wand changes color, cycling through the colors of the rainbow.\n\n**Activate** Cast a Spell\n\n**Effect** You cast 4th-rank \\[\\[Chromatic Armor\\]\\]. Additionally, the target can use the Chromatic Armor Burst action.\n\n**Chromatic Armor Burst** 1 (concentrate, evocation, light, magical)\n\n**Effect** Choose one color of the \\[\\[Chromatic Armor\\]\\] the wand created for you. The spell ends and light of that color flashes brightly in a 20-foot emanation. Creatures in the area take \\[\\[/r 4d6\\]\\] damage of the type associated with the color you chose, with a basic Reflex save against your spell DC. This action has the trait corresponding to the damage type you chose.",
        "craft_requirements": "Supply a casting of [[Chromatic Armor]] of the appropriate rank.",
        "traits": [
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4807",
          "book": "Treasure Vault",
          "page": "138"
        }
      },
      "after": {
        "description": "This intricately carved quartz wand changes color, cycling through the colors of the rainbow.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 4th-rank *[chromatic armor](link_spell_5139)*. Additionally, the target can use the Chromatic Armor Burst action.\n\n**Chromatic Armor Burst** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([concentrate](link_trait_1432), [light](link_trait_1517), [magical](link_trait_1504))\n\n**Requirements** You're affected by *[chromatic armor](link_spell_5139)* created by the [wand of chromatic burst](link_item_12598).\n\n**Effect** Choose one color of the *[chromatic armor](link_spell_5139)* the wand created for you. The spell ends and light of that color flashes brightly in a 20-foot emanation. Creatures in the area take 4d6 damage of the type associated with the color you chose, with a basic Reflex save against your spell DC. This action has the trait corresponding to the damage type you chose.",
        "craft_requirements": "Supply a casting of *[chromatic armor](link_spell_5139)* of the appropriate rank.",
        "traits": [
          1517,
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2273",
          "book": "Treasure Vault (Remastered)",
          "page": "138"
        }
      },
      "hashes": {
        "description": {
          "before": "007e3a22a3fcd7d190675d75b9e64ca7",
          "after": "6db1e499de6568951b84276bf2489111"
        },
        "craft_requirements": {
          "before": "eeef8ec56f71c32ff95c9f90d7c91bce",
          "after": "d834af3894ded454e842b83394f58b16"
        }
      }
    },
    {
      "id": 12599,
      "family": "chromatic",
      "rank": 7,
      "spell_id": 5139,
      "expected": {
        "id": 12599,
        "bulk": "0.1",
        "name": "Wand of Chromatic Burst (7th-level)",
        "size": "MEDIUM",
        "uuid": "3275025309992033",
        "group": "GENERAL",
        "hands": null,
        "level": 16,
        "price": {
          "gp": 10000
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "version": "1.0",
        "operations": null,
        "availability": null,
        "content_source_id": 16
      },
      "before": {
        "description": "This intricately carved quartz wand changes color, cycling through the colors of the rainbow.\n\n**Activate** Cast a Spell\n\n**Effect** You cast 7th-rank \\[\\[Chromatic Armor\\]\\]. Additionally, the target can use the Chromatic Armor Burst action.\n\n**Chromatic Armor Burst** 1 (concentrate, evocation, light, magical)\n\n**Effect** Choose one color of the \\[\\[Chromatic Armor\\]\\] the wand created for you. The spell ends and light of that color flashes brightly in a 20-foot emanation. Creatures in the area take \\[\\[/r 8d6\\]\\] damage of the type associated with the color you chose, with a basic Reflex save against your spell DC. This action has the trait corresponding to the damage type you chose.",
        "craft_requirements": "Supply a casting of [[Chromatic Armor]] of the appropriate rank.",
        "traits": [
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4807",
          "book": "Treasure Vault",
          "page": "138"
        }
      },
      "after": {
        "description": "This intricately carved quartz wand changes color, cycling through the colors of the rainbow.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 7th-rank *[chromatic armor](link_spell_5139)*. Additionally, the target can use the Chromatic Armor Burst action.\n\n**Chromatic Armor Burst** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([concentrate](link_trait_1432), [light](link_trait_1517), [magical](link_trait_1504))\n\n**Requirements** You're affected by *[chromatic armor](link_spell_5139)* created by the [wand of chromatic burst](link_item_12599).\n\n**Effect** Choose one color of the *[chromatic armor](link_spell_5139)* the wand created for you. The spell ends and light of that color flashes brightly in a 20-foot emanation. Creatures in the area take 8d6 damage of the type associated with the color you chose, with a basic Reflex save against your spell DC. This action has the trait corresponding to the damage type you chose.",
        "craft_requirements": "Supply a casting of *[chromatic armor](link_spell_5139)* of the appropriate rank.",
        "traits": [
          1517,
          1504,
          1665
        ],
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2273",
          "book": "Treasure Vault (Remastered)",
          "page": "138"
        }
      },
      "hashes": {
        "description": {
          "before": "565e10c382a2e2702f802a438599a232",
          "after": "461e4c1585d72a1d56e21015acd0f4e3"
        },
        "craft_requirements": {
          "before": "eeef8ec56f71c32ff95c9f90d7c91bce",
          "after": "d834af3894ded454e842b83394f58b16"
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
      "citation": {},
      "description_md5": "47178cd6a4d7e5fdc38cb9a4d4ad1c7c"
    },
    {
      "table": "ability-block",
      "id": 19858,
      "name": "Sustain",
      "source": 3,
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
      "citation": {
        "source": {
          "url": "https://2e.aonprd.com/Actions.aspx?ID=2317",
          "book": "Player Core",
          "page": "419"
        }
      },
      "description_md5": "3a413d079a901697303158d46bb20048"
    },
    {
      "table": "spell",
      "id": 4627,
      "name": "Floating Flame",
      "source": 3,
      "expected": {
        "id": 4627,
        "name": "Floating Flame",
        "rank": 2,
        "traditions": [
          "arcane",
          "primal"
        ],
        "rarity": "COMMON",
        "cast": "TWO-ACTIONS",
        "traits": [
          1432,
          1542,
          1433
        ],
        "defense": "basic Reflex",
        "cost": "",
        "trigger": null,
        "requirements": null,
        "range": "30 feet",
        "area": "5-foot square",
        "targets": "",
        "duration": "sustained up to 1 minute",
        "description": "You create a fire that burns without fuel and moves to your commands. The flame deals 3d6 fire damage to each creature in the square in which it appears, with a basic Reflex save. When you [Sustain](link_action_20948) this spell, you can levitate the flame up to 10 feet. It then deals damage to each creature whose space it shared at any point during its flight. This uses the same damage and save, and you roll the damage once each time you [Sustain](link_action_20948). A given creature can take damage from floating flame only once per round.",
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "5318096316894504",
        "heightened": {
          "text": [
            {
              "amount": "(+1)",
              "text": "The damage increases by 1d6."
            }
          ],
          "data": {
            "damage": {
              "0": "1d6"
            },
            "interval": 1,
            "type": "interval"
          }
        },
        "availability": null
      },
      "citation": {
        "source": {
          "url": "https://2e.aonprd.com/Spells.aspx?ID=1533",
          "book": "Player Core",
          "page": "332"
        }
      },
      "description_md5": "8476073f8ac7b399990cd2523440f8af"
    },
    {
      "table": "spell",
      "id": 5139,
      "name": "Chromatic Armor",
      "source": 13,
      "expected": {
        "id": 5139,
        "name": "Chromatic Armor",
        "rank": 4,
        "traditions": [
          "arcane",
          "occult"
        ],
        "rarity": "COMMON",
        "cast": "TWO-TO-THREE-ACTIONS",
        "traits": [
          1517,
          1433,
          1432
        ],
        "defense": "",
        "cost": "",
        "trigger": "",
        "requirements": "",
        "range": "touch",
        "area": "",
        "targets": "1 willing creature",
        "duration": "1 minute",
        "description": "You wrap the target in armor made of sheets of colored light. The armor sheds bright light for 20 feet (and dim light for the next 20 feet). Whenever a creature attacks the target and is adjacent to it, the attacker must attempt a Will save at the end of its action. On a failure, it becomes dazzled until the end of its next turn. Regardless of the result of the save, the attacker is temporarily immune until the end of its next turn. The dazzling effect has the [light](link_trait_1517) and [visual](link_trait_1479) traits.\n\nWhen you cast the spell, roll 1d8 twice on the table below to see the armor's colors (rerolling any duplicates). Each color grants resistance 5 to the indicated damage type. If you spend three actions to Cast the Spell, roll three times instead.\n\n1.  **Red** [fire](link_trait_1542)\n    \n2.  **Orange** [acid](link_trait_1528)\n    \n3.  **Yellow** [electricity](link_trait_1576)\n    \n4.  **Green** [poison](link_trait_1476)\n    \n5.  **Blue** [sonic](link_trait_1484)\n    \n6.  **Indigo** [mental](link_trait_1448)\n    \n7.  **Violet** [force](link_trait_1560)\n    \n8.  **Matching Color** The armor becomes the color matching the type of damage the target took most recently in the past minute. If it didn't take any of those seven types of damage or the armor is already that color, roll again, rerolling any results of 8.",
        "content_source_id": 13,
        "version": "1.0",
        "uuid": "4712037317553461",
        "heightened": {
          "text": [
            {
              "amount": "(+3)",
              "text": "The resistance is increased by 5."
            }
          ],
          "data": {}
        },
        "availability": null
      },
      "citation": {
        "source": {
          "url": "https://2e.aonprd.com/Spells.aspx?ID=881",
          "book": "Secrets of Magic",
          "page": "95"
        }
      },
      "description_md5": "1d69e22ec23654566cf3dd8ebb1d853b"
    },
    {
      "table": "spell",
      "id": 8891,
      "name": "Frigid Flurry",
      "source": 842,
      "expected": {
        "id": 8891,
        "name": "Frigid Flurry",
        "rank": 7,
        "traditions": [
          "arcane",
          "primal"
        ],
        "rarity": "COMMON",
        "cast": "TWO-ACTIONS",
        "traits": [
          1519,
          1432,
          1433,
          1584
        ],
        "defense": "basic Reflex",
        "cost": "",
        "trigger": "",
        "requirements": "",
        "range": "",
        "area": "line up to 120 feet",
        "targets": "",
        "duration": "",
        "description": "You place a palm to your lips and exhale a cold breath, whipping up a gust of wind that freezes the air's ambient moisture into a flurry of jagged shards. The flurry deals 9d6 [cold](link_trait_1519) damage and 9d6 slashing damage to all foes, with a basic Reflex save, but the gust flows harmlessly around your allies. The wind then picks you up and carries you to the other end of the area. While carried this way, you temporarily transform into a flurry of snow crystals and become immune to all damage and effects except [fire](link_trait_1542) damage, effects with the [fire](link_trait_1542) trait, and any other effect the GM decides would affect snow.",
        "content_source_id": 842,
        "version": "1.0",
        "uuid": "5488245758591901",
        "heightened": {
          "text": [
            {
              "amount": "(+1)",
              "text": "The [cold](link_trait_1519) and slashing damage each increase by 1d6."
            }
          ],
          "data": {}
        },
        "availability": null
      },
      "citation": {},
      "description_md5": "f4a99f17ba3f89f7d5284396ca03f6c7"
    },
    {
      "table": "trait",
      "id": 1432,
      "name": "Concentrate",
      "source": 3,
      "expected": {
        "id": 1432,
        "name": "Concentrate",
        "description": "An action with this trait requires a degree of mental concentration and discipline to perform.",
        "content_source_id": 3,
        "uuid": "3011511166869167"
      },
      "citation": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=561",
          "book": "Player Core",
          "page": "454"
        }
      },
      "description_md5": "301b839554eb068c69acddde67e1ba9b"
    },
    {
      "table": "trait",
      "id": 1504,
      "name": "Magical",
      "source": 3,
      "expected": {
        "id": 1504,
        "name": "Magical",
        "description": "Something with the magical trait is imbued with magical energies not tied to a specific tradition of magic. Some items or effects are closely tied to a particular tradition of magic. In these cases, the item has the [arcane](link_trait_1459), [divine](link_trait_1475), [occult](link_trait_1514), or [primal](link_trait_1454) trait instead of the magical trait. Any of these traits indicate that the item is magical.",
        "content_source_id": 3,
        "uuid": "445811995976648"
      },
      "citation": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=644",
          "book": "Player Core",
          "page": "458"
        }
      },
      "description_md5": "20460b9ed89c6df70f814821b22ed542"
    },
    {
      "table": "trait",
      "id": 1517,
      "name": "Light",
      "source": 3,
      "expected": {
        "id": 1517,
        "name": "Light",
        "description": "Light effects overcome non-magical darkness in the area, and can [counteract](link_action_27519) [magical](link_trait_1504) [darkness](link_trait_1900). You must usually target darkness magic with your light magic directly to counteract the darkness, but some light spells automatically attempt to counteract darkness.",
        "content_source_id": 3,
        "uuid": "7362437638210779"
      },
      "citation": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=640",
          "book": "Player Core",
          "page": "458"
        }
      },
      "description_md5": "de92d85ffbbb27ec4212e60ba47f54a0"
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
      "citation": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=555",
          "book": "Player Core",
          "page": "454"
        }
      },
      "description_md5": "d81e34953ce03a260af062674ad31251"
    },
    {
      "table": "trait",
      "id": 1542,
      "name": "Fire",
      "source": 3,
      "expected": {
        "id": 1542,
        "name": "Fire",
        "description": "Effects with the fire trait deal fire damage or either conjure or manipulate fire. Those that manipulate fire have no effect in an area without fire. Creatures with this trait consist primarily of fire or have a [magical](link_trait_1504) connection to that element. Planes with this trait are composed of flames that continually burn with no fuel source. Fire planes are extremely hostile to non-fire creatures.",
        "content_source_id": 3,
        "uuid": "3316639745394270"
      },
      "citation": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=604",
          "book": "Player Core",
          "page": "456"
        }
      },
      "description_md5": "88062863a84fd33c3c4890612527f65d"
    },
    {
      "table": "trait",
      "id": 1584,
      "name": "Water",
      "source": 3,
      "expected": {
        "id": 1584,
        "name": "Water",
        "description": "Effects with the water trait either manipulate or conjure water. Those that manipulate water have no effect in an area without water. Creatures with this trait consist primarily of water or have a magical connection to the element. Planes with this trait are mostly liquid, perhaps with pockets of breathable air.",
        "content_source_id": 3,
        "uuid": "79251961259262"
      },
      "citation": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=732",
          "book": "Player Core",
          "page": "463"
        }
      },
      "description_md5": "69389f973cd8b49d22155d4ca29ef43b"
    },
    {
      "table": "trait",
      "id": 1665,
      "name": "Wand",
      "source": 3,
      "expected": {
        "id": 1665,
        "name": "Wand",
        "description": "A wand contains a single spell which you can cast once per day.\n\n* * *\n\nAfter the spell is cast from the wand for the day, you can attempt to cast it one more time—overcharging the wand at the risk of destroying it. [Cast the Spell](link_action_19611) again, then roll a DC 10 flat check. On a success, the wand is broken. On a failure, the wand is destroyed. If anyone tries to overcharge a wand when it’s already been overcharged that day, the wand is automatically destroyed (even if it had been repaired) and no spell is cast.",
        "content_source_id": 3,
        "uuid": "3624263319363750"
      },
      "citation": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=731",
          "book": "Player Core",
          "page": "463"
        }
      },
      "description_md5": "f2ae68d5716f5e9530b748e98beb2ea9"
    }
  ],
  "sources": [
    {
      "id": 3,
      "name": "Common Core",
      "user_id": null,
      "is_published": true,
      "require_key": false,
      "group": "common-core",
      "required_content_sources": []
    },
    {
      "id": 13,
      "name": "Secrets of Magic (in progress)",
      "user_id": null,
      "is_published": true,
      "require_key": false,
      "group": "legacy",
      "required_content_sources": [
        11
      ]
    },
    {
      "id": 16,
      "name": "Treasure Vault",
      "user_id": null,
      "is_published": true,
      "require_key": false,
      "group": "pathfinder-core",
      "required_content_sources": [
        1
      ]
    },
    {
      "id": 842,
      "name": "Impossible Magic",
      "user_id": null,
      "is_published": true,
      "require_key": false,
      "group": "pathfinder-core",
      "required_content_sources": [
        1
      ]
    }
  ]
}$wandfamilies$::jsonb;
  source_spec jsonb; source_row jsonb; dependency jsonb; dependency_row jsonb;
  citation jsonb; patch jsonb; item_row public.item%rowtype; current_state jsonb; affected integer;
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
  if jsonb_array_length(spec->'items')<>13 or jsonb_array_length(spec->'dependencies')<>12
      or jsonb_array_length(spec->'sources')<>4 then raise exception 'Invalid reviewed wand family scope'; end if;
  for source_spec in select value from jsonb_array_elements(spec->'sources') order by (value->>'id')::bigint loop
    select to_jsonb(s) into source_row from public.content_source s where s.id=(source_spec->>'id')::bigint for update;
    if not found or exists(select 1 from jsonb_each(source_spec) e where source_row->e.key is distinct from e.value) then
      raise exception 'Wand family official source identity/publication differs: %',source_spec->>'id';
    end if;
  end loop;
  -- Exact references and payload identities cover partial UPDATE/DELETE and mismatched CREATE queue sources.
  -- Missing, NULL or unknown moderation state is not permission to overwrite a relevant submission.
  if exists(select 1 from public.content_update u
    where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
      (u.type='content-source' and exists(select 1 from jsonb_array_elements(spec->'sources') s
        where u.ref_id=(s->>'id')::bigint or u.data->>'id'=s->>'id' or u.data->>'name'=s->>'name'))
      or exists(select 1 from jsonb_array_elements(spec->'dependencies') d
        where u.type=d->>'table' and (u.ref_id=(d->>'id')::bigint or u.data->>'id'=d->>'id'
          or u.data->>'uuid'=d#>>'{expected,uuid}'
          or ((u.content_source_id=(d->>'source')::bigint or u.data->>'content_source_id'=d->>'source')
            and u.data->>'name'=d->>'name')))
      or (u.type='item' and exists(select 1 from jsonb_array_elements(spec->'items') p
        where u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id' or u.data->>'uuid'=p#>>'{expected,uuid}'
          or ((u.content_source_id=(p#>>'{expected,content_source_id}')::bigint
              or u.data->>'content_source_id'=p#>>'{expected,content_source_id}')
            and u.data->>'name'=p#>>'{expected,name}')))
    )) then raise exception 'Wand family has a pending or malformed owner/dependency/source submission'; end if;

  for dependency in select value from jsonb_array_elements(spec->'dependencies')
      order by value->>'table',(value->>'id')::bigint loop
    dependency_row:=null;
    case dependency->>'table'
      when 'spell' then select to_jsonb(s)||jsonb_build_object('uuid',s.uuid::text) into dependency_row
        from public.spell s where s.id=(dependency->>'id')::bigint for share;
      when 'ability-block' then select to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text) into dependency_row
        from public.ability_block a where a.id=(dependency->>'id')::bigint for share;
      when 'trait' then select to_jsonb(t)||jsonb_build_object('uuid',t.uuid::text) into dependency_row
        from public.trait t where t.id=(dependency->>'id')::bigint for share;
      else raise exception 'Invalid wand family dependency table';
    end case;
    if dependency_row is null or exists(select 1 from jsonb_each(dependency->'expected') e
        where dependency_row->e.key is distinct from e.value)
        or jsonb_typeof(dependency_row->'meta_data') is distinct from 'object'
        or md5(dependency_row->>'description') is distinct from dependency->>'description_md5' then
      raise exception 'Wand family dependency identity/type/mechanics/prose differs: %',dependency->>'id';
    end if;
    citation:=case when (dependency_row->'meta_data')?'source'
      then jsonb_build_object('source',dependency_row#>'{meta_data,source}') else '{}'::jsonb end;
    if citation is distinct from dependency->'citation' then
      raise exception 'Wand family dependency citation differs: %',dependency->>'id';
    end if;
  end loop;

  -- Lock and validate every complete owner state before the first leaf write.
  for patch in select value from jsonb_array_elements(spec->'items') order by (value->>'id')::bigint loop
    select * into item_row from public.item where id=(patch->>'id')::bigint for update;
    if not found or exists(select 1 from jsonb_each(patch->'expected') e
        where (to_jsonb(item_row)||jsonb_build_object('uuid',item_row.uuid::text))->e.key is distinct from e.value)
        or jsonb_typeof(item_row.meta_data) is distinct from 'object' then
      raise exception 'Wand family owner identity/mechanics differs: %',patch->>'id';
    end if;
    if md5(patch#>>'{before,description}') is distinct from patch#>>'{hashes,description,before}'
        or md5(patch#>>'{after,description}') is distinct from patch#>>'{hashes,description,after}'
        or md5(patch#>>'{before,craft_requirements}') is distinct from patch#>>'{hashes,craft_requirements,before}'
        or md5(patch#>>'{after,craft_requirements}') is distinct from patch#>>'{hashes,craft_requirements,after}' then
      raise exception 'Invalid reviewed wand family leaf hash: %',patch->>'id';
    end if;
    current_state:=jsonb_build_object('description',item_row.description,'craft_requirements',item_row.craft_requirements,
      'traits',to_jsonb(item_row.traits),'source',item_row.meta_data->'source');
    if current_state is distinct from patch->'before' and current_state is distinct from patch->'after' then
      raise exception 'Wand family owner has an unreviewed complete leaf state: %',patch->>'id';
    end if;
  end loop;

  for patch in select value from jsonb_array_elements(spec->'items') order by (value->>'id')::bigint loop
    select * into item_row from public.item where id=(patch->>'id')::bigint;
    current_state:=jsonb_build_object('description',item_row.description,'craft_requirements',item_row.craft_requirements,
      'traits',to_jsonb(item_row.traits),'source',item_row.meta_data->'source');
    if current_state=patch->'after' then continue; end if;
    update public.item i set description=patch#>>'{after,description}',craft_requirements=patch#>>'{after,craft_requirements}',
      traits=case when patch->>'family'='chromatic'
        then array(select value::bigint from jsonb_array_elements_text(patch#>'{after,traits}')) else i.traits end,
      meta_data=jsonb_set(i.meta_data::jsonb,'{source}',patch#>'{after,source}',true)::jsonb
      where i.id=item_row.id and i.uuid::text=patch#>>'{expected,uuid}'
        and i.content_source_id=(patch#>>'{expected,content_source_id}')::bigint
        and jsonb_typeof(i.meta_data)='object' and jsonb_build_object('description',i.description,'craft_requirements',i.craft_requirements,
      'traits',to_jsonb(i.traits),'source',i.meta_data->'source')=patch->'before';
    get diagnostics affected=row_count;
    if affected<>1 then raise exception 'Wand family leaf compare-and-set failed: %',patch->>'id'; end if;
  end loop;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
