import { AbilityBlock, Character, Class, ContentPackage, ContentSource, Item } from '@typing/content';
import { getRootSelection, setSelections } from './selection-tree';
import { Operation, OperationSelect } from '@typing/operations';
import { OperationOptions, OperationResult, runOperations } from './operation-runner';
import { addVariable, getVariable, resetVariables } from '@variables/variable-manager';
import { isAttributeValue } from '@variables/variable-utils';

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
  const results = await runOperations(selectionNode, operations, options);

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
      ancestryResults = await executeOperations('ancestry', ancestry.operations ?? [], options);
    }

    let heritageResults: OperationResult[] = [];
    if (heritage) {
      heritageResults = await executeOperations('heritage', heritage.operations ?? [], options);
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
    if(value.startsWith('SKILL_LORE_') || value.startsWith('WEAPON_') || value.startsWith('WEAPON_GROUP_')) {
      addVariable('prof', value, 'U');
    }
  }

  // Non-conditional round //
  const results = await operationsPassthrough();
  // Conditional round //
  const conditionalResults = await operationsPassthrough({ doOnlyConditionals: true });

  console.log(results);
  console.log(conditionalResults);

  return {
    results,
    conditionalResults,
  };
}


export function getExtendedClassOperations(class_: Class) {

  let classOperations = [...class_.operations ?? []];

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
