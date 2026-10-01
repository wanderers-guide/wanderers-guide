import type { MantineColor } from '@mantine/core';
import type { Combatant, Encounter, LivingEntity } from '@schemas/content';
import { getHazardXpMultiplier, isHazardCombatant } from '@utils/encounter-hazard';
import { mean } from 'lodash-es';

/** Read encounter levels without sending hazard stat blocks through living-entity rules. */
export function getEncounterCombatantLevel(
  combatant: Combatant,
  resolveLevel: (entity: LivingEntity) => number
): number | undefined {
  if (isHazardCombatant(combatant)) return combatant.hazard.level;
  const entity = combatant.data ?? combatant.creature;
  return entity ? resolveLevel(entity) : undefined;
}

/** Preserve creature budgets and apply the simple-hazard XP multiplier. */
export function calculateDifficulty(
  encounter: Encounter,
  combatants: Combatant[],
  resolveLevel: (entity: LivingEntity) => number
) {
  const allies = combatants.filter((combatant) => combatant.type !== 'HAZARD' && combatant.ally);
  const partyLevel =
    encounter.meta_data.party_level ??
    mean(allies.map((combatant) => getEncounterCombatantLevel(combatant, resolveLevel)));
  const partySize = encounter.meta_data.party_size ?? allies.length;
  const xpByDifference: Record<number, number> = {
    [-4]: 10,
    [-3]: 15,
    [-2]: 20,
    [-1]: 30,
    0: 40,
    1: 60,
    2: 80,
    3: 120,
    4: 160,
  };
  let xpBudget = 0;
  for (const combatant of combatants) {
    if (combatant.type !== 'HAZARD' && combatant.ally) continue;
    const level = getEncounterCombatantLevel(combatant, resolveLevel);
    if (level === undefined || !Number.isFinite(partyLevel)) continue;
    const difference = level - partyLevel;
    const xp = xpByDifference[difference] ?? (difference > 0 ? difference * 40 : 0);
    xpBudget += xp * (isHazardCombatant(combatant) ? getHazardXpMultiplier(combatant.hazard) : 1);
  }
  const partySizeDiff = partySize - 4;
  let status: string;
  let color: MantineColor;
  if (xpBudget >= 200 + partySizeDiff * 40) {
    status = 'IMPOSSIBLE';
    color = 'dark';
  } else if (xpBudget >= 140 + partySizeDiff * 40) {
    status = 'Extreme';
    color = 'red';
  } else if (xpBudget >= 100 + partySizeDiff * 30) {
    status = 'Severe';
    color = 'orange';
  } else if (xpBudget >= 70 + partySizeDiff * 20) {
    status = 'Moderate';
    color = 'yellow';
  } else if (xpBudget >= 50 + partySizeDiff * 15) {
    status = 'Low';
    color = 'green';
  } else {
    status = 'Trivial';
    color = 'blue';
  }
  return { status, color, xp: Math.floor(xpBudget) };
}
