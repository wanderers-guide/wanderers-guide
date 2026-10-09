# Self-hosting with Docker Compose (skeleton)

> **Status:** community-supported skeleton, not a production deployment.
> The codebase targets Supabase cloud; this stack stands up the equivalent
> services locally so you can run the app on your own server.

## What's included

| Service     | Image                          | Purpose                               |
| ----------- | ------------------------------ | ------------------------------------- |
| `frontend`  | built locally from `frontend/` | The Vite/React app served by nginx    |
| `kong`      | `kong:2.8.1`                   | API gateway (single entrypoint)       |
| `auth`      | `supabase/gotrue`              | Authentication                        |
| `rest`      | `postgrest/postgrest`          | REST over Postgres                    |
| `storage`   | `supabase/storage-api`         | File storage                          |
| `meta`      | `supabase/postgres-meta`       | Schema introspection (used by Studio) |
| `functions` | `supabase/edge-runtime`        | Runs the Deno edge functions          |
| `studio`    | `supabase/studio` (optional)   | Web UI for the database               |
| `db`        | `supabase/postgres:15`         | Postgres + Supabase extensions        |

What's **not** included: realtime, analytics/log-stream, image proxy,
inbucket (mail sink), TLS termination, backups. Add as needed.

## Quickstart

```bash
# 1. Configuration
cp .env.docker.example .env

# 2. Generate a JWT secret (32+ chars)
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env

# 3. Generate ANON_KEY and SERVICE_ROLE_KEY by signing JWTs with that secret.
#    See https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
#    Paste the resulting tokens into .env.

# 4. Bring it up
docker compose up -d

# 5. Initialize the project schema and bundled content on a fresh database.
#    This replaces the public schema. Do not run it over an existing installation.
./data/create-db-docker.sh

# 6. (Optional) Studio for inspecting the DB
docker compose --profile studio up -d

# 7. Open http://localhost:3000
```

## Wiring notes

- The frontend image installs the committed lockfile with `npm ci --legacy-peer-deps`,
  matching CI. Commit `frontend/package-lock.json` whenever dependencies change.
- `PUBLIC_SUPABASE_URL` is what the **browser** uses to reach kong. On
  localhost that's `http://localhost:8000`. In a real deployment, proxy
  this behind a TLS terminator and set it to your public URL.
- Vite envs (`VITE_*`) are baked into the frontend bundle at build time.
  After changing `PUBLIC_SUPABASE_URL` or `ANON_KEY`, rebuild:
  ```bash
  docker compose build frontend && docker compose up -d frontend
  ```
- `ANON_KEY` is intentionally public (it's the browser's API key).
  Never bake `SERVICE_ROLE_KEY` into the frontend.

## Database setup and account recovery

`data/create-db-docker.sh` loads the checked-in schema and sanitized content dump,
installs the signup trigger, and applies the migrations. Starting Compose alone
does not install the project tables or content. Initialize a fresh database before
registering an account or creating characters.

If an existing installation reports **User not found** after login, verify that
`data/auth-trigger.sql` is installed. The trigger creates profiles for new accounts.
It does not repair accounts registered before the trigger was installed. Back up
the database, then install the trigger and create only the missing profiles:

```bash
docker compose exec -T db psql -U postgres -v ON_ERROR_STOP=1 < data/auth-trigger.sql
docker compose exec -T db psql -U postgres -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO public.public_user (user_id, display_name)
SELECT id, COALESCE(
  raw_user_meta_data ->> 'display_name',
  raw_user_meta_data ->> 'name',
  raw_user_meta_data ->> 'full_name',
  split_part(email, '@', 1),
  'Unknown User'
)
FROM auth.users AS account
WHERE NOT EXISTS (
  SELECT 1 FROM public.public_user AS profile WHERE profile.user_id = account.id
);
SQL
```

Content searches also depend on the edge runtime configuration in
`supabase/functions/main/index.ts`. Its CPU and worker timeout limits allow the
larger content queries to finish. If a custom deployment returns empty selectors
and logs CPU timeouts, update that configuration and restart the `functions`
service. Do not reset an existing database to repair a runtime timeout.

## Things you'll have to do yourself

- **Database maintenance.** Back up your database and apply new migrations as the
  repository changes. The bootstrap script replaces the public schema and is only
  intended for a fresh or disposable database.
- **OAuth providers.** Add `GOTRUE_EXTERNAL_<PROVIDER>_*` env vars to the
  `auth` service. The provider's redirect URL must match
  `${PUBLIC_SUPABASE_URL}/auth/v1/callback`.
- **SMTP for email auth.** Add `GOTRUE_SMTP_*` env vars.
- **TLS / public hostname.** Stand up a reverse proxy (Caddy, Traefik,
  nginx) in front of `frontend:80` and `kong:8000`.
- **Edge function secrets.** Add to the `functions` service environment.
- **Patreon linking.** Configure `PATREON_V2_CLIENT_ID` and
  `PATREON_V2_CLIENT_SECRET` for a v2 application registered under your creator
  account. Compose passes the public ID into the frontend build as
  `VITE_PATREON_CLIENT_ID`; rebuild the frontend after changing it. Keep the old
  `PATREON_CLIENT_ID` and `PATREON_CLIENT_SECRET` for refreshing existing grants.
  Register your site's `/auth/patreon/redirect` URL with Patreon. Leave these
  variables empty if Patreon linking is unused. See the
  [development guide](/development#patreon-api-v2-configuration) for migration
  and release verification.

## Known limitations of this skeleton

- No realtime channels (the supabase-js client just no-ops without it).
- No image transformations (storage serves originals).
- Studio is opt-in via the `studio` compose profile.
- `docker/kong.yml` is a static minimal config; edit it for rate limiting,
  custom CORS, or per-route auth.
- Image tags are pinned to versions that worked at the time of writing.
  Bump them deliberately.
