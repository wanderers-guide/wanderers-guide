import { generateNames } from '@ai/fantasygen-dev/name-controller';
import { randomCharacterInfo } from '@ai/open-ai-handler';
import { getConditionByName } from '@conditions/condition-handler';
import { collectCharacterSpellcasting } from '@content/collect-content';
import { defineDefaultSources, fetchContentPackage, fetchContentSources } from '@content/content-store';
import { isItemEquippable, isItemInvestable } from '@items/inv-utils';
import { executeCharacterOperations } from '@operations/operation-controller';
import { OperationResult } from '@operations/operation-runner';
import { ObjectWithUUID, convertKeyToBasePrefix, hasOperationSelection } from '@operations/operation-utils';
import { makeRequest } from '@requests/request-manager';
import { Session } from '@supabase/supabase-js';
import { Character } from '@typing/content';
import { OperationResultPackage } from '@typing/operations';
import { selectRandom } from '@utils/random';
import { labelToVariable } from '@variables/variable-utils';
import _ from 'lodash-es';

/**
 * FTC - Finder 2e Character - A universal file structure for Pathfinder 2e and Starfinder 2e characters.
 * ======================================================================================================
 * This is the type definition for the FTC file structure as well as Wanderer's Guide's implementation of
 * how to import a character from it.
 */

export interface FTC {
  version: '1.0';
  data: {
    class: string | 'RANDOM';
    background: string | 'RANDOM';
    ancestry: string | 'RANDOM';
    name?: string | 'RANDOM';
    level: number;
    experience?: number;
    content_sources: string[] | 'ALL';
    selections: { name: string | 'RANDOM'; level: number }[] | 'RANDOM';
    items: { name: string; level?: number }[];
    coins?: {
      cp?: number;
      sp?: number;
      gp?: number;
      pp?: number;
    };
    spells: { source: string; name: string; rank: number }[];
    conditions: { name: string; value?: string }[];
    hp?: number;
    temp_hp?: number;
    hero_points?: number;
    stamina?: number;
    resolve?: number;
    options?: {
      public?: boolean;
      auto_detect_prerequisites?: boolean;
      auto_heighten_spells?: boolean;
      class_archetypes?: boolean;
      dice_roller?: boolean;
      ignore_bulk_limit?: boolean;
      alternate_ancestry_boosts?: boolean;
      voluntary_flaws?: boolean;
    };
    variants?: {
      ancestry_paragon?: boolean;
      proficiency_without_level?: boolean;
      stamina?: boolean;
      free_archetype?: boolean;
      dual_class?: boolean;
    };
    info?: {
      notes?: string;
      appearance?: string;
      personality?: string;
      alignment?: string;
      beliefs?: string;
      age?: string;
      height?: string;
      weight?: string;
      gender?: string;
      pronouns?: string;
      faction?: string;
      reputation?: number;
      ethnicity?: string;
      nationality?: string;
      birthplace?: string;
      organized_play_id?: string;
    };
    compiled_stats?: {};
    // TODO, Add support for pre-compiled character data for less robust sheets so they can use this.
  };
}

export async function importFromFTC(d: FTC) {
  const data = d.data;
  const character = {
    id: -1,
    created_at: '',
    user_id: '',
    name: data.name ?? 'Unknown Wanderer',
    level: data.level,
    experience: data.experience ?? 0,
    hp_current: data.hp ?? 0,
    hp_temp: data.temp_hp ?? 0,
    hero_points: data.hero_points ?? 1,
    stamina_current: data.stamina ?? 0,
    resolve_current: data.resolve ?? 0,
    details: {
      class: undefined,
      background: undefined,
      ancestry: undefined,
      info: {
        appearance: data.info?.appearance ?? '',
        personality: data.info?.personality ?? '',
        alignment: data.info?.alignment ?? '',
        beliefs: data.info?.beliefs ?? '',
        age: data.info?.age ?? '',
        height: data.info?.height ?? '',
        weight: data.info?.weight ?? '',
        gender: data.info?.gender ?? '',
        pronouns: data.info?.pronouns ?? '',
        faction: data.info?.faction ?? '',
        reputation: data.info?.reputation ?? 0,
        ethnicity: data.info?.ethnicity ?? '',
        nationality: data.info?.nationality ?? '',
        birthplace: data.info?.birthplace ?? '',
        organized_play_id: data.info?.organized_play_id ?? '',
      },
    },
    notes: data.info?.notes
      ? {
          pages: [
            {
              name: 'Imported Notes',
              icon: 'notes',
              color: '#ffffff',
              contents: {
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    attrs: {
                      textAlign: 'left',
                    },
                    content: [
                      {
                        type: 'text',
                        text: data.info.notes,
                      },
                    ],
                  },
                ],
              },
            },
          ],
        }
      : undefined,
    options: {
      is_public: data.options?.public ?? false,
      auto_detect_prerequisites: data.options?.auto_detect_prerequisites ?? false,
      auto_heighten_spells: data.options?.auto_heighten_spells ?? false,
      class_archetypes: data.options?.class_archetypes ?? false,
      custom_operations: false, // WG specific
      dice_roller: data.options?.dice_roller ?? false,
      ignore_bulk_limit: data.options?.ignore_bulk_limit ?? false,
      alternate_ancestry_boosts: data.options?.alternate_ancestry_boosts ?? false,
      voluntary_flaws: data.options?.voluntary_flaws ?? false,
    },
    variants: {
      ancestry_paragon: data.variants?.ancestry_paragon ?? false,
      proficiency_without_level: data.variants?.proficiency_without_level ?? false,
      proficiency_half_level: false, // Not official
      stamina: data.variants?.stamina ?? false,
      free_archetype: data.variants?.free_archetype ?? false,
      dual_class: data.variants?.dual_class ?? false,
    },
    content_sources: {
      enabled: [],
    },
    operation_data: {
      selections: {},
    },
  } satisfies Character as Character;

  // Get the content sources
  const sources = await fetchContentSources({ ids: 'all' });
  character.content_sources!.enabled =
    data.content_sources === 'ALL'
      ? sources.map((source) => source.id)
      : (data.content_sources
          .map((sourceName) => {
            const found = sources.find((s) => labelToVariable(s.name) === labelToVariable(sourceName));
            return found ? found.id : null;
          })
          .filter((id) => id !== null) as number[]);

  // Set all content that the character uses
  defineDefaultSources(character.content_sources?.enabled ?? []);

  // Fetch the content package
  const content = await fetchContentPackage(undefined, { fetchSources: true });

  // Set the character's class
  if (data.class === 'RANDOM') {
    character.details!.class = selectRandom(content.classes);
  } else {
    const _class = content.classes.find((c) => labelToVariable(c.name) === labelToVariable(data.class));
    if (_class) {
      character.details!.class = _class;
    }
  }

  // Set the character's background
  if (data.background === 'RANDOM') {
    character.details!.background = selectRandom(content.backgrounds);
  } else {
    const background = content.backgrounds.find((b) => labelToVariable(b.name) === labelToVariable(data.background));
    if (background) {
      character.details!.background = background;
    }
  }

  // Set the character's ancestry
  if (data.ancestry === 'RANDOM') {
    character.details!.ancestry = selectRandom(content.ancestries);
  } else {
    const ancestry = content.ancestries.find((a) => labelToVariable(a.name) === labelToVariable(data.ancestry));
    if (ancestry) {
      character.details!.ancestry = ancestry;
    }
  }

  // Construct operation selections
  const selections: Record<string, string> = {};
  const checked = new Set<string>();

  let hasSelections = true;
  let iteration = 0;
  while (hasSelections) {
    const results = await executeCharacterOperations(_.cloneDeep(character), content, 'CHARACTER-BUILDER');
    const found = findFirstSelection(results, checked);

    if (found) {
      let result: ObjectWithUUID | null = null;
      if (data.selections === 'RANDOM') {
        result = selectRandom(found.selection?.selection?.options ?? []);
      } else {
        result = findMatchingOption(data.selections, found.selection?.selection?.options ?? [], found.level);
      }
      if (result) {
        selections[found.path] = result._select_uuid;

        // Update the resulting selections
        character.operation_data!.selections = _.cloneDeep(selections);
      }
      checked.add(found.path);
    } else {
      hasSelections = false;
    }
    iteration++;
    if (iteration > 999) {
      console.warn('Infinite loop detected in FTC import.');
      break;
    }
  }

  // Add items
  character.inventory = {
    items: [],
    coins: {
      cp: data.coins?.cp ?? 0,
      sp: data.coins?.sp ?? 0,
      gp: data.coins?.gp ?? 0,
      pp: data.coins?.pp ?? 0,
    },
  };
  try {
    for (const item of data.items) {
      const found = content.items.find((i) => {
        if (item.level !== undefined) {
          return labelToVariable(i.name) === labelToVariable(item.name) && i.level === item.level;
        } else {
          return labelToVariable(i.name) === labelToVariable(item.name);
        }
      });
      if (found) {
        character.inventory.items.push({
          id: crypto.randomUUID(),
          item: found,
          is_formula: false,
          is_equipped: isItemEquippable(found) ? true : false,
          is_invested: isItemInvestable(found) ? true : false,
          container_contents: [],
        });
      }
    }
  } catch (e) {
    console.warn(e);
  }

  // Add spells, all of these are used for tracking meta data. Only `list` is super useful to import.
  character.spells = {
    slots: [],
    list: [],
    focus_point_current: 0,
    innate_casts: [],
  };
  try {
    for (const spell of data.spells) {
      const found = content.spells.find((s) => labelToVariable(s.name) === labelToVariable(spell.name));
      if (found) {
        character.spells.list.push({
          spell_id: found.id,
          rank: spell.rank,
          source: labelToVariable(spell.source),
        });
      }
    }
  } catch (e) {
    console.warn(e);
  }

  // Add conditions
  character.details!.conditions = [];
  try {
    for (const condition of data.conditions) {
      const found = getConditionByName(condition.name);
      if (found) {
        character.details!.conditions.push({
          ...found,
          value: condition.value ? parseInt(condition.value) : undefined,
        });
      }
    }
  } catch (e) {
    console.warn(e);
  }

  // Random name
  if (data.name === 'RANDOM') {
    const names = await generateNames(_.cloneDeep(character), 1);
    if (names.length > 0) {
      const name = names[0].replace(/\*/g, '');
      character.name = name;
    }

    // If we have a random name and no info, let's also get some random info
    if (!data.info) {
      const charWithInfo = await randomCharacterInfo(character);
      character.details = charWithInfo.details;
    }
  }

  // Create the character
  return await makeRequest<Character>('create-character', {
    ...character,
    id: undefined, // remove ID so it creates a new character
  });
}

function findMatchingOption(selections: { name: string; level: number }[], options: ObjectWithUUID[], level: number) {
  for (const selection of selections.filter((s) => s.level === level)) {
    if (selection.name === 'RANDOM') {
      return selectRandom(options);
    }

    const found = options.find((o) => {
      return labelToVariable(o.name) === labelToVariable(selection.name);
    });
    if (found) {
      return found;
    }
  }
  return null;
}

function findFirstSelection(
  resultPackage: OperationResultPackage,
  checked: Set<string>
): {
  selection: OperationResult;
  path: string;
  level: number;
} | null {
  // Check each category of results in the package
  for (const [key, category] of Object.entries(resultPackage)) {
    if (category.length === 0) continue;

    // Assuming all result arrays are directly within the package or nested in an object with a baseResults array
    if (category[0]?.hasOwnProperty('baseResults')) {
      for (const subsource of category as { baseSource: ObjectWithUUID; baseResults: OperationResult[] }[]) {
        if (!subsource) continue;
        // Subsourced array of OperationResults
        const prefix = convertKeyToBasePrefix(key, subsource.baseSource.id);
        const result = innerFindFirstSelection(subsource.baseResults, checked, prefix);
        if (result && result.selection) {
          return {
            selection: result.selection,
            path: prefix + '_' + result.path,
            level: subsource.baseSource.level,
          };
        }
      }
    } else {
      // Direct array of OperationResults
      const prefix = convertKeyToBasePrefix(key);
      const result = innerFindFirstSelection(category as OperationResult[], checked, prefix);
      if (result && result.selection) {
        return {
          selection: result.selection,
          path: prefix + '_' + result.path,
          level: 1,
        };
      }
    }
  }
  return null;
}

function innerFindFirstSelection(
  results: OperationResult[],
  checked: Set<string>,
  prefix: string,
  basePath: string = ''
): { selection: OperationResult; path: string } | null {
  for (const result of results) {
    if (hasOperationSelection(result)) {
      // Base case: if the current result has a selection, return it and the constructed path
      let path = basePath;
      const selectionUUID = result?.selection?.id ?? '';
      const resultUUID = result?.result?.source?._select_uuid ?? '';

      if (selectionUUID) path += (path ? '_' : '') + selectionUUID;
      if (resultUUID) path += (path ? '_' : '') + resultUUID;

      if (checked.has(prefix + '_' + path)) continue; // Skip if this path has already been checked

      return { selection: result, path };
    } else if (result?.result?.results && result.result.results.length > 0) {
      // Recursive case: dive deeper if there are nested results
      const resultUUID = result.result?.source?._select_uuid ?? '';
      let newPath = basePath;
      if (resultUUID) newPath += (newPath ? '_' : '') + resultUUID;

      const deepSearch = innerFindFirstSelection(result.result.results, checked, newPath);
      if (deepSearch && deepSearch.selection) return deepSearch; // If a selection is found in deeper levels, return it
    }
  }

  // If no selection is found in the current branch
  return null;
}
