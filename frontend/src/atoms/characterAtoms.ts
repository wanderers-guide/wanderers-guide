import { Character } from '@schemas/content';
import { atom } from 'jotai';

const _internal_characterState = atom(loadCharacter() as Character | null);

const characterState = atom(
  (get) => {
    const character = get(_internal_characterState);

    if (character) {
      // If the character isn't matching the URL id, don't return it
      const matchingCharacterInURL = !!window.location.href.match(new RegExp(`/${character?.id}($|/|\\?)`));
      if (!matchingCharacterInURL) {
        return null;
      }
    }

    character && saveCharacter(character);
    return character;
  },
  (_get, set, newValue: Character | null | ((prev: Character | null) => Character | null)) => {
    const resolved = typeof newValue === 'function' ? newValue(_get(_internal_characterState)) : newValue;
    if (resolved) {
      saveCharacter(resolved);
    } else {
      deleteCharacter();
    }
    set(_internal_characterState, resolved);
  }
);

function saveCharacter(character: Character) {
  //localStorage.setItem('character', JSON.stringify(character));
}

function deleteCharacter() {
  localStorage.removeItem('character');
}

function loadCharacter() {
  // const character = localStorage.getItem('character');
  // if (character) {
  //   return JSON.parse(character) as Character;
  // }
  return null;
}

export { characterState };
