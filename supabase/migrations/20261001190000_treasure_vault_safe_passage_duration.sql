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
  execute $historical_original_dual$-- Correct only the reviewed Safe Passage duration; retain all other spell content.
do $repair$
declare
  spec constant jsonb := $duration$
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
$duration$::jsonb;
  source_row jsonb;
  patch jsonb;
  spell_row public.spell%rowtype;
  before_body jsonb;
  after_row jsonb;
  changed_rows integer;
begin
  lock table public.content_update in share mode;
  -- Acquire reviewed content rows before source cache locks.
  perform s.id from public.spell s where s.id in (
    select (p->>'id')::bigint from jsonb_array_elements(spec->'spells') p
  ) order by s.id for update;
  -- End reviewed content row prelocks.

  select to_jsonb(s) into source_row from public.content_source s
    where s.id=(spec#>>'{source,expected,id}')::bigint for update;
  if not found or exists (
    select 1 from jsonb_each(spec#>'{source,expected}') e
    where source_row->e.key is distinct from e.value
  ) then raise exception 'Safe Passage official source identity/publication changed'; end if;
  if exists (
    select 1 from public.content_update u
    where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED')
      and (u.type='content-source' and (
      u.ref_id=(spec#>>'{source,expected,id}')::bigint
      or u.data->>'id'=spec#>>'{source,expected,id}'
      or (u.ref_id is null and u.data->>'name'=spec#>>'{source,expected,name}')
    ))
  ) then raise exception 'Safe Passage source has a pending or malformed curator submission'; end if;

  if jsonb_array_length(spec->'spells')<>1
    or spec#>>'{spells,0,id}' is distinct from '4814'
    or spec#>>'{source,expected,id}' is distinct from '1' then
    raise exception 'Invalid reviewed Safe Passage duration scope';
  end if;

  for patch in select value from jsonb_array_elements(spec->'spells') loop
    select * into spell_row from public.spell where id=(patch->>'id')::bigint for update;
    if not found or exists (
      select 1 from jsonb_each(patch->'expected') e
      where (to_jsonb(spell_row)||jsonb_build_object('uuid',spell_row.uuid::text))->e.key is distinct from e.value
    ) or jsonb_typeof(spell_row.meta_data::jsonb) is distinct from 'object'
      or exists (
        select 1 from jsonb_each(patch->'metadata') e
        where (spell_row.meta_data::jsonb)->e.key is distinct from e.value
      ) or exists (
        select 1 from jsonb_array_elements_text(patch->'metadata_absent') k(key)
        where spell_row.meta_data::jsonb ? k.key
      ) or md5(spell_row.description) is distinct from patch->>'description_md5' then
      raise exception 'Safe Passage identity/mechanics/content differ from the reviewed spell';
    end if;

    if exists (
      select 1 from public.content_update u
      where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED')
        and (u.type='spell' and (
      u.ref_id=(patch->>'id')::bigint
      or (u.ref_id is null and (
        u.data->>'id'=patch->>'id'
        or ((u.content_source_id=(patch#>>'{expected,content_source_id}')::bigint
          or u.data->>'content_source_id'=patch#>>'{expected,content_source_id}')
          and u.data->>'name'=patch#>>'{expected,name}')
      ))
    ))
    ) then raise exception 'Safe Passage has a pending or malformed curator submission'; end if;

    if patch#>>'{duration,before}' is distinct from '1 minute'
      or patch#>>'{duration,after}' is distinct from 'sustained up to 1 minute'
      or md5(patch#>>'{duration,before}') is distinct from patch#>>'{duration,before_md5}'
      or md5(patch#>>'{duration,after}') is distinct from patch#>>'{duration,after_md5}' then
      raise exception 'Invalid reviewed Safe Passage duration pair';
    end if;
    if spell_row.duration is not distinct from patch#>>'{duration,after}' then continue; end if;
    if spell_row.duration is distinct from patch#>>'{duration,before}' then
      raise exception 'Safe Passage duration is not a complete reviewed before/after state';
    end if;

    before_body:=to_jsonb(spell_row)-'duration'-'updated_at'-'search_tsv';
    update public.spell s set duration=patch#>>'{duration,after}'
      where s.id=spell_row.id and s.uuid is not distinct from spell_row.uuid
        and s.content_source_id is not distinct from spell_row.content_source_id
        and s.duration is not distinct from patch#>>'{duration,before}';
    get diagnostics changed_rows=row_count;
    if changed_rows<>1 then raise exception 'Safe Passage duration compare-and-set failed'; end if;

    select to_jsonb(s) into after_row from public.spell s where s.id=spell_row.id;
    if not found or after_row->>'duration' is distinct from patch#>>'{duration,after}'
      or (after_row-'duration'-'updated_at'-'search_tsv') is distinct from before_body then
      raise exception 'Safe Passage duration write changed an unrelated field or failed its terminal state';
    end if;
  end loop;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
