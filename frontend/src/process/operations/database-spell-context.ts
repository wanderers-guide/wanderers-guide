import { SpellListEntrySchema, type Spell, type SpellListEntry } from '@schemas/content';
import { GiveSpellDataSchema, type GiveSpellData } from '@schemas/operations';
import type { StoreID, VariableListStr } from '@schemas/variables';
import { collectNormalSpellList } from '@spells/spell-list-rules';
import { getKnownSpellsByRank } from '@spells/spell-utils';
import { getVariable, getVariables } from '@variables/variable-manager';
import { cloneDeep } from 'lodash-es';

type DatabaseContext = { saved: SpellListEntry[]; snapshot?: SpellListEntry[] };
const databases = new WeakMap<ReturnType<typeof getVariables>, DatabaseContext>();

/** Bind saved database entries to this execution's variable store, never to a global character. */
export function bindSpellDatabase(id: StoreID, saved: SpellListEntry[]): void {
  databases.set(getVariables(id), { saved: cloneDeep(saved) });
}

/** Freeze independent membership before any database selector grants can authorize another choice. */
export function snapshotSpellDatabase(id: StoreID, sources: ReadonlySet<string>): void {
  const context = databases.get(getVariables(id));
  if (!context) return;
  const grants: GiveSpellData[] = [];
  for (const value of getVariable<VariableListStr>(id, 'SPELL_DATA')?.value ?? []) {
    try {
      const raw: unknown = JSON.parse(value);
      if (!raw || typeof raw !== 'object') continue;
      const candidate = raw as Partial<GiveSpellData>;
      if (
        candidate.type !== 'NORMAL' ||
        !(
          sources.has(candidate.castingSource ?? '') ||
          (Array.isArray(candidate.listSources) && candidate.listSources.some((source) => sources.has(source)))
        )
      )
        continue;
      const parsed = GiveSpellDataSchema.safeParse(candidate);
      if (parsed.success) grants.push(parsed.data);
    } catch {
      // This optional view never broadens malformed grants or changes ordinary calculation behavior.
    }
  }
  const saved: SpellListEntry[] = context.saved.flatMap((entry) => {
    if (!entry || !sources.has(entry.source)) return [];
    const parsed = SpellListEntrySchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
  context.snapshot = collectNormalSpellList(saved, grants);
}

/** Reuse source-scoped known-rank grouping; absent execution context always offers no choices. */
export function getDatabaseSpells(id: StoreID, source: string, catalog: Spell[]): Spell[] {
  const entries = databases.get(getVariables(id))?.snapshot;
  if (!entries) return [];
  const ids: number[] = entries.filter((entry) => entry.source === source).map((entry) => entry.spell_id);
  return Object.values(getKnownSpellsByRank(ids, catalog, entries, source, 'PREPARED')).flat();
}

/** Release the execution context on success or failure; no membership is persisted here. */
export function clearSpellDatabase(id: StoreID): void {
  databases.delete(getVariables(id));
}
