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
  docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q "$@"
}

run_psql() {
  docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1
}

run_content_check() {
  { printf 'BEGIN READ ONLY;\n'; cat "$SCRIPT_DIR/../supabase/release/$1"; printf '\nROLLBACK;\n'; } | run_psql_quiet -At
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

# 3. The dump's trigram search indexes reference public.gin_trgm_ops, but a
#    schema-only dump of public.* doesn't carry CREATE EXTENSION, and step 2
#    just dropped anything that lived in public. Bootstrap pg_trgm into public
#    (relocating it if this database pre-enabled it in another schema) before
#    the schema load, or every *_trgm_idx CREATE INDEX fails.
echo "==> Ensuring pg_trgm extension in schema public"
run_psql <<'SQL'
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
DO $$
BEGIN
  IF (SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
      WHERE e.extname = 'pg_trgm') <> 'public' THEN
    ALTER EXTENSION pg_trgm SET SCHEMA public;
  END IF;
END $$;
SQL

# 4. Load schema. The dump was made with pg_dump 16/17 and uses \restrict /
#    \unrestrict meta-commands that older psql clients don't recognise. Strip
#    those before piping in.
#    CREATE TRIGGER statements are stripped too: pg_dump --table dumps triggers
#    but never their functions, so loading them here fails. The migrations
#    replayed in step 8 own every trigger (drop if exists + recreate alongside
#    the function) — which imposes the invariant that any trigger added to prod
#    must come from a migration, or local/CI databases will silently lack it.
echo "==> Loading schema.sql"
sed -e '/^\\restrict /d' -e '/^\\unrestrict /d' -e '/^CREATE TRIGGER /d' "$SCRIPT_DIR/schema.sql" | run_psql_quiet

# 5. Load data.
echo "==> Loading data.sql (~45 MB, this may take a minute)"
sed -e '/^\\restrict /d' -e '/^\\unrestrict /d' "$SCRIPT_DIR/data.sql" | run_psql_quiet

# 6. Supabase services connect as anon/authenticated/service_role; they need
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

# 7. Trigger that auto-creates a public_user row on auth signup, so users can
#    register normally instead of needing a manual Studio insert.
echo "==> Installing auth → public_user trigger"
run_psql < "$SCRIPT_DIR/auth-trigger.sql"

# 8. Apply migrations. schema.sql is a prod dump that lags whatever landed in
#    supabase/migrations since the last db_dump.yml refresh, so replaying them
#    is the only way local/CI matches prod (e.g. the secret-column grants, the
#    content updated_at triggers). This must run LAST: step 5's blanket GRANT
#    would undo any column-level grants a migration sets up.
#    Requirement this imposes: every migration must stay re-runnable over a
#    schema that already contains it (if not exists / or replace / revoke+grant),
#    which all current migrations follow.
echo "==> Applying migrations from supabase/migrations"
for migration in "$SCRIPT_DIR"/../supabase/migrations/*.sql; do
  echo "    -> $(basename "$migration")"
  # These imports have complete registered successor checks. A refreshed dump
  # can already contain their approved citations, which the original imports reject.
  check_file=''
  case "$(basename "$migration")" in
    20261008160000_tech_core_introductory_spells.sql)
      check_file='tech-core-introductory-spells-citation-compatibility.sql'
      check_id='tech-core-introductory-spells' ;;
    20261008190000_tech_core_general_spells.sql|20261011000100_incarnate_release_compatibility.sql)
      check_file='tech-core-general-spells-citation-compatibility.sql'
      check_id='tech-core-general-spells' ;;
  esac
  if [ -n "$check_file" ]; then
    check_result=$(run_content_check "$check_file")
    case "$check_result" in
      "$check_id|t") continue ;;
      "$check_id|f") ;; # The unchanged migration handles absent imports or refuses incompatible data.
      *) echo "Error: invalid Tech Core compatibility result for $(basename "$migration")" >&2; exit 1 ;;
    esac
  fi
  run_psql_quiet < "$migration"
  if [ -n "$check_file" ]; then
    check_result=$(run_content_check "$check_file")
    if [ "$check_result" != "$check_id|t" ]; then
      echo "Error: Tech Core compatibility check failed after $(basename "$migration")" >&2
      exit 1
    fi
  fi
done

echo "==> Done. Project schema and content data loaded."
