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

export function setterOrUpdaterToValue<T>(val: T | ((currVal: T | null) => T | null), old?: T): T | null {
  if (typeof val === 'function') {
    // Safely call val since it is now narrowed to the callable type
    return (val as (currVal: T | null) => T | null)(old ?? null);
  }
  // If val is not a function, it is already a value
  return val;
}

export function instanceOfOperationSelectOptionCustom(object: any): object is OperationSelectOptionCustom {
  if (!object) return false;
  return 'type' in object && 'title' in object && 'description' in object && 'operations' in object;
}
