#!/bin/bash
set -euo pipefail

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then echo 'Usage: create-db.sh DATABASE_URI [SCHEMA_FILE]' >&2; exit 2; fi
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
task_schema_file="${2:-schema.sql}"
test -f "$task_schema_file"
test -f data.sql

echo 'Restoring schema and data into the local scratch database'
# Never echo unsanitized rows. SQLSTATE-only errors cannot disclose COPY values.
{
  echo 'DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;'
  echo 'CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;'
  "$SCRIPT_DIR/filter-pg-dump.sh" schema < "$task_schema_file"
  "$SCRIPT_DIR/filter-pg-dump.sh" data < data.sql
} | psql -X -q --single-transaction --set=ON_ERROR_STOP=1 --set=VERBOSITY=sqlstate --set=SHOW_CONTEXT=never -d "$1"
