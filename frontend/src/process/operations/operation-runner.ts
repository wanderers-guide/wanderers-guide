import { AbilityBlock, Language, Spell } from '@typing/content';
import {
  ConditionCheckData,
  GiveSpellData,
  Operation,
  OperationAddBonusToValue,
  OperationAdjValue,
  OperationConditional,
  OperationCreateValue,
  OperationDefineCastingSource,
  OperationGiveAbilityBlock,
  OperationGiveItem,
  OperationGiveLanguage,
  OperationGiveSpell,
  OperationGiveSpellSlot,
  OperationRemoveAbilityBlock,
  OperationRemoveLanguage,
  OperationRemoveSpell,
  OperationSelect,
  OperationSetValue,
} from '@typing/operations';
import { addVariable, addVariableBonus, adjVariable, getVariable, setVariable } from '@variables/variable-manager';
import * as _ from 'lodash-es';
import { SelectionTreeNode } from './selection-tree';
import { displayError, throwError } from '@utils/notifications';
import { ObjectWithUUID, determineFilteredSelectionList, determinePredefinedSelectionList } from './operation-utils';
import { maxProficiencyType } from '@variables/variable-utils';
import { ExtendedProficiencyType, ProficiencyType, StoreID, VariableNum } from '@typing/variables';
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
  varId: StoreID,
  selectionNode: SelectionTreeNode | undefined,
  operations: Operation[],
  options?: OperationOptions,
  sourceLabel?: string
): Promise<OperationResult[]> {
  const runOp = async (operation: Operation): Promise<OperationResult> => {
    if (options?.doOnlyValueCreation) {
      if (operation.type === 'createValue') {
        return await runCreateValue(varId, operation, sourceLabel);
      }
      return null;
    }

    if (options?.doOnlyConditionals) {
      if (operation.type === 'conditional') {
        return await runConditional(varId, selectionNode, operation, options, sourceLabel);
      }

      if (options.onlyConditionalsWhitelist?.includes(operation.id)) {
        // Continue to run the operation
      } else {
        return null;
      }
    }

    if (options?.doConditionals && operation.type === 'conditional') {
      return await runConditional(varId, selectionNode, operation, options, sourceLabel);
    } else if (operation.type === 'adjValue') {
      return await runAdjValue(varId, operation, sourceLabel);
    } else if (operation.type === 'setValue') {
      return await runSetValue(varId, operation, sourceLabel);
    } else if (operation.type === 'addBonusToValue') {
      return await runAddBonusToValue(varId, operation, sourceLabel);
    } else if (operation.type === 'giveAbilityBlock') {
      return await runGiveAbilityBlock(varId, selectionNode, operation, options, sourceLabel);
    } else if (operation.type === 'giveLanguage') {
      return await runGiveLanguage(varId, operation, sourceLabel);
    } else if (operation.type === 'giveItem') {
      return await runGiveItem(varId, operation, sourceLabel);
    } else if (operation.type === 'giveSpell') {
      return await runGiveSpell(varId, operation, sourceLabel);
    } else if (operation.type === 'giveSpellSlot') {
      return await runGiveSpellSlot(varId, operation, sourceLabel);
    } else if (operation.type === 'defineCastingSource') {
      return await runDefineCastingSource(varId, operation, sourceLabel);
    } else if (operation.type === 'removeAbilityBlock') {
      return await runRemoveAbilityBlock(varId, operation, sourceLabel);
    } else if (operation.type === 'removeLanguage') {
      return await runRemoveLanguage(varId, operation, sourceLabel);
    } else if (operation.type === 'removeSpell') {
      return await runRemoveSpell(varId, operation, sourceLabel);
    } else if (operation.type === 'select') {
      const subNode = selectionNode?.children[operation.id];
      return await runSelect(varId, subNode, operation, options, sourceLabel);
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
  varId: StoreID,
  selectionNode: SelectionTreeNode | undefined,
  operation: OperationSelect,
  options?: OperationOptions,
  sourceLabel?: string
): Promise<OperationResult> {
  let optionList: ObjectWithUUID[] = [];

  if (operation.data.modeType === 'FILTERED' && operation.data.optionsFilters) {
    optionList = await determineFilteredSelectionList('CHARACTER', operation.id, operation.data.optionsFilters);
  } else if (operation.data.modeType === 'PREDEFINED' && operation.data.optionsPredefined) {
    optionList = await determinePredefinedSelectionList(
      'CHARACTER',
      operation.data.optionType,
      operation.data.optionsPredefined
    );
  }

  let selected: ObjectWithUUID | undefined = undefined;
  let results: OperationResult[] = [];

  if (selectionNode && selectionNode.value) {
    const selectedOption = optionList.find((option) => option._select_uuid === selectionNode.value);
    if (selectedOption) {
      updateVariables(varId, operation, selectedOption, sourceLabel);
    } else {
      displayError(`Selected option "${selectionNode.value}" not found`);
      return null;
    }
    selected = selectedOption;

    // Run the operations of the selected option
    if (selectedOption.operations) {
      results = await runOperations(
        varId,
        selectionNode.children[selectedOption._select_uuid],
        selectedOption.operations,
        options,
        operation.data.optionType === 'CUSTOM' ? sourceLabel : selectedOption.name ?? 'Unknown'
      );
    }
  }

  // Check if all options are skill proficiencies, aka making this a skill increase
  let foundSkills: string[] = [];
  for (const option of optionList) {
    if (option.variable) {
      const variable = getVariable('CHARACTER', option.variable);
      if (variable?.type === 'prof' && variable.name.startsWith('SKILL_')) {
        foundSkills.push(variable.name);
      }
    }
  }
  const skillAdjustment =
    optionList.length > 0 && foundSkills.length === optionList.length ? optionList[0]?.value?.value : undefined;

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

async function updateVariables(
  varId: StoreID,
  operation: OperationSelect,
  selectedOption: ObjectWithUUID,
  sourceLabel?: string
) {
  if (operation.data.optionType === 'ABILITY_BLOCK') {
    if (selectedOption.type === 'feat') {
      adjVariable(varId, 'FEAT_IDS', `${selectedOption.id}`, sourceLabel);
      adjVariable(varId, 'FEAT_NAMES', selectedOption.name, sourceLabel);
    } else if (selectedOption.type === 'class-feature') {
      adjVariable(varId, 'CLASS_FEATURE_IDS', `${selectedOption.id}`, sourceLabel);
      adjVariable(varId, 'CLASS_FEATURE_NAMES', selectedOption.name, sourceLabel);
    } else if (selectedOption.type === 'sense') {
      adjVariable(varId, 'SENSE_IDS', `${selectedOption.id}`, sourceLabel);
      adjVariable(varId, 'SENSE_NAMES', selectedOption.name, sourceLabel);
    } else if (selectedOption.type === 'heritage') {
      adjVariable(varId, 'HERITAGE_IDS', `${selectedOption.id}`, sourceLabel);
      adjVariable(varId, 'HERITAGE_NAMES', selectedOption.name, sourceLabel);
    } else if (selectedOption.type === 'physical-feature') {
      adjVariable(varId, 'PHYSICAL_FEATURE_IDS', `${selectedOption.id}`, sourceLabel);
      adjVariable(varId, 'PHYSICAL_FEATURE_NAMES', selectedOption.name, sourceLabel);
    } else {
      throwError(`Invalid ability block type: ${selectedOption.type}`);
    }
  } else if (operation.data.optionType === 'LANGUAGE') {
    adjVariable(varId, 'LANGUAGE_IDS', `${selectedOption.id}`, sourceLabel);
    adjVariable(varId, 'LANGUAGE_NAMES', selectedOption.name, sourceLabel);
  } else if (operation.data.optionType === 'SPELL') {
    adjVariable(varId, 'SPELL_IDS', `${selectedOption.id}`, sourceLabel);
    adjVariable(varId, 'SPELL_NAMES', selectedOption.name, sourceLabel);

    adjVariable(
      varId,
      'SPELL_DATA',
      JSON.stringify({
        spellId: selectedOption.id,
        type: selectedOption._meta_data?.type,
        castingSource: selectedOption._meta_data?.castingSource,
        rank: selectedOption._meta_data?.rank,
        tradition: selectedOption._meta_data?.tradition,
        casts: selectedOption._meta_data?.casts,
      } satisfies GiveSpellData),
      sourceLabel
    );

    if (selectedOption._meta_data?.type === 'INNATE') {
      /*
        When you gain an innate spell, you become trained in the spell attack modifier
        and spell DC statistics. At 12th level, these proficiencies increase to expert.
      */
      adjVariable(varId, 'SPELL_ATTACK', { value: 'T' }, sourceLabel);
      adjVariable(varId, 'SPELL_DC', { value: 'T' }, sourceLabel);
      const level = getVariable<VariableNum>(varId, 'LEVEL')?.value;
      if (level && level >= 12) {
        adjVariable(varId, 'SPELL_ATTACK', { value: 'E' }, sourceLabel);
        adjVariable(varId, 'SPELL_DC', { value: 'E' }, sourceLabel);
      }
    }
  } else if (operation.data.optionType === 'ADJ_VALUE') {
    adjVariable(varId, selectedOption.variable, selectedOption.value, sourceLabel);
  } else if (operation.data.optionType === 'CUSTOM') {
    // Doesn't inherently do anything, just runs its operations
  }
}

async function runAdjValue(
  varId: StoreID,
  operation: OperationAdjValue,
  sourceLabel?: string
): Promise<OperationResult> {
  adjVariable(varId, operation.data.variable, operation.data.value, sourceLabel);
  return null;
}

async function runSetValue(
  varId: StoreID,
  operation: OperationSetValue,
  sourceLabel?: string
): Promise<OperationResult> {
  setVariable(varId, operation.data.variable, operation.data.value, sourceLabel);
  return null;
}

async function runCreateValue(
  varId: StoreID,
  operation: OperationCreateValue,
  sourceLabel?: string
): Promise<OperationResult> {
  addVariable(varId, operation.data.type, operation.data.variable, operation.data.value, sourceLabel);
  return null;
}

async function runAddBonusToValue(
  varId: StoreID,
  operation: OperationAddBonusToValue,
  sourceLabel?: string
): Promise<OperationResult> {
  addVariableBonus(
    varId,
    operation.data.variable,
    operation.data.value,
    operation.data.type,
    operation.data.text,
    sourceLabel ?? 'Unknown'
  );
  return null;
}

async function runGiveAbilityBlock(
  varId: StoreID,
  selectionNode: SelectionTreeNode | undefined,
  operation: OperationGiveAbilityBlock,
  options?: OperationOptions,
  sourceLabel?: string
): Promise<OperationResult> {
  const abilityBlock = await fetchContentById<AbilityBlock>('ability-block', operation.data.abilityBlockId);
  if (!abilityBlock) {
    displayError(`Ability block not found, ${operation.data.abilityBlockId}`);
    return null;
  }

  if (operation.data.type === 'feat') {
    adjVariable(varId, 'FEAT_IDS', `${abilityBlock.id}`, sourceLabel);
    adjVariable(varId, 'FEAT_NAMES', abilityBlock.name, sourceLabel);
  } else if (operation.data.type === 'class-feature') {
    adjVariable(varId, 'CLASS_FEATURE_IDS', `${abilityBlock.id}`, sourceLabel);
    adjVariable(varId, 'CLASS_FEATURE_NAMES', abilityBlock.name, sourceLabel);
  } else if (operation.data.type === 'sense') {
    adjVariable(varId, 'SENSE_IDS', `${abilityBlock.id}`, sourceLabel);
    adjVariable(varId, 'SENSE_NAMES', abilityBlock.name, sourceLabel);
  } else if (operation.data.type === 'heritage') {
    adjVariable(varId, 'HERITAGE_IDS', `${abilityBlock.id}`, sourceLabel);
    adjVariable(varId, 'HERITAGE_NAMES', abilityBlock.name, sourceLabel);
  } else if (operation.data.type === 'physical-feature') {
    adjVariable(varId, 'PHYSICAL_FEATURE_IDS', `${abilityBlock.id}`, sourceLabel);
    adjVariable(varId, 'PHYSICAL_FEATURE_NAMES', abilityBlock.name, sourceLabel);
  }

  let results: OperationResult[] = [];
  if (abilityBlock.operations) {
    results = await runOperations(
      varId,
      selectionNode?.children[operation.id],
      abilityBlock.operations,
      options,
      abilityBlock.type === 'feat' || abilityBlock.type === 'class-feature'
        ? `${abilityBlock.name} (Lvl. ${abilityBlock.level})`
        : abilityBlock.name
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

async function runGiveLanguage(
  varId: StoreID,
  operation: OperationGiveLanguage,
  sourceLabel?: string
): Promise<OperationResult> {
  const language = await fetchContentById<Language>('language', operation.data.languageId);
  if (!language) {
    displayError('Language not found');
    return null;
  }

  adjVariable(varId, 'LANGUAGE_IDS', `${language.id}`, sourceLabel);
  adjVariable(varId, 'LANGUAGE_NAMES', language.name, sourceLabel);
  return null;
}

async function runGiveItem(
  varId: StoreID,
  operation: OperationGiveItem,
  sourceLabel?: string
): Promise<OperationResult> {
  const item = await fetchContentById<Language>('item', operation.data.itemId);
  if (!item) {
    displayError('Item not found');
    return null;
  }

  adjVariable(varId, 'EXTRA_ITEM_IDS', `${item.id}`, sourceLabel);
  adjVariable(varId, 'EXTRA_ITEM_NAMES', item.name, sourceLabel);
  return null;
}

async function runGiveSpell(
  varId: StoreID,
  operation: OperationGiveSpell,
  sourceLabel?: string
): Promise<OperationResult> {
  const spell = await fetchContentById<Spell>('spell', operation.data.spellId);
  if (!spell) {
    displayError('Spell not found');
    return null;
  }

  adjVariable(varId, 'SPELL_IDS', `${spell.id}`, sourceLabel);
  adjVariable(varId, 'SPELL_NAMES', spell.name, sourceLabel);

  adjVariable(
    varId,
    'SPELL_DATA',
    JSON.stringify({
      spellId: spell.id,
      type: operation.data.type,
      castingSource: operation.data.castingSource,
      rank: operation.data.rank,
      tradition: operation.data.tradition,
      casts: operation.data.casts,
    } satisfies GiveSpellData),
    sourceLabel
  );

  if (operation.data.type === 'INNATE') {
    /*
      When you gain an innate spell, you become trained in the spell attack modifier
      and spell DC statistics. At 12th level, these proficiencies increase to expert.
    */
    adjVariable(varId, 'SPELL_ATTACK', { value: 'T' }, sourceLabel);
    adjVariable(varId, 'SPELL_DC', { value: 'T' }, sourceLabel);
    const level = getVariable<VariableNum>(varId, 'LEVEL')?.value;
    if (level && level >= 12) {
      adjVariable(varId, 'SPELL_ATTACK', { value: 'E' }, sourceLabel);
      adjVariable(varId, 'SPELL_DC', { value: 'E' }, sourceLabel);
    }
  }

  return null;
}

async function runGiveSpellSlot(
  varId: StoreID,
  operation: OperationGiveSpellSlot,
  sourceLabel?: string
): Promise<OperationResult> {
  for (const slot of operation.data.slots) {
    adjVariable(
      varId,
      'SPELL_SLOTS',
      JSON.stringify({
        ...slot,
        source: operation.data.castingSource,
      }),
      sourceLabel
    );
  }
  return null;
}

async function runDefineCastingSource(
  varId: StoreID,
  operation: OperationDefineCastingSource,
  sourceLabel?: string
): Promise<OperationResult> {
  adjVariable(varId, 'CASTING_SOURCES', operation.data.value, sourceLabel);
  return null;
}

async function runRemoveAbilityBlock(
  varId: StoreID,
  operation: OperationRemoveAbilityBlock,
  sourceLabel?: string
): Promise<OperationResult> {
  const abilityBlock = await fetchContentById<AbilityBlock>('ability-block', operation.data.abilityBlockId);
  if (!abilityBlock) {
    displayError(`Ability block not found, ${operation.data.abilityBlockId}`);
    return null;
  }

  const getVariableList = (varId: StoreID, variableName: string) => {
    return (getVariable(varId, variableName)?.value ?? []) as string[];
  };

  if (operation.data.type === 'feat') {
    setVariable(
      varId,
      'FEAT_IDS',
      getVariableList(varId, 'FEAT_IDS').filter((id) => id !== `${abilityBlock.id}`),
      sourceLabel
    );
    setVariable(
      varId,
      'FEAT_NAMES',
      getVariableList(varId, 'FEAT_NAMES').filter((name) => name !== abilityBlock.name),
      sourceLabel
    );
  } else if (operation.data.type === 'class-feature') {
    setVariable(
      varId,
      'CLASS_FEATURE_IDS',
      getVariableList(varId, 'CLASS_FEATURE_IDS').filter((id) => id !== `${abilityBlock.id}`),
      sourceLabel
    );
    setVariable(
      varId,
      'CLASS_FEATURE_NAMES',
      getVariableList(varId, 'CLASS_FEATURE_NAMES').filter((name) => name !== abilityBlock.name),
      sourceLabel
    );
  } else if (operation.data.type === 'sense') {
    setVariable(
      varId,
      'SENSE_IDS',
      getVariableList(varId, 'SENSE_IDS').filter((id) => id !== `${abilityBlock.id}`),
      sourceLabel
    );
    setVariable(
      varId,
      'SENSE_NAMES',
      getVariableList(varId, 'SENSE_NAMES').filter((name) => name !== abilityBlock.name),
      sourceLabel
    );
  } else if (operation.data.type === 'heritage') {
    setVariable(
      varId,
      'HERITAGE_IDS',
      getVariableList(varId, 'HERITAGE_IDS').filter((id) => id !== `${abilityBlock.id}`),
      sourceLabel
    );
    setVariable(
      varId,
      'HERITAGE_NAMES',
      getVariableList(varId, 'HERITAGE_NAMES').filter((name) => name !== abilityBlock.name),
      sourceLabel
    );
  } else if (operation.data.type === 'physical-feature') {
    setVariable(
      varId,
      'PHYSICAL_FEATURE_IDS',
      getVariableList(varId, 'PHYSICAL_FEATURE_IDS').filter((id) => id !== `${abilityBlock.id}`),
      sourceLabel
    );
    setVariable(
      varId,
      'PHYSICAL_FEATURE_NAMES',
      getVariableList(varId, 'PHYSICAL_FEATURE_NAMES').filter((name) => name !== abilityBlock.name),
      sourceLabel
    );
  }
  return null;
}

async function runRemoveLanguage(
  varId: StoreID,
  operation: OperationRemoveLanguage,
  sourceLabel?: string
): Promise<OperationResult> {
  const language = await fetchContentById<Language>('language', operation.data.languageId);
  if (!language) {
    displayError('Language not found');
    return null;
  }

  const getVariableList = (variableName: string) => {
    return (getVariable(varId, variableName)?.value ?? []) as string[];
  };

  setVariable(
    varId,
    'LANGUAGE_IDS',
    getVariableList('LANGUAGE_IDS').filter((id) => id !== `${language.id}`),
    sourceLabel
  );
  setVariable(
    varId,
    'LANGUAGE_NAMES',
    getVariableList('LANGUAGE_NAMES').filter((name) => name !== language.name),
    sourceLabel
  );
  return null;
}

async function runRemoveSpell(
  varId: StoreID,
  operation: OperationRemoveSpell,
  sourceLabel?: string
): Promise<OperationResult> {
  const spell = await fetchContentById<Spell>('spell', operation.data.spellId);
  if (!spell) {
    displayError('Spell not found');
    return null;
  }

  const getVariableList = (variableName: string) => {
    return (getVariable(varId, variableName)?.value ?? []) as string[];
  };

  setVariable(
    varId,
    'SPELL_IDS',
    getVariableList('SPELL_IDS').filter((id) => id !== `${spell.id}`),
    sourceLabel
  );
  setVariable(
    varId,
    'SPELL_NAMES',
    getVariableList('SPELL_NAMES').filter((name) => name !== spell.name),
    sourceLabel
  );
  return null;
}

async function runConditional(
  varId: StoreID,
  selectionNode: SelectionTreeNode | undefined,
  operation: OperationConditional,
  options?: OperationOptions,
  sourceLabel?: string
): Promise<OperationResult> {
  const makeCheck = (check: ConditionCheckData) => {
    const variable = getVariable(varId, check.name);
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
    results = await runOperations(
      varId,
      selectionNode,
      operation.data.trueOperations ?? [],
      {
        ...options,
        doOnlyConditionals: false,
        doConditionals: true,
      },
      sourceLabel
    );
  } else {
    results = await runOperations(
      varId,
      selectionNode,
      operation.data.falseOperations ?? [],
      {
        ...options,
        doOnlyConditionals: false,
        doConditionals: true,
      },
      sourceLabel
    );
  }

  return {
    result: {
      source: undefined, // use the parent source
      results,
    },
  };
}
