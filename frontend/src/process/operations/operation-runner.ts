import { fetchContentById } from '@content/content-store';
import { AbilityBlock, Item, Language, Spell, Trait } from '@typing/content';
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
  OperationGiveTrait,
  OperationInjectSelectOption,
  OperationInjectText,
  OperationRemoveAbilityBlock,
  OperationRemoveLanguage,
  OperationRemoveSpell,
  OperationSelect,
  OperationSetValue,
} from '@typing/operations';
import {
  ExtendedProficiencyType,
  ProficiencyType,
  ProficiencyValue,
  StoreID,
  VariableNum,
  VariableProf,
} from '@typing/variables';
import { displayError, throwError } from '@utils/notifications';
import {
  addVariable,
  addVariableBonus,
  adjVariable,
  getVariable,
  getVariables,
  setVariable,
} from '@variables/variable-manager';
import { labelToVariable, maxProficiencyType } from '@variables/variable-utils';
import * as _ from 'lodash-es';
import {
  ObjectWithUUID,
  determineFilteredSelectionList,
  determinePredefinedSelectionList,
  extendOperations,
} from './operation-utils';
import { SelectionTrack } from './selection-tree';

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
  selectionTrack: SelectionTrack,
  operations: Operation[],
  options?: OperationOptions,
  sourceLabel?: string
): Promise<OperationResult[]> {
  const runOp = async (operation: Operation): Promise<OperationResult> => {
    // Value creation
    if (options?.doOnlyValueCreation) {
      if (operation.type === 'createValue') {
        return await runCreateValue(varId, operation, sourceLabel);
      } else if (operation.type === 'giveTrait') {
        return await runGiveTrait(varId, operation, sourceLabel);
      } else if (operation.type === 'injectSelectOption') {
        // Needs to be injected before the select operation
        return await runInjectSelectOption(varId, operation, sourceLabel);
      } else if (operation.type === 'giveAbilityBlock') {
        // Run the ability block but only to pass the create variables
        return await runGiveAbilityBlock(varId, selectionTrack, operation, options, sourceLabel);
      } else if (operation.type === 'select') {
        const subNode = selectionTrack.node?.children[operation.id];
        // Run the select operation but only the parts that create variables
        return await runSelect(
          varId,
          { path: `${selectionTrack.path}_${subNode?.value}`, node: subNode },
          operation,
          options,
          sourceLabel
        );
      }
      return null;
    }

    // Conditionals
    if (options?.doOnlyConditionals) {
      if (operation.type === 'conditional') {
        return await runConditional(varId, selectionTrack, operation, options, sourceLabel);
      } else if (operation.type === 'giveAbilityBlock') {
        // Run the ability block but only to pass the conditional check
        return await runGiveAbilityBlock(varId, selectionTrack, operation, options, sourceLabel);
      } else if (operation.type === 'select') {
        const subNode = selectionTrack.node?.children[operation.id];
        // Run the select operation but only the parts that are conditionals
        return await runSelect(
          varId,
          { path: `${selectionTrack.path}_${subNode?.value}`, node: subNode },
          operation,
          options,
          sourceLabel
        );
      }

      if (options.onlyConditionalsWhitelist?.includes(operation.id)) {
        // Continue to run the operation
      } else {
        return null;
      }
    }

    // Normal
    if (options?.doConditionals && operation.type === 'conditional') {
      return await runConditional(varId, selectionTrack, operation, options, sourceLabel);
    } else if (operation.type === 'adjValue') {
      return await runAdjValue(varId, operation, selectionTrack, sourceLabel);
    } else if (operation.type === 'setValue') {
      return await runSetValue(varId, operation, sourceLabel);
    } else if (operation.type === 'addBonusToValue') {
      return await runAddBonusToValue(varId, operation, sourceLabel);
    } else if (operation.type === 'giveAbilityBlock') {
      return await runGiveAbilityBlock(varId, selectionTrack, operation, options, sourceLabel);
    } else if (operation.type === 'giveLanguage') {
      return await runGiveLanguage(varId, operation, sourceLabel);
    } else if (operation.type === 'giveItem') {
      return await runGiveItem(varId, operation, sourceLabel);
    } else if (operation.type === 'giveTrait') {
      return await runGiveTrait(varId, operation, sourceLabel);
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
    } else if (operation.type === 'injectText') {
      return await runInjectText(varId, operation, sourceLabel);
    } else if (operation.type === 'select') {
      const subNode = selectionTrack.node?.children[operation.id];
      return await runSelect(
        varId,
        { path: `${selectionTrack.path}_${subNode?.value}`, node: subNode },
        operation,
        options,
        sourceLabel
      );
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
  selectionTrack: SelectionTrack,
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
      operation.id,
      operation.data.optionType,
      operation.data.optionsPredefined
    );
  }

  let selected: ObjectWithUUID | undefined = undefined;
  let results: OperationResult[] = [];

  if (selectionTrack.node && selectionTrack.node.value) {
    let selectedOption = optionList.find((option) => option._select_uuid === selectionTrack.node?.value);
    if (selectedOption) {
      updateVariables(varId, operation, selectedOption, sourceLabel, options);
    } else if (operation.data.optionType === 'ABILITY_BLOCK') {
      // It's probably a feat we selected from an archetype so it's not in the list, let's fetch it
      const abilityBlock = await fetchContentById<AbilityBlock>('ability-block', parseInt(selectionTrack.node.value));
      if (!abilityBlock) {
        displayError(`Selected node "${selectionTrack.path}" not found`, true);
        return null;
      }
      selectedOption = {
        ...abilityBlock,
        _select_uuid: `${abilityBlock.id}`,
        _content_type: 'ability-block',
      } satisfies ObjectWithUUID;
      updateVariables(varId, operation, selectedOption, sourceLabel, options);
    } else {
      /*
        We don't display an error on value creation because, with trait giving, we can have values
        that give access to other selection options. In the later passthroughs, they find the options
        correctly but for this first value creation-only pass, it may not find the option due to not
        having created the values to give access to those options yet.
        * This results in a known bug where values that are created can give access to selected options
        that might also want to create values but they won't be able to find the selected option and
        therefore can't create that value.
        God I hope that doesn't become too big of a problem in the future 🤞
      */
      if (!options?.doOnlyValueCreation) {
        displayError(`Selected node "${selectionTrack.path}" not found`, true);
      }
      return null;
    }
    selected = selectedOption;

    // Run the operations of the selected option
    const subOperations = await extendOperations(selectedOption, selectedOption.operations);
    if (subOperations.length > 0) {
      const subNode = selectionTrack.node?.children[selectedOption._select_uuid];
      results = await runOperations(
        varId,
        { path: `${selectionTrack.path}_${subNode?.value}`, node: subNode },
        subOperations,
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
  sourceLabel?: string,
  options?: OperationOptions
) {
  if (options && options.doOnlyConditionals) {
    if (options.onlyConditionalsWhitelist?.includes(operation.id)) {
      // Continue to update the variables
    } else {
      return;
    }
  }
  if (options && options.doOnlyValueCreation) {
    // Create variables based on the selected option
    if (operation.data.optionType === 'TRAIT') {
      if (selectedOption.meta_data?.class_trait) {
        addVariable(
          varId,
          'num',
          labelToVariable(`TRAIT_CLASS_${selectedOption.name}_IDS`),
          selectedOption.id,
          sourceLabel
        );
      } else if (selectedOption.meta_data?.archetype_trait) {
        addVariable(
          varId,
          'num',
          labelToVariable(`TRAIT_ARCHETYPE_${selectedOption.name}_IDS`),
          selectedOption.id,
          sourceLabel
        );
      } else if (
        selectedOption.meta_data?.ancestry_trait ||
        selectedOption.meta_data?.creature_trait ||
        selectedOption.meta_data?.versatile_heritage_trait
      ) {
        addVariable(
          varId,
          'num',
          labelToVariable(`TRAIT_ANCESTRY_${selectedOption.name}_IDS`),
          selectedOption.id,
          sourceLabel
        );
      }
    }
    return;
  }

  // Adjust variables based on the selected option
  if (operation.data.optionType === 'ABILITY_BLOCK') {
    if (selectedOption.type === 'feat') {
      adjVariable(varId, 'FEAT_IDS', `${selectedOption.id}`, sourceLabel);
      adjVariable(varId, 'FEAT_NAMES', selectedOption.name.toUpperCase(), sourceLabel);
    } else if (selectedOption.type === 'class-feature') {
      adjVariable(varId, 'CLASS_FEATURE_IDS', `${selectedOption.id}`, sourceLabel);
      adjVariable(varId, 'CLASS_FEATURE_NAMES', selectedOption.name.toUpperCase(), sourceLabel);
    } else if (selectedOption.type === 'sense') {
      adjVariable(varId, 'SENSE_IDS', `${selectedOption.id}`, sourceLabel);
      adjVariable(varId, 'SENSE_NAMES', selectedOption.name.toUpperCase(), sourceLabel);
    } else if (selectedOption.type === 'heritage') {
      adjVariable(varId, 'HERITAGE_IDS', `${selectedOption.id}`, sourceLabel);
      adjVariable(varId, 'HERITAGE_NAMES', selectedOption.name.toUpperCase(), sourceLabel);
    } else if (selectedOption.type === 'physical-feature') {
      adjVariable(varId, 'PHYSICAL_FEATURE_IDS', `${selectedOption.id}`, sourceLabel);
      adjVariable(varId, 'PHYSICAL_FEATURE_NAMES', selectedOption.name.toUpperCase(), sourceLabel);
    } else if (selectedOption.type === 'mode') {
      adjVariable(varId, 'MODE_IDS', `${selectedOption.id}`, sourceLabel);
      adjVariable(varId, 'MODE_NAMES', selectedOption.name.toUpperCase(), sourceLabel);
    } else {
      throwError(`Invalid ability block type: ${selectedOption.type}`);
    }
  } else if (operation.data.optionType === 'LANGUAGE') {
    adjVariable(varId, 'LANGUAGE_IDS', `${selectedOption.id}`, sourceLabel);
    adjVariable(varId, 'LANGUAGE_NAMES', selectedOption.name.toUpperCase(), sourceLabel);
  } else if (operation.data.optionType === 'SPELL') {
    adjVariable(varId, 'SPELL_IDS', `${selectedOption.id}`, sourceLabel);
    adjVariable(varId, 'SPELL_NAMES', selectedOption.name.toUpperCase(), sourceLabel);

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

function isProficientInAdjValue(varId: StoreID, operation: OperationAdjValue): boolean {
  if (!operation.data.variable.includes('SKILL_')) {
    // Not a skill adjustment
    return false;
  }
  // If character has the skill proficiency, give another skill selection
  let variable = getVariables(varId)[operation.data.variable] as VariableProf;
  const maxProficiency = maxProficiencyType(variable.value.value, (operation.data.value as ProficiencyValue).value);
  return maxProficiency === variable.value.value;
}

async function runAdjValue(
  varId: StoreID,
  operation: OperationAdjValue,
  selectionTrack: SelectionTrack,
  sourceLabel?: string
): Promise<OperationResult> {
  const isProficient = isProficientInAdjValue(varId, operation);
  // If character has the skill proficiency, give another skill selection
  if (isProficient) {
    const subNode = selectionTrack.node?.children[operation.id];
    return await runSelect(
      varId,
      { path: `${selectionTrack.path}_${subNode?.value}`, node: subNode },
      {
        type: 'select',
        id: operation.id,
        data: {
          title: 'Select a Skill',
          modeType: 'FILTERED',
          optionType: 'ADJ_VALUE',
          optionsPredefined: [],
          optionsFilters: {
            id: operation.id,
            type: 'ADJ_VALUE',
            group: 'SKILL',
            value: operation.data.value,
          },
        },
      }
    );
  }
  // Not a skill adjustment nor a character is proficient in the skill
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
  selectionTrack: SelectionTrack,
  operation: OperationGiveAbilityBlock,
  options?: OperationOptions,
  sourceLabel?: string
): Promise<OperationResult> {
  if (operation.data.abilityBlockId === -1) return null;
  const abilityBlock = await fetchContentById<AbilityBlock>('ability-block', operation.data.abilityBlockId);
  if (!abilityBlock) {
    displayError(`Ability block not found, ${operation.data.abilityBlockId}`, true);
    return null;
  }

  if (!options?.doOnlyValueCreation && !options?.doOnlyConditionals) {
    if (operation.data.type === 'feat') {
      adjVariable(varId, 'FEAT_IDS', `${abilityBlock.id}`, sourceLabel);
      adjVariable(varId, 'FEAT_NAMES', abilityBlock.name.toUpperCase(), sourceLabel);
    } else if (operation.data.type === 'class-feature') {
      adjVariable(varId, 'CLASS_FEATURE_IDS', `${abilityBlock.id}`, sourceLabel);
      adjVariable(varId, 'CLASS_FEATURE_NAMES', abilityBlock.name.toUpperCase(), sourceLabel);
    } else if (operation.data.type === 'sense') {
      adjVariable(varId, 'SENSE_IDS', `${abilityBlock.id}`, sourceLabel);
      adjVariable(varId, 'SENSE_NAMES', abilityBlock.name.toUpperCase(), sourceLabel);
    } else if (operation.data.type === 'heritage') {
      adjVariable(varId, 'HERITAGE_IDS', `${abilityBlock.id}`, sourceLabel);
      adjVariable(varId, 'HERITAGE_NAMES', abilityBlock.name.toUpperCase(), sourceLabel);
    } else if (operation.data.type === 'physical-feature') {
      adjVariable(varId, 'PHYSICAL_FEATURE_IDS', `${abilityBlock.id}`, sourceLabel);
      adjVariable(varId, 'PHYSICAL_FEATURE_NAMES', abilityBlock.name.toUpperCase(), sourceLabel);
    } else if (operation.data.type === 'mode') {
      adjVariable(varId, 'MODE_IDS', `${abilityBlock.id}`, sourceLabel);
      adjVariable(varId, 'MODE_NAMES', abilityBlock.name.toUpperCase(), sourceLabel);
    }
  }

  let results: OperationResult[] = [];
  const subOperations = await extendOperations(abilityBlock, abilityBlock.operations);
  if (subOperations.length > 0) {
    const subNode = selectionTrack.node?.children[operation.id];
    results = await runOperations(
      varId,
      { path: `${selectionTrack.path}_${subNode?.value}`, node: subNode },
      subOperations,
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
  if (operation.data.languageId === -1) return null;
  const language = await fetchContentById<Language>('language', operation.data.languageId);
  if (!language) {
    displayError(`Language not found: ${operation.data.languageId}`, true);
    return null;
  }

  adjVariable(varId, 'LANGUAGE_IDS', `${language.id}`, sourceLabel);
  adjVariable(varId, 'LANGUAGE_NAMES', language.name.toUpperCase(), sourceLabel);
  return null;
}

async function runGiveItem(
  varId: StoreID,
  operation: OperationGiveItem,
  sourceLabel?: string
): Promise<OperationResult> {
  if (operation.data.itemId === -1) return null;
  const item = await fetchContentById<Item>('item', operation.data.itemId);
  if (!item) {
    displayError(`Item not found: ${operation.data.itemId}`, true);
    return null;
  }

  adjVariable(varId, 'EXTRA_ITEM_IDS', `${item.id}`, sourceLabel);
  adjVariable(varId, 'EXTRA_ITEM_NAMES', item.name.toUpperCase(), sourceLabel);
  return null;
}

async function runGiveTrait(
  varId: StoreID,
  operation: OperationGiveTrait,
  sourceLabel?: string
): Promise<OperationResult> {
  if (operation.data.traitId === -1) return null;
  const trait = await fetchContentById<Trait>('trait', operation.data.traitId);
  if (!trait) {
    displayError(`Trait not found: ${operation.data.traitId}`, true);
    return null;
  }

  // Create variables because we run variable creation first
  if (trait.meta_data?.class_trait) {
    addVariable(varId, 'num', labelToVariable(`TRAIT_CLASS_${trait.name}_IDS`), trait.id, sourceLabel);
  } else if (trait.meta_data?.archetype_trait) {
    addVariable(varId, 'num', labelToVariable(`TRAIT_ARCHETYPE_${trait.name}_IDS`), trait.id, sourceLabel);
  } else if (
    trait.meta_data?.ancestry_trait ||
    trait.meta_data?.creature_trait ||
    trait.meta_data?.versatile_heritage_trait
  ) {
    addVariable(varId, 'num', labelToVariable(`TRAIT_ANCESTRY_${trait.name}_IDS`), trait.id, sourceLabel);
  } else {
    displayError(
      `Trait is not a class, archetype, ancestry, or creature trait so it can't be given to a character: ${trait.name} (${trait.id})`
    );
  }

  return null;
}

async function runGiveSpell(
  varId: StoreID,
  operation: OperationGiveSpell,
  sourceLabel?: string
): Promise<OperationResult> {
  if (operation.data.spellId === -1) return null;
  const spell = await fetchContentById<Spell>('spell', operation.data.spellId);
  if (!spell) {
    displayError(`Spell not found: ${operation.data.spellId}`, true);
    return null;
  }

  adjVariable(varId, 'SPELL_IDS', `${spell.id}`, sourceLabel);
  adjVariable(varId, 'SPELL_NAMES', spell.name.toUpperCase(), sourceLabel);

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

async function runInjectSelectOption(
  varId: StoreID,
  operation: OperationInjectSelectOption,
  sourceLabel?: string
): Promise<OperationResult> {
  adjVariable(varId, 'INJECT_SELECT_OPTIONS', operation.data.value, sourceLabel);
  return null;
}

async function runInjectText(
  varId: StoreID,
  operation: OperationInjectText,
  sourceLabel?: string
): Promise<OperationResult> {
  adjVariable(
    varId,
    'INJECT_TEXT',
    JSON.stringify({
      type: operation.data.type,
      id: operation.data.id,
      text: operation.data.text,
    }),
    sourceLabel
  );
  return null;
}

async function runRemoveAbilityBlock(
  varId: StoreID,
  operation: OperationRemoveAbilityBlock,
  sourceLabel?: string
): Promise<OperationResult> {
  if (operation.data.abilityBlockId === -1) return null;
  const abilityBlock = await fetchContentById<AbilityBlock>('ability-block', operation.data.abilityBlockId);
  if (!abilityBlock) {
    displayError(`Ability block not found, ${operation.data.abilityBlockId}`, true);
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
      getVariableList(varId, 'FEAT_NAMES').filter((name) => name !== abilityBlock.name.toUpperCase()),
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
      getVariableList(varId, 'CLASS_FEATURE_NAMES').filter((name) => name !== abilityBlock.name.toUpperCase()),
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
      getVariableList(varId, 'SENSE_NAMES').filter((name) => name !== abilityBlock.name.toUpperCase()),
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
      getVariableList(varId, 'HERITAGE_NAMES').filter((name) => name !== abilityBlock.name.toUpperCase()),
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
      getVariableList(varId, 'PHYSICAL_FEATURE_NAMES').filter((name) => name !== abilityBlock.name.toUpperCase()),
      sourceLabel
    );
  } else if (operation.data.type === 'mode') {
    setVariable(
      varId,
      'MODE_IDS',
      getVariableList(varId, 'MODE_IDS').filter((id) => id !== `${abilityBlock.id}`),
      sourceLabel
    );
    setVariable(
      varId,
      'MODE_NAMES',
      getVariableList(varId, 'MODE_NAMES').filter((name) => name !== abilityBlock.name.toUpperCase()),
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
  if (operation.data.languageId === -1) return null;
  const language = await fetchContentById<Language>('language', operation.data.languageId);
  if (!language) {
    displayError('Language not found', true);
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
    getVariableList('LANGUAGE_NAMES').filter((name) => name !== language.name.toUpperCase()),
    sourceLabel
  );
  return null;
}

async function runRemoveSpell(
  varId: StoreID,
  operation: OperationRemoveSpell,
  sourceLabel?: string
): Promise<OperationResult> {
  if (operation.data.spellId === -1) return null;
  const spell = await fetchContentById<Spell>('spell', operation.data.spellId);
  if (!spell) {
    displayError('Spell not found', true);
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
    getVariableList('SPELL_NAMES').filter((name) => name !== spell.name.toUpperCase()),
    sourceLabel
  );
  return null;
}

async function runConditional(
  varId: StoreID,
  selectionTrack: SelectionTrack,
  operation: OperationConditional,
  options?: OperationOptions,
  sourceLabel?: string
): Promise<OperationResult> {
  const makeCheck = (check: ConditionCheckData) => {
    let variable = getVariable(varId, check.name);

    if (!variable) {
      // if (!check.type) {
      //   return false;
      // }
      // // Create the variable if it doesn't exist with default values
      // addVariable(varId, check.type, check.name);
      // variable = getVariable(varId, check.name);

      // if (!variable) {
      //   return false;
      // }
      return false;
    }

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
      } else if (check.operator === 'GREATER_THAN_OR_EQUALS') {
        return variable.value.value >= value;
      } else if (check.operator === 'LESS_THAN_OR_EQUALS') {
        return variable.value.value <= value;
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
      } else if (check.operator === 'GREATER_THAN_OR_EQUALS') {
        return variable.value >= value;
      } else if (check.operator === 'LESS_THAN_OR_EQUALS') {
        return variable.value <= value;
      }
    } else if (variable.type === 'str') {
      if (check.operator === 'EQUALS') {
        return variable.value.toUpperCase() === check.value.toUpperCase();
      } else if (check.operator === 'NOT_EQUALS') {
        return variable.value.toUpperCase() !== check.value.toUpperCase();
      } else if (check.operator === 'INCLUDES') {
        return variable.value.includes(check.value.toUpperCase());
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
        value = JSON.parse(check.value.toUpperCase());
      } catch (e) {}
      if (check.operator === 'EQUALS') {
        return _.isEqual(variable.value, value);
      } else if (check.operator === 'NOT_EQUALS') {
        return !_.isEqual(variable.value, value);
      } else if (check.operator === 'INCLUDES') {
        return variable.value.includes(check.value.toUpperCase());
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
      } else if (check.operator === 'GREATER_THAN_OR_EQUALS') {
        const bestProf = maxProficiencyType(variable.value.value, check.value as ProficiencyType);
        return bestProf === variable.value.value || variable.value.value === check.value;
      } else if (check.operator === 'LESS_THAN_OR_EQUALS') {
        const bestProf = maxProficiencyType(variable.value.value, check.value as ProficiencyType);
        return bestProf === check.value || variable.value.value === check.value;
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
      selectionTrack,
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
      selectionTrack,
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
