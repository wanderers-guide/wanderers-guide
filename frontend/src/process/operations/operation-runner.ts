import { AbilityBlock, Character, Language, Spell } from '@typing/content';
import {
  ConditionCheckData,
  Operation,
  OperationAdjValue,
  OperationConditional,
  OperationCreateValue,
  OperationGiveAbilityBlock,
  OperationGiveLanguage,
  OperationGiveSpell,
  OperationRemoveAbilityBlock,
  OperationRemoveLanguage,
  OperationRemoveSpell,
  OperationSelect,
  OperationSetValue,
  OperationType,
} from '@typing/operations';
import { addVariable, adjVariable, getVariable, setVariable } from '@variables/variable-manager';
import _ from 'lodash';
import { SelectionTreeNode } from './selection-tree';
import { throwError } from '@utils/notifications';
import {
  ObjectWithUUID,
  determineFilteredSelectionList,
  determinePredefinedSelectionList,
} from './operation-utils';
import { e } from 'mathjs';
import { maxProficiencyType } from '@variables/variable-utils';
import { ExtendedProficiencyType, Proficiency, ProficiencyType } from '@typing/variables';
import { ReactNode } from 'react';
import { fetchContentById } from '@content/content-store';

export type OperationOptions = {
  doOnlyValueCreation?: boolean;
  doConditionals?: boolean;
  doOnlyConditionals?: boolean;
  onlyConditionalsWhitelist?: string[];
};

export type OperationResult = {
  selection?: {
    id: string;
    title?: string;
    description?: string;
    options: ObjectWithUUID[];
    skillAdjustment?: ExtendedProficiencyType;
  };
  result?: {
    source?: ObjectWithUUID;
    results: OperationResult[];
  };
} | null;

export async function runOperations(
  selectionNode: SelectionTreeNode | undefined,
  operations: Operation[],
  options?: OperationOptions
): Promise<OperationResult[]> {
  const runOp = async (operation: Operation): Promise<OperationResult> => {
    if (options?.doOnlyValueCreation) {
      if (operation.type === 'createValue') {
        return await runCreateValue(operation);
      }
      return null;
    }

    if (options?.doOnlyConditionals) {
      if (operation.type === 'conditional') {
        return await runConditional(selectionNode, operation, options);
      }

      if (options.onlyConditionalsWhitelist?.includes(operation.id)) {
        // Continue to run the operation
      } else {
        return null;
      }
    }

    if (options?.doConditionals && operation.type === 'conditional') {
      return await runConditional(selectionNode, operation, options);
    } else if (operation.type === 'adjValue') {
      return await runAdjValue(operation);
    } else if (operation.type === 'setValue') {
      return await runSetValue(operation);
    } else if (operation.type === 'giveAbilityBlock') {
      return await runGiveAbilityBlock(selectionNode, operation, options);
    } else if (operation.type === 'giveLanguage') {
      return await runGiveLanguage(operation);
    } else if (operation.type === 'giveSpell') {
      return await runGiveSpell(operation);
    } else if (operation.type === 'removeAbilityBlock') {
      return await runRemoveAbilityBlock(operation);
    } else if (operation.type === 'removeLanguage') {
      return await runRemoveLanguage(operation);
    } else if (operation.type === 'removeSpell') {
      return await runRemoveSpell(operation);
    } else if (operation.type === 'select') {
      const subNode = selectionNode?.children[operation.id];
      return await runSelect(subNode, operation, options);
    }
    return null;
  };

  const results: OperationResult[] = [];
  for (const operation of operations) {
    results.push(await runOp(operation));
  }

  // Alt. Faster as it runs in parallel but doesn't have consistent execution order
  // await Promise.all(operations.map(runOp));
  return results;
}

async function runSelect(
  selectionNode: SelectionTreeNode | undefined,
  operation: OperationSelect,
  options?: OperationOptions
): Promise<OperationResult> {
  let optionList: ObjectWithUUID[] = [];

  if (operation.data.modeType === 'FILTERED' && operation.data.optionsFilters) {
    optionList = await determineFilteredSelectionList(operation.id, operation.data.optionsFilters);
  } else if (operation.data.modeType === 'PREDEFINED' && operation.data.optionsPredefined) {
    optionList = await determinePredefinedSelectionList(
      operation.data.optionType,
      operation.data.optionsPredefined
    );
  }

  let selected: ObjectWithUUID | undefined = undefined;
  let results: OperationResult[] = [];

  if (selectionNode && selectionNode.value) {
    const selectedOption = optionList.find((option) => option._select_uuid === selectionNode.value);
    if (selectedOption) {
      updateVariables(operation, selectedOption);
    } else {
      console.error('Selected option not found', selectionNode);
      throwError(`Selected option "${selectionNode.value}" not found`);
      return null;
    }
    selected = selectedOption;

    // Run the operations of the selected option
    if (selectedOption.operations) {
      results = await runOperations(
        selectionNode.children[selectedOption._select_uuid],
        selectedOption.operations,
        options
      );
    }
  }

  // Check if all options are skill proficiencies, aka making this a skill increase
  let foundSkills: string[] = [];
  for (const option of optionList) {
    if (option.variable) {
      const variable = getVariable(option.variable);
      if (variable?.type === 'prof' && variable.name.startsWith('SKILL_')) {
        foundSkills.push(variable.name);
      }
    }
  }
  const skillAdjustment =
    optionList.length > 0 && foundSkills.length === optionList.length
      ? optionList[0]?.value
      : undefined;

  return {
    selection: {
      id: operation.id,
      title: operation.data.title,
      description: operation.data.description,
      options: optionList,
      skillAdjustment,
    },
    result: selected
      ? {
          source: selected,
          results,
        }
      : undefined,
  };
}

async function updateVariables(operation: OperationSelect, selectedOption: ObjectWithUUID) {
  if (operation.data.optionType === 'ABILITY_BLOCK') {
    if (selectedOption.type === 'feat') {
      adjVariable('FEAT_IDS', `${selectedOption.id}`);
      adjVariable('FEAT_NAMES', selectedOption.name);
    } else if (selectedOption.type === 'class-feature') {
      adjVariable('CLASS_FEATURE_IDS', `${selectedOption.id}`);
      adjVariable('CLASS_FEATURE_NAMES', selectedOption.name);
    } else if (selectedOption.type === 'sense') {
      adjVariable('SENSE_IDS', `${selectedOption.id}`);
      adjVariable('SENSE_NAMES', selectedOption.name);
    } else if (selectedOption.type === 'heritage') {
      adjVariable('HERITAGE_IDS', `${selectedOption.id}`);
      adjVariable('HERITAGE_NAMES', selectedOption.name);
    } else if (selectedOption.type === 'physical-feature') {
      adjVariable('PHYSICAL_FEATURE_IDS', `${selectedOption.id}`);
      adjVariable('PHYSICAL_FEATURE_NAMES', selectedOption.name);
    } else {
      throwError(`Invalid ability block type: ${selectedOption.type}`);
    }
  } else if (operation.data.optionType === 'LANGUAGE') {
    adjVariable('LANGUAGE_IDS', `${selectedOption.id}`);
    adjVariable('LANGUAGE_NAMES', selectedOption.name);
  } else if (operation.data.optionType === 'SPELL') {
    adjVariable('SPELL_IDS', `${selectedOption.id}`);
    adjVariable('SPELL_NAMES', selectedOption.name);
  } else if (operation.data.optionType === 'ADJ_VALUE') {
    adjVariable(selectedOption.variable, selectedOption.value);
  } else if (operation.data.optionType === 'CUSTOM') {
    // Doesn't inherently do anything, just runs its operations
  }
}

async function runAdjValue(operation: OperationAdjValue): Promise<OperationResult> {
  adjVariable(operation.data.variable, operation.data.value);
  return null;
}

async function runSetValue(operation: OperationSetValue): Promise<OperationResult> {
  setVariable(operation.data.variable, operation.data.value);
  return null;
}

async function runCreateValue(operation: OperationCreateValue): Promise<OperationResult> {
  addVariable(operation.data.type, operation.data.variable, operation.data.value);
  return null;
}

async function runGiveAbilityBlock(
  selectionNode: SelectionTreeNode | undefined,
  operation: OperationGiveAbilityBlock,
  options?: OperationOptions
): Promise<OperationResult> {
  const abilityBlock = await fetchContentById<AbilityBlock>(
    'ability-block',
    operation.data.abilityBlockId
  );
  if (!abilityBlock) {
    //throwError(`Ability block not found, ${operation.data.abilityBlockId}`);
    return null;
  }

  if (operation.data.type === 'feat') {
    adjVariable('FEAT_IDS', `${abilityBlock.id}`);
    adjVariable('FEAT_NAMES', abilityBlock.name);
  } else if (operation.data.type === 'class-feature') {
    adjVariable('CLASS_FEATURE_IDS', `${abilityBlock.id}`);
    adjVariable('CLASS_FEATURE_NAMES', abilityBlock.name);
  } else if (operation.data.type === 'sense') {
    adjVariable('SENSE_IDS', `${abilityBlock.id}`);
    adjVariable('SENSE_NAMES', abilityBlock.name);
  } else if (operation.data.type === 'heritage') {
    adjVariable('HERITAGE_IDS', `${abilityBlock.id}`);
    adjVariable('HERITAGE_NAMES', abilityBlock.name);
  } else if (operation.data.type === 'physical-feature') {
    adjVariable('PHYSICAL_FEATURE_IDS', `${abilityBlock.id}`);
    adjVariable('PHYSICAL_FEATURE_NAMES', abilityBlock.name);
  }

  let results: OperationResult[] = [];
  if (abilityBlock.operations) {
    results = await runOperations(
      selectionNode?.children[operation.id],
      abilityBlock.operations,
      options
    );
  }

  return {
    result: {
      source: {
        ...abilityBlock,
        _select_uuid: operation.id,
        _content_type: 'ability-block',
      },
      results,
    },
  };
}

async function runGiveLanguage(operation: OperationGiveLanguage): Promise<OperationResult> {
  const language = await fetchContentById<Language>('language', operation.data.languageId);
  if (!language) {
    throwError('Language not found');
    return null;
  }

  adjVariable('LANGUAGE_IDS', `${language.id}`);
  adjVariable('LANGUAGE_NAMES', language.name);
  return null;
}

async function runGiveSpell(operation: OperationGiveSpell): Promise<OperationResult> {
  const spell = await fetchContentById<Spell>('spell', operation.data.spellId);
  if (!spell) {
    throwError('Spell not found');
    return null;
  }

  adjVariable('SPELL_IDS', `${spell.id}`);
  adjVariable('SPELL_NAMES', spell.name);
  return null;
}

async function runRemoveAbilityBlock(
  operation: OperationRemoveAbilityBlock
): Promise<OperationResult> {
  const abilityBlock = await fetchContentById<AbilityBlock>(
    'ability-block',
    operation.data.abilityBlockId
  );
  if (!abilityBlock) {
    //throwError(`Ability block not found, ${operation.data.abilityBlockId}`);
    return null;
  }

  const getVariableList = (variableName: string) => {
    return (getVariable(variableName)?.value ?? []) as string[];
  };

  if (operation.data.type === 'feat') {
    setVariable(
      'FEAT_IDS',
      getVariableList('FEAT_IDS').filter((id) => id !== `${abilityBlock.id}`)
    );
    setVariable(
      'FEAT_NAMES',
      getVariableList('FEAT_NAMES').filter((name) => name !== abilityBlock.name)
    );
  } else if (operation.data.type === 'class-feature') {
    setVariable(
      'CLASS_FEATURE_IDS',
      getVariableList('CLASS_FEATURE_IDS').filter((id) => id !== `${abilityBlock.id}`)
    );
    setVariable(
      'CLASS_FEATURE_NAMES',
      getVariableList('CLASS_FEATURE_NAMES').filter((name) => name !== abilityBlock.name)
    );
  } else if (operation.data.type === 'sense') {
    setVariable(
      'SENSE_IDS',
      getVariableList('SENSE_IDS').filter((id) => id !== `${abilityBlock.id}`)
    );
    setVariable(
      'SENSE_NAMES',
      getVariableList('SENSE_NAMES').filter((name) => name !== abilityBlock.name)
    );
  } else if (operation.data.type === 'heritage') {
    setVariable(
      'HERITAGE_IDS',
      getVariableList('HERITAGE_IDS').filter((id) => id !== `${abilityBlock.id}`)
    );
    setVariable(
      'HERITAGE_NAMES',
      getVariableList('HERITAGE_NAMES').filter((name) => name !== abilityBlock.name)
    );
  } else if (operation.data.type === 'physical-feature') {
    setVariable(
      'PHYSICAL_FEATURE_IDS',
      getVariableList('PHYSICAL_FEATURE_IDS').filter((id) => id !== `${abilityBlock.id}`)
    );
    setVariable(
      'PHYSICAL_FEATURE_NAMES',
      getVariableList('PHYSICAL_FEATURE_NAMES').filter((name) => name !== abilityBlock.name)
    );
  }
  return null;
}

async function runRemoveLanguage(operation: OperationRemoveLanguage): Promise<OperationResult> {
  const language = await fetchContentById<Language>('language', operation.data.languageId);
  if (!language) {
    throwError('Language not found');
    return null;
  }

  const getVariableList = (variableName: string) => {
    return (getVariable(variableName)?.value ?? []) as string[];
  };

  setVariable(
    'LANGUAGE_IDS',
    getVariableList('LANGUAGE_IDS').filter((id) => id !== `${language.id}`)
  );
  setVariable(
    'LANGUAGE_NAMES',
    getVariableList('LANGUAGE_NAMES').filter((name) => name !== language.name)
  );
  return null;
}

async function runRemoveSpell(operation: OperationRemoveSpell): Promise<OperationResult> {
  const spell = await fetchContentById<Spell>('spell', operation.data.spellId);
  if (!spell) {
    throwError('Spell not found');
    return null;
  }

  const getVariableList = (variableName: string) => {
    return (getVariable(variableName)?.value ?? []) as string[];
  };

  setVariable(
    'SPELL_IDS',
    getVariableList('SPELL_IDS').filter((id) => id !== `${spell.id}`)
  );
  setVariable(
    'SPELL_NAMES',
    getVariableList('SPELL_NAMES').filter((name) => name !== spell.name)
  );
  return null;
}

async function runConditional(
  selectionNode: SelectionTreeNode | undefined,
  operation: OperationConditional,
  options?: OperationOptions
): Promise<OperationResult> {
  const makeCheck = (check: ConditionCheckData) => {
    const variable = getVariable(check.name);
    if (!variable) return false;

    if (variable.type === 'attr') {
      const value = parseInt(check.value);
      if (check.operator === 'EQUALS') {
        return variable.value.value === value;
      } else if (check.operator === 'GREATER_THAN') {
        return variable.value.value > value;
      } else if (check.operator === 'LESS_THAN') {
        return variable.value.value < value;
      } else if (check.operator === 'NOT_EQUALS') {
        return variable.value.value !== value;
      }
    } else if (variable.type === 'num') {
      const value = parseInt(check.value);
      if (check.operator === 'EQUALS') {
        return variable.value === value;
      } else if (check.operator === 'GREATER_THAN') {
        return variable.value > value;
      } else if (check.operator === 'LESS_THAN') {
        return variable.value < value;
      } else if (check.operator === 'NOT_EQUALS') {
        return variable.value !== value;
      }
    } else if (variable.type === 'str') {
      if (check.operator === 'EQUALS') {
        return variable.value === check.value;
      } else if (check.operator === 'NOT_EQUALS') {
        return variable.value !== check.value;
      } else if (check.operator === 'INCLUDES') {
        return variable.value.includes(check.value);
      }
    } else if (variable.type === 'bool') {
      if (check.operator === 'EQUALS') {
        return variable.value === (check.value === 'TRUE');
      } else if (check.operator === 'NOT_EQUALS') {
        return variable.value !== (check.value === 'TRUE');
      }
    } else if (variable.type === 'list-str') {
      let value: string[] = [];
      try {
        value = JSON.parse(check.value);
      } catch (e) {}
      if (check.operator === 'EQUALS') {
        return _.isEqual(variable.value, value);
      } else if (check.operator === 'NOT_EQUALS') {
        return !_.isEqual(variable.value, value);
      } else if (check.operator === 'INCLUDES') {
        return variable.value.includes(check.value);
      }
    } else if (variable.type === 'prof') {
      if (check.operator === 'EQUALS') {
        return variable.value.value === check.value;
      } else if (check.operator === 'GREATER_THAN') {
        const bestProf = maxProficiencyType(variable.value.value, check.value as ProficiencyType);
        return bestProf === variable.value.value;
      } else if (check.operator === 'LESS_THAN') {
        const bestProf = maxProficiencyType(variable.value.value, check.value as ProficiencyType);
        return bestProf === check.value;
      } else if (check.operator === 'NOT_EQUALS') {
        return variable.value.value !== check.value;
      }
    }
    return false;
  };

  let isTrue = true;
  for (const check of operation.data.conditions) {
    if (!makeCheck(check)) {
      isTrue = false;
    }
  }

  let results: OperationResult[] = [];
  if (isTrue) {
    results = await runOperations(selectionNode, operation.data.trueOperations ?? [], {
      ...options,
      doOnlyConditionals: false,
      doConditionals: true,
    });
  } else {
    results = await runOperations(selectionNode, operation.data.falseOperations ?? [], {
      ...options,
      doOnlyConditionals: false,
      doConditionals: true,
    });
  }

  return {
    result: {
      source: undefined, // use the parent source
      results,
    },
  };
}
