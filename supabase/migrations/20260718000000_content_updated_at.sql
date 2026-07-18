-- Change-tracking for the content corpus, powering client cache invalidation.
--
-- Adds `updated_at` to all 13 content tables and rolls every child-table change up
-- into `content_source.updated_at`, giving each source a single "this source or
-- anything in it last changed at T" token. Because the tracking lives in triggers,
-- EVERY writer participates automatically: edge functions, the content-update bot
-- (github role), admin tools, and manual SQL. No app code has to remember anything.
--
-- Clients persist the content corpus in IndexedDB (frontend content-store.ts) and
-- compare their cached per-source tokens against `get-content-versions` on load;
-- any mismatch drops the cache. See PR for the client half.
--
-- Safe to deploy independently of the app: until the client ships, the column is
-- simply an extra field on find-* responses that old clients ignore.

-- ─── 1. updated_at on all 13 content tables ──────────────────────────────────
-- Same pattern as 20260625000000_character_updated_at.sql: add nullable, backfill
-- from created_at (rows haven't been "updated" since), then default + NOT NULL.

do $$
declare
  t text;
begin
  foreach t in array array[
    'ability_block', 'ancestry', 'archetype', 'background', 'class',
    'class_archetype', 'content_source', 'creature', 'item', 'language',
    'spell', 'trait', 'versatile_heritage'
  ] loop
    execute format('alter table public.%I add column if not exists updated_at timestamptz', t);
    execute format('update public.%I set updated_at = coalesce(updated_at, created_at, now()) where updated_at is null', t);
    execute format('alter table public.%I alter column updated_at set default now()', t);
    execute format('alter table public.%I alter column updated_at set not null', t);
  end loop;
end $$;

-- ─── 2. Row-level stamp: BEFORE UPDATE on all 13 tables ──────────────────────
-- Bumps updated_at on real changes only. The no-op guard matters twice over:
--  * the content-update bot re-applies payloads idempotently; a write that changes
--    nothing must not move tokens (or every client cache would invalidate for free);
--  * the parent-bump UPDATE below explicitly sets updated_at = now() and changes
--    nothing else, so the guard's RETURN NEW passes that explicit value through
--    untouched (no special-case trigger needed for content_source).

create or replace function public.set_content_updated_at()
returns trigger
language plpgsql
as $$
begin
  if (to_jsonb(new) - 'updated_at') is not distinct from (to_jsonb(old) - 'updated_at') then
    return new;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'ability_block', 'ancestry', 'archetype', 'background', 'class',
    'class_archetype', 'content_source', 'creature', 'item', 'language',
    'spell', 'trait', 'versatile_heritage'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_content_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end $$;

-- ─── 3. Parent bump: AFTER INSERT/UPDATE/DELETE on the 12 child tables ───────
-- SECURITY DEFINER is load-bearing: the bump runs with the CALLER's privileges
-- otherwise, and content_source UPDATE policies don't cover every child-writer
-- (notably the bot's github role) — the bump would silently match zero rows and
-- the invalidation signal would be lost, which is exactly the bug this migration
-- exists to fix. The table owner bypasses (non-FORCE) RLS.
--
-- OLD/NEW are only assigned for the relevant TG_OP (referencing the wrong one
-- raises at runtime and would abort the write), hence the branching.

create or replace function public.bump_content_source_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sids bigint[];
begin
  if tg_op = 'INSERT' then
    sids := array[new.content_source_id];
  elsif tg_op = 'DELETE' then
    sids := array[old.content_source_id];
  else
    -- Idempotent re-apply (row unchanged apart from updated_at): no signal.
    if (to_jsonb(new) - 'updated_at') is not distinct from (to_jsonb(old) - 'updated_at') then
      return null;
    end if;
    -- Both ids so moving content between sources bumps the old AND new source.
    sids := array[old.content_source_id, new.content_source_id];
  end if;

  -- id = any(array[null]) matches nothing, which quietly covers the nullable
  -- language.content_source_id. The updated_at predicate dedupes bulk writes:
  -- now() is transaction-stable, so N child rows written in one transaction
  -- produce exactly one parent row-version instead of N.
  update public.content_source
    set updated_at = now()
    where id = any (sids)
      and updated_at is distinct from now();

  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'ability_block', 'ancestry', 'archetype', 'background', 'class',
    'class_archetype', 'creature', 'item', 'language',
    'spell', 'trait', 'versatile_heritage'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_bump_source_updated_at', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.bump_content_source_updated_at()',
      t || '_bump_source_updated_at', t
    );
  end loop;
end $$;
