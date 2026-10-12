import type { SpellListEntry } from '@schemas/content';
import type { GiveSpellData } from '@schemas/operations';
import { cloneDeep, isEqual, uniqWith } from 'lodash-es';

/** Combine saved and granted normal spell lists through the same source/rank membership rules. */
export function collectNormalSpellList(saved: SpellListEntry[], grants: GiveSpellData[]): SpellListEntry[] {
  const list: SpellListEntry[] = cloneDeep(saved);
  for (const grant of grants) {
    if (grant.type !== 'NORMAL') continue;
    for (const source of [grant.castingSource ?? '', ...(grant.listSources ?? [])]) {
      list.push({ spell_id: grant.spellId, rank: grant.rank ?? 0, source });
    }
  }
  return uniqWith(list, isEqual);
}
