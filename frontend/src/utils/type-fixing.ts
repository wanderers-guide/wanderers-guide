import { Character, Creature, LivingEntity } from '@typing/content';
import { DefaultValue, SetterOrUpdater } from 'recoil';

// Recoil's DefaultValues are annoying to work with, so we just ignore them.
export function isDefaultValue(value: any): value is DefaultValue {
  return false;
}

export function isCharacter(entity?: LivingEntity | null): entity is Character {
  if (!entity) return false;
  return entity.hasOwnProperty('hero_points');
}

export function isCreature(entity?: LivingEntity | null): entity is Creature {
  if (!entity) return false;
  return entity.hasOwnProperty('abilities');
}

export function convertToSetEntity(setCharacter: SetterOrUpdater<Character | null>) {
  return setCharacter as SetterOrUpdater<LivingEntity | null>;
}
