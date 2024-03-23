import _ from 'lodash-es';

const SPECIALIZATIONS = [
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
];

export function getArmorSpecialization(group: string) {
  return SPECIALIZATIONS.find((s) => s.name.trim().toLowerCase() === group.trim().toLowerCase());
}

export function getArmorSpecializations() {
  return _.cloneDeep(SPECIALIZATIONS);
}
