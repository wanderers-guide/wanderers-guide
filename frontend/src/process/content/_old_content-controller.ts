// import { makeRequest } from '@requests/request-manager';
// import {
//   AbilityBlock,
//   AbilityBlockType,
//   Ancestry,
//   Background,
//   Class,
//   ContentPackage,
//   ContentSource,
//   ContentType,
//   Creature,
//   Item,
//   Language,
//   Spell,
//   Trait,
// } from '@typing/content';
// import { throwError } from '@utils/notifications';
// import * as _ from 'lodash-es';

// export const PLAYER_CORE_SOURCE_ID = 1;

/*
    CHARACTER BUILDER
    - Character
    - All Ancestries
    - All Backgrounds
    - All Classes

    * Load ancestry,
      - Fetch the required from the component
    * Load background,
      - Fetch the required from the component
    * Load class,
      - Fetch the required from the component


    CHARACTER SHEET
    Pre Need:
    - Character
    - Check operation_data for all selections, fetch those in "Init Need"

    Init Need:
    - Enabled books
    - Entities in operation_data selections
    - Class
    - Ancestry
    - Background
    - All Conditions
    - Inv Items
    - Tradition's Spells (if caster) from enabled books that they could cast
    - Traits
        - Ancestry_id
        - Ancestrt Traits Other 
        - Class_id
    - AbilityBlocks:
        - Class Feats from class from enabled books that are the character's level or lower
        - Class Features from class from enabled books that are the character's level or lower
        - Physical Features listed in ancestry
        - Senses listed in ancestry
        - Ancestry feats from ancestry from enabled books that are the character's level or lower

    Post Need:
    - Search operations (all options for conditionals, ignore selects) for giveAbilityBlock, giveLang, giveSpell, giveTrait
        - Look at results and repeat on those until no more results or 10 iterations

  */

// // Store of all enabled content sources //
// let contentSources: number[] = [];

// export function defineEnabledContentSources(sourceIds: number[]) {
//   contentSources = _.uniq(sourceIds);
// }

// // Store of all table content //

// let contentStore = emptyContentStore();

// function emptyContentStore() {
//   let newStore = new Map<ContentType, Map<number, Record<string, any> | null>>();
//   newStore.set('ancestry', new Map());
//   newStore.set('background', new Map());
//   newStore.set('class', new Map());
//   newStore.set('ability-block', new Map());
//   newStore.set('item', new Map());
//   newStore.set('language', new Map());
//   newStore.set('spell', new Map());
//   newStore.set('trait', new Map());
//   newStore.set('content-source', new Map());
//   return newStore;
// }

// /* Get content from memory. If failed to find, fetch it */
// export async function getContent<T = Record<string, any>>(type: ContentType, id: number) {
//   if (contentSources.length === 0) throwError('No enabled content sources defined');
//   if (!id) return null;
//   const c = contentStore.get(type)!.get(id);
//   if (c !== undefined) {
//     return c ? (c as T) : null;
//   }

//   if (type === 'ancestry') {
//     const ancestry = await findAncestry(id);
//     if (!ancestry) {
//       clearContent(type, id);
//       return null;
//     } else {
//       setContent(type, ancestry);
//       return ancestry as T;
//     }
//   }
//   if (type === 'background') {
//     const background = await findBackground(id);
//     if (!background) {
//       clearContent(type, id);
//       return null;
//     } else {
//       setContent(type, background);
//       return background as T;
//     }
//   }
//   if (type === 'class') {
//     const class_ = await findClass(id);
//     if (!class_) {
//       clearContent(type, id);
//       return null;
//     } else {
//       setContent(type, class_);
//       return class_ as T;
//     }
//   }
//   if (type === 'ability-block') {
//     const abilityBlock = await findAbilityBlock(id);
//     if (!abilityBlock) {
//       clearContent(type, id);
//       return null;
//     } else {
//       setContent(type, abilityBlock);
//       return abilityBlock as T;
//     }
//   }
//   if (type === 'item') {
//     const item = await findItem(id);
//     if (!item) {
//       clearContent(type, id);
//       return null;
//     } else {
//       setContent(type, item);
//       return item as T;
//     }
//   }
//   if (type === 'language') {
//     const language = await findLanguage(id);
//     if (!language) {
//       clearContent(type, id);
//       return null;
//     } else {
//       setContent(type, language);
//       return language as T;
//     }
//   }
//   if (type === 'spell') {
//     const spell = await findSpell(id);
//     if (!spell) {
//       clearContent(type, id);
//       return null;
//     } else {
//       setContent(type, spell);
//       return spell as T;
//     }
//   }
//   if (type === 'trait') {
//     const trait = await findTrait(id);
//     if (!trait) {
//       clearContent(type, id);
//       return null;
//     } else {
//       setContent(type, trait);
//       return trait as T;
//     }
//   }
//   if (type === 'creature') {
//     const creature = await findCreature(id);
//     if (!creature) {
//       clearContent(type, id);
//       return null;
//     } else {
//       setContent(type, creature);
//       return creature as T;
//     }
//   }
//   if (type === 'content-source') {
//     const contentSource = await findContentSource(id);
//     if (!contentSource) {
//       clearContent(type, id);
//       return null;
//     } else {
//       setContent(type, contentSource);
//       return contentSource as T;
//     }
//   }
//   return null;
// }

// export async function getEnabledContentSources() {
//   if (contentSources.length === 0) throwError('No enabled content sources defined');
//   const store = await getContentStore<ContentSource>('content-source');
//   return [...store.values()];
// }
// export function getEnabledContentSourceIds() {
//   return _.cloneDeep(contentSources);
// }

// export function setContent(type: ContentType, content: Record<string, any>) {
//   const overriding = contentStore.get(type)!.has(content.id);
//   contentStore.get(type)!.set(content.id, content);
//   return overriding;
// }
// export function clearContent(type: ContentType, id: number) {
//   const overriding = contentStore.get(type)!.has(id);
//   contentStore.get(type)!.delete(id);
//   return overriding;
// }

// export async function getContentStore<T = Record<string, any>>(
//   type: ContentType,
//   options?: {
//     fetch?: boolean;
//     sourceId?: number;
//     abilityBlockType?: AbilityBlockType;
//   }
// ) {
//   return await getContentStoreSingleSourceId<T>(type, options?.sourceId, options);
// }

// /**
//  * Get all the content of a given type for a single source id
//  * - WARN: There's a limit of 10000 items of a given type per source
//  * @param type
//  * @param options
//  * @returns
//  */
// async function getContentStoreSingleSourceId<T = Record<string, any>>(
//   type: ContentType,
//   sourceId?: number,
//   options?: {
//     fetch?: boolean;
//     abilityBlockType?: AbilityBlockType;
//   }
// ) {
//   // Set content sources to just the one we want
//   const tempContentSources = _.cloneDeep(contentSources);
//   if (sourceId) {
//     contentSources = [sourceId];
//   }

//   if (options?.fetch || options?.fetch === undefined) {
//     if (type === 'ancestry') {
//       const ancestries = await findAllAncestries();
//       if (ancestries) {
//         for (const ancestry of ancestries) {
//           setContent(type, ancestry);
//         }
//       }
//     }
//     if (type === 'background') {
//       const backgrounds = await findAllBackgrounds();
//       if (backgrounds) {
//         for (const background of backgrounds) {
//           setContent(type, background);
//         }
//       }
//     }
//     if (type === 'class') {
//       const classes = await findAllClasses();
//       if (classes) {
//         for (const class_ of classes) {
//           setContent(type, class_);
//         }
//       }
//     }
//     if (type === 'ability-block') {
//       const abilityBlocks = await findAllAbilityBlocks(options?.abilityBlockType);
//       if (abilityBlocks) {
//         for (const abilityBlock of abilityBlocks) {
//           setContent(type, abilityBlock);
//         }
//       }
//     }
//     if (type === 'item') {
//       const items = await findAllItems();
//       if (items) {
//         for (const item of items) {
//           setContent(type, item);
//         }
//       }
//     }
//     if (type === 'language') {
//       const languages = await findAllLanguages();
//       if (languages) {
//         for (const language of languages) {
//           setContent(type, language);
//         }
//       }
//     }
//     if (type === 'spell') {
//       const spells = await findAllSpells();
//       if (spells) {
//         for (const spell of spells) {
//           setContent(type, spell);
//         }
//       }
//     }
//     if (type === 'trait') {
//       const traits = await findAllTraits();
//       if (traits) {
//         for (const trait of traits) {
//           setContent(type, trait);
//         }
//       }
//     }
//     if (type === 'creature') {
//       const creatures = await findAllCreatures();
//       if (creatures) {
//         for (const creature of creatures) {
//           setContent(type, creature);
//         }
//       }
//     }
//     if (type === 'content-source') {
//       const _contentSources = await findAllContentSources({
//         homebrew: false,
//       });
//       for (const _contentSource of _contentSources) {
//         setContent(type, _contentSource);
//       }
//     }
//   }

//   // Reset content sources
//   if (sourceId) {
//     contentSources = tempContentSources;
//   }

//   let content = contentStore.get(type)!;

//   // Filter by ability block type if we have one
//   if (options?.abilityBlockType) {
//     content = new Map([...content].filter(([_, v]) => v?.type === options.abilityBlockType));
//   }

//   return content as Map<number, T>;
// }

// export function resetContentStore() {
//   contentStore = emptyContentStore();
// }

// export async function getTraits(ids?: number[]) {
//   let traits: Trait[] = [];
//   for (const traitId of ids ?? []) {
//     // If this was 1 request, it would be so much faster!
//     // But gotta make sure it caches too
//     const trait = await getContent<Trait>('trait', traitId);
//     if (trait) {
//       traits.push(trait);
//     }
//   }
//   return traits;
// }

// export async function getAllContentSources() {
//   const sources = await findAllContentSources({
//     homebrew: false,
//   });
//   return [...(sources ?? [])].map((source) => source.id);
// }

// export async function getContentPackage(sources?: number[]): Promise<ContentPackage> {

//   let tempContentSources: number[] = [];
//   if (sources && sources.length > 0) {
//     // Set content sources to just the ones we want
//     tempContentSources = _.cloneDeep(contentSources);
//     contentSources = sources;
//   }

//   const content = await Promise.all([
//     findAllAncestries(),
//     findAllBackgrounds(),
//     findAllClasses(),
//     findAllAbilityBlocks(),
//     findAllItems(),
//     findAllLanguages(),
//     findAllSpells(),
//     findAllTraits(),
//     findAllCreatures(),
//   ]);

//   if (sources && sources.length > 0) {
//     // Reset content sources
//     contentSources = tempContentSources;
//   }

//   return {
//     ancestries: (content[0] ?? []) as Ancestry[],
//     backgrounds: (content[1] ?? []) as Background[],
//     classes: (content[2] ?? []) as Class[],
//     abilityBlocks: (content[3] ?? []) as AbilityBlock[],
//     items: (content[4] ?? []) as Item[],
//     languages: (content[5] ?? []) as Language[],
//     spells: (content[6] ?? []) as Spell[],
//     traits: (content[7] ?? []) as Trait[],
//     creatures: (content[8] ?? []) as Creature[],
//   } satisfies ContentPackage;
// }

// async function findAncestry(id: number) {
//   return await makeRequest<Ancestry>('find-ancestry', {
//     id,
//     content_sources: contentSources,
//   });
// }
// async function findBackground(id: number) {
//   return await makeRequest<Background>('find-background', {
//     id,
//     content_sources: contentSources,
//   });
// }
// async function findClass(id: number) {
//   return await makeRequest<Class>('find-class', {
//     id,
//     content_sources: contentSources,
//   });
// }
// async function findAbilityBlock(id: number) {
//   return await makeRequest<AbilityBlock>('find-ability-block', {
//     id,
//     content_sources: contentSources,
//   });
// }
// async function findItem(id: number) {
//   return await makeRequest<Item>('find-item', {
//     id,
//     content_sources: contentSources,
//   });
// }
// async function findLanguage(id: number) {
//   return await makeRequest<Language>('find-language', {
//     id,
//     content_sources: contentSources,
//   });
// }
// async function findSpell(id: number) {
//   return await makeRequest<Spell>('find-spell', {
//     id,
//     content_sources: contentSources,
//   });
// }
// async function findTrait(id: number) {
//   return await makeRequest<Trait>('find-trait', {
//     id,
//     content_sources: contentSources,
//   });
// }
// async function findCreature(id: number) {
//   return await makeRequest<Creature>('find-creature', {
//     id,
//     content_sources: contentSources,
//   });
// }
// async function findContentSource(id: number) {
//   return await makeRequest<ContentSource>('find-content-source', {
//     id,
//     content_sources: contentSources,
//   });
// }

// async function findAllAncestries() {
//   return await makeRequest<Ancestry[]>('find-ancestry', {
//     content_sources: contentSources,
//   });
// }
// async function findAllBackgrounds() {
//   return await makeRequest<Background[]>('find-background', {
//     content_sources: contentSources,
//   });
// }
// async function findAllClasses() {
//   return await makeRequest<Class[]>('find-class', {
//     content_sources: contentSources,
//   });
// }
// async function findAllAbilityBlocks(abilityBlockType?: AbilityBlockType) {
//   return await makeRequest<AbilityBlock[]>('find-ability-block', {
//     type: abilityBlockType,
//     content_sources: contentSources,
//   });
// }
// async function findAllItems() {
//   return await makeRequest<Item[]>('find-item', {
//     content_sources: contentSources,
//   });
// }
// async function findAllLanguages() {
//   return await makeRequest<Language[]>('find-language', {
//     content_sources: contentSources,
//   });
// }
// async function findAllSpells() {
//   return await makeRequest<Spell[]>('find-spell', {
//     content_sources: contentSources,
//   });
// }
// async function findAllTraits() {
//   return await makeRequest<Trait[]>('find-trait', {
//     content_sources: contentSources,
//   });
// }
// async function findAllCreatures() {
//   return await makeRequest<Creature[]>('find-creature', {
//     content_sources: contentSources,
//   });
// }
// export async function findAllContentSources(options?: {
//   group?: string;
//   homebrew?: boolean;
//   published?: boolean;
// }) {
//   const sources = await makeRequest<ContentSource[]>('find-content-source', {
//     group: options?.group,
//     homebrew: options?.homebrew,
//     published: options?.published,
//   });
//   if (!sources) {
//     return [];
//   }
//   return sources.sort((a, b) => a.name.localeCompare(b.name));
// }
// export async function findAllPrereqs(name: string) {
//   return await makeRequest<AbilityBlock[]>('find-ability-block', {
//     prerequisites: [name],
//   });
// }
// export async function findTraitByName(name: string, contentSources: number[]) {
//   return await makeRequest<Trait>('find-trait', {
//     name,
//     contentSources,
//   });
// }
