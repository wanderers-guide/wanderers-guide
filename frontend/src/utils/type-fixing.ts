import { Character, Creature, LivingEntity } from '@schemas/content';
import { OperationSelectOptionCustom } from '@schemas/operations';

export type SetterOrUpdater<T> = (valOrUpdater: T | ((currVal: T) => T)) => void;

export function isCharacter(entity?: LivingEntity | null): entity is Character {
  if (!entity) return false;
  return entity.hasOwnProperty('hero_points');
}

export function isCreature(entity?: LivingEntity | null): entity is Creature {
  if (!entity) return false;
  return entity.hasOwnProperty('rarity');
}

export function convertToSetEntity(setValue: SetterOrUpdater<Character | null> | SetterOrUpdater<Creature | null>) {
  return setValue as SetterOrUpdater<LivingEntity | null>;
}

export function setterOrUpdaterToValue<T>(val: T | ((currVal: T | null) => T | null) | null, old: T): T | null {
  if (val === null) return null;

  if (typeof val === 'function') {
    // Safely call val since it is now narrowed to the callable type
    return (val as (currVal: T | null) => T | null)(old ?? null);
  }
  // If val is not a function, it is already a value
  return val;
}

export function setStateActionToValue<T>(val: React.SetStateAction<T>, old: T): T {
  if (typeof val === 'function') {
    // Narrowing to a function and calling with the old value
    return (val as (prevState: T) => T)(old);
  }
  // If not a function, return the plain value
  return val;
}

export function instanceOfOperationSelectOptionCustom(object: any): object is OperationSelectOptionCustom {
  if (!object) return false;
  return 'type' in object && 'title' in object && 'description' in object && 'operations' in object;
}

export function isTruthy<T>(value: T): value is NonNullable<T> {
  // Don't include 0 as a falsy value or empty strings, since they are valid values
  return value !== null && value !== undefined && value !== false;
}
