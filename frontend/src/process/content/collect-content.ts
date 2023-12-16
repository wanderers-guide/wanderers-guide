import { Character, AbilityBlock } from '@typing/content';
import { VariableListStr } from '@typing/variables';
import { getVariable } from '@variables/variable-manager';
import { labelToVariable } from '@variables/variable-utils';

// Hardcoded general and skill trait ids
const GENERAL_TRAIT_ID = 1437;
const SKILL_TRAIT_ID = 1438;

export function collectCharacterAbilityBlocks(character: Character, blocks: AbilityBlock[]) {
  // Feats ///////////////////////////////

  const featIds = getVariable<VariableListStr>('CHARACTER', 'FEAT_IDS')?.value ?? [];
  const feats = blocks
    .filter((block) => block.type === 'feat' && featIds.includes(`${block.id}`))
    .sort((a, b) => {
      if (a.level !== undefined && b.level !== undefined) {
        if (a.level !== b.level) {
          return a.level - b.level;
        }
      }
      return a.name.localeCompare(b.name);
    });

  const generalAndSkillFeats = feats.filter((feat) => {
    const traitIds = feat.traits ?? [];
    return traitIds.includes(GENERAL_TRAIT_ID) || traitIds.includes(SKILL_TRAIT_ID);
  });

  const classFeats = feats.filter((feat) => {
    return feat.traits?.includes(character?.details?.class?.trait_id ?? -1);
  });

  const ancestryFeats = feats.filter((feat) => {
    return feat.traits?.includes(character?.details?.ancestry?.trait_id ?? -1);
  });

  const otherFeats = feats.filter((feat) => {
    return (
      !classFeats.includes(feat) &&
      !ancestryFeats.includes(feat) &&
      !generalAndSkillFeats.includes(feat)
    );
  });

  // Features ////////////////////////////

  const classFeatureIds =
    getVariable<VariableListStr>('CHARACTER', 'CLASS_FEATURE_IDS')?.value ?? [];
  const classFeatures = blocks.filter(
    (block) => block.type === 'class-feature' && classFeatureIds.includes(`${block.id}`)
  );

  const physicalFeatureIds =
    getVariable<VariableListStr>('CHARACTER', 'PHYSICAL_FEATURE_IDS')?.value ?? [];
  const physicalFeatures = blocks.filter(
    (block) => block.type === 'physical-feature' && physicalFeatureIds.includes(`${block.id}`)
  );

  const heritageIds = getVariable<VariableListStr>('CHARACTER', 'HERITAGE_IDS')?.value ?? [];
  const heritages = blocks.filter(
    (block) => block.type === 'heritage' && heritageIds.includes(`${block.id}`)
  );

  // Base class features (default by the class)
  const baseClassFeatures = blocks.filter(
    (ab) =>
      ab.type === 'class-feature' &&
      ab.traits?.includes(character?.details?.class?.trait_id ?? -1) &&
      (ab.level === undefined || ab.level <= character.level)
  );

  return {
    generalAndSkillFeats,
    classFeats,
    ancestryFeats,
    otherFeats,

    classFeatures: [...classFeatures, ...baseClassFeatures].sort((a, b) => {
      if (a.level !== undefined && b.level !== undefined) {
        if (a.level !== b.level) {
          return a.level - b.level;
        }
      }
      return a.name.localeCompare(b.name);
    }),
    physicalFeatures: physicalFeatures.sort((a, b) => a.name.localeCompare(b.name)),
    heritages: heritages.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function collectCharacterSenses(character: Character, blocks: AbilityBlock[]) {
  const allSenses = blocks.filter((block) => block.type === 'sense');

  const precise = getVariable<VariableListStr>('CHARACTER', 'SENSES_PRECISE')?.value ?? [];
  const imprecise = getVariable<VariableListStr>('CHARACTER', 'SENSES_IMPRECISE')?.value ?? [];
  const vague = getVariable<VariableListStr>('CHARACTER', 'SENSES_VAGUE')?.value ?? [];

  const findSense = (varTitle: string) => {
    let range: string | null = null;
    if (varTitle.includes('-')) {
      const parts = varTitle.split('-');
      varTitle = parts[0];
      range = parts[parts.length - 1];
    }

    const sense = allSenses.find((sense) => labelToVariable(sense.name) === varTitle);
    if (sense) {
      return {
        sense,
        range, // TODO: include variable math
      };
    }
    return null;
  };

  type SenseWithRange = {
    sense: AbilityBlock;
    range: string | null;
  };

  return {
    precise: precise.map(findSense).filter((s) => s !== null) as SenseWithRange[],
    imprecise: imprecise.map(findSense).filter((s) => s !== null) as SenseWithRange[],
    vague: vague.map(findSense).filter((s) => s !== null) as SenseWithRange[],
  };
}
