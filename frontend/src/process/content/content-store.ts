import { makeRequest } from '@requests/request-manager';
import {
  AbilityBlock,
  Ancestry,
  Archetype,
  Background,
  Class,
  ContentPackage,
  ContentSource,
  ContentType,
  Creature,
  Item,
  Language,
  Spell,
  Trait,
  VersatileHeritage,
} from '@typing/content';
import { RequestType } from '@typing/requests';
import { hashData } from '@utils/numbers';
import { isTruthy } from '@utils/type-fixing';
import { cloneDeep, isString, uniq } from 'lodash-es';

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
//                      Fetching                     //
///////////////////////////////////////////////////////

let defaultSources: number[] | undefined = undefined; // undefined means all sources
export function defineDefaultSources(sources?: number[]) {
  defaultSources = sources ? uniq(sources) : undefined;
  return cloneDeep(defaultSources);
}

export function getDefaultSources() {
  return cloneDeep(defaultSources ?? []);
}

export function getCachedSources(): ContentSource[] {
  return [...(idStore.get('content-source')?.values() ?? [])].filter(isTruthy) as ContentSource[];
}

export async function fetchContentById<T = Record<string, any>>(type: ContentType, id: number, sources?: number[]) {
  if (!id || id === -1) return null;
  const results = await fetchContent<T>(type, { id, content_sources: sources });
  return results.length > 0 ? results[0] : null;
}

export async function fetchContentAll<T = Record<string, any>>(type: ContentType, sources?: number[]) {
  return await fetchContent<T>(type, { content_sources: sources });
}

export async function fetchContent<T = Record<string, any>>(
  type: ContentType,
  data: Record<string, any>,
  dontStore?: boolean
) {
  const FETCH_REQUEST_MAP: Record<ContentType, RequestType> = {
    'ability-block': 'find-ability-block',
    ancestry: 'find-ancestry',
    background: 'find-background',
    class: 'find-class',
    archetype: 'find-archetype',
    'versatile-heritage': 'find-versatile-heritage',
    'content-source': 'find-content-source',
    creature: 'find-creature',
    item: 'find-item',
    language: 'find-language',
    spell: 'find-spell',
    trait: 'find-trait',
  };

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
    // Make sure we're always filtering by content source
    const newData = { ...data };
    if (type !== 'content-source' && !newData.content_sources) {
      // This will fetch the default content sources...
      const sources = await fetchContentSources();
      newData.content_sources = sources.map((source) => source.id);
    }

    const result = await makeRequest<T>(FETCH_REQUEST_MAP[type], newData);
    if (result && !dontStore) {
      setStoredFetch(type, data, result);
      const added = setStoredIds(type, data, result);
      if (added !== true) console.error('Failed to add to id store', added, data, result);
    }

    if (result && Array.isArray(result)) {
      return result as T[];
    } else {
      return result ? [result] : [];
    }
  }
}

export function resetContentStore(resetSources = true) {
  console.warn('⚠️ Resetting Content Store ⚠️');
  if (resetSources) {
    defineDefaultSources([]);
  }
  contentStore.clear();
  idStore = emptyIdStore();
}

///////////////////////////////////////////////////////
//                 Utility Functions                 //
///////////////////////////////////////////////////////

export async function fetchContentSources(options?: {
  group?: string;
  homebrew?: boolean;
  published?: boolean;
  ids?: number[] | 'all';
}) {
  const sources = await fetchContent<ContentSource>('content-source', {
    group: options?.group,
    homebrew: options?.homebrew,
    published: options?.published,
    id: options?.ids === 'all' ? undefined : options?.ids ?? defaultSources,
  });
  return sources.sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchContentPackage(
  sources?: number[],
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
    options?.fetchSources ? fetchContentSources({ ids: sources }) : null,
  ]);

  return {
    ancestries: ((content[0] ?? []) as Ancestry[]).sort((a, b) => a.name.localeCompare(b.name)),
    backgrounds: ((content[1] ?? []) as Background[]).sort((a, b) => a.name.localeCompare(b.name)),
    classes: ((content[2] ?? []) as Class[]).sort((a, b) => a.name.localeCompare(b.name)),
    abilityBlocks: ((content[3] ?? []) as AbilityBlock[]).sort((a, b) => a.name.localeCompare(b.name)),
    items: ((content[4] ?? []) as Item[]).sort((a, b) => a.name.localeCompare(b.name)),
    languages: ((content[5] ?? []) as Language[]).sort((a, b) => a.name.localeCompare(b.name)),
    spells: ((content[6] ?? []) as Spell[]).sort((a, b) => a.name.localeCompare(b.name)),
    traits: ((content[7] ?? []) as Trait[]).sort((a, b) => a.name.localeCompare(b.name)),
    creatures: ((content[8] ?? []) as Creature[]).sort((a, b) => a.name.localeCompare(b.name)),
    archetypes: ((content[9] ?? []) as Archetype[]).sort((a, b) => a.name.localeCompare(b.name)),
    versatileHeritages: ((content[10] ?? []) as VersatileHeritage[]).sort((a, b) => a.name.localeCompare(b.name)),
    sources: content[11] as ContentSource[],
  } satisfies ContentPackage;
}

export async function findRequiredContentSources(sourceIds?: number[]) {
  if (!sourceIds || sourceIds.length === 0) {
    return { sourceIds: [], sources: [], newSourceIds: [], newSources: [] };
  }

  // Prefetch published content sources (homebrew still needs to be fetched individually)
  await fetchContentSources({ ids: 'all' });

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
export async function fetchTraitByName(name?: string, sources?: number[], id?: number) {
  const results = await fetchContent<Trait>('trait', {
    id,
    name,
    content_sources: sources ?? defaultSources,
  });
  return results.length > 0 ? results[0] : null;
}
export async function fetchAbilityBlockByName(name?: string, sources?: number[], id?: number) {
  const results = await fetchContent<AbilityBlock>('ability-block', {
    id,
    name,
    content_sources: sources ?? defaultSources,
  });
  return results.length > 0 ? results[0] : null;
}
export async function fetchItemByName(name?: string, sources?: number[], id?: number) {
  const results = await fetchContent<Item>('item', {
    id,
    name: name?.replace(/-/g, ' '),
    content_sources: sources ?? defaultSources,
  });
  return results.length > 0 ? results[0] : null;
}
export async function fetchLanguageByName(name?: string, sources?: number[], id?: number) {
  const results = await fetchContent<Language>('language', {
    id,
    name,
    content_sources: sources ?? defaultSources,
  });
  return results.length > 0 ? results[0] : null;
}
export async function fetchSpellByName(name?: string, sources?: number[], id?: number) {
  const results = await fetchContent<Spell>('spell', {
    id,
    name,
    content_sources: sources ?? defaultSources,
  });
  return results.length > 0 ? results[0] : null;
}
export async function fetchCreatureByName(name?: string, sources?: number[], id?: number) {
  const results = await fetchContent<Creature>('creature', {
    id,
    name,
    content_sources: sources ?? defaultSources,
  });
  return results.length > 0 ? results[0] : null;
}
