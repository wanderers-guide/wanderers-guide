![Wanderer's Guide](https://legacy.wanderersguide.app/images/logo.png "Wanderer's Guide logo")

## Quick links

- [Web App](./frontend)
- [Serverless API](./supabase)
- [Legacy App Repo](https://github.com/wanderers-guide/wanderers-guide-legacy)

## Description

> This is currently undergoing significant changes as the remaster is being built from the legacy app. More updates will be coming soon!

To help contribute, go to the [Legacy App](https://github.com/wanderers-guide/wanderers-guide-legacy/tree/main/services/express) and follow the README there. If you would like to contribute to the rework, come chat to us on the [Wanderer's Guide Discord](https://discord.gg/kxCpa6G) and search tag `@developer` in the development channel.

## Setup, self-hosting, and tests

All instructions live in the docs site so we only have to maintain them in one place:

- **[Local development](https://docs.wanderersguide.app/development)** — running the app locally (Supabase CLI or Docker Compose), creating a user, running the Cypress E2E suite, and running the Edge Function (`test:api`) suite.
- **[Self-hosting with Docker](https://docs.wanderersguide.app/docker)** — full wiring notes for `docker-compose.yml`: what's included, what you have to set up yourself (OAuth, SMTP, TLS), and known limitations.
- **[API reference](https://docs.wanderersguide.app/api-reference/introduction)** — public HTTP API: every endpoint, schemas, auth flow, rate limits.

If you spot something that's documented incorrectly, please update the docs (in [`docs/`](./docs)) rather than adding it back to this README.
