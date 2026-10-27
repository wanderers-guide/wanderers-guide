#!/bin/bash
set -euo pipefail

if [ "$#" -ne 1 ]; then echo 'Usage: ci-dump.sh DATABASE_URI' >&2; exit 2; fi
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p .scratch
task_export_dir="$(mktemp -d .scratch/export.XXXXXX)"
trap 'rm -rf "$task_export_dir"' EXIT

# Dump the schema only
echo Dumping schema
pg_dump --schema-only --format=custom --table="public.*" "$1" > "$task_export_dir/schema.dump"
pg_restore --file=- "$task_export_dir/schema.dump" | "$SCRIPT_DIR/filter-pg-dump.sh" portable > "$task_export_dir/schema.sql"
# Keep the full schema above; the scratch omits unavailable Auth dependencies.
pg_restore --section=pre-data --no-owner --no-privileges --file=- "$task_export_dir/schema.dump" |
  "$SCRIPT_DIR/filter-pg-dump.sh" portable > "$task_export_dir/schema-pre-data.sql"
# Reinstall public dependencies only after private rows have been removed. They
# preserve pg_dump's parent-before-child order without requiring Auth in scratch.
psql -X -qAt --set=ON_ERROR_STOP=1 --set=VERBOSITY=sqlstate --set=SHOW_CONTEXT=never -d "$1" <<'SQL' > "$task_export_dir/schema-public-constraints.sql"
SELECT format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s;', n.nspname, r.relname, c.conname, pg_get_constraintdef(c.oid))
FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
LEFT JOIN pg_class referenced ON referenced.oid=c.confrelid
LEFT JOIN pg_namespace referenced_schema ON referenced_schema.oid=referenced.relnamespace
WHERE n.nspname='public' AND (c.contype IN ('p','u') OR (c.contype='f' AND referenced_schema.nspname='public'))
ORDER BY CASE WHEN c.contype='f' THEN 1 ELSE 0 END, r.relname, c.conname;
SQL

# Dump the data only excluding user tables
echo Dumping full data
pg_dump --data-only --table="public.*" \
  -T "public.public_user" \
  -T "public.campaign" \
  -T "public.character" \
  -T "public.encounter" \
  -T "public.content_update" \
  -T "public.campaign_join_grant" \
  -T "public.edge_work_budget" \
  "$1" | "$SCRIPT_DIR/filter-pg-dump.sh" portable > "$task_export_dir/data.sql"
mv "$task_export_dir/schema.sql" schema.sql
mv "$task_export_dir/data.sql" data.sql
mv "$task_export_dir/schema-pre-data.sql" .scratch/schema-pre-data.sql
mv "$task_export_dir/schema-public-constraints.sql" .scratch/schema-public-constraints.sql
