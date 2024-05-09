import { StoreID, VariableAttr, VariableProf } from '@typing/variables';
import {
  compactLabels,
  findVariable,
  labelToProficiencyType,
  labelToVariable,
  maxProficiencyType,
} from './variable-utils';
import { getAllAttributeVariables, getAllSkillVariables, getVariable } from './variable-manager';
import * as _ from 'lodash-es';
import { toLabel } from '@utils/strings';

type PrereqMet = 'FULLY' | 'PARTIALLY' | 'NOT' | 'UNKNOWN' | null;
export function meetsPrerequisites(
  id: StoreID,
  prereqs?: string[]
): {
  meetMap: Map<string, PrereqMet>;
  result: PrereqMet;
} {
  const meetMap = new Map<string, PrereqMet>();
  if (!prereqs || prereqs.length === 0 || getVariable('CHARACTER', 'PAGE_CONTEXT')?.value !== 'CHARACTER-BUILDER') {
    return {
      meetMap: meetMap,
      result: null,
    };
  }

  for (const prereq of prereqs) {
    const result = meetPreq(id, prereq.trim());
    if (result) {
      meetMap.set(prereq.trim(), result);
    }
  }

  return {
    meetMap: meetMap,
    result: determineFinalResult(meetMap),
  };
}

function determineFinalResult(meetMap: Map<string, PrereqMet>): PrereqMet {
  let finalResult: PrereqMet = 'UNKNOWN';
  for (const result of meetMap.values()) {
    if (result === 'NOT') {
      return 'NOT';
    } else if (result === 'FULLY') {
      if (finalResult === 'UNKNOWN') {
        finalResult = 'FULLY';
      }
    } else if (result === 'PARTIALLY') {
      finalResult = 'PARTIALLY';
    } else if (result === 'UNKNOWN') {
      if (finalResult === 'FULLY') {
        finalResult = 'PARTIALLY';
      }
    }
  }
  return finalResult;
}

function meetPreq(id: StoreID, prereq: string): PrereqMet {
  let result: PrereqMet = null;

  result = checkForProf(id, prereq);
  if (result) return result;

  result = checkForAttribute(id, prereq);
  if (result) return result;

  result = checkForFeat(id, prereq);
  if (result) return result;

  result = checkForClassFeature(id, prereq);
  if (result) return result;

  return 'UNKNOWN';
}

function checkForProf(id: StoreID, prereq: string): PrereqMet {
  const regex = /^(untrained|trained|expert|master|legendary) in ([a-zA-Z]+)$/i;

  const match = prereq.match(regex);
  if (!match) {
    return null;
  }

  const [_, rank, prof] = match;
  const profType = labelToProficiencyType(rank);
  if (!profType) {
    return 'UNKNOWN';
  }

  // Handle Lore separately
  if (prof.toUpperCase() === 'LORE') {
    const lores = getAllSkillVariables(id).filter((v) => v.name.startsWith('SKILL_LORE_'));
    for (const lore of lores) {
      if (maxProficiencyType(lore.value.value, profType) === lore.value.value) {
        return 'FULLY';
      }
    }
    return 'NOT';
  }

  const variable = findVariable<VariableProf>(id, 'prof', prof);

  if (!variable) {
    return 'UNKNOWN';
  }

  return maxProficiencyType(variable.value.value, profType) === variable.value.value ? 'FULLY' : 'NOT';
}

function checkForAttribute(id: StoreID, prereq: string): PrereqMet {
  const attributes = getAllAttributeVariables(id).map((v) => toLabel(v.name.replace('ATTRIBUTE_', '')));
  const regex = new RegExp(`^(${attributes.join('|')}) (\\+?-?\\d+)$`, 'i');

  const match = prereq.match(regex);

  if (!match) {
    return null;
  }

  const [_, attribute, value] = match;
  const variable = findVariable<VariableAttr>(id, 'attr', `ATTRIBUTE_${labelToVariable(compactLabels(attribute))}`);

  if (!variable) {
    return 'UNKNOWN';
  }

  return variable.value.value >= parseInt(value) ? 'FULLY' : 'NOT';
}

function checkForFeat(id: StoreID, prereq: string): PrereqMet {
  // Check if the way it's written is inline with how feats are written
  if (toLabel(prereq) !== prereq) return null;

  return (getVariable(id, 'FEAT_NAMES')!.value as string[]).includes(prereq.toUpperCase()) ? 'FULLY' : 'NOT';
}

function checkForClassFeature(id: StoreID, prereq: string): PrereqMet {
  // Check if the way it's written is inline with how class features are written
  if (prereq.toLowerCase() !== prereq || prereq.split(' ').length >= 4) return null;
  // TODO: Check if the class feature exists, if not, return null

  return (getVariable(id, 'CLASS_FEATURE_NAMES')!.value as string[]).includes(prereq.toUpperCase())
    ? 'FULLY'
    : 'UNKNOWN';
}
