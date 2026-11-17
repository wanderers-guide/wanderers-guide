-- Read-only: exact sender/provisioning definitions, private storage, and the sole periodic trigger.
with expected(signature,hash,args,kind) as (values
('wg_patreon_private.enqueue_membership_sync()','29d1d6a3e3cce6d671adf4f8eab30cb8',null::text[],'private'),
('public.patreon_creator_scheduler_configure(text,text,text,boolean)','3c86d06b94c0dc52638beb0f73e4e052',ARRAY['p_endpoint','p_anon_key','p_signing_key','p_active'],'service')
), targets as(select *,to_regprocedure(signature) oid from expected)
select 'scheduler-function-'||signature id,coalesce((select p.prosecdef and p.proconfig=ARRAY['search_path=""']::text[]
 and md5(p.prosrc)=t.hash and p.proargnames is not distinct from t.args
 and p.prorettype=case when t.kind='private' then 'bigint'::regtype else 'boolean'::regtype end
 and not has_function_privilege('anon',p.oid,'EXECUTE') and not has_function_privilege('authenticated',p.oid,'EXECUTE')
 and has_function_privilege('service_role',p.oid,'EXECUTE')=(t.kind='service') from pg_proc p where p.oid=t.oid),false) passed from targets t
union all
select 'scheduler-private-state',coalesce((select c.relrowsecurity and n.nspname='wg_patreon_private'
 and not exists(select 1 from pg_policy where polrelid=c.oid)
 and not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name)
   where has_schema_privilege(r.name,n.oid,'USAGE') or has_table_privilege(r.name,c.oid,'SELECT'))
 and (select count(*)=5 from information_schema.columns where table_schema=n.nspname and table_name=c.relname)
 and exists(select 1 from pg_constraint where conrelid=c.oid and contype='p')
 and exists(select 1 from pg_constraint where conrelid=c.oid and contype='c' and pg_get_constraintdef(oid)='CHECK (singleton)')
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.oid=to_regclass('wg_patreon_private.scheduler')),false)
union all
select 'scheduler-extensions',exists(select 1 from pg_extension where extname='pg_cron' and extnamespace='pg_catalog'::regnamespace)
 and exists(select 1 from pg_extension where extname='pg_net' and extnamespace='extensions'::regnamespace)
 and to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is not null
union all
select 'scheduler-job',count(*)=1 and coalesce(bool_and(command='select wg_patreon_private.enqueue_membership_sync();'
 and schedule='3,18,33,48 * * * *' and database=current_database() and username='postgres'
 and active=coalesce((select s.active from wg_patreon_private.scheduler s where singleton),false)),false)
 from cron.job where jobname='wg-patreon-memberships';
