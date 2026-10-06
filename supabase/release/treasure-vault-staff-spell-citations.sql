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
with spec as (select $staffcite$
{
  "spells": [
    {
      "id": 9000,
      "expected": {
        "id": 9000,
        "name": "Phantom Crowd",
        "rank": 2,
        "traditions": [
          "arcane",
          "occult"
        ],
        "rarity": "COMMON",
        "cast": "TWO-ACTIONS",
        "traits": [
          1432,
          1447,
          1433,
          1479
        ],
        "defense": "",
        "cost": "",
        "trigger": "",
        "requirements": "",
        "range": "60 feet",
        "area": "10-foot-by-10-foot square",
        "targets": "",
        "duration": "sustained up to 10 minutes",
        "description": "A tightly packed crowd of humanoids appropriate to the area appear, facing you and agreeing loudly with anything you say. A creature that touches a member of the crowd or attempts a [Seek](link_action_19845) action to examine the crowd can attempt to disbelieve your illusion. The crowd is difficult terrain for anyone who hasn’t disbelieved the illusion.\n\nWhen you spend 1 or more actions to cast a [composition](link_trait_1895) spell or to perform an activity that includes a Performance check, you can also [Sustain](link_action_19858) this Spell as part of that action.",
        "content_source_id": 842,
        "version": "1.0",
        "uuid": "4197355284093809",
        "heightened": {
          "text": [
            {
              "amount": "(+1)",
              "text": "The crowd occupies an additional 10-foot-by-10- foot square in range. The additional square doesn’t need to be adjacent to any other square. It can overlap, but there’s no additional effect in the overlapped squares."
            }
          ],
          "data": {}
        },
        "availability": null
      },
      "metadata": {
        "before": {},
        "after": {
          "source": {
            "url": "https://2e.aonprd.com/Spells.aspx?ID=2787",
            "book": "Impossible Magic",
            "page": "157"
          }
        }
      }
    },
    {
      "id": 9010,
      "expected": {
        "id": 9010,
        "name": "Quick Sort",
        "rank": 1,
        "traditions": [
          "arcane",
          "divine",
          "occult",
          "primal"
        ],
        "rarity": "COMMON",
        "cast": "THREE-ACTIONS",
        "traits": [
          1432,
          1433
        ],
        "defense": "",
        "cost": "",
        "trigger": "",
        "requirements": "",
        "range": "10 feet",
        "area": "",
        "targets": "up to 200 unattended objects in range, each of light Bulk or less",
        "duration": "up to 1 minute",
        "description": "You magically sort a group of objects into neat stacks or piles. You can sort the objects in two different ways. The first option is to separate them into different piles depending on an easily observed factor, such as color or shape. Alternatively, you can sort the objects into ordered stacks depending on a clearly indicated notation, such as a page number, title, or date. The objects sort themselves throughout the duration, though it takes less time per object to sort a smaller number of objects, down to a single round for 30 or fewer objects.",
        "content_source_id": 842,
        "version": "1.0",
        "uuid": "6236332801290631",
        "heightened": {
          "text": [
            {
              "amount": "(3rd)",
              "text": "The spell can sort up to 500 objects in a minute, or 75 objects in a round."
            }
          ],
          "data": {}
        },
        "availability": null
      },
      "metadata": {
        "before": {},
        "after": {
          "source": {
            "url": "https://2e.aonprd.com/Spells.aspx?ID=2797",
            "book": "Impossible Magic",
            "page": "158"
          }
        }
      }
    },
    {
      "id": 9011,
      "expected": {
        "id": 9011,
        "name": "Read the Air",
        "rank": 0,
        "traditions": [
          "divine",
          "occult"
        ],
        "rarity": "COMMON",
        "cast": "TWO-ACTIONS",
        "traits": [
          1858,
          1432,
          1433,
          1899
        ],
        "defense": "",
        "cost": "",
        "trigger": "",
        "requirements": "",
        "range": "",
        "area": "",
        "targets": "",
        "duration": "1 minute",
        "description": "You survey a social situation, showing courtesy to all around you as your intuition swiftly picks up clues about social contexts and unspoken assumptions of behavior. Your body language subconsciously changes to take advantage of this information and use it in your own interactions with those creatures.\n\nAs part of [Casting this Spell](link_action_19611), you [Recall Knowledge](link_action_19753) using Society to gain information about the social situation. You also gain a +1 status bonus to your next Diplomacy check to [Make an Impression](link_action_19739) on those creatures present when you [Cast this Spell](link_action_19611), as long as the check occurs during the duration of the spell. You can _read the air_ only once in a given social situation; casting it again has no effect.",
        "content_source_id": 842,
        "version": "1.0",
        "uuid": "2151504166891879",
        "heightened": {
          "text": [],
          "data": {}
        },
        "availability": null
      },
      "metadata": {
        "before": {},
        "after": {
          "source": {
            "url": "https://2e.aonprd.com/Spells.aspx?ID=2798",
            "book": "Impossible Magic",
            "page": "159"
          }
        }
      }
    },
    {
      "id": 9015,
      "expected": {
        "id": 9015,
        "name": "Restyle",
        "rank": 1,
        "traditions": [
          "arcane",
          "divine",
          "occult",
          "primal"
        ],
        "rarity": "COMMON",
        "cast": "1 minute",
        "traits": [
          1432,
          1433
        ],
        "defense": "",
        "cost": "",
        "trigger": "",
        "requirements": "",
        "range": "touch",
        "area": "",
        "targets": "1 piece of clothing currently worn by you or an ally",
        "duration": "unlimited",
        "description": "You permanently change the appearance of one piece of clothing currently worn by you or an ally to better fit your aesthetic sensibilities. You can change its color, texture, pattern, and other minor parts of its design, but the changes can’t alter the clothing’s overall shape, size, or purpose. The changes can’t increase the quality of the craftsmanship or artistry of the piece of clothing, but particularly gauche choices for the new color and pattern might decrease its aesthetic appeal. This spell transforms existing materials into the desired appearance and never alters the material or creates more material than what’s originally part of the object. The object’s statistics also remain unchanged.",
        "content_source_id": 842,
        "version": "1.0",
        "uuid": "2689375792704345",
        "heightened": {
          "text": [],
          "data": {}
        },
        "availability": null
      },
      "metadata": {
        "before": {},
        "after": {
          "source": {
            "url": "https://2e.aonprd.com/Spells.aspx?ID=2803",
            "book": "Impossible Magic",
            "page": "160"
          }
        }
      }
    },
    {
      "id": 9053,
      "expected": {
        "id": 9053,
        "name": "Timely Tutor",
        "rank": 2,
        "traditions": [
          "arcane",
          "occult"
        ],
        "rarity": "COMMON",
        "cast": "ONE-ACTION",
        "traits": [
          1433,
          1448
        ],
        "defense": "",
        "cost": "",
        "trigger": "",
        "requirements": "",
        "range": "touch",
        "area": "",
        "targets": "your eidolon or familiar",
        "duration": "sustained up to 1 minute",
        "description": "You serve as an astral connection between your eidolon or familiar and the Akashic Record—a demiplane consisting of a comprehensive psychic library. If you [Cast this Spell](link_action_19611) on your [familiar](link_trait_3843), your [familiar](link_trait_3843) adds your spellcasting attribute modifier on checks to [Recall Knowledge](link_action_19753) with the Lore skill of your choice, much like they do for Acrobatics and Stealth. Your familiar must have the [speech](link_feat_40567) familiar ability in order to share any information they learn with you. If you [Cast this Spell](link_action_19611) on your [eidolon](link_trait_2937), they instead become trained in the Lore skill of your choice.\n\nIf you lose physical contact with the target, their connection to the Akashic Record is severed, and the spell immediately ends.",
        "content_source_id": 842,
        "version": "1.0",
        "uuid": "3548619550253440",
        "heightened": {
          "text": [],
          "data": {}
        },
        "availability": null
      },
      "metadata": {
        "before": {},
        "after": {
          "source": {
            "url": "https://2e.aonprd.com/Spells.aspx?ID=2845",
            "book": "Impossible Magic",
            "page": "167"
          }
        }
      }
    }
  ],
  "source": {
    "expected": {
      "id": 842,
      "name": "Impossible Magic",
      "user_id": null,
      "is_published": true,
      "require_key": false,
      "deprecated": null,
      "group": "pathfinder-core",
      "required_content_sources": [
        1
      ]
    }
  }
}
$staffcite$::jsonb as value), owners as (
  select p.value as patch,to_jsonb(s) as actual
  from spec x cross join jsonb_array_elements(x.value->'spells') p
  left join public.spell s on s.id=(p.value->>'id')::bigint
), source as (
  select x.value #> '{source,expected}' as expected,to_jsonb(s) as actual
  from spec x left join public.content_source s on s.id=842
)
select 'treasure-vault-staff-spell-citations' as id,coalesce(
  (select count(*)=5 and bool_and(actual is not null
    and not exists (select 1 from jsonb_each(patch->'expected') p where
      case when p.key='uuid' then actual->>p.key is distinct from p.value #>> '{}'
        else actual->p.key is distinct from p.value end)
    and jsonb_typeof(actual->'meta_data') is not distinct from 'object'
    and actual #> '{meta_data,source}' is not distinct from patch #> '{metadata,after,source}')
   from owners),false) as passed
union all
select 'treasure-vault-staff-spell-citation-source',coalesce(
  (select count(*)=1 and bool_and(actual is not null
    and not exists (select 1 from jsonb_each(expected) p where actual->p.key is distinct from p.value))
   from source),false)
union all
select 'treasure-vault-staff-spell-citation-pending',not exists (
  select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
    (u.type='spell' and (
      u.ref_id in (9000,9010,9011,9015,9053)
      or ((u.content_source_id=842 or u.data->>'content_source_id'='842')
        and exists (select 1 from jsonb_array_elements((select value from spec)->'spells') p
          where u.data->>'name'=p #>> '{expected,name}'))
    ))
    or (u.type='content-source' and (
      u.ref_id=842 or u.data->>'id'='842' or u.data->>'name'='Impossible Magic'
    ))
  )
)
)
select original_checks.id,case when coalesce((status.value->>'recognized')::boolean,true) then coalesce((status.value->>'passed')::boolean,false) else original_checks.passed end as passed from original_checks cross join terminal_status status;
