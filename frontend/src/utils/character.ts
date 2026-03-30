import { Character } from '@schemas/content';

export function isPlayable(character?: Character | null) {
  if (!character) return false;
  return !!(
    character.level > 0 &&
    character.details &&
    character.details.ancestry &&
    character.details.background &&
    character.details.class
  );
}
