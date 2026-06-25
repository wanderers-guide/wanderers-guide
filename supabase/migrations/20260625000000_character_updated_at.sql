-- Optimistic-concurrency support for the character table.
--
-- Adds an `updated_at` column maintained by a trigger so `update-character` can perform
-- a conditional write (`WHERE id = $ AND updated_at = $expected`) and return a conflict
-- instead of silently full-replacing inventory/spells/etc. with a stale snapshot.
--
-- Safe to deploy independently of the app: until this runs, find-character returns no
-- `updated_at`, the client sends no `expected_updated_at`, and update-character behaves
-- exactly as before (unconditional write).

-- 1. Add the column (nullable first so we can backfill existing rows).
alter table public."character"
  add column if not exists updated_at timestamptz;

-- 2. Backfill existing rows from created_at (they haven't been "updated" since).
update public."character"
  set updated_at = coalesce(updated_at, created_at, now())
  where updated_at is null;

-- 3. Enforce the invariant going forward.
alter table public."character" alter column updated_at set default now();
alter table public."character" alter column updated_at set not null;

-- 4. Trigger to bump updated_at on every UPDATE (covers all writers, incl. the API).
create or replace function public.set_character_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists character_set_updated_at on public."character";
create trigger character_set_updated_at
  before update on public."character"
  for each row
  execute function public.set_character_updated_at();
