import type { AbilityBlock } from '@schemas/content';
import { labelToVariable } from '@variables/variable-utils';

const ANIMIST_APPARITION_TRAIT_ID = 4092;

/** Identify Animist primary-apparition modes without affecting other mode families. */
function isPrimaryApparitionMode(mode: AbilityBlock): boolean {
  return (
    mode.type === 'mode' &&
    mode.name.endsWith(' - Primary') &&
    (mode.traits?.includes(ANIMIST_APPARITION_TRAIT_ID) ?? false)
  );
}

/** Toggle a mode, replacing any other active primary apparition when one is enabled. */
export function toggleActiveMode(modes: AbilityBlock[], activeModes: string[], mode: AbilityBlock): string[] {
  const name = labelToVariable(mode.name);
  if (activeModes.includes(name)) return activeModes.filter((active) => active !== name);
  if (!isPrimaryApparitionMode(mode)) return [...activeModes, name];

  const primaryNames = new Set(
    modes.filter(isPrimaryApparitionMode).map((candidate) => labelToVariable(candidate.name))
  );
  return [...activeModes.filter((active) => !primaryNames.has(active)), name];
}

/** Execute only granted modes, and at most one active primary apparition. */
export function getExecutableModes(
  modes: AbilityBlock[],
  activeModes: string[],
  grantedModeIds: string[]
): AbilityBlock[] {
  const granted = new Set(grantedModeIds);
  const primary = activeModes.find((active) =>
    modes.some(
      (mode) => granted.has(String(mode.id)) && isPrimaryApparitionMode(mode) && labelToVariable(mode.name) === active
    )
  );

  return modes.filter(
    (mode) =>
      granted.has(String(mode.id)) &&
      activeModes.includes(labelToVariable(mode.name)) &&
      (!isPrimaryApparitionMode(mode) || labelToVariable(mode.name) === primary)
  );
}
