# Priority-one infrastructure and operations audit

Audited September 4, 2026, against `main` at `d782bd79`. Production log window:
September 4 00:30–September 5 00:30 UTC. This covers deployment consistency,
operation execution, and API/database resilience. It is an audit, not a deployed
fix. Production configuration and data were not changed.

The code and Supabase audit found five urgent remediation areas. The Render
portion remains incomplete: the available browser is signed out, and a sign-in
request is pending. No evidence here establishes Render's build command, cache
invalidation settings, rollback procedure, service plan, or historical CPU/memory.

## What happened on July 18

The [Discord announcement](https://discord.com/channels/735260060682289254/750870359552688189/1528115777331396728)
at 19:06 UTC attributed the outage to a deployment-pipeline caching change leaving
backend services stale. Supabase logs independently identify a concrete failure:
`permission denied for table public_user`, SQLSTATE `42501`.

| Observed get-user version | Window on July 18, UTC | Responses in the queried window |
| --- | --- | --- |
| 217 | 12:00:04–13:01:17 | 1,909 HTTP 200 |
| 218 | 13:01:18–19:07:39 | 12,207 HTTP 400; also 176 HTTP 200 during its lifetime |
| 219 | 19:07:49–20:59:59 | 4,539 HTTP 200 |

Version 218 emitted 12,262 structured `get-user` permission-error events that day;
`create-character`, `create-campaign` and several other handlers had the same
error. Log-source event counts and HTTP request counts are separate measurements,
not additive. The observed degradation spans about six hours; this does not mean
every page was unavailable for that whole period.

The repository's
[secret-column migration](../../../supabase/migrations/20260717000000_public_user_secret_columns.sql)
removes blanket SELECT on `public_user` and grants only public columns. Compatible
handlers must use the authorized service-client path for protected fields. The
incident's permission errors and version-bound recovery strongly support a
handler/schema compatibility failure. The exact cached artifact or deployment
command that produced version 218 still needs Render/deployment history; do not
present that last causal step as proven.

The incident-window Postgres error aggregate was dominated by 12,843 permission
errors. It did not show a connection-exhaustion or database-restart signature in
that error-code result. This is not a historical resource-metrics clearance.

## Urgent findings and acceptance criteria

### P1 — Older calculations can replace the current character store

[operations.main.ts:177](../../../frontend/src/process/operations/operations.main.ts#L177)
imports every completed character store immediately; creatures do the same at
line 196. The freshness check in
[use-character.tsx:271](../../../frontend/src/utils/use-character.tsx#L271)
happens afterward. An old result can therefore overwrite a new store even when
the hook correctly discards its result package. Derived stats, HP, inventory
adjustments and subsequent companion calculations read this shared store.

The transport probe resolves the newer request first and the older one second:
store import order is `newer, older`. Separately, the actual controller with
synthetic characters returns levels `[1,9]` sequentially but `[9,9]` when invoked
concurrently. The controller resets shared variables, selections, sources and
deferred operations at execution start.

**Scope of proof:** the concurrency probe demonstrates non-reentrancy. Concurrent
direct/fallback calls can overlap immediately. Two browser worker message tasks
only overlap if the first yields to pending I/O; resolved microtasks alone do not
establish that. The production content store has hydration/network await paths,
but this audit did not measure how frequently worker overlap occurs on real
characters. The out-of-order store commit is independently reproduced.

**Fix:** associate each calculation with an entity and increasing generation;
reject obsolete generations before importing any store or applying side effects.
Serialize work within each mutable execution context, including the direct path.
Invalidate delayed HP callbacks on generation change/unmount. Verify rapid edits,
character switches, companion calculations and delayed content completion. A stale
run must produce zero store writes or derived saves.

### P1 — A failed worker can leave calculation/loading permanently pending

[operations.main.ts:123](../../../frontend/src/process/operations/operations.main.ts#L123)
registers `onmessage` but no error/message-error handler, deadline or replacement.
Requests are placed in the pending map before `postMessage` at line 157. The hook's
promise chain at
[use-character.tsx:258](../../../frontend/src/utils/use-character.tsx#L258)
has no rejection/finally recovery. Its execution marker can remain set, suppressing
a retry with the same input.

The isolated worker-runtime failure probe reports no error handlers and a pending
promise. Normal exceptions caught inside the worker handler are a different path;
they reject the request, but the hook still lacks cleanup.

**Fix:** track requests by worker; reject and clear them on worker failure,
serialization failure or a bounded calculation deadline; replace the failed worker.
Clear loading/execution state and expose retry while retaining the last valid
calculation. Test worker bootstrap failure, native crash, handler rejection and
successful recovery with the same character input.

### P1 — Expired JWT save failures bypass session recovery

The recent log window contains **959 structured `update-character` expired-JWT
error events**. The shared wrapper maps thrown PostgREST errors to HTTP 400 at
[helpers.ts:161](../../../supabase/functions/_shared/helpers.ts#L161).
[request-manager.ts:105](../../../frontend/src/request/request-manager.ts#L105)
only checks for a missing session after HTTP 401/403. Consequently `PGRST301`/HTTP
400 never reaches that recovery/notification path.

The real request-manager replay returns null after one failed save, with zero
session checks and zero session-expired notices. The save hook displays its generic
five-second connection warning instead. This does not prove every logged error
was an irrecoverable lost edit; local autosave buffering already exists.

**Fix:** normalize known invalid/expired authentication errors to 401 and recognize
their structured code in the client. Reacquire a valid session or offer re-login,
retain unsynced data, and resume deliberately. The existing buffered-replay path
at `use-character.tsx:187` uses its saved token; include replacing an expired saved
token and checking semantic write success in the recovery tests. Do not retry
arbitrary ambiguous mutations just because a gateway failed.

### P1 — AI and vector population have no caller entitlement boundary

Deployed copies match the current handlers:
[open-ai-request/index.ts:8](../../../supabase/functions/open-ai-request/index.ts#L8),
[vector-db-populate-collection/index.ts:8](../../../supabase/functions/vector-db-populate-collection/index.ts#L8)
and [_shared/vector-db.ts:18](../../../supabase/functions/_shared/vector-db.ts#L18).
They do not require a real user or an administrator before invoking the external
service. The AI proxy forwards a caller-selected model and unbounded content;
neither upstream call has an abort deadline. Vector population accepts an empty
ID array, which `fetchData` treats as no ID filter, then sends every visible row
to the indexing service using the server's credential.

The local probe uses the actual wrapper and handlers with stubbed auth/database/
upstream boundaries. Both handlers reach the upstream with zero user checks;
empty vector IDs forward both fixture rows. These functions have gateway JWT
verification enabled, but validation of the public legacy anon JWT is not user
entitlement. Supabase documents the distinction between
[platform JWT checking and handler authorization](https://supabase.com/docs/guides/functions/auth).
A harmless live request to the gateway-protected legacy `get-sheet-content`
route with the public anon key and ID -1 returned success, confirming that an anon
key can pass this project's legacy gateway check.

No expensive anonymous production invocation was made. Recent logs show 56
authenticated AI requests and no observed vector/legacy calls in the selected
24-hour window; this audit does not claim an exploitation incident.

**Fix:** enforce user entitlement on AI, an administrator/service-only boundary on
index population, model allowlists, input/batch/result limits, upstream deadlines,
and a shared spend/work quota. Validate authorization before body-heavy or paid
work. Remove unused routes only after checking their consumers.

### P1 — Releases lack a verifiable function/schema compatibility gate

All **59 deployed function bundles** were downloaded read-only to temporary
directories. All **55 current repository entry points match deployed bytes**.
Across 353 comparable files, differences are confined to four remote-only legacy
functions and their old dependencies. This rules out widespread current entry-point
drift; it does not establish a reliable future rollout or rollback.

| Remote-only endpoint | Version | Shared helper matches current? | Current limiter included? |
| --- | --- | --- | --- |
| `find-campaigns` | 35 | No | No |
| `find-characters` | 67 | No | No |
| `find-encounters` | 26 | No | No |
| `get-sheet-content` | 193 | No | No |

`get-sheet-content` is still callable and returned no rate-limit headers on the
bounded ID -1 probe. Repository call sites use the singular replacement endpoints;
similarly named React Query cache keys are not calls to the plural endpoints.
The self-host `main` router is also deployed to cloud. No consumers were observed
for these five routes in the queried 24 hours; external/older clients remain an
open compatibility question.

Production has no `supabase_migrations.schema_migrations` ledger. Metadata lists
only Auth, Realtime and Storage migration tables. Selected effects are present:
public users cannot SELECT `api`/`patreon`, public display names remain readable,
and all twelve audited content `meta_data` columns are JSONB. That confirms those
effects, not the execution history of every repository migration. Do not blindly
run historical migrations to manufacture a ledger.

**Fix:** record a reconciled baseline and release manifest with commit, migration
state, function/shared-module hashes and gateway settings. Deploy compatible
handlers before restrictive schema changes, then run semantic public, authenticated,
admin and save smoke checks. Make shared-module changes rebuild all dependents;
fail releases on unexpected remote routes. Inspect consumers and retire the legacy
routes/self-host router through that controlled release. Keep a tested compatible
rollback target; do not restore public access to secret columns as a rollback.

## API admission and database capacity

**Admission is not a dependable abuse/spend ceiling yet.** The limiter at
[_shared/rate-limit.ts:91](../../../supabase/functions/_shared/rate-limit.ts#L91)
keys by raw token. Different anonymous visitors using the shared public JWT share
one 240/minute bucket in a given function isolate, rather than independent user/IP
budgets. Arbitrary distinct JWT-shaped strings create fresh buckets before
authentication on gateway-disabled handlers. The local wrapper admits 300 such
distinct tokens to a stub handler without an auth check; real DB queries still
face RLS/JWT validation. This is not proof of a data-authorization bypass.

State is per isolate and resets on cold start; expired distinct keys are never
globally evicted. JSON parsing occurs before limiting, confirmed even for a locally
rejected request. Prioritize shared authenticated-identity/work budgets for expensive
routes; add a bounded anonymous edge limit and bounded body parsing. The recent
155,718 non-OPTIONS function requests show zero HTTP 429 responses, so no observed
rate-limit outage is claimed. Distributed limiter design should follow actual cost
and concurrency requirements, not add infrastructure without a measured purpose.

**Current database snapshot has headroom.** Observations around 00:30 UTC:

- Database size 5,466 MB; configured maximum 120 connections; 20 ordinary client
  backends in the grouped activity snapshot, with one active audit query.
- No ungranted locks in the snapshot. Database statistics report zero deadlocks
  and a 99.808% block-cache hit ratio. Postmaster start time is June 21.
- `temp_bytes` is approximately 410.7 GB cumulatively; this is not current disk use
  or a recent growth rate. I/O timing counters are zero, so they cannot establish
  latency or spare IOPS. Historical CPU, disk utilization and memory remain unmeasured.
- Cumulative statement time is dominated by broad content reads/JSON aggregation.
  A sorted item-query entry alone reports roughly 3.47 million temporary blocks
  written. Statistics are cumulative, not a timeline linking these queries to July 18.
- Recent HTTP-200 function p95: ability blocks about 3.07 seconds, items 3.17
  seconds, spells 2.04 seconds; ordinary character reads/updates about 0.55–0.59
  seconds. Of 155,718 non-OPTIONS function requests, 25 were HTTP 5xx (~0.016%).
  HTTP 200 is not necessarily semantic success.

The production REST cap is **10,000 rows**, above `fetchData`'s 5,000-row page.
The possible premature-stop bug if the cap is later lowered is a regression risk,
not a current truncation finding. Resolve official source IDs once per request,
profile the large ordered content queries under real RLS roles, and consider
bounded/cacheable corpus delivery before buying more database capacity. Do not
add speculative indexes without representative query plans and latency measurements.

The [production dump workflow](../../../.github/workflows/db_dump.yml) still runs on
every main push and weekly. The latest
[run](https://github.com/wanderers-guide/wanderers-guide/actions/runs/33927352857)
spent **14 seconds** in `Dump Database`; two push-triggered runs occurred within
eight minutes. Workflow comments document historical I/O pressure, but these runs
do not prove current saturation. Decouple sanitized corpus export from unrelated
code pushes and measure its resource impact; a replica/snapshot is an option if
the observed load justifies it.

## Additional confirmed findings from these surfaces

**P2: content-source counts fail while reporting success.** There were 1,107
`get-content-source-stats` log events with `operator does not exist: jsonb ~~ unknown`
in the recent window. The `.like('subscribed_content_sources::text', ...)` filter
at [index.ts:24](../../../supabase/functions/get-content-source-stats/index.ts#L24)
does not produce the intended text comparison in the deployed REST path. A live
source-1 request returned HTTP 200, `status: success`, and `count: null`. Use a
correct bounded JSONB membership/count query and return/monitor semantic failure
when the query fails. This is the source-statistics endpoint, not `search-data`.

**P2: recovery point and restore readiness.** Supabase reports seven completed
daily physical backups, August 29–September 4, at roughly 04:45–04:50 UTC;
point-in-time recovery is disabled. A daily-backup-only recovery can lose changes
since the latest backup. Restore testing, storage-object recovery and an agreed
RPO/RTO remain unverified. The sanitized Git dump is not a substitute for user-data
backups. Database SSL enforcement is on. Network restrictions allow all IPv4/IPv6
addresses; this is an exposure/inventory fact, not proof that authentication is bypassed.

## Reproductions and evidence

Run from the repository root with frontend dependencies installed:

```sh
node .agents/reports/2026-09-04/operations-worker-probe.mjs
node .agents/reports/2026-09-04/operations-concurrency-probe.mjs
node .agents/reports/2026-09-04/priority-one-api-probe.mjs
node .agents/reports/2026-09-04/expired-session-probe.mjs
```

These are diagnostic reproductions of current failures, not passing product
regression tests. The concurrency/API/session scripts assert the observed faulty
behavior. They bundle repository source with explicit local boundaries and make
no external requests. No user character data or credentials are in the fixtures.

The adjacent `priority-one-evidence.json` preserves sanitized deployment hashes,
provider configuration and log aggregates. Source downloads remain temporary;
credentials were held only for requests to their intended provider and never
printed or saved in reports. The database was queried through Supabase's
[read-only SQL endpoint](https://supabase.com/docs/reference/api/v1-read-only-query),
and historical/recent logs through its
[log query API](https://supabase.com/docs/guides/observability/advanced-log-filtering).

Remaining audit work: Render service inventory/build commands/cache behavior and
rollback history after sign-in; historical resource metrics; real-browser worker
I/O overlap and recovery frequency; legacy consumer lookback beyond one day;
complete migration-baseline reconciliation; restore drill. These gaps do not block
fixing the reproduced code defects.
