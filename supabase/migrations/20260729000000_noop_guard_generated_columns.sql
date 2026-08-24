-- Restore the no-op guard in the content updated_at triggers.
--
-- The guard compares full row images (to_jsonb minus the server-owned
-- updated_at). That silently broke when the search work added GENERATED
-- search_tsv columns to every content table (first captured in the July 20
-- schema refresh): in a BEFORE ROW trigger the NEW tuple's generated columns
-- are not yet computed, so NEW vs OLD always differ on search_tsv and every
-- idempotent write — the content-update bot's re-apply shape the guard exists
-- for — stamped the row and bumped its source token anyway, needlessly
-- invalidating client content caches.
--
-- Exclude generated columns from the comparison in both functions. The parent
-- bump's AFTER trigger sees computed generated columns and technically didn't
-- need this, but keeping the two comparisons identical means neither can
-- drift if more generated columns appear. If another generated column is ever
-- added to a content table, it must be subtracted here too.

create or replace function public.set_content_updated_at()
returns trigger
language plpgsql
as $$
begin
  if (to_jsonb(new) - 'updated_at' - 'search_tsv') is not distinct from (to_jsonb(old) - 'updated_at' - 'search_tsv') then
    return new;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

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
    if (to_jsonb(new) - 'updated_at' - 'search_tsv') is not distinct from (to_jsonb(old) - 'updated_at' - 'search_tsv') then
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
