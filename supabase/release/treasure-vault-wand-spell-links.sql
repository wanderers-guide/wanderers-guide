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
with expected as (
  select value as patch from jsonb_array_elements($expected$
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
    "description_md5": "6450687f173ff17d2a2771ee4f25fbc5",
    "craft_md5": "dae56cdf4ba1a2ad8e2e744057b90293"
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
    "description_md5": "4afd1ad33c123f9d1ed1481bd7377484",
    "craft_md5": "c14df19fd88a68d30204b0886352d2bb"
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
    "description_md5": "ac616421a51482e1f6a62df18ffa99d0",
    "craft_md5": "c14df19fd88a68d30204b0886352d2bb"
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
    "description_md5": "7856c0a9c7a708746b8bfd1397f03686",
    "craft_md5": "c14df19fd88a68d30204b0886352d2bb"
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
    "description_md5": "92f20379454f831bd307a3b2adf4009a",
    "craft_md5": "c14df19fd88a68d30204b0886352d2bb"
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
    "description_md5": "97fde2414a3e8a4d6c0c5e5f459c525c",
    "craft_md5": "c14df19fd88a68d30204b0886352d2bb"
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
    "description_md5": "2a9da8d8665cdbbf11101153ea2bbf1a",
    "craft_md5": "c14df19fd88a68d30204b0886352d2bb"
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
    "description_md5": "031acc46136e20f7f67b9827e96683fb",
    "craft_md5": "c14df19fd88a68d30204b0886352d2bb"
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
    "description_md5": "eee6e0d7d58da4b2bf96ab76910dfbeb",
    "craft_md5": "4861babd359867a0bd108249b157744f"
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
    "description_md5": "e622cd467e822442230adc69adeedcae",
    "craft_md5": "4861babd359867a0bd108249b157744f"
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
    "description_md5": "c3de7b45354f831786e7af6f3c70b600",
    "craft_md5": "4861babd359867a0bd108249b157744f"
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
    "description_md5": "c4d609b80bcec325b4051f2742102eda",
    "craft_md5": "4861babd359867a0bd108249b157744f"
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
    "description_md5": "da7f5efc89776c21cc3c6d4345332a8e",
    "craft_md5": "4861babd359867a0bd108249b157744f"
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
    "description_md5": "37bafb90a34c52a58ecdf93364324d04",
    "craft_md5": "4861babd359867a0bd108249b157744f"
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
    "description_md5": "48958ce9a2bd4c9eca875e89d46c998d",
    "craft_md5": "4861babd359867a0bd108249b157744f"
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
    "description_md5": "647fc19cccef81e294640681403e6102",
    "craft_md5": "715d8a39dd7452774abf80e063ffdc22"
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
    "description_md5": "30f93d711d6398d420f14cf87219bf8f",
    "craft_md5": "715d8a39dd7452774abf80e063ffdc22"
  }
]
  $expected$::jsonb)
), dependencies as (
  select value as dependency from jsonb_array_elements($dependencies$
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
  $dependencies$::jsonb)
)
select 'treasure-vault-wand-spell-links'::text as id,
  coalesce((select count(*) = 17 and bool_and((
    i.id is not null and i.name = patch->>'name' and i.uuid = (patch->>'uuid')::bigint
    and i.content_source_id = (patch->>'source')::bigint and i.level = (patch->>'level')::integer
    and i."group" = 'GENERAL' and i.usage = 'held-in-one-hand'
    and 1665 = any(i.traits) and jsonb_typeof(i.meta_data) = 'object'
    and i.meta_data->'source' = patch->'citation'
    and md5(i.description) = patch->>'description_md5'
    and md5(i.craft_requirements) = patch->>'craft_md5') is true)
    from expected left join public.item i on i.id = (patch->>'id')::bigint), false)
  and (select count(*) = 3 from public.content_source where id in (3,13,16)
    and user_id is null and is_published is true)
  and coalesce((select count(*) = 5 and bool_and((
    case when dependency->>'table' = 'spell' then
      s.id is not null and s.name = dependency->>'name' and s.uuid = (dependency->>'uuid')::bigint
        and s.content_source_id = (dependency->>'source')::bigint
        and s.rank = (dependency->>'rank')::integer
        and to_jsonb(s.traditions) = dependency->'traditions' and s."cast" = dependency->>'cast'
        and md5(s.description) = dependency->>'description_md5'
        and jsonb_typeof(s.meta_data) = 'object' and s.meta_data->'source' = dependency->'citation'
    else t.id is not null and t.name = dependency->>'name' and t.uuid = (dependency->>'uuid')::bigint
        and t.content_source_id = (dependency->>'source')::bigint
    end) is true)
    from dependencies
    left join public.spell s on dependency->>'table' = 'spell' and s.id = (dependency->>'id')::bigint
    left join public.trait t on dependency->>'table' = 'trait' and t.id = (dependency->>'id')::bigint), false)
  and not exists (select 1 from public.content_update u
    where u.status->>'state' = 'PENDING' and (
      (u.type = 'item' and u.ref_id in (select (patch->>'id')::bigint from expected))
      or exists (select 1 from dependencies where u.type = dependency->>'table'
        and u.ref_id = (dependency->>'id')::bigint)))
  as passed
)
select original_checks.id,case when coalesce((status.value->>'recognized')::boolean,true) then coalesce((status.value->>'passed')::boolean,false) else original_checks.passed end as passed from original_checks cross join terminal_status status;
