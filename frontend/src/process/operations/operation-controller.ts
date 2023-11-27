import { AbilityBlock, Character, ContentPackage, ContentSource, Item } from '@typing/content';
import { getRootSelection, setSelections } from './selection-tree';
import { Operation } from '@typing/operations';
import { OperationOptions, OperationResult, runOperations } from './operation-runner';

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
      classResults = await executeOperations('class', class_.operations ?? [], options);
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
