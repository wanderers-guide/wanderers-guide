import { fetchContentById, getCachedContent } from '@content/content-store';
import { getModeKey } from '@common/modes/mode-rules';
import { requiresFinalSkillSelection } from './custom-selection-rules';
import { AbilityBlock, Item, Language, Spell, Trait } from '@schemas/content';
import {
  ConditionCheckData,
  getContributionCheck,
  validateContributionChecks,
  GiveSpellData,
  Operation,
  OperationAddBonusToValue,
  OperationAdjValue,
  OperationBindValue,
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
  OperationOptions,
  OperationRemoveAbilityBlock,
  OperationRemoveLanguage,
  OperationRemoveSpell,
  OperationResult,
  OperationSelect,
  OperationSendNotification,
  OperationSetValue,
} from '@schemas/operations';
import { ProficiencyType, StoreID, VariableListStr, VariableNum, VariableProf } from '@schemas/variables';
import {
  addVariable,
  addVariableBonus,
  adjVariable,
  getLevelCappedProficiencyType,
  getVariable,
  getVariables,
  getListContributions,
  exportVariableStore,
  setVariable,
  beginVariableEffects,
  getVariableEffectScopes,
  areVariableEffectScopesActive,
  withVariableEffectScope,
  withVariableEffectScopes,
  withSkillEffectContext,
  getSkillEffectContext,
  removeVariableEffects,
  filterVariableList,
  VariableEffectScope,
  VariableContentOrigin,
} from '@variables/variable-manager';
import {
  compileProficiencyType,
  compileExpressions,
  getProficiencyTypeValue,
  isProficiencyType,
  labelToVariable,
  maxProficiencyType,
} from '@variables/variable-utils';
import {
  ObjectWithUUID,
  determineFilteredSelectionList,
  determinePredefinedSelectionList,
  extendOperations,
} from './operation-utils';
import { SelectionTrack, resolveSelectionNode } from './selection-tree';
import { isEqual } from 'lodash-es';
import {
  getContributionCategories,
  getContributionDependencies,
  parseContributionAmount,
} from './contribution-matching';
export { getContributionCategories, parseContributionAmount } from './contribution-matching';
import { throwError } from '@utils/error-handling';
import { getFinalVariableValue } from '@variables/variable-helpers';
import {
  grantLanguage,
  parseLanguageOverride,
  removeGrantedLanguage,
  replaceLanguages,
  resolveLanguageOverride,
} from './language-operations';

// import { hideNotification, showNotification } from '@mantine/notifications';
// import { displayError } from '@utils/notifications';
// Disable these for now as we move to web worker processing for operations

function hideNotification(id: string) {
  console.log(`WEB WORKER MOCK > Hide notification: ${id}`);
}

function showNotification(options: any) {
  console.log(`WEB WORKER MOCK > Show notification: ${JSON.stringify(options)}`);
}

function displayError(message: string, debugOnly?: boolean) {
  console.log(`WEB WORKER MOCK > Display error: ${message}, debugOnly: ${debugOnly}`);
}

///

/** Generous hard limits bound malformed content even when Web Workers are unavailable. */
const MAX_OPERATION_DEPTH = 64;
const MAX_OPERATION_WORK = 100_000;
type OperationTraversal = { depth: number; work: number };
const operationTraversals = new WeakMap<ReturnType<typeof getVariables>, OperationTraversal>();

/** Track work across every source and all three passes, resetting with the variable store. */
function getOperationTraversal(varId: StoreID): OperationTraversal {
  const variables = getVariables(varId);
  let traversal = operationTraversals.get(variables);
  if (!traversal) {
    traversal = { depth: 0, work: 0 };
    operationTraversals.set(variables, traversal);
  }
  return traversal;
}

/**
 * Own a content grant and its descendants by occurrence, separate from its human-readable source label.
 * Only the active ancestor path is checked for cycles; another branch may grant the same content.
 */
export async function withContentGrant<T>(
  varId: StoreID,
  key: string,
  content: string,
  options: OperationOptions | undefined,
  run: () => Promise<T>,
  origin?: VariableContentOrigin
): Promise<T | undefined> {
  const ancestors = getVariableEffectScopes(varId);
  if (ancestors.some((scope) => scope.content === content)) {
    throw new Error(`Cyclic content grant: ${[...ancestors.map((scope) => scope.content), content].join(' -> ')}`);
  }
  const occurrence = `${ancestors.at(-1)?.key ?? 'root'}/${key}`;
  return withVariableEffectScope(
    varId,
    occurrence,
    content,
    !options?.doOnlyValueCreation && !options?.doOnlyConditionals,
    run,
    origin
  );
}

/** Execute ordered operations with bounded recursion and source-owned variable effects. */
export async function runOperations(
  varId: StoreID,
  selectionTrack: SelectionTrack,
  operations: Operation[],
  options?: OperationOptions,
  sourceLabel?: string
): Promise<OperationResult[]> {
  beginVariableEffects(varId);
  const traversal = getOperationTraversal(varId);
  if (traversal.depth >= MAX_OPERATION_DEPTH)
    throw new Error('Content operations exceed the maximum nesting depth (64).');
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
        const savedIdentity = resolveSelectionNode(selectionTrack.node, operation);
        const subNode = savedIdentity.node;
        // Run the select operation but only the parts that create variables
        return await runSelect(
          varId,
          { path: `${selectionTrack.path}_${subNode?.value}`, node: subNode },
          operation,
          options,
          sourceLabel,
          savedIdentity
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
        const savedIdentity = resolveSelectionNode(selectionTrack.node, operation);
        const subNode = savedIdentity.node;
        // Run the select operation but only the parts that are conditionals
        return await runSelect(
          varId,
          { path: `${selectionTrack.path}_${subNode?.value}`, node: subNode },
          operation,
          options,
          sourceLabel,
          savedIdentity
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
    } else if (options?.doConditionals && operation.type === 'createValue') {
      // Conditional branches are chosen after the creation pass. Create their
      // variables only when that branch runs, before its following adjustments.
      return await runCreateValue(varId, operation, sourceLabel);
    } else if (operation.type === 'adjValue') {
      return await runAdjValue(varId, operation, selectionTrack, options, sourceLabel);
    } else if (operation.type === 'setValue') {
      return await runSetValue(varId, operation, sourceLabel);
    } else if (operation.type === 'bindValue') {
      return await runBindValue(varId, operation, sourceLabel);
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
      return await runGiveSpell(varId, selectionTrack, operation, options, sourceLabel);
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
    } else if (operation.type === 'sendNotification') {
      return await runSendNotification(varId, operation, sourceLabel);
    } else if (operation.type === 'select') {
      const resolved = resolveSelectionNode(selectionTrack.node, operation);
      const subNode = resolved.node;
      return await runSelect(
        varId,
        { path: `${selectionTrack.path}_${subNode?.value}`, node: subNode },
        operation,
        options,
        sourceLabel,
        resolved
      );
    }
    return null;
  };

  const results: OperationResult[] = [];
  traversal.depth++;
  try {
    const orderedOperations = operations.map((operation, index) => ({ operation, index }));
    if (options?.doOnlyConditionals || options?.doConditionals) {
      // Active branches create their local variables before proficiency guards;
      // guards then precede sibling effects that read their granted proficiency.
      orderedOperations.sort(
        (left, right) =>
          Number(right.operation.type === 'createValue') - Number(left.operation.type === 'createValue') ||
          Number(getSelfGrantProficiencyVariables(right.operation).size > 0) -
            Number(getSelfGrantProficiencyVariables(left.operation).size > 0)
      );
    }
    for (const { operation, index } of orderedOperations) {
      if (!areVariableEffectScopesActive(getVariableEffectScopes(varId))) break;
      if (++traversal.work > MAX_OPERATION_WORK)
        throw new Error('Content operations exceed the execution work limit (100000).');
      const scope = getVariableEffectScopes(varId).at(-1);
      const occurrence = scope ? `${scope.key}@${scope.revision}` : 'root';
      results[index] = await withSkillEffectContext(
        varId,
        `${occurrence}/${selectionTrack.path}/${operation.id}`,
        options?.sourceLevel ?? getVariable<VariableNum>(varId, 'LEVEL')?.value ?? 1,
        () => runOp(operation)
      );
    }
    return results;
  } finally {
    traversal.depth--;
  }
}

async function runSelect(
  varId: StoreID,
  selectionTrack: SelectionTrack,
  operation: OperationSelect,
  options?: OperationOptions,
  sourceLabel?: string,
  savedIdentity?: { id: string; aliases?: string[] }
): Promise<OperationResult> {
  if (requiresFinalSkillSelection(operation.id) && !finalizingSkillSelections) {
    const result: OperationResult = {
      selection: {
        id: savedIdentity?.id ?? operation.id,
        ...(savedIdentity?.aliases ? { aliases: savedIdentity.aliases } : {}),
        title: operation.data.title,
        options: [],
      },
    };
    if (!options?.doOnlyValueCreation) {
      const identity = `${varId}/${selectionTrack.path}`;
      const key = finalSkillSelections.get(identity)?.key ?? qualifiedSequence++;
      finalSkillSelections.set(identity, {
        key,
        varId,
        selectionTrack,
        operation,
        options,
        sourceLabel,
        savedIdentity,
        scopes: getVariableEffectScopes(varId),
      });
      Object.assign(result, { [qualifiedResultKey]: key });
    }
    return result;
  }
  let optionList: ObjectWithUUID[] = [];

  if (operation.data.modeType === 'FILTERED' && operation.data.optionsFilters) {
    optionList = await determineFilteredSelectionList(varId, operation.id, operation.data.optionsFilters);
  } else if (operation.data.modeType === 'PREDEFINED' && operation.data.optionsPredefined) {
    optionList = await determinePredefinedSelectionList(
      varId,
      operation.id,
      operation.data.optionType,
      operation.data.optionsPredefined
    );
  }

  let selected: ObjectWithUUID | undefined = undefined;
  let results: OperationResult[] = [];

  // Check if all options are skill proficiencies, aka making this a skill increase
  let foundSkills: string[] = [];
  for (const option of optionList) {
    if (option.variable) {
      const variable = getVariable(varId, option.variable);
      if (variable?.type === 'prof' && variable.name.startsWith('SKILL_')) {
        foundSkills.push(variable.name);
      }
    }
  }
  const skillAdjustment =
    optionList.length > 0 && foundSkills.length === optionList.length ? optionList[0]?.value?.value : undefined;
  const skillContext = getSkillEffectContext(varId);
  if (skillAdjustment && skillContext) {
    optionList = optionList.map((option) => ({ ...option, _skill_context: skillContext }));
  }

  // Find selected option
  if (selectionTrack.node && selectionTrack.node.value) {
    let selectedOption = optionList.find((option) => option._select_uuid === selectionTrack.node?.value);
    if (!selectedOption && operation.data.optionType === 'ABILITY_BLOCK') {
      // It's probably a feat we selected from an archetype so it's not in the list, let's fetch it
      const abilityBlock = await fetchContentById<AbilityBlock>('ability-block', parseInt(selectionTrack.node.value));
      if (!abilityBlock) {
        displayError(
          `Selected node "${selectionTrack.path}" not found, value: ${selectionTrack.node.value}, type: ${operation.data.optionType}`,
          true
        );
        selectedOption = undefined;
      } else {
        selectedOption = {
          ...abilityBlock,
          _select_uuid: `${abilityBlock.id}`,
          _content_type: 'ability-block',
        } satisfies ObjectWithUUID;
      }
    } else if (!selectedOption) {
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
        displayError(
          `Selected node "${selectionTrack.path}" not found, value: ${selectionTrack.node.value}, type: ${operation.data.optionType}`,
          true
        );
      }
      selectedOption = undefined;
    }

    if (selectedOption) {
      const option = selectedOption;
      const runSelected = async (): Promise<void> => {
        await updateVariables(varId, operation, option, sourceLabel, options);
        const subOperations = await extendOperations(option, option.operations);
        if (subOperations.length > 0 && option.type !== 'mode') {
          const subNode = selectionTrack.node?.children[option._select_uuid];
          results = await runOperations(
            varId,
            { path: `${selectionTrack.path}_${subNode?.value}`, node: subNode },
            subOperations,
            options,
            operation.data.optionType === 'CUSTOM' ? sourceLabel : (option.name ?? 'Unknown')
          );
        }
      };
      if (operation.data.optionType === 'ABILITY_BLOCK' || operation.data.optionType === 'SPELL') {
        await withContentGrant(
          varId,
          `${selectionTrack.path}/${operation.id}/${option.id}`,
          `${operation.data.optionType === 'SPELL' ? 'spell' : 'ability-block'}:${option.id}`,
          options,
          runSelected,
          operation.data.optionType === 'ABILITY_BLOCK'
            ? { type: option.type ?? '', traits: option.traits ?? null }
            : undefined
        );
      } else {
        await runSelected();
      }
    }

    // Set the final selected option to be used in the result
    selected = selectedOption;
  }

  return {
    selection: {
      id: savedIdentity?.id ?? operation.id,
      ...(savedIdentity?.aliases ? { aliases: savedIdentity.aliases } : {}),
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
      let isCharacterTrait = false;
      if (selectedOption.meta_data?.class_trait) {
        addVariable(
          varId,
          'num',
          labelToVariable(`TRAIT_CLASS_${selectedOption.name}_IDS`),
          selectedOption.id,
          sourceLabel
        );
        isCharacterTrait = true;
      } else if (selectedOption.meta_data?.archetype_trait) {
        addVariable(
          varId,
          'num',
          labelToVariable(`TRAIT_ARCHETYPE_${selectedOption.name}_IDS`),
          selectedOption.id,
          sourceLabel
        );
        isCharacterTrait = true;
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
        isCharacterTrait = true;
      }
      if (isCharacterTrait) adjVariable(varId, 'TRAIT_NAMES', selectedOption.name.toUpperCase(), sourceLabel);
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
    grantLanguage(varId, { id: selectedOption.id, name: selectedOption.name }, sourceLabel);
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
      adjVariable(varId, 'SPELL_ATTACK', { value: 'T', increases: 0 }, sourceLabel);
      adjVariable(varId, 'SPELL_DC', { value: 'T', increases: 0 }, sourceLabel);
      const level = getVariable<VariableNum>(varId, 'LEVEL')?.value;
      if (level && level >= 12) {
        adjVariable(varId, 'SPELL_ATTACK', { value: 'E', increases: 0 }, sourceLabel);
        adjVariable(varId, 'SPELL_DC', { value: 'E', increases: 0 }, sourceLabel);
      }
    }
  } else if (operation.data.optionType === 'ADJ_VALUE') {
    adjVariable(varId, selectedOption.variable, selectedOption.value, sourceLabel);
    // addToFamiliarity selections (Unconventional Weaponry): the chosen weapon also joins
    // WEAPON_FAMILIARITY, so its proficiency tracks one category lower (see weapon-handler).
    if (
      operation.data.optionsFilters?.type === 'ADJ_VALUE' &&
      operation.data.optionsFilters.addToFamiliarity &&
      (!operation.data.optionsFilters.familiarityCategories ||
        operation.data.optionsFilters.familiarityCategories.includes(selectedOption._item_category)) &&
      selectedOption.name
    ) {
      adjVariable(varId, 'WEAPON_FAMILIARITY', selectedOption.name, sourceLabel);
    }
  } else if (operation.data.optionType === 'CUSTOM') {
    // Doesn't inherently do anything, just runs its operations
  }
}

/**
 * Determines whether a skill training grant (adjValue to 'T') should be redirected to a
 * "Select a Skill to be Trained" selection because the character is already trained in it,
 * per the PF2e rule "if you were already trained in this skill, you instead become trained
 * in a skill of your choice."
 * @param varId - Variable store ID
 * @param operation - The adjValue operation being executed
 * @param options - Operation options for the current execution round
 * @returns - Whether the grant should be redirected to a skill selection
 */
function isTrainedInAdjValue(varId: StoreID, operation: OperationAdjValue, options?: OperationOptions): boolean {
  if (!operation.data.variable.includes('SKILL_')) {
    // Not a skill adjustment
    return false;
  }

  // If the adj is not a training, don't give another skill selection
  if (
    operation?.data?.value !== 'T' &&
    !(typeof operation.data.value === 'object' && 'value' in operation.data.value && operation.data.value.value === 'T')
  ) {
    return false;
  }

  // If character is at least trained in skill, give another skill selection
  let variable = getVariables(varId)[operation.data.variable] as VariableProf;
  // Conditional branches only execute in the conditional round, after every numeric skill
  // increase from every level has already been applied. Compiling increases here would count
  // increases that are meant to stack on top of this very grant (e.g. a swashbuckler style's
  // level-1 training + a level-3 skill increase), wrongly treating the character as "already
  // trained". So inside conditionals, only base rank grants (background, class, etc.) count.
  const currentProf = options?.doConditionals ? variable.value.value : compileProficiencyType(variable.value);
  return maxProficiencyType(currentProf, 'T') === currentProf;
}

async function runAdjValue(
  varId: StoreID,
  operation: OperationAdjValue,
  selectionTrack: SelectionTrack,
  options?: OperationOptions,
  sourceLabel?: string
): Promise<OperationResult> {
  const isTrained = isTrainedInAdjValue(varId, operation, options);
  // If character is at least trained in skill, give another skill selection
  if (isTrained) {
    const subNode = selectionTrack.node?.children[operation.id];
    return await runSelect(
      varId,
      { path: `${selectionTrack.path}_${subNode?.value}`, node: subNode },
      {
        type: 'select',
        id: operation.id,
        data: {
          title: 'Select a Skill to be Trained',
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
      },
      options,
      sourceLabel
    );
  } else {
    // Adjust the variable like normal
    adjVariable(varId, operation.data.variable, operation.data.value, sourceLabel);
    return null;
  }
}

async function runSetValue(
  varId: StoreID,
  operation: OperationSetValue,
  sourceLabel?: string
): Promise<OperationResult> {
  if (operation.data.variable === 'LANGUAGE_IDS' || operation.data.variable === 'LANGUAGE_NAMES') {
    deferredOperations.push({
      type: 'languages',
      varId,
      data: operation.data,
      sourceLabel,
      scopes: getVariableEffectScopes(varId),
    });
    return null;
  }
  setVariable(varId, operation.data.variable, operation.data.value, sourceLabel);
  return null;
}

/**
 * Explicit final writes share one execution lifecycle. Language overrides replace
 * ancestry and other grants; variable bindings then read those final values.
 * Bindings copy another variable's FINAL value (e.g. Quick Climb's "climb Speed equal
 * to your land Speed"), so they can't resolve mid-execution — and the old setTimeout
 * deferral was lost entirely under worker execution, because the store is exported
 * back to the main thread before the timer ever fires.
 */
type DeferredOperation = { scopes: VariableEffectScope[] } & (
  | {
      type: 'bind';
      varId: StoreID;
      variable: string;
      value: OperationBindValue['data']['value'];
      sourceLabel?: string;
    }
  | {
      type: 'languages';
      varId: StoreID;
      data: OperationSetValue['data'];
      sourceLabel?: string;
    }
);
let deferredOperations: DeferredOperation[] = [];
type DeferredBinding = Extract<DeferredOperation, { type: 'bind' }>;

/** Resolve final-value dependencies without depending on source traversal order or call-stack depth. */
async function resolveBindings(pending: DeferredOperation[]): Promise<void> {
  const keyFor = (storeId: StoreID, variable: string): string => JSON.stringify([storeId, variable]);
  const bindings = new Map<string, DeferredBinding[]>();
  for (const operation of pending) {
    if (
      operation.type === 'bind' &&
      getVariable(operation.varId, operation.variable) &&
      getVariable(operation.value.storeId, operation.value.variable)
    ) {
      const key = keyFor(operation.varId, operation.variable);
      // Self-copies cannot replace an earlier source or introduce a dependency.
      if (key === keyFor(operation.value.storeId, operation.value.variable)) continue;
      const writes = bindings.get(key) ?? [];
      writes.push(operation);
      bindings.set(key, writes);
    }
  }
  const resolved = new Set<string>();
  const ordered: string[] = [];
  for (const key of bindings.keys()) {
    if (resolved.has(key)) continue;
    const stack = [{ key, next: 0 }];
    const visiting = new Set([key]);
    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const writes = bindings.get(current.key)!;
      if (current.next === writes.length) {
        ordered.push(current.key);
        resolved.add(current.key);
        visiting.delete(current.key);
        stack.pop();
        continue;
      }
      const write = writes[current.next++];
      const dependency = keyFor(write.value.storeId, write.value.variable);
      if (!bindings.has(dependency) || resolved.has(dependency)) continue;
      if (visiting.has(dependency)) {
        const start = stack.findIndex((entry) => entry.key === dependency);
        const cycle = [...stack.slice(start).map((entry) => entry.key), dependency].map((entry) => {
          const binding = bindings.get(entry)![0];
          return binding.varId + '.' + binding.variable;
        });
        throw new Error('Cyclic variable binding: ' + cycle.join(' -> '));
      }
      visiting.add(dependency);
      stack.push({ key: dependency, next: 0 });
    }
  }
  // Validate the complete graph before applying any binding. A cycle must never
  // publish a partial result as a successful character or companion calculation.
  for (const key of ordered) {
    // Preserve every authored assignment and its provenance. The existing setter
    // owns maximum-speed/HP rules, proficiency metadata, and ordinary replacement.
    for (const binding of bindings.get(key)!) {
      const source = getVariable(binding.value.storeId, binding.value.variable);
      if (!source) continue;
      await withVariableEffectScopes(binding.varId, binding.scopes, async () => {
        setVariable(binding.varId, binding.variable, source.value, binding.sourceLabel);
      });
    }
  }
}

/** Drops deferred writes from a previous (possibly aborted) execution. */
export function clearDeferredOperations(): void {
  deferredOperations = [];
  qualifiedOperations = [];
  qualifiedResults.clear();
  qualifiedSequence = 0;
  finalSkillSelections.clear();
  finalizingSkillSelections = false;
}

const qualifiedResultKey = Symbol('qualified-operation-occurrence');
type QualifiedOperation = {
  key: number;
  varId: StoreID;
  scopes: VariableEffectScope[];
  selectionTrack: SelectionTrack;
  operation: OperationConditional;
  options?: OperationOptions;
  sourceLabel?: string;
  ordinaryVerdict: boolean;
  skillContext: ReturnType<typeof getSkillEffectContext>;
};
let qualifiedOperations: QualifiedOperation[] = [];
let qualifiedSequence = 0;
const qualifiedResults = new Map<number, OperationResult>();
const finalSkillSelections = new Map<
  string,
  {
    key: number;
    varId: StoreID;
    scopes: VariableEffectScope[];
    selectionTrack: SelectionTrack;
    operation: OperationSelect;
    options?: OperationOptions;
    sourceLabel?: string;
    savedIdentity?: { id: string; aliases?: string[] };
  }
>();
let finalizingSkillSelections = false;

/** Bind Assurance after ordinary and conditional trainings, respecting removed grants and saved occurrence paths. */
export async function resolveFinalSkillSelections(): Promise<void> {
  finalizingSkillSelections = true;
  try {
    for (const entry of finalSkillSelections.values()) {
      const result = await withVariableEffectScopes(entry.varId, entry.scopes, () =>
        runSelect(
          entry.varId,
          entry.selectionTrack,
          entry.operation,
          { ...entry.options, doOnlyConditionals: false, doConditionals: true },
          entry.sourceLabel,
          entry.savedIdentity
        )
      );
      qualifiedResults.set(entry.key, result ?? null);
    }
  } finally {
    finalSkillSelections.clear();
    finalizingSkillSelections = false;
  }
}

/** Reconcile against the real controller tree after limitBoostOptions cloned its placeholders. */
export function reconcileQualifiedResults(tree: unknown): void {
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    const tagged = value as {
      [qualifiedResultKey]?: number;
      result?: NonNullable<OperationResult>['result'];
      selection?: NonNullable<OperationResult>['selection'];
    };
    const key = tagged[qualifiedResultKey];
    if (key !== undefined) {
      const resolved = qualifiedResults.get(key);
      tagged.result = resolved?.result;
      if (resolved?.selection) tagged.selection = resolved.selection;
      delete tagged[qualifiedResultKey];
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(tree);
  qualifiedResults.clear();
}

/** Inspect both authored outcomes before applying qualified work. Unsupported discovery fails closed. */
type QualifiedWrite = { name: string; replacement: boolean; content?: string };
async function qualifiedBranchWrites(
  varId: StoreID,
  operations: Operation[],
  content?: string,
  ancestors: string[] = [],
  depth = 0,
  work = { count: 0 }
): Promise<QualifiedWrite[]> {
  if (depth >= MAX_OPERATION_DEPTH) throw new Error('Qualified branches exceed the execution depth limit (64).');
  const writes: QualifiedWrite[] = [];
  const addNested = async (nested: Operation[]) => {
    for (const write of await qualifiedBranchWrites(varId, nested, content, ancestors, depth + 1, work))
      writes.push(write);
  };
  for (const operation of operations) {
    if (++work.count > MAX_OPERATION_WORK)
      throw new Error('Qualified branches exceed the execution work limit (100000).');
    if (['adjValue', 'setValue', 'createValue', 'addBonusToValue', 'bindValue'].includes(operation.type)) {
      const name = (operation as OperationAdjValue).data.variable;
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
        throw new Error('Unsupported contribution dependency: qualified write requires an identifier variable name.');
      if ((operation as OperationAdjValue).data.variable === 'INJECT_SELECT_OPTIONS')
        throw new Error('Unsupported contribution dependency: qualified writes cannot change selection discovery.');
      if (
        operation.type === 'setValue' &&
        (operation.data.variable === 'LANGUAGE_IDS' || operation.data.variable === 'LANGUAGE_NAMES')
      )
        throw new Error('Unsupported contribution dependency: qualified language overrides replace paired lists.');
      if (
        operation.type === 'adjValue' &&
        operation.data.variable.includes('SKILL_') &&
        (operation.data.value === 'T' ||
          (typeof operation.data.value === 'object' &&
            operation.data.value !== null &&
            'value' in operation.data.value &&
            operation.data.value.value === 'T'))
      )
        throw new Error(
          'Unsupported contribution dependency: qualified skill training can discover a replacement selection.'
        );
      writes.push({
        name: name.toUpperCase(),
        replacement: operation.type !== 'adjValue',
        content,
      });
    } else if (
      operation.type === 'removeAbilityBlock' ||
      operation.type === 'removeSpell' ||
      operation.type === 'removeLanguage'
    ) {
      throw new Error('Unsupported contribution dependency: qualified branches cannot remove content.');
    } else if (operation.type === 'conditional') {
      validateContributionChecks(operation.data);
      throw new Error('Unsupported contribution dependency: nested conditional branch reads are not isolated.');
    } else if (operation.type === 'giveAbilityBlock') {
      const type = 'ability-block';
      const id = operation.data.abilityBlockId;
      if (id === -1) continue;
      const key = `${type}:${id}`;
      if (ancestors.includes(key) || ancestors.length >= MAX_OPERATION_DEPTH)
        throw new Error('Unsupported contribution dependency: cyclic qualified grant.');
      const row = await fetchContentById<AbilityBlock>(type, id);
      if (!row) throw new Error(`Unresolved qualified branch content ${key}.`);
      for (const prefix of ['FEAT', 'CLASS_FEATURE', 'HERITAGE', 'SENSE', 'PHYSICAL_FEATURE', 'MODE']) {
        writes.push(
          { name: `${prefix}_IDS`, replacement: false, content: key },
          { name: `${prefix}_NAMES`, replacement: false, content: key }
        );
      }
      for (const write of await qualifiedBranchWrites(
        varId,
        await extendOperations(row, row.operations ?? undefined),
        key,
        [...ancestors, key],
        depth + 1,
        work
      ))
        writes.push(write);
    } else if (operation.type === 'select') {
      if (operation.data.modeType !== 'PREDEFINED' || operation.data.optionType !== 'CUSTOM')
        throw new Error('Unsupported contribution dependency: qualified selection requires explicit CUSTOM options.');
      const options = await determinePredefinedSelectionList(
        varId,
        operation.id,
        'CUSTOM',
        operation.data.optionsPredefined ?? []
      );
      for (const option of options) {
        if (++work.count > MAX_OPERATION_WORK)
          throw new Error('Qualified branches exceed the execution work limit (100000).');
        await addNested(option.operations ?? []);
      }
    } else {
      throw new Error(`Unsupported contribution dependency: qualified operation ${operation.type}.`);
    }
  }
  return writes;
}

/** Evaluate one immutable ordinary-final batch; this is not a fixed-point solver. */
export async function resolveQualifiedOperations(): Promise<string[]> {
  const pending = qualifiedOperations.filter((entry) => areVariableEffectScopesActive(entry.scopes));
  qualifiedOperations = [];
  const prepared = [];
  const work = { count: 0 };
  const categoriesByOrigin = new Map<string, Awaited<ReturnType<typeof getContributionCategories>>>();
  const ordinaryStores = new Map<StoreID, ReturnType<typeof exportVariableStore>>();
  const ordinaryStore = (id: StoreID) => {
    let store = ordinaryStores.get(id);
    if (!store) {
      store = exportVariableStore(id);
      ordinaryStores.set(id, store);
    }
    return store;
  };
  const countWork = (amount = 1) => {
    work.count += amount;
    if (work.count > MAX_OPERATION_WORK)
      throw new Error('Qualified dependencies exceed the execution work limit (100000).');
  };
  for (const entry of pending) {
    countWork();
    const content = entry.scopes.at(-1)?.content;
    const reads = new Set<string>();
    const expressionReads = new Set<string>();
    let verdict = entry.ordinaryVerdict;
    for (const check of entry.operation.data.conditions ?? []) {
      const qualifier = getContributionCheck(entry.operation.data.contributionChecks, check.id);
      if (!qualifier) continue;
      const variable = getVariable(entry.varId, check.name);
      if (variable?.type !== 'list-str')
        throw new Error(`Unsupported contribution check variable ${check.name}: requires list-str.`);
      if (!content) throw new Error('Unsupported contribution check: no current content identity.');
      const contributions = getListContributions(entry.varId, check.name);
      countWork(contributions.length + 1);
      const values = [String(check.value), ...contributions.map(({ value }) => value)];
      reads.add(check.name.toUpperCase());
      for (const input of getContributionDependencies(values, ordinaryStore(entry.varId))) {
        reads.add(input);
        expressionReads.add(input);
      }
      const needle = parseContributionAmount(compileExpressions(entry.varId, String(check.value), true));
      if (!needle) throw new Error(`Malformed typed-amount contribution check ${check.id}.`);
      let matched = false;
      for (const contribution of contributions) {
        if (contribution.content === content) continue;
        const amount = parseContributionAmount(compileExpressions(entry.varId, contribution.value, true));
        if (amount?.type !== needle.type || amount.amount !== needle.amount) continue;
        const originKey = JSON.stringify([contribution.content, contribution.origin]);
        let categories = categoriesByOrigin.get(originKey);
        if (!categories) {
          countWork(contribution.origin?.traits?.length ?? 0);
          categories = await getContributionCategories(contribution.origin);
          categoriesByOrigin.set(originKey, categories);
        }
        if (!categories.some((category) => qualifier.categories.includes(category))) continue;
        matched = true;
      }
      verdict &&= matched;
    }
    const writes = await qualifiedBranchWrites(
      entry.varId,
      [...(entry.operation.data.trueOperations ?? []), ...(entry.operation.data.falseOperations ?? [])],
      content,
      [],
      0,
      work
    );
    prepared.push({ entry, content, reads, expressionReads, writes, verdict });
  }
  for (const writer of prepared) {
    if (!writer.writes.length) continue;
    for (const reader of prepared) {
      if (writer.entry.varId !== reader.entry.varId) continue;
      countWork();
      for (const { name, replacement, content } of writer.writes) {
        countWork();
        if (
          reader.reads.has(name) ||
          (name.startsWith('WEAPON_GROUP_') && [...reader.reads].some((input) => input.startsWith('WEAPON_')))
        ) {
          const ownExcludedList =
            !replacement &&
            !reader.expressionReads.has(name) &&
            content === reader.content &&
            (reader.entry.operation.data.conditions ?? []).some(
              (check) =>
                check.name.toUpperCase() === name &&
                getContributionCheck(reader.entry.operation.data.contributionChecks, check.id)
            );
          if (!ownExcludedList)
            throw new Error(
              `Unsupported contribution dependency: qualified write to ${name} changes a qualification input.`
            );
        }
      }
    }
  }
  for (const { entry, verdict } of prepared) {
    const execute = () =>
      runConditional(entry.varId, entry.selectionTrack, entry.operation, entry.options, entry.sourceLabel, verdict);
    const result = await withVariableEffectScopes(entry.varId, entry.scopes, () =>
      entry.skillContext
        ? withSkillEffectContext(entry.varId, entry.skillContext.key, entry.skillContext.level, execute)
        : execute()
    );
    qualifiedResults.set(entry.key, result ?? null);
  }
  if (qualifiedOperations.length)
    throw new Error('Unsupported contribution dependency: newly discovered qualified work.');
  return resolveDeferredOperations();
}

/** Apply explicit language replacements after grants, then bindings against their resolved final source values. */
export async function resolveDeferredOperations(): Promise<string[]> {
  const pending: DeferredOperation[] = deferredOperations.filter((operation) =>
    areVariableEffectScopesActive(operation.scopes)
  );
  deferredOperations = [];
  const replacements: { varId: StoreID; languages: Language[]; sourceLabel?: string; scopes: VariableEffectScope[] }[] =
    [];
  const errors: string[] = [];
  for (const operation of pending) {
    if (operation.type !== 'languages') continue;
    try {
      const override = parseLanguageOverride(operation.data.variable, operation.data.value);
      if (!override) continue;
      replacements.push({
        varId: operation.varId,
        languages: await resolveLanguageOverride(operation.varId, override),
        sourceLabel: operation.sourceLabel,
        scopes: operation.scopes,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      errors.push(
        `Language override${operation.sourceLabel ? ` from ${operation.sourceLabel}` : ''} was not applied: ${detail}`
      );
    }
  }
  for (const replacement of replacements) {
    await withVariableEffectScopes(replacement.varId, replacement.scopes, async () => {
      replaceLanguages(replacement.varId, replacement.languages, replacement.sourceLabel);
    });
  }
  await resolveBindings(pending);
  return errors;
}

async function runBindValue(
  varId: StoreID,
  operation: OperationBindValue,
  sourceLabel?: string
): Promise<OperationResult> {
  deferredOperations.push({
    type: 'bind',
    scopes: getVariableEffectScopes(varId),
    varId,
    variable: operation.data.variable,
    value: operation.data.value,
    sourceLabel,
  });
  return null;
}

async function runCreateValue(
  varId: StoreID,
  operation: OperationCreateValue,
  sourceLabel?: string
): Promise<OperationResult> {
  addVariable(
    varId,
    operation.data.type,
    operation.data.variable,
    operation.data.value as ProficiencyType,
    sourceLabel
  );
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
    operation.data.value ?? undefined,
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

  return (
    (await withContentGrant(
      varId,
      `${selectionTrack.path}/${operation.id}`,
      `ability-block:${abilityBlock.id}`,
      options,
      async () => {
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
        const subOperations = await extendOperations(abilityBlock, abilityBlock.operations ?? undefined);
        if (subOperations.length > 0 && operation.data.type !== 'mode') {
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
      },
      { type: abilityBlock.type, traits: abilityBlock.traits }
    )) ?? null
  );
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

  grantLanguage(varId, language, sourceLabel);
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
  let isCharacterTrait = false;
  if (trait.meta_data?.class_trait) {
    addVariable(varId, 'num', labelToVariable(`TRAIT_CLASS_${trait.name}_IDS`), trait.id, sourceLabel);
    isCharacterTrait = true;
  } else if (trait.meta_data?.archetype_trait) {
    addVariable(varId, 'num', labelToVariable(`TRAIT_ARCHETYPE_${trait.name}_IDS`), trait.id, sourceLabel);
    isCharacterTrait = true;
  } else if (
    trait.meta_data?.ancestry_trait ||
    trait.meta_data?.creature_trait ||
    trait.meta_data?.versatile_heritage_trait ||
    trait.meta_data?.companion_type_trait
  ) {
    addVariable(varId, 'num', labelToVariable(`TRAIT_ANCESTRY_${trait.name}_IDS`), trait.id, sourceLabel);
    isCharacterTrait = true;
  } else {
    console.warn(
      `Trait is not a class, archetype, ancestry, or creature trait so it can't be given to a character: ${trait.name} (${trait.id})`
    );
    displayError(
      `Trait is not a class, archetype, ancestry, or creature trait so it can't be given to a character: ${trait.name} (${trait.id})`
    );
  }
  if (isCharacterTrait) adjVariable(varId, 'TRAIT_NAMES', trait.name.toUpperCase(), sourceLabel);

  return null;
}

async function runGiveSpell(
  varId: StoreID,
  selectionTrack: SelectionTrack,
  operation: OperationGiveSpell,
  options?: OperationOptions,
  sourceLabel?: string
): Promise<OperationResult> {
  if (operation.data.spellId === -1) return null;
  const spell = await fetchContentById<Spell>('spell', operation.data.spellId);
  if (!spell) {
    displayError(`Spell not found: ${operation.data.spellId}`, true);
    return null;
  }

  return (
    (await withContentGrant(varId, `${selectionTrack.path}/${operation.id}`, `spell:${spell.id}`, options, async () => {
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
        adjVariable(varId, 'SPELL_ATTACK', { value: 'T', increases: 0 }, sourceLabel);
        adjVariable(varId, 'SPELL_DC', { value: 'T', increases: 0 }, sourceLabel);
        const level = getVariable<VariableNum>(varId, 'LEVEL')?.value;
        if (level && level >= 12) {
          adjVariable(varId, 'SPELL_ATTACK', { value: 'E', increases: 0 }, sourceLabel);
          adjVariable(varId, 'SPELL_DC', { value: 'E', increases: 0 }, sourceLabel);
        }
      }

      return null;
    })) ?? null
  );
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
        opId: operation.id,
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

async function runSendNotification(
  varId: StoreID,
  operation: OperationSendNotification,
  sourceLabel?: string
): Promise<OperationResult> {
  hideNotification(`op-notif-${operation.id}`);
  showNotification({
    id: `op-notif-${operation.id}`,
    title: operation.data.title,
    message: operation.data.message,
    color: operation.data.color.trim() || undefined,
  });
  return null;
}

/** Remove identity and display membership together, preserving another record that has the same name. */
function removeContentMembership(
  varId: StoreID,
  prefix: string,
  content: Pick<AbilityBlock, 'id' | 'name'>,
  type: 'ability-block' | 'spell',
  sourceLabel?: string
): void {
  const name = content.name.toUpperCase();
  const namesakes = new Set(
    getCachedContent<AbilityBlock | Spell>(type)
      .filter((row) => row.id !== content.id && row.name.toUpperCase() === name)
      .map((row) => `${row.id}`)
  );
  filterVariableList(varId, `${prefix}_IDS`, (id) => id !== `${content.id}`, sourceLabel);
  filterVariableList(
    varId,
    `${prefix}_NAMES`,
    (value) =>
      value !== name ||
      (getVariable<VariableListStr>(varId, `${prefix}_IDS`)?.value ?? []).some((id) => namesakes.has(id)),
    sourceLabel
  );
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

  removeVariableEffects(varId, `ability-block:${abilityBlock.id}`);
  if (operation.data.type === 'mode') {
    filterVariableList(varId, 'ACTIVE_MODES', (mode) => mode !== getModeKey(abilityBlock), sourceLabel);
  }

  const prefix: Record<string, string> = {
    feat: 'FEAT',
    'class-feature': 'CLASS_FEATURE',
    sense: 'SENSE',
    heritage: 'HERITAGE',
    'physical-feature': 'PHYSICAL_FEATURE',
    mode: 'MODE',
  };
  const variablePrefix = prefix[operation.data.type];
  if (variablePrefix) removeContentMembership(varId, variablePrefix, abilityBlock, 'ability-block', sourceLabel);
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

  removeGrantedLanguage(varId, language, sourceLabel);
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

  removeVariableEffects(varId, `spell:${spell.id}`);

  removeContentMembership(varId, 'SPELL', spell, 'spell', sourceLabel);
  filterVariableList(
    varId,
    'SPELL_DATA',
    (entry) => {
      const data: unknown = JSON.parse(entry);
      return typeof data !== 'object' || data === null || !('spellId' in data) || data.spellId !== spell.id;
    },
    sourceLabel
  );
  return null;
}

/** Identify only conditional guards that grant a rank to the proficiency they check. */
function getSelfGrantProficiencyVariables(operation: Operation): Set<string> {
  if (operation.type !== 'conditional') return new Set();
  const checked = new Set((operation.data.conditions ?? []).map((condition) => condition.name));
  return new Set(
    [...(operation.data.trueOperations ?? []), ...(operation.data.falseOperations ?? [])]
      .filter(
        (op): op is OperationAdjValue =>
          op.type === 'adjValue' &&
          checked.has(op.data.variable) &&
          isProficiencyType((op.data.value as { value?: unknown })?.value)
      )
      .map((op) => op.data.variable)
  );
}

async function runConditional(
  varId: StoreID,
  selectionTrack: SelectionTrack,
  operation: OperationConditional,
  options?: OperationOptions,
  sourceLabel?: string,
  qualifiedVerdict?: boolean
): Promise<OperationResult> {
  // Proficiency variables this conditional would GRANT a rank letter to, in either branch.
  // A condition checking one of these is a self-guard ("if not yet expert, become expert"):
  // it must evaluate against the rank the character has from grants alone. Numeric skill
  // increases run before the conditional round, so an increase-inclusive read lets an
  // increase meant to stack ABOVE the grant satisfy the guard instead — the grant never
  // fires and the increase is consumed reaching the rank the grant should have provided
  // (Medic Dedication at trained + a level-7 increase compiled to expert, not master).
  // Threshold conditions that gate anything else keep the increase-inclusive read below.
  const selfGrantProfVars = getSelfGrantProficiencyVariables(operation);

  const makeCheck = (check: ConditionCheckData) => {
    let variable = getVariable(varId, check.name);
    let variableStoreId = varId;

    // The parent character is already calculated. Companion checks can read its
    // pending binding now while final copies retain their existing execution order.
    if (variable && varId !== 'CHARACTER') {
      const binding = [...deferredOperations]
        .reverse()
        .find(
          (entry) =>
            entry.type === 'bind' &&
            entry.varId === varId &&
            entry.variable === check.name &&
            areVariableEffectScopesActive(entry.scopes)
        );
      if (binding?.type === 'bind' && binding.value.storeId === 'CHARACTER') {
        const parentVariable = getVariable('CHARACTER', binding.value.variable);
        if (parentVariable) {
          variable = parentVariable;
          variableStoreId = 'CHARACTER';
        }
      }
    }

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

      // An absent variable can't equal or include anything, so negated checks pass
      // (e.g. a muse feature's MAIN_BARD_MUSE ≠ 'enigma' should hold when the store
      // never created MAIN_BARD_MUSE at all). Every other operator stays false.
      return check.operator === 'NOT_EQUALS' || check.operator === 'NOT_INCLUDES';
    }

    if (variable.type === 'attr') {
      const value = parseInt(`${check.value}`);
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
      const value = parseInt(`${check.value}`);
      // Modes can set a counter through typed bonuses. Match the calculated value
      // shown by inline expressions rather than the counter's unmodified base.
      const currentValue = getFinalVariableValue(variableStoreId, variable.name).total;
      if (check.operator === 'EQUALS') {
        return currentValue === value;
      } else if (check.operator === 'GREATER_THAN') {
        return currentValue > value;
      } else if (check.operator === 'LESS_THAN') {
        return currentValue < value;
      } else if (check.operator === 'NOT_EQUALS') {
        return currentValue !== value;
      } else if (check.operator === 'GREATER_THAN_OR_EQUALS') {
        return currentValue >= value;
      } else if (check.operator === 'LESS_THAN_OR_EQUALS') {
        return currentValue <= value;
      }
    } else if (variable.type === 'str') {
      if (check.operator === 'EQUALS') {
        return labelToVariable(variable.value) === labelToVariable(`${check.value}`);
      } else if (check.operator === 'NOT_EQUALS') {
        return labelToVariable(variable.value) !== labelToVariable(`${check.value}`);
      } else if (check.operator === 'INCLUDES') {
        return labelToVariable(variable.value).includes(labelToVariable(`${check.value}`));
      } else if (check.operator === 'NOT_INCLUDES') {
        return !labelToVariable(variable.value).includes(labelToVariable(`${check.value}`));
      }
    } else if (variable.type === 'bool') {
      if (check.operator === 'EQUALS') {
        return variable.value === (check.value === 'TRUE');
      } else if (check.operator === 'NOT_EQUALS') {
        return variable.value !== (check.value === 'TRUE');
      }
    } else if (variable.type === 'list-str') {
      let varValue: string[] = [];
      try {
        if (typeof variable.value === 'string') {
          // @ts-ignore, typing may be wrong and it's a string
          varValue = JSON.parse(variable.value.toUpperCase());
        } else {
          varValue = variable.value;
        }
      } catch (e) {}
      let checkValue: string[] = [];
      const normalize = (value: string): string =>
        labelToVariable(value, true, { preserveNumbers: variable.name === 'ACTIVE_MODES' });
      try {
        if (typeof check.value === 'string') {
          checkValue = JSON.parse(check.value.toUpperCase());
        }
      } catch (e) {}
      if (check.operator === 'EQUALS') {
        return isEqual(varValue, checkValue);
      } else if (check.operator === 'NOT_EQUALS') {
        return !isEqual(varValue, checkValue);
      } else if (check.operator === 'INCLUDES') {
        return varValue.map(normalize).includes(normalize(`${check.value}`));
      } else if (check.operator === 'NOT_INCLUDES') {
        return !varValue.map(normalize).includes(normalize(`${check.value}`));
      }
    } else if (variable.type === 'prof') {
      // Level-capped compile: conditionals execute before normalizeProficiencies
      // runs, so a plain compile here could read a rank the normalization will clamp
      // away (rank grant + spent increases) and misfire high-rank checks like Ward
      // Medic's "legendary in Medicine". The cap keeps in-execution checks
      // consistent with the final displayed rank.
      // Self-guards (this conditional grants a rank to the very variable it checks)
      // instead read the grant-only rank — see selfGrantProfVars above.
      const profType = selfGrantProfVars.has(variable.name)
        ? variable.value.value
        : getLevelCappedProficiencyType(varId, variable);
      // Compare by rank order. The strict operators must actually be strict: the
      // condition editor offers < and ≤ as distinct options, and content depends on
      // the difference (e.g. Virtuosic Performer's "+2 if master" else-branch only
      // fires when the rank is NOT below master). The old maxProficiencyType-based
      // checks returned true on equality for both < and >.
      const rankOf = (prof: ProficiencyType) => getProficiencyTypeValue(prof);
      // Older condition editors displayed their first rank (U) without persisting
      // it. Match that displayed default and leave other values unchanged.
      const threshold = check.value === '' ? 'U' : check.value;
      if (check.operator === 'EQUALS') {
        return profType === threshold;
      } else if (check.operator === 'GREATER_THAN') {
        return rankOf(profType) > rankOf(threshold as ProficiencyType);
      } else if (check.operator === 'LESS_THAN') {
        return rankOf(profType) < rankOf(threshold as ProficiencyType);
      } else if (check.operator === 'NOT_EQUALS') {
        return profType !== threshold;
      } else if (check.operator === 'GREATER_THAN_OR_EQUALS') {
        return rankOf(profType) >= rankOf(threshold as ProficiencyType);
      } else if (check.operator === 'LESS_THAN_OR_EQUALS') {
        return rankOf(profType) <= rankOf(threshold as ProficiencyType);
      }
    }
    return false;
  };

  validateContributionChecks(operation.data);
  let isTrue = qualifiedVerdict ?? true;
  for (const check of qualifiedVerdict === undefined ? (operation.data.conditions ?? []) : []) {
    if (!getContributionCheck(operation.data.contributionChecks, check.id) && !makeCheck(check)) {
      isTrue = false;
    }
  }

  if (qualifiedVerdict === undefined && Object.keys(operation.data.contributionChecks ?? {}).length) {
    const key = qualifiedSequence++;
    qualifiedOperations.push({
      key,
      varId,
      scopes: getVariableEffectScopes(varId),
      selectionTrack,
      operation,
      options,
      sourceLabel,
      ordinaryVerdict: isTrue,
      skillContext: getSkillEffectContext(varId),
    });
    return { [qualifiedResultKey]: key, result: { results: [] } } as NonNullable<OperationResult>;
  }

  // A level-gated root/class/ancestry operation is earned when its gate opens, not at the root's level 1.
  const levelGates = (operation.data.conditions ?? []).filter((check) => check.name === 'LEVEL');
  let sourceLevel = options?.sourceLevel ?? getVariable<VariableNum>(varId, 'LEVEL')?.value ?? 1;
  for (const check of levelGates) {
    const threshold = Number(check.value);
    if (!Number.isFinite(threshold)) continue;
    if (isTrue && (check.operator === 'GREATER_THAN_OR_EQUALS' || check.operator === 'EQUALS')) {
      sourceLevel = Math.max(sourceLevel, Math.ceil(threshold));
    } else if (isTrue && check.operator === 'GREATER_THAN') {
      sourceLevel = Math.max(sourceLevel, Math.floor(threshold) + 1);
    } else if (!isTrue && operation.data.conditions?.length === 1) {
      // With multiple conditions, a false result does not identify which condition failed.
      if (check.operator === 'LESS_THAN') sourceLevel = Math.max(sourceLevel, Math.ceil(threshold));
      if (check.operator === 'LESS_THAN_OR_EQUALS') sourceLevel = Math.max(sourceLevel, Math.floor(threshold) + 1);
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
        sourceLevel,
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
        sourceLevel,
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
