import { AbilityBlock, Character, Language, Spell } from '@typing/content';
import {
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
import { getContent } from '@content/content-controller';
import { throwError } from '@utils/notifications';
import { ObjectWithUUID, determineFilteredSelectionList, determinePredefinedSelectionList } from './operation-utils';

  /*
    Algo:

    - Run value creation for content_source
    - Run value creation for character
    - Run value creation for class
    - Run value creation for ancestry
    - Run value creation for background
    - Run value creation for items

    (skip value creation for these)
    - Run content_source
    - Run character
    - Run class
    - Run ancestry
    - Run background
    - Run items

    - Run conditionals content_source
    - Run conditionals character
    - Run conditionals class
    - Run conditionals ancestry
    - Run conditionals background
    - Run conditionals items


    Operation Selections:

    We only need metadata for the select operator.!!
    Needs to save that we had a selection somewhere, needs to support nested selects.

    ## Key -> Value
    The key doesn't use index anywhere, which is good - it means that metadata won't ever be applies out of sync.

    - Primary Source ID (ex. ancestry-hertiage). Anywhere we start to execute operations needs to have a unique primary source ID.
    - Select operation UUID. Can be multiple, separated by "_"

    ex.
    - background_<UUID>
    - ancestry-heritage_<UUID>_<UUID>_<UUID>
      algo.
        Ancestry heritage has an operation runner with that unique primary source ID.
        Check the operations for a select with the first UUID. If no option is selected


  */

  // setSelections([
  //   {
  //     key: 'ancestry-heritage_1_34_67',
  //     value: 9,
  //   },
  //   {
  //     key: 'ancestry-heritage_1',
  //     value: 1,
  //   },
  //   {
  //     key: 'ancestry-heritage_2_45',
  //     value: 13,
  //   },
  //   {
  //     key: 'ancestry-heritage_1_45',
  //     value: 10,
  //   },
  //   {
  //     key: 'ancestry-heritage_1_45_3',
  //     value: 8,
  //   },
  //   {
  //     key: 'ancestry-heritage',
  //     value: 22,
  //   },
  // ]);

export async function runOperations(
  selectionNode: SelectionTreeNode | undefined,
  operations: Operation[]
) {
  const runOp = async (operation: Operation) => {
    if (operation.type === 'adjValue') {
      await runAdjValue(operation);
    } else if (operation.type === 'setValue') {
      await runSetValue(operation);
    } else if (operation.type === 'createValue') {
      await runCreateValue(operation);
    } else if (operation.type === 'giveAbilityBlock') {
      await runGiveAbilityBlock(selectionNode, operation);
    } else if (operation.type === 'giveLanguage') {
      await runGiveLanguage(operation);
    } else if (operation.type === 'giveSpell') {
      await runGiveSpell(operation);
    } else if (operation.type === 'removeAbilityBlock') {
      await runRemoveAbilityBlock(operation);
    } else if (operation.type === 'removeLanguage') {
      await runRemoveLanguage(operation);
    } else if (operation.type === 'removeSpell') {
      await runRemoveSpell(operation);
    } else if (operation.type === 'select') {
      await runSelect(selectionNode, operation);
    }
  };

  for (const operation of operations) {
    await runOp(operation);
  }

  // Alt. Faster as it runs in parallel but doesn't have consistent execution order
  // await Promise.all(operations.map(runOp));
}


async function runSelect(selectionNode: SelectionTreeNode | undefined, operation: OperationSelect) {
  if (!selectionNode) return;

  let optionList: ObjectWithUUID[] = [];

  if (operation.data.modeType === 'FILTERED' && operation.data.optionsFilters) {
    optionList = await determineFilteredSelectionList(operation.id, operation.data.optionsFilters);
  } else if (operation.data.modeType === 'PREDEFINED' && operation.data.optionsPredefined) {
    optionList = await determinePredefinedSelectionList(
      operation.data.optionType,
      operation.data.optionsPredefined
    );
  }

  const selectedOption = optionList.find((option) => option.id === selectionNode.value);
  if (!selectedOption) {
    throwError(`Selected option "${selectionNode.value}" not found`);
    return;
  }

  if(operation.data.optionType === 'ABILITY_BLOCK'){
    adjVariable('ABILITY_BLOCK_IDS', `${selectedOption.id}`);
    adjVariable('ABILITY_BLOCK_NAMES', selectedOption.name);
  } else if(operation.data.optionType === 'LANGUAGE'){
    adjVariable('LANGUAGE_IDS', `${selectedOption.id}`);
    adjVariable('LANGUAGE_NAMES', selectedOption.name);
  } else if(operation.data.optionType === 'SPELL'){
    adjVariable('SPELL_IDS', `${selectedOption.id}`);
    adjVariable('SPELL_NAMES', selectedOption.name);
  } else if(operation.data.optionType === 'ADJ_VALUE'){
    adjVariable(selectedOption.variable, selectedOption.value);
  } else if(operation.data.optionType === 'CUSTOM'){
    // Doesn't inherently do anything, just runs its operations
  }

  // Run the operations of the selected option
  if(selectedOption.operations){
    await runOperations(selectionNode.children[selectedOption._select_uuid], selectedOption.operations);
  }
}


async function runAdjValue(operation: OperationAdjValue) {
  adjVariable(operation.data.variable, operation.data.value);
}

async function runSetValue(operation: OperationSetValue) {
  setVariable(operation.data.variable, operation.data.value);
}

async function runCreateValue(operation: OperationCreateValue) {
  addVariable(operation.data.type, operation.data.variable, operation.data.value);
}

async function runGiveAbilityBlock(selectionNode: SelectionTreeNode | undefined, operation: OperationGiveAbilityBlock) {
  const abilityBlock = await getContent<AbilityBlock>('ability-block', operation.data.abilityBlockId);
  if (!abilityBlock) {
    throwError('Ability block not found');
    return;
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

  if (abilityBlock.operations) {
    await runOperations(selectionNode?.children[operation.id], abilityBlock.operations);
  }
}

async function runGiveLanguage(operation: OperationGiveLanguage) {
  const language = await getContent<Language>('language', operation.data.languageId);
  if (!language) {
    throwError('Language not found');
    return;
  }

  adjVariable('LANGUAGE_IDS', `${language.id}`);
  adjVariable('LANGUAGE_NAMES', language.name);
}

async function runGiveSpell(operation: OperationGiveSpell) {
  const spell = await getContent<Spell>('spell', operation.data.spellId);
  if (!spell) {
    throwError('Spell not found');
    return;
  }

  adjVariable('SPELL_IDS', `${spell.id}`);
  adjVariable('SPELL_NAMES', spell.name);
}

async function runRemoveAbilityBlock(operation: OperationRemoveAbilityBlock) {
  const abilityBlock = await getContent<AbilityBlock>(
    'ability-block',
    operation.data.abilityBlockId
  );
  if (!abilityBlock) {
    throwError('Ability block not found');
    return;
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
}

async function runRemoveLanguage(operation: OperationRemoveLanguage) {
  const language = await getContent<Language>('language', operation.data.languageId);
  if (!language) {
    throwError('Language not found');
    return;
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
}

async function runRemoveSpell(operation: OperationRemoveSpell) {
  const spell = await getContent<Spell>('spell', operation.data.spellId);
  if (!spell) {
    throwError('Spell not found');
    return;
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
}

