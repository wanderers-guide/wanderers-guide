select 'starship-reference-type-check' as id, exists (
  select 1 from pg_constraint
  where conrelid = 'public.creature'::regclass
    and conname = 'creature_type_check'
    and contype = 'c' and convalidated
    and pg_get_constraintdef(oid) = 'CHECK ((type = ANY (ARRAY[''creature''::text, ''hazard''::text, ''starship''::text])))'
) as passed
union all
select 'starship-reference-type-values', not exists (
  select 1 from public.creature where type not in ('creature', 'hazard', 'starship')
);
