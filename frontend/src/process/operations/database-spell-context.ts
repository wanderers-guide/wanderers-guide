import { SpellListEntrySchema, type Spell, type SpellListEntry } from '@schemas/content';
import { GiveSpellDataSchema, type GiveSpellData } from '@schemas/operations';
import type { StoreID, VariableListStr, VariableNum } from '@schemas/variables';
import { collectNormalSpellList } from '@spells/spell-list-rules';
import { getKnownSpellsByRank, isCantrip } from '@spells/spell-utils';
import { getVariable, getVariables } from '@variables/variable-manager';
import { cloneDeep } from 'lodash-es';
import { z } from 'zod';

type DatabaseContext = {
  saved: SpellListEntry[];
  snapshot?: SpellListEntry[];
  dailyPreparation?: string;
  entityId?: number;
};
const databases = new WeakMap<ReturnType<typeof getVariables>, DatabaseContext>();

/** Bind saved database entries to this execution's variable store, never to a global character. */
export function bindSpellDatabase(
  id: StoreID,
  saved: SpellListEntry[],
  dailyPreparation?: string,
  entityId?: number
): void {
  databases.set(getVariables(id), {
    saved: cloneDeep(saved),
    dailyPreparation: dailyPreparation === undefined ? 'initial' : z.string().uuid().safeParse(dailyPreparation).data,
    entityId,
  });
}

/** Bind a daily callback to the entity, caster, owner and rank that actually offered it. */
export function getDailySpellChoiceId(id: StoreID, source: string, owner: string, spell: Spell): string | undefined {
  const context = databases.get(getVariables(id));
  if (context?.dailyPreparation === undefined || context.entityId === undefined) return undefined;
  return JSON.stringify(['DAILY', context.dailyPreparation, id, context.entityId, source, owner, spell.id, spell.rank]);
}

/** Read the preparation for this execution, not the active character's or an older job's. */
export function getDailyPreparation(id: StoreID): string | undefined {
  return databases.get(getVariables(id))?.dailyPreparation;
}

/** Read only current slots from this caster; another casting source cannot unlock a rank. */
export function getDailySpellRank(id: StoreID, source: string, spell: Spell): number | undefined {
  if (!databases.get(getVariables(id))?.snapshot) return undefined;
  const level = getVariable<VariableNum>(id, 'LEVEL')?.value;
  if (!Number.isInteger(level) || level === undefined || level < 1) return undefined;
  const sources = getVariable<VariableListStr>(id, 'CASTING_SOURCES')?.value ?? [];
  if (!sources.some((value) => value.split(':::')[0] === source)) return undefined;
  const cantrip = isCantrip(spell);
  const slotRank = cantrip ? 0 : spell.rank;
  for (const value of getVariable<VariableListStr>(id, 'SPELL_SLOTS')?.value ?? []) {
    try {
      const slot = JSON.parse(value);
      if (slot?.source === source && slot.lvl === level && slot.amt > 0 && slot.rank === slotRank) {
        // Rank zero is a storage sentinel. A cantrip's actual rank is half this entity's level.
        return cantrip ? Math.ceil(level / 2) : spell.rank;
      }
    } catch {
      // Malformed optional slot data never makes a daily choice eligible.
    }
  }
  return undefined;
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
