-- Normalise `meta_data` across the content corpus: jsonb everywhere, present everywhere,
-- and indexed.
--
-- Groundwork for optional per-row source provenance (book / page / URL stored under
-- `meta_data`). Three problems stood in the way:
--
--  1. Type drift. `spell` and `trait` were already jsonb; `ability_block`, `item` and
--     `creature` were plain `json`, which has no containment operators and cannot carry
--     a GIN index. Any "which rows have provenance?" query was impossible on the three
--     biggest tables.
--  2. Missing entirely. Seven content tables had no `meta_data` column at all, so those
--     content types had nowhere to put it.
--  3. Unindexed. There were zero GIN indexes on `meta_data` anywhere in the database.
--
-- Verified safe before writing this (see the effort's research notes):
--  * No generated column reads `meta_data` — every `search_tsv` is built from `name` and
--    `description` only, so nothing is recomputed by the type change.
--  * No view and no RLS policy references `meta_data`.
--  * The `updated_at` / content-source-bump triggers are row-level DML triggers. This
--    migration is pure DDL, so it fires none of them and invalidates no client cache.
--  * jsonb silently drops duplicate keys where json keeps them. Checked every affected
--    row by comparing json_object_keys against jsonb_object_keys: zero rows differ, so
--    the conversion is lossless.
--
-- `content_source.meta_data` is deliberately NOT converted. It holds the per-source
-- `counts` blob written by _shared/helpers.ts and never carries provenance — a source is
-- the book, it does not cite one.

-- ─── 1. json -> jsonb on the three drifted tables ────────────────────────────
-- Full table rewrite under ACCESS EXCLUSIVE. Small: ability_block is the largest at
-- ~27k rows / ~515 kB of meta_data.

do $$
declare
  t text;
begin
  foreach t in array array['ability_block', 'item', 'creature'] loop
    execute format('alter table public.%I alter column meta_data type jsonb using meta_data::jsonb', t);
  end loop;
end $$;

-- ─── 2. Add meta_data where it was missing ───────────────────────────────────
-- Nullable with no default, so this is a metadata-only catalog change: instant, no
-- rewrite, no lock held over data.

do $$
declare
  t text;
begin
  foreach t in array array[
    'ancestry', 'archetype', 'background', 'class',
    'class_archetype', 'versatile_heritage', 'language'
  ] loop
    execute format('alter table public.%I add column if not exists meta_data jsonb', t);
  end loop;
end $$;

-- ─── 3. GIN indexes on all 12 provenance-carrying content tables ─────────────
-- Default jsonb_ops rather than jsonb_path_ops: the coverage queries this exists for
-- ("which rows carry a cite?") want the key-existence operators (?, ?|, ?&), and
-- jsonb_path_ops supports only @>.

do $$
declare
  t text;
begin
  foreach t in array array[
    'ability_block', 'ancestry', 'archetype', 'background', 'class',
    'class_archetype', 'creature', 'item', 'language', 'spell',
    'trait', 'versatile_heritage'
  ] loop
    execute format('create index if not exists %I on public.%I using gin (meta_data)', t || '_meta_data_gin', t);
  end loop;
end $$;
