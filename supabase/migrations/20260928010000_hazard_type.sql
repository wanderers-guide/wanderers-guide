alter table public.creature
  add column if not exists type text not null default 'creature';

alter table public.creature
  alter column type set default 'creature';

alter table public.creature
  alter column type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.creature'::regclass
      and conname = 'creature_type_check'
  ) then
    alter table public.creature
      add constraint creature_type_check check (type in ('creature', 'hazard'));
  end if;
end $$;
