import { StoreID, VariableAttr, VariableProf } from '@typing/variables';
import {
  compactLabels,
  compileProficiencyType,
  findVariable,
  labelToProficiencyType,
  labelToVariable,
  maxProficiencyType,
} from './variable-utils';
import { getAllAttributeVariables, getAllSkillVariables, getVariable } from './variable-manager';
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

function checkingSplitter(checking: string) {
  // Determine the conjunction type
  let type: 'AND' | 'OR';
  if (/ or /i.test(checking)) {
    type = 'OR';
  } else {
    type = 'AND';
  }

  // Split the string into parts
  let options: string[] = [];
  if (type === 'OR') {
    options = checking.split(/,?\s*or\s*/i).map((s) => s.trim());
  } else {
    options = checking.split(/,?\s*and\s*/i).map((s) => s.trim());
  }

  // Further split by comma if necessary
  options = options.flatMap((option) => option.split(/,\s*/).map((s) => s.trim()));

  return { options, type };
}

function handleChecking(text: string, checkFn: (text: string) => PrereqMet): PrereqMet {
  let totalResult: PrereqMet = null;
  const checkings = checkingSplitter(text);
  for (const checking of checkings.options) {
    const result = checkFn(checking);
    if (checkings.type === 'OR') {
      // Return the best result (fully > unknown > not)
      if (result === 'FULLY') {
        // Return early if it's already fully met
        return 'FULLY';
      } else if (result === 'UNKNOWN') {
        totalResult = 'UNKNOWN';
      } else if (result === 'NOT') {
        if (totalResult === null) {
          totalResult = 'NOT';
        }
      }
    } else if (checkings.type === 'AND') {
      if (result === 'NOT') {
        return 'NOT';
      } else if (result === 'FULLY') {
        if (totalResult === null) {
          totalResult = 'FULLY';
        }
      } else if (result === 'UNKNOWN') {
        if (totalResult === 'FULLY') {
          totalResult = 'PARTIALLY';
        } else {
          totalResult = 'UNKNOWN';
        }
      }
    }
  }
  return totalResult;
}

function checkForProf(id: StoreID, prereq: string): PrereqMet {
  const regex = /^(untrained|trained|expert|master|legendary) in (.+)$/i;

  const match = prereq.match(regex);
  if (!match) {
    return null;
  }

  const [_, rank, profText] = match;
  const profType = labelToProficiencyType(rank);
  if (!profType) {
    return 'UNKNOWN';
  }

  const checkProf = (prof: string) => {
    // Handle Lore separately
    if (prof.toUpperCase() === 'LORE') {
      const lores = getAllSkillVariables(id).filter((v) => v.name.startsWith('SKILL_LORE_'));
      for (const lore of lores) {
        if (maxProficiencyType(compileProficiencyType(lore.value), profType) === compileProficiencyType(lore.value)) {
          return 'FULLY';
        }
      }
      return 'NOT';
    }

    const variable = findVariable<VariableProf>(id, 'prof', prof);

    if (!variable) {
      return 'UNKNOWN';
    }

    return maxProficiencyType(compileProficiencyType(variable.value), profType) ===
      compileProficiencyType(variable.value)
      ? 'FULLY'
      : 'NOT';
  };

  return handleChecking(profText, checkProf);
}

function checkForAttribute(id: StoreID, prereq: string): PrereqMet {
  const attributes = getAllAttributeVariables(id).map((v) => toLabel(v.name.replace('ATTRIBUTE_', '')));
  const foundAttr = attributes.find((a) => prereq.includes(a));
  if (!foundAttr) {
    return null;
  }

  const regex = new RegExp(`^(.+) (\\+?-?\\d+)$`, 'i');
  const match = prereq.match(regex);

  if (!match) {
    return null;
  }

  const [_, attributeText, value] = match;

  const checkAttr = (attr: string) => {
    const variable = findVariable<VariableAttr>(id, 'attr', `ATTRIBUTE_${labelToVariable(compactLabels(attr))}`);

    if (!variable) {
      return 'UNKNOWN';
    }

    return variable.value.value >= parseInt(value) ? 'FULLY' : 'NOT';
  };

  return handleChecking(attributeText, checkAttr);
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
