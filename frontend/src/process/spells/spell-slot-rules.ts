import type { SpellListEntry, SpellSlot, SpellSlotRecord } from '@schemas/content';

/** Keep ordinary and restricted preparation pools separate, without relying on display IDs. */
export function getSpellSlotGroupKey(slot: SpellSlot): string {
  return JSON.stringify([slot.rank, slot.source, slot.spell_list_source ?? null]);
}

/** Check only an authored slot's named list; ordinary preparations remain unrestricted. */
export function isSpellInSlotList(slot: SpellSlot, spellId: number, list: SpellListEntry[]): boolean {
  if (slot.spell_list_source === undefined) return true;
  return list.some(
    (entry: SpellListEntry) =>
      entry.source === slot.spell_list_source &&
      entry.spell_id === spellId &&
      (slot.rank === 0 ? entry.rank === 0 : entry.rank > 0 && entry.rank <= slot.rank)
  );
}

/** Retain suppressed restricted preparations during unrelated writes, matching each pool by ordinal. */
export function retainRestrictedPreparations(
  slots: SpellSlotRecord[],
  saved: SpellSlot[],
  editedSlotIds: readonly string[] = []
): SpellSlot[] {
  const pools = new Map<string, SpellSlot[]>();
  for (const slot of saved) {
    if (slot.spell_list_source === undefined) continue;
    const key = getSpellSlotGroupKey(slot);
    const pool = pools.get(key) ?? [];
    pool.push(slot);
    pools.set(key, pool);
  }
  if (pools.size === 0) return slots;
  const used = new Map<string, number>();
  const edited = new Set(editedSlotIds);
  const result: SpellSlot[] = slots.map((slot) => {
    if (slot.spell_list_source === undefined) return slot;
    const key = getSpellSlotGroupKey(slot);
    const index = used.get(key) ?? 0;
    used.set(key, index + 1);
    const prior = pools.get(key)?.[index];
    if (slot.spell_id !== undefined || prior?.spell_id === undefined || edited.has(slot.id)) return slot;
    return { ...slot, spell_id: prior.spell_id };
  });
  // Removed restricted pools remain saved but are never rendered or castable until granted again.
  for (const [key, pool] of pools) result.push(...pool.slice(used.get(key) ?? 0));
  return result;
}
