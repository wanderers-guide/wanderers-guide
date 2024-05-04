import { Spell } from '@typing/content';
import { StoreID } from '@typing/variables';
import { toLabel } from '@utils/strings';
import { getFinalProfValue, getFinalVariableValue, getProfValueParts } from '@variables/variable-display';

export function getSpellStats(id: StoreID, spell: Spell | null, tradition: string, attribute: string) {
  return {
    spell_attack: getSpellAttack(id, spell, tradition, attribute),
    spell_dc: getSpellDC(id, spell, tradition, attribute),
  };
}

function getSpellAttack(id: StoreID, spell: Spell | null, tradition: string, attribute: string) {
  const attackBonus = getFinalVariableValue(id, 'ATTACK_ROLLS_BONUS').total;
  const dexAttackBonus = getFinalVariableValue(id, 'DEX_ATTACK_ROLLS_BONUS').total;
  const strAttackBonus = getFinalVariableValue(id, 'STR_ATTACK_ROLLS_BONUS').total;
  const meleeAttackBonus =
    spell?.range?.toLowerCase() === 'touch' ? getFinalVariableValue(id, 'MELEE_ATTACK_ROLLS_BONUS').total : 0;
  const rangedAttackBonus =
    spell?.range?.toLowerCase() !== 'touch' ? getFinalVariableValue(id, 'RANGED_ATTACK_ROLLS_BONUS').total : 0;

  const profParts = getProfValueParts(id, `SPELL_ATTACK`, attribute)!;

  ///

  const parts = new Map<string, number>();
  parts.set('This is your proficiency bonus for spell attacks.', profParts.profValue + profParts.level);

  parts.set(
    `This is your ${toLabel(attribute)} modifier. You add your ${toLabel(attribute)} modifier to spell attacks from this casting source.`,
    profParts.attributeMod ?? 0
  );

  if (attackBonus) {
    parts.set('This is a bonus you receive to all attack rolls.', attackBonus);
  }

  if (dexAttackBonus) {
    parts.set('This is a bonus you receive to Dexterity-based attack rolls.', dexAttackBonus);
  }

  if (strAttackBonus) {
    parts.set('This is a bonus you receive to Strength-based attack rolls.', strAttackBonus);
  }

  if (meleeAttackBonus) {
    parts.set('This is a bonus you receive to melee attack rolls.', meleeAttackBonus);
  }

  if (rangedAttackBonus) {
    parts.set('This is a bonus you receive to ranged attack rolls.', rangedAttackBonus);
  }

  if (profParts.breakdown.bonusValue) {
    parts.set('This is a bonus you receive to spell attacks from various sources.', profParts.breakdown.bonusValue);
  }

  return {
    total: getMAPedTotal(
      id,
      [...parts.values()].reduce((a, b) => a + b, 0)
    ),
    parts: parts,
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
