#!/usr/bin/env bash
# Load schema.sql + data.sql into the dockerized Postgres, then grant the
# Supabase roles access. Run AFTER `docker compose up -d`.
#
# Usage:  ./create-db-docker.sh [container-name]
# Defaults to the container name produced by docker-compose.yml.

set -euo pipefail

CONTAINER="${1:-wanderers-guide-db-1}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-postgres}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Error: container '$CONTAINER' is not running. Did you run 'docker compose up -d'?" >&2
  exit 1
fi

run_psql_quiet() {
  docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q
}

run_psql() {
  docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1
}

# 1. The dump references a 'github' CI role; create it if missing so GRANT
#    statements in the dump don't fail.
echo "==> Ensuring 'github' role exists"
run_psql <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'github') THEN
    CREATE ROLE github;
  END IF;
END $$;
SQL

# 2. Reset the public schema.
echo "==> Dropping + recreating public schema"
run_psql <<'SQL'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
SQL

# 3. Load schema. The dump was made with pg_dump 16/17 and uses \restrict /
#    \unrestrict meta-commands that older psql clients don't recognise. Strip
#    those before piping in.
echo "==> Loading schema.sql"
sed -e '/^\\restrict /d' -e '/^\\unrestrict /d' "$SCRIPT_DIR/schema.sql" | run_psql_quiet

# 4. Load data.
echo "==> Loading data.sql (~45 MB, this may take a minute)"
sed -e '/^\\restrict /d' -e '/^\\unrestrict /d' "$SCRIPT_DIR/data.sql" | run_psql_quiet

# 5. Supabase services connect as anon/authenticated/service_role; they need
#    USAGE on the schema and CRUD on its objects. RLS policies (defined in
#    schema.sql) gate actual access.
echo "==> Granting access to Supabase roles"
run_psql <<'SQL'
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
SQL

# 6. Trigger that auto-creates a public_user row on auth signup, so users can
#    register normally instead of needing a manual Studio insert.
echo "==> Installing auth → public_user trigger"
run_psql < "$SCRIPT_DIR/auth-trigger.sql"

echo "==> Done. Project schema and content data loaded."
