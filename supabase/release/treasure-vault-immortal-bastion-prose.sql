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
with settings as (select $bastion$
{
  "id": 12104,
  "anchor": {
    "id": 12104,
    "bulk": "5",
    "name": "Immortal Bastion",
    "size": "MEDIUM",
    "uuid": "8298670509031158",
    "group": "ARMOR",
    "hands": null,
    "level": 20,
    "price": {
      "gp": 70000
    },
    "usage": null,
    "rarity": "COMMON",
    "traits": [
      1594,
      2865,
      1527
    ],
    "version": "1.0",
    "meta_data": {
      "hp": 0,
      "bulk": {},
      "group": "plate",
      "runes": {
        "potency": 3,
        "property": [
          {
            "id": 6973,
            "name": "Fortification (Greater)"
          }
        ],
        "resilient": 2
      },
      "hp_max": 0,
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=4380",
        "book": "Treasure Vault",
        "page": "15"
      },
      "dex_cap": 0,
      "foundry": {
        "items": [],
        "rules": [],
        "container_id": null
      },
      "ac_bonus": 6,
      "category": "heavy",
      "hardness": 0,
      "material": {
        "type": null,
        "grade": null
      },
      "quantity": 1,
      "strength": 4,
      "base_item": "bastion-plate",
      "check_penalty": -3,
      "speed_penalty": -10,
      "broken_threshold": 0
    },
    "created_at": "2024-04-19T04:18:52.757443+00:00",
    "operations": null,
    "availability": null,
    "content_source_id": 16,
    "craft_requirements": null
  },
  "before": "This impressive _+3 greater resilient greater fortification bastion plate_ is built like an impregnable castle, with multiple layers of defense and no weak points. When you activate the armor's deflect melee trait, you gain a +2 circumstance bonus to AC against melee attacks instead of +1, and you gain 10 temporary Hit Points that last until the start of your next turn.\n\n\\[\\[Effect: Immortal Bastion\\]\\]\n\n**Activate** r envision\n\n**Effect** You drop to 1 Hit Point instead of being reduced to 0 HP or dying, and you gain 100 temporary Hit Points that last until the start of your next turn.\n\n**Activate** r envision\n\n**Effect** You avoid gaining or increasing the condition. If the triggering effect imposes both doomed and wounded, choose only one to prevent. This doesn't remove either of the conditions if you already have them, nor does it prevent the same triggering effect from giving or increasing the prevented condition later.",
  "after": "This impressive _[+3](link_item_6721) [greater resilient](link_item_7701) [greater fortification](link_item_6973) [bastion plate](link_item_11740)_ is built like an impregnable castle, with multiple layers of defense and no weak points. When you activate the armor's deflect melee trait, you gain a +2 circumstance bonus to AC against melee attacks instead of +1, and you gain 10 temporary Hit Points that last until the start of your next turn.\n\n**Activate** <abbr cost=\"REACTION\" class=\"action-symbol\">R</abbr> ([concentrate](link_trait_1432)); **Frequency** once per day; **Trigger** You are reduced to 0 Hit Points or would die from a [death](link_trait_1904) effect; **Effect** You drop to 1 Hit Point instead of being reduced to 0 HP or dying, and you gain 100 temporary Hit Points that last until the start of your next turn.\n\n**Activate** <abbr cost=\"REACTION\" class=\"action-symbol\">R</abbr> ([concentrate](link_trait_1432)); **Frequency** once per day; **Trigger** You would gain or increase the doomed or wounded condition; **Effect** You avoid gaining or increasing the condition. If the triggering effect imposes both doomed and wounded, choose only one to prevent. This doesn't remove either of the conditions if you already have them, nor does it prevent the same triggering effect from giving or increasing the prevented condition later.",
  "evidence": [
    "https://2e.aonprd.com/Equipment.aspx?ID=1847",
    "https://2e.aonprd.com/Equipment.aspx?ID=4380&NoRedirect=1"
  ],
  "dependencies": [
    {
      "table": "trait",
      "id": 1432,
      "name": "Concentrate",
      "uuid": "3011511166869167",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1904,
      "name": "Death",
      "uuid": "2476643980238200",
      "content_source_id": 3
    },
    {
      "table": "item",
      "id": 11740,
      "name": "Bastion Plate",
      "uuid": "6057257467120112",
      "content_source_id": 16
    },
    {
      "table": "item",
      "id": 7701,
      "name": "Resilient (Greater)",
      "uuid": "171697191389370",
      "content_source_id": 7
    },
    {
      "table": "item",
      "id": 6721,
      "name": "Armor Potency (+3)",
      "uuid": "7377851285138054",
      "content_source_id": 7
    },
    {
      "table": "item",
      "id": 6973,
      "name": "Fortification (Greater)",
      "uuid": "3048641492215121",
      "content_source_id": 7
    }
  ],
  "sources": [
    {
      "id": 3,
      "name": "Common Core"
    },
    {
      "id": 7,
      "name": "GM Core"
    },
    {
      "id": 16,
      "name": "Treasure Vault"
    }
  ]
}
$bastion$::jsonb spec),checks as (
  select 'treasure-vault-immortal-bastion-prose' id,coalesce((exists(select 1 from public.item i where i.id=12104 and (((to_jsonb(i)-'updated_at'-'search_tsv'-'description')||jsonb_build_object('uuid',i.uuid::text))=spec->'anchor') and i.description=spec->>'after')) is true,false) passed from settings
  union all select 'treasure-vault-immortal-bastion-dependency-'||(d->>'table')||'-'||(d->>'id'),coalesce((case when d->>'table'='trait' then exists(select 1 from public.trait t where t.id=(d->>'id')::bigint and (to_jsonb(t)||jsonb_build_object('uuid',t.uuid::text)) @> (d-'table')) else exists(select 1 from public.item i where i.id=(d->>'id')::bigint and (to_jsonb(i)||jsonb_build_object('uuid',i.uuid::text)) @> (d-'table')) end) is true,false) from settings,jsonb_array_elements(spec->'dependencies') d
  union all select 'treasure-vault-immortal-bastion-sources',coalesce((select count(*)=3 from public.content_source s join jsonb_array_elements(spec->'sources') p on s.id=(p->>'id')::bigint where s.name=p->>'name' and s.user_id is null and s.is_published is true),false) from settings
  union all select 'treasure-vault-immortal-bastion-curation',coalesce((not exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
  (u.type='content-source' and (u.ref_id in (3,7,16) or u.data->>'id' in ('3','7','16')))
  or (u.type='item' and (u.ref_id=12104 or u.data->>'id'='12104' or u.data->>'uuid'=spec#>>'{anchor,uuid}' or (coalesce(u.content_source_id::text,u.data->>'content_source_id')='16' and (lower(btrim(u.data->>'name'))='immortal bastion' or lower(u.data#>>'{meta_data,source,url}') in (lower(spec#>>'{anchor,meta_data,source,url}'),lower(spec#>>'{evidence,0}'))))))
  or exists(select 1 from jsonb_array_elements(spec->'dependencies') d where u.type=replace(d->>'table','_','-') and (u.ref_id=(d->>'id')::bigint or u.data->>'id'=d->>'id' or u.data->>'uuid'=d->>'uuid' or (coalesce(u.content_source_id::text,u.data->>'content_source_id')=d->>'content_source_id' and lower(btrim(u.data->>'name'))=lower(d->>'name'))))
))) is true,false) from settings
) select id,passed from checks order by id
)
select original_checks.id,case when coalesce((status.value->>'recognized')::boolean,true) then coalesce((status.value->>'passed')::boolean,false) else original_checks.passed end as passed from original_checks cross join terminal_status status;
