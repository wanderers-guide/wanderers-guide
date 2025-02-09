import { isPlayingStarfinder } from '@content/system-handler';
import { cloneDeep } from 'lodash-es';

const PATHFINDER_SPECIALIZATIONS = [
  {
    name: 'Chain',
    description: `The armor can bend with a critical hit and absorb some of the blow. Reduce the damage from critical hits by 4 + the value of the armor’s potency rune for medium armor, or 6 + the value of the armor’s potency rune for heavy armor. This can’t reduce the damage to less than the damage rolled for the hit before doubling for a critical hit.`,
  },
  {
    name: 'Composite',
    description: `The numerous overlapping pieces of this armor protect you from piercing attacks. You gain resistance to piercing damage equal to 1 + the value of the armor’s potency rune for medium armor, or 2 + the value of the armor’s potency rune for heavy armor.`,
  },
  {
    name: 'Leather',
    description: `The thick second skin of the armor disperses blunt force to reduce bludgeoning damage. You gain resistance to bludgeoning damage equal to 1 + the value of the armor’s potency rune for medium armor, or 2 + the value of the armor’s potency rune for heavy armor.`,
  },
  {
    name: 'Plate',
    description: `The sturdy plate provides no purchase for a cutting edge. You gain resistance to slashing damage equal to 1 + the value of the armor’s potency rune for medium armor, or 2 + the value of the armor’s potency rune for heavy armor.`,
  },
  // Others
  {
    name: 'Skeletal',
    description: `Armor made from the bone or exoskeleton of creatures as diverse as bears, insects, and coral, skeletal armor protects vital points from precision damage. You gain resistance to precision damage equal to 3 + the value of the armor's potency rune for medium armor, or 5 + the value of the armor's potency rune for heavy armor.`,
  },
  {
    name: 'Wood',
    description: `Wood armor is generally flexible and light, but it can splinter as it breaks, throwing off shards and fragments that damage foes who deal you critical blows. If a foe critically hits you with a melee unarmed attack or critically hits you with any melee attack while adjacent to you, it takes piercing damage equal to 3 + the armor's potency rune value for medium armor, or 5 + the armor's potency rune value for heavy armor.`,
  },
];

const STARFINDER_SPECIALIZATIONS = [
  {
    name: 'Cloth',
    description: `Clothing isn't armor, but if it has a Dex cap it can accept fundamental and property runes. There is no armor specialization effect for the cloth armor group.`,
  },
  {
    name: 'Ceramic',
    description: `This tough, light-weight plating is common on spacesuits. It resists heat and other environmental hazards. You gain resistance to acid, cold, fire, and electricity damage equal to 1 + the armor’s resilience value for medium armor, or 2 + the armor’s resilience value for heavy armor.`,
  },
  {
    name: 'Polymer',
    description: `This flexible armor protects you from dispersed heat and force. You gain resistance to area damage equal to 1 + the armor’s resilience value for medium armor, or 2 + the armor’s resilience value for heavy armor.`,
  },
];

export function getArmorSpecialization(group: string) {
  return getArmorSpecializations().find((s) => s.name.trim().toLowerCase() === group.trim().toLowerCase());
}

export function getArmorSpecializations(includeAll = false) {
  const SPECIALIZATIONS = cloneDeep(PATHFINDER_SPECIALIZATIONS);
  if (includeAll || isPlayingStarfinder()) {
    SPECIALIZATIONS.push(...cloneDeep(STARFINDER_SPECIALIZATIONS));
  }
  return SPECIALIZATIONS.sort((a, b) => a.name.localeCompare(b.name));
}
