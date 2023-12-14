import { StoreID, VariableProf } from '@typing/variables';
import { findVariable, labelToProficiencyType, maxProficiencyType } from './variable-utils';
import { getVariable } from './variable-manager';
import _ from 'lodash';

type PrereqMet = 'FULLY' | 'PARTIALLY' | 'NOT' | 'UNKNOWN' | null;
export function meetsPrerequisites(
  id: StoreID,
  prereqs?: string[]
): {
  meetMap: Map<string, PrereqMet>;
  result: PrereqMet;
} {
  const meetMap = new Map<string, PrereqMet>();
  if (!prereqs || prereqs.length === 0 || getVariable(id, 'PAGE_CONTEXT')?.value === 'OUTSIDE') {
    return {
      meetMap: meetMap,
      result: null,
    };
  }

  for (const prereq of prereqs) {
    const result = meetPreq(id, prereq);
    if (result) {
      meetMap.set(prereq, result);
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

  result = checkForFeat(id, prereq);
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
  const variable = findVariable<VariableProf>(id, 'prof', prof);
  if (!variable) {
    return 'UNKNOWN';
  }

  return maxProficiencyType(variable.value.value, profType) === variable.value.value
    ? 'FULLY'
    : 'NOT';
}

function checkForFeat(id: StoreID, prereq: string): PrereqMet {
  // TODO: check for if feat actually exists
  // For now, we'll just check if the way it's written is inline with how feats are written
  if (_.startCase(prereq.toLowerCase()) !== prereq) return null;

  return (getVariable(id, 'FEAT_NAMES')!.value as string[]).includes(prereq) ? 'FULLY' : 'NOT';
}
