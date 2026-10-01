import { HazardSchema, type Combatant, type Hazard } from '@schemas/content';

/** A hazard combatant carries a rules snapshot and no generated living-entity data. */
export type HazardCombatant = Combatant & { type: 'HAZARD'; hazard: Hazard };

/** Narrow an encounter row to its validated hazard snapshot. */
export function isHazardCombatant(combatant: Combatant): combatant is HazardCombatant {
  return combatant.type === 'HAZARD' && combatant.hazard !== undefined;
}

/** Create an independent encounter instance without changing the catalog row. */
export function createHazardCombatant(hazard: Hazard, id: string): HazardCombatant {
  const snapshot: Hazard = structuredClone(HazardSchema.parse(hazard));
  const hp: number | undefined = snapshot.details.defenses?.hp;
  return {
    _id: id,
    type: 'HAZARD',
    ally: false,
    hazard: snapshot,
    hazard_state: {
      ...(hp === undefined ? {} : { hp_current: hp }),
      disabled: false,
    },
  };
}

/** Read tracked HP only when the source stat block lists a maximum. */
export function getHazardCurrentHp(combatant: Combatant): number | undefined {
  if (!isHazardCombatant(combatant)) return undefined;
  const maximum: number | undefined = combatant.hazard.details.defenses?.hp;
  if (maximum === undefined) return undefined;
  return Math.max(0, Math.min(maximum, combatant.hazard_state?.hp_current ?? maximum));
}

/** Set listed HP within its bounds; activation remains controlled by the GM. */
export function updateHazardHp(combatant: HazardCombatant, hpCurrent: number): HazardCombatant;
export function updateHazardHp(combatant: Combatant, hpCurrent: number): Combatant;
export function updateHazardHp(combatant: Combatant, hpCurrent: number): Combatant {
  if (!isHazardCombatant(combatant) || !Number.isFinite(hpCurrent)) return combatant;
  const maximum: number | undefined = combatant.hazard.details.defenses?.hp;
  if (maximum === undefined) return combatant;
  return {
    ...combatant,
    hazard_state: {
      ...combatant.hazard_state,
      hp_current: Math.max(0, Math.min(maximum, hpCurrent)),
    },
  };
}

/** Complex hazards roll the explicitly listed Stealth modifier, never a derived DC. */
export function getHazardInitiativeModifier(hazard: Hazard): number | undefined {
  if (hazard.details.complexity !== 'COMPLEX') return undefined;
  const modifier: RegExpMatchArray | null = hazard.details.stealth.trim().match(/^[+-]\d+(?=\s|\(|$)/);
  return modifier ? Number(modifier[0]) : undefined;
}

/** Simple hazards award one fifth of the XP of a creature or complex hazard of their level. */
export function getHazardXpMultiplier(hazard: Hazard): number {
  return hazard.details.complexity === 'SIMPLE' ? 0.2 : 1;
}
