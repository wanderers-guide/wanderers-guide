# Content data audit

Validates every row of the WG content tables against the **same Zod schemas the app
uses** (`@schemas/content`), reports what's invalid, and can apply a small set of
provably-safe fixes back to the database.

It's the automated version of the "read the `[CONTENT-SCHEMA]` console warnings and
classify each as a schema fix or a data fix" workflow — except it checks all ~45k
rows at once instead of whatever the browser happened to load.

## Why it's trustworthy

The `find-*` edge functions do a plain `select()` with no joins or enrichment, so a
raw table row is exactly what the frontend validates at its cache boundary
(`validateAndWarn` in `content-store.ts`). Auditing the table directly cannot produce
a false positive the live app wouldn't also hit.

## Auth

One secret: a Supabase **Personal Access Token** in `SUPABASE_PAT`. The script
exchanges it (via the Management API) for the project's `service_role` key, then uses
PostgREST for bulk reads and surgical writes. Nothing else to configure.

```bash
export SUPABASE_PAT=sbp_...          # https://supabase.com/dashboard/account/tokens
# optional: export SUPABASE_PROJECT_REF=fdrjqcyjklatdrmjdnys   (this is the default)
```

## Usage (run from `frontend/`)

```bash
# Read-only audit — console summary + a JSON report under scripts/audit-content/reports/
npm run audit:content

# Scope it down while iterating
npm run audit:content -- --tables spell,item --limit 500

# Preview the fixes it WOULD apply (still writes nothing)
npm run audit:content -- --write

# Actually write the safe fixes
npm run audit:content -- --write --apply
```

## Safety model — three gears

| Flags | What it does | Writes? |
|---|---|---|
| *(none)* | Audit + report | No |
| `--write` | Also computes fixes and prints the exact per-row diffs | No |
| `--write --apply` | PATCHes the fixed rows | Yes |

A fix is applied **only** when both hold:

1. the row **fully validates** after the fix, and
2. the change touches **only top-level scalar columns** (e.g. `level`, `rarity`) —
   never nested `meta_data` / `operations` JSON.

Nested-JSON problems and anything the safe normalizers can't fully repair are
reported, never auto-written — those need the deliberate SQL patterns and the
schema-vs-data judgment call, which stay human.

### What the safe normalizers cover

- Empty string `""` → `null` where a nullable non-string (usually a number) is expected.
- Enum casing: remap a string to an allowed option it matches case-insensitively.

Add new ones in `computeSafeFix()` — keep each conservative and always re-validate.

## Output

- **Console**: one line per table (valid/total, invalid count, most-common failing
  field-paths, and how many are auto-fixable).
- **JSON report**: `scripts/audit-content/reports/content-audit-<timestamp>.json` —
  every failure with `id`, `name`, failing `paths`, the Zod summary, and any computed
  `fix`. Grep-friendly for triage. (git-ignored.)

## Classifying a finding (schema fix vs data fix)

- **Schema fix** — the DB legitimately stores that shape and the schema is too strict.
  Most common: an embedded snapshot (`abilities_base[n]`, `base_item_content`) missing
  keys that are required columns on the source table, or a sub-field that can be null.
  Fix the Zod schema (`.nullable()` for DB columns, `.optional()` for JSON sub-fields),
  not the data.
- **Data fix** — the value is genuinely stale/corrupt (empty string in a number column,
  wrong enum casing). The `--write` path handles the safe subset; the rest get SQL.

## Exit code

Non-zero when invalid rows remain and `--write` was not passed — so it can gate CI
("fail the build if content doesn't validate").
