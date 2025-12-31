import { getConditionByName } from '@conditions/condition-handler';
import { collectEntitySpellcasting, getFocusPoints } from '@content/collect-content';
import { filterByTraitType } from '@items/inv-utils';
import { LivingEntity } from '@typing/content';
import { StoreID, VariableAttr, VariableNum, VariableProf } from '@typing/variables';
import { getFinalHealthValue } from '@variables/variable-helpers';
import { getVariable } from '@variables/variable-manager';
import { cloneDeep } from 'lodash-es';
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

  let newConditions = cloneDeep(entity.details?.conditions ?? []);
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

export function handleRest(id: StoreID, entity: LivingEntity, setEntity?: SetterOrUpdater<LivingEntity | null>) {
  const newEntity = cloneDeep(entity);
  if (!newEntity) return;

  // Regen Health
  const conMod = getVariable<VariableAttr>(id, 'ATTRIBUTE_CON')?.value.value ?? 0;
  const level = getVariable<VariableNum>(id, 'LEVEL')!.value;
  // TODO: Might be bug here, need to maybe use `getEntityLevel(entity)`
  let regenAmount = level * (1 > conMod ? 1 : conMod);
  if (regenAmount < 1) regenAmount = 1;

  const maxHealth = getFinalHealthValue(id);
  let currentHealth = entity?.hp_current;
  if (currentHealth === undefined || currentHealth < 0) {
    currentHealth = maxHealth;
  }
  if (currentHealth + regenAmount > maxHealth) {
    regenAmount = maxHealth - currentHealth;
  }
  newEntity.hp_current = currentHealth + regenAmount;

  // Regen Stamina and Resolve
  if (true) {
    const classHP = getVariable<VariableNum>(id, 'MAX_HEALTH_CLASS_PER_LEVEL')!.value;
    const newStamina = (Math.floor(classHP / 2) + conMod) * level;

    let keyMod = 0;
    const classDC = getVariable<VariableProf>(id, 'CLASS_DC')!;
    if (classDC.value.attribute) {
      keyMod = getVariable<VariableAttr>(id, classDC.value.attribute)?.value.value ?? 0;
    }
    const newResolve = keyMod;

    newEntity.stamina_current = newStamina;
    newEntity.resolve_current = newResolve;
  }

  // Set spells to default
  const spellData = collectEntitySpellcasting(id, newEntity);
  newEntity.spells = newEntity.spells ?? {
    slots: [],
    list: [],
    focus_point_current: 0,
    innate_casts: [],
  };

  // Reset Innate Spells
  newEntity.spells = {
    ...newEntity.spells,
    innate_casts:
      newEntity.spells?.innate_casts.map((casts) => {
        return {
          ...casts,
          casts_current: 0,
        };
      }) ?? [],
  };

  // Reset Focus Points
  const focusPoints = getFocusPoints(id, newEntity, spellData.focus);
  newEntity.spells = {
    ...newEntity.spells,
    focus_point_current: focusPoints.max,
  };

  // Reset Spell Slots
  newEntity.spells = {
    ...newEntity.spells,
    slots:
      newEntity.spells?.slots.map((slot) => {
        return {
          ...slot,
          exhausted: false,
        };
      }) ?? [],
  };

  // Reset Staff Charges
  const staves = filterByTraitType(newEntity?.inventory?.items ?? [], 'STAFF').filter((invItem) => invItem.is_equipped);
  let greatestSlotRank = 0;
  for (const slot of spellData.slots) {
    if (slot.rank > greatestSlotRank) {
      greatestSlotRank = slot.rank;
    }
  }
  for (const staff of staves) {
    newEntity.inventory = {
      ...(newEntity.inventory ?? {
        coins: {
          cp: 0,
          sp: 0,
          gp: 0,
          pp: 0,
        },
        items: [],
      }),
      items:
        newEntity.inventory?.items.map((i) => {
          if (i.id !== staff.id) return i;

          // If it's the item, update the charges
          return {
            ...i,
            item: {
              ...i.item,
              meta_data: {
                ...i.item.meta_data!,
                charges: {
                  ...i.item.meta_data?.charges,
                  current: 0,
                  max: greatestSlotRank,
                },
              },
            },
          };
        }) ?? [],
    };
  }

  // Reset Wands
  const wands = filterByTraitType(newEntity?.inventory?.items ?? [], 'WAND');
  for (const wand of wands) {
    newEntity.inventory = {
      ...(newEntity.inventory ?? {
        coins: {
          cp: 0,
          sp: 0,
          gp: 0,
          pp: 0,
        },
        items: [],
      }),
      items:
        newEntity.inventory?.items.map((i) => {
          if (i.id !== wand.id) return i;

          // If it's the item, update the charges
          return {
            ...i,
            item: {
              ...i.item,
              meta_data: {
                ...i.item.meta_data!,
                charges: {
                  ...i.item.meta_data?.charges,
                  current: 0,
                  max: 1,
                },
              },
            },
          };
        }) ?? [],
    };
  }

  // Remove Fatigued Condition
  let newConditions = cloneDeep(entity?.details?.conditions ?? []).filter((c) => c.name !== 'Fatigued');

  // Remove Wounded condition if we're now at full health
  const wounded = newConditions.find((c) => c.name === 'Wounded');
  if (wounded && newEntity.hp_current === maxHealth) {
    newConditions = newConditions.filter((c) => c.name !== 'Wounded');
  }

  // Decrease Drained Condition
  const drained = newConditions.find((c) => c.name === 'Drained');
  if (drained) {
    drained.value = drained.value! - 1;
    if (drained.value! <= 0) {
      newConditions = newConditions.filter((c) => c.name !== 'Drained');
    }
  }

  // Decrease Doomed Condition
  const doomed = newConditions.find((c) => c.name === 'Doomed');
  if (doomed) {
    doomed.value = doomed.value! - 1;
    if (doomed.value! <= 0) {
      newConditions = newConditions.filter((c) => c.name !== 'Doomed');
    }
  }
  newEntity.details = {
    ...newEntity.details,
    conditions: newConditions,
  };

  // Update the entity
  setEntity?.(newEntity);
  return cloneDeep(newEntity);
}
