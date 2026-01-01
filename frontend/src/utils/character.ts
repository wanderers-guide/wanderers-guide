import { Character } from '@typing/content';

export function isPlayable(character?: Character | null) {
  console.log('isPlayable check:', character);

  if (!character) return false;
  return !!(
    character.level > 0 &&
    character.details &&
    character.details.ancestry &&
    character.details.background &&
    character.details.class
  );
}
