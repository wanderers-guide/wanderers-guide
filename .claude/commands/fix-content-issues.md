---
description: Audit the content DB against the app's Zod schemas and fix data issues (validate before every write)
argument-hint: "[optional: content type(s) to scope to, e.g. item,ability-block]"
---

Find and fix content-data issues in the Wanderer's Guide Supabase DB, using the
app's own Zod schemas as the source of truth. Scope: $ARGUMENTS (empty = all 13
content tables).

The golden rule: **every fix is validated by the schema BEFORE it is written, and
re-validated FROM the DB after.** A row is never written unless it fully validates.

## 0. Setup

- Needs a Supabase Personal Access Token in `SUPABASE_PAT` (ask the user if unset —
  never hardcode it). Exchange it for the project's `service_role` key via the
  Management API (`GET https://api.supabase.com/v1/projects/<ref>/api-keys`), then use
  PostgREST (`https://<ref>.supabase.co/rest/v1`) for reads and writes. Project ref:
  `fdrjqcyjklatdrmjdnys`. Send `User-Agent: curl/8.6.0` on Management API calls
  (Cloudflare blocks the default urllib agent).
- Build the validator once: `cd frontend && npx esbuild scripts/validate-content.ts
  --bundle --platform=node --format=esm --target=node20 --outfile=scripts/.dist/validate.mjs`.
  Validate any row with: `echo '<json>' | node frontend/scripts/.dist/validate.mjs <type>`
  (or `npm run validate:content -- <type>`). It prints `VALID` or `INVALID: <errors>`,
  and accepts a JSON array to check many rows at once.

## 1. Sweep — find the invalid rows

For each in-scope content table, paginate every row via PostgREST (`Range: 0-999`,
`1000-1999`, … until a short page), and run the whole array through the validator.
Collect the `[i] INVALID: …` lines and map the index back to the row `id`. Report a
per-table valid/total count and the top failing field-paths. (13 types → tables:
trait, item, spell, class, archetype, versatile-heritage→versatile_heritage,
class-archetype→class_archetype, ability-block→ability_block, creature, ancestry,
background, language, content-source→content_source.)

## 2. Classify every failure — schema fix vs data fix

This is the key judgment (see the `feedback-schema-validation` memory and the
`wg-content` skill for the operations model):

- **Schema fix** — the DB legitimately stores that shape and the Zod schema is too
  strict (a field that can be null; an embedded snapshot missing keys that are
  required columns on the source table). Fix the schema in `frontend/src/schemas/`,
  NOT the data. Ship it as a normal PR. Do not write to the DB.
- **Data fix** — the value is genuinely malformed (empty string in a number field,
  a null where a real value belongs, a mislabeled/legacy operation shape). Fix the
  row directly, following section 3.

Never mix the two for the same field.

## 3. Fix a data issue — safely

1. **Find the canonical shape.** Pull several WORKING rows of the same type and the
   same construct (e.g. other ancestries' size-select) and see what the valid shape
   looks like. Fix toward that, not toward a guess.
2. **Normalize a clone** of the row. Common, safe repairs seen before:
   - empty string `""` in a numeric field → `null` (only where the schema allows null).
   - a `select` option carrying `title`+`description`+`operations` but mislabeled with
     a non-`CUSTOM` `type` and a stray singular `operation` → set `type: "CUSTOM"` and
     delete the stray `operation` (its real effect is in `operations`).
   - a `PREDEFINED` select's `optionsFilters` is unused → delete the key (note: delete
     it, don't set it to `null` — the field is `.optional()`, so `null` fails).
3. **Validate the fixed clone** with the validator. If it is not `VALID`, do not write —
   iterate or defer.
4. **Dry-run first**: show the user the exact before/after diff and which column
   changes (usually just `operations` or `meta_data`).
5. **Write** only the changed column(s) via a PostgREST `PATCH ...?id=eq.<id>`.
6. **Re-fetch and re-validate from the DB** to confirm the write landed and is valid.

## 4. Stop and defer — do NOT guess

- **Never invent game-balance or semantic values** (a class's HP-per-level, which feat
  an `abilityBlockId: -1` placeholder should point to, whether a `SPELL` option's
  `giveAbilityBlock` is intentional). Surface these for the content author (Discord
  content channel) instead of writing a guess. If a default is unavoidable and the
  current value is a live bug (e.g. null HP), use the most defensible default and flag
  it clearly for confirmation.
- **Don't clobber the queue.** Before fixing a row directly, check the pending
  `content_update` queue (`find-content-update` with `state: PENDING`) — if a curator
  already submitted an update for that `ref_id`, leave it for the approval flow.
- **Deep shared-schema changes** (e.g. creature combat fields / embedded snapshots that
  ripple into character code) are their own PR with full app verification — see the
  `project-livingentity-combat-nullability` memory. Don't bundle them into a data-fix pass.

## 5. Report

Summarize: rows fixed directly (table/id/change, each validated), issues that need a
schema PR (with the field), rows deferred for content-author judgment, and anything
blocked on a pending queue update or a code change. Keep a running before/after
valid-count per table.
