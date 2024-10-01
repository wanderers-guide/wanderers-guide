import { getConditionByName } from '@conditions/condition-handler';
import { LivingEntity } from '@typing/content';
import { StoreID } from '@typing/variables';
import { getFinalHealthValue } from '@variables/variable-display';
import _ from 'lodash-es';
import { evaluate } from 'mathjs';
import { SetterOrUpdater } from 'recoil';

export function confirmHealth(
  hp: string,
  id: StoreID,
  entity: LivingEntity,
  setEntity: SetterOrUpdater<LivingEntity | null>
) {
  const maxHealth = getFinalHealthValue(id);
  const currentHp = entity.hp_current ?? 0;
  const currentTempHp = entity.hp_temp ?? 0;
  const currentTotalHp = currentHp + currentTempHp;

  let hpResult = -1;
  try {
    hpResult = evaluate(hp);
  } catch (e) {
    hpResult = parseInt(hp);
  }
  if (isNaN(hpResult)) hpResult = 0;

  let newHp = Math.min(currentHp, maxHealth);
  let newTempHp = currentTempHp;
  if (hpResult > currentTotalHp) {
    // Healing
    // Temp hp don't heal, so add to the current hp until max
    newHp = Math.min(currentHp + hpResult, maxHealth);
  } else {
    // Damage
    const damage = currentHp - hpResult;
    // Remove from temp hp first
    newTempHp = currentTempHp - damage;
    // Then remove from current hp
    if (newTempHp < 0) {
      newHp = Math.max(currentHp + newTempHp, 0);
      newTempHp = 0;
    }
  }
  
  if (newHp === currentHp && newTempHp === currentTempHp) return;
  
  // Add dying condition
  let newConditions = _.cloneDeep(entity.details?.conditions ?? []);
  if (newHp === 0 && currentHp > 0 && !newConditions.find((c) => c.name === 'Dying')) {
    const dying = getConditionByName('Dying')!;
    const wounded = newConditions.find((c) => c.name === 'Wounded');
    if (wounded) {
      dying.value = 1 + wounded.value!;
    }
    newConditions.push(dying);
  } else if (newHp > 0 && currentHp === 0) {
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

  setEntity((c) => {
    if (!c) return c;
    return {
      ...c,
      hp_current: newHp,
      hp_temp: newTempHp,
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
  return newHp;
}

export function confirmExperience(exp: string, entity: LivingEntity, setEntity: SetterOrUpdater<LivingEntity | null>) {
  let result = -1;
  try {
    result = evaluate(exp);
  } catch (e) {
    result = parseInt(exp);
  }
  if (isNaN(result)) result = 0;
  result = Math.floor(result);
  if (result < 0) result = 0;

  setEntity((c) => {
    if (!c) return c;
    return {
      ...c,
      experience: result,
    };
  });
  return result;
}
