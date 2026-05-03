#!/usr/bin/env bash
# Align Supabase admin role passwords with $POSTGRES_PASSWORD.
# Filename starts with "zzz-" so this runs AFTER the supabase/postgres image's
# own init scripts have created the roles. We don't CREATE here — we only
# ALTER the passwords so auth/rest/storage can connect.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  ALTER ROLE authenticator           WITH LOGIN PASSWORD '$POSTGRES_PASSWORD';
  ALTER ROLE supabase_auth_admin     WITH LOGIN PASSWORD '$POSTGRES_PASSWORD';
  ALTER ROLE supabase_storage_admin  WITH LOGIN PASSWORD '$POSTGRES_PASSWORD';
EOSQL
