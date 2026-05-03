#!/usr/bin/env bash
# Seed the cypress test user (test@wanderersguide.app) into the dockerized
# Supabase stack. Idempotent — safe to run repeatedly.
#
# Reads SERVICE_ROLE_KEY and PUBLIC_SUPABASE_URL from the repo-root .env.
# The auth-trigger.sql installed by create-db-docker.sh handles populating
# the matching public_user row, so we only need to create the auth.users row.
#
# Usage:  ./data/seed-test-user.sh

set -euo pipefail

EMAIL="${TEST_EMAIL:-test@wanderersguide.app}"
PASSWORD="${TEST_PASSWORD:-test1234}"
DISPLAY_NAME="${TEST_DISPLAY_NAME:-User Name}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found. Copy .env.docker.example to .env and fill in keys." >&2
  exit 1
fi

PUBLIC_SUPABASE_URL=$(grep '^PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2-)
SERVICE_ROLE_KEY=$(grep '^SERVICE_ROLE_KEY=' "$ENV_FILE" | cut -d= -f2-)

if [ -z "${PUBLIC_SUPABASE_URL:-}" ] || [ -z "${SERVICE_ROLE_KEY:-}" ]; then
  echo "Error: PUBLIC_SUPABASE_URL or SERVICE_ROLE_KEY missing from $ENV_FILE" >&2
  exit 1
fi

# -w writes the HTTP status to stderr after the body, so we can branch on it
# (200/201 = created, 422 = already exists, anything else = real failure).
http_status=$(curl -sS -o /tmp/seed-test-user.body -w '%{http_code}' \
  -X POST "$PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"email_confirm\":true,\"user_metadata\":{\"display_name\":\"$DISPLAY_NAME\"}}")

case "$http_status" in
  200|201)
    user_id=$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/tmp/seed-test-user.body','utf8')).id || '')")
    echo "==> Created test user $EMAIL ($user_id)"
    ;;
  422)
    # gotrue returns 422 with code "email_exists" (or similar) when the user
    # already exists. Treat as success — this script is meant to be idempotent.
    echo "==> Test user $EMAIL already exists, nothing to do"
    ;;
  *)
    echo "Error: unexpected HTTP $http_status from /auth/v1/admin/users" >&2
    cat /tmp/seed-test-user.body >&2
    echo >&2
    exit 1
    ;;
esac
