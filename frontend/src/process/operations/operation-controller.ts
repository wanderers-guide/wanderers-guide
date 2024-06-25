import {
  AbilityBlock,
  Ancestry,
  Character,
  Class,
  ContentPackage,
  ContentSource,
  Creature,
  Item,
  LivingEntity,
} from '@typing/content';
import { getRootSelection, resetSelections, setSelections } from './selection-tree';
import {
  Operation,
  OperationCharacterResultPackage,
  OperationCreatureResultPackage,
  OperationSelect,
} from '@typing/operations';
import { OperationOptions, OperationResult, runOperations } from './operation-runner';
import {
  addVariable,
  adjVariable,
  getAllAttributeVariables,
  getVariable,
  resetVariables,
  setVariable,
} from '@variables/variable-manager';
import { isAttributeValue, labelToVariable } from '@variables/variable-utils';
import * as _ from 'lodash-es';
import { hashData, rankNumber } from '@utils/numbers';
import { StoreID, VariableListStr } from '@typing/variables';
import { getFlatInvItems, isItemEquippable, isItemInvestable } from '@items/inv-utils';
import { playingPathfinder, playingStarfinder } from '@content/system-handler';
import { isAbilityBlockVisible } from '@content/content-hidden';

function defineSelectionTree(entity: LivingEntity) {
  if (entity.operation_data?.selections) {
    setSelections(
      [...Object.entries(entity.operation_data.selections)].map(([key, value]) => ({
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
  let results = await runOperations(
    varId,
    { path: `${primarySource}_${selectionNode?.value}`, node: selectionNode },
    operations,
    _.cloneDeep(options),
    sourceLabel
  );

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
): Promise<OperationCharacterResultPackage> {
  resetVariables('CHARACTER');
  defineSelectionTree(character);
  setVariable('CHARACTER', 'PAGE_CONTEXT', context);
  setVariable('CHARACTER', 'PATHFINDER', playingPathfinder(character));
  setVariable('CHARACTER', 'STARFINDER', playingStarfinder(character));
  setVariable('CHARACTER', 'ORGANIZED_PLAY', character.options?.organized_play ?? false);

  setVariable('CHARACTER', 'LEVEL', character.level);

  try {
    console.log(JSON.parse(localStorage.getItem(`active-modes-${character.id}`) || '[]'));
    setVariable(
      'CHARACTER',
      'ACTIVE_MODES',
      JSON.parse(localStorage.getItem(`active-modes-${character.id}`) || '[]'),
      'Loaded'
    );
  } catch (e) {}
  const modes = content.abilityBlocks.filter((block) => block.type === 'mode');

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
  let classFeatures = _.unionWith(
    classFeatures_1,
    classFeatures_2,
    (a, b) => a.name.trim() === b.name.trim() && a.level === b.level
  );

  // Free Archetype feat at every even level
  if (character.variants?.free_archetype) {
    for (const lvl of [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]) {
      classFeatures.push({
        id: hashData({ name: 'archetype-feat', level: lvl }),
        created_at: '',
        operations: [
          {
            id: `9594307d-b111-437f-a55a-de101e8d46b1-${lvl}`,
            type: 'select',
            data: {
              title: 'Select an Option',
              modeType: 'PREDEFINED',
              optionType: 'CUSTOM',
              optionsPredefined: [
                {
                  id: `354b57f0-ef29-4f53-819b-f1f211adfc7b-${lvl}`,
                  type: 'CUSTOM',
                  title: 'Add Archetype Feat',
                  description: "Select a feat from an existing archetype you're a part of.",
                  operations: [
                    {
                      id: `f8cbab2a-f19f-4209-9207-5eb30b43d4eb-${lvl}`,
                      type: 'select',
                      data: {
                        title: 'Select an Archetype Feat',
                        modeType: 'FILTERED',
                        optionType: 'ABILITY_BLOCK',
                        optionsPredefined: [],
                        optionsFilters: {
                          id: `56c57e8a-d346-409d-9f9f-e464cd2d1c0d-${lvl}`,
                          type: 'ABILITY_BLOCK',
                          level: {
                            max: lvl,
                          },
                          traits: [],
                          abilityBlockType: 'feat',
                          isFromArchetype: true,
                        },
                      },
                    },
                  ],
                },
                {
                  id: `a525eb70-e18f-4a95-80d9-29f6aaee0d3e-${lvl}`,
                  type: 'CUSTOM',
                  title: 'Add Dedication',
                  description: 'Select a new archetype for yourself.',
                  operations: [
                    {
                      id: `1c575456-4cb7-44eb-a153-9d6884b272a8-${lvl}`,
                      type: 'select',
                      data: {
                        title: 'Select a Dedication',
                        modeType: 'FILTERED',
                        optionType: 'ABILITY_BLOCK',
                        optionsPredefined: [],
                        optionsFilters: {
                          id: `fe1c27bf-ab6e-4e82-9795-8dd48a98ceae-${lvl}`,
                          type: 'ABILITY_BLOCK',
                          level: {
                            max: lvl,
                          },
                          traits: ['Dedication'],
                          abilityBlockType: 'feat',
                        },
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
        name: 'Archetype Feat',
        actions: null,
        level: lvl,
        rarity: 'COMMON',
        description: `You gain a class feat that you can only use for archetypes.`,
        type: 'class-feature',
        content_source_id: -1,
      } satisfies AbilityBlock);
    }
  }

  // Gradual Attribute Boosts
  if (character.variants?.gradual_attribute_boosts) {
    const newClassFeatures: AbilityBlock[] = [];
    for (const cf of classFeatures) {
      if (!(cf.name.trim() === 'Attribute Boosts' && cf.operations?.length === 4) || cf.level === 1) {
        newClassFeatures.push(cf);
        continue;
      }

      const newBoostClassFeatures: AbilityBlock[] = [];
      for (let i = 0; i < 4; i++) {
        const newId = hashData({ name: 'attribute-boost', index: i, id: cf.id });
        newBoostClassFeatures.push({
          ...cf,
          id: newId,
          level: (cf.level ?? 0) - i,
          description: `You gain a single boost in an attribute. If the attribute modifier is already +4 or higher, it takes two boosts to increase it; you get a partial boost and must boost the attribute again at a later level to increase it by 1.\n\n_You can't choose the same attribute more than once per set (${rankNumber((cf.level ?? 0) - 3)}-${rankNumber(cf.level ?? 0)} level boosts)._`,
          operations: [
            {
              id: `32f84fc9-8e95-44c0-b096-54c392fccc6a-${newId}`,
              type: 'select',
              data: {
                title: 'Select an Attribute',
                modeType: 'FILTERED',
                optionType: 'ADJ_VALUE',
                optionsPredefined: [],
                optionsFilters: {
                  id: `03f5134a-4d00-4def-966f-a2deeb3259e7-${newId}`,
                  type: 'ADJ_VALUE',
                  group: 'ATTRIBUTE',
                  value: {
                    value: 1,
                  },
                },
              },
            },
          ],
        });
      }
      newClassFeatures.push(...newBoostClassFeatures);
    }
    classFeatures = newClassFeatures;
  }

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
        getAdjustedClassOperations('CHARACTER', class_, baseClassTrainings),
        options,
        class_.name
      );
      addVariable('CHARACTER', 'num', labelToVariable(`TRAIT_CLASS_${class_.name}_IDS`), class_.trait_id, class_.name);

      // Add class to variables
      adjVariable('CHARACTER', 'CLASS_IDS', `${class_.id}`, undefined);
      adjVariable('CHARACTER', 'CLASS_NAMES', class_.name.toUpperCase(), undefined);
    }

    let class2Results: OperationResult[] = [];
    if (class_2) {
      class2Results = await executeOperations(
        'CHARACTER',
        'class-2',
        getAdjustedClassOperations('CHARACTER', class_2, null),
        options,
        class_2.name
      );
      addVariable(
        'CHARACTER',
        'num',
        labelToVariable(`TRAIT_CLASS_${class_2.name}_IDS`),
        class_2.trait_id,
        class_2.name
      );

      // Add class to variables
      adjVariable('CHARACTER', 'CLASS_IDS', `${class_2.id}`, undefined);
      adjVariable('CHARACTER', 'CLASS_NAMES', class_2.name.toUpperCase(), undefined);
    }

    let ancestryResults: OperationResult[] = [];
    if (ancestry) {
      ancestryResults = await executeOperations(
        'CHARACTER',
        'ancestry',
        getAdjustedAncestryOperations('CHARACTER', character, getExtendedAncestryOperations('CHARACTER', ancestry)),
        options,
        ancestry.name
      );
      addVariable(
        'CHARACTER',
        'num',
        labelToVariable(`TRAIT_ANCESTRY_${ancestry.name}_IDS`),
        ancestry.trait_id,
        ancestry.name
      );

      // Add ancestry to variables
      adjVariable('CHARACTER', 'ANCESTRY_IDS', `${ancestry.id}`, undefined);
      adjVariable('CHARACTER', 'ANCESTRY_NAMES', ancestry.name.toUpperCase(), undefined);
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

      // Add background to variables
      adjVariable('CHARACTER', 'BACKGROUND_IDS', `${background.id}`, undefined);
      adjVariable('CHARACTER', 'BACKGROUND_NAMES', background.name.toUpperCase(), undefined);
    }

    // Ancestry heritage and feats
    let ancestrySectionResults: {
      baseSource: AbilityBlock;
      baseResults: OperationResult[];
    }[] = [];
    if (ancestry) {
      for (const section of getAncestrySections('CHARACTER', ancestry, character.variants?.ancestry_paragon ?? false)) {
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
    for (const feature of classFeatures.filter((cf) => isAbilityBlockVisible('CHARACTER', cf))) {
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

        // Add class feature to variables
        adjVariable('CHARACTER', 'CLASS_FEATURE_IDS', `${feature.id}`, undefined);
        adjVariable('CHARACTER', 'CLASS_FEATURE_NAMES', feature.name.toUpperCase(), undefined);
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

    let modeResults: { baseSource: AbilityBlock; baseResults: OperationResult[] }[] = [];
    const activeModes = getVariable<VariableListStr>('CHARACTER', 'ACTIVE_MODES')?.value || [];
    console.log(
      activeModes,
      modes.filter((m) => activeModes.includes(labelToVariable(m.name)))
    );
    for (const mode of modes.filter((m) => activeModes.includes(labelToVariable(m.name)))) {
      const results = await executeOperations(
        'CHARACTER',
        `mode-${mode.id}`,
        mode.operations ?? [],
        options,
        `${mode.name} Mode`
      );

      if (results.length > 0) {
        modeResults.push({
          baseSource: mode,
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
      modeResults, // TODO, Not used atm
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

export async function executeCreatureOperations(
  id: StoreID,
  creature: Creature,
  content: ContentPackage
): Promise<OperationCreatureResultPackage> {
  resetVariables(id);
  defineSelectionTree(creature);
  setVariable('CHARACTER', 'PAGE_CONTEXT', 'CHARACTER-SHEET');

  setVariable(id, 'LEVEL', creature.level);

  const abilities = [
    ...(creature.abilities_base ?? []),
    ...((creature.abilities_added
      ?.map((id) => {
        return content.abilityBlocks.find((ab) => ab.id === id);
      })
      .filter((ab) => ab) ?? []) as AbilityBlock[]),
  ];

  const operationsPassthrough = async (options?: OperationOptions) => {
    let creatureResults = await executeOperations(id, 'creature', creature.operations ?? [], options, creature.name);

    let abilityResults: {
      baseSource: AbilityBlock;
      baseResults: OperationResult[];
    }[] = [];
    for (const ability of abilities) {
      const results = await executeOperations(
        id,
        `ability-${ability.id}`,
        ability.operations ?? [],
        options,
        ability.name
      );

      abilityResults.push({
        baseSource: ability,
        baseResults: results,
      });

      // Add ability to variables
      adjVariable(id, 'FEAT_IDS', `${ability.id}`, undefined);
      adjVariable(id, 'FEAT_NAMES', ability.name.toUpperCase(), undefined);
    }

    let itemResults: { baseSource: Item; baseResults: OperationResult[] }[] = [];
    for (const invItem of creature.inventory ? getFlatInvItems(creature.inventory) : []) {
      // If item can be invested, only run operations if it is
      if (isItemInvestable(invItem.item) && !invItem.is_invested) {
        continue;
      }
      // If item can be equipped, only run operations if it is
      if (isItemEquippable(invItem.item) && !invItem.is_equipped) {
        continue;
      }

      const results = await executeOperations(
        id,
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
      creatureResults,
      abilityResults,
      itemResults,
    };
  };

  // Value creation round //
  await operationsPassthrough({ doOnlyValueCreation: true });
  // define values for any weapons or lores
  for (const value of Object.values(creature?.operation_data?.selections ?? {})) {
    if (value.startsWith('SKILL_LORE_')) {
      addVariable(id, 'prof', value, {
        value: 'U',
        attribute: 'ATTRIBUTE_INT',
      });
    } else if (value.startsWith('WEAPON_') || value.startsWith('WEAPON_GROUP_')) {
      addVariable(id, 'prof', value);
    }
  }

  // Normal round //
  const results = await operationsPassthrough();

  // Conditional round //
  const conditionalResults = await operationsPassthrough({
    doOnlyConditionals: true,
  });

  return mergeOperationResults(results, conditionalResults) as typeof results;
}

function mergeOperationResults(normal: Record<string, any[]>, conditional: Record<string, any[]>) {
  const merged = _.cloneDeep(normal);
  // Merge simple arrays
  for (const [key, value] of Object.entries(_.cloneDeep(conditional))) {
    if (merged[key]) {
      merged[key].push(...value);
    } else {
      merged[key] = value;
    }
    merged[key] = _.uniqWith(
      merged[key].filter((v: any) => v),
      _.isEqual
    );
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
          v.baseResults = _.mergeWith([], duplicate.baseResults, v.baseResults, (objValue, srcValue) => {
            // Only update "null" or "undefined" values
            if (objValue === null || objValue === undefined) {
              return srcValue;
            }
          });

          /* Old way of merging, but doesn't work with nested arrays
          // 'Duplicate', v.baseSource?.id, duplicate.baseResults);
          v.baseResults.unshift(...duplicate.baseResults);
          v.baseResults = _.uniq(v.baseResults);
          */
        }
        if (!newValue.find((v2) => v2.baseSource?.id === v.baseSource?.id)) {
          newValue.push(v);
        }
      }
    }
    if (found) {
      merged[key] = _.uniqWith(newValue, _.isEqual);
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

export function getAdjustedClassOperations(varId: StoreID, class_: Class, baseTrainings: number | null) {
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

export function getAdjustedAncestryOperations(varId: StoreID, character: Character, inputOps: Operation[]) {
  let operations = _.cloneDeep(inputOps);
  if (character.options?.alternate_ancestry_boosts) {
    // Remove all ancestry boost/flaws operations
    const newOps = operations.filter(
      (op) =>
        !(
          op.type === 'adjValue' &&
          getAllAttributeVariables(varId)
            .map((v) => v.name)
            .includes(op.data.variable)
        ) && !(op.type === 'select' && op.data.title === 'Select an Attribute')
    );

    newOps.push({
      id: 'eadjpcd7-5jad-4f7c-a712-95d5e272bcf3-1',
      type: 'select',
      data: {
        title: 'Select an Attribute',
        modeType: 'FILTERED',
        optionType: 'ADJ_VALUE',
        optionsPredefined: [],
        optionsFilters: {
          id: '0c1e5659-5023-4d00-8d55-f10f50b4688d-1',
          type: 'ADJ_VALUE',
          group: 'ATTRIBUTE',
          value: {
            value: 1,
          },
        },
      },
    } satisfies OperationSelect);
    newOps.push({
      id: 'eadjpcd7-5jad-4f7c-a712-95d5e272bcf3-2',
      type: 'select',
      data: {
        title: 'Select an Attribute',
        modeType: 'FILTERED',
        optionType: 'ADJ_VALUE',
        optionsPredefined: [],
        optionsFilters: {
          id: '0c1e5659-5023-4d00-8d55-f10f50b4688d-2',
          type: 'ADJ_VALUE',
          group: 'ATTRIBUTE',
          value: {
            value: 1,
          },
        },
      },
    } satisfies OperationSelect);

    operations = newOps;
  }
  if (character.options?.voluntary_flaws) {
    // Add a flaw operation
    operations.push({
      id: 'tadjpcd7-5jp4-4f7c-a712-95d5e272bcg0',
      type: 'select',
      data: {
        title: 'Select a Voluntary Flaw',
        modeType: 'FILTERED',
        optionType: 'ADJ_VALUE',
        optionsPredefined: [],
        optionsFilters: {
          id: 'nc1e5659-5kk3-4d00-8d55-f10f50b4689d',
          type: 'ADJ_VALUE',
          group: 'ATTRIBUTE',
          value: {
            value: -1,
          },
        },
      },
    } satisfies OperationSelect);
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

export function getAncestrySections(varId: StoreID, ancestry: Ancestry, ancestryParagon: boolean): AbilityBlock[] {
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
            traits: [],
            abilityBlockType: 'heritage',
            isFromAncestry: true,
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
              traits: [],
              abilityBlockType: 'feat',
              isFromAncestry: true,
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
  const featArray = ancestryParagon ? [1, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19] : [1, 5, 9, 13, 17];
  for (let i = 0; i < featArray.length; i++) {
    sections.push(getAncestryFeat(i, featArray[i]));
  }

  return sections;
}
