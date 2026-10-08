-- Preserve original check IDs and predicates; use the pinned shared terminal check.
with terminal_function as materialized(select (exists(select 1 from pg_catalog.pg_proc p
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
    and pg_catalog.has_function_privilege('supabase_read_only_user',p.oid,'EXECUTE'))) as valid),
terminal_status as materialized(select case when f.valid is true then
  coalesce((select pg_catalog.to_jsonb(s) from public.treasure_vault_terminal_status_v1() s),'{"recognized":true,"passed":false}'::jsonb)
  else '{"recognized":true,"passed":false}'::jsonb end as value from terminal_function f),
original_checks as(
with expected as (
  select value as patch from jsonb_array_elements($expected$
[
  {
    "id": 12697,
    "name": "Wand of Tormented Slumber",
    "uuid": "2321865733891157",
    "source": 16,
    "level": 10,
    "price": {
      "gp": 1000
    },
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4829",
      "book": "Treasure Vault",
      "page": "143"
    },
    "traits": [
      1504,
      1448,
      1650,
      1665
    ],
    "spell_id": 4837,
    "cast_rank": 4,
    "description_md5": "f6c49cbe682aa04903d324b67948b8b6",
    "craft_md5": "074cb73b25584252f89930b164ac9c6f"
  },
  {
    "id": 12702,
    "name": "Wand of Wearying Dance",
    "uuid": "7838296050281525",
    "source": 16,
    "level": 18,
    "price": {
      "gp": 24000
    },
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4832",
      "book": "Treasure Vault",
      "page": "143"
    },
    "traits": [
      1504,
      1448,
      1665
    ],
    "spell_id": 4914,
    "cast_rank": 8,
    "description_md5": "a4c7d0f23d79911a5369dbb38af6eafd",
    "craft_md5": "6e16160da9c357a80616b064c9faa5f5"
  }
]
  $expected$::jsonb)
), dependencies as (
  select value as d from jsonb_array_elements($dependencies$
[
  {
    "table": "spell",
    "id": 4837,
    "name": "Sleep",
    "uuid": "8957165275518678",
    "source": 3,
    "description_md5": "66472a04a8e396e8b1da3d91c50b988e",
    "citation": {
      "url": "https://2e.aonprd.com/Spells.aspx?ID=1675",
      "book": "Player Core",
      "page": "357"
    },
    "headers": {
      "rank": 1,
      "traditions": [
        "arcane",
        "occult"
      ],
      "cast": "TWO-ACTIONS",
      "range": "30 feet",
      "targets": "",
      "duration": "",
      "area": "5-foot burst",
      "heightened": {
        "data": {},
        "text": [
          {
            "text": "The creatures fall unconscious for 1 round on a failure or 1 minute on a critical failure. They fall prone and release what they're holding, and they can't attempt Perception checks to wake up. When the duration ends, the creature is sleeping normally instead of automatically waking up.",
            "amount": "(4th)"
          }
        ]
      }
    },
    "defense": "Will",
    "defense_after": "Will"
  },
  {
    "table": "spell",
    "id": 4914,
    "name": "Uncontrollable Dance",
    "uuid": "5968252706986088",
    "source": 3,
    "description_md5": "4059dbb249e6c1161a2fabb50aa3b2a3",
    "citation": {
      "url": "https://2e.aonprd.com/Spells.aspx?ID=1730",
      "book": "Player Core",
      "page": "364"
    },
    "headers": {
      "rank": 8,
      "traditions": [
        "arcane",
        "occult"
      ],
      "cast": "TWO-ACTIONS",
      "range": "touch",
      "targets": "1 creature",
      "duration": "varies",
      "area": null,
      "heightened": {
        "data": {},
        "text": []
      }
    },
    "defense": null,
    "defense_after": "Will"
  },
  {
    "table": "ability-block",
    "id": 19611,
    "name": "Cast a Spell",
    "uuid": "3222895456836016",
    "source": 3,
    "type": "action",
    "description_md5": "47178cd6a4d7e5fdc38cb9a4d4ad1c7c"
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
select 'treasure-vault-remaining-wand-repairs'::text as id,
  coalesce((select count(*) = 2 and bool_and((
    i.id is not null and i.name = patch->>'name' and i.uuid = (patch->>'uuid')::bigint
    and i.content_source_id = (patch->>'source')::bigint and i.level = (patch->>'level')::integer
    and i.price::jsonb = patch->'price' and to_jsonb(i.traits) = patch->'traits'
    and i."group" = 'GENERAL' and i.usage = 'held-in-one-hand'
    and jsonb_typeof(i.meta_data) = 'object' and i.meta_data->'source' = patch->'citation'
    and md5(i.description) = patch->>'description_md5'
    and md5(i.craft_requirements) = patch->>'craft_md5') is true)
    from expected left join public.item i on i.id = (patch->>'id')::bigint),false)
  and (select count(*) = 2 from public.content_source where id in (3,16)
    and user_id is null and is_published is true)
  and coalesce((select count(*) = 4 and bool_and((case
    when d->>'table' = 'spell' then s.id is not null and s.name = d->>'name' and s.uuid = (d->>'uuid')::bigint and s.content_source_id = (d->>'source')::bigint
      and jsonb_build_object('rank',s.rank,'traditions',to_jsonb(s.traditions),'cast',s."cast",'range',s."range",'targets',s.targets,'duration',s.duration,'area',s.area,'heightened',s.heightened::jsonb) = d->'headers'
      and md5(s.description) = d->>'description_md5'
      and jsonb_typeof(s.meta_data) = 'object' and s.meta_data->'source' = d->'citation'
      and s.defense is not distinct from d->>'defense_after'
    when d->>'table' = 'ability-block' then a.id is not null and a.name = d->>'name'
      and a.uuid = (d->>'uuid')::bigint and a.content_source_id = (d->>'source')::bigint
      and a.type = d->>'type' and md5(a.description) = d->>'description_md5'
    else t.id is not null and t.name = d->>'name' and t.uuid = (d->>'uuid')::bigint
      and t.content_source_id = (d->>'source')::bigint end) is true)
    from dependencies
    left join public.spell s on d->>'table' = 'spell' and s.id = (d->>'id')::bigint
    left join public.ability_block a on d->>'table' = 'ability-block' and a.id = (d->>'id')::bigint
    left join public.trait t on d->>'table' = 'trait' and t.id = (d->>'id')::bigint),false)
  and not exists (select 1 from public.content_update u where u.status->>'state' = 'PENDING'
    and ((u.type = 'item' and u.ref_id in (select (patch->>'id')::bigint from expected))
      or exists (select 1 from dependencies where u.type = d->>'table' and u.ref_id = (d->>'id')::bigint)))
  as passed
)
select original_checks.id,case when coalesce((status.value->>'recognized')::boolean,true) then coalesce((status.value->>'passed')::boolean,false) else original_checks.passed end as passed from original_checks cross join terminal_status status;
