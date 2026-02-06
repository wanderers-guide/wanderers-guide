import {
  AbilityBlock,
  Ancestry,
  Character,
  Class,
  ClassArchetype,
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
  OperationOptions,
  OperationResult,
  OperationSelect,
} from '@typing/operations';
import { runOperations } from './operation-runner';
import {
  addVariable,
  adjVariable,
  exportVariableStore,
  getAllAttributeVariables,
  getAllSkillVariables,
  getVariable,
  importVariableStore,
  resetVariables,
  setVariable,
} from '@variables/variable-manager';
import { isAttributeValue, labelToVariable, variableToLabel } from '@variables/variable-utils';
import { hashData, rankNumber } from '@utils/numbers';
import { StoreID, VariableListStr, VariableStore } from '@typing/variables';
import {
  getFlatInvItems,
  getItemOperations,
  isItemEquippable,
  isItemImplantable,
  isItemInvestable,
} from '@items/inv-utils';
import { playingPathfinder, playingStarfinder } from '@content/system-handler';
import { isAbilityBlockVisible } from '@content/content-hidden';
import { isTruthy } from '@utils/type-fixing';
import { convertToHardcodedLink } from '@content/hardcoded-links';
import { cloneDeep, isEqual, mergeWith, unionWith, uniqWith } from 'lodash-es';
import { setCalculatedStatsInStore } from '@variables/calculated-stats';
import { getEntityLevel } from '@utils/entity-utils';
import { defineDefaultSources, importFromContentPackage } from '@content/content-store';

/**
 * Inits the op selection tree based on an entity's op data
 * @param entity - Living entity (character or creature)
 */
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

/**
 * Execute a single array of operations for a given source
 * @param varId - Variable store ID
 * @param primarySource - Primary source identifier
 * @param operations - Array of operations to execute
 * @param options - Operation options
 * @param sourceLabel - Label for the source (for logging/debugging)
 * @returns - Array of operation results
 */
async function _executeOps(
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
    cloneDeep(options),
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
export async function _executeCharacterOperations(data: {
  character: Character;
  content: ContentPackage;
  context: string;
}): Promise<{
  store: VariableStore;
  ors: OperationCharacterResultPackage;
}> {
  const { character, content, context } = data;

  resetVariables('CHARACTER');
  defineSelectionTree(character);
  defineDefaultSources('INFO', content.defaultSources.INFO);
  defineDefaultSources('PAGE', content.defaultSources.PAGE);
  importFromContentPackage(content);
  setVariable('CHARACTER', 'PAGE_CONTEXT', context);
  setVariable('CHARACTER', 'PATHFINDER', playingPathfinder(character));
  setVariable('CHARACTER', 'STARFINDER', playingStarfinder(character));
  setVariable('CHARACTER', 'ORGANIZED_PLAY', character.options?.organized_play ?? false);

  setVariable('CHARACTER', 'LEVEL', character.level);

  setVariable('CHARACTER', 'ACTIVE_MODES', character.meta_data?.active_modes ?? [], 'Loaded');
  const modes = content.abilityBlocks.filter((block) => block.type === 'mode');

  const class_ = content.classes.find((c) => c.id === character.details?.class?.id);
  const class_2 = content.classes.find((c) => c.id === character.details?.class_2?.id);
  const background = content.backgrounds.find((b) => b.id === character.details?.background?.id);
  const ancestry = content.ancestries.find((a) => a.id === character.details?.ancestry?.id);

  const baseClassTrainings = Math.max(
    getClassSkillTrainingsNum(class_, character.details?.class_archetype),
    getClassSkillTrainingsNum(class_2, character.details?.class_archetype_2)
  );

  // Handles getting class features for a class (injecting class archetype changes if needed)
  const getClassFeatures = (abs: AbilityBlock[], classTraitId: number | undefined, recordT: '1' | '2') => {
    const ctId = classTraitId ?? Number.MIN_SAFE_INTEGER;
    let classAbs = cloneDeep(abs.filter((ab) => ab.type === 'class-feature' && ab.traits?.includes(ctId)));

    // Get the class archetype based on recordT
    let classArchetype: ClassArchetype | null = null;
    if (recordT === '1' && character.details?.class_archetype) {
      classArchetype = character.details.class_archetype;
    } else if (recordT === '2' && character.details?.class_archetype_2) {
      classArchetype = character.details.class_archetype_2;
    }

    if (!classArchetype) {
      return classAbs;
    } else {
      // Apply feature adjustments
      for (const fa of classArchetype.feature_adjustments ?? []) {
        if (fa.type === 'ADD' && fa.data) {
          classAbs.push(fa.data);
        } else if (fa.type === 'REMOVE' && fa.prev_id) {
          classAbs = classAbs.filter((ab) => ab.id !== fa.prev_id);
        } else if (fa.type === 'REPLACE' && fa.prev_id && fa.data) {
          classAbs = classAbs.filter((ab) => ab.id !== fa.prev_id);
          classAbs.push(fa.data);
        }
      }
      return classAbs;
    }
  };

  const classFeatures_1 = getClassFeatures(content.abilityBlocks, class_?.trait_id, '1').sort((a, b) => {
    if (a.level !== undefined && b.level !== undefined) {
      if (a.level !== b.level) {
        return a.level - b.level;
      }
    }
    return a.name.localeCompare(b.name);
  });

  const classFeatures_2 = getClassFeatures(content.abilityBlocks, class_2?.trait_id, '2').sort((a, b) => {
    if (a.level !== undefined && b.level !== undefined) {
      if (a.level !== b.level) {
        return a.level - b.level;
      }
    }
    return a.name.localeCompare(b.name);
  });

  // Merge both but only keep one if they both have the same name and level
  let classFeatures = unionWith(
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

  // Automatic Bonus Progression
  if (character.variants?.automatic_bonus_progression) {
    const getAbpAbility = (
      index: number,
      level: number,
      type:
        | 'ATTACK-POTENCY'
        | 'SKILL-POTENCY'
        | 'DEVA-ATTACKS'
        | 'DEFENSE-POTENCY'
        | 'SAVE-POTENCY'
        | 'PERCEPTION-POTENCY'
        | 'ABILITY-APEX',
      bonus: number
    ): AbilityBlock | null => {
      if (type === 'ABILITY-APEX') {
        return {
          id: hashData({ name: `class-ability-apex-${index}` }),
          created_at: '',
          operations: [
            {
              id: `7be7c32a-5d54-4d20-8cda-3e4c7a0a0ba6-${index}`,
              type: 'select',
              data: {
                title: 'Select an Apex Attribute',
                modeType: 'PREDEFINED',
                optionType: 'CUSTOM',
                optionsPredefined: [
                  { name: 'Strength', var: 'ATTRIBUTE_STR' },
                  { name: 'Dexterity', var: 'ATTRIBUTE_DEX' },
                  { name: 'Constitution', var: 'ATTRIBUTE_CON' },
                  { name: 'Intelligence', var: 'ATTRIBUTE_INT' },
                  { name: 'Wisdom', var: 'ATTRIBUTE_WIS' },
                  { name: 'Charisma', var: 'ATTRIBUTE_CHA' },
                ].map((a, index) => ({
                  id: `bd558680-9f89-460f-9505-b9decd61ebf4-${index}`,
                  type: 'CUSTOM',
                  title: a.name,
                  description: `You select ${a.name} as your apex attribute.`,
                  operations: [
                    {
                      id: `c675f2d4-0069-4dfb-ae99-76f4bc63830c-${index}`,
                      type: 'conditional',
                      data: {
                        conditions: [
                          {
                            id: `de26284d-f691-431a-ad7c-f3edee53774f-${index}`,
                            name: a.var,
                            data: {
                              name: a.var,
                              type: 'attr',
                              value: {
                                value: 0,
                                partial: false,
                              },
                            },
                            type: 'attr',
                            operator: 'GREATER_THAN_OR_EQUALS',
                            value: '4',
                          },
                        ],
                        trueOperations: [
                          {
                            id: `97cba452-8931-4173-b9b4-22f7b7cf230f-${index}`,
                            type: 'adjValue',
                            data: {
                              variable: a.var,
                              value: {
                                value: 1,
                              },
                            },
                          },
                        ],
                        falseOperations: [
                          {
                            id: `2d1de3a9-0bfd-478f-b81c-609e60b55ed3-${index}`,
                            type: 'setValue',
                            data: {
                              variable: a.var,
                              value: {
                                value: 4,
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                })),
              },
            },
          ],
          name: `Ability Apex`,
          actions: null,
          level: level,
          rarity: 'COMMON',
          description: `Choose one attribute to either boost or increase to +4 (whichever grants the higher value).`,
          type: 'class-feature',
          content_source_id: -1,
        };
      }

      if (type === 'ATTACK-POTENCY') {
        return {
          id: hashData({ name: `class-attack-potency-${index}` }),
          created_at: '',
          operations: [
            {
              id: `22879f23-5c21-4845-9af0-ae6d8f577601-${index}`,
              type: 'addBonusToValue',
              data: {
                variable: 'NON_SPELL_ATTACK_ROLLS_BONUS',
                text: '',
                value: `+${bonus}`,
                type: 'potency',
              },
            },
          ],
          name: `Attack Potency +${bonus}`,
          actions: null,
          level: level,
          rarity: 'COMMON',
          description: `You gain a +${bonus} potency bonus to attack rolls with all weapons and unarmed attacks.`,
          type: 'class-feature',
          content_source_id: -1,
        };
      }

      if (type === 'DEFENSE-POTENCY') {
        return {
          id: hashData({ name: `class-defense-potency-${index}` }),
          created_at: '',
          operations: [
            {
              id: `3e820e64-272d-4993-8b67-ff81434a751d-${index}`,
              type: 'addBonusToValue',
              data: {
                variable: 'AC_BONUS',
                text: '',
                value: `+${bonus}`,
                type: 'potency',
              },
            },
          ],
          name: `Defense Potency +${bonus}`,
          actions: null,
          level: level,
          rarity: 'COMMON',
          description: `You gain a +${bonus} potency bonus to AC.`,
          type: 'class-feature',
          content_source_id: -1,
        };
      }

      if (type === 'DEVA-ATTACKS') {
        return {
          id: hashData({ name: `class-devastating-attacks-${index}` }),
          created_at: '',
          operations: [
            {
              id: `967c1851-50ed-4efd-98d1-91eab7244647-${index}`,
              type: 'setValue',
              data: {
                variable: 'MINIMUM_WEAPON_DAMAGE_DICE',
                value: bonus,
              },
            },
          ],
          name: `Devastating Attacks (${bonus} dice)`,
          actions: null,
          level: level,
          rarity: 'COMMON',
          description: `Your weapon and unarmed ${convertToHardcodedLink('action', 'Strike', 'Strikes')} have ${bonus} damage dice instead.`,
          type: 'class-feature',
          content_source_id: -1,
        };
      }

      if (type === 'SAVE-POTENCY') {
        return {
          id: hashData({ name: `class-save-potency-${index}` }),
          created_at: '',
          operations: [
            {
              id: `a453b818-4ed8-499b-ade5-b58bed8b04eb-${index}`,
              type: 'addBonusToValue',
              data: {
                variable: 'SAVE_FORT',
                text: '',
                value: `+${bonus}`,
                type: 'potency',
              },
            },
            {
              id: `ae813e9b-aa7f-4ab3-8fcc-991c1db0ad5f-${index}`,
              type: 'addBonusToValue',
              data: {
                variable: 'SAVE_REFLEX',
                text: '',
                value: `+${bonus}`,
                type: 'potency',
              },
            },
            {
              id: `5da027f7-fb6f-4292-a88e-4ffd387c9515-${index}`,
              type: 'addBonusToValue',
              data: {
                variable: 'SAVE_WILL',
                text: '',
                value: `+${bonus}`,
                type: 'potency',
              },
            },
          ],
          name: `Saving Throw Potency +${bonus}`,
          actions: null,
          level: level,
          rarity: 'COMMON',
          description: `You gain a +${bonus} potency bonus to saves.`,
          type: 'class-feature',
          content_source_id: -1,
        };
      }

      if (type === 'PERCEPTION-POTENCY') {
        return {
          id: hashData({ name: `class-perception-potency-${index}` }),
          created_at: '',
          operations: [
            {
              id: `808c2515-a700-438c-bd10-8b6d3a7b6690-${index}`,
              type: 'addBonusToValue',
              data: {
                variable: 'PERCEPTION',
                text: '',
                value: `+${bonus}`,
                type: 'potency',
              },
            },
          ],
          name: `Perception Potency +${bonus}`,
          actions: null,
          level: level,
          rarity: 'COMMON',
          description: `You gain a +${bonus} potency bonus to Perception.`,
          type: 'class-feature',
          content_source_id: -1,
        };
      }

      if (type === 'SKILL-POTENCY') {
        let description = ``;
        if (bonus === 1) {
          description = `Choose a single skill. You gain a +1 potency bonus with that skill.`;
        } else if (bonus === 2) {
          description = `Choose a skill you have a +1 potency bonus in and increase its potency bonus to +2.`;
        } else if (bonus === 3) {
          description = `Choose a skill you have a +2 potency bonus in and increase its potency bonus to +3.`;
        } else if (bonus === 4) {
          description = `Choose a skill you have a +3 potency bonus in and increase its potency bonus to +4.`;
        }

        description += ' You can spend 1 week to retrain this assignment at any time.';

        return {
          id: hashData({ name: `class-skill-potency-${index}` }),
          created_at: '',
          operations: [
            {
              id: `13708367-74f2-4ae5-8610-bf82743c86ba-${index}`,
              type: 'select',
              data: {
                title: 'Select a Skill',
                modeType: 'PREDEFINED',
                optionType: 'CUSTOM',
                optionsPredefined: getAllSkillVariables('CHARACTER').map((v, index) => {
                  const label = variableToLabel(v);
                  return {
                    id: `2e70cccb-cdcd-4e76-8eb1-85f1c72a215e-${index}`,
                    type: 'CUSTOM',
                    title: label,
                    description: `You increase your potency bonus in ${label}.`,
                    operations: [
                      {
                        id: `3a6cc24d-9f48-4bee-bfbe-903d01fc9ee7-${index}`,
                        type: 'addBonusToValue',
                        data: {
                          variable: v.name,
                          value: `+${bonus}`,
                          type: 'potency',
                          text: '',
                        },
                      },
                    ],
                  };
                }),
              },
            },
          ], // TODO: Filter to only show skills you have the prev bonus in
          name: `Skill Potency +${bonus}`,
          actions: null,
          level: level,
          rarity: 'COMMON',
          description: description,
          type: 'class-feature',
          content_source_id: -1,
        };
      }

      return null;
    };

    const abpSections = [
      getAbpAbility(0, 2, 'ATTACK-POTENCY', 1),
      getAbpAbility(1, 3, 'SKILL-POTENCY', 1),
      getAbpAbility(2, 4, 'DEVA-ATTACKS', 2),
      getAbpAbility(3, 5, 'DEFENSE-POTENCY', 1),
      getAbpAbility(4, 6, 'SKILL-POTENCY', 1),
      getAbpAbility(5, 7, 'PERCEPTION-POTENCY', 1),
      getAbpAbility(6, 8, 'SAVE-POTENCY', 1),
      getAbpAbility(7, 9, 'SKILL-POTENCY', 2),
      getAbpAbility(8, 10, 'ATTACK-POTENCY', 2),
      getAbpAbility(9, 11, 'DEFENSE-POTENCY', 2),
      getAbpAbility(10, 12, 'DEVA-ATTACKS', 3),
      getAbpAbility(11, 13, 'PERCEPTION-POTENCY', 2),
      getAbpAbility(12, 13, 'SKILL-POTENCY', 2),
      getAbpAbility(13, 13, 'SKILL-POTENCY', 1),
      getAbpAbility(14, 14, 'SAVE-POTENCY', 2),
      getAbpAbility(15, 15, 'SKILL-POTENCY', 2),
      getAbpAbility(16, 15, 'SKILL-POTENCY', 1),
      getAbpAbility(17, 16, 'ATTACK-POTENCY', 3),
      getAbpAbility(18, 17, 'ABILITY-APEX', 0),
      getAbpAbility(19, 17, 'SKILL-POTENCY', 3),
      getAbpAbility(20, 17, 'SKILL-POTENCY', 1),
      getAbpAbility(21, 18, 'DEFENSE-POTENCY', 3),
      getAbpAbility(22, 19, 'DEVA-ATTACKS', 4),
      getAbpAbility(23, 19, 'PERCEPTION-POTENCY', 3),
      getAbpAbility(24, 20, 'SAVE-POTENCY', 3),
      getAbpAbility(25, 20, 'SKILL-POTENCY', 3),
      getAbpAbility(26, 20, 'SKILL-POTENCY', 2),
      getAbpAbility(27, 20, 'SKILL-POTENCY', 1),
    ].filter(isTruthy);

    classFeatures = [...classFeatures, ...abpSections];
  }

  // Organized Play
  if (character.options?.organized_play) {
    const finderType = playingStarfinder(character) ? 'Starfinder' : 'Pathfinder';
    classFeatures.push({
      id: hashData({ name: 'organized-play_society-lore' }),
      created_at: '',
      operations: [
        {
          id: 'd4b56b75-54d2-48e7-887d-08f0336a1f3f',
          type: 'createValue',
          data: {
            variable: `SKILL_LORE_${finderType.toUpperCase()}_SOCIETY`,
            value: { value: 'U', attribute: 'ATTRIBUTE_INT', increases: 0 },
            type: 'prof',
          },
        },
        {
          id: '1025504f-8f2e-48ce-b338-ceb6d71743w9',
          type: 'adjValue',
          data: { variable: `SKILL_LORE_${finderType.toUpperCase()}_SOCIETY`, value: { value: 'T' } },
        },
      ],
      name: `${finderType} Society`,
      actions: null,
      level: 1,
      rarity: 'COMMON',
      description: `All ${finderType} Society characters get free training in ${finderType} Society Lore (sometimes referred to as ${finderType} Lore).`,
      type: 'class-feature',
      content_source_id: -1,
    } satisfies AbilityBlock);
  }

  //

  const operationsPassthrough = async (options?: OperationOptions) => {
    let contentSourceResults: {
      baseSource: ContentSource;
      baseResults: OperationResult[];
    }[] = [];
    for (const source of content.sources ?? []) {
      const results = await _executeOps(
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

    let characterResults = await _executeOps(
      'CHARACTER',
      'character',
      character.options?.custom_operations ? (character.custom_operations ?? []) : [],
      options,
      'Custom'
    );

    let classResults: OperationResult[] = [];
    if (class_) {
      classResults = await _executeOps(
        'CHARACTER',
        'class',
        getTotalClassOperations('CHARACTER', class_, character.details?.class_archetype, baseClassTrainings),
        options,
        class_.name
      );
      addVariable('CHARACTER', 'num', labelToVariable(`TRAIT_CLASS_${class_.name}_IDS`), class_.trait_id, class_.name);

      // Add class to variables
      adjVariable('CHARACTER', 'CLASS_IDS', `${class_.id}`, undefined);
      adjVariable('CHARACTER', 'CLASS_NAMES', class_.name.toUpperCase(), undefined);

      // Add class archetype to variables
      if (character.details?.class_archetype) {
        adjVariable('CHARACTER', 'CLASS_ARCHETYPE_IDS', `${character.details.class_archetype.id}`, undefined);
        adjVariable(
          'CHARACTER',
          'CLASS_ARCHETYPE_NAMES',
          character.details.class_archetype.name.toUpperCase(),
          undefined
        );
      }
    }

    let class2Results: OperationResult[] = [];
    if (class_2) {
      class2Results = await _executeOps(
        'CHARACTER',
        'class-2',
        getTotalClassOperations('CHARACTER', class_2, character.details?.class_archetype_2, null),
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

      // Add class archetype to variables
      if (character.details?.class_archetype_2) {
        adjVariable('CHARACTER', 'CLASS_ARCHETYPE_IDS', `${character.details.class_archetype_2.id}`, undefined);
        adjVariable(
          'CHARACTER',
          'CLASS_ARCHETYPE_NAMES',
          character.details.class_archetype_2.name.toUpperCase(),
          undefined
        );
      }
    }

    let ancestryResults: OperationResult[] = [];
    if (ancestry) {
      ancestryResults = await _executeOps(
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
      backgroundResults = await _executeOps(
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
          const results = await _executeOps(
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
        const results = await _executeOps(
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
      // If item can be implanted, only run operations if it is
      if (isItemImplantable(invItem.item) && !invItem.is_implanted) {
        continue;
      }
      // If item can be equipped, only run operations if it is
      if (isItemEquippable(invItem.item) && !invItem.is_equipped) {
        continue;
      }

      const results = await _executeOps(
        'CHARACTER',
        `item-${invItem.item.id}`,
        getItemOperations(invItem.item, content),
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
    for (const mode of modes.filter((m) => activeModes.includes(labelToVariable(m.name)))) {
      const results = await _executeOps(
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
        increases: 0,
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
      ...(class_ ? getClassSkillTrainings('CHARACTER', baseClassTrainings) : []).map((op) => op.id),
      ...(ancestry ? addedAncestryLanguages('CHARACTER', ancestry) : []).map((op) => op.id),
    ],
  });

  // Set calculated stats
  setCalculatedStatsInStore('CHARACTER', character);

  return {
    store: exportVariableStore('CHARACTER'),
    ors: mergeOperationResults(results, conditionalResults) as typeof results,
  };
}

export async function _executeCreatureOperations(data: {
  id: StoreID;
  creature: Creature;
  content: ContentPackage;
  charStore: VariableStore;
}): Promise<{
  store: VariableStore;
  ors: OperationCreatureResultPackage;
}> {
  const { id, creature, content } = data;

  resetVariables(id);
  defineSelectionTree(creature);
  defineDefaultSources('INFO', content.defaultSources.INFO);
  defineDefaultSources('PAGE', content.defaultSources.PAGE);
  importFromContentPackage(content);
  importVariableStore('CHARACTER', data.charStore);
  setVariable('CHARACTER', 'PAGE_CONTEXT', 'CHARACTER-SHEET');

  setVariable(id, 'LEVEL', getEntityLevel(creature));

  const abilities = [
    ...(creature.abilities_base ?? []),
    ...(creature.abilities_added
      ?.map((id) => {
        return content.abilityBlocks.find((ab) => ab.id === id);
      })
      .filter(isTruthy) ?? []),
  ];

  const operationsPassthrough = async (options?: OperationOptions) => {
    let creatureResults = await _executeOps(id, 'creature', creature.operations ?? [], options, creature.name);

    let abilityResults: {
      baseSource: AbilityBlock;
      baseResults: OperationResult[];
    }[] = [];
    for (const ability of abilities) {
      const results = await _executeOps(id, `ability-${ability.id}`, ability.operations ?? [], options, ability.name);

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
      // If item can be implanted, only run operations if it is
      if (isItemImplantable(invItem.item) && !invItem.is_implanted) {
        continue;
      }
      // If item can be equipped, only run operations if it is
      if (isItemEquippable(invItem.item) && !invItem.is_equipped) {
        continue;
      }

      const results = await _executeOps(
        id,
        `item-${invItem.item.id}`,
        getItemOperations(invItem.item, content),
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
        increases: 0,
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

  // Set calculated stats
  setCalculatedStatsInStore(id, creature);

  return {
    store: exportVariableStore(id),
    ors: mergeOperationResults(results, conditionalResults) as typeof results,
  };
}

function mergeOperationResults(normal: Record<string, any[]>, conditional: Record<string, any[]>) {
  const merged = cloneDeep(normal);

  // New search n fix, fixes `results` array with all nulls when the other doesn't
  const recursiveUpdate = (obj: Record<string, any>, otherObj: Record<string, any>) => {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        const otherValue = otherObj && typeof otherObj === 'object' ? otherObj[key] : null;
        if (key === 'results' && Array.isArray(value) && Array.isArray(otherValue)) {
          //console.log(`Key: ${key}`, value, otherValue);

          const hasAllNull = value.every((v) => v === null);
          const otherHasAllNull = otherValue.every((v) => v === null);

          if (hasAllNull && !otherHasAllNull) {
            obj[key] = otherValue;
          }
        }

        if (typeof value === 'object' && value !== null) {
          // If the value is an object or array, recurse
          recursiveUpdate(value, otherValue);
        }
      }
    }
  };
  recursiveUpdate(merged, conditional);

  // Merge simple arrays
  for (const [key, value] of Object.entries(cloneDeep(conditional))) {
    if (merged[key]) {
      merged[key].push(...value);
    } else {
      merged[key] = value;
    }
    merged[key] = uniqWith(merged[key].filter(isTruthy), isEqual);
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
          v.baseResults = mergeWith([], duplicate.baseResults, v.baseResults, (objValue, srcValue) => {
            // Update if value is "null" or "undefined"
            if (objValue === null || objValue === undefined) {
              return srcValue;
            }

            // If value array, traverse and update "null" or "undefined" values
            if (Array.isArray(objValue) && Array.isArray(srcValue) && srcValue.length === objValue.length) {
              for (let i = 0; i < objValue.length; i++) {
                if (objValue[i] === null || objValue[i] === undefined) {
                  objValue[i] = srcValue[i];
                }
              }
              return objValue;
            }
          });
        }
        if (!newValue.find((v2) => v2.baseSource?.id === v.baseSource?.id)) {
          newValue.push(v);
        }
      }
    }
    if (found) {
      merged[key] = uniqWith(newValue, isEqual);
    }
  }

  return merged;
}

function limitBoostOptions(operations: Operation[], operationResults: OperationResult[]): OperationResult[] {
  operationResults = cloneDeep(operationResults);
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

function getTotalClassOperations(
  varId: StoreID,
  class_: Class,
  archetype: ClassArchetype | undefined,
  baseTrainings: number | null
) {
  let classOperations = getClassOperations(class_, archetype);
  classOperations.push(...getClassSkillTrainings(varId, baseTrainings));
  return classOperations;
}

/**
 * Get the total operations for a class, considering archetype overrides
 * @param class_ - The class to get operations for
 * @param archetype - The archetype to consider for overrides
 * @returns - The total operations for the class
 */
export function getClassOperations(class_: Class, archetype: ClassArchetype | undefined) {
  let classOperations = cloneDeep(class_.operations ?? []);
  if (archetype) {
    // Override operations if applicable
    if (archetype.override_class_operations) {
      classOperations = [];
    }

    // Add archetype operations
    classOperations.push(...(archetype.operations ?? []));
  }

  return classOperations;
}

/**
 * Get the number of skill trainings for a class, considering archetype overrides
 * @param class_ - The class to get skill trainings for
 * @param archetype - The archetype to consider for overrides
 * @returns - The number of skill trainings
 */
export function getClassSkillTrainingsNum(class_: Class | undefined, archetype: ClassArchetype | undefined): number {
  let baseTrainings = class_?.skill_training_base ?? 0;
  if (archetype) {
    // Override base trainings if applicable
    if (archetype.override_skill_training_base !== undefined && archetype.override_skill_training_base !== null) {
      baseTrainings = archetype.override_skill_training_base;
    }
  }
  return baseTrainings;
}

/**
 * Generates operations for class skill trainings, adding Int modifier
 * @param varId - The variable ID for the character
 * @param baseTrainings - The base number of skill trainings to generate operations for
 * @returns - An array of OperationSelect for skill trainings
 */
export function getClassSkillTrainings(varId: StoreID, baseTrainings: number | null): OperationSelect[] {
  // If null base trainings, return nothing (don't add Int modifier)
  // - For things like 2nd class
  if (baseTrainings === null) {
    return [];
  }

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
  let operations = cloneDeep(inputOps);
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
  let ancestryOperations = cloneDeep(ancestry.operations ?? []);

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
