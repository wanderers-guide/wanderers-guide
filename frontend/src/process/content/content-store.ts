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
import { preloadImage } from '@utils/images';
import { hashData } from '@utils/numbers';
import { isTruthy } from '@utils/type-fixing';
import { cloneDeep, isString, uniq, uniqBy } from 'lodash-es';

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

function getStoredNames(type: ContentType, data: Record<string, any>) {
  if (!data.name) return null;
  if (isString(data.name)) {
    const contentMap = idStore.get(type);
    if (!contentMap) return null;
    for (const content of contentMap.values()) {
      if (content?.name && content.name.toUpperCase().trim() === data.name.toUpperCase().trim()) {
        return content;
      }
    }
  }
  return null;
}

function getStoredIds(type: ContentType, data: Record<string, any>) {
  if (!data.id) return null;
  if (Array.isArray(data.id)) {
    const results = data.id.map((id) => idStore.get(type)?.get(parseInt(id))).filter(isTruthy);
    if (results.length !== data.id.length) return null;
    return results;
  } else {
    const id = parseInt(data.id);
    return idStore.get(type)?.get(id);
  }
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
const CONTENT_CACHE_VERSION = 1;
// How long a persisted cache is trusted before it's dropped and re-fetched. Content changes
// rarely; this bounds how stale a cached client can be (and resetContentStore() clears it on demand).
const CONTENT_CACHE_TTL_MS = 1000 * 60 * 60 * 9; // 9h

type PersistedContentCache = {
  version: number;
  savedAt: number;
  idStore: Map<ContentType, Map<number, any>>;
  contentStore: Map<number, any>;
};

// De-dupe concurrent identical fetches so the ~12-way package fan-out and rapid repeat
// lookups share a single in-flight request instead of each hitting the network.
const inFlightFetches = new Map<string, Promise<any>>();

async function hydrateContentCache(): Promise<void> {
  try {
    const rec = await idbGet<PersistedContentCache>(CONTENT_CACHE_KEY);
    if (!rec) return;
    if (rec.version !== CONTENT_CACHE_VERSION || Date.now() - rec.savedAt > CONTENT_CACHE_TTL_MS) {
      await idbDelete(CONTENT_CACHE_KEY);
      return;
    }
    // Fill the in-memory maps WITHOUT overwriting anything already present. Hydration can
    // resolve after a network fetch has already populated fresher data (it races a 2.5s
    // timeout, and is re-armed by resetContentStore), so it must never clobber.
    if (rec.contentStore instanceof Map) {
      for (const [k, v] of rec.contentStore) if (!contentStore.has(k)) contentStore.set(k, v);
    }
    if (rec.idStore instanceof Map) {
      for (const [type, m] of rec.idStore) {
        const target = idStore.get(type);
        if (target && m instanceof Map) {
          for (const [id, v] of m) if (!target.has(id)) target.set(id, v);
        }
      }
    }
    console.log('[CONTENT-CACHE] Hydrated content store from IndexedDB');
  } catch (e) {
    console.warn('[CONTENT-CACHE] Failed to hydrate from IndexedDB', e);
  }
}

// Race a timeout so a stuck/blocked IndexedDB can never hold up content loading — if it
// loses the race, hydration may still populate later (harmlessly, since it never clobbers).
function beginHydration(): Promise<void> {
  return Promise.race([
    hydrateContentCache(),
    new Promise<void>((resolve) => setTimeout(resolve, 2500)),
  ]);
}
// Started at module load and re-armed by resetContentStore(), so the in-memory store can
// refill from the persisted cache after an in-memory clear instead of re-fetching the corpus.
let hydrationPromise: Promise<void> = beginHydration();

let cacheDirty = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

async function persistContentCache(): Promise<void> {
  if (!cacheDirty) return;
  cacheDirty = false;
  try {
    await idbSet(CONTENT_CACHE_KEY, {
      version: CONTENT_CACHE_VERSION,
      savedAt: Date.now(),
      idStore,
      contentStore,
    } satisfies PersistedContentCache);
  } catch (e) {
    cacheDirty = true; // retry on the next schedule
    console.warn('[CONTENT-CACHE] Failed to persist to IndexedDB', e);
  }
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
 * Import content from a content package into the content store
 * @param packageData - Content package data to import
 */
export function importFromContentPackage(packageData: ContentPackage) {
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
  dontStore?: boolean
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
    return [] as T[];
  }

  // Make sure any cache persisted by a previous session/tab is loaded before we check the
  // in-memory stores, so a reload can hit the cache instead of re-fetching from the network.
  await hydrationPromise;

  const storedIds = getStoredIds(type, data);
  const storedFetch = getStoredFetch(type, data);
  const storedNames = getStoredNames(type, data);

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
  } else if (storedNames) {
    if (storedNames && Array.isArray(storedNames)) {
      return storedNames as T[];
    } else {
      return storedNames ? [storedNames as T] : [];
    }
  } else {
    // Coalesce concurrent identical fetches (keyed including dontStore so a non-storing
    // fetch can't swallow a storing one). They share a single in-flight network request.
    const fetchKey = `${hashFetch(type, data)}|${dontStore ? 1 : 0}`;
    const inFlight = inFlightFetches.get(fetchKey);
    if (inFlight) return (await inFlight) as T[];

    const fetchPromise = (async () => {
      // Make sure we're always filtering by content source
      const newData = { ...data };

      if (type !== 'content-source') {
        let sv: SourceValue | undefined = cloneDeep(newData.content_sources);
        let svN: number[] = [];

        if (!sv) {
          console.log(
            '[CONTENT-SOURCES] ⚠️ No content sources specified for fetch of type',
            type,
            'with data',
            data,
            '. Using BOTH default sources',
            getDefaultSources('INFO'),
            'and',
            getDefaultSources('PAGE')
          );
          // Use both default sources to be safe
          svN = uniq([
            ...(await fetchContentSources(getDefaultSources('INFO'))).map((source) => source.id),
            ...(await fetchContentSources(getDefaultSources('PAGE'))).map((source) => source.id),
          ]);
        } else if (Array.isArray(sv)) {
          svN = sv;
        } else {
          // Convert SourceValue as string -> number array
          svN = (await fetchContentSources(sv)).map((source) => source.id);
        }

        newData.content_sources = uniq(svN);
      }

      const rawResult = await makeRequest<T>(FETCH_REQUEST_MAP[type], newData);
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
    } finally {
      inFlightFetches.delete(fetchKey);
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
  console.warn('⚠️ Resetting Content Store ⚠️');
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

  if (clearPersisted) {
    // Underlying content changed: drop the persisted copy and don't re-hydrate stale data.
    void idbDelete(CONTENT_CACHE_KEY);
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

export async function fetchContentSources(sources: SourceValue) {
  let results: ContentSource[] = [];

  if (Array.isArray(sources)) {
    // Fetch by ids
    results = await fetchContent<ContentSource>('content-source', {
      id: sources,
    });
  } else if (sources === 'ALL-OFFICIAL-PUBLIC') {
    // This gives us everything public that is not homebrew
    results = await fetchContent<ContentSource>('content-source', {
      homebrew: false,
      published: true,
    });
  } else if (sources === 'ALL-HOMEBREW-PUBLIC') {
    // This gives us everything public, including homebrew
    const r = await fetchContent<ContentSource>('content-source', {
      homebrew: true,
      published: true,
    });
    // So we now need to filter out the official content
    results = r.filter((source) => source.user_id !== null);
    //
  } else if (sources === 'ALL-PUBLIC') {
    // This gives us everything public, including homebrew
    results = await fetchContent<ContentSource>('content-source', {
      homebrew: true,
      published: true,
    });
  } else if (sources === 'ALL-USER-ACCESSIBLE') {
    // This gives us everything public that is not homebrew
    const pr = await fetchContent<ContentSource>('content-source', {
      homebrew: false,
      published: true,
    });

    const user = await getPublicUser();
    // Now fetch all the other sources the user has subscribed to
    const ur = await fetchContent<ContentSource>('content-source', {
      id: user?.subscribed_content_sources?.map((s) => s.source_id) ?? [],
    });

    results = uniqBy([...pr, ...ur], (source) => source.id);
  } else if (sources === 'ALL-HOMEBREW-ACCESSIBLE') {
    // This gives everything with homebrew (that the user can access)
    const pr = await fetchContent<ContentSource>('content-source', {
      id: undefined,
      homebrew: true,
    });

    const user = await getPublicUser();
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

/**
 * True when a content package came back effectively empty — i.e. the core content
 * tables (ancestries/classes/items/traits) all failed to load. The global content
 * corpus is never legitimately empty for a real source set, so this reliably means
 * the fetch failed (network/edge/DNS) rather than "the user genuinely has no content."
 * Used to refuse mounting the sheet/builder — and to refuse auto-saving — against a
 * corpus that isn't there, which would otherwise wipe the character (see issue #235).
 */
export function isContentPackageEmpty(content: ContentPackage): boolean {
  return (
    content.ancestries.length === 0 &&
    content.classes.length === 0 &&
    content.items.length === 0 &&
    content.traits.length === 0
  );
}

export async function fetchContentPackage(
  sources: SourceValue,
  options?: {
    fetchSources?: boolean;
    fetchCreatures?: boolean;
  }
): Promise<ContentPackage> {
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
    versatileHeritages: ((content[10] ?? []) as VersatileHeritage[]).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    classArchetypes: ((content[11] ?? []) as ClassArchetype[]).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    sources: content[12] as ContentSource[],
    defaultSources: {
      PAGE: getDefaultSources('PAGE'),
      INFO: getDefaultSources('INFO'),
    },
  } satisfies ContentPackage;

  // Preload high-need images from package
  p.ancestries.forEach((a) => preloadImage(a.artwork_url));
  p.classes.forEach((c) => preloadImage(c.artwork_url));
  p.backgrounds.forEach((b) => preloadImage(b.artwork_url));

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
