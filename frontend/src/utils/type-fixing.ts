import { Character, Creature, LivingEntity } from '@typing/content';
import { OperationSelectOptionCustom } from '@typing/operations';
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

export function convertToSetEntity(setValue: SetterOrUpdater<Character | null> | SetterOrUpdater<Creature | null>) {
  return setValue as SetterOrUpdater<LivingEntity | null>;
}

export function instanceOfOperationSelectOptionCustom(object: any): object is OperationSelectOptionCustom {
  return 'type' in object && 'title' in object && 'description' in object && 'operations' in object;
}
