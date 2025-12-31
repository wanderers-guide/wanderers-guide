import { createDefaultOperation } from '@operations/operation-utils';
import { ActionCost, ContentSource, Creature, Trait } from '@typing/content';
import { OperationAddBonusToValue, OperationAdjValue, OperationGiveTrait, OperationSetValue } from '@typing/operations';
import { sign } from './numbers';
import { getAllSaveVariables, getAllSkillVariables } from '@variables/variable-manager';
import { isAttributeValue, labelToVariable } from '@variables/variable-utils';
import { toLabel } from './strings';
import { cloneDeep } from 'lodash-es';
import { getEntityLevel } from '@utils/entity-utils';
import { parseCreatureStatBlock } from '@ai/open-ai-handler';
import { convertGranularCreature } from '@upload/creature-import';
import { fetchContentById, fetchTraits, getContentFast } from '@content/content-store';
import { GranularCreature } from '@typing/index';

export function findCreatureTraits(creature: Creature): number[] {
  return (
    (creature.operations?.filter((op) => op.type === 'giveTrait') as OperationGiveTrait[]).map(
      (op) => op.data.traitId
    ) ?? []
  );
}

export function determineCompanionType(creature: Creature | null): string {
  let companionType = 'Creature';
  if (!creature) {
    return companionType;
  }

  const traits = getContentFast<Trait>('trait', creature ? findCreatureTraits(creature) : []);
  const companionTraits = traits.filter((trait) => trait.meta_data?.companion_type_trait);
  if (companionTraits.length === 0) {
    return companionType;
  }

  return companionTraits[0].name;
}

export function adjustCreature(input: Creature, adjustment: 'ELITE' | 'WEAK') {
  let creature = cloneDeep(input);
  const mod = adjustment === 'ELITE' ? 1 : -1;

  // HP Adjustment
  let hpAdjustment = 0;
  if (getEntityLevel(creature) >= 1 && getEntityLevel(creature) <= 2) {
    hpAdjustment = mod * 10;
  } else if (getEntityLevel(creature) >= 3 && getEntityLevel(creature) <= 5) {
    hpAdjustment = mod * 15;
  } else if (getEntityLevel(creature) >= 6 && getEntityLevel(creature) <= 20) {
    hpAdjustment = mod * 20;
  } else if (getEntityLevel(creature) >= 21) {
    hpAdjustment = mod * 30;
  }

  // Level Adjustment
  if (getEntityLevel(creature) <= 1) {
    creature.level = getEntityLevel(creature) + mod * 2;
  } else {
    creature.level = getEntityLevel(creature) + mod;
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
      type: 'adj',
    },
  } satisfies OperationAddBonusToValue);
  ops.push({
    ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
    data: {
      variable: 'ATTACK_DAMAGE_BONUS',
      text: '',
      value: `${sign(mod * 2)}`,
      type: 'adj',
    },
  } satisfies OperationAddBonusToValue);
  ops.push({
    ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
    data: {
      variable: 'SPELL_DC',
      text: '',
      value: `${sign(mod * 2)}`,
      type: 'adj',
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
        type: 'adj',
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
      type: 'adj',
    },
  } satisfies OperationAddBonusToValue);
  for (const skill of getAllSkillVariables(STORE_ID)) {
    ops.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: skill.name,
        text: '',
        value: `${sign(mod * 2)}`,
        type: 'adj',
      },
    } satisfies OperationAddBonusToValue);
  }

  creature.operations = ops;

  creature.name = `${creature.name} (${adjustment === 'ELITE' ? 'elite' : 'weak'})`;
  creature.details.adjustment = adjustment;

  return cloneDeep(creature);
}

export async function extractCreatureInfo(
  sourceId: number,
  text: string
): Promise<{
  creature: Creature;
  granular: GranularCreature;
  source: ContentSource;
} | null> {
  const contentSource = await fetchContentById<ContentSource>('content-source', sourceId);
  if (!contentSource) {
    console.error('Content source not found for ID:', sourceId);
    return null;
  }

  const granularCreature = await parseCreatureStatBlock(text);
  if (!granularCreature) {
    console.error('Failed to parse creature stat block from text:', text);
    return null;
  }

  console.log(granularCreature);

  const creature = await convertGranularCreature(contentSource, granularCreature);

  return {
    creature: creature,
    granular: granularCreature,
    source: contentSource,
  };
}
