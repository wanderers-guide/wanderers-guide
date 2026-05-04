![Wanderer's Guide](https://legacy.wanderersguide.app/images/logo.png "Wanderer's Guide logo")

[![CI](https://github.com/wanderers-guide/wanderers-guide/actions/workflows/ci.yml/badge.svg)](https://github.com/wanderers-guide/wanderers-guide/actions/workflows/ci.yml)
[![E2E](https://github.com/wanderers-guide/wanderers-guide/actions/workflows/e2e.yml/badge.svg)](https://github.com/wanderers-guide/wanderers-guide/actions/workflows/e2e.yml)
[![Last commit](https://img.shields.io/github/last-commit/wanderers-guide/wanderers-guide)](https://github.com/wanderers-guide/wanderers-guide/commits)
[![Contributors](https://img.shields.io/github/contributors/wanderers-guide/wanderers-guide)](https://github.com/wanderers-guide/wanderers-guide/graphs/contributors)
[![License](https://img.shields.io/github/license/wanderers-guide/wanderers-guide)](LICENSE.txt)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/FxsFZVvedr)

> An open-source character builder and rules engine for Pathfinder 2e and Starfinder 2e.

## Quick links

- [Web App](./frontend)
- [Serverless API](./supabase)
- [Legacy App Repo](https://github.com/wanderers-guide/wanderers-guide-legacy)

## Setup, self-hosting, and tests

- **[Local development](https://docs.wanderersguide.app/development)** — running the app locally (Supabase CLI or Docker Compose), creating a user, running the Cypress E2E suite, and running the Edge Function (`test:api`) suite.
- **[Self-hosting with Docker](https://docs.wanderersguide.app/docker)** — full wiring notes for `docker-compose.yml`: what's included, what you have to set up yourself (OAuth, SMTP, TLS), and known limitations.
- **[API reference](https://docs.wanderersguide.app/api-reference/introduction)** — public HTTP API: every endpoint, schemas, auth flow, rate limits.
