select 'pathbuilder-import-table' as id, to_regclass('public.pathbuilder_import') is not null as passed
union all
select 'pathbuilder-import-rls', coalesce((
  select relrowsecurity
  from pg_class
  where oid = to_regclass('public.pathbuilder_import')
), false)
union all
select 'pathbuilder-import-user-id', exists (
  select 1 from pg_attribute
  where attrelid = to_regclass('public.pathbuilder_import')
    and attname = 'user_id'
    and not attisdropped
)
union all
select 'pathbuilder-import-character-id', exists (
  select 1 from pg_attribute
  where attrelid = to_regclass('public.pathbuilder_import')
    and attname = 'character_id'
    and not attisdropped
);
