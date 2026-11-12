/**
 * Pure Pathbuilder -> WG selection routing helpers.
 *
 * This module deliberately has no app/runtime imports so it can be tested with
 * plain Node + tsx without Vite's import.meta.env or the Supabase client.
 */

export type PathbuilderSelectionOption = {
  _select_uuid: string;
  title?: string;
  name?: string;
};

export type PathbuilderSelectionChoice = {
  name: string;
  level: number;
};

const ANCESTRY_FEAT_SELECTOR_PREFIX = '9f26290c-a2db-4c45-9b34-5053e60c106d-';
// These generated selectors end in an index, not a character level.
const INDEXED_SELECTOR_PREFIXES = [
  '720d2fe6-f042-4353-8313-1293375b1301-', // class skill-training choices
  '957ee14b-c6dc-44eb-881b-e99a1b4e5118-', // ancestry bonus-language choices
  '7be7c32a-5d54-4d20-8cda-3e4c7a0a0ba6-', // Automatic Bonus Progression apex attribute
];

/**
 * Level-specific operations encode their level after the final 12 hex digits
 * of each UUID in the selection path (for example, "...de101e8d46b1-2").
 * Some operation result packages still report the enclosing level as 1, so
 * use the explicit path level when it is unambiguous.
 */
export function inferPathbuilderOperationLevel(path: string, fallback: number): number {
  // An ancestry-section selector suffix is a slot index, not a level. Remove
  // that synthetic segment before inferring levels for any nested child selector.
  const levelPath = path
    .split('_')
    .filter(
      (segment) =>
        !segment.startsWith(ANCESTRY_FEAT_SELECTOR_PREFIX) &&
        !INDEXED_SELECTOR_PREFIXES.some((prefix) => segment.startsWith(prefix))
    )
    .join('_');
  const matches = [...levelPath.matchAll(/-[0-9a-f]{12}-(\d+)(?=_|$)/gi)];
  const lastMatch = matches[matches.length - 1];
  if (!lastMatch) return fallback;
  const level = Number(lastMatch[1]);
  return Number.isInteger(level) && level >= 1 && level <= 20 ? level : fallback;
}

/**
 * Resolve the character level represented by a generated ancestry-feat selector ID.
 *
 * The numeric suffix is the selector's position, not the character level. With
 * Ancestry Paragon enabled, slots 0 and 1 are both level 1, followed by levels
 * 3, 5, 7, ... . Without it, the slots map to levels 1, 5, 9, 13, and 17.
 *
 * Returns undefined for other operation IDs so callers can use normal level inference.
 */
export function getPathbuilderAncestryFeatSelectorIndex(selectorId: string): number | undefined {
  if (!selectorId.startsWith(ANCESTRY_FEAT_SELECTOR_PREFIX)) return undefined;

  const indexText = selectorId.slice(ANCESTRY_FEAT_SELECTOR_PREFIX.length);
  if (!/^\d+$/.test(indexText)) return undefined;
  return Number(indexText);
}

/** Map the generated ancestry-feat selector position to its actual character level. */
export function inferPathbuilderAncestryFeatLevel(
  selectorId: string,
  ancestryParagon: boolean
): number | undefined {
  const index = getPathbuilderAncestryFeatSelectorIndex(selectorId);
  if (index === undefined) return undefined;

  const levels = ancestryParagon
    ? [1, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
    : [1, 5, 9, 13, 17];

  return levels[index];
}

export function getAbilityBoostOriginForPath(
  path: string
): 'levelled' | 'ancestry' | 'background' | null {
  if (path.startsWith('background_')) return 'background';
  if (path.startsWith('ancestry_')) return 'ancestry';
  // Pathfinder 2e's four level-1 ability boosts are part of WG's class
  // operation tree. Later boosts are emitted as class-feature-* sources.
  if (path.startsWith('class_') || path.startsWith('class-feature-')) return 'levelled';
  return null;
}

/**
 * Free Archetype slots are represented by a two-stage custom selector:
 * first WG asks whether the user is adding a dedication or an archetype feat,
 * then it exposes the actual feat selector. Pathbuilder stores only the actual
 * feat, so the importer infers the outer branch from the level's selected feat.
 */
export function findFreeArchetypeBranch(
  options: PathbuilderSelectionOption[],
  feats: PathbuilderSelectionChoice[],
  level: number
): PathbuilderSelectionOption | null {
  // Prefer visible labels; stable custom-option IDs are the fallback when an
  // operation result exposes only its internal identifier.
  const dedicationOption = options.find(
    (option) =>
      (option.title ?? option.name) === 'Add Dedication' ||
      option._select_uuid.startsWith('a525eb70-e18f-4a95-80d9-29f6aaee0d3e-')
  );
  const archetypeFeatOption = options.find(
    (option) =>
      (option.title ?? option.name) === 'Add Archetype Feat' ||
      option._select_uuid.startsWith('354b57f0-ef29-4f53-819b-f1f211adfc7b-')
  );
  if (!dedicationOption && !archetypeFeatOption) return null;

  const hasDedication = feats.some(
    (feat) => feat.level === level && /\bdedication\b/i.test(feat.name)
  );
  return hasDedication
    ? dedicationOption ?? archetypeFeatOption ?? null
    : archetypeFeatOption ?? dedicationOption ?? null;
}
