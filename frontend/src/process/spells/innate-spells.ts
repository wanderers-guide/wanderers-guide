import { Spell, SpellInnateEntry } from '@schemas/content';
import { CastingAttribute } from '@schemas/shared';
import { StoreID } from '@schemas/variables';
import { sign } from '@utils/numbers';
import { getSpellStats } from './spell-handler';

/** Missing attributes in old grants and saved counters retain the Charisma default. */
export function getInnateSpellAttribute(entry: Pick<SpellInnateEntry, 'attribute'>): CastingAttribute {
  return entry.attribute ?? 'ATTRIBUTE_CHA';
}

/** Keep counters separate when the same spell is granted with different casting attributes. */
export function getInnateSpellKey(entry: SpellInnateEntry): string {
  return `${entry.spell_id}-${entry.tradition}-${entry.rank}-${getInnateSpellAttribute(entry)}`;
}

/** PDF templates have no per-innate stat fields; annotate exceptional attributes in the spell row. */
export function getInnateSpellPdfLabel(id: StoreID, spell: Spell, entry: SpellInnateEntry): string {
  const attribute = getInnateSpellAttribute(entry);
  if (attribute === 'ATTRIBUTE_CHA') return spell.name;
  const stats = getSpellStats(id, spell, entry.tradition, attribute);
  return `${spell.name} (${attribute.slice(-3)}, ${sign(stats.spell_attack.total[0])}, DC ${stats.spell_dc.total})`;
}
