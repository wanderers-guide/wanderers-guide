begin;
-- Recognize only the exact cleaned Rust Cloud description. No content is written.
do $rust_cloud_upgrade$
declare body text;
begin
 if (exists(select 1 from pg_catalog.pg_proc p
  where p.oid=pg_catalog.to_regprocedure('public.treasure_vault_terminal_status_v1()')
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((p.prosrc)::text,'UTF8')),'hex')='d79ada84f79a393fea95ef071ba7af17f4684d5e063c3b7e7777dea18c0e2326'
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
    and pg_catalog.has_function_privilege('supabase_read_only_user',p.oid,'EXECUTE'))) is true then return; end if;
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
    and pg_catalog.has_function_privilege('supabase_read_only_user',p.oid,'EXECUTE'))) is not true then raise exception 'Rust Cloud helper predecessor differs'; end if;
 select prosrc into strict body from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('public.treasure_vault_terminal_status_v1()');
 body:=replace(body,$rust_before$select e.value as expected,'spell'::text as table_name,r.id as actual_id,(to_jsonb(r)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',r.uuid::text) as row from global_terminal_settings$rust_before$,$rust_after$select e.value as expected,'spell'::text as table_name,r.id as actual_id,case when r.id=5081 and ((to_jsonb(r)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',r.uuid::text))=(select spec->'after' from (select $rust_cloud105${"before":{"id":5081,"area":"20-foot burst","cast":"THREE-ACTIONS","cost":"","name":"Rust Cloud","rank":4,"uuid":"8100607878476471","range":"120 feet","rarity":"COMMON","traits":[1432,1433,2132],"defense":null,"targets":"","trigger":null,"version":"1.0","duration":"1 minute","meta_data":{"damage":[],"source":{"url":"https://2e.aonprd.com/Spells.aspx?ID=1377","book":"Rage of Elements","page":"145"},"foundry":{"rules":[],"is_focus":false}},"created_at":"2024-04-19T02:00:54.090169+00:00","heightened":{"data":{"type":"interval","damage":{"kmgVwzdXySlwrW7I":"1d10"},"interval":2},"text":[{"text":"The cloud's slashing damage increases by 1d10 and the persistent damage increases by 1d4.","amount":"(+2)"}]},"traditions":["arcane","primal"],"description":"Red-blown flecks of rust jitter in the air, forming a cloud of agitated particles. All creatures within the cloud become \\[\\[Concealed\\]\\], and all creatures outside the cloud become concealed to creatures within it. The cloud deals 5d10 slashing damage to any creature that starts its turn in the area, with a basic Fortitude save.\n\nMetal that rusts off of a creature adds to the cloud. When a metal creature takes damage from the cloud, the cloud's area increases by 5 feet (to a maximum of a 40-foot burst), and the creature starts to rust, taking 1d4 persistent,slashing damage. You can Dismiss the cloud.","availability":null,"requirements":null,"content_source_id":15},"after":{"id":5081,"area":"20-foot burst","cast":"THREE-ACTIONS","cost":"","name":"Rust Cloud","rank":4,"uuid":"8100607878476471","range":"120 feet","rarity":"COMMON","traits":[1432,1433,2132],"defense":null,"targets":"","trigger":null,"version":"1.0","duration":"1 minute","meta_data":{"damage":[],"source":{"url":"https://2e.aonprd.com/Spells.aspx?ID=1377","book":"Rage of Elements","page":"145"},"foundry":{"rules":[],"is_focus":false}},"created_at":"2024-04-19T02:00:54.090169+00:00","heightened":{"data":{"type":"interval","damage":{"kmgVwzdXySlwrW7I":"1d10"},"interval":2},"text":[{"text":"The cloud's slashing damage increases by 1d10 and the persistent damage increases by 1d4.","amount":"(+2)"}]},"traditions":["arcane","primal"],"description":"Red-blown flecks of rust jitter in the air, forming a cloud of agitated particles. All creatures within the cloud become concealed, and all creatures outside the cloud become concealed to creatures within it. The cloud deals 5d10 slashing damage to any creature that starts its turn in the area, with a basic Fortitude save.\n\nMetal that rusts off of a creature adds to the cloud. When a [metal](link_trait_2132) creature takes damage from the cloud, the cloud's area increases by 5 feet (to a maximum of a 40-foot burst), and the creature starts to rust, taking 1d4 persistent slashing damage. You can [Dismiss](link_action_19627) the cloud.","availability":null,"requirements":null,"content_source_id":15}}$rust_cloud105$::jsonb as spec) c) then $rust_cloud105_before${"id":5081,"area":"20-foot burst","cast":"THREE-ACTIONS","cost":"","name":"Rust Cloud","rank":4,"uuid":"8100607878476471","range":"120 feet","rarity":"COMMON","traits":[1432,1433,2132],"defense":null,"targets":"","trigger":null,"version":"1.0","duration":"1 minute","meta_data":{"damage":[],"source":{"url":"https://2e.aonprd.com/Spells.aspx?ID=1377","book":"Rage of Elements","page":"145"},"foundry":{"rules":[],"is_focus":false}},"created_at":"2024-04-19T02:00:54.090169+00:00","heightened":{"data":{"type":"interval","damage":{"kmgVwzdXySlwrW7I":"1d10"},"interval":2},"text":[{"text":"The cloud's slashing damage increases by 1d10 and the persistent damage increases by 1d4.","amount":"(+2)"}]},"traditions":["arcane","primal"],"description":"Red-blown flecks of rust jitter in the air, forming a cloud of agitated particles. All creatures within the cloud become \\[\\[Concealed\\]\\], and all creatures outside the cloud become concealed to creatures within it. The cloud deals 5d10 slashing damage to any creature that starts its turn in the area, with a basic Fortitude save.\n\nMetal that rusts off of a creature adds to the cloud. When a metal creature takes damage from the cloud, the cloud's area increases by 5 feet (to a maximum of a 40-foot burst), and the creature starts to rust, taking 1d4 persistent,slashing damage. You can Dismiss the cloud.","availability":null,"requirements":null,"content_source_id":15}$rust_cloud105_before$::jsonb else (to_jsonb(r)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',r.uuid::text) end as row from global_terminal_settings$rust_after$);
 if pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(body,'UTF8')),'hex')<>'d79ada84f79a393fea95ef071ba7af17f4684d5e063c3b7e7777dea18c0e2326' then raise exception 'Rust Cloud helper successor differs'; end if;
 execute 'create or replace function public.treasure_vault_terminal_status_v1() returns table(recognized boolean,passed boolean) language sql stable security invoker parallel unsafe cost 100 rows 1 set search_path = '''' as '||pg_catalog.quote_literal(body)||';';
 if (exists(select 1 from pg_catalog.pg_proc p
  where p.oid=pg_catalog.to_regprocedure('public.treasure_vault_terminal_status_v1()')
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((p.prosrc)::text,'UTF8')),'hex')='d79ada84f79a393fea95ef071ba7af17f4684d5e063c3b7e7777dea18c0e2326'
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
    and pg_catalog.has_function_privilege('supabase_read_only_user',p.oid,'EXECUTE'))) is not true then raise exception 'Rust Cloud helper readback differs'; end if;
end $rust_cloud_upgrade$;
commit;
