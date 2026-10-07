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
  execute $historical_original_dual$-- Restore the printed definitions for existing parameterized equipment traits.
do $repair$
declare
  spec constant jsonb := $traits$
{
  "blocks": [
    {
      "id": 2873,
      "anchor": {
        "id": 2873,
        "name": "Adjusted",
        "uuid": "5764728699839630",
        "created_at": "2024-04-19T04:14:48.738706+00:00",
        "content_source_id": 16
      },
      "before": {
        "description": "",
        "metadata": null
      },
      "after": {
        "description": "The equipment comes with an adjustment described in its entry. This adjustment is built into the equipment permanently, meaning the equipment can't have another adjustment added, nor can it be swapped out for a different adjustment. If the adjustment alters the item's base statistics, such as adding the [noisy](link_trait_1582) trait, that's reflected in the equipment's table entry.",
        "metadata": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=468",
            "book": "Treasure Vault (Remastered)",
            "page": "216"
          }
        }
      }
    },
    {
      "id": 2881,
      "anchor": {
        "id": 2881,
        "name": "Launching Dart",
        "uuid": "8881833178962717",
        "created_at": "2024-04-19T04:16:11.764549+00:00",
        "content_source_id": 16
      },
      "before": {
        "description": "",
        "metadata": null
      },
      "after": {
        "description": "A mechanism within this shield can shoot projectiles, causing the shield to also function as a ranged weapon. The trait lists the type of weapon, such as “launching dart.” Striking with the launcher requires the same number of hands as normal, except that the hand holding the shield counts toward this total, so a one-handed ranged weapon would require only one hand. Reloading takes the normal number of [Interact](link_action_19733) actions, to a minimum of 1 action, and you can't use the hand holding your shield to reload.",
        "metadata": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=483",
            "book": "Treasure Vault (Remastered)",
            "page": "220"
          }
        }
      }
    },
    {
      "id": 2887,
      "anchor": {
        "id": 2887,
        "name": "Shield Throw 30",
        "uuid": "2071518794795293",
        "created_at": "2024-04-19T04:18:38.722082+00:00",
        "content_source_id": 16
      },
      "before": {
        "description": "",
        "metadata": null
      },
      "after": {
        "description": "A shield with this trait is designed to be thrown as a ranged attack. When thrown, the shield is a martial [thrown](link_trait_1575) ranged weapon. Its damage dice and type are the same as its shield bash attack, but if the shield includes an [attached](link_trait_3653) weapon or integrated weapon, you can choose to attack with it instead when you throw the shield. You add your Strength modifier to damage, as typical of a [thrown](link_trait_1575) weapon. The trait also includes the range increment.",
        "metadata": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=490",
            "book": "Treasure Vault (Remastered)",
            "page": "221"
          }
        }
      }
    },
    {
      "id": 2890,
      "anchor": {
        "id": 2890,
        "name": "Deflecting Bludgeoning",
        "uuid": "6524555752659264",
        "created_at": "2024-04-19T04:18:44.775083+00:00",
        "content_source_id": 16
      },
      "before": {
        "description": "",
        "metadata": null
      },
      "after": {
        "description": "This shield is designed to block or divert certain types of attacks or weapons. Increase the shield's Hardness against the listed type of attack by 2.",
        "metadata": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=473",
            "book": "Treasure Vault (Remastered)",
            "page": "218"
          }
        }
      }
    },
    {
      "id": 2892,
      "anchor": {
        "id": 2892,
        "name": "Integrated 1 D 6 S Versatile P",
        "uuid": "2839132031931483",
        "created_at": "2024-04-19T04:19:16.71419+00:00",
        "content_source_id": 16
      },
      "before": {
        "description": "",
        "metadata": null
      },
      "after": {
        "description": "This shield has been created to include a weapon in its construction, which works like an [attached](link_trait_3653) weapon but can't be removed from the shield. This also prevents other [attached](link_trait_3653) weapons from being added to the shield. The integrated weapon's damage is listed alongside the trait, such as “integrated d6 S,” with any traits in parentheses. Unless otherwise noted in the shield's description, an integrated weapon is a martial weapon in the shield weapon group and requires one hand to attack with.\n\nThe [attached](link_trait_3653) weapon can have runes etched onto it like other [attached](link_trait_3653) weapons. You can continue fighting normally with the integrated weapon if the shield is broken, but if the shield is destroyed, so is the weapon.",
        "metadata": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=481",
            "book": "Treasure Vault (Remastered)",
            "page": "219"
          }
        }
      }
    },
    {
      "id": 2895,
      "anchor": {
        "id": 2895,
        "name": "Integrated 1 D 6 S",
        "uuid": "415867526743598",
        "created_at": "2024-04-19T04:21:19.404363+00:00",
        "content_source_id": 16
      },
      "before": {
        "description": "",
        "metadata": null
      },
      "after": {
        "description": "This shield has been created to include a weapon in its construction, which works like an [attached](link_trait_3653) weapon but can't be removed from the shield. This also prevents other [attached](link_trait_3653) weapons from being added to the shield. The integrated weapon's damage is listed alongside the trait, such as “integrated d6 S,” with any traits in parentheses. Unless otherwise noted in the shield's description, an integrated weapon is a martial weapon in the shield weapon group and requires one hand to attack with.\n\nThe [attached](link_trait_3653) weapon can have runes etched onto it like other [attached](link_trait_3653) weapons. You can continue fighting normally with the integrated weapon if the shield is broken, but if the shield is destroyed, so is the weapon.",
        "metadata": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=481",
            "book": "Treasure Vault (Remastered)",
            "page": "219"
          }
        }
      }
    },
    {
      "id": 2896,
      "anchor": {
        "id": 2896,
        "name": "Shield Throw 20",
        "uuid": "4636467218140761",
        "created_at": "2024-04-19T04:21:20.72238+00:00",
        "content_source_id": 16
      },
      "before": {
        "description": "",
        "metadata": null
      },
      "after": {
        "description": "A shield with this trait is designed to be thrown as a ranged attack. When thrown, the shield is a martial [thrown](link_trait_1575) ranged weapon. Its damage dice and type are the same as its shield bash attack, but if the shield includes an [attached](link_trait_3653) weapon or integrated weapon, you can choose to attack with it instead when you throw the shield. You add your Strength modifier to damage, as typical of a [thrown](link_trait_1575) weapon. The trait also includes the range increment.",
        "metadata": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=490",
            "book": "Treasure Vault (Remastered)",
            "page": "221"
          }
        }
      }
    },
    {
      "id": 2898,
      "anchor": {
        "id": 2898,
        "name": "Deflecting Physical Ranged",
        "uuid": "6912649900147573",
        "created_at": "2024-04-19T04:21:51.565687+00:00",
        "content_source_id": 16
      },
      "before": {
        "description": "",
        "metadata": null
      },
      "after": {
        "description": "This shield is designed to block or divert certain types of attacks or weapons. Increase the shield's Hardness against the listed type of attack by 2.",
        "metadata": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=473",
            "book": "Treasure Vault (Remastered)",
            "page": "218"
          }
        }
      }
    },
    {
      "id": 2904,
      "anchor": {
        "id": 2904,
        "name": "Deflecting Slashing",
        "uuid": "8398829696303312",
        "created_at": "2024-04-19T04:23:44.89733+00:00",
        "content_source_id": 16
      },
      "before": {
        "description": "",
        "metadata": null
      },
      "after": {
        "description": "This shield is designed to block or divert certain types of attacks or weapons. Increase the shield's Hardness against the listed type of attack by 2.",
        "metadata": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=473",
            "book": "Treasure Vault (Remastered)",
            "page": "218"
          }
        }
      }
    }
  ],
  "dependencies": [
    {
      "table": "ability_block",
      "id": 19733,
      "name": "Interact",
      "uuid": "3402914292668269",
      "content_source_id": 3,
      "type": "action"
    },
    {
      "table": "trait",
      "id": 1575,
      "name": "Thrown",
      "uuid": "1875697674463120",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1582,
      "name": "Noisy",
      "uuid": "4266038592624261",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 3653,
      "name": "Attached",
      "uuid": "6602176486008476",
      "content_source_id": 3
    }
  ],
  "sources": [
    {
      "id": 3,
      "name": "Common Core"
    },
    {
      "id": 16,
      "name": "Treasure Vault"
    }
  ]
}
$traits$::jsonb;
  patch jsonb;
  dependency jsonb;
  actual jsonb;
  expected jsonb;
  captured jsonb := '{}'::jsonb;
  dependencies jsonb := '{}'::jsonb;
  sources jsonb := '{}'::jsonb;
  changed integer;
begin
  lock table public.content_update in share mode;
  -- Child locks precede cache-parent locks to match the content write order.
  perform id from public.ability_block where id in (select (value->>'id')::bigint from jsonb_array_elements(spec->'dependencies') where value->>'table'='ability_block') order by id for share;
  perform id from public.trait where id in (select (value->>'id')::bigint from jsonb_array_elements(spec->'dependencies') where value->>'table'='trait') order by id for share;
  perform id from public.trait where id in (select (value->>'id')::bigint from jsonb_array_elements(spec->'blocks')) order by id for update;
  perform s.id from public.content_source s join jsonb_array_elements(spec->'sources') p on s.id=(p->>'id')::bigint where s.name=p->>'name' and s.user_id is null and s.is_published is true order by s.id for update;
  get diagnostics changed=row_count;
  if changed<>2 then raise exception 'Equipment trait sources changed'; end if;
  if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
  (u.type='content-source' and (u.ref_id in (3,16) or u.data->>'id' in ('3','16')))
  or (u.type in ('trait','ability-block','action') and exists(select 1 from jsonb_array_elements(spec->'blocks') p where u.type='trait' and (u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id' or u.data->>'uuid'=p#>>'{anchor,uuid}' or (coalesce(u.content_source_id::text,u.data->>'content_source_id')='16' and (lower(btrim(u.data->>'name'))=lower(p#>>'{anchor,name}') or lower(u.data#>>'{meta_data,source,url}')=lower(p#>>'{after,metadata,source,url}'))))))
  or exists(select 1 from jsonb_array_elements(spec->'dependencies') d where (u.type=replace(d->>'table','_','-') or (d->>'table'='ability_block' and u.type=d->>'type')) and (u.ref_id=(d->>'id')::bigint or u.data->>'id'=d->>'id' or u.data->>'uuid'=d->>'uuid' or (coalesce(u.content_source_id::text,u.data->>'content_source_id')=d->>'content_source_id' and lower(btrim(u.data->>'name'))=lower(d->>'name'))))
)) then raise exception 'Equipment trait pending curator submission'; end if;
  for dependency in select value from jsonb_array_elements(spec->'dependencies') loop
    actual:=null;
    if dependency->>'table'='trait' then select (to_jsonb(t)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',t.uuid::text) into actual from public.trait t where t.id=(dependency->>'id')::bigint;
    else select (to_jsonb(a)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',a.uuid::text) into actual from public.ability_block a where a.id=(dependency->>'id')::bigint; end if;
    if actual is null or not (actual @> (dependency-'table')) then raise exception 'Equipment trait dependency changed'; end if;
    dependencies:=jsonb_set(dependencies,array[(dependency->>'table')||':'||(dependency->>'id')],actual,true);
  end loop;
  select jsonb_object_agg(s.id::text,to_jsonb(s)-'updated_at') into sources from public.content_source s where s.id in (3,16);
  for patch in select value from jsonb_array_elements(spec->'blocks') order by (value->>'id')::bigint loop
    select (to_jsonb(t)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',t.uuid::text) into actual from public.trait t where t.id=(patch->>'id')::bigint;
    if actual is null or actual-'description'-'meta_data' is distinct from patch->'anchor' then raise exception 'Equipment trait anchor changed'; end if;
    expected:=jsonb_build_object('description',actual->'description','metadata',actual->'meta_data');
    if expected is distinct from patch->'before' and expected is distinct from patch->'after' then raise exception 'Equipment trait complete tuple changed'; end if;
    captured:=jsonb_set(captured,array[patch->>'id'],actual,true);
  end loop;
  for patch in select value from jsonb_array_elements(spec->'blocks') order by (value->>'id')::bigint loop
    actual:=captured->(patch->>'id');
    if actual->>'description' is distinct from patch#>>'{after,description}' then
      update public.trait t set description=patch#>>'{after,description}',meta_data=patch#>'{after,metadata}' where t.id=(patch->>'id')::bigint and ((to_jsonb(t)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',t.uuid::text))=actual;
      get diagnostics changed=row_count;
      if changed<>1 then raise exception 'Equipment trait captured CAS failed'; end if;
    end if;
  end loop;
  for patch in select value from jsonb_array_elements(spec->'blocks') loop
    expected:=(captured->(patch->>'id'))||jsonb_build_object('description',patch#>'{after,description}','meta_data',patch#>'{after,metadata}');
    select (to_jsonb(t)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',t.uuid::text) into actual from public.trait t where t.id=(patch->>'id')::bigint;
    if actual is distinct from expected then raise exception 'Equipment trait final owner drift'; end if;
  end loop;
  for dependency in select value from jsonb_array_elements(spec->'dependencies') loop
    if dependency->>'table'='trait' then select (to_jsonb(t)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',t.uuid::text) into actual from public.trait t where t.id=(dependency->>'id')::bigint;
    else select (to_jsonb(a)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',a.uuid::text) into actual from public.ability_block a where a.id=(dependency->>'id')::bigint; end if;
    if actual is distinct from dependencies->((dependency->>'table')||':'||(dependency->>'id')) then raise exception 'Equipment trait final dependency drift'; end if;
  end loop;
  select jsonb_object_agg(s.id::text,to_jsonb(s)-'updated_at') into actual from public.content_source s where s.id in (3,16);
  if actual is distinct from sources then raise exception 'Equipment trait final source drift'; end if;
  if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
  (u.type='content-source' and (u.ref_id in (3,16) or u.data->>'id' in ('3','16')))
  or (u.type in ('trait','ability-block','action') and exists(select 1 from jsonb_array_elements(spec->'blocks') p where u.type='trait' and (u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id' or u.data->>'uuid'=p#>>'{anchor,uuid}' or (coalesce(u.content_source_id::text,u.data->>'content_source_id')='16' and (lower(btrim(u.data->>'name'))=lower(p#>>'{anchor,name}') or lower(u.data#>>'{meta_data,source,url}')=lower(p#>>'{after,metadata,source,url}'))))))
  or exists(select 1 from jsonb_array_elements(spec->'dependencies') d where (u.type=replace(d->>'table','_','-') or (d->>'table'='ability_block' and u.type=d->>'type')) and (u.ref_id=(d->>'id')::bigint or u.data->>'id'=d->>'id' or u.data->>'uuid'=d->>'uuid' or (coalesce(u.content_source_id::text,u.data->>'content_source_id')=d->>'content_source_id' and lower(btrim(u.data->>'name'))=lower(d->>'name'))))
)) then raise exception 'Equipment trait final curator drift'; end if;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
