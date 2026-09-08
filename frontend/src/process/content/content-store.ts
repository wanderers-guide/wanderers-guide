import { reportClientFailure } from '@utils/client-errors';
import { supabase } from '../../supabase-client';
import { getPublicUser } from '@auth/user-manager';
import { COMMON_CORE_ID } from '@constants/data';
import { makeRequest } from '@requests/request-manager';
import { idbGet, idbSet, idbDelete } from './content-cache-db';
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

// De-dupe concurrent identical fetches so the ~12-way package fan-out and rapid repeat
// lookups share a single in-flight request instead of each hitting the network.
const inFlightFetches = new Map<string, Promise<any>>();

// A generation owns every request, hydration and persist. Reset invalidates all old work.
let cacheGeneration = 0;
let cacheActorId = 'anonymous';
let storageWrites: Promise<void> = Promise.resolve();

/** Serialize this tab's persistence and deletion so a reset cannot delete its new cache. */
function writeCache(action: () => Promise<void>): Promise<void> {
  storageWrites = storageWrites.then(action, action);
  return storageWrites;
}

/** Cache identity follows the actual session, never the cached display profile. */
async function ensureCacheActor(): Promise<void> {
  const generation = cacheGeneration;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  // An Auth event may have switched accounts while this older session read awaited.
  if (generation === cacheGeneration) setContentCacheActor(session?.user.id ?? null);
}

/** Invalidate immediately on Auth events, before any synchronous content consumer runs. */
export function setContentCacheActor(userId: string | null): void {
  const actorId = userId ?? 'anonymous';
  if (actorId !== cacheActorId) {
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
async function verifyPersistedContentVersions(rec: PersistedContentCache): Promise<'ok' | 'stale' | 'unverified'> {
  const sourceMap = rec.idStore instanceof Map ? rec.idStore.get('content-source') : undefined;
  const sources = sourceMap instanceof Map ? ([...sourceMap.values()].filter(isTruthy) as ContentSource[]) : [];
  // Nothing to compare against (or too many for one call): fall back to the TTL.
  if (sources.length === 0 || sources.length > 500) return 'unverified';

  const result = await makeRequest<{ id: number; updated_at: string }[]>(
    'get-content-versions',
    { ids: sources.map((s) => s.id) },
    false
  );
  if (!Array.isArray(result)) return 'unverified';

  const serverTokens = new Map(result.map((r) => [r.id, r.updated_at]));
  for (const source of sources) {
    // Missing on the server = the source was deleted; token mismatch = something in it
    // changed. Raw string comparison on purpose — tokens are opaque, never date-parsed.
    if (serverTokens.get(source.id) !== source.updated_at) {
      console.log('[CONTENT-CACHE] Source', source.id, 'changed on the server');
      return 'stale';
    }
  }
  return 'ok';
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
    // A slow freshness endpoint must not turn a usable local snapshot into a full download.
    // Keep this visit consistent: a late verdict cannot swap content during calculations.
    const freshness = await withinCacheBudget(
      verifyPersistedContentVersions(rec),
      CONTENT_CACHE_VERSION_TIMEOUT_MS,
      'unverified'
    );
    if (freshness === 'stale' || generation !== cacheGeneration || actorId !== cacheActorId) return;
    unverifiedCacheSavedAt = freshness === 'unverified' ? rec.savedAt : undefined;
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
  if (!cacheDirty) return;
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
    if (generation === cacheGeneration && actorId === cacheActorId) {
      await idbSet(cacheKey(actorId), record);
    }
  });
}

// Trailing debounce: coalesce bursts (e.g. the initial ~12-request package load) AND avoid
// re-serializing the whole multi-MB corpus repeatedly during steady browsing — we only write
// once activity settles. The pagehide/visibilitychange flush below covers a close mid-burst.
const CONTENT_CACHE_PERSIST_DEBOUNCE_MS = 10000;
function scheduleContentCachePersist(): void {
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

export async function fetchContentAll<T = Record<string, any>>(type: ContentType, sources?: SourceValue) {
  return await fetchContent<T>(type, { content_sources: sources });
}

export async function fetchContent<T = Record<string, any>>(
  type: ContentType,
  data: Record<string, any>,
  dontStore?: boolean,
  bypassWorkerPackage = false
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
    // Name/filter reads with the implicit INFO+PAGE scope may have more matches
    // outside the posted PAGE package. Preserve their original scoped lookup.
    if (type !== 'content-source' && data.id === undefined && data.content_sources === undefined)
      return await fetchContent<T>(type, data, true, true);
    const rows = workerContent.fetch<T>(type, data);
    const ids = data.id === undefined ? null : [...new Set((Array.isArray(data.id) ? data.id : [data.id]).map(Number))];
    if (ids && rows.length !== ids.length) return await fetchContent<T>(type, data, true, true);
    return rows;
  }
  if (bypassWorkerPackage) dontStore = true;

  await ensureCacheActor();
  const generation = cacheGeneration;
  await hydrationPromise;
  assertCurrentGeneration(generation);

  // Resolve source scope BEFORE any cache hit, including IDs and names. Capture defaults
  // now so a later view change cannot alter this request's meaning.
  data = { ...data };
  if (type !== 'content-source') {
    const scope: SourceValue | undefined = data.content_sources;
    const info = getDefaultSources('INFO');
    const page = getDefaultSources('PAGE');
    data.content_sources = Array.isArray(scope)
      ? uniq(scope).sort((a, b) => a - b)
      : uniq(
          (scope
            ? await fetchContentSources(scope, bypassWorkerPackage)
            : [
                ...(await fetchContentSources(info, bypassWorkerPackage)),
                ...(await fetchContentSources(page, bypassWorkerPackage)),
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
      const rawResult = await makeRequest<T>(FETCH_REQUEST_MAP[type], newData, false, { throwOnFailure: true });
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

export async function fetchContentSources(sources: SourceValue, bypassWorkerPackage = false) {
  const workerContent = getWorkerContentReader();
  if (workerContent && !bypassWorkerPackage) return workerContent.sources(sources);
  const fetchSources = (data: Record<string, unknown>) =>
    fetchContent<ContentSource>('content-source', data, bypassWorkerPackage, bypassWorkerPackage);
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

    const user = await getPublicUser(undefined, { throwOnFailure: true });
    // Now fetch all the other sources the user has subscribed to
    const ur = await fetchSources({
      id: user?.subscribed_content_sources?.map((s) => s.source_id) ?? [],
    });

    results = uniqBy([...pr, ...ur], (source) => source.id);
  } else if (sources === 'ALL-HOMEBREW-ACCESSIBLE') {
    // This gives everything with homebrew (that the user can access)
    const pr = await fetchSources({
      id: undefined,
      homebrew: true,
    });

    const user = await getPublicUser(undefined, { throwOnFailure: true });
    // Filter out the homebrew
    results = pr.filter(
      (c) =>
        // The user owns the homebrew OR
        (c.user_id && c.user_id === user?.user_id) ||
        // The user has subscribed to the homebrew
        user?.subscribed_content_sources?.find((src) => src.source_id === c.id)
    );
  }

  return results.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
}

export async function fetchContentPackage(
  sources: SourceValue,
  options?: {
    fetchSources?: boolean;
    fetchCreatures?: boolean;
  }
): Promise<ContentPackage> {
  await ensureCacheActor();
  const generation = cacheGeneration;
  const defaultSources = { PAGE: getDefaultSources('PAGE'), INFO: getDefaultSources('INFO') };
  const content = await Promise.all([
    fetchContentAll<Ancestry>('ancestry', sources),
    fetchContentAll<Background>('background', sources),
    fetchContentAll<Class>('class', sources),
    fetchContentAll<AbilityBlock>('ability-block', sources),
    fetchContentAll<Item>('item', sources),
    fetchContentAll<Language>('language', sources),
    fetchContentAll<Spell>('spell', sources),
    fetchContentAll<Trait>('trait', sources),
    options?.fetchCreatures ? fetchContentAll<Creature>('creature', sources) : [],
    fetchContentAll<Archetype>('archetype', sources),
    fetchContentAll<VersatileHeritage>('versatile-heritage', sources),
    fetchContentAll<ClassArchetype>('class-archetype', sources),
    options?.fetchSources ? fetchContentSources(sources) : null,
  ]);

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

export async function fetchArchetypeByDedicationFeat(feat_id: number) {
  const archetypes = await fetchContent<Archetype>('archetype', {
    dedication_feat_id: feat_id,
  });
  return archetypes.length > 0 ? archetypes[0] : null;
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
