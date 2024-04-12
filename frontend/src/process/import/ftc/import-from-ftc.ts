import { generateNames } from '@ai/fantasygen-dev/name-controller';
import { defineDefaultSources, fetchContentPackage, fetchContentSources } from '@content/content-store';
import { executeCharacterOperations } from '@operations/operation-controller';
import { OperationResult } from '@operations/operation-runner';
import { ObjectWithUUID, convertKeyToBasePrefix, hasOperationSelection } from '@operations/operation-utils';
import { makeRequest } from '@requests/request-manager';
import { Session } from '@supabase/supabase-js';
import { Character } from '@typing/content';
import { OperationResultPackage } from '@typing/operations';
import { selectRandom } from '@utils/random';
import { labelToVariable } from '@variables/variable-utils';
import _ from 'lodash';

/**
 * FTC - Finder 2e Character - A universal file structure for Pathfinder 2e and Starfinder 2e characters.
 * ======================================================================================================
 * This is the type definition for the FTC file structure as well as Wanderer's Guide's implementation of
 * how to import a character from it.
 */

interface FTC {
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
    items: { name: string; level: number }[]; // TODO
    spells: { name: string; level: number }[]; // TODO
    conditions: { name: string; value: string }[]; // TODO
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
    }; // TODO, general character info
    compiled_stats?: {};
    // TODO, Add support for pre-compiled character data for less robust sheets so they can use this.
  };
}

export async function importFromFTC(session: Session, d: FTC) {
  const data = d.data;
  const character = {
    id: -1,
    created_at: '',
    user_id: session.user.id,
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
    },
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
  const content = await fetchContentPackage(undefined, true);

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

    console.log('Found:', found, results);

    if (found.selection) {
      let result: ObjectWithUUID | null = null;
      if (data.selections === 'RANDOM') {
        result = selectRandom(found.selection.selection?.options ?? []);
      } else {
        result = findMatchingOption(data.selections, found.selection.selection?.options ?? [], found.level);
      }
      if (result) {
        selections[found.path] = result._select_uuid;

        // Update the resulting selections
        character.operation_data!.selections = _.cloneDeep(selections);
      }
      if (found.selection.selection) {
        checked.add(found.selection.selection.id);
      }
    } else {
      hasSelections = false;
    }
    iteration++;
    if (iteration > 9999) {
      console.warn('Infinite loop detected in FTC import.');
      break;
    }
  }

  // Random name
  if (data.name === 'RANDOM') {
    const names = await generateNames(_.cloneDeep(character), 1);
    if (names.length > 0) {
      const name = names[0].replace(/\*/g, '');
      character.name = name;
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
} {
  // Check each category of results in the package
  for (const [key, category] of Object.entries(resultPackage)) {
    // Assuming all result arrays are directly within the package or nested in an object with a baseResults array
    if (Array.isArray(category)) {
      // Direct array of OperationResults
      const result = innerFindFirstSelection(category as OperationResult[], checked);
      if (result.selection)
        return {
          selection: result.selection,
          path: convertKeyToBasePrefix(key) + '_' + result.path,
          level: 1,
        };
    } else if (category && typeof category === 'object') {
      // Objects containing baseResults
      const baseResultsCategory = category as {
        baseSource: ObjectWithUUID;
        baseResults: OperationResult[];
      };

      console.log('Checking base:', baseResultsCategory.baseSource.name, baseResultsCategory.baseResults.length);

      const result = innerFindFirstSelection(baseResultsCategory.baseResults, checked);
      if (result.selection)
        return {
          selection: result.selection,
          path: convertKeyToBasePrefix(key, baseResultsCategory.baseSource.id) + '_' + result.path,
          level: baseResultsCategory.baseSource.level,
        };
    }
  }
  return { selection: null, path: '', level: -1 };
}

function innerFindFirstSelection(
  results: OperationResult[],
  checked: Set<string>,
  basePath: string = ''
): { selection: OperationResult; path: string } {
  for (const result of results) {
    if (!checked.has(result?.selection?.id ?? '') && hasOperationSelection(result)) {
      // Base case: if the current result has a selection, return it and the constructed path
      let path = basePath;
      const selectionUUID = result?.selection?.id ?? '';
      const resultUUID = result?.result?.source?._select_uuid ?? '';

      if (selectionUUID) path += (path ? '_' : '') + selectionUUID;
      if (resultUUID) path += (path ? '_' : '') + resultUUID;

      return { selection: result, path };
    } else if (result?.result?.results && result.result.results.length > 0) {
      // Recursive case: dive deeper if there are nested results
      const resultUUID = result.result?.source?._select_uuid ?? '';
      let newPath = basePath;
      if (resultUUID) newPath += (newPath ? '_' : '') + resultUUID;

      const deepSearch = innerFindFirstSelection(result.result.results, checked, newPath);
      if (deepSearch.selection) return deepSearch; // If a selection is found in deeper levels, return it
    }
  }

  // If no selection is found in the current branch
  return { selection: null, path: '' };
}
