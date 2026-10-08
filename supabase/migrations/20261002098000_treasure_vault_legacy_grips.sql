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
  execute $historical_original_dual$-- Restore the printed hand count on retained legacy base weapons.
do $repair$
declare
  spec constant jsonb := $grips098$
{
  "capture": "2026-10-02T20:40:31.177Z",
  "patches": [
    {
      "table": "item",
      "id": 11810,
      "name": "Breaching Pike (legacy)",
      "changed_columns": [
        "hands",
        "usage"
      ],
      "anchor": {
        "id": 11810,
        "bulk": "1",
        "name": "Breaching Pike (legacy)",
        "size": "MEDIUM",
        "uuid": "8639871030534494",
        "group": "WEAPON",
        "hands": null,
        "level": 0,
        "price": {
          "gp": 8
        },
        "usage": "held-in-one-hand",
        "rarity": "UNCOMMON",
        "traits": [
          2862,
          1573,
          3280
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "spear",
          "range": null,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d6",
            "dice": 1,
            "extra": "",
            "damageType": "piercing"
          },
          "hp_max": 0,
          "reload": "",
          "source": {
            "url": "https://2e.aonprd.com/Weapons.aspx?ID=620",
            "book": "Treasure Vault",
            "page": "26"
          },
          "charges": {},
          "foundry": {
            "bonus": 0,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 0
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "breaching-pike",
          "image_url": "",
          "is_shoddy": false,
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:14:43.026153+00:00",
        "operations": null,
        "description": "Forged with a heavy metal wedge as a spearhead, breaching pikes are often used by hobgoblin infantry alongside a tower shield. Breaching pikes are particularly effective at damaging enemy shields, leaving large, triangular puncture holes behind.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 11810,
        "bulk": "1",
        "name": "Breaching Pike (legacy)",
        "size": "MEDIUM",
        "uuid": "8639871030534494",
        "group": "WEAPON",
        "hands": "1",
        "level": 0,
        "price": {
          "gp": 8
        },
        "usage": "",
        "rarity": "UNCOMMON",
        "traits": [
          2862,
          1573,
          3280
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "spear",
          "range": null,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d6",
            "dice": 1,
            "extra": "",
            "damageType": "piercing"
          },
          "hp_max": 0,
          "reload": "",
          "source": {
            "url": "https://2e.aonprd.com/Weapons.aspx?ID=620",
            "book": "Treasure Vault",
            "page": "26"
          },
          "charges": {},
          "foundry": {
            "bonus": 0,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 0
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "breaching-pike",
          "image_url": "",
          "is_shoddy": false,
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:14:43.026153+00:00",
        "operations": null,
        "description": "Forged with a heavy metal wedge as a spearhead, breaching pikes are often used by hobgoblin infantry alongside a tower shield. Breaching pikes are particularly effective at damaging enemy shields, leaving large, triangular puncture holes behind.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": [
        {
          "url": "https://2e.aonprd.com/Weapons.aspx?ID=620&NoRedirect=1",
          "captured_at": "2026-10-01T19:59:11.830Z",
          "sha256": "a9ca05e6146279b15ad737e049f470b91977bfbcb554ff1ad6bc2b440448d36d"
        }
      ],
      "rationale": "Retained legacy base weapon explicitly prints Hands1 and no Usage. Match the content-cleaner contract without changing identity, attribution, traits, prose, price, damage or saved copies."
    },
    {
      "table": "item",
      "id": 12532,
      "name": "Thunder Sling (legacy)",
      "changed_columns": [
        "hands",
        "usage"
      ],
      "anchor": {
        "id": 12532,
        "bulk": "0.1",
        "name": "Thunder Sling (legacy)",
        "size": "MEDIUM",
        "uuid": "6724541070426493",
        "group": "WEAPON",
        "hands": null,
        "level": 0,
        "price": {
          "gp": 5
        },
        "usage": "held-in-one-hand",
        "rarity": "UNCOMMON",
        "traits": [
          1569,
          1579,
          2977
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "sling",
          "range": 50,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d6",
            "dice": 1,
            "extra": "",
            "damageType": "piercing"
          },
          "hp_max": 0,
          "reload": "1",
          "source": {
            "url": "https://2e.aonprd.com/Weapons.aspx?ID=655",
            "book": "Treasure Vault",
            "page": "31"
          },
          "charges": {},
          "foundry": {
            "bonus": 0,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 0
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "thunder-sling",
          "image_url": "",
          "is_shoddy": false,
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:24:04.691441+00:00",
        "operations": null,
        "description": "Tengu use these specialized slings to fire darts further and with greater force than when thrown by hand. A thunder sling uses darts as ammunition. It can also hurl blowgun darts as ammunition but deals 1d4 piercing instead of 1d6 when used this way.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 12532,
        "bulk": "0.1",
        "name": "Thunder Sling (legacy)",
        "size": "MEDIUM",
        "uuid": "6724541070426493",
        "group": "WEAPON",
        "hands": "1",
        "level": 0,
        "price": {
          "gp": 5
        },
        "usage": "",
        "rarity": "UNCOMMON",
        "traits": [
          1569,
          1579,
          2977
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "sling",
          "range": 50,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d6",
            "dice": 1,
            "extra": "",
            "damageType": "piercing"
          },
          "hp_max": 0,
          "reload": "1",
          "source": {
            "url": "https://2e.aonprd.com/Weapons.aspx?ID=655",
            "book": "Treasure Vault",
            "page": "31"
          },
          "charges": {},
          "foundry": {
            "bonus": 0,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 0
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "thunder-sling",
          "image_url": "",
          "is_shoddy": false,
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:24:04.691441+00:00",
        "operations": null,
        "description": "Tengu use these specialized slings to fire darts further and with greater force than when thrown by hand. A thunder sling uses darts as ammunition. It can also hurl blowgun darts as ammunition but deals 1d4 piercing instead of 1d6 when used this way.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": [
        {
          "url": "https://2e.aonprd.com/Weapons.aspx?ID=655&NoRedirect=1",
          "captured_at": "2026-10-01T19:59:23.931Z",
          "sha256": "96ed5a006524efed46de525d3fbb677a3e6ba35f032a30cad55840d759381d4e"
        }
      ],
      "rationale": "Retained legacy base weapon explicitly prints Hands1 and no Usage. Match the content-cleaner contract without changing identity, attribution, traits, prose, price, damage or saved copies."
    }
  ],
  "dependencies": [
    {
      "table": "trait",
      "id": 1569,
      "name": "Agile",
      "anchor": {
        "id": 1569,
        "name": "Agile",
        "uuid": "8144183238496458",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=526",
            "book": "Player Core",
            "page": "282"
          },
          "important": true
        },
        "created_at": "2023-12-03T18:52:57.920674+00:00",
        "description": "The multiple attack penalty you take with this weapon on the second attack on your turn is -4 instead of -5, and -8 instead of -10 on the third and subsequent attacks in the turn.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1573,
      "name": "Reach",
      "anchor": {
        "id": 1573,
        "name": "Reach",
        "uuid": "175486816832894",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=684",
            "book": "Player Core",
            "page": "283"
          }
        },
        "created_at": "2023-12-03T18:53:08.705751+00:00",
        "description": "This weapon is long and can be used to attack creatures up to 10 feet away instead of only adjacent creatures. For creatures that already have reach with the limb or limbs that wield the weapon, the weapon increases their reach by 5 feet.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1579,
      "name": "Propulsive",
      "anchor": {
        "id": 1579,
        "name": "Propulsive",
        "uuid": "8006830655921977",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=677",
            "book": "Player Core",
            "page": "282"
          },
          "important": true
        },
        "created_at": "2023-12-03T18:54:19.177617+00:00",
        "description": "You add half your Strength modifier (if positive) to damage rolls with a propulsive ranged weapon. If you have a negative Strength modifier, you add your full Strength modifier instead.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 2862,
      "name": "Razing",
      "anchor": {
        "id": 2862,
        "name": "Razing",
        "uuid": "3487636607906101",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=784",
            "book": "Player Core 2",
            "page": "274"
          },
          "important": false,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": false,
          "archetype_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2024-04-19T04:13:26.233427+00:00",
        "description": "Razing weapons are particularly good at damaging objects, structures, and vehicles. Whenever you deal damage to an object (including shields and animated objects), structure, or vehicle with a razing weapon, the object takes an amount of additional damage equal to double the number of weapon damage dice.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 2977,
      "name": "Tengu (legacy)",
      "anchor": {
        "id": 2977,
        "name": "Tengu (legacy)",
        "uuid": "4515163208377767",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=240",
            "book": "Advanced Player's Guide",
            "page": "270"
          },
          "ancestry_trait": true
        },
        "created_at": "2024-04-23T16:09:35.361155+00:00",
        "description": "This indicates content from the tengu (legacy) ancestry.",
        "content_source_id": 14
      }
    },
    {
      "table": "trait",
      "id": 3280,
      "name": "Hobgoblin (legacy)",
      "anchor": {
        "id": 3280,
        "name": "Hobgoblin (legacy)",
        "uuid": "6875858145996890",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=268",
            "book": "Character Guide",
            "page": "133"
          },
          "ancestry_trait": true
        },
        "created_at": "2024-05-09T01:20:37.467834+00:00",
        "description": "This indicates content from the hobgoblin (legacy) ancestry.",
        "content_source_id": 19
      }
    }
  ],
  "sources": [
    {
      "id": 3,
      "name": "Common Core"
    },
    {
      "id": 14,
      "name": "Advanced Player's Guide (in progress)"
    },
    {
      "id": 16,
      "name": "Treasure Vault"
    },
    {
      "id": 19,
      "name": "Character Guide (backport)"
    }
  ],
  "ownership": "Only printed Hands and Usage fields on two retained legacy base weapons. Identities, attribution, metadata, prose, traits, price, damage, operations, source counters, saved inventories and curator submissions are unchanged.",
  "boundaries": {
    "identity_and_source": "Retain legacy identities and valid legacy source attribution. Do not rename to current versions or change ancestry traits.",
    "visual": "Drawer changes from existing Usage:held in one hand to printed Hands:1. No new UI text, notes, toast, or modal.",
    "saved": "Saved item snapshots remain unchanged. The separate narrow division consumer fix recognizes their existing exact Usage, without writing saved content.",
    "historical_projection": "Owner descriptions come from the exact established pre100 projection; final100 must compose its separate reviewed prose on these exact grip successors, not allow arbitrary before/final mixtures.",
    "runtime": "Private164 full-universe GREEN plus five controller regressions preserve ordinary proficiency, damage/MAP, explicit hands and unsupported grip boundaries."
  }
}
$grips098$::jsonb;
  patch jsonb;
  dependency jsonb;
  actual jsonb;
  captured jsonb := '{}'::jsonb;
  captured_dependencies jsonb := '{}'::jsonb;
  captured_sources jsonb;
  queue_before text;
  queue_actual text;
  changed integer;
  baseline_owners integer := 0;
  terminal_owners integer := 0;
begin
  lock table public.content_update in share mode;
  perform id from public.item where id in (select (p->>'id')::bigint from jsonb_array_elements(spec->'patches') p) order by id for update;
  perform id from public.trait where id in (select (d->>'id')::bigint from jsonb_array_elements(spec->'dependencies') d) order by id for share;
  perform s.id from public.content_source s join jsonb_array_elements(spec->'sources') p on s.id=(p->>'id')::bigint where s.name=p->>'name' and s.user_id is null and s.is_published is true order by s.id for update;
  get diagnostics changed=row_count;
  if changed<>jsonb_array_length(spec->'sources') then raise exception 'Treasure Vault grips sources changed'; end if;
  if exists (
  select 1 from public.content_update u
  where upper(btrim(coalesce(u.status->>'state','PENDING'))) not in ('APPROVED','REJECTED')
    and (
      exists (
        select 1 from jsonb_array_elements(spec->'sources') s
        where u.type='content-source' and (u.ref_id=(s->>'id')::bigint or u.data->>'id'=s->>'id'
          or lower(btrim(u.data->>'name'))=lower(btrim(s->>'name')))
      )
      or exists (
        select 1 from jsonb_array_elements(spec->'patches') p
        where u.type='item' and (u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id'
          or u.data->>'uuid'=p#>>'{anchor,uuid}'
          or ((u.content_source_id=(p#>>'{anchor,content_source_id}')::bigint or u.data->>'content_source_id'=p#>>'{anchor,content_source_id}')
            and lower(btrim(u.data->>'name'))=lower(btrim(p->>'name')))
          or lower(btrim(u.data#>>'{meta_data,source,url}'))=lower(btrim(p#>>'{anchor,meta_data,source,url}'))
          or exists (select 1 from jsonb_array_elements(p->'primary') primary_ref
            where lower(btrim(u.data#>>'{meta_data,source,url}'))=lower(btrim(primary_ref->>'url'))))
      )
      or exists (
        select 1 from jsonb_array_elements(spec->'dependencies') d
        where u.type='trait' and (u.ref_id=(d->>'id')::bigint or u.data->>'id'=d->>'id'
          or u.data->>'uuid'=d#>>'{anchor,uuid}'
          or ((u.content_source_id=(d#>>'{anchor,content_source_id}')::bigint or u.data->>'content_source_id'=d#>>'{anchor,content_source_id}')
            and lower(btrim(u.data->>'name'))=lower(btrim(d->>'name')))
          or (coalesce(d#>>'{anchor,meta_data,source,url}','')<>''
            and lower(btrim(u.data#>>'{meta_data,source,url}'))=lower(btrim(d#>>'{anchor,meta_data,source,url}'))))
      )
    )
) then raise exception 'Treasure Vault grips pending curator submission'; end if;
  select md5(coalesce(string_agg(to_jsonb(u)::text,E'\n' order by u.id),'')) into queue_actual from public.content_update u;
  queue_before:=queue_actual;
  select jsonb_object_agg(s.id::text,to_jsonb(s)-'updated_at') into actual from public.content_source s where s.id in (select (p->>'id')::bigint from jsonb_array_elements(spec->'sources') p);
  captured_sources:=actual;
  for dependency in select value from jsonb_array_elements(spec->'dependencies') loop
    select (to_jsonb(t)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',t.uuid::text) into actual from public.trait t where t.id=(dependency->>'id')::bigint;
    if actual is distinct from dependency->'anchor' then raise exception 'Treasure Vault grips dependency changed: %',dependency->>'id'; end if;
    captured_dependencies:=jsonb_set(captured_dependencies,array[dependency->>'id'],actual,true);
  end loop;
  for patch in select value from jsonb_array_elements(spec->'patches') loop
    select (to_jsonb(i)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',i.uuid::text) into actual from public.item i where i.id=(patch->>'id')::bigint;
    if actual=patch->'anchor' then baseline_owners:=baseline_owners+1;
    elsif actual=patch->'final' then terminal_owners:=terminal_owners+1;
    else raise exception 'Treasure Vault grips complete owner changed: %',patch->>'id'; end if;
    captured:=jsonb_set(captured,array[patch->>'id'],actual,true);
  end loop;
  if baseline_owners>0 and terminal_owners>0 then raise exception 'Treasure Vault grips partial atomic domain'; end if;
  for patch in select value from jsonb_array_elements(spec->'patches') loop
    if captured->(patch->>'id') is distinct from patch->'final' then
      update public.item i set hands=patch#>>'{final,hands}',usage=patch#>>'{final,usage}'
      where i.id=(patch->>'id')::bigint and ((to_jsonb(i)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',i.uuid::text))=captured->(patch->>'id');
      get diagnostics changed=row_count;
      if changed<>1 then raise exception 'Treasure Vault grips captured CAS failed'; end if;
    end if;
    select (to_jsonb(i)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',i.uuid::text) into actual from public.item i where i.id=(patch->>'id')::bigint;
    if actual is distinct from patch->'final' then raise exception 'Treasure Vault grips post-trigger owner drift'; end if;
  end loop;
  for patch in select value from jsonb_array_elements(spec->'patches') loop
    select (to_jsonb(i)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',i.uuid::text) into actual from public.item i where i.id=(patch->>'id')::bigint;
    if actual is distinct from patch->'final' then raise exception 'Treasure Vault grips final owner drift'; end if;
  end loop;
  for dependency in select value from jsonb_array_elements(spec->'dependencies') loop
    select (to_jsonb(t)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',t.uuid::text) into actual from public.trait t where t.id=(dependency->>'id')::bigint;
    if actual is distinct from captured_dependencies->(dependency->>'id') then raise exception 'Treasure Vault grips final dependency drift'; end if;
  end loop;
  select jsonb_object_agg(s.id::text,to_jsonb(s)-'updated_at') into actual from public.content_source s where s.id in (select (p->>'id')::bigint from jsonb_array_elements(spec->'sources') p);
  if actual is distinct from captured_sources then raise exception 'Treasure Vault grips final source drift'; end if;
  select md5(coalesce(string_agg(to_jsonb(u)::text,E'\n' order by u.id),'')) into queue_actual from public.content_update u;
  if queue_actual is distinct from queue_before or exists (
  select 1 from public.content_update u
  where upper(btrim(coalesce(u.status->>'state','PENDING'))) not in ('APPROVED','REJECTED')
    and (
      exists (
        select 1 from jsonb_array_elements(spec->'sources') s
        where u.type='content-source' and (u.ref_id=(s->>'id')::bigint or u.data->>'id'=s->>'id'
          or lower(btrim(u.data->>'name'))=lower(btrim(s->>'name')))
      )
      or exists (
        select 1 from jsonb_array_elements(spec->'patches') p
        where u.type='item' and (u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id'
          or u.data->>'uuid'=p#>>'{anchor,uuid}'
          or ((u.content_source_id=(p#>>'{anchor,content_source_id}')::bigint or u.data->>'content_source_id'=p#>>'{anchor,content_source_id}')
            and lower(btrim(u.data->>'name'))=lower(btrim(p->>'name')))
          or lower(btrim(u.data#>>'{meta_data,source,url}'))=lower(btrim(p#>>'{anchor,meta_data,source,url}'))
          or exists (select 1 from jsonb_array_elements(p->'primary') primary_ref
            where lower(btrim(u.data#>>'{meta_data,source,url}'))=lower(btrim(primary_ref->>'url'))))
      )
      or exists (
        select 1 from jsonb_array_elements(spec->'dependencies') d
        where u.type='trait' and (u.ref_id=(d->>'id')::bigint or u.data->>'id'=d->>'id'
          or u.data->>'uuid'=d#>>'{anchor,uuid}'
          or ((u.content_source_id=(d#>>'{anchor,content_source_id}')::bigint or u.data->>'content_source_id'=d#>>'{anchor,content_source_id}')
            and lower(btrim(u.data->>'name'))=lower(btrim(d->>'name')))
          or (coalesce(d#>>'{anchor,meta_data,source,url}','')<>''
            and lower(btrim(u.data#>>'{meta_data,source,url}'))=lower(btrim(d#>>'{anchor,meta_data,source,url}'))))
      )
    )
) then raise exception 'Treasure Vault grips final curator drift'; end if;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
