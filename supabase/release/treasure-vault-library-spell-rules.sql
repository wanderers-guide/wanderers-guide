-- Preserve original check IDs and predicates; use the pinned shared terminal check.
with terminal_function as materialized(select (exists(select 1 from pg_catalog.pg_proc p
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
    and pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE'))) as valid),
terminal_status as materialized(select case when f.valid is true then
  coalesce((select pg_catalog.to_jsonb(s) from public.treasure_vault_terminal_status_v1() s),'{"recognized":true,"passed":false}'::jsonb)
  else '{"recognized":true,"passed":false}'::jsonb end as value from terminal_function f),
original_checks as(
with spec as(select $rules${
  "spells": [
    {
      "id": 5449,
      "expected": {
        "id": 5449,
        "name": "Shift Blame",
        "rank": 3,
        "traditions": [
          "arcane",
          "occult"
        ],
        "rarity": "COMMON",
        "cast": "REACTION",
        "traits": [
          1432,
          1448
        ],
        "cost": "",
        "trigger": "You or another creature attacks a creature or fails at a Deception, Diplomacy, or Intimidation check.",
        "requirements": null,
        "range": "30 feet",
        "area": null,
        "targets": "the target of the triggering attack or skill check",
        "content_source_id": 13,
        "version": "1.0",
        "uuid": "1343332467418914",
        "heightened": {
          "text": [],
          "data": {}
        },
        "availability": "LIMITED"
      },
      "citation": {
        "source": {
          "url": "https://2e.aonprd.com/Spells.aspx?ID=997",
          "book": "Secrets of Magic",
          "page": "129"
        }
      },
      "before": {
        "defense": null,
        "duration": "",
        "description": "You alter the target's memories of the triggering event as they form. You choose another creature (which can be you) with the capacity to make the triggering attack or skill check, and you alter the target's memories to recall the creature you chose as responsible for the triggering attack or skill check. The target must attempt a Will save and is then temporarily immune for 24 hours.\n\n**Critical Success** The target knows you attempted to alter its memories.\n\n**Success** The target doesn't realize you attempted to alter its memories, though it knows you cast a spell.\n\n**Failure** You successfully alter the target's memory. It isn't forced to react to the new memories in a particular way, and it's likely to question them if they contradict other information it knows or are implausible for the situation."
      },
      "after": {
        "defense": "Will",
        "duration": "",
        "description": "You alter the target's memories of the triggering event as they form. You choose another creature (which can be you) with the capacity to make the triggering attack or skill check, and you alter the target's memories to recall the creature you chose as responsible for the triggering attack or skill check. The target must attempt a Will save and is then temporarily immune for 24 hours.\n\n**Critical Success** The target knows you attempted to alter its memories.\n\n**Success** The target doesn't realize you attempted to alter its memories, though it knows you cast a spell.\n\n**Failure** You successfully alter the target's memory. It isn't forced to react to the new memories in a particular way, and it's likely to question them if they contradict other information it knows or are implausible for the situation."
      },
      "description": {
        "before_md5": "55804230986060c3475fc11ca55f0d48",
        "after_md5": "55804230986060c3475fc11ca55f0d48",
        "replacements": []
      }
    },
    {
      "id": 4865,
      "expected": {
        "id": 4865,
        "name": "Suggestion",
        "rank": 4,
        "traditions": [
          "arcane",
          "occult"
        ],
        "rarity": "COMMON",
        "cast": "TWO-ACTIONS",
        "traits": [
          1432,
          1481,
          1458,
          1433,
          1448,
          1899
        ],
        "cost": "",
        "trigger": null,
        "requirements": null,
        "range": "30 feet",
        "area": null,
        "targets": "1 creature",
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "8196158280494249",
        "heightened": {
          "text": [
            {
              "amount": "(8th)",
              "text": "You can target up to 10 creatures."
            }
          ],
          "data": {
            "levels": {
              "8": {
                "target": {
                  "value": "10 creatures"
                }
              }
            },
            "type": "fixed"
          }
        },
        "availability": null
      },
      "citation": {
        "source": {
          "url": "https://2e.aonprd.com/Spells.aspx?ID=1693",
          "book": "Player Core",
          "page": "360"
        }
      },
      "before": {
        "defense": null,
        "duration": "varies",
        "description": "Your honeyed words are difficult for creatures to resist. You suggest a course of action to the target, which must be phrased in such a way as to seem like a logical course of action to the target and can't be self-destructive or obviously against the target's self-interest. The target must attempt a Will save.\n\n**Critical Success** The target is unaffected and knows you tried to control it.\n\n**Success** The target is unaffected.\n\n**Failure** The target immediately follows your suggestion. The spell has a duration of 1 minute, or until the target has completed a finite suggestion or the suggestion becomes self-destructive or has other obvious negative effects.\n\n**Critical Failure** As failure, but the base duration is 1 hour."
      },
      "after": {
        "defense": "Will",
        "duration": "varies",
        "description": "Your honeyed words are difficult for creatures to resist. You suggest a course of action to the target, which must be phrased in such a way as to seem like a logical course of action to the target and can't be self-destructive or obviously against the target's self-interest. The target must attempt a Will save.\n\n**Critical Success** The target is unaffected and knows you tried to control it.\n\n**Success** The target is unaffected.\n\n**Failure** The target immediately follows your suggestion. The spell has a duration of 1 minute, or until the target has completed a finite suggestion or the suggestion becomes self-destructive or has other obvious negative effects.\n\n**Critical Failure** As failure, but the base duration is 1 hour."
      },
      "description": {
        "before_md5": "c991023fe274e5dce4a9e35cc1cc23eb",
        "after_md5": "c991023fe274e5dce4a9e35cc1cc23eb",
        "replacements": []
      }
    },
    {
      "id": 5367,
      "expected": {
        "id": 5367,
        "name": "Glimmer of Charm",
        "rank": 5,
        "traditions": [
          "arcane",
          "occult",
          "primal"
        ],
        "rarity": "COMMON",
        "cast": "TWO-ACTIONS",
        "traits": [
          1492,
          1432,
          1486,
          1481,
          1433,
          1448
        ],
        "cost": "",
        "trigger": null,
        "requirements": null,
        "range": "",
        "area": "20-foot emanation",
        "targets": "",
        "content_source_id": 13,
        "version": "1.0",
        "uuid": "1581120155200585",
        "heightened": {},
        "availability": null
      },
      "citation": {
        "source": {
          "url": "https://2e.aonprd.com/Spells.aspx?ID=919",
          "book": "Secrets of Magic",
          "page": "108"
        }
      },
      "before": {
        "defense": null,
        "duration": "1 minute",
        "description": "You're bathed in a smooth, almost glittering aura that improves the attitude of those near you. Any creature that ends its turn in the aura must attempt a Will saving throw with the following effects. No matter the result, it's then temporarily immune for 24 hours. The effect lasts until the spell ends, even after the creature leaves the aura.\n\n**Critical Success** The creature is unaffected and is aware of the aura.\n\n**Success** The creature's attitude toward you improves by one step. If that improves its attitude to at least \\[\\[Indifferent\\]\\], it can't take hostile actions against you, though the effect ends as soon as you take a hostile action against the creature or its allies.\n\n**Failure** The creature's attitude toward you improves by two steps. It can't take hostile actions against you, though the effect ends as soon as you take a hostile action against the creature or its allies.\n\n**Critical Failure** The creature's attitude becomes \\[\\[Helpful\\]\\] to you, though the effect ends as soon as you take a hostile action against the creature or its allies. While the creature is helpful, it can't take hostile actions against you."
      },
      "after": {
        "defense": "Will",
        "duration": "sustained up to 1 minute",
        "description": "You're bathed in a smooth, almost glittering aura that improves the attitude of those near you. Any creature that ends its turn in the aura must attempt a Will saving throw with the following effects. No matter the result, it's then temporarily immune for 24 hours. The effect lasts until the spell ends, even after the creature leaves the aura.\n\n**Critical Success** The creature is unaffected and is aware of the aura.\n\n**Success** The creature's attitude toward you improves by one step. If that improves its attitude to at least indifferent, it can't take hostile actions against you, though the effect ends as soon as you take a hostile action against the creature or its allies.\n\n**Failure** The creature's attitude toward you improves by two steps. It can't take hostile actions against you, though the effect ends as soon as you take a hostile action against the creature or its allies.\n\n**Critical Failure** The creature's attitude becomes helpful to you, though the effect ends as soon as you take a hostile action against the creature or its allies. While the creature is helpful, it can't take hostile actions against you."
      },
      "description": {
        "before_md5": "0d635957d52f6c8cf7c28be06685c1c4",
        "after_md5": "bd52b95c11102e0edd400f1fc5ccc0fa",
        "replacements": [
          {
            "from": "\\[\\[Indifferent\\]\\]",
            "to": "indifferent",
            "count": 1
          },
          {
            "from": "\\[\\[Helpful\\]\\]",
            "to": "helpful",
            "count": 1
          }
        ]
      }
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
    }
  ]
}$rules$::jsonb value)
select 'treasure-vault-library-spell-rules'::text id,
coalesce((select jsonb_array_length(spec.value->'spells')=3 and not exists(select 1 from jsonb_array_elements(spec.value->'sources') s left join public.content_source c on c.id=(s->>'id')::bigint
    where c.id is null or exists(select 1 from jsonb_each(s) e where to_jsonb(c)->e.key is distinct from e.value))
  and not exists(select 1 from jsonb_array_elements(spec.value->'spells') p left join public.spell s on s.id=(p->>'id')::bigint
    where s.id is null or exists(select 1 from jsonb_each(p->'expected') e where (to_jsonb(s)||jsonb_build_object('uuid',s.uuid::text))->e.key is distinct from e.value)
      or jsonb_typeof(s.meta_data) is distinct from 'object'
      or (case when s.meta_data?'source' then jsonb_build_object('source',s.meta_data->'source') else '{}'::jsonb end) is distinct from p->'citation'
      or jsonb_build_object('defense',s.defense,'duration',s.duration,'description',s.description) is distinct from p->'after')
  and not exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
    (u.type='content-source' and exists(select 1 from jsonb_array_elements(spec.value->'sources') c
      where u.ref_id=(c->>'id')::bigint or u.data->>'id'=c->>'id' or (u.ref_id is null and u.data->>'name'=c->>'name')))
    or (u.type='spell' and exists(select 1 from jsonb_array_elements(spec.value->'spells') p
      where u.ref_id=(p->>'id')::bigint or (u.ref_id is null
        and (u.content_source_id=(p#>>'{expected,content_source_id}')::bigint or u.data->>'content_source_id'=p#>>'{expected,content_source_id}') and u.data->>'name'=p#>>'{expected,name}')))))
 from spec),false) passed
)
select original_checks.id,case when coalesce((status.value->>'recognized')::boolean,true) then coalesce((status.value->>'passed')::boolean,false) else original_checks.passed end as passed from original_checks cross join terminal_status status;
