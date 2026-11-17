-- Read-only: check every creator RPC body, named arguments, fence storage and access boundary.
with expected(signature,body_hash,return_type,args) as (values
('patreon_creator_initialize(jsonb)','3e9fbea045998931c40c937030754a31','boolean',ARRAY['p_tokens']::text[]),
('patreon_creator_acquire(uuid)','b0cc0982108b21b5e395f303e2a9b10b','jsonb',ARRAY['p_lease']::text[]),
('patreon_creator_begin_refresh(uuid)','1975340f93c31d566de1467b9cf12df3','boolean',ARRAY['p_lease']::text[]),
('patreon_creator_save(uuid,jsonb)','9c89c4289d595b2e6493c049b9508910','boolean',ARRAY['p_lease','p_tokens']::text[]),
('patreon_creator_publish(uuid,jsonb,boolean)','643fa108f7a0397dc279c747e82c829e','boolean',ARRAY['p_lease','p_members','p_unidentified']::text[]),
('patreon_creator_release(uuid)','4334d1f04681255e18e4cbfdaec4cdc9','boolean',ARRAY['p_lease']::text[]),
('patreon_creator_configure(uuid[],boolean)','4b5fd5148347ee2a2075c2804a68ed8b','boolean',ARRAY['p_users','p_all']::text[]),
('patreon_creator_membership(uuid)','de58d29f9076b0b338710d2d6618fb21','jsonb',ARRAY['p_user']::text[])
), targets as (select *,to_regprocedure('public.'||signature) oid from expected)
select 'creator-rpc-'||signature as id,coalesce((select p.prosecdef and p.proconfig=ARRAY['search_path=""']::text[]
  and md5(p.prosrc)=t.body_hash and p.proargnames=t.args and p.prorettype=to_regtype(t.return_type)
  and not has_function_privilege('anon',p.oid,'EXECUTE') and not has_function_privilege('authenticated',p.oid,'EXECUTE')
  and has_function_privilege('service_role',p.oid,'EXECUTE') from pg_proc p where p.oid=t.oid),false) passed from targets t
union all
select 'creator-private-state',coalesce((select c.relrowsecurity and n.nspname='wg_patreon_private'
  and not exists(select 1 from pg_policy where polrelid=c.oid)
  and not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name)
    where has_schema_privilege(r.name,n.oid,'USAGE') or has_table_privilege(r.name,c.oid,'SELECT'))
  and exists(select 1 from pg_constraint where conrelid=c.oid and contype='p')
  and exists(select 1 from pg_constraint where conrelid=c.oid and contype='c' and pg_get_constraintdef(oid)='CHECK (singleton)')
  and (select count(*)=10 from information_schema.columns where table_schema=n.nspname and table_name=c.relname)
  from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.oid=to_regclass('wg_patreon_private.creator')),false)
union all
select 'creator-vault',exists(select 1 from pg_extension where extname='supabase_vault');
