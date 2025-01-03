import { createDefaultOperation } from '@operations/operation-utils';
import { Creature } from '@typing/content';
import { OperationAddBonusToValue, OperationAdjValue, OperationGiveTrait, OperationSetValue } from '@typing/operations';
import { sign } from './numbers';
import { getAllSaveVariables, getAllSkillVariables } from '@variables/variable-manager';
import _ from 'lodash-es';
import { isAttributeValue } from '@variables/variable-utils';

export function findCreatureTraits(creature: Creature) {
  return (
    (creature.operations?.filter((op) => op.type === 'giveTrait') as OperationGiveTrait[]).map(
      (op) => op.data.traitId
    ) ?? []
  );
}

export function adjustCreature(input: Creature, adjustment: 'ELITE' | 'WEAK') {
  let creature = _.cloneDeep(input);
  const mod = adjustment === 'ELITE' ? 1 : -1;

  // HP Adjustment
  let hpAdjustment = 0;
  if (creature.level >= 1 && creature.level <= 2) {
    hpAdjustment = mod * 10;
  } else if (creature.level >= 3 && creature.level <= 5) {
    hpAdjustment = mod * 15;
  } else if (creature.level >= 6 && creature.level <= 20) {
    hpAdjustment = mod * 20;
  } else if (creature.level >= 21) {
    hpAdjustment = mod * 30;
  }

  // Level Adjustment
  if (creature.level <= 1) {
    creature.level = creature.level + mod * 2;
  } else {
    creature.level = creature.level + mod;
  }

  // Min level is -1
  creature.level = Math.max(creature.level, -1);

  const ops = creature.operations ?? [];
  const STORE_ID = `CREATURE_${creature.id}`;

  // Tweak HP for level * CON adjustment
  const conAttr = (
    ops.find((op) => op.type === 'setValue' && op.data.variable === 'ATTRIBUTE_CON') as OperationSetValue
  )?.data.value;
  if (isAttributeValue(conAttr)) {
    hpAdjustment -= mod * conAttr.value;
  }

  // HP
  ops.push({
    ...createDefaultOperation<OperationAdjValue>('adjValue'),
    data: {
      variable: 'MAX_HEALTH_BONUS',
      value: hpAdjustment,
    },
  } satisfies OperationAdjValue);

  // AC
  ops.push({
    ...createDefaultOperation<OperationAdjValue>('adjValue'),
    data: {
      variable: 'AC_BONUS',
      value: mod * 2,
    },
  } satisfies OperationAdjValue);

  // Attacks
  ops.push({
    ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
    data: {
      variable: 'ATTACK_ROLLS_BONUS',
      text: '',
      value: `${sign(mod * 2)}`,
    },
  } satisfies OperationAddBonusToValue);
  ops.push({
    ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
    data: {
      variable: 'ATTACK_DAMAGE_BONUS',
      text: '',
      value: `${sign(mod * 2)}`,
    },
  } satisfies OperationAddBonusToValue);
  ops.push({
    ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
    data: {
      variable: 'SPELL_DC',
      text: '',
      value: `${sign(mod * 2)}`,
    },
  } satisfies OperationAddBonusToValue);

  // Saves
  for (const save of getAllSaveVariables(STORE_ID)) {
    ops.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: save.name,
        text: '',
        value: `${sign(mod * 2)}`,
      },
    } satisfies OperationAddBonusToValue);
  }

  // Skills
  ops.push({
    ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
    data: {
      variable: 'PERCEPTION',
      text: '',
      value: `${sign(mod * 2)}`,
    },
  } satisfies OperationAddBonusToValue);
  for (const skill of getAllSkillVariables(STORE_ID)) {
    ops.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: skill.name,
        text: '',
        value: `${sign(mod * 2)}`,
      },
    } satisfies OperationAddBonusToValue);
  }

  creature.operations = ops;

  creature.name = `${creature.name} (${adjustment === 'ELITE' ? 'elite' : 'weak'})`;
  creature.details.adjustment = adjustment;

  return _.cloneDeep(creature);
}
