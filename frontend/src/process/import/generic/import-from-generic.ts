import { defineDefaultSources, fetchContentPackage, fetchContentSources } from '@content/content-store';
import { executeCharacterOperations } from '@operations/operation-controller';
import { Session } from '@supabase/supabase-js';
import { Character } from '@typing/content';
import { labelToVariable } from '@variables/variable-utils';
import _ from 'lodash';

export async function importFromGeneric(
  session: Session,
  options: {
    className: string | 'random';
    backgroundName: string | 'random';
    ancestryName: string | 'random';
    characterName?: string | 'random';
    level: number;
    experience?: number;
    contentSources: string[] | 'all';
    selections: { name: string; level: number }[] | 'random';
    hpCurrent?: number;
    hpTemp?: number;
    heroPoints?: number;
    options?: {
      isPublic?: boolean;
      autoDetectPrerequisites?: boolean;
      autoHeightenSpells?: boolean;
      classArchetypes?: boolean;
      customOperations?: boolean;
      diceRoller?: boolean;
      ignoreBulkLimit?: boolean;
      alternateAncestryBoosts?: boolean;
      voluntaryFlaws?: boolean;
    };
    variants?: {
      ancestryParagon?: boolean;
      proficiencyWithoutLevel?: boolean;
      proficiencyHalfLevel?: boolean;
      stamina?: boolean;
      freeArchetype?: boolean;
      dualClass?: boolean;
    };
  }
) {
  const character = {
    id: -1,
    created_at: '',
    user_id: session.user.id,
    name: options.characterName ?? 'Unknown Wanderer',
    level: options.level,
    experience: options.experience ?? 0,
    hp_current: options.hpCurrent ?? 0,
    hp_temp: options.hpTemp ?? 0,
    hero_points: options.heroPoints ?? 1,
    stamina_current: 0,
    resolve_current: 0,
    details: {
      class: undefined,
      background: undefined,
      ancestry: undefined,
    },
    options: {
      is_public: options.options?.isPublic ?? false,
      auto_detect_prerequisites: options.options?.autoDetectPrerequisites ?? false,
      auto_heighten_spells: options.options?.autoHeightenSpells ?? false,
      class_archetypes: options.options?.classArchetypes ?? false,
      custom_operations: options.options?.customOperations ?? false,
      dice_roller: options.options?.diceRoller ?? false,
      ignore_bulk_limit: options.options?.ignoreBulkLimit ?? false,
      alternate_ancestry_boosts: options.options?.alternateAncestryBoosts ?? false,
      voluntary_flaws: options.options?.voluntaryFlaws ?? false,
    },
    variants: {
      ancestry_paragon: options.variants?.ancestryParagon ?? false,
      proficiency_without_level: options.variants?.proficiencyWithoutLevel ?? false,
      proficiency_half_level: options.variants?.proficiencyHalfLevel ?? false,
      stamina: options.variants?.stamina ?? false,
      free_archetype: options.variants?.freeArchetype ?? false,
      dual_class: options.variants?.dualClass ?? false,
    },
    content_sources: {
      enabled: [],
    },
  } satisfies Character as Character;

  // Get the content sources
  const sources = await fetchContentSources({ ids: 'all' });
  character.content_sources!.enabled =
    options.contentSources === 'all'
      ? sources.map((source) => source.id)
      : (options.contentSources
          .map((sourceName) => {
            const found = sources.find((s) => labelToVariable(s.name) === labelToVariable(sourceName));
            return found ? found.id : null;
          })
          .filter((id) => id !== null) as number[]);

  // Set all content that the character uses
  defineDefaultSources(character.content_sources?.enabled ?? []);

  // Fetch the content package
  const content = await fetchContentPackage(undefined, true);
  const STORE_ID = 'CHARACTER';

  // Set the character's class
  const _class = content.classes.find((c) => labelToVariable(c.name) === labelToVariable(options.className));
  if (_class) {
    character.details!.class = _class;
  }

  // Set the character's background
  const background = content.backgrounds.find(
    (b) => labelToVariable(b.name) === labelToVariable(options.backgroundName)
  );
  if (background) {
    character.details!.background = background;
  }

  // Set the character's ancestry
  const ancestry = content.ancestries.find((a) => labelToVariable(a.name) === labelToVariable(options.ancestryName));
  if (ancestry) {
    character.details!.ancestry = ancestry;
  }

  const results = await executeCharacterOperations(_.cloneDeep(character), content, 'CHARACTER-BUILDER');

  console.log(results);
}
