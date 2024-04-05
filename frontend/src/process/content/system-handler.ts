//

import { Character } from '@typing/content';
import { VariableBool } from '@typing/variables';
import { getVariable } from '@variables/variable-manager';

export function playingPathfinder(character: Character) {
  return !!character.content_sources?.enabled?.includes(1);
}

export function playingStarfinder(character: Character) {
  return !!character.content_sources?.enabled?.includes(9);
}

export function isPlayingPathfinder() {
  return getVariable<VariableBool>('ALL', 'PATHFINDER')!.value;
}

export function isPlayingStarfinder() {
  return getVariable<VariableBool>('ALL', 'STARFINDER')!.value;
}
