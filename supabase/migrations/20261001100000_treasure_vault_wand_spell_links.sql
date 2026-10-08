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
  execute $historical_original_dual$do $repair$
declare
  patches constant jsonb := $patches$
[
  {
    "id": 12603,
    "name": "Wand of Contagious Frailty",
    "uuid": "2049211165542647",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4809",
      "book": "Treasure Vault",
      "page": "139"
    },
    "spell_id": 4599,
    "cast_rank": 1,
    "description": {
      "before": "3500c5c8aebf98d6c3ed22fec549f323",
      "after": "6450687f173ff17d2a2771ee4f25fbc5",
      "replacements": [
        {
          "from": "\\[\\[Enfeeble\\]\\]",
          "to": "*[enfeeble](link_spell_4599)*",
          "count": 2
        }
      ]
    },
    "craft": {
      "before": "ee4737d446974a8b21eb720171c729c5",
      "after": "dae56cdf4ba1a2ad8e2e744057b90293",
      "replacements": [
        {
          "from": "[[Enfeeble]]",
          "to": "*[enfeeble](link_spell_4599)*",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12605,
    "name": "Wand of Dazzling Rays (3rd-level)",
    "uuid": "4359396407182879",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4811",
      "book": "Treasure Vault",
      "page": "139"
    },
    "spell_id": 4660,
    "cast_rank": 3,
    "description": {
      "before": "f6aaacccd6d4bf868c651f574e075e86",
      "after": "4afd1ad33c123f9d1ed1481bd7377484",
      "replacements": [
        {
          "from": "@Check\\[type:fortitude\\]",
          "to": "Fortitude",
          "count": 1
        },
        {
          "from": "\\[\\[Holy Light\\]\\]",
          "to": "*[holy light](link_spell_4660)*",
          "count": 1
        },
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        },
        {
          "from": "\\[\\[Dazzled\\]\\]",
          "to": "dazzled",
          "count": 1
        }
      ]
    },
    "craft": {
      "before": "8b350d43d3bafacb15619223213a54c7",
      "after": "c14df19fd88a68d30204b0886352d2bb",
      "replacements": [
        {
          "from": "[[Holy Light]]",
          "to": "*[holy light](link_spell_4660)*",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12606,
    "name": "Wand of Dazzling Rays (4th-level)",
    "uuid": "8159873792877881",
    "source": 16,
    "level": 10,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4811",
      "book": "Treasure Vault",
      "page": "139"
    },
    "spell_id": 4660,
    "cast_rank": 4,
    "description": {
      "before": "714683a3bc963f29e7144b535b915db1",
      "after": "ac616421a51482e1f6a62df18ffa99d0",
      "replacements": [
        {
          "from": "@Check\\[type:fortitude\\]",
          "to": "Fortitude",
          "count": 1
        },
        {
          "from": "\\[\\[Holy Light\\]\\]",
          "to": "*[holy light](link_spell_4660)*",
          "count": 1
        },
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        },
        {
          "from": "\\[\\[Dazzled\\]\\]",
          "to": "dazzled",
          "count": 1
        }
      ]
    },
    "craft": {
      "before": "8b350d43d3bafacb15619223213a54c7",
      "after": "c14df19fd88a68d30204b0886352d2bb",
      "replacements": [
        {
          "from": "[[Holy Light]]",
          "to": "*[holy light](link_spell_4660)*",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12607,
    "name": "Wand of Dazzling Rays (5th-level)",
    "uuid": "4782914278264481",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4811",
      "book": "Treasure Vault",
      "page": "139"
    },
    "spell_id": 4660,
    "cast_rank": 5,
    "description": {
      "before": "3416a16af9fee347c497c63b202ba847",
      "after": "7856c0a9c7a708746b8bfd1397f03686",
      "replacements": [
        {
          "from": "@Check\\[type:fortitude\\]",
          "to": "Fortitude",
          "count": 1
        },
        {
          "from": "\\[\\[Holy Light\\]\\]",
          "to": "*[holy light](link_spell_4660)*",
          "count": 1
        },
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        },
        {
          "from": "\\[\\[Dazzled\\]\\]",
          "to": "dazzled",
          "count": 1
        }
      ]
    },
    "craft": {
      "before": "8b350d43d3bafacb15619223213a54c7",
      "after": "c14df19fd88a68d30204b0886352d2bb",
      "replacements": [
        {
          "from": "[[Holy Light]]",
          "to": "*[holy light](link_spell_4660)*",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12608,
    "name": "Wand of Dazzling Rays (6th-level)",
    "uuid": "3471522184663324",
    "source": 16,
    "level": 14,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4811",
      "book": "Treasure Vault",
      "page": "139"
    },
    "spell_id": 4660,
    "cast_rank": 6,
    "description": {
      "before": "7428054c3ea37e03a4f23c68400f38cb",
      "after": "92f20379454f831bd307a3b2adf4009a",
      "replacements": [
        {
          "from": "@Check\\[type:fortitude\\]",
          "to": "Fortitude",
          "count": 1
        },
        {
          "from": "\\[\\[Holy Light\\]\\]",
          "to": "*[holy light](link_spell_4660)*",
          "count": 1
        },
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        },
        {
          "from": "\\[\\[Dazzled\\]\\]",
          "to": "dazzled",
          "count": 1
        }
      ]
    },
    "craft": {
      "before": "8b350d43d3bafacb15619223213a54c7",
      "after": "c14df19fd88a68d30204b0886352d2bb",
      "replacements": [
        {
          "from": "[[Holy Light]]",
          "to": "*[holy light](link_spell_4660)*",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12609,
    "name": "Wand of Dazzling Rays (7th-level)",
    "uuid": "7118490375639855",
    "source": 16,
    "level": 16,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4811",
      "book": "Treasure Vault",
      "page": "139"
    },
    "spell_id": 4660,
    "cast_rank": 7,
    "description": {
      "before": "3342f9d5739f55d4f060774645f1140a",
      "after": "97fde2414a3e8a4d6c0c5e5f459c525c",
      "replacements": [
        {
          "from": "@Check\\[type:fortitude\\]",
          "to": "Fortitude",
          "count": 1
        },
        {
          "from": "\\[\\[Holy Light\\]\\]",
          "to": "*[holy light](link_spell_4660)*",
          "count": 1
        },
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        },
        {
          "from": "\\[\\[Dazzled\\]\\]",
          "to": "dazzled",
          "count": 1
        }
      ]
    },
    "craft": {
      "before": "8b350d43d3bafacb15619223213a54c7",
      "after": "c14df19fd88a68d30204b0886352d2bb",
      "replacements": [
        {
          "from": "[[Holy Light]]",
          "to": "*[holy light](link_spell_4660)*",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12610,
    "name": "Wand of Dazzling Rays (8th-level)",
    "uuid": "5538114626025655",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4811",
      "book": "Treasure Vault",
      "page": "139"
    },
    "spell_id": 4660,
    "cast_rank": 8,
    "description": {
      "before": "9ca810af468f55275444b049aedb24c9",
      "after": "2a9da8d8665cdbbf11101153ea2bbf1a",
      "replacements": [
        {
          "from": "@Check\\[type:fortitude\\]",
          "to": "Fortitude",
          "count": 1
        },
        {
          "from": "\\[\\[Holy Light\\]\\]",
          "to": "*[holy light](link_spell_4660)*",
          "count": 1
        },
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        },
        {
          "from": "\\[\\[Dazzled\\]\\]",
          "to": "dazzled",
          "count": 1
        }
      ]
    },
    "craft": {
      "before": "8b350d43d3bafacb15619223213a54c7",
      "after": "c14df19fd88a68d30204b0886352d2bb",
      "replacements": [
        {
          "from": "[[Holy Light]]",
          "to": "*[holy light](link_spell_4660)*",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12611,
    "name": "Wand of Dazzling Rays (9th-level)",
    "uuid": "4716862529480946",
    "source": 16,
    "level": 20,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4811",
      "book": "Treasure Vault",
      "page": "139"
    },
    "spell_id": 4660,
    "cast_rank": 9,
    "description": {
      "before": "aea4d1705167e2bd8a4ec0407afc1198",
      "after": "031acc46136e20f7f67b9827e96683fb",
      "replacements": [
        {
          "from": "@Check\\[type:fortitude\\]",
          "to": "Fortitude",
          "count": 1
        },
        {
          "from": "\\[\\[Holy Light\\]\\]",
          "to": "*[holy light](link_spell_4660)*",
          "count": 1
        },
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        },
        {
          "from": "\\[\\[Dazzled\\]\\]",
          "to": "dazzled",
          "count": 1
        }
      ]
    },
    "craft": {
      "before": "8b350d43d3bafacb15619223213a54c7",
      "after": "c14df19fd88a68d30204b0886352d2bb",
      "replacements": [
        {
          "from": "[[Holy Light]]",
          "to": "*[holy light](link_spell_4660)*",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12612,
    "name": "Wand of Dumbfounding Doom (3rd-level)",
    "uuid": "995051737933024",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4812",
      "book": "Treasure Vault",
      "page": "139"
    },
    "spell_id": 5378,
    "cast_rank": 3,
    "description": {
      "before": "fad918ad25bcf477bac068e35f2b5e07",
      "after": "eee6e0d7d58da4b2bf96ab76910dfbeb",
      "replacements": [
        {
          "from": "\\[\\[Impending Doom\\]\\]",
          "to": "*[impending doom](link_spell_5378)*",
          "count": 1
        },
        {
          "from": "\\[\\[Frightened\\]\\]",
          "to": "frightened",
          "count": 1
        },
        {
          "from": "\\[\\[Stupefied\\]\\]",
          "to": "stupefied",
          "count": 1
        }
      ]
    },
    "craft": {
      "before": "bee95d844627c27fd4372a91cf6ff5a6",
      "after": "4861babd359867a0bd108249b157744f",
      "replacements": [
        {
          "from": "[[Impending Doom]]",
          "to": "*[impending doom](link_spell_5378)*",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12613,
    "name": "Wand of Dumbfounding Doom (4th-level)",
    "uuid": "81539202446136",
    "source": 16,
    "level": 10,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4812",
      "book": "Treasure Vault",
      "page": "139"
    },
    "spell_id": 5378,
    "cast_rank": 4,
    "description": {
      "before": "7b06a71a2ed9a5f3410f205d13f02192",
      "after": "e622cd467e822442230adc69adeedcae",
      "replacements": [
        {
          "from": "\\[\\[Impending Doom\\]\\]",
          "to": "*[impending doom](link_spell_5378)*",
          "count": 1
        },
        {
          "from": "\\[\\[Frightened\\]\\]",
          "to": "frightened",
          "count": 1
        },
        {
          "from": "\\[\\[Stupefied\\]\\]",
          "to": "stupefied",
          "count": 1
        }
      ]
    },
    "craft": {
      "before": "bee95d844627c27fd4372a91cf6ff5a6",
      "after": "4861babd359867a0bd108249b157744f",
      "replacements": [
        {
          "from": "[[Impending Doom]]",
          "to": "*[impending doom](link_spell_5378)*",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12614,
    "name": "Wand of Dumbfounding Doom (5th-level)",
    "uuid": "8976367127003994",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4812",
      "book": "Treasure Vault",
      "page": "139"
    },
    "spell_id": 5378,
    "cast_rank": 5,
    "description": {
      "before": "e85c9cd7794c814a14475e7b8ccfe15f",
      "after": "c3de7b45354f831786e7af6f3c70b600",
      "replacements": [
        {
          "from": "\\[\\[Impending Doom\\]\\]",
          "to": "*[impending doom](link_spell_5378)*",
          "count": 1
        },
        {
          "from": "\\[\\[Frightened\\]\\]",
          "to": "frightened",
          "count": 1
        },
        {
          "from": "\\[\\[Stupefied\\]\\]",
          "to": "stupefied",
          "count": 1
        }
      ]
    },
    "craft": {
      "before": "bee95d844627c27fd4372a91cf6ff5a6",
      "after": "4861babd359867a0bd108249b157744f",
      "replacements": [
        {
          "from": "[[Impending Doom]]",
          "to": "*[impending doom](link_spell_5378)*",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12615,
    "name": "Wand of Dumbfounding Doom (6th-level)",
    "uuid": "7539872866375595",
    "source": 16,
    "level": 14,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4812",
      "book": "Treasure Vault",
      "page": "139"
    },
    "spell_id": 5378,
    "cast_rank": 6,
    "description": {
      "before": "63884b2a27371565bfe865633c3bebdc",
      "after": "c4d609b80bcec325b4051f2742102eda",
      "replacements": [
        {
          "from": "\\[\\[Impending Doom\\]\\]",
          "to": "*[impending doom](link_spell_5378)*",
          "count": 1
        },
        {
          "from": "\\[\\[Frightened\\]\\]",
          "to": "frightened",
          "count": 1
        },
        {
          "from": "\\[\\[Stupefied\\]\\]",
          "to": "stupefied",
          "count": 1
        }
      ]
    },
    "craft": {
      "before": "bee95d844627c27fd4372a91cf6ff5a6",
      "after": "4861babd359867a0bd108249b157744f",
      "replacements": [
        {
          "from": "[[Impending Doom]]",
          "to": "*[impending doom](link_spell_5378)*",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12616,
    "name": "Wand of Dumbfounding Doom (7th-level)",
    "uuid": "3415442045275207",
    "source": 16,
    "level": 16,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4812",
      "book": "Treasure Vault",
      "page": "139"
    },
    "spell_id": 5378,
    "cast_rank": 7,
    "description": {
      "before": "03781f974d2c6142f8d46c21fee28007",
      "after": "da7f5efc89776c21cc3c6d4345332a8e",
      "replacements": [
        {
          "from": "\\[\\[Impending Doom\\]\\]",
          "to": "*[impending doom](link_spell_5378)*",
          "count": 1
        },
        {
          "from": "\\[\\[Frightened\\]\\]",
          "to": "frightened",
          "count": 1
        },
        {
          "from": "\\[\\[Stupefied\\]\\]",
          "to": "stupefied",
          "count": 1
        }
      ]
    },
    "craft": {
      "before": "bee95d844627c27fd4372a91cf6ff5a6",
      "after": "4861babd359867a0bd108249b157744f",
      "replacements": [
        {
          "from": "[[Impending Doom]]",
          "to": "*[impending doom](link_spell_5378)*",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12617,
    "name": "Wand of Dumbfounding Doom (8th-level)",
    "uuid": "3635808771207317",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4812",
      "book": "Treasure Vault",
      "page": "139"
    },
    "spell_id": 5378,
    "cast_rank": 8,
    "description": {
      "before": "68b73e5d70e8ff7c8bec77e73de4f56d",
      "after": "37bafb90a34c52a58ecdf93364324d04",
      "replacements": [
        {
          "from": "\\[\\[Impending Doom\\]\\]",
          "to": "*[impending doom](link_spell_5378)*",
          "count": 1
        },
        {
          "from": "\\[\\[Frightened\\]\\]",
          "to": "frightened",
          "count": 1
        },
        {
          "from": "\\[\\[Stupefied\\]\\]",
          "to": "stupefied",
          "count": 1
        }
      ]
    },
    "craft": {
      "before": "bee95d844627c27fd4372a91cf6ff5a6",
      "after": "4861babd359867a0bd108249b157744f",
      "replacements": [
        {
          "from": "[[Impending Doom]]",
          "to": "*[impending doom](link_spell_5378)*",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12618,
    "name": "Wand of Dumbfounding Doom (9th-level)",
    "uuid": "5025690433135961",
    "source": 16,
    "level": 20,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4812",
      "book": "Treasure Vault",
      "page": "139"
    },
    "spell_id": 5378,
    "cast_rank": 9,
    "description": {
      "before": "0b8afb1ed2cd359213aea7cb05bfd46b",
      "after": "48958ce9a2bd4c9eca875e89d46c998d",
      "replacements": [
        {
          "from": "\\[\\[Impending Doom\\]\\]",
          "to": "*[impending doom](link_spell_5378)*",
          "count": 1
        },
        {
          "from": "\\[\\[Frightened\\]\\]",
          "to": "frightened",
          "count": 1
        },
        {
          "from": "\\[\\[Stupefied\\]\\]",
          "to": "stupefied",
          "count": 1
        }
      ]
    },
    "craft": {
      "before": "bee95d844627c27fd4372a91cf6ff5a6",
      "after": "4861babd359867a0bd108249b157744f",
      "replacements": [
        {
          "from": "[[Impending Doom]]",
          "to": "*[impending doom](link_spell_5378)*",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12662,
    "name": "Wand of Paralytic Shock (3rd-level)",
    "uuid": "7325021511825933",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4819",
      "book": "Treasure Vault",
      "page": "141"
    },
    "spell_id": 4751,
    "cast_rank": 3,
    "description": {
      "before": "5ca5ca1924e5d9ad19198fdc3bb8eaba",
      "after": "647fc19cccef81e294640681403e6102",
      "replacements": [
        {
          "from": "\\[\\[Paralyze\\]\\]",
          "to": "*[paralyze](link_spell_4751)*",
          "count": 1
        },
        {
          "from": "\\[\\[Paralyzed\\]\\]",
          "to": "paralyzed",
          "count": 1
        }
      ]
    },
    "craft": {
      "before": "96231e8630fe694a062f285842440ef7",
      "after": "715d8a39dd7452774abf80e063ffdc22",
      "replacements": [
        {
          "from": "[[Paralyze]]of",
          "to": "*[paralyze](link_spell_4751)* of",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12663,
    "name": "Wand of Paralytic Shock (7th-level)",
    "uuid": "7753949487158177",
    "source": 16,
    "level": 16,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4819",
      "book": "Treasure Vault",
      "page": "141"
    },
    "spell_id": 4751,
    "cast_rank": 7,
    "description": {
      "before": "a5616a0178281b9c08ecc907cfec6c08",
      "after": "30f93d711d6398d420f14cf87219bf8f",
      "replacements": [
        {
          "from": "\\[\\[Paralyze\\]\\]",
          "to": "*[paralyze](link_spell_4751)*",
          "count": 1
        },
        {
          "from": "\\[\\[Paralyzed\\]\\]",
          "to": "paralyzed",
          "count": 1
        }
      ]
    },
    "craft": {
      "before": "96231e8630fe694a062f285842440ef7",
      "after": "715d8a39dd7452774abf80e063ffdc22",
      "replacements": [
        {
          "from": "[[Paralyze]]of",
          "to": "*[paralyze](link_spell_4751)* of",
          "count": 1
        }
      ]
    }
  }
]
  $patches$::jsonb;
  dependencies constant jsonb := $dependencies$
[
  {
    "table": "spell",
    "id": 4599,
    "name": "Enfeeble",
    "uuid": "5207059992984534",
    "source": 3,
    "rank": 1,
    "traditions": [
      "arcane",
      "divine",
      "occult"
    ],
    "cast": "TWO-ACTIONS",
    "description_md5": "e6e589eff536c852e0e09e4bfcc17210",
    "citation": {
      "url": "https://2e.aonprd.com/Spells.aspx?ID=1513",
      "book": "Player Core",
      "page": "329"
    }
  },
  {
    "table": "spell",
    "id": 4660,
    "name": "Holy Light",
    "uuid": "5838189803258842",
    "source": 3,
    "rank": 3,
    "traditions": [
      "divine",
      "primal"
    ],
    "cast": "TWO-ACTIONS",
    "description_md5": "c39158ae808a7fdf3086986f5fd06e75",
    "citation": {
      "url": "https://2e.aonprd.com/Spells.aspx?ID=1557",
      "book": "Player Core",
      "page": "335"
    }
  },
  {
    "table": "spell",
    "id": 5378,
    "name": "Impending Doom",
    "uuid": "8162344368242021",
    "source": 13,
    "rank": 3,
    "traditions": [
      "arcane",
      "divine",
      "occult"
    ],
    "cast": "TWO-ACTIONS",
    "description_md5": "47a9e6050a5ba807c407efa43124641e",
    "citation": {
      "url": "https://2e.aonprd.com/Spells.aspx?ID=929",
      "book": "Secrets of Magic",
      "page": "110"
    }
  },
  {
    "table": "spell",
    "id": 4751,
    "name": "Paralyze",
    "uuid": "6945932396725328",
    "source": 3,
    "rank": 3,
    "traditions": [
      "arcane",
      "occult"
    ],
    "cast": "TWO-ACTIONS",
    "description_md5": "12c882a67620781d0184eb5aa72b8df2",
    "citation": {
      "url": "https://2e.aonprd.com/Spells.aspx?ID=1622",
      "book": "Player Core",
      "page": "348"
    }
  },
  {
    "table": "trait",
    "id": 1665,
    "name": "Wand",
    "uuid": "3624263319363750",
    "source": 3
  }
]
  $dependencies$::jsonb;
  patch jsonb;
  replacement jsonb;
  item_row public.item%rowtype;
  next_description text;
  next_craft text;
  changed_rows integer;
begin
  lock table public.content_update in share mode;
  -- Acquire every reviewed child before source locks or cache-trigger writes.
  perform i.id from public.item i where i.id in (
    select (value->>'id')::bigint from jsonb_array_elements(patches)
  ) order by i.id for update;
  perform s.id from public.spell s where s.id in (
    select (value->>'id')::bigint from jsonb_array_elements(dependencies)
      where value->>'table' = 'spell'
  ) order by s.id for share;
  perform t.id from public.trait t where t.id in (
    select (value->>'id')::bigint from jsonb_array_elements(dependencies)
      where value->>'table' = 'trait'
  ) order by t.id for share;
  perform id from public.content_source where id in (3,13,16)
    and user_id is null and is_published is true order by id for update;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 3 then raise exception 'Missing official wand spell link sources'; end if;

  perform s.id from public.spell s join jsonb_array_elements(dependencies) d
    on d->>'table' = 'spell' and s.id = (d->>'id')::bigint
    where s.name = d->>'name' and s.uuid = (d->>'uuid')::bigint
      and s.content_source_id = (d->>'source')::bigint and s.rank = (d->>'rank')::integer
      and to_jsonb(s.traditions) = d->'traditions' and s."cast" = d->>'cast'
      and md5(s.description) = d->>'description_md5'
      and jsonb_typeof(s.meta_data) = 'object' and s.meta_data->'source' = d->'citation'
    order by s.id for share of s;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 4 then raise exception 'Wand spell dependency differs from reviewed entry'; end if;

  perform t.id from public.trait t join jsonb_array_elements(dependencies) d
    on d->>'table' = 'trait' and t.id = (d->>'id')::bigint
    where t.name = d->>'name' and t.uuid = (d->>'uuid')::bigint
      and t.content_source_id = (d->>'source')::bigint
    order by t.id for share of t;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then raise exception 'Wand eligibility trait identity changed'; end if;

  if exists (select 1 from public.content_update u join jsonb_array_elements(dependencies) d
    on u.type = d->>'table' and u.ref_id = (d->>'id')::bigint
    where u.status->>'state' = 'PENDING') then
    raise exception 'Wand spell link dependency has a pending curator submission';
  end if;

  for patch in select value from jsonb_array_elements(patches) order by (value->>'id')::bigint loop
    select * into item_row from public.item where id = (patch->>'id')::bigint for update;
    if not found or item_row.name is distinct from patch->>'name'
      or item_row.uuid is distinct from (patch->>'uuid')::bigint
      or item_row.content_source_id is distinct from (patch->>'source')::bigint
      or item_row.level is distinct from (patch->>'level')::integer
      or item_row."group" is distinct from 'GENERAL'
      or item_row.usage is distinct from 'held-in-one-hand'
      or (1665 = any(item_row.traits)) is not true
      or jsonb_typeof(item_row.meta_data) is distinct from 'object'
      or item_row.meta_data->'source' is distinct from patch->'citation'
      or (md5(item_row.description) = patch->'description'->>'before'
        or md5(item_row.description) = patch->'description'->>'after') is not true
      or (md5(item_row.craft_requirements) = patch->'craft'->>'before'
        or md5(item_row.craft_requirements) = patch->'craft'->>'after') is not true then
      raise exception 'Wand spell link item differs from reviewed entry: %', patch->>'id';
    end if;
    if exists (select 1 from public.content_update where type = 'item'
      and ref_id = item_row.id and status->>'state' = 'PENDING') then
      raise exception 'Wand spell link item has a pending curator submission: %', patch->>'id';
    end if;

    next_description := item_row.description;
    if md5(next_description) is distinct from patch->'description'->>'after' then
      for replacement in select value from jsonb_array_elements(patch->'description'->'replacements') loop
        if replacement->>'from' = '' or
          (length(next_description)-length(replace(next_description,replacement->>'from',''))) /
            length(replacement->>'from') <> (replacement->>'count')::integer then
          raise exception 'Wand spell description fragment changed: %', patch->>'id';
        end if;
        next_description := replace(next_description,replacement->>'from',replacement->>'to');
      end loop;
    end if;

    next_craft := item_row.craft_requirements;
    if md5(next_craft) is distinct from patch->'craft'->>'after' then
      for replacement in select value from jsonb_array_elements(patch->'craft'->'replacements') loop
        if replacement->>'from' = '' or
          (length(next_craft)-length(replace(next_craft,replacement->>'from',''))) /
            length(replacement->>'from') <> (replacement->>'count')::integer then
          raise exception 'Wand spell craft fragment changed: %', patch->>'id';
        end if;
        next_craft := replace(next_craft,replacement->>'from',replacement->>'to');
      end loop;
    end if;
    if md5(next_description) is distinct from patch->'description'->>'after'
      or md5(next_craft) is distinct from patch->'craft'->>'after' then
      raise exception 'Wand spell text does not match reviewed result: %', patch->>'id';
    end if;

    if next_description is distinct from item_row.description
      or next_craft is distinct from item_row.craft_requirements then
      update public.item set description = next_description, craft_requirements = next_craft
        where id = item_row.id and description is not distinct from item_row.description
          and craft_requirements is not distinct from item_row.craft_requirements;
      get diagnostics changed_rows = row_count;
      if changed_rows <> 1 then raise exception 'Wand spell text changed during repair'; end if;
    end if;
  end loop;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
