-- A missing object returns false. This query never invokes the quota RPC.
with target as (
  select to_regclass('public.edge_work_budget') as table_id,
    to_regprocedure('public.consume_edge_work_budget(text,text,integer)') as function_id
)
select 'budget-table' as id, coalesce((
  select c.relrowsecurity and
    (select count(*) = 0 from pg_policy where polrelid = c.oid) and
    (select count(*) = 4 from information_schema.columns where table_schema = 'public'
      and table_name = 'edge_work_budget' and is_nullable = 'NO' and
      (column_name, udt_name) in (('resource', 'text'), ('actor', 'text'), ('window_start', 'date'), ('used', 'int8'))) and
    exists (select 1 from pg_constraint where conrelid = c.oid
      and contype = 'p' and pg_get_constraintdef(oid) = 'PRIMARY KEY (resource, actor)')
  from pg_class c, target t where c.oid = t.table_id
), false) as passed
union all
select 'budget-authorization', coalesce((
  select not has_function_privilege('anon', t.function_id, 'EXECUTE')
    and not has_function_privilege('authenticated', t.function_id, 'EXECUTE')
    and has_function_privilege('service_role', t.function_id, 'EXECUTE')
    and not exists (select 1 from (values ('anon'), ('authenticated')) roles(name),
      (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) privileges(name)
      where has_table_privilege(roles.name, t.table_id, privileges.name))
    and not exists (select 1 from (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) privileges(name)
      where not has_table_privilege('service_role', t.table_id, privileges.name))
  from target t
), false)
union all
select 'budget-rpc', coalesce((
  select p.prosecdef and p.prorettype = 'boolean'::regtype
    and p.prokind = 'f' and p.provolatile = 'v' and p.proparallel = 'u'
    and p.proargnames = array['p_resource', 'p_actor', 'p_units']::text[]
    and p.proconfig = array['search_path=""']::text[]
    -- Named PostgREST arguments and a writable SECURITY DEFINER context are
    -- part of the executable contract even when the function body is identical.
    and (r.rolsuper or r.rolbypassrls or pg_has_role(p.proowner, c.relowner, 'USAGE'))
    and not exists (select 1 from (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) privileges(name)
      where not has_table_privilege(p.proowner, t.table_id, privileges.name))
  from pg_proc p, target t, pg_roles r, pg_class c
  where p.oid = t.function_id and r.oid = p.proowner and c.oid = t.table_id
), false);
