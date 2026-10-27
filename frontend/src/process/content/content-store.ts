import { reportClientFailure } from '@utils/client-errors';
import { invalidateSessionRead, readSession } from '@auth/session-reader';
import { getPublicUser } from '@auth/user-manager';
import { COMMON_CORE_ID } from '@constants/data';
import { makeRequest, type RequestOptions } from '@requests/request-manager';
import { idbGet, idbSet, idbDelete, idbDeleteIf } from './content-cache-db';
import {
  AbilityBlock,
  AbilityBlockSchema,
  Ancestry,
  AncestrySchema,
  Archetype,
  ArchetypeSchema,
  Background,
  BackgroundSchema,
  Class,
  ClassArchetype,
  ClassArchetypeSchema,
  ClassSchema,
  ContentPackage,
  ContentSource,
  ContentSourceSchema,
  ContentType,
  Creature,
  CreatureSchema,
  Item,
  ItemSchema,
  Language,
  LanguageSchema,
  SourceKey,
  SourceValue,
  Spell,
  SpellSchema,
  Trait,
  TraitSchema,
  VersatileHeritage,
  VersatileHeritageSchema,
} from '@schemas/content';
import { RequestType } from '@schemas/requests';
import { formatZodError } from '@schemas/shared';
import { z } from 'zod';
import { hashData } from '@utils/numbers';
import { isTruthy } from '@utils/type-fixing';
import { cloneDeep, isString, uniq, uniqBy } from 'lodash-es';
import { getWorkerContentReader } from '@operations/operation-content-package';

///////////////////////////////////////////////////////
//                      Storing                      //
///////////////////////////////////////////////////////

// Fetch storing //
const contentStore = new Map<number, any>();

function hashFetch(type: ContentType, data: Record<string, any>) {
  return hashData({ type, data });
}

function getStoredFetch(type: ContentType, data: Record<string, any>) {
  return contentStore.get(hashFetch(type, data));
}
function setStoredFetch(type: ContentType, data: Record<string, any>, value: any) {
  contentStore.set(hashFetch(type, data), value);
}

// Id storing //
let idStore = emptyIdStore();
function emptyIdStore() {
  let newStore = new Map<ContentType, Map<number, Record<string, any> | null>>();
  newStore.set('ancestry', new Map());
  newStore.set('background', new Map());
  newStore.set('class', new Map());
  newStore.set('ability-block', new Map());
  newStore.set('item', new Map());
  newStore.set('language', new Map());
  newStore.set('spell', new Map());
  newStore.set('trait', new Map());
  newStore.set('archetype', new Map());
  newStore.set('versatile-heritage', new Map());
  newStore.set('class-archetype', new Map());
  newStore.set('creature', new Map());
  newStore.set('content-source', new Map());
  return newStore;
}

function getStoredIds(type: ContentType, data: Record<string, any>) {
  if (!data.id) return null;
  const ids: number[] = (Array.isArray(data.id) ? data.id : [data.id]).map(Number);
  const records = ids.map((id) => idStore.get(type)?.get(id));
  if (
    records.some(
      (record) => !record || (type !== 'content-source' && !data.content_sources.includes(record.content_source_id))
    )
  )
    return null;
  return records;
}

function setStoredIds(type: ContentType, data: Record<string, any>, value: any) {
  // Handle content source dumps
  if (Array.isArray(value)) {
    for (const v of value) {
      if (!v.id) return 'Value is not an array of objects with ids';
      idStore.get(type)?.set(v.id, v);
    }
    return true;
  }

  // Handle individual ids
  if (!data.id) return true;
  if (Array.isArray(data.id)) {
    if (!Array.isArray(value)) return 'Value is not an array';
    for (const v of value) {
      if (!v.id) return 'Value is not an array of objects with ids';
      idStore.get(type)?.set(v.id, v);
    }
  } else {
    if (Array.isArray(value) || !value.id) return 'Value is not an object with an id';
    idStore.get(type)?.set(value.id, value);
  }
  return true;
}

///////////////////////////////////////////////////////
//            Persistent cache (IndexedDB)           //
///////////////////////////////////////////////////////

// The content corpus is large but effectively static, yet the in-memory stores above are
// wiped on every page reload — so each cold builder/sheet load re-fetches ~12 full content
// tables. We mirror the stores to IndexedDB so a reload/new tab/next session can hydrate
// locally instead of re-downloading everything (which is also what made refreshing during
// the evening slowdowns actively worse). Pure optimization: every op is best-effort and
// silently no-ops on failure, so content loading never depends on the cache.

const CONTENT_CACHE_KEY = 'content-store';
// Bump to invalidate every client's persisted cache (e.g. when the content shape changes).
// v2: source rows carry the updated_at change token; v1 blobs predate it and would fail
// every freshness check, so retire them once via the version gate instead.
// v3: fetchData previously paginated without an ORDER BY, so any multi-chunk fetch (items,
// ability blocks) could persist a silently partial corpus that the change-token check then
// verified as fresh forever. Retire every possibly-partial blob now that pagination is stable.
// v4: partition by authenticated actor and require complete, successful source downloads.
const CONTENT_CACHE_VERSION = 4;
// Backstop only: staleness is normally caught by the per-source change-token check against
// get-content-versions on load (see verifyPersistedContentVersions). The TTL exists for the
// cases where that check cannot run (offline, endpoint unreachable, >500 sources).
const CONTENT_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const CONTENT_CACHE_READ_TIMEOUT_MS = 2500;
const CONTENT_CACHE_VERSION_TIMEOUT_MS = 750;
const CONTENT_LOOKUP_TIMEOUT_MS = 750;
// Unverified snapshots keep their original age even when new lookups are persisted.
let unverifiedCacheSavedAt: number | undefined;

/** Optional cache work has a deadline; late results never publish into the working set. */
async function withinCacheBudget<T>(work: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

type PersistedContentCache = {
  version: number;
  actorId: string;
  savedAt: number;
  idStore: Map<ContentType, Map<number, any>>;
  contentStore: Map<number, any>;
};

type ContentFreshness =
  | { status: 'ok' | 'unverified' }
  | { status: 'stale'; sourceId: number; cachedToken: ContentSource['updated_at'] };

// De-dupe concurrent identical fetches so the ~12-way package fan-out and rapid repeat
// lookups share a single in-flight request instead of each hitting the network.
const inFlightFetches = new Map<string, Promise<any>>();

// A generation owns every request, hydration and persist. Reset invalidates all old work.
let cacheGeneration = 0;
// A late confirmed change retires persistence, not the content already used by this visit.
let retiredCacheGeneration: number | undefined;
let cacheActorId = 'anonymous';
let storageWrites: Promise<void> = Promise.resolve();

/** Serialize this tab's persistence and deletion so a reset cannot delete its new cache. */
function writeCache(action: () => Promise<void>): Promise<void> {
  storageWrites = storageWrites.then(action, action);
  return storageWrites;
}

/** Cache identity follows the actual session, never the cached display profile. */
async function ensureCacheActor(scope?: ContentReadScope): Promise<ContentReadScope> {
  if (scope) {
    assertContentReadScope(scope);
    return scope;
  }
  const generation = cacheGeneration;
  const session = await readSession();
  // An Auth event may have switched accounts while this older session read awaited.
  assertCurrentGeneration(generation);
  setContentCacheActor(session?.user.id ?? null);
  return captureContentReadScope(session?.user.id ?? null);
}

export type ContentReadScope = Readonly<{ actorId: string | null; generation: number }>;

/** Capture a route's identity without allowing old work to change the active cache actor. */
export function captureContentReadScope(actorId: string | null): ContentReadScope {
  const scope = { actorId, generation: cacheGeneration };
  assertContentReadScope(scope);
  return scope;
}

/** Check before publishing content or changing route defaults after an awaited read. */
export function assertContentReadScope(scope: ContentReadScope): void {
  assertCurrentGeneration(scope.generation);
  if ((scope.actorId ?? 'anonymous') !== cacheActorId) throw new Error('Content account changed while loading.');
}

/** Use the captured identity for every descendant read, including optional cache work. */
function contentRequestOptions(actorId: string | null): RequestOptions {
  return actorId === null ? { anonymous: true } : { expectedActorId: actorId };
}

/** Invalidate immediately on Auth events, before any synchronous content consumer runs. */
export function setContentCacheActor(userId: string | null): void {
  const actorId = userId ?? 'anonymous';
  if (actorId !== cacheActorId) {
    invalidateSessionRead();
    cacheActorId = actorId;
    resetContentStore(false);
  }
}

function cacheKey(actorId = cacheActorId): string {
  return `${CONTENT_CACHE_KEY}:${actorId}`;
}

/** Obsolete work must not publish a package or mutate the new working set. */
function assertCurrentGeneration(generation: number): void {
  if (generation !== cacheGeneration) throw new Error('Content changed while loading. Retry the request.');
}

/**
 * Compare a persisted blob's per-source change tokens against the server.
 *
 * Each cached content-source row carries `updated_at` — a token the DB bumps whenever
 * that source OR any content inside it changes (migration 20260718000000). One tiny
 * request (~5 KB) answers "did anything I cached change?" without downloading content.
 *
 * Fail-open by design: if the check cannot run or errors (offline, endpoint not yet
 * deployed, migration not yet applied), the cache is trusted and the TTL remains the
 * backstop — this is what makes every rollout order safe. A cached source with NO token
 * (pre-migration blob) compares as `undefined` vs a server string and reads as stale.
 */
async function verifyPersistedContentVersions(rec: PersistedContentCache): Promise<ContentFreshness> {
  const sourceMap = rec.idStore instanceof Map ? rec.idStore.get('content-source') : undefined;
  const sources = sourceMap instanceof Map ? ([...sourceMap.values()].filter(isTruthy) as ContentSource[]) : [];
  // Nothing to compare against (or too many for one call): fall back to the TTL.
  if (sources.length === 0 || sources.length > 500) return { status: 'unverified' };

  const result = await makeRequest<{ id: number; updated_at: string }[]>(
    'get-content-versions',
    { ids: sources.map((s) => s.id) },
    false,
    contentRequestOptions(rec.actorId === 'anonymous' ? null : rec.actorId)
  );
  if (!Array.isArray(result)) return { status: 'unverified' };

  const serverTokens = new Map(result.map((r) => [r.id, r.updated_at]));
  for (const source of sources) {
    // Missing on the server = the source was deleted; token mismatch = something in it
    // changed. Raw string comparison on purpose — tokens are opaque, never date-parsed.
    if (serverTokens.get(source.id) !== source.updated_at) {
      console.log('[CONTENT-CACHE] Source', source.id, 'changed on the server');
      return { status: 'stale', sourceId: source.id, cachedToken: source.updated_at };
    }
  }
  return { status: 'ok' };
}

/** Retire a proven stale snapshot without replacing this visit's calculation inputs. */
function retirePersistedContentCache(
  generation: number,
  actorId: string,
  freshness: Extract<ContentFreshness, { status: 'stale' }>
): void {
  if (generation !== cacheGeneration || actorId !== cacheActorId) return;
  retiredCacheGeneration = generation;
  cacheDirty = false;
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  void writeCache(async () => {
    if (generation !== cacheGeneration || actorId !== cacheActorId) return;
    // Other tabs share IndexedDB. Never delete a replacement bearing a newer token.
    await idbDeleteIf<PersistedContentCache>(cacheKey(actorId), (rec) => {
      if (!rec || generation !== cacheGeneration || actorId !== cacheActorId) return false;
      const sources = rec.idStore instanceof Map ? rec.idStore.get('content-source') : undefined;
      const source = sources instanceof Map ? sources.get(freshness.sourceId) : undefined;
      return (
        rec.version === CONTENT_CACHE_VERSION &&
        rec.actorId === actorId &&
        source?.id === freshness.sourceId &&
        source.updated_at === freshness.cachedToken
      );
    });
  }).catch(() => {
    console.warn('[CONTENT-CACHE] Could not retire stale saved content');
  });
}

async function hydrateContentCache(generation: number, actorId: string): Promise<void> {
  try {
    const rec = await withinCacheBudget(
      storageWrites.then(() => idbGet<PersistedContentCache>(cacheKey(actorId))),
      CONTENT_CACHE_READ_TIMEOUT_MS,
      null
    );
    if (
      generation !== cacheGeneration ||
      actorId !== cacheActorId ||
      !rec ||
      rec.version !== CONTENT_CACHE_VERSION ||
      rec.actorId !== actorId ||
      Date.now() - rec.savedAt > CONTENT_CACHE_TTL_MS
    )
      return;
    // Fetch results are always arrays. Ignore malformed optional cache data before
    // it can bypass network reads and enter a character's calculation package.
    if (rec.contentStore instanceof Map && [...rec.contentStore.values()].some((value) => !Array.isArray(value))) {
      console.warn('[CONTENT-CACHE] Ignoring malformed saved query results');
      return;
    }
    // A slow freshness endpoint must not turn a usable local snapshot into a full download.
    // Keep this visit consistent: a late verdict cannot swap content during calculations.
    const verification = verifyPersistedContentVersions(rec);
    const freshness = await withinCacheBudget<ContentFreshness>(verification, CONTENT_CACHE_VERSION_TIMEOUT_MS, {
      status: 'unverified',
    });
    if (freshness.status === 'stale' || generation !== cacheGeneration || actorId !== cacheActorId) return;
    unverifiedCacheSavedAt = freshness.status === 'unverified' ? rec.savedAt : undefined;
    if (rec.contentStore instanceof Map) {
      for (const [key, value] of rec.contentStore) if (!contentStore.has(key)) contentStore.set(key, value);
    }
    if (rec.idStore instanceof Map) {
      for (const [type, records] of rec.idStore) {
        const target = idStore.get(type);
        if (target && records instanceof Map) {
          for (const [id, value] of records) if (!target.has(id)) target.set(id, value);
        }
      }
    }
    if (freshness.status === 'unverified') {
      // A late verdict must not swap live content, but must not be forgotten on reload.
      void verification
        .then((verdict) => {
          if (verdict.status === 'stale') retirePersistedContentCache(generation, actorId, verdict);
        })
        .catch(() => {
          console.warn('[CONTENT-CACHE] Could not verify saved content');
        });
    }
  } catch {
    console.warn('[CONTENT-CACHE] Could not hydrate saved content');
  }
}

/** Read one account's cache and check freshness within separate storage/network budgets. */
function beginHydration(): Promise<void> {
  return hydrateContentCache(cacheGeneration, cacheActorId);
}
// Started at module load and re-armed by resetContentStore(), so the in-memory store can
// refill from the persisted cache after an in-memory clear instead of re-fetching the corpus.
// Calculation workers receive their complete package from the page. They must not
// hydrate an anonymous browser cache or start a competing freshness request.
let hydrationPromise: Promise<void> =
  typeof WorkerGlobalScope !== 'undefined' && globalThis instanceof WorkerGlobalScope
    ? Promise.resolve()
    : beginHydration();

let cacheDirty = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

async function persistContentCache(): Promise<void> {
  if (!cacheDirty || retiredCacheGeneration === cacheGeneration) return;
  cacheDirty = false;
  const generation = cacheGeneration;
  const actorId = cacheActorId;
  // Snapshot now: deferred IndexedDB work must never serialize another generation's maps.
  const record: PersistedContentCache = structuredClone({
    version: CONTENT_CACHE_VERSION,
    actorId,
    savedAt: unverifiedCacheSavedAt ?? Date.now(),
    idStore,
    contentStore,
  });
  await writeCache(async () => {
    if (generation === cacheGeneration && actorId === cacheActorId && retiredCacheGeneration !== generation) {
      await idbSet(cacheKey(actorId), record);
    }
  });
}

// Trailing debounce: coalesce bursts (e.g. the initial ~12-request package load) AND avoid
// re-serializing the whole multi-MB corpus repeatedly during steady browsing — we only write
// once activity settles. The pagehide/visibilitychange flush below covers a close mid-burst.
const CONTENT_CACHE_PERSIST_DEBOUNCE_MS = 10000;
function scheduleContentCachePersist(): void {
  if (retiredCacheGeneration === cacheGeneration) return;
  cacheDirty = true;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistContentCache();
  }, CONTENT_CACHE_PERSIST_DEBOUNCE_MS);
}

if (typeof window !== 'undefined') {
  // Best-effort flush of any pending content before the tab goes away.
  const flush = () => {
    if (cacheDirty) void persistContentCache();
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

///////////////////////////////////////////////////////
//                      Fetching                     //
///////////////////////////////////////////////////////

let DEFAULT_SOURCES: Record<SourceKey, SourceValue> = {
  PAGE: 'ALL-USER-ACCESSIBLE',
  INFO: 'ALL-USER-ACCESSIBLE',
};

export function defineDefaultSources(view: SourceKey | 'BOTH', sources: SourceValue): SourceValue {
  if (view === 'BOTH') {
    defineDefaultSources('PAGE', sources);
    return defineDefaultSources('INFO', sources);
  }

  if (Array.isArray(sources)) {
    DEFAULT_SOURCES[view] = uniq([COMMON_CORE_ID, ...sources]);
  } else {
    DEFAULT_SOURCES[view] = sources;
  }

  console.log('[CONTENT-SOURCES] Defining default content sources:', view, DEFAULT_SOURCES);
  return cloneDeep(DEFAULT_SOURCES[view]);
}

export function getDefaultSources(view: SourceKey) {
  if (Array.isArray(DEFAULT_SOURCES[view])) {
    return uniq(cloneDeep([COMMON_CORE_ID, ...DEFAULT_SOURCES[view]]));
  } else {
    return cloneDeep(DEFAULT_SOURCES[view]);
  }
}

/**
 * A stable, serializable fingerprint of the current default sources for a view, for use in
 * react-query queryKeys.
 *
 * The default sources are module-level mutable state (see defineDefaultSources), so any
 * queryFn that fetches content scoped by getDefaultSources(view) MUST include this value in
 * its queryKey. A key without it pins the first-fetched corpus for the cache lifetime: after
 * some page narrows the scope (e.g. ContentFeedbackModal scoping INFO to a single book),
 * every other consumer of that key silently gets the narrowed corpus — pickers showing the
 * wrong set of books depending on page-visit order.
 *
 * Array scopes are sorted before serializing so the same set of source ids produces the same
 * fingerprint regardless of the order the sources were enabled in.
 */
export function getDefaultSourcesKey(view: SourceKey): string {
  const sources = getDefaultSources(view);
  return Array.isArray(sources) ? [...sources].sort((a, b) => a - b).join(',') : sources;
}

/**
 * Import content from a content package into the content store
 * @param packageData - Content package data to import
 */
export function importFromContentPackage(packageData: ContentPackage) {
  // A worker reads its posted snapshot directly; never accumulate it in a shared cache.
  if (getWorkerContentReader()) return;
  // Import all content
  packageData.abilityBlocks.forEach((c) => idStore.get('ability-block')?.set(c.id, c));
  packageData.ancestries.forEach((c) => idStore.get('ancestry')?.set(c.id, c));
  packageData.archetypes.forEach((c) => idStore.get('archetype')?.set(c.id, c));
  packageData.backgrounds.forEach((c) => idStore.get('background')?.set(c.id, c));
  packageData.classArchetypes.forEach((c) => idStore.get('class-archetype')?.set(c.id, c));
  packageData.classes.forEach((c) => idStore.get('class')?.set(c.id, c));
  packageData.creatures.forEach((c) => idStore.get('creature')?.set(c.id, c));
  packageData.items.forEach((c) => idStore.get('item')?.set(c.id, c));
  packageData.languages.forEach((c) => idStore.get('language')?.set(c.id, c));
  packageData.spells.forEach((c) => idStore.get('spell')?.set(c.id, c));
  packageData.traits.forEach((c) => idStore.get('trait')?.set(c.id, c));
  packageData.versatileHeritages.forEach((c) => idStore.get('versatile-heritage')?.set(c.id, c));
  packageData.sources?.forEach((c) => idStore.get('content-source')?.set(c.id, c));
}

/**
 * Get all cached content of a specific type
 * @param type - Content type to get
 * @returns - Array of cached content
 */
export function getCachedContent<T = Record<string, any>>(type: ContentType): T[] {
  const workerContent = getWorkerContentReader();
  if (workerContent) return workerContent.cached<T>(type);
  return [...(idStore.get(type)?.values() ?? [])].filter(isTruthy) as T[];
}

/**
 * Get content by ids from cache, and fetch missing ones in the background
 * @param type - Content type
 * @param ids - Array of ids to get
 * @returns - Array of content found in cache
 */
export function getContentFast<T extends Record<string, any> & { id: number }>(type: ContentType, ids: number[]): T[] {
  const cached = getCachedContent<T>(type);
  const cachedById = new Map(cached.map((c) => [c.id, c]));

  const missingIds = ids.filter((id) => !cachedById.has(id));

  if (missingIds.length > 0) {
    // Fetch every missing id in the background for the future
    void Promise.allSettled(missingIds.map((id) => fetchContentById<T>(type, id)));
  }

  // Return what we have now
  return ids.map((id) => cachedById.get(id)).filter((c): c is T => Boolean(c));
}

export async function fetchContentById<T = Record<string, any>>(type: ContentType, id: number) {
  if (!id || id === -1) return null;
  const results = await fetchContent<T>(type, { id });
  return results.length > 0 ? results[0] : null;
}

export async function fetchContentAll<T = Record<string, any>>(
  type: ContentType,
  sources?: SourceValue,
  scope?: ContentReadScope
) {
  return await fetchContent<T>(type, { content_sources: sources }, false, false, scope);
}

export async function fetchContent<T = Record<string, any>>(
  type: ContentType,
  data: Record<string, any>,
  dontStore?: boolean,
  bypassWorkerPackage = false,
  readScope?: ContentReadScope
) {
  const CONTENT_SCHEMA_MAP: Record<ContentType, z.ZodTypeAny> = {
    'ability-block': AbilityBlockSchema,
    ancestry: AncestrySchema,
    background: BackgroundSchema,
    class: ClassSchema,
    archetype: ArchetypeSchema,
    'versatile-heritage': VersatileHeritageSchema,
    'class-archetype': ClassArchetypeSchema,
    'content-source': ContentSourceSchema,
    creature: CreatureSchema,
    item: ItemSchema,
    language: LanguageSchema,
    spell: SpellSchema,
    trait: TraitSchema,
  };

  const FETCH_REQUEST_MAP: Record<ContentType, RequestType> = {
    'ability-block': 'find-ability-block',
    ancestry: 'find-ancestry',
    background: 'find-background',
    class: 'find-class',
    archetype: 'find-archetype',
    'versatile-heritage': 'find-versatile-heritage',
    'class-archetype': 'find-class-archetype',
    'content-source': 'find-content-source',
    creature: 'find-creature',
    item: 'find-item',
    language: 'find-language',
    spell: 'find-spell',
    trait: 'find-trait',
  };

  // Runtime guard: TypeScript can't stop a caller passing a drawer type or an
  // ability-block subtype ('feat', 'action', ...) that isn't a real ContentType.
  // The map lookup below then yields undefined and the request literally went to
  // `/functions/v1/undefined` in prod. Fail loudly and locally instead — the fix
  // at the call site is convertToContentType().
  if (!FETCH_REQUEST_MAP[type]) {
    console.error(`[CONTENT-STORE] fetchContent called with unknown content type '${type}'`, data);
    throw new Error(`Unknown content type: ${type}`);
  }

  const workerContent = getWorkerContentReader();
  if (workerContent && !bypassWorkerPackage) {
    if (type === 'trait' && data.content_sources === undefined) {
      const traits = workerContent.lookupTrait(data);
      if (traits !== undefined) return traits as T[];
    }
    // Name/filter reads with the implicit INFO+PAGE scope may have more matches
    // outside the posted PAGE package. Preserve their original scoped lookup.
    if (type !== 'content-source' && data.id === undefined && data.content_sources === undefined)
      return await fetchContent<T>(type, data, true, true, readScope);
    const rows = workerContent.fetch<T>(type, data);
    const ids = data.id === undefined ? null : [...new Set((Array.isArray(data.id) ? data.id : [data.id]).map(Number))];
    if (ids && rows.length !== ids.length) return await fetchContent<T>(type, data, true, true, readScope);
    return rows;
  }
  if (bypassWorkerPackage) dontStore = true;

  const requestScope = await ensureCacheActor(readScope);
  const generation = requestScope.generation;
  const requestOptions = contentRequestOptions(requestScope.actorId);
  await hydrationPromise;
  assertCurrentGeneration(generation);

  // Resolve source scope BEFORE any cache hit, including IDs and names. Capture defaults
  // now so a later view change cannot alter this request's meaning.
  data = cloneDeep({ ...data });
  if (type !== 'content-source') {
    const scope: SourceValue | undefined = data.content_sources;
    const info = getDefaultSources('INFO');
    const page = getDefaultSources('PAGE');
    data.content_sources = Array.isArray(scope)
      ? uniq(scope).sort((a, b) => a - b)
      : uniq(
          (scope
            ? await fetchContentSources(scope, bypassWorkerPackage, requestScope)
            : [
                ...(await fetchContentSources(info, bypassWorkerPackage, requestScope)),
                ...(await fetchContentSources(page, bypassWorkerPackage, requestScope)),
              ]
          ).map((source) => source.id)
        ).sort((a, b) => a - b);
    assertCurrentGeneration(generation);
  }

  const onlyIdentity = Object.keys(data).every((key) => ['id', 'content_sources'].includes(key));
  const storedIds = onlyIdentity && !bypassWorkerPackage ? getStoredIds(type, data) : null;
  const storedFetch = bypassWorkerPackage ? null : getStoredFetch(type, data);
  // Name filters are substring searches on the API, so an exact cached name is not a complete result.

  if (storedFetch) {
    if (storedFetch && Array.isArray(storedFetch)) {
      return storedFetch as T[];
    } else {
      return storedFetch ? [storedFetch as T] : [];
    }
  } else if (storedIds) {
    if (storedIds && Array.isArray(storedIds)) {
      return storedIds as T[];
    } else {
      return storedIds ? [storedIds as T] : [];
    }
  } else {
    // Coalesce concurrent identical fetches (keyed including dontStore so a non-storing
    // fetch can't swallow a storing one). They share a single in-flight network request.
    const fetchKey = `${hashFetch(type, data)}|${dontStore ? 1 : 0}|${bypassWorkerPackage ? 1 : 0}`;
    const inFlight = inFlightFetches.get(fetchKey);
    if (inFlight) return (await inFlight) as T[];

    const fetchPromise = (async () => {
      const newData = data;
      let rawResult: T | T[] | null;
      if (type === 'ability-block' && (data.id === undefined || Array.isArray(data.id))) {
        // A complete catalog can exceed the Edge worker's memory budget. Keep each
        // response bounded and stage every page before publishing this logical fetch.
        const pageSize = 1000;
        const records: T[] = [];
        let afterId: number | undefined;
        while (true) {
          const page = await makeRequest<T[]>(
            FETCH_REQUEST_MAP[type],
            { ...newData, page_size: pageSize, after_id: afterId },
            false,
            { ...requestOptions, throwOnFailure: true }
          );
          assertCurrentGeneration(generation);
          if (!Array.isArray(page) || page.length > pageSize) {
            throw new Error('Could not load ability-block content. Retry the request.');
          }
          for (const record of page) {
            if (
              !record ||
              typeof record !== 'object' ||
              !('id' in record) ||
              typeof record.id !== 'number' ||
              !Number.isSafeInteger(record.id) ||
              (afterId !== undefined && record.id <= afterId)
            ) {
              throw new Error('Ability-block pagination did not advance. Retry the request.');
            }
            afterId = record.id;
            records.push(record);
          }
          if (page.length < pageSize) break;
        }
        rawResult = records;
      } else {
        rawResult = await makeRequest<T>(FETCH_REQUEST_MAP[type], newData, false, {
          ...requestOptions,
          throwOnFailure: true,
        });
      }
      assertCurrentGeneration(generation);
      if ((rawResult === null || rawResult === undefined) && (data.id === undefined || Array.isArray(data.id))) {
        throw new Error(`Could not load ${type} content. Retry the request.`);
      }
      const schema = CONTENT_SCHEMA_MAP[type];
      const result = rawResult
        ? (Array.isArray(rawResult) ? rawResult : [rawResult]).map((record) => validateAndWarn<T>(type, schema, record))
        : rawResult;
      if (result && !dontStore) {
        setStoredFetch(type, data, result);
        const added = setStoredIds(type, data, result);
        if (added !== true) console.error('Failed to add to id store', added, data, result);
        // Mirror the freshly-stored content to IndexedDB for the next reload.
        scheduleContentCachePersist();
      }

      if (result && Array.isArray(result)) {
        return result as T[];
      } else {
        return result ? [result] : [];
      }
    })();

    inFlightFetches.set(fetchKey, fetchPromise);
    try {
      return await fetchPromise;
    } catch (error: unknown) {
      if (generation === cacheGeneration) reportClientFailure('content_load_failed');
      throw error;
    } finally {
      if (inFlightFetches.get(fetchKey) === fetchPromise) inFlightFetches.delete(fetchKey);
    }
  }
}

/**
 * Clear the in-memory content working set.
 *
 * By default the PERSISTED (IndexedDB) cache is kept, and the in-memory store is re-hydrated
 * from it on the next fetch — so a routine reset (App mount, navigation, source/account
 * changes) does NOT force the whole corpus to be re-downloaded. This is what makes the cache
 * survive reloads despite App.tsx calling this on mount.
 *
 * Pass clearPersisted=true only when the underlying content actually changed on the server
 * (e.g. homebrew was created/edited) so the stale persisted copy is dropped and a fresh
 * network fetch happens instead of re-hydrating stale data.
 */
export function resetContentStore(resetSources = true, clearPersisted = false) {
  cacheGeneration += 1;
  retiredCacheGeneration = undefined;
  if (resetSources) {
    defineDefaultSources('BOTH', 'ALL-USER-ACCESSIBLE');
  }
  contentStore.clear();
  idStore = emptyIdStore();
  inFlightFetches.clear();

  // Cancel any pending debounced persist: it was scheduled to save the PRE-reset content,
  // but the stores are now empty. If it fired after this reset it would overwrite the valid
  // persisted cache with empty maps (defeating the re-hydration below).
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  cacheDirty = false;
  unverifiedCacheSavedAt = undefined;

  if (clearPersisted) {
    // The generation already invalidated old readers. Keep deletion ordered with
    // persistence, but optional storage must not hold up fresh network content.
    const key = cacheKey();
    void writeCache(() => idbDelete(key)).catch(() => {
      console.warn('[CONTENT-CACHE] Could not discard saved content');
    });
    hydrationPromise = Promise.resolve();
  } else {
    // Re-arm hydration so the next fetch refills the in-memory store from the persisted
    // cache instead of re-downloading the whole corpus.
    hydrationPromise = beginHydration();
  }
}

///////////////////////////////////////////////////////
//                 Utility Functions                 //
///////////////////////////////////////////////////////

export async function fetchContentSources(
  sources: SourceValue,
  bypassWorkerPackage = false,
  readScope?: ContentReadScope
) {
  const workerContent = getWorkerContentReader();
  if (workerContent && !bypassWorkerPackage) return workerContent.sources(sources);
  const scope = await ensureCacheActor(readScope);
  const generation = scope.generation;
  assertContentReadScope(scope);
  const resolveSources = async (): Promise<ContentSource[]> => {
    const fetchSources = (data: Record<string, unknown>) =>
      fetchContent<ContentSource>('content-source', data, bypassWorkerPackage, bypassWorkerPackage, scope);
    let results: ContentSource[] = [];

    if (Array.isArray(sources)) {
      // Fetch by ids
      results = await fetchSources({
        id: sources,
      });
    } else if (sources === 'ALL-OFFICIAL-PUBLIC') {
      // This gives us everything public that is not homebrew
      results = await fetchSources({
        homebrew: false,
        published: true,
      });
    } else if (sources === 'ALL-HOMEBREW-PUBLIC') {
      // This gives us everything public, including homebrew
      const r = await fetchSources({
        homebrew: true,
        published: true,
      });
      // So we now need to filter out the official content
      results = r.filter((source) => source.user_id !== null);
      //
    } else if (sources === 'ALL-PUBLIC') {
      // This gives us everything public, including homebrew
      results = await fetchSources({
        homebrew: true,
        published: true,
      });
    } else if (sources === 'ALL-USER-ACCESSIBLE') {
      // This gives us everything public that is not homebrew
      const pr = await fetchSources({
        homebrew: false,
        published: true,
      });

      assertCurrentGeneration(generation);
      const user =
        scope.actorId === null
          ? null
          : await getPublicUser(undefined, { throwOnFailure: true, sharedReadScope: generation });
      assertCurrentGeneration(generation);
      // Now fetch all the other sources the user has subscribed to
      const subscriptions = user?.subscribed_content_sources?.map((subscription) => subscription.source_id) ?? [];
      // An empty ID filter means “all” to the API, not “no subscriptions”.
      const ur = subscriptions.length > 0 ? await fetchSources({ id: subscriptions }) : [];

      results = uniqBy([...pr, ...ur], (source) => source.id);
    } else if (sources === 'ALL-HOMEBREW-ACCESSIBLE') {
      // This gives everything with homebrew (that the user can access)
      const pr = await fetchSources({
        id: undefined,
        homebrew: true,
      });

      assertCurrentGeneration(generation);
      const user =
        scope.actorId === null
          ? null
          : await getPublicUser(undefined, { throwOnFailure: true, sharedReadScope: generation });
      assertCurrentGeneration(generation);
      // Filter out the homebrew
      results = pr.filter(
        (c) =>
          // The user owns the homebrew OR
          (c.user_id && c.user_id === user?.user_id) ||
          // The user has subscribed to the homebrew
          user?.subscribed_content_sources?.find((src) => src.source_id === c.id)
      );
    }

    assertCurrentGeneration(generation);
    return results.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  };
  const results =
    workerContent && bypassWorkerPackage
      ? cloneDeep(await workerContent.fallbackSources(sources, generation, resolveSources))
      : await resolveSources();
  assertCurrentGeneration(generation);
  return results;
}

export async function fetchContentPackage(
  sources: SourceValue,
  options?: {
    fetchSources?: boolean;
    fetchCreatures?: boolean;
    readScope?: ContentReadScope;
  }
): Promise<ContentPackage> {
  const scope = await ensureCacheActor(options?.readScope);
  const generation = scope.generation;
  assertContentReadScope(scope);
  const defaultSources = { PAGE: getDefaultSources('PAGE'), INFO: getDefaultSources('INFO') };
  // Legacy operation filters resolve trait names across INFO+PAGE. Capture that
  // full catalog without expanding PAGE candidates or blocking unrelated sheets.
  const lookupTraitsPromise: Promise<Trait[] | undefined> = (async () => {
    const lookupSources = await Promise.all([
      fetchContentSources(defaultSources.INFO, false, scope),
      fetchContentSources(defaultSources.PAGE, false, scope),
    ]);
    assertCurrentGeneration(generation);
    return await fetchContent<Trait>(
      'trait',
      {
        content_sources: uniq(lookupSources.flat().map((source) => source.id)),
      },
      false,
      false,
      scope
    );
  })().catch(() => undefined);
  const content = await Promise.all([
    fetchContentAll<Ancestry>('ancestry', sources, scope),
    fetchContentAll<Background>('background', sources, scope),
    fetchContentAll<Class>('class', sources, scope),
    fetchContentAll<AbilityBlock>('ability-block', sources, scope),
    fetchContentAll<Item>('item', sources, scope),
    fetchContentAll<Language>('language', sources, scope),
    fetchContentAll<Spell>('spell', sources, scope),
    fetchContentAll<Trait>('trait', sources, scope),
    options?.fetchCreatures ? fetchContentAll<Creature>('creature', sources, scope) : [],
    fetchContentAll<Archetype>('archetype', sources, scope),
    fetchContentAll<VersatileHeritage>('versatile-heritage', sources, scope),
    fetchContentAll<ClassArchetype>('class-archetype', sources, scope),
    options?.fetchSources ? fetchContentSources(sources, false, scope) : null,
  ]);

  const lookupTraits = await withinCacheBudget(lookupTraitsPromise, CONTENT_LOOKUP_TIMEOUT_MS, undefined);
  assertCurrentGeneration(generation);
  const p = {
    ancestries: ((content[0] ?? []) as Ancestry[]).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    backgrounds: ((content[1] ?? []) as Background[]).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    classes: ((content[2] ?? []) as Class[]).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    abilityBlocks: ((content[3] ?? []) as AbilityBlock[]).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    items: ((content[4] ?? []) as Item[]).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    languages: ((content[5] ?? []) as Language[]).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    spells: ((content[6] ?? []) as Spell[]).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    traits: ((content[7] ?? []) as Trait[]).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    creatures: ((content[8] ?? []) as Creature[]).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    archetypes: ((content[9] ?? []) as Archetype[]).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    versatileHeritages: ((content[10] ?? []) as VersatileHeritage[]).sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? '')
    ),
    classArchetypes: ((content[11] ?? []) as ClassArchetype[]).sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? '')
    ),
    sources: content[12] as ContentSource[],
    lookupTraits,
    defaultSources,
  } satisfies ContentPackage;

  // Artwork loads when displayed so unused catalog images do not compete with sheet data.

  return p;
}

export async function findRequiredContentSources(sourceIds?: number[]) {
  if (!sourceIds || sourceIds.length === 0) {
    return { sourceIds: [], sources: [], newSourceIds: [], newSources: [] };
  }

  // Prefetch published content sources (homebrew still needs to be fetched individually)
  await fetchContentSources('ALL-OFFICIAL-PUBLIC');

  const required = new Map<number, ContentSource>();
  const findRequired = async (sourceId: number) => {
    const contentSource = await fetchContentById<ContentSource>('content-source', sourceId);
    if (contentSource) {
      required.set(sourceId, contentSource);

      // Add required sources
      if (contentSource.required_content_sources) {
        for (const requiredSourceId of contentSource.required_content_sources) {
          if (!required.has(requiredSourceId)) {
            await findRequired(requiredSourceId);
          }
        }
      }
    }
  };

  for (const sourceId of sourceIds) {
    await findRequired(sourceId);
  }

  return {
    sourceIds: [...required.keys()],
    sources: [...required.values()],
    newSourceIds: [...required.keys()].filter((sourceId) => !sourceIds.includes(sourceId)),
    newSources: [...required.values()].filter((source) => !sourceIds.includes(source.id)),
  };
}

/** Resolve a dedication within its own printing before considering cross-book archetypes. */
export async function fetchArchetypeByDedicationFeat(
  feat_id: number,
  feat?: { content_source_id?: number; traits?: number[] | null }
): Promise<Archetype | null> {
  const archetypes = await fetchContent<Archetype>('archetype', {
    dedication_feat_id: feat_id,
  });
  return (
    archetypes.find((archetype) => archetype.content_source_id === feat?.content_source_id) ??
    archetypes.find((archetype) => feat?.traits?.includes(archetype.trait_id)) ??
    archetypes[0] ??
    null
  );
}
export async function fetchVersHeritageByHeritage(heritage_id: number) {
  const versatileHeritages = await fetchContent<VersatileHeritage>('versatile-heritage', {
    heritage_id: heritage_id,
  });
  return versatileHeritages.length > 0 ? versatileHeritages[0] : null;
}
export async function fetchAllPrereqs(name: string) {
  return await fetchContent<AbilityBlock>('ability-block', {
    prerequisites: [name],
  });
}
export async function fetchTraits(ids?: number[]) {
  if (!ids || ids.length === 0) return [];
  return await fetchContent<Trait>('trait', {
    id: ids,
  });
}
export async function fetchTraitByName(name?: string, sources?: SourceValue, id?: number) {
  const results = await fetchContent<Trait>('trait', {
    id,
    name,
    content_sources: sources,
  });
  return results.length > 0 ? results[0] : null;
}
export async function fetchAbilityBlockByName(name?: string, sources?: SourceValue, id?: number) {
  const results = await fetchContent<AbilityBlock>('ability-block', {
    id,
    name,
    content_sources: sources,
  });
  return results.length > 0 ? results[0] : null;
}
export async function fetchItemByName(name?: string, sources?: SourceValue, id?: number) {
  const results = await fetchContent<Item>('item', {
    id,
    name: name?.replace(/-/g, ' '),
    content_sources: sources,
  });
  return results.length > 0 ? results[0] : null;
}
export async function fetchLanguageByName(name?: string, sources?: SourceValue, id?: number) {
  const results = await fetchContent<Language>('language', {
    id,
    name,
    content_sources: sources,
  });
  return results.length > 0 ? results[0] : null;
}
export async function fetchSpellByName(name?: string, sources?: SourceValue, id?: number) {
  const results = await fetchContent<Spell>('spell', {
    id,
    name,
    content_sources: sources,
  });
  return results.length > 0 ? results[0] : null;
}
export async function fetchCreatureByName(name?: string, sources?: SourceValue, id?: number) {
  const results = await fetchContent<Creature>('creature', {
    id,
    name,
    content_sources: sources,
  });
  return results.length > 0 ? results[0] : null;
}

/**
 * Validate content against schema and log any warnings, then return the content (either parsed or original if parsing failed)
 * @param type - Content type for logging purposes
 * @param schema - Zod schema to validate against
 * @param item - Content item to validate
 * @returns - Validated content record, or original record if validation failed
 */
function validateAndWarn<T>(type: ContentType, schema: z.ZodTypeAny, record: unknown): T {
  const parsed = schema.safeParse(record);
  if (!parsed.success) {
    const summary = formatZodError(record, parsed.error);
    console.warn(
      `[CONTENT-SCHEMA] ${type} id=${(record as any)?.id ?? '?'} "${(record as any)?.name ?? ''}" — ${summary}`
    );
  }
  // On schema failure we keep the record (so we never silently hide content), but we
  // guarantee a string `name` so downstream sorts and content-link resolution can never
  // deref null — this retires the whole class of null-name .localeCompare / .toLowerCase
  // crashes at the cache boundary instead of guarding each render site.
  return parsed.success ? (parsed.data as T) : ({ ...(record as any), name: (record as any)?.name ?? '' } as T);
}
