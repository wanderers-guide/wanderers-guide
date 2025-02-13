import { isPlayingStarfinder } from '@content/system-handler';
import { cloneDeep } from 'lodash-es';

const PATHFINDER_SPECIALIZATIONS = [
  {
    name: 'Axe',
    description: `Choose one creature adjacent to the initial target and within reach. If its AC is lower than your attack roll result for the critical hit, you deal damage to that creature equal to the result of the weapon damage die you rolled (including extra dice for its striking rune, if any). This amount isn’t doubled, and no bonuses or other additional dice apply to this damage.`,
  },
  {
    name: 'Bomb',
    description: `Increase the radius of the bomb’s splash damage (if any) to 10 feet.`,
  },
  {
    name: 'Bow',
    description: `If the target of the critical hit is adjacent to a surface, it gets stuck to that surface by the missile. The target is immobilized and must spend an Interact action to attempt a DC 10 Athletics check to pull the missile free; it can’t move from its space until it succeeds. The creature doesn’t become stuck if it is incorporeal, is liquid, or could otherwise escape without effort (such as by being large enough that the missile would not be an impediment.)`,
  },
  {
    name: 'Brawling',
    description: `The target must succeed at a Fortitude save against your class DC or be slowed 1 until the end of your next turn.`,
  },
  {
    name: 'Club',
    description: `You knock the target up to 10 feet in a straight line away from you, in a direction of your choice. This is forced movement.`,
  },
  {
    name: 'Crossbow',
    description: `The target takes 1d8 persistent bleed damage. You gain an item bonus to this bleed damage equal to the weapon’s item bonus to attack rolls.`,
  },
  {
    name: 'Dart',
    description: `The target takes 1d6 persistent bleed damage. You gain an item bonus to this bleed damage equal to the weapon’s item bonus to attack rolls.`,
  },
  {
    name: 'Firearm',
    description: `The target must succeed at a Fortitude save against your class DC or be stunned 1.`,
  },
  {
    name: 'Flail',
    description: `The target is knocked prone unless they succeed at a Reflex save against your class DC.`,
  },
  {
    name: 'Hammer',
    description: `The target is knocked prone unless they succeed at a Fortitude save against your class DC.`,
  },
  {
    name: 'Knife',
    description: `The target takes 1d6 persistent bleed damage. You gain an item bonus to this bleed damage equal to the weapon’s item bonus to attack rolls.`,
  },
  {
    name: 'Laser',
    description: `The target must succeed at a Fortitude save against your class DC or be dazzled until the start of your next turn.`,
  },
  {
    name: 'Pick',
    description: `The weapon viciously pierces the target, who takes 2 additional damage per weapon damage die.`,
  },
  {
    name: 'Polearm',
    description: `The target is moved 5 feet in a direction of your choice. This is forced movement.`,
  },
  {
    name: 'Projectile',
    description: `The target must succeed at a Fortitude save against your class DC or be slowed 1 until the end of your next turn. `,
  },
  {
    name: 'Shield',
    description: `You knock the target back from you 5 feet. This is forced movement.`,
  },
  {
    name: 'Sling',
    description: `The target must succeed at a Fortitude save against your class DC or be stunned 1.`,
  },
  {
    name: 'Spear',
    description: `Weapons of this type pierce the target, weakening its attacks. The target is clumsy 1 until the start of your next turn.`,
  },
  {
    name: 'Sword',
    description: `The target is made off-balance by your attack, becoming off-guard until the start of your next turn.`,
  },
];

const STARFINDER_SPECIALIZATIONS = [
  {
    name: 'Corrosive',
    description: `The target takes 1d6 persistent acid damage. You gain an item bonus to this acid damage equal to the weapon’s item bonus to attack rolls.`,
  },
  {
    name: 'Cryo',
    description: `This weapon freezes part of the target, making it hard for them to move their body. The target is clumsy 1 until the start of your next turn.`,
  },
  {
    name: 'Flame',
    description: `The target takes 1d6 persistent fire damage. You gain an item bonus to this fire damage equal to the weapon’s item bonus to attack rolls`,
  },
  {
    name: 'Grenade',
    description: ` Varies depending on grenade (SF playtest, pg. 184).`,
  },
  {
    name: 'Laser',
    description: `The target must succeed at a Fortitude save against your class DC or be dazzled until the start of your next turn.`,
  },
  {
    name: 'Mental',
    description: ` The target must succeed at a Will save against your class DC or be stupefied 1 until the start of your next turn.`,
  },
  {
    name: 'Missile',
    description: `The target is knocked back 5 feet from the source of the missile’s explosion. This is forced movement (Player Core 422).`,
  },
  {
    name: 'Plasma',
    description: `The target takes 1d6 persistent electricity damage. You gain an item bonus to this electricity damage equal to the weapon’s item bonus to attack rolls.`,
  },
  {
    name: 'Poison',
    description: `The target must succeed at a Fortitude save against your class DC or be sickened 1 until the start of your next turn.`,
  },
  {
    name: 'Shock',
    description: `The target must succeed at a Fortitude save against your class DC or be stunned 1.`,
  },
  {
    name: 'Sniper',
    description: `The target takes 2 additional damage per weapon damage dice.`,
  },
  {
    name: 'Sonic',
    description: `The target must succeed at a Fortitude save against your class DC or be deafened for 1 minute.`,
  },
];

export function getWeaponSpecialization(group: string) {
  return getWeaponSpecializations().find((s) => s.name.trim().toLowerCase() === group.trim().toLowerCase());
}

export function getWeaponSpecializations() {
  const SPECIALIZATIONS = cloneDeep(PATHFINDER_SPECIALIZATIONS);
  if (isPlayingStarfinder()) {
    SPECIALIZATIONS.push(...cloneDeep(STARFINDER_SPECIALIZATIONS));
  }
  return SPECIALIZATIONS.sort((a, b) => a.name.localeCompare(b.name));
}
