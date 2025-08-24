//

import { PATHFINDER_CORE_ID, STARFINDER_CORE_ID } from '@constants/data';
import { Character } from '@typing/content';
import { VariableBool } from '@typing/variables';
import { getVariable } from '@variables/variable-manager';

export function playingPathfinder(character: Character) {
  return !!character.content_sources?.enabled?.includes(PATHFINDER_CORE_ID);
}

export function playingStarfinder(character: Character) {
  return !!character.content_sources?.enabled?.includes(STARFINDER_CORE_ID);
}

export function isPlayingPathfinder() {
  return getVariable<VariableBool>('CHARACTER', 'PATHFINDER')!.value;
}

export function isPlayingStarfinder() {
  return getVariable<VariableBool>('CHARACTER', 'STARFINDER')!.value;
}
