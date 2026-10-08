-- Preserve original check IDs and predicates; use the pinned shared terminal check.
with terminal_function as materialized(select (exists(select 1 from pg_catalog.pg_proc p
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
    and pg_catalog.has_function_privilege('supabase_read_only_user',p.oid,'EXECUTE'))) as valid),
terminal_status as materialized(select case when f.valid is true then
  coalesce((select pg_catalog.to_jsonb(s) from public.treasure_vault_terminal_status_v1() s),'{"recognized":true,"passed":false}'::jsonb)
  else '{"recognized":true,"passed":false}'::jsonb end as value from terminal_function f),
original_checks as(
with settings as (select $traits$
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
$traits$::jsonb spec),checks as (
  select 'treasure-vault-equipment-trait-'||(p->>'id') id,coalesce((exists(select 1 from public.trait t where t.id=(p->>'id')::bigint and (((to_jsonb(t)-'updated_at'-'search_tsv'-'description'-'meta_data')||jsonb_build_object('uuid',t.uuid::text))=p->'anchor') and jsonb_build_object('description',t.description,'metadata',t.meta_data)=p->'after')) is true,false) passed from settings,jsonb_array_elements(spec->'blocks') p
  union all select 'treasure-vault-equipment-trait-dependency-'||(d->>'table')||'-'||(d->>'id'),coalesce((case when d->>'table'='trait' then exists(select 1 from public.trait t where t.id=(d->>'id')::bigint and (to_jsonb(t)||jsonb_build_object('uuid',t.uuid::text)) @> (d-'table')) else exists(select 1 from public.ability_block a where a.id=(d->>'id')::bigint and (to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text)) @> (d-'table')) end) is true,false) from settings,jsonb_array_elements(spec->'dependencies') d
  union all select 'treasure-vault-equipment-trait-sources',coalesce((select count(*)=2 from public.content_source s join jsonb_array_elements(spec->'sources') p on s.id=(p->>'id')::bigint where s.name=p->>'name' and s.user_id is null and s.is_published is true),false) from settings
  union all select 'treasure-vault-equipment-trait-curation',coalesce((not exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
  (u.type='content-source' and (u.ref_id in (3,16) or u.data->>'id' in ('3','16')))
  or (u.type in ('trait','ability-block','action') and exists(select 1 from jsonb_array_elements(spec->'blocks') p where u.type='trait' and (u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id' or u.data->>'uuid'=p#>>'{anchor,uuid}' or (coalesce(u.content_source_id::text,u.data->>'content_source_id')='16' and (lower(btrim(u.data->>'name'))=lower(p#>>'{anchor,name}') or lower(u.data#>>'{meta_data,source,url}')=lower(p#>>'{after,metadata,source,url}'))))))
  or exists(select 1 from jsonb_array_elements(spec->'dependencies') d where (u.type=replace(d->>'table','_','-') or (d->>'table'='ability_block' and u.type=d->>'type')) and (u.ref_id=(d->>'id')::bigint or u.data->>'id'=d->>'id' or u.data->>'uuid'=d->>'uuid' or (coalesce(u.content_source_id::text,u.data->>'content_source_id')=d->>'content_source_id' and lower(btrim(u.data->>'name'))=lower(d->>'name'))))
))) is true,false) from settings
) select id,passed from checks order by id
)
select original_checks.id,case when coalesce((status.value->>'recognized')::boolean,true) then coalesce((status.value->>'passed')::boolean,false) else original_checks.passed end as passed from original_checks cross join terminal_status status;
