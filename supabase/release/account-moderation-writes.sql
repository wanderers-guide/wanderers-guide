-- Read-only denial checks complement the historical SELECT-grant baseline.
select 'client-profile-and-moderation-writes-denied' as id,
  not exists (
    select 1 from (values ('anon'), ('authenticated')) roles(name)
    cross join information_schema.columns c
    cross join (values ('INSERT'), ('UPDATE'), ('REFERENCES')) privileges(name)
    where c.table_schema = 'public' and c.table_name in ('public_user', 'content_update')
      and has_column_privilege(roles.name, 'public.' || c.table_name, c.column_name, privileges.name)
  ) and not exists (
    select 1 from (values ('anon'), ('authenticated')) roles(name)
    cross join (values ('public_user'), ('content_update')) tables(name)
    cross join (values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('TRIGGER')) privileges(name)
    where has_table_privilege(roles.name, 'public.' || tables.name, privileges.name)
  ) as passed
union all
select 'trusted-profile-and-moderation-writes', not exists (
  select 1 from (values ('public_user'), ('content_update')) tables(name)
  cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) privileges(name)
  where not has_table_privilege('service_role', 'public.' || tables.name, privileges.name)
)
union all
select 'profile-and-moderation-rls', count(*) = 2 and bool_and(c.relrowsecurity) and
  not exists (select 1 from pg_policy p where p.polrelid in
    ('public.public_user'::regclass, 'public.content_update'::regclass) and p.polcmd <> 'r')
from pg_class c where c.oid in ('public.public_user'::regclass, 'public.content_update'::regclass)
union all
select 'character-insert-owner', count(*) = 1 and bool_and(
  p.polcmd = 'a' and p.polroles = array['authenticated'::regrole::oid] and
  pg_get_expr(p.polwithcheck, p.polrelid) = '(auth.uid() = user_id)'
)
from pg_policy p where p.polrelid = 'public.character'::regclass and p.polcmd in ('a', '*');
