import {
  AbilityBlock,
  Ancestry,
  Character,
  Class,
  ContentPackage,
  ContentSource,
  Item,
} from '@typing/content';
import { getRootSelection, setSelections } from './selection-tree';
import { Operation, OperationSelect } from '@typing/operations';
import { OperationOptions, OperationResult, runOperations } from './operation-runner';
import { addVariable, getVariable, resetVariables } from '@variables/variable-manager';
import { isAttributeValue } from '@variables/variable-utils';
import _ from 'lodash';

function defineSelectionTree(character: Character) {
  if (character.operation_data?.selections) {
    setSelections(
      [...Object.entries(character.operation_data.selections)].map(([key, value]) => ({
        key,
        value,
      }))
    );
  }
}

async function executeOperations(
  primarySource: string,
  operations: Operation[],
  options?: OperationOptions
) {
  const selectionNode = getRootSelection().children[primarySource];
  let results = await runOperations(selectionNode, operations, _.cloneDeep(options));

  // Make it so you can only select boosts that haven't been selected (or given) yet
  results = limitBoostOptions(operations, results);

  return results;
}

/*
    Algo:

    - Run value creation for content_source
    - Run value creation for character
    - Run value creation for class
      - Class features
    - Run value creation for ancestry
      - Heritage
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
*/
export async function executeCharacterOperations(character: Character, content: ContentPackage) {
  resetVariables();
  defineSelectionTree(character);

  const class_ = content.classes.find((c) => c.id === character.details?.class?.id);
  const background = content.backgrounds.find((b) => b.id === character.details?.background?.id);
  const ancestry = content.ancestries.find((a) => a.id === character.details?.ancestry?.id);
  const heritage = content.abilityBlocks.find(
    (ab) => ab.id === character.details?.heritage?.id && ab.type === 'heritage'
  );

  const classFeatures = content.abilityBlocks
    .filter((ab) => ab.type === 'class-feature' && ab.traits?.includes(class_?.trait_id ?? -1))
    .sort((a, b) => {
      if (a.level !== undefined && b.level !== undefined) {
        if (a.level !== b.level) {
          return a.level - b.level;
        }
      }
      return a.name.localeCompare(b.name);
    });

  const operationsPassthrough = async (options?: OperationOptions) => {
    let contentSourceResults: { baseSource: ContentSource; baseResults: OperationResult[] }[] = [];
    for (const source of content.sources ?? []) {
      const results = await executeOperations(
        `content-source-${source.id}`,
        source.operations ?? [],
        options
      );

      if (results.length > 0) {
        contentSourceResults.push({
          baseSource: source,
          baseResults: results,
        });
      }
    }

    let characterResults = await executeOperations(
      'character',
      character.custom_operations ?? [],
      options
    );

    let classResults: OperationResult[] = [];
    if (class_) {
      classResults = await executeOperations('class', getExtendedClassOperations(class_), options);
    }

    let classFeatureResults: { baseSource: AbilityBlock; baseResults: OperationResult[] }[] = [];
    for (const feature of classFeatures) {
      if (feature.level === undefined || feature.level <= character.level) {
        const results = await executeOperations(
          `class-feature-${feature.id}`,
          feature.operations ?? [],
          options
        );

        classFeatureResults.push({
          baseSource: feature,
          baseResults: results,
        });
      }
    }

    let ancestryResults: OperationResult[] = [];
    if (ancestry) {
      ancestryResults = await executeOperations(
        'ancestry',
        getExtendedAncestryOperations(ancestry),
        options
      );
      console.log(ancestryResults, getExtendedAncestryOperations(ancestry));
    }

    let heritageResults: OperationResult[] = [];
    if (ancestry) {
      heritageResults = await executeOperations(
        'heritage',
        getExtendedHeritageOperations(ancestry, heritage),
        options
      );
    }

    let backgroundResults: OperationResult[] = [];
    if (background) {
      backgroundResults = await executeOperations(
        'background',
        background.operations ?? [],
        options
      );
    }

    let itemResults: { baseSource: Item; baseResults: OperationResult[] }[] = [];
    // TODO: items

    return {
      contentSourceResults,
      characterResults,
      classResults,
      classFeatureResults,
      ancestryResults,
      heritageResults,
      backgroundResults,
      itemResults,
    };
  };

  // Value creation round //
  await operationsPassthrough({ doOnlyValueCreation: true });
  // define values for any weapons or lores
  for (const value of Object.values(character?.operation_data?.selections ?? {})) {
    if (
      value.startsWith('SKILL_LORE_') ||
      value.startsWith('WEAPON_') ||
      value.startsWith('WEAPON_GROUP_')
    ) {
      addVariable('prof', value, 'U');
    }
  }

  // Non-conditional round //
  const results = await operationsPassthrough();
  // Conditional round //
  const conditionalResults = await operationsPassthrough({
    doOnlyConditionals: true,
    onlyConditionalsWhitelist: [
      ...(class_ ? addedClassSkillTrainings(class_) : []).map((op) => op.id),
      ...(ancestry ? addedAncestryLanguages(ancestry) : []).map((op) => op.id),
    ],
  });

  console.log(results, conditionalResults, mergeOperationResults(results, conditionalResults));
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

function limitBoostOptions(
  operations: Operation[],
  operationResults: OperationResult[]
): OperationResult[] {
  operationResults = _.cloneDeep(operationResults);
  const unselectedOptions: string[] = [];

  console.log(operations, operationResults);

  // Pull from all selections already made
  for (const opR of operationResults) {
    const selectedOption = opR?.result?.source?.variable;
    const amount = opR?.result?.source?.value;
    if (selectedOption && +amount === 1 && selectedOption.startsWith('ATTRIBUTE_')) {
      unselectedOptions.push(selectedOption);
    }
  }

  // Pull from all hardset attribute boosts
  for (const op of operations) {
    if (op.type === 'adjValue') {
      // setValue isn't a boost
      if (+op.data.value === 1) {
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
          +option.value === 1 &&
          opR?.result?.source?.variable !== option.variable
        ) {
          return false;
        }
        return true;
      });
    }
  }
  console.log(unselectedOptions);

  return operationResults;
}

export function getExtendedClassOperations(class_: Class) {
  let classOperations = [...(class_.operations ?? [])];

  classOperations.push(...addedClassSkillTrainings(class_));

  return classOperations;
}

export function addedClassSkillTrainings(class_: Class): OperationSelect[] {
  let operations: OperationSelect[] = [];

  // Operations for adding skill trainings equal to Int attribute modifier
  const baseTrainings = class_.skill_training_base;
  const intVariableValue = getVariable('ATTRIBUTE_INT')?.value;
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
          value: 'T',
        },
      },
    });
  }

  return operations;
}

export function getExtendedAncestryOperations(ancestry: Ancestry) {
  let ancestryOperations = [...(ancestry.operations ?? [])];

  ancestryOperations.push(...addedAncestryLanguages(ancestry));

  return ancestryOperations;
}

export function addedAncestryLanguages(ancestry: Ancestry): OperationSelect[] {
  let operations: OperationSelect[] = [];

  // Operations for adding skill trainings equal to Int attribute modifier
  const intVariableValue = getVariable('ATTRIBUTE_INT')?.value;
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

export function getExtendedHeritageOperations(ancestry: Ancestry, heritage?: AbilityBlock) {
  return [...addedAncestryHeritage(ancestry), ...(heritage?.operations ?? [])];
}

export function addedAncestryHeritage(ancestry: Ancestry): OperationSelect[] {
  let operations: OperationSelect[] = [];

  // Operation for selecting a heritage
  operations.push({
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
        traits: [ancestry.trait_id],
        abilityBlockType: 'heritage',
      },
    },
  });

  return operations;
}
