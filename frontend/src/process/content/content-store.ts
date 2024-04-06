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
import _ from 'lodash-es';

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

function getStoredIds(type: ContentType, data: Record<string, any>) {
  if (!data.id) return null;
  if (Array.isArray(data.id)) {
    const results = data.id.map((id) => idStore.get(type)?.get(parseInt(id))).filter((result) => result);
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
  defaultSources = sources;
}

export function getDefaultSources() {
  return _.cloneDeep(defaultSources ?? []);
}

export function getCachedSources(): ContentSource[] {
  return [...(idStore.get('content-source')?.values() ?? [])].filter((source) => source) as ContentSource[];
}

export async function fetchContentById<T = Record<string, any>>(type: ContentType, id: number, sources?: number[]) {
  if (!id) return null;
  return await fetchContent<T>(type, { id, content_sources: sources });
}

export async function fetchContentAll<T = Record<string, any>>(type: ContentType, sources?: number[]) {
  const result = await fetchContent<T>(type, { content_sources: sources });
  if (result) {
    return result as T[];
  } else {
    return [];
  }
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
  if (storedFetch) {
    return storedFetch as T;
  } else if (storedIds) {
    return storedIds as T;
  } else {
    // Make sure we're always filtering by content source
    const newData = { ...data };
    if (type !== 'content-source' && !newData.content_sources) {
      // This will fetch the default content sources...
      const sources = await fetchContentSources(); // TODO: Add homebrew
      newData.content_sources = sources.map((source) => source.id);
    }

    const result = await makeRequest<T>(FETCH_REQUEST_MAP[type], newData);
    if (result && !dontStore) {
      setStoredFetch(type, data, result);
      const added = setStoredIds(type, data, result);
      if (added !== true) console.error('Failed to add to id store', added, data, result);
    }
    return result;
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
  const sources = await fetchContent<ContentSource[]>('content-source', {
    group: options?.group,
    homebrew: options?.homebrew,
    published: options?.published,
    id: options?.ids === 'all' ? undefined : options?.ids ?? defaultSources,
  });
  if (!sources) {
    return [];
  }
  return sources.sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchContentPackage(sources?: number[], fetchSources?: boolean): Promise<ContentPackage> {
  const content = await Promise.all([
    fetchContentAll<Ancestry>('ancestry', sources),
    fetchContentAll<Background>('background', sources),
    fetchContentAll<Class>('class', sources),
    fetchContentAll<AbilityBlock>('ability-block', sources),
    fetchContentAll<Item>('item', sources),
    fetchContentAll<Language>('language', sources),
    fetchContentAll<Spell>('spell', sources),
    fetchContentAll<Trait>('trait', sources),
    fetchContentAll<Creature>('creature', sources),
    fetchContentAll<Archetype>('archetype', sources),
    fetchContentAll<VersatileHeritage>('versatile-heritage', sources),
  ]);
  const contentSources = fetchSources ? await fetchContentSources({ ids: sources }) : null;

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
    sources: contentSources ?? undefined,
  } satisfies ContentPackage;
}

export async function fetchArchetypeByDedicationFeat(feat_id: number) {
  const archetypes = await fetchContent<Archetype[]>('archetype', {
    dedication_feat_id: feat_id,
  });
  return archetypes && archetypes.length > 0 ? archetypes[0] : null;
}
export async function fetchVersHeritageByHeritage(heritage_id: number) {
  const versatileHeritages = await fetchContent<VersatileHeritage[]>('versatile-heritage', {
    heritage_id: heritage_id,
  });
  return versatileHeritages && versatileHeritages.length > 0 ? versatileHeritages[0] : null;
}
export async function fetchAllPrereqs(name: string) {
  return await fetchContent<AbilityBlock[]>('ability-block', {
    prerequisites: [name],
  });
}
export async function fetchTraitByName(name?: string, sources?: number[], id?: number) {
  return await fetchContent<Trait>('trait', {
    id,
    name,
    content_sources: sources ?? defaultSources,
  });
}
export async function fetchTraits(ids?: number[]) {
  if (!ids || ids.length === 0) return [];
  return (
    (await fetchContent<Trait[]>('trait', {
      id: ids,
    })) ?? []
  );
}
export async function fetchAbilityBlockByName(name?: string, sources?: number[], id?: number) {
  return await fetchContent<AbilityBlock[]>('ability-block', {
    id,
    name,
    content_sources: sources ?? defaultSources,
  });
}
export async function fetchItemByName(name?: string, sources?: number[], id?: number) {
  return await fetchContent<Item>('item', {
    id,
    name,
    content_sources: sources ?? defaultSources,
  });
}
export async function fetchLanguageByName(name?: string, sources?: number[], id?: number) {
  return await fetchContent<Language>('language', {
    id,
    name,
    content_sources: sources ?? defaultSources,
  });
}
export async function fetchSpellByName(name?: string, sources?: number[], id?: number) {
  return await fetchContent<Spell>('spell', {
    id,
    name,
    content_sources: sources ?? defaultSources,
  });
}
