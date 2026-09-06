import { fetchContentById, getCachedContent } from '@content/content-store';
import { AbilityBlock, Item, Language, Spell, Trait } from '@schemas/content';
import {
  ConditionCheckData,
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
} from '@variables/variable-manager';
import {
  compileProficiencyType,
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
import { SelectionTrack } from './selection-tree';
import { isEqual } from 'lodash-es';
import { throwError } from '@utils/error-handling';
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
  run: () => Promise<T>
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
    run
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
  traversal.depth++;
  try {
    const orderedOperations = operations.map((operation, index) => ({ operation, index }));
    if (options?.doOnlyConditionals || options?.doConditionals) {
      // Resolve self-guarded rank grants before sibling effects that read the granted proficiency.
      orderedOperations.sort(
        (left, right) =>
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
  sourceLabel?: string
): Promise<OperationResult> {
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
          runSelected
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

/** Drops deferred writes from a previous (possibly aborted) execution. */
export function clearDeferredOperations(): void {
  deferredOperations = [];
}

/** Apply explicit language replacements after grants, then bindings in their original order against final values. */
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
  for (const bind of pending) {
    if (bind.type !== 'bind') continue;
    const bindValue = getVariable(bind.value.storeId, bind.value.variable);
    if (bindValue) {
      await withVariableEffectScopes(bind.varId, bind.scopes, async () => {
        setVariable(bind.varId, bind.variable, bindValue.value, bind.sourceLabel);
      });
    }
  }
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
      }
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
  if (trait.meta_data?.class_trait) {
    addVariable(varId, 'num', labelToVariable(`TRAIT_CLASS_${trait.name}_IDS`), trait.id, sourceLabel);
  } else if (trait.meta_data?.archetype_trait) {
    addVariable(varId, 'num', labelToVariable(`TRAIT_ARCHETYPE_${trait.name}_IDS`), trait.id, sourceLabel);
  } else if (
    trait.meta_data?.ancestry_trait ||
    trait.meta_data?.creature_trait ||
    trait.meta_data?.versatile_heritage_trait ||
    trait.meta_data?.companion_type_trait
  ) {
    addVariable(varId, 'num', labelToVariable(`TRAIT_ANCESTRY_${trait.name}_IDS`), trait.id, sourceLabel);
  } else {
    console.warn(
      `Trait is not a class, archetype, ancestry, or creature trait so it can't be given to a character: ${trait.name} (${trait.id})`
    );
    displayError(
      `Trait is not a class, archetype, ancestry, or creature trait so it can't be given to a character: ${trait.name} (${trait.id})`
    );
  }

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
    filterVariableList(varId, 'ACTIVE_MODES', (mode) => mode !== labelToVariable(abilityBlock.name), sourceLabel);
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
  sourceLabel?: string
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
        return varValue.map((v) => labelToVariable(v)).includes(labelToVariable(`${check.value}`));
      } else if (check.operator === 'NOT_INCLUDES') {
        return !varValue.map((v) => labelToVariable(v)).includes(labelToVariable(`${check.value}`));
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
      if (check.operator === 'EQUALS') {
        return profType === check.value;
      } else if (check.operator === 'GREATER_THAN') {
        return rankOf(profType) > rankOf(check.value as ProficiencyType);
      } else if (check.operator === 'LESS_THAN') {
        return rankOf(profType) < rankOf(check.value as ProficiencyType);
      } else if (check.operator === 'NOT_EQUALS') {
        return profType !== check.value;
      } else if (check.operator === 'GREATER_THAN_OR_EQUALS') {
        return rankOf(profType) >= rankOf(check.value as ProficiencyType);
      } else if (check.operator === 'LESS_THAN_OR_EQUALS') {
        return rankOf(profType) <= rankOf(check.value as ProficiencyType);
      }
    }
    return false;
  };

  let isTrue = true;
  for (const check of operation.data.conditions ?? []) {
    if (!makeCheck(check)) {
      isTrue = false;
    }
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
