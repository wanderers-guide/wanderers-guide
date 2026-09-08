import { Spell } from '@schemas/content';
import { StoreID } from '@schemas/variables';
import { toLabel } from '@utils/strings';
import { getCombinedVariableValue, getModifierParts, getProfValueParts } from '@variables/variable-helpers';

export function getSpellStats(id: StoreID, spell: Spell | null, tradition: string, attribute: string) {
  return {
    spell_attack: getSpellAttack(id, spell, tradition, attribute),
    spell_dc: getSpellDC(id, spell, tradition, attribute),
  };
}

/** Stack raw spell, general, range and applicable attribute modifiers as one attack roll. */
function getSpellAttack(id: StoreID, spell: Spell | null, tradition: string, attribute: string) {
  const profParts = getProfValueParts(id, 'SPELL_ATTACK', attribute)!;
  const rangeVariable = spell?.range?.trim().toLowerCase() === 'touch' ? 'MELEE' : 'RANGED';
  const attributeVariable = attribute === 'ATTRIBUTE_STR' ? 'STR' : attribute === 'ATTRIBUTE_DEX' ? 'DEX' : null;
  const modifiers = getCombinedVariableValue(id, [
    'SPELL_ATTACK',
    'ATTACK_ROLLS_BONUS',
    `${rangeVariable}_ATTACK_ROLLS_BONUS`,
    ...(attributeVariable ? [`${attributeVariable}_ATTACK_ROLLS_BONUS`] : []),
  ]);
  const parts = new Map<string, number>([
    ['This is your proficiency bonus for spell attacks.', profParts.profValue + profParts.level],
    [`This is your ${toLabel(attribute)} modifier for this casting source.`, profParts.attributeMod ?? 0],
    ...getModifierParts(modifiers),
  ]);
  return {
    total: getMAPedTotal(
      id,
      [...parts.values()].reduce((total, part) => total + part, 0)
    ),
    parts,
    conditionals: modifiers.conditionals,
  };
}

function getSpellDC(id: StoreID, spell: Spell | null, tradition: string, attribute: string) {
  const profParts = getProfValueParts(id, `SPELL_DC`, attribute)!;

  ///

  const parts = new Map<string, number>();
  parts.set('This is your proficiency bonus for spell DCs.', profParts.profValue + profParts.level);

  parts.set(
    `This is your ${toLabel(attribute)} modifier. You add your ${toLabel(attribute)} modifier to spell DCs from this casting source.`,
    profParts.attributeMod ?? 0
  );

  if (profParts.breakdown.bonusValue) {
    parts.set('This is a bonus you receive to spell DCs from various sources.', profParts.breakdown.bonusValue);
  }

  return {
    total: 10 + [...parts.values()].reduce((a, b) => a + b, 0),
    parts: parts,
  };
}

function getMAPedTotal(id: StoreID, total: number): [number, number, number] {
  const first = total;
  const second = total - 5;
  const third = total - 10;

  return [first, second, third];
}
