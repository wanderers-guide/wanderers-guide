-- Preserve original check IDs and predicates; use the pinned shared terminal check.
with terminal_function as materialized(select (exists(select 1 from pg_catalog.pg_proc p
  where p.oid=pg_catalog.to_regprocedure('public.treasure_vault_terminal_status_v1()')
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((p.prosrc)::text,'UTF8')),'hex')='18134f9ceb5b974368dcfba9e6a145c839b63a762014424005872665b4dce869'
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
with spec as (select $duration$
{
  "spells": [
    {
      "id": 4814,
      "expected": {
        "id": 4814,
        "name": "Safe Passage",
        "rank": 3,
        "traditions": [
          "arcane",
          "divine",
          "primal"
        ],
        "rarity": "COMMON",
        "cast": "THREE-ACTIONS",
        "traits": [
          1432,
          1433
        ],
        "defense": null,
        "cost": "",
        "trigger": null,
        "requirements": null,
        "range": "touch",
        "area": "10-foot-wide, 10-foot-tall, 60-foot-long section of terrain",
        "targets": "",
        "description": "You make passage through the area safe for a brief amount of time. Anyone passing through the area gains the following benefits against harmful effects of the terrain and environment, including environmental damage, hazardous terrain, and hazards in the area. The spell grants a +2 status bonus to AC and saves against such effects, and resistance 5 to all damage from such effects. Furthermore, the spell prevents anything in the area that's prone to collapse, such as a rickety bridge or an unstable ceiling, from collapsing, except under extreme strain that would collapse a normal structure of its type.\n\n_Safe passage_ protects only against harm, not inconvenience, and it doesn't reduce difficult terrain, remove the concealed condition caused by precipitation, or the like, nor does it protect against creatures within the spell's area.",
        "content_source_id": 1,
        "version": "1.0",
        "uuid": "6425681134899699",
        "heightened": {
          "text": [
            {
              "amount": "(5th)",
              "text": "The granted resistance increases to 10, and the area can be 120 feet long."
            },
            {
              "amount": "(8th)",
              "text": "The granted resistance increases to 15, and the area can be 500 feet long."
            }
          ],
          "data": {}
        },
        "availability": null
      },
      "metadata": {
        "damage": [],
        "source": {
          "url": "https://2e.aonprd.com/Spells.aspx?ID=1659",
          "book": "Player Core",
          "page": "355"
        },
        "foundry": {
          "rules": [],
          "is_focus": false
        }
      },
      "description_md5": "56b0844109450c6b4d14a4d2a6cb751c",
      "duration": {
        "before": "1 minute",
        "after": "sustained up to 1 minute",
        "before_md5": "f77eb9f1b917ba78f6eb2ce8ede0a0e4",
        "after_md5": "50333c8c6ec3bcb5d26d25117a3e61ac"
      },
      "metadata_absent": [
        "focus",
        "type",
        "ritual",
        "unselectable",
        "deprecated"
      ]
    }
  ],
  "source": {
    "expected": {
      "id": 1,
      "name": "Player Core",
      "user_id": null,
      "is_published": true,
      "require_key": false,
      "deprecated": null,
      "group": "pathfinder-core",
      "required_content_sources": []
    }
  }
}
$duration$::jsonb value)
select 'treasure-vault-safe-passage-duration'::text id,
coalesce((
  select jsonb_array_length(spec.value->'spells')=1
    and spec.value#>>'{spells,0,id}'='4814'
    and spec.value#>>'{source,expected,id}'='1'
    and not exists (
      select 1 from public.content_source s
      right join (select spec.value#>'{source,expected}' expected) c
        on s.id=(c.expected->>'id')::bigint
      where s.id is null or exists (
        select 1 from jsonb_each(c.expected) e where to_jsonb(s)->e.key is distinct from e.value
      )
    )
    and not exists (
      select 1 from jsonb_array_elements(spec.value->'spells') p
      left join public.spell s on s.id=(p->>'id')::bigint
      where s.id is null or exists (
        select 1 from jsonb_each(p->'expected') e
        where (to_jsonb(s)||jsonb_build_object('uuid',s.uuid::text))->e.key is distinct from e.value
      ) or jsonb_typeof(s.meta_data::jsonb) is distinct from 'object'
        or exists (
          select 1 from jsonb_each(p->'metadata') e
          where (s.meta_data::jsonb)->e.key is distinct from e.value
        ) or exists (
          select 1 from jsonb_array_elements_text(p->'metadata_absent') k(key)
          where s.meta_data::jsonb ? k.key
        ) or md5(s.description) is distinct from p->>'description_md5'
        or s.duration is distinct from p#>>'{duration,after}'
        or p#>>'{duration,before}' is distinct from '1 minute'
        or p#>>'{duration,after}' is distinct from 'sustained up to 1 minute'
        or md5(p#>>'{duration,before}') is distinct from p#>>'{duration,before_md5}'
        or md5(p#>>'{duration,after}') is distinct from p#>>'{duration,after_md5}'
    )
    and not exists (
      select 1 from public.content_update u
      where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
        (u.type='content-source' and (
      u.ref_id=(spec.value#>>'{source,expected,id}')::bigint
      or u.data->>'id'=spec.value#>>'{source,expected,id}'
      or (u.ref_id is null and u.data->>'name'=spec.value#>>'{source,expected,name}')
    ))
        or exists (
          select 1 from jsonb_array_elements(spec.value->'spells') p
          where u.type='spell' and (
      u.ref_id=(p->>'id')::bigint
      or (u.ref_id is null and (
        u.data->>'id'=p->>'id'
        or ((u.content_source_id=(p#>>'{expected,content_source_id}')::bigint
          or u.data->>'content_source_id'=p#>>'{expected,content_source_id}')
          and u.data->>'name'=p#>>'{expected,name}')
      ))
    )
        )
      )
    )
  from spec
),false) passed
)
select original_checks.id,case when coalesce((status.value->>'recognized')::boolean,true) then coalesce((status.value->>'passed')::boolean,false) else original_checks.passed end as passed from original_checks cross join terminal_status status;
