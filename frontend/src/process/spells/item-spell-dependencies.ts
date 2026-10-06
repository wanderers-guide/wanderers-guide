import { fetchContent } from '@content/content-store';
import { filterByTraitType } from '@items/inv-utils';
import type { ActionCost, ContentSource, InventoryItem, Item, LivingEntity, Spell } from '@schemas/content';
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

/** Effective spell indexing text, never written back to a saved inventory snapshot. */
export type ItemSpellRead = { description: string; recoveredLegacyReference: boolean };

// Exact reviewed pre-indexing body. Custom text and other printings remain authoritative.
const LEGACY_ASH_PUPPET_DESCRIPTION =
  "This wand is composed of ash that has been compressed, shaped, and sealed with a clear lacquer. When you trace the wand's tip along a solid surface, it leaves a black trail of charcoal. Writing with the wand in this way never damages or wears the wand down.\n\n**Activate** Cast a Spell\n\n**Effect** You cast \\[\\[Disintegrate\\]\\]. If the spell reduces a living creature to fine powder, you animate that creature's ashes into a \\[\\[Sulfur Zombie\\]\\] with the same general appearance as the disintegrated creature. You control this sulfur zombie, which gains the minion and summoned traits. You can issue a verbal command to the sulfur zombie as a single action with the auditory and concentrate traits. The sulfur zombie crumbles into inanimate ash when reduced to 0 Hit Points or after 1 minute, whichever comes first.";

/** Recover only Ash Puppet's existing escaped spell reference from its exact official counterpart. */
export function resolveItemSpellRead(
  item: Item,
  canonicalItem: Item | undefined,
  source: ContentSource | undefined
): ItemSpellRead {
  const unchanged = { description: item.description, recoveredLegacyReference: false };
  if (
    item.id !== 12695 ||
    item.content_source_id !== 16 ||
    item.created_at !== '2024-04-19T04:25:49.043177+00:00' ||
    item.name !== 'Wand of the Ash Puppet' ||
    item.level !== 14 ||
    item.group !== 'GENERAL' ||
    item.description !== LEGACY_ASH_PUPPET_DESCRIPTION ||
    !canonicalItem ||
    canonicalItem.id !== item.id ||
    canonicalItem.content_source_id !== item.content_source_id ||
    canonicalItem.created_at !== item.created_at ||
    canonicalItem.name !== item.name ||
    canonicalItem.level !== item.level ||
    canonicalItem.group !== item.group ||
    source?.id !== item.content_source_id ||
    source.user_id !== null ||
    source.is_published !== true
  ) {
    return unchanged;
  }
  // Derive the numeric target from the canonical explicit cast, never a name-only lookup.
  const references = [
    ...canonicalItem.description.matchAll(/\*\*Effect\*\* You cast (\[Disintegrate\]\(link_spell_(\d+)\))\./g),
  ];
  if (references.length !== 1 || references[0][2] !== '4571') return unchanged;
  return {
    description: item.description.replace('\\[\\[Disintegrate\\]\\]', references[0][1]),
    recoveredLegacyReference: true,
  };
}

/** Read exact numeric spell references only from inventory items the spell panels expose. */
export function getInventorySpellIds(
  items: InventoryItem[],
  reads?: ReadonlyMap<InventoryItem, ItemSpellRead>
): number[] {
  const eligible = [
    ...filterByTraitType(items, 'STAFF').filter((item) => item.is_equipped),
    ...filterByTraitType(items, 'WAND'),
    ...filterByTraitType(items, 'SPELLHEART'),
  ];
  const ids = new Set<number>();
  for (const entry of eligible) {
    const description = reads?.get(entry)?.description ?? entry.item.description;
    for (const match of description.matchAll(/\(link_spell_(\d+)\)/g)) {
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
