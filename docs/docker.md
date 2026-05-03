# Self-hosting with Docker Compose (skeleton)

> **Status:** community-supported skeleton, not a production deployment.
> The codebase targets Supabase cloud; this stack stands up the equivalent
> services locally so you can run the app on your own server.

## What's included

| Service     | Image                          | Purpose                                |
| ----------- | ------------------------------ | -------------------------------------- |
| `frontend`  | built locally from `frontend/` | The Vite/React app served by nginx     |
| `kong`      | `kong:2.8.1`                   | API gateway (single entrypoint)        |
| `auth`      | `supabase/gotrue`              | Authentication                         |
| `rest`      | `postgrest/postgrest`          | REST over Postgres                     |
| `storage`   | `supabase/storage-api`         | File storage                           |
| `meta`      | `supabase/postgres-meta`       | Schema introspection (used by Studio)  |
| `functions` | `supabase/edge-runtime`        | Runs the Deno edge functions           |
| `studio`    | `supabase/studio` (optional)   | Web UI for the database                |
| `db`        | `supabase/postgres:15`         | Postgres + Supabase extensions         |

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

# 5. (Optional) Studio for inspecting the DB
docker compose --profile studio up -d

# 6. Open http://localhost:3000
```

## Wiring notes

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

## Things you'll have to do yourself

- **Database schema and content seed.** This compose runs `supabase/seed.sql`
  on first DB init, but the production data lives in cloud Supabase. To
  populate a fresh self-host, dump and import the schema + content tables
  you care about, or run whatever migrations you maintain.
- **OAuth providers.** Add `GOTRUE_EXTERNAL_<PROVIDER>_*` env vars to the
  `auth` service. The provider's redirect URL must match
  `${PUBLIC_SUPABASE_URL}/auth/v1/callback`.
- **SMTP for email auth.** Add `GOTRUE_SMTP_*` env vars.
- **TLS / public hostname.** Stand up a reverse proxy (Caddy, Traefik,
  nginx) in front of `frontend:80` and `kong:8000`.
- **Edge function secrets.** Add to the `functions` service environment.

## Known limitations of this skeleton

- No realtime channels (the supabase-js client just no-ops without it).
- No image transformations (storage serves originals).
- Studio is opt-in via the `studio` compose profile.
- `docker/kong.yml` is a static minimal config; edit it for rate limiting,
  custom CORS, or per-route auth.
- Image tags are pinned to versions that worked at the time of writing.
  Bump them deliberately.
