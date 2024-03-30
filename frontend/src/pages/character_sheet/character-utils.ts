import { getConditionByName } from '@conditions/condition-handler';
import { Character } from '@typing/content';
import { getFinalHealthValue } from '@variables/variable-display';
import _ from 'lodash';
import { evaluate } from 'mathjs';
import { SetterOrUpdater } from 'recoil';

export function confirmHealth(hp: string, character: Character, setCharacter: SetterOrUpdater<Character | null>) {
  const maxHealth = getFinalHealthValue('CHARACTER');

  let result = -1;
  try {
    result = evaluate(hp);
  } catch (e) {
    result = parseInt(hp);
  }
  if (isNaN(result)) result = 0;
  result = Math.floor(result);
  if (result < 0) result = 0;
  if (result > maxHealth) result = maxHealth;

  if (result === character.hp_current) return;

  let newConditions = _.cloneDeep(character.details?.conditions ?? []);
  // Add dying condition
  if (result === 0 && character.hp_current > 0 && !newConditions.find((c) => c.name === 'Dying')) {
    const dying = getConditionByName('Dying')!;
    const wounded = newConditions.find((c) => c.name === 'Wounded');
    if (wounded) {
      dying.value = 1 + wounded.value!;
    }
    newConditions.push(dying);
  } else if (result > 0 && character.hp_current === 0) {
    // Remove dying condition
    newConditions = newConditions.filter((c) => c.name !== 'Dying');
    // Increase wounded condition
    const wounded = newConditions.find((c) => c.name === 'Wounded');
    if (wounded) {
      wounded.value = 1 + wounded.value!;
    } else {
      newConditions.push(getConditionByName('Wounded')!);
    }
  }

  setCharacter((c) => {
    if (!c) return c;
    return {
      ...c,
      hp_current: result,
      details: {
        ...c.details,
        conditions: newConditions,
      },
      meta_data: {
        ...c.meta_data,
        reset_hp: false,
      },
    };
  });
  return result;
}

export function confirmExperience(exp: string, character: Character, setCharacter: SetterOrUpdater<Character | null>) {
  let result = -1;
  try {
    result = evaluate(exp);
  } catch (e) {
    result = parseInt(exp);
  }
  if (isNaN(result)) result = 0;
  result = Math.floor(result);
  if (result < 0) result = 0;

  setCharacter((c) => {
    if (!c) return c;
    return {
      ...c,
      experience: result,
    };
  });
  return result;
}
