# Priority-one fixes — September 5, 2026

This change implements the code fixes identified in the [September 4 audit](../2026-09-04/priority-one-audit.md). The additive production quota prerequisite has been applied and its table, privileges and RPC checks pass. Production functions and the frontend have not been deployed from this branch. The earlier audit probes intentionally reproduce failures at `d782bd79`; they are historical evidence, not regression tests for the fixed code.

## Changes

- Operation workers accept one active calculation, reject obsolete results before importing stores, validate the result type, terminate failed/stuck workers, and release pending listeners/timers. Character changes cause companions to wait and recalculate against the committed parent. Direct controllers serialize their shared state; worker commits wait for direct-store restoration. The sheet and builder expose an accessible retry button and suppress saves during failed/incomplete calculations.
- Expired/invalid JWTs become `401 / AUTH_REQUIRED`; the client also recognizes old `400 / PGRST301` responses. Concurrent failures share one refresh, with no replay across account changes. Ambiguous mutation failures are not retried automatically. Account-scoped drafts keep no bearer token, preserve optimistic concurrency, survive logout and navigation, and offer a downloadable copy when safe automatic replay is unavailable.
- AI and vector queries require a real WG account; vector population requires an administrator. Input/body/result bounds, upstream deadlines, bounded IP admission, and service-only atomic account/global work budgets protect the paid services. Existing free AI access remains. Optional indexing failure no longer changes an already-committed moderation approval into a reported write failure.
- Subscriber statistics use exact JSONB membership and an explicit failure response instead of silently returning `count: null`.
- A release manifest and read-only remote gate compare the complete runtime dependency graph, gateway policy, migrations and verified schema effects. Seven historical migrations are reconciled against 134 production objects/grants without inventing migration history. New quota prerequisites have executable effect/body/privilege checks. Production data exports run scheduled/manual only, with deadlines, and exclude quota/user state.

## Verification

- Frontend TypeScript, production build and ESLint: passed (warnings remain).
- Infrastructure regressions: 51 passed, including actual controllers, worker transport failures, concurrent requests, account changes and the real save hook.
- Existing rules/drawers: 47 passed. Content audit CLI: 7 passed. Release checks: 7 passed.
- Local Deno API suite: 52 passed. Local handler replay and transactional Postgres quota/grant/global-ceiling/release-negative checks passed. Tests made no paid upstream requests.
- Calculation recovery and saved-copy Cypress flows passed at desktop/mobile widths; the saved JSON contents were verified. Screenshots were inspected. The full builder run exposed generated Elf Feat descriptors being rejected as incomplete database rows; a regression for Elf with both Acolyte records now validates the computed protocol without rejecting valid descriptors. The app currently forces its dark theme. An initial transparent recovery message was replaced by a solid themed panel because it was unreadable over bright character artwork.
- Documentation link check passed; Mintlify still prints its existing `docs.json` OpenAPI warning.

## Release status and remaining infrastructure evidence

Use [Release and recovery](../../../docs/releases.mdx). Apply only the additive `20260905000000_edge_work_budget.sql` prerequisite before deploying its handlers. The new handlers fail closed without the quota RPC. Do not replay historical migrations or fabricate a migration ledger.

The quota prerequisite was applied on September 5 in one transaction with a 5-second lock timeout and 30-second statement timeout, after confirming both objects were absent. SHA-256: `d164b5c9299a5e06e9eb1201f81f887718a4f327371fdd1854fdc2ab7ac4d6db`. All three production effect checks pass. Automatic approval review rejected the subsequent 54-function deployment as a broad production mutation requiring explicit rollout approval; no function deployment or retirement was executed.

The read-only production comparison confirmed the historical baseline and correctly failed on the undeployed branch, missing quota RPC, and five unexpected endpoints: `find-campaigns`, `find-characters`, `find-encounters`, `get-sheet-content`, and self-host `main`. A follow-up review covered seven complete UTC days (August 29–September 4), including 1,764,530 function-edge events and 1,144,482 non-OPTIONS requests. All five routes had zero events, including OPTIONS. Daily partitioning resolved the provider’s 24-hour query limit. Exact queries and coverage are recorded in `legacy-seven-day-coverage.json`. The 59 deployed bundles and gateway inventory are backed up under the ignored `.agents/legacy/infra-release-2026-09-05/` directory. This supports retirement; it cannot prove the absence of dormant external clients.

Render remains signed out. Its build/cache ordering, frontend promotion gate, rollback artifact and direct AI/vector service access cannot be verified from this checkout. Do not equate passing local checks with a completed production rollout. Historical capacity metrics and a backup restore drill remain separate follow-ups from the audit.

Workers have a cancellable deadline. A browser's synchronous workerless fallback cannot be forcibly interrupted while JavaScript is executing; its controllers are serialized and freshness/deadline checks prevent publishing obsolete completed results. Normal supported browsers use workers.
