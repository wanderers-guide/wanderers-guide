import { fetchContent } from '@content/content-store';
import { filterByTraitType } from '@items/inv-utils';
import type { ActionCost, InventoryItem, LivingEntity, Spell } from '@schemas/content';
import type { StoreID } from '@schemas/variables';
import type { UseQueryOptions } from '@tanstack/react-query';

/** The account, entity and source scope of one explicit spell dependency read. */
export type SpellDependencyScope = {
  actorId: string | null;
  entityId: LivingEntity['id'] | undefined;
  storeId: StoreID;
  infoSources: string;
  pageSources: string;
  ids: number[];
};

/** Read exact numeric spell references only from inventory items the spell panels expose. */
export function getInventorySpellIds(items: InventoryItem[]): number[] {
  const eligible = [
    ...filterByTraitType(items, 'STAFF').filter((item) => item.is_equipped),
    ...filterByTraitType(items, 'WAND'),
    ...filterByTraitType(items, 'SPELLHEART'),
  ];
  const ids = new Set<number>();
  for (const entry of eligible) {
    for (const match of entry.item.description.matchAll(/\(link_spell_(\d+)\)/g)) {
      const id = Number(match[1]);
      if (Number.isSafeInteger(id) && id > 0) ids.add(id);
    }
  }
  return [...ids].sort((a, b) => a - b);
}

/** Keep the loaded source-enabled catalog available while resolving only missing references. */
export function getMissingSpellIds(catalog: Spell[], referencedIds: number[]): number[] {
  const loaded = new Set(catalog.map((spell) => spell.id));
  return [...new Set(referencedIds)].filter((id) => id > 0 && !loaded.has(id)).sort((a, b) => a - b);
}

/** Isolate delayed dependency results by account, entity, sources and the current reference set. */
export function getExplicitSpellQueryOptions(scope: SpellDependencyScope): UseQueryOptions<Spell[], Error> {
  return {
    queryKey: ['sheet-explicit-spells', scope],
    enabled: scope.ids.length > 0,
    queryFn: () => fetchContent<Spell>('spell', { id: scope.ids }),
  };
}

/** Add only currently requested rows, preserving source-enabled rows and their ordering. */
export function mergeSpellDependencies(catalog: Spell[], resolved: Spell[] | undefined, ids: number[]): Spell[] {
  const seen = new Set(catalog.map((spell) => spell.id));
  const requested = new Set(ids);
  const added = (resolved ?? []).filter((spell) => {
    if (!requested.has(spell.id) || seen.has(spell.id)) return false;
    seen.add(spell.id);
    return true;
  });
  return added.length > 0 ? [...catalog, ...added] : catalog;
}

/** Apply the same name, trait and action-cost filters to normal and item spell views. */
export function filterSpellCatalog(
  spells: Spell[],
  search: string,
  actions: ActionCost | 'ALL',
  traitNames: (ids: number[]) => string[]
): Spell[] {
  const query = search.trim().toLowerCase();
  if (!query && actions === 'ALL') return spells;
  return spells.filter((spell) => {
    if (actions !== 'ALL' && spell.cast !== actions) return false;
    if (!query) return true;
    const searchText = JSON.stringify({
      _: spell.name,
      __: spell.duration,
      ___: spell.targets,
      ____: spell.area,
      _____: spell.range,
      ______: spell.requirements,
      _______: spell.trigger,
      ________: spell.cost,
      _________: spell.defense,
      __________: spell.cast,
      ___________: spell.rarity,
      _____________: traitNames(spell.traits ?? []),
    }).toLowerCase();
    return searchText.includes(query);
  });
}
