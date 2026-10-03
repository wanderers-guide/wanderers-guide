import type { AbilityBlock } from '@schemas/content';
import { labelToVariable } from '@variables/variable-utils';

const ANIMIST_APPARITION_TRAIT_ID = 4092;

/** Retain numeric differences while preserving every existing word-based mode key. */
export function getModeKey(mode: Pick<AbilityBlock, 'name'>): string {
  return labelToVariable(mode.name, true, { preserveNumbers: true });
}

/** Expand old numeric collisions once so saved active effects survive independent toggling. */
export function resolveActiveModeKeys(modes: AbilityBlock[], activeModes: string[]): string[] {
  const exactKeys = new Set(modes.map(getModeKey));
  return [
    ...new Set(
      activeModes.flatMap((active) => {
        if (exactKeys.has(active)) return [active];
        const legacyMatches = modes.filter((mode) => labelToVariable(mode.name) === active);
        return legacyMatches.length ? legacyMatches.map(getModeKey) : [active];
      })
    ),
  ];
}

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
  const name = getModeKey(mode);
  const activeKeys = resolveActiveModeKeys(modes, activeModes);
  if (activeKeys.includes(name)) return activeKeys.filter((active) => active !== name);
  if (!isPrimaryApparitionMode(mode)) return [...activeKeys, name];

  const primaryNames = new Set(modes.filter(isPrimaryApparitionMode).map(getModeKey));
  return [...activeKeys.filter((active) => !primaryNames.has(active)), name];
}

/** Execute only granted modes, and at most one active primary apparition. */
export function getExecutableModes(
  modes: AbilityBlock[],
  activeModes: string[],
  grantedModeIds: string[]
): AbilityBlock[] {
  const granted = new Set(grantedModeIds);
  const activeKeys = resolveActiveModeKeys(modes, activeModes);
  const primary = activeKeys.find((active) =>
    modes.some((mode) => granted.has(String(mode.id)) && isPrimaryApparitionMode(mode) && getModeKey(mode) === active)
  );

  return modes.filter(
    (mode) =>
      granted.has(String(mode.id)) &&
      activeKeys.includes(getModeKey(mode)) &&
      (!isPrimaryApparitionMode(mode) || getModeKey(mode) === primary)
  );
}
