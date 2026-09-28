select 'creature-type-column' as id, exists (
  select 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'creature'
    and column_name = 'type'
    and data_type = 'text'
    and is_nullable = 'NO'
    and column_default like '%creature%'
) as passed
union all
select 'creature-type-check', exists (
  select 1
  from pg_constraint
  where conrelid = 'public.creature'::regclass
    and conname = 'creature_type_check'
    and contype = 'c'
    and convalidated
    and pg_get_constraintdef(oid) like '%creature%'
    and pg_get_constraintdef(oid) like '%hazard%'
)
union all
select 'creature-type-values', not exists (
  select 1 from public.creature where type not in ('creature', 'hazard')
);
