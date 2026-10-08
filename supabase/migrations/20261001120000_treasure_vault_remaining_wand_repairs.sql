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
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((p.prosrc)::text,'UTF8')),'hex')='daea9d6e1e03e4adbb63c5ab1e06ad540f09b032ae32a1a0b85e421f43d07ded'
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
    "description": {
      "before": "b6bbe89f2e9c8546faae194b348ece28",
      "after": "f6c49cbe682aa04903d324b67948b8b6",
      "replacements": [
        {
          "from": "\\[\\[Sleep\\]\\]",
          "to": "*[sleep](link_spell_4837)*",
          "count": 1
        },
        {
          "from": "Cast a Spell",
          "to": "[Cast a Spell](link_action_19611)",
          "count": 1
        },
        {
          "from": "\\[\\[Unconscious\\]\\]",
          "to": "unconscious",
          "count": 1
        },
        {
          "from": "\\[\\[Frightened\\]\\]{Frightened 1}",
          "to": "frightened 1",
          "count": 1
        },
        {
          "from": "1d6 persistent,mental",
          "to": "1d6 persistent mental damage",
          "count": 1
        }
      ]
    },
    "craft": {
      "before": "6dd82e6d6719069520982fbc794e7c7c",
      "after": "074cb73b25584252f89930b164ac9c6f",
      "replacements": [
        {
          "from": "[[Sleep]]",
          "to": "*[sleep](link_spell_4837)*",
          "count": 1
        }
      ]
    }
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
    "description": {
      "before": "27a8228080420f7decdfc1da4d4d571b",
      "after": "a4c7d0f23d79911a5369dbb38af6eafd",
      "replacements": [
        {
          "from": "\\[\\[Uncontrollable Dance\\]\\]",
          "to": "*[uncontrollable dance](link_spell_4914)*",
          "count": 1
        },
        {
          "from": "Cast a Spell",
          "to": "[Cast a Spell](link_action_19611)",
          "count": 1
        },
        {
          "from": "\\[\\[Fatigued\\]\\]",
          "to": "fatigued",
          "count": 1
        }
      ]
    },
    "craft": {
      "before": "bfb7a5a177dc8a69fc5605dd4e12d48f",
      "after": "6e16160da9c357a80616b064c9faa5f5",
      "replacements": [
        {
          "from": "[[Uncontrollable Dance]]",
          "to": "*[uncontrollable dance](link_spell_4914)*",
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
  perform a.id from public.ability_block a where a.id in (
    select (value->>'id')::bigint from jsonb_array_elements(dependencies)
      where value->>'table' = 'ability-block'
  ) order by a.id for share;
  perform i.id from public.item i where i.id in (
    select (value->>'id')::bigint from jsonb_array_elements(patches)
  ) order by i.id for update;
  perform s.id from public.spell s where s.id in (
    select (value->>'id')::bigint from jsonb_array_elements(dependencies)
      where value->>'table' = 'spell'
  ) order by s.id for update;
  perform t.id from public.trait t where t.id in (
    select (value->>'id')::bigint from jsonb_array_elements(dependencies)
      where value->>'table' = 'trait'
  ) order by t.id for share;
  perform id from public.content_source where id in (3,16)
    and user_id is null and is_published is true order by id for update;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 2 then raise exception 'Missing official remaining wand sources'; end if;
  perform s.id from public.spell s join jsonb_array_elements(dependencies) d
    on d->>'table' = 'spell' and s.id = (d->>'id')::bigint
    where s.name = d->>'name' and s.uuid = (d->>'uuid')::bigint and s.content_source_id = (d->>'source')::bigint
      and jsonb_build_object('rank',s.rank,'traditions',to_jsonb(s.traditions),'cast',s."cast",'range',s."range",'targets',s.targets,'duration',s.duration,'area',s.area,'heightened',s.heightened::jsonb) = d->'headers'
      and md5(s.description) = d->>'description_md5'
      and jsonb_typeof(s.meta_data) = 'object' and s.meta_data->'source' = d->'citation'
      and (s.defense is not distinct from d->>'defense'
        or s.defense is not distinct from d->>'defense_after')
    order by s.id for update of s;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 2 then raise exception 'Remaining wand spell dependency differs from reviewed entry'; end if;
  perform a.id from public.ability_block a join jsonb_array_elements(dependencies) d
    on d->>'table' = 'ability-block' and a.id = (d->>'id')::bigint
    where a.name = d->>'name' and a.uuid = (d->>'uuid')::bigint
      and a.content_source_id = (d->>'source')::bigint and a.type = d->>'type'
      and md5(a.description) = d->>'description_md5' order by a.id for share of a;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then raise exception 'Cast a Spell action dependency differs from reviewed entry'; end if;
  perform t.id from public.trait t join jsonb_array_elements(dependencies) d
    on d->>'table' = 'trait' and t.id = (d->>'id')::bigint
    where t.name = d->>'name' and t.uuid = (d->>'uuid')::bigint
      and t.content_source_id = (d->>'source')::bigint order by t.id for share of t;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then raise exception 'Wand eligibility trait identity changed'; end if;
  if exists (select 1 from public.content_update u join jsonb_array_elements(dependencies) d
    on u.type = d->>'table' and u.ref_id = (d->>'id')::bigint
    where u.status->>'state' = 'PENDING') then
    raise exception 'Remaining wand dependency has a pending curator submission';
  end if;
  for patch in select value from jsonb_array_elements(patches) order by (value->>'id')::bigint loop
    select * into item_row from public.item where id = (patch->>'id')::bigint for update;
    if not found or item_row.name is distinct from patch->>'name'
      or item_row.uuid is distinct from (patch->>'uuid')::bigint
      or item_row.content_source_id is distinct from (patch->>'source')::bigint
      or item_row.level is distinct from (patch->>'level')::integer
      or item_row.price::jsonb is distinct from patch->'price'
      or to_jsonb(item_row.traits) is distinct from patch->'traits'
      or item_row."group" is distinct from 'GENERAL' or item_row.usage is distinct from 'held-in-one-hand'
      or jsonb_typeof(item_row.meta_data) is distinct from 'object'
      or item_row.meta_data->'source' is distinct from patch->'citation'
      or (md5(item_row.description) = patch->'description'->>'before'
        or md5(item_row.description) = patch->'description'->>'after') is not true
      or (md5(item_row.craft_requirements) = patch->'craft'->>'before'
        or md5(item_row.craft_requirements) = patch->'craft'->>'after') is not true then
      raise exception 'Remaining wand differs from reviewed entry: %', patch->>'id';
    end if;
    if exists (select 1 from public.content_update where type = 'item'
      and ref_id = item_row.id and status->>'state' = 'PENDING') then
      raise exception 'Remaining wand has a pending curator submission: %', patch->>'id';
    end if;
    next_description := item_row.description;
    if md5(next_description) is distinct from patch->'description'->>'after' then
      for replacement in select value from jsonb_array_elements(patch->'description'->'replacements') loop
        if replacement->>'from' = '' or
          (length(next_description)-length(replace(next_description,replacement->>'from',''))) /
            length(replacement->>'from') <> (replacement->>'count')::integer then
          raise exception 'Remaining wand description fragment changed: %', patch->>'id';
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
          raise exception 'Remaining wand craft fragment changed: %', patch->>'id';
        end if;
        next_craft := replace(next_craft,replacement->>'from',replacement->>'to');
      end loop;
    end if;
    if md5(next_description) is distinct from patch->'description'->>'after'
      or md5(next_craft) is distinct from patch->'craft'->>'after' then
      raise exception 'Remaining wand text does not match reviewed result: %', patch->>'id';
    end if;
    if next_description is distinct from item_row.description or next_craft is distinct from item_row.craft_requirements then
      update public.item set description = next_description, craft_requirements = next_craft
        where id = item_row.id and description is not distinct from item_row.description
          and craft_requirements is not distinct from item_row.craft_requirements;
      get diagnostics changed_rows = row_count;
      if changed_rows <> 1 then raise exception 'Remaining wand changed during repair'; end if;
    end if;
  end loop;
  update public.spell set defense = 'Will' where id = 4914 and defense is null;
  get diagnostics changed_rows = row_count;
  if changed_rows > 1 then raise exception 'Uncontrollable Dance defense repair changed multiple rows'; end if;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
