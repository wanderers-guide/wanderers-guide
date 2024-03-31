import { AbilityBlock, Ancestry, Character, Class, ContentPackage, ContentSource, Item } from '@typing/content';
import { getRootSelection, resetSelections, setSelections } from './selection-tree';
import { Operation, OperationResultPackage, OperationSelect } from '@typing/operations';
import { OperationOptions, OperationResult, runOperations } from './operation-runner';
import { addVariable, getVariable, resetVariables, setVariable } from '@variables/variable-manager';
import { isAttributeValue } from '@variables/variable-utils';
import * as _ from 'lodash-es';
import { hashData } from '@utils/numbers';
import { StoreID, VariableListStr } from '@typing/variables';
import { getFlatInvItems, isItemEquippable, isItemInvestable } from '@items/inv-utils';

function defineSelectionTree(character: Character) {
  if (character.operation_data?.selections) {
    setSelections(
      [...Object.entries(character.operation_data.selections)].map(([key, value]) => ({
        key,
        value,
      }))
    );
  } else {
    resetSelections();
  }
}

async function executeOperations(
  varId: StoreID,
  primarySource: string,
  operations: Operation[],
  options?: OperationOptions,
  sourceLabel?: string
) {
  const selectionNode = getRootSelection().children[primarySource];
  let results = await runOperations(varId, selectionNode, operations, _.cloneDeep(options), sourceLabel);

  // Make it so you can only select boosts that haven't been selected (or given) yet
  results = limitBoostOptions(operations, results);

  return results;
}

/*
    Algo:

    - Run variable creation only for everything

    - Run "normal" round for everything

    - Run conditionals only (and sub-operations of conditionals) for everything
        - The extra class skill trainings and ancestry languages are based on Int mod,
          which makes them almost like a conditional, they need to be run here as well.
        - If, in the future, we add a way to execute a list of operations X times, where
          X is based on a value of a variable, those would also need to be run here.
*/
export async function executeCharacterOperations(
  character: Character,
  content: ContentPackage,
  context: string
): Promise<OperationResultPackage> {
  resetVariables();
  defineSelectionTree(character);
  setVariable('CHARACTER', 'PAGE_CONTEXT', context);
  setVariable('CHARACTER', 'LEVEL', character.level);

  const class_ = content.classes.find((c) => c.id === character.details?.class?.id);
  const class_2 = content.classes.find((c) => c.id === character.details?.class_2?.id);
  const background = content.backgrounds.find((b) => b.id === character.details?.background?.id);
  const ancestry = content.ancestries.find((a) => a.id === character.details?.ancestry?.id);

  const baseClassTrainings = Math.max(class_?.skill_training_base ?? 0, class_2?.skill_training_base ?? 0);

  const classFeatures_1 = content.abilityBlocks
    .filter((ab) => ab.type === 'class-feature' && ab.traits?.includes(class_?.trait_id ?? -1))
    .sort((a, b) => {
      if (a.level !== undefined && b.level !== undefined) {
        if (a.level !== b.level) {
          return a.level - b.level;
        }
      }
      return a.name.localeCompare(b.name);
    });

  const classFeatures_2 = content.abilityBlocks
    .filter((ab) => ab.type === 'class-feature' && ab.traits?.includes(class_2?.trait_id ?? -1))
    .sort((a, b) => {
      if (a.level !== undefined && b.level !== undefined) {
        if (a.level !== b.level) {
          return a.level - b.level;
        }
      }
      return a.name.localeCompare(b.name);
    });

  // Merge both but only keep one if they both have the same name and level
  const classFeatures = _.unionWith(
    classFeatures_1,
    classFeatures_2,
    (a, b) => a.name.trim() === b.name.trim() && a.level === b.level
  );

  const operationsPassthrough = async (options?: OperationOptions) => {
    let contentSourceResults: {
      baseSource: ContentSource;
      baseResults: OperationResult[];
    }[] = [];
    for (const source of content.sources ?? []) {
      const results = await executeOperations(
        'CHARACTER',
        `content-source-${source.id}`,
        source.operations ?? [],
        options,
        source.name
      );

      if (results.length > 0) {
        contentSourceResults.push({
          baseSource: source,
          baseResults: results,
        });
      }
    }

    let characterResults = await executeOperations(
      'CHARACTER',
      'character',
      character.options?.custom_operations ? character.custom_operations ?? [] : [],
      options,
      'Custom'
    );

    let classResults: OperationResult[] = [];
    if (class_) {
      classResults = await executeOperations(
        'CHARACTER',
        'class',
        getExtendedClassOperations('CHARACTER', class_, baseClassTrainings),
        options,
        class_.name
      );
    }

    let class2Results: OperationResult[] = [];
    if (class_2) {
      class2Results = await executeOperations(
        'CHARACTER',
        'class-2',
        getExtendedClassOperations('CHARACTER', class_2, null),
        options,
        class_2.name
      );
    }

    let ancestryResults: OperationResult[] = [];
    if (ancestry) {
      ancestryResults = await executeOperations(
        'CHARACTER',
        'ancestry',
        getExtendedAncestryOperations('CHARACTER', ancestry),
        options,
        ancestry.name
      );
    }

    let backgroundResults: OperationResult[] = [];
    if (background) {
      backgroundResults = await executeOperations(
        'CHARACTER',
        'background',
        background.operations ?? [],
        options,
        background.name
      );
    }

    // Ancestry heritage and feats
    let ancestrySectionResults: {
      baseSource: AbilityBlock;
      baseResults: OperationResult[];
    }[] = [];
    if (ancestry) {
      for (const section of getAncestrySections('CHARACTER', ancestry)) {
        if (section.level === undefined || section.level <= character.level) {
          const results = await executeOperations(
            'CHARACTER',
            `ancestry-section-${section.id}`,
            section.operations ?? [],
            options,
            `${section.name} (Lvl. ${section.level})`
          );

          ancestrySectionResults.push({
            baseSource: section,
            baseResults: results,
          });
        }
      }
    }

    let classFeatureResults: {
      baseSource: AbilityBlock;
      baseResults: OperationResult[];
    }[] = [];
    for (const feature of classFeatures) {
      if (feature.level === undefined || feature.level <= character.level) {
        const results = await executeOperations(
          'CHARACTER',
          `class-feature-${feature.id}`,
          feature.operations ?? [],
          options,
          `${feature.name} (Lvl. ${feature.level})`
        );

        classFeatureResults.push({
          baseSource: feature,
          baseResults: results,
        });
      }
    }

    let itemResults: { baseSource: Item; baseResults: OperationResult[] }[] = [];
    for (const invItem of character.inventory ? getFlatInvItems(character.inventory) : []) {
      // If item can be invested, only run operations if it is
      if (isItemInvestable(invItem.item) && !invItem.is_invested) {
        continue;
      }
      // If item can be equipped, only run operations if it is
      if (isItemEquippable(invItem.item) && !invItem.is_equipped) {
        continue;
      }

      const results = await executeOperations(
        'CHARACTER',
        `item-${invItem.item.id}`,
        invItem.item.operations ?? [],
        options,
        invItem.item.name
      );

      if (results.length > 0) {
        itemResults.push({
          baseSource: invItem.item,
          baseResults: results,
        });
      }
    }

    return {
      contentSourceResults,
      characterResults,
      classResults,
      class2Results,
      classFeatureResults,
      ancestryResults,
      ancestrySectionResults,
      backgroundResults,
      itemResults,
    };
  };

  // Value creation round //
  await operationsPassthrough({ doOnlyValueCreation: true });
  // define values for any weapons or lores
  for (const value of Object.values(character?.operation_data?.selections ?? {})) {
    if (value.startsWith('SKILL_LORE_')) {
      addVariable('CHARACTER', 'prof', value, {
        value: 'U',
        attribute: 'ATTRIBUTE_INT',
      });
    } else if (value.startsWith('WEAPON_') || value.startsWith('WEAPON_GROUP_')) {
      addVariable('CHARACTER', 'prof', value);
    }
  }

  // Normal round //
  const results = await operationsPassthrough();

  // Conditional round //
  const conditionalResults = await operationsPassthrough({
    doOnlyConditionals: true,
    onlyConditionalsWhitelist: [
      ...(class_ ? addedClassSkillTrainings('CHARACTER', baseClassTrainings) : []).map((op) => op.id),
      ...(ancestry ? addedAncestryLanguages('CHARACTER', ancestry) : []).map((op) => op.id),
    ],
  });

  return mergeOperationResults(results, conditionalResults) as typeof results;
}

function mergeOperationResults(normal: Record<string, any[]>, conditional: Record<string, any[]>) {
  const merged = _.cloneDeep(normal);
  // Merge simple arrays
  for (const [key, value] of Object.entries(conditional)) {
    if (merged[key]) {
      merged[key].push(...value);
    } else {
      merged[key] = value;
    }
    merged[key] = merged[key].filter((v: any) => v);
  }

  // Merge arrays of results (like class features)
  for (const [key, value] of Object.entries(merged)) {
    const newValue: any[] = [];
    let found = false;
    for (const v of value) {
      if (v.baseSource && Array.isArray(v.baseResults)) {
        found = true;
        const duplicate = value.find((v2) => v2.baseSource?.id === v.baseSource?.id);
        if (duplicate) {
          v.baseResults.push(...duplicate.baseResults);
          v.baseResults = _.uniq(v.baseResults);
        }
        if (!newValue.find((v2) => v2.baseSource?.id === v.baseSource?.id)) {
          newValue.push(v);
        }
      }
    }
    if (found) {
      merged[key] = newValue;
    }
  }

  return merged;
}

function limitBoostOptions(operations: Operation[], operationResults: OperationResult[]): OperationResult[] {
  operationResults = _.cloneDeep(operationResults);
  const unselectedOptions: string[] = [];

  // Pull from all selections already made
  for (const opR of operationResults) {
    const selectedOption = opR?.result?.source?.variable;
    const amount = opR?.result?.source?.value?.value;
    if (selectedOption && +amount === 1 && selectedOption.startsWith('ATTRIBUTE_')) {
      unselectedOptions.push(selectedOption);
    }
  }

  // Pull from all hardset attribute boosts
  for (const op of operations) {
    if (op.type === 'adjValue') {
      // setValue isn't a boost
      // @ts-ignore
      if (+op.data?.value?.value === 1) {
        // Must be +1 to be a boost
        unselectedOptions.push(op.data.variable);
      }
    }
  }

  // Limit all boosts to only be selectable if they haven't been given yet
  for (const opR of operationResults) {
    if (opR?.selection?.options) {
      opR.selection.options = opR.selection.options.filter((option) => {
        if (
          unselectedOptions.includes(option.variable) &&
          +option.value?.value === 1 &&
          opR?.result?.source?.variable !== option.variable
        ) {
          return false;
        }
        return true;
      });
    }
  }

  return operationResults;
}

export function getExtendedClassOperations(varId: StoreID, class_: Class, baseTrainings: number | null) {
  let classOperations = _.cloneDeep(class_.operations ?? []);

  if (baseTrainings !== null) {
    classOperations.push(...addedClassSkillTrainings(varId, baseTrainings));
  }

  return classOperations;
}

export function addedClassSkillTrainings(varId: StoreID, baseTrainings: number): OperationSelect[] {
  let operations: OperationSelect[] = [];

  // Operations for adding skill trainings equal to Int attribute modifier
  const intVariableValue = getVariable(varId, 'ATTRIBUTE_INT')?.value;
  const intValue = isAttributeValue(intVariableValue) ? intVariableValue.value : 0;
  for (let i = 0; i < baseTrainings + intValue; i++) {
    operations.push({
      id: `720d2fe6-f042-4353-8313-1293375b1301-${i}`,
      type: 'select',
      data: {
        title: 'Select a Skill to be Trained',
        modeType: 'FILTERED',
        optionType: 'ADJ_VALUE',
        optionsPredefined: [],
        optionsFilters: {
          id: `f8703468-ab35-4f84-8dc7-7c48556258e3-${i}`,
          type: 'ADJ_VALUE',
          group: 'SKILL',
          value: { value: 'T' },
        },
      },
    });
  }

  return operations;
}

export function getExtendedAncestryOperations(varId: StoreID, ancestry: Ancestry) {
  let ancestryOperations = _.cloneDeep(ancestry.operations ?? []);

  ancestryOperations.push(...addedAncestryLanguages(varId, ancestry));

  return ancestryOperations;
}

export function addedAncestryLanguages(varId: StoreID, ancestry: Ancestry): OperationSelect[] {
  let operations: OperationSelect[] = [];

  // Operations for adding skill trainings equal to Int attribute modifier
  const intVariableValue = getVariable(varId, 'ATTRIBUTE_INT')?.value;
  const intValue = isAttributeValue(intVariableValue) ? intVariableValue.value : 0;
  if (intValue <= 0) return operations;
  for (let i = 0; i < intValue; i++) {
    operations.push({
      id: `957ee14b-c6dc-44eb-881b-e99a1b4e5118-${i}`,
      type: 'select',
      data: {
        title: 'Select a Language',
        modeType: 'FILTERED',
        optionType: 'LANGUAGE',
        optionsPredefined: [],
        optionsFilters: {
          id: `688aa1e3-226d-424b-b762-2b3c2bec36c1-${i}`,
          type: 'LANGUAGE',
          core: true,
        },
      },
    });
  }

  return operations;
}

export function getAncestrySections(varId: StoreID, ancestry: Ancestry): AbilityBlock[] {
  const extraTraitIds = getVariable<VariableListStr>(varId, 'EXTRA_TRAIT_IDS')?.value.map((v) => parseInt(v)) ?? [];

  const heritage: AbilityBlock = {
    id: hashData({ name: 'heritage' }),
    created_at: '',
    operations: [
      {
        id: '3fd6a268-771b-49fc-93ed-9b53695d1a29',
        type: 'select',
        data: {
          title: 'Select a Heritage',
          modeType: 'FILTERED',
          optionType: 'ABILITY_BLOCK',
          optionsPredefined: [],
          optionsFilters: {
            id: 'c8dc1601-4c97-4838-9bd5-31d0e6b87286',
            type: 'ABILITY_BLOCK',
            level: {},
            traits: [...extraTraitIds, ancestry.trait_id],
            abilityBlockType: 'heritage',
          },
        },
      },
    ],
    name: 'Heritage',
    actions: null,
    level: 1,
    rarity: 'COMMON',
    description: `You select a heritage to reflect abilities passed down to you from your ancestors or
    common among those of your ancestry in the environment where you were raised.`,
    type: 'heritage',
    content_source_id: -1,
  };

  const getAncestryFeat = (index: number, level: number): AbilityBlock => {
    return {
      id: hashData({ name: `ancestry-feat-${index}` }),
      created_at: '',
      operations: [
        {
          id: `9f26290c-a2db-4c45-9b34-5053e60c106d-${index}`,
          type: 'select',
          data: {
            title: 'Select a Feat',
            modeType: 'FILTERED',
            optionType: 'ABILITY_BLOCK',
            optionsPredefined: [],
            optionsFilters: {
              id: `31634b70-4ea4-447f-9743-817509d601df-${index}`,
              type: 'ABILITY_BLOCK',
              level: {
                max: level,
              },
              traits: [...extraTraitIds, ancestry.trait_id],
              abilityBlockType: 'feat',
            },
          },
        },
      ],
      name: `${ancestry.name} Feat`,
      actions: null,
      level: level,
      rarity: 'COMMON',
      description: `You gain an ancestry feat.`,
      type: 'class-feature',
      content_source_id: -1,
    };
  };

  const sections = [heritage];
  const featArray = [1, 5, 9, 13, 17];
  for (let i = 0; i < featArray.length; i++) {
    sections.push(getAncestryFeat(i, featArray[i]));
  }

  return sections;
}
