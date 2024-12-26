import { getConditionByName } from '@conditions/condition-handler';
import { LivingEntity } from '@typing/content';
import { StoreID } from '@typing/variables';
import { getFinalHealthValue } from '@variables/variable-display';
import _ from 'lodash-es';
import { evaluate } from 'mathjs';
import { SetterOrUpdater } from 'recoil';

export function confirmHealth(
  hp: string,
  maxHealth: number,
  entity: LivingEntity,
  setEntity?: SetterOrUpdater<LivingEntity | null>
) {
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

  if (result === entity.hp_current) return;

  if (maxHealth === 0) return;

  let newConditions = _.cloneDeep(entity.details?.conditions ?? []);
  // Add dying condition
  if (result === 0 && entity.hp_current > 0 && !newConditions.find((c) => c.name === 'Dying')) {
    const dying = getConditionByName('Dying')!;
    const wounded = newConditions.find((c) => c.name === 'Wounded');
    if (wounded) {
      dying.value = 1 + wounded.value!;
    }
    newConditions.push(dying);
  } else if (result > 0 && entity.hp_current === 0) {
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

  const getResultingEntity = (c: LivingEntity): LivingEntity => ({
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
  });
  setEntity?.((c) => {
    if (!c) return c;
    return getResultingEntity(c);
  });

  return {
    value: result,
    entity: getResultingEntity(entity),
  };
}

export function confirmExperience(exp: string, entity: LivingEntity, setEntity?: SetterOrUpdater<LivingEntity | null>) {
  let result = -1;
  try {
    result = evaluate(exp);
  } catch (e) {
    result = parseInt(exp);
  }
  if (isNaN(result)) result = 0;
  result = Math.floor(result);
  if (result < 0) result = 0;

  const getResultingEntity = (c: LivingEntity): LivingEntity => ({
    ...c,
    experience: result,
  });
  setEntity?.((c) => {
    if (!c) return c;
    return getResultingEntity(c);
  });

  return {
    value: result,
    entity: getResultingEntity(entity),
  };
}
