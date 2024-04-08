type DiceTheme = {
  imageURL: string;
  name: string;
  theme: string;
};

export const DICE_THEMES: DiceTheme[] = [
  {
    name: 'Default Theme',
    theme: 'wg-default-luqqusz7',
    imageURL: 'https://i.imgur.com/S2j3AQx.png',
  },
  {
    name: 'Surf Special',
    theme: 'surf-special-lu8uei3w',
    imageURL: 'https://i.imgur.com/ddREBei.png',
  },
];

export function findDiceTheme(theme: string): DiceTheme {
  return DICE_THEMES.find((diceTheme) => diceTheme.theme === theme) || DICE_THEMES[0];
}
