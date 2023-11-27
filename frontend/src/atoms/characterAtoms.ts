import { Character } from "@typing/content";
import { atom, selector } from "recoil";

const _internal_characterState = atom({
  key: 'character-active-internal',
  default: loadCharacter() as Character | null,
});

const characterState = selector({
  key: 'characterState',
  get: ({ get }) => {
    const character = get(_internal_characterState);
    character && saveCharacter(character);
    return character;
  },
  set: ({ set }, newValue) => {
    if (newValue) {
      saveCharacter(newValue as Character);
    } else {
      deleteCharacter();
    }
    set(_internal_characterState, newValue);
  },
});


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
