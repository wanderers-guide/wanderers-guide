# Branch audit scope

Base: 3a25959fbc14372d63313387e9c5318cc408aaaf

No open GitHub pull requests exist. Review unmerged remote source branches; skip gh-pages deployment output. Treat commit messages/branch READMEs as intent, not an independent user specification.

## origin/perf/lazy-modals-and-images: db65fcfad50ecb89d95a3946439abfab910f5a35

Diff: git diff 3a25959fbc14372d63313387e9c5318cc408aaaf...db65fcfad50ecb89d95a3946439abfab910f5a35

db65fcfa fix(perf): correct modulepreload filter + use SWR for storage images
Audit follow-ups:
- modulePreload: only filter the game-icons chunk from the HTML preload.
  editor/mathjs/charts/framer are still STATICALLY imported by the app
  shell (eager), so stripping their preload (as the previous hostType
  filter did) only delayed them — it didn't take them off first paint.
  Restoring their preload lets them download in parallel with the entry.
  (De-eagering those vendors needs a separate refactor of the shell's
  static imports; tracked as follow-up.)
- workbox storage images: CacheFirst -> StaleWhileRevalidate. Portraits
  are mutable at a stable URL, so CacheFirst could serve a stale portrait
  for weeks after a change; SWR serves instantly and refreshes in the
  background.
- Fix the precache comment: the game-icons chunk is served from the HTTP
  cache on demand (immutable hashed asset), not SW-runtime-cached.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>

540eda13 perf(frontend): lazy-load modals + sized images; shrink first paint further
Builds on the first-load work. The remaining first-paint weight was heavy
vendor chunks (tiptap editor, mathjs, charts, framer-motion) that App.tsx
pulled in eagerly via its 16 statically-imported context modals, plus
Vite eagerly modulepreloading those (now-dynamic) chunks. Eager first-
paint JS drops from ~1.34 MB gzip to ~0.83 MB gzip (entry + react +
mantine + supabase); editor/mathjs/charts/framer/game-icons now load on
demand. (~79% smaller than the original 3.94 MB monolith.)

- App.tsx: lazy-register all 16 context modals via a lazyModal() helper
  that wraps each in its own Suspense boundary (the robust pattern for
  Mantine's ModalsProvider portal; the bare-lazy attempt under Mantine
  v7.6.2 lacked this). This makes their heavy deps dynamic.
- vite.config.ts: extend modulePreload.resolveDependencies to drop the
  heavy lazy-only chunks (game-icons/editor/mathjs/charts/framer) from the
  initial HTML preload (hostType 'html' only — runtime route-transition
  preloads are kept so navigations stay fast).
- images.ts: add sizeImageUrl() — rewrites Supabase Storage object URLs to
  the render/image transform endpoint (a ~2MB background -> a viewport-
  sized webp; portraits ~160KB -> ~3KB), passing non-Supabase URLs through
  untouched and falling back to the original on any error. Apply to the
  full-screen backgrounds in App.tsx and HomePage.tsx.
- vite.config.ts (workbox): add runtimeCaching (CacheFirst for Supabase
  Storage images, SWR for aonprd/dicebear art) so repeat mobile visits
  reuse images; globIgnore the game-icons monolith and stats.html from the
  precache so the SW doesn't background-download them (precache 18.2 ->
  7.3 MiB).

Verified: production build (eager preload = react/mantine/supabase only;
game-icons/editor/mathjs/etc. dynamic and not preloaded), tsc clean for
touched files, app boots with no new runtime errors, and the background
correctly resolves to the sized render/image webp URL.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>

cfc076e4 fix(perf): stop the 6.9MB game-icons chunk loading eagerly on first paint
The manualChunks split pinned react-icons/gi into its own chunk, but the
shared react-icons runtime (lib/GenIcon, also needed by react-icons/bi in
the editor toolbar) was co-located there. Anything needing the tiny
GenIcon helper therefore statically imported it FROM the game-icons chunk,
dragging all 6.9MB onto the eager first-paint path — and the modulePreload
filter masked it (no preload link, but the static import still forced the
load). Route react-icons/lib + non-gi icon sets into a small separate
'icons-vendor' chunk so game-icons stays purely dynamic (load-on-demand).

Verified: the entry no longer statically imports game-icons (dynamic
import() only); icons-vendor is ~1.8KB; tsc unchanged.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>

fb11a370 perf(frontend): cut first-load weight on mobile/limited-wifi
The eager, render-blocking JS bundle was ~10.8 MB raw / 3.94 MB gzip,
~6.6 MB of which was the react-icons/gi monolith (~4000 icons) forced
eager by an `import * as` barrel in Icon.tsx. The eager entry is now
~1.6 MB raw / 0.45 MB gzip (plus split, separately-cached vendor
chunks), and the 6.7 MB game-icon set is fetched only on demand.

- Icon.tsx: lazily dynamic-import react-icons/gi instead of a namespace
  barrel (the `import * as` + Object.entries defeated tree-shaking and
  pinned all ~4000 icons in the eager chunk); render saved game icons on
  demand. Route ItemIcon through <Icon> and swap the few hard-coded Gi*
  dice icons for tabler equivalents so nothing statically imports the
  monolith -> it stays a lazy, on-demand chunk.
- vite.config.ts: add manualChunks (react/mantine/editor/supabase/mathjs/
  charts/pdf/framer + an isolated game-icons chunk) and exclude
  game-icons from modulepreload so it isn't eagerly fetched.
- content-store.ts: skip Zod safeParse on the read path in production (it
  validated the whole corpus on the main thread, freezing first paint of
  the builder/sheet); stop eagerly preloading every background artwork.
- main.tsx: remove the "clear all caches + unregister the service worker
  on every load" hack (it made returning visits re-download everything);
  pair with registerType 'autoUpdate' so deploys still serve fresh assets.
- index.html: preconnect the data/image origin (api.wanderersguide.app);
  stop render-blocking every visitor with the opt-in open-dyslexic font
  (now injected at runtime only when the setting is enabled, in App.tsx).

Verified: production build + bundle sizes, tsc clean for touched files,
app boots with no new runtime errors.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>



## origin/perf/mobile-first-load: cfc076e4ed23a6e07923ee2874527714adff95b6

Diff: git diff 3a25959fbc14372d63313387e9c5318cc408aaaf...cfc076e4ed23a6e07923ee2874527714adff95b6

cfc076e4 fix(perf): stop the 6.9MB game-icons chunk loading eagerly on first paint
The manualChunks split pinned react-icons/gi into its own chunk, but the
shared react-icons runtime (lib/GenIcon, also needed by react-icons/bi in
the editor toolbar) was co-located there. Anything needing the tiny
GenIcon helper therefore statically imported it FROM the game-icons chunk,
dragging all 6.9MB onto the eager first-paint path — and the modulePreload
filter masked it (no preload link, but the static import still forced the
load). Route react-icons/lib + non-gi icon sets into a small separate
'icons-vendor' chunk so game-icons stays purely dynamic (load-on-demand).

Verified: the entry no longer statically imports game-icons (dynamic
import() only); icons-vendor is ~1.8KB; tsc unchanged.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>

fb11a370 perf(frontend): cut first-load weight on mobile/limited-wifi
The eager, render-blocking JS bundle was ~10.8 MB raw / 3.94 MB gzip,
~6.6 MB of which was the react-icons/gi monolith (~4000 icons) forced
eager by an `import * as` barrel in Icon.tsx. The eager entry is now
~1.6 MB raw / 0.45 MB gzip (plus split, separately-cached vendor
chunks), and the 6.7 MB game-icon set is fetched only on demand.

- Icon.tsx: lazily dynamic-import react-icons/gi instead of a namespace
  barrel (the `import * as` + Object.entries defeated tree-shaking and
  pinned all ~4000 icons in the eager chunk); render saved game icons on
  demand. Route ItemIcon through <Icon> and swap the few hard-coded Gi*
  dice icons for tabler equivalents so nothing statically imports the
  monolith -> it stays a lazy, on-demand chunk.
- vite.config.ts: add manualChunks (react/mantine/editor/supabase/mathjs/
  charts/pdf/framer + an isolated game-icons chunk) and exclude
  game-icons from modulepreload so it isn't eagerly fetched.
- content-store.ts: skip Zod safeParse on the read path in production (it
  validated the whole corpus on the main thread, freezing first paint of
  the builder/sheet); stop eagerly preloading every background artwork.
- main.tsx: remove the "clear all caches + unregister the service worker
  on every load" hack (it made returning visits re-download everything);
  pair with registerType 'autoUpdate' so deploys still serve fresh assets.
- index.html: preconnect the data/image origin (api.wanderersguide.app);
  stop render-blocking every visitor with the opt-in open-dyslexic font
  (now injected at runtime only when the setting is enabled, in App.tsx).

Verified: production build + bundle sizes, tsc clean for touched files,
app boots with no new runtime errors.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>



## origin/feat/content-audit-pipeline: 54d42dd71307e004200ba552e34eb7dcbacff756

Diff: git diff 3a25959fbc14372d63313387e9c5318cc408aaaf...54d42dd71307e004200ba552e34eb7dcbacff756

54d42dd7 feat(scripts): content data audit pipeline (Zod validation + safe fixes)
Adds `npm run audit:content`: reads every row of the 13 content tables
straight from Supabase, validates each against the SAME Zod schema the
app uses at its cache boundary, reports what's invalid, and can apply a
small set of provably-safe fixes back to the DB.

Trustworthy because the find-* edge functions do a plain select() with
no enrichment, so a raw table row is exactly what the frontend
validates — auditing the table can't produce a false positive the live
app wouldn't also hit.

Auth is a single Supabase PAT (SUPABASE_PAT): the script self-serves the
project's service_role key from the Management API, then uses PostgREST
for bulk reads and surgical writes.

Three safety gears:
  (default)        read-only audit -> console summary + JSON report
  --write          also compute fixes and print exact diffs (writes nothing)
  --write --apply  PATCH the fixed rows

A fix is written ONLY when the row fully validates after it AND the
change touches only top-level scalar columns — never nested
meta_data/operations JSON, which needs the deliberate SQL patterns and
the schema-vs-data judgment that stay human. Ships two conservative
normalizers (empty-string -> null, enum re-casing); more go in
computeSafeFix(). Non-zero exit on remaining invalid rows so it can gate
CI.

First run over prod (45,704 rows) is clean except a handful of
schema-modeling gaps (creatures storing character-only combat fields as
null; a few nullable meta_data sub-fields; some operation-schema union
gaps) — all schema fixes, tracked separately, not data corruption.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>



## origin/feat/content-zod-validator: 5e0399cb71a8a99393273c37e6ec4741d1b2d299

Diff: git diff 3a25959fbc14372d63313387e9c5318cc408aaaf...5e0399cb71a8a99393273c37e6ec4741d1b2d299

5e0399cb feat: /fix-content-issues command for content data audits
A Claude slash command that codifies the content-data-fix workflow around
the validator: sweep every content table through the Zod validator, classify
each failure as a schema fix (code) vs data fix (DB), and repair data issues
safely — validate before every write, re-validate from the DB after, compare
to canonical working rows, and defer game-balance/semantic judgment calls to
the content author instead of guessing.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>



## origin/fix/content-schema-gaps: 197c790b2ae3ca7d263054f2ad33cadda3391bea

Diff: git diff 3a25959fbc14372d63313387e9c5318cc408aaaf...197c790b2ae3ca7d263054f2ad33cadda3391bea

197c790b fix(content): item meta_data nullable numerics + single-row repair tool
Two things the audit surfaced, handled the right way (schema fix vs data fix):

SCHEMA FIX — ItemSchema meta_data numeric leaves that legitimately store
null now accept it: attack_bonus, charges.current/max, starfinder.usage,
foundry.bonus/bonus_damage/splash_damage. Interface + Zod kept in sync.
Clears the null-valued item failures; purely more-permissive, no consumer
impact (typecheck clean, item drawer renders clean).

DATA FIX TOOL — new `npm run fix:content`: fetch one row → apply the
registered repair rules for its type → re-validate against the app's Zod
schema → show the diff → (only with --apply) PATCH the changed columns,
then re-read and re-validate from the DB. A row is written ONLY if it
fully validates after the repair, so a fix can't make a row worse.

Repair rules so far: class `setValue MAX_HEALTH_CLASS_PER_LEVEL` null →
8 (PF2e median; null HP-per-level is a live bug); item numeric-meta ""
→ null.

Applied to prod with this tool (each re-validated from the DB):
- class Sanguivate (#160): HP-per-level null → 8. class table now 110/110.
- 14 items: empty-string attack_bonus/charges.max → null. item table
  8603 → 8621 valid; the 5 remaining are stale embedded base_item_content
  snapshots (deferred with the creature embedded-snapshot work).

Deferred to a dedicated PR (too deep/risky to bundle here): the creature
schema (embedded partial item+ability snapshots, shared with characters →
ripples across sheet/encounters/PDF) and the 6 malformed select-operation
rows (need operation-model judgment). Both tracked.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

54d42dd7 feat(scripts): content data audit pipeline (Zod validation + safe fixes)
Adds `npm run audit:content`: reads every row of the 13 content tables
straight from Supabase, validates each against the SAME Zod schema the
app uses at its cache boundary, reports what's invalid, and can apply a
small set of provably-safe fixes back to the DB.

Trustworthy because the find-* edge functions do a plain select() with
no enrichment, so a raw table row is exactly what the frontend
validates — auditing the table can't produce a false positive the live
app wouldn't also hit.

Auth is a single Supabase PAT (SUPABASE_PAT): the script self-serves the
project's service_role key from the Management API, then uses PostgREST
for bulk reads and surgical writes.

Three safety gears:
  (default)        read-only audit -> console summary + JSON report
  --write          also compute fixes and print exact diffs (writes nothing)
  --write --apply  PATCH the fixed rows

A fix is written ONLY when the row fully validates after it AND the
change touches only top-level scalar columns — never nested
meta_data/operations JSON, which needs the deliberate SQL patterns and
the schema-vs-data judgment that stay human. Ships two conservative
normalizers (empty-string -> null, enum re-casing); more go in
computeSafeFix(). Non-zero exit on remaining invalid rows so it can gate
CI.

First run over prod (45,704 rows) is clean except a handful of
schema-modeling gaps (creatures storing character-only combat fields as
null; a few nullable meta_data sub-fields; some operation-schema union
gaps) — all schema fixes, tracked separately, not data corruption.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
