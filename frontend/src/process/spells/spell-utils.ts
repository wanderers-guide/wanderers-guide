import { Spell } from '@typing/content';
import { hasTraitType } from '@utils/traits';

/**
 * Utility function to determine if a spell is a focus spell
 * @param spell - Spell
 * @returns - Whether the spell is a focus spell
 */
export function isFocusSpell(spell: Spell) {
  return hasTraitType('FOCUS', spell.traits);
}

/**
 * Utility function to determine if a spell is a cantrip
 * @param spell - Spell
 * @returns - Whether the spell is a cantrip
 */
export function isCantrip(spell: Spell) {
  return hasTraitType('CANTRIP', spell.traits);
}

/**
 * Utility function to determine if a spell is a ritual
 * @param spell - Spell
 * @returns - Whether the spell is a ritual
 */
export function isRitual(spell: Spell) {
  return !!spell.meta_data.ritual;
}

/**
 * Utility function to determine if a spell is a "normal" spell
 * @param spell - Spell
 * @returns - Whether the spell is a "normal" spell
 */
export function isNormalSpell(spell: Spell) {
  return !isFocusSpell(spell) && !isRitual(spell);
}
