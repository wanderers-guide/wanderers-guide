type DiceTheme = {
  imageURL: string;
  name: string;
  theme: string;
};

export const DICE_THEMES: DiceTheme[] = [
  ...[
    {
      name: 'Default Theme',
      theme: 'wg-default-luqqusz7',
      imageURL: 'https://i.imgur.com/WBuxeuW.png',
    },
  ],
  ...[
    {
      name: 'Surf Special',
      theme: 'surf-special-lu8uei3w',
      imageURL: 'https://i.imgur.com/ddREBei.png',
    },
    {
      name: 'Beyond the Clouds',
      theme: 'beyond-the-clouds-lu4wzj63',
      imageURL: 'https://i.imgur.com/O0i6MuX.png',
    },
    {
      name: 'Armellian Classic',
      theme: 'armellian-classic-dice-lrz1nwhc',
      imageURL: 'https://i.imgur.com/Ilg2I7H.png',
    },
    {
      name: 'The Deep',
      theme: 'the-deep-(bluegreen)-ldvj7u9f',
      imageURL: 'https://i.imgur.com/w3w8WJm.png',
    },
    {
      name: 'Gold Galaxy',
      theme: 'gold-galaxy-lrgp8v39',
      imageURL: 'https://i.imgur.com/646vyk6.png',
    },
    {
      name: 'Silvie',
      theme: 'silvie-lr1gjqod',
      imageURL: 'https://i.imgur.com/8hGvNlq.png',
    },
    {
      name: `Ancient's Gambit`,
      theme: `ancient's-gambit-lgub00w9`,
      imageURL: 'https://i.imgur.com/NQxHvvK.png',
    },
    {
      name: 'Jötunnstormur',
      theme: 'jotunnstormur-lqv7s8dt',
      imageURL: 'https://i.imgur.com/JYh47pk.png',
    },
    {
      name: 'Green Marble',
      theme: 'green-marble-lu5ojg4b',
      imageURL: 'https://i.imgur.com/KheHM3N.png',
    },
    {
      name: 'Blue and Gold',
      theme: 'blue-and-gold-lu5o9i9q',
      imageURL: 'https://i.imgur.com/UiUxsDR.png',
    },
    {
      name: 'Sky',
      theme: 'sky-lpdbnvcb',
      imageURL: 'https://i.imgur.com/SMTzZKJ.png',
    },
    {
      name: 'Ice Magic',
      theme: 'ice-magic-lu4vmlo8',
      imageURL: 'https://i.imgur.com/uYeUezh.png',
    },
    {
      name: 'ROLL UNDER',
      theme: 'roll-under-ltw9652q',
      imageURL: 'https://i.imgur.com/ud9ilD5.png',
    },
    {
      name: 'Black Marble',
      theme: 'black-marble-dice-ltkoy7oi',
      imageURL: 'https://i.imgur.com/3197pbu.png',
    },
    {
      name: 'White Marble',
      theme: 'white-marble-dide-ltkon7sv',
      imageURL: 'https://i.imgur.com/b6mfnHE.png',
    },
    {
      name: 'Silver Tongue',
      theme: 'silver-tongue-lt3f44br',
      imageURL: 'https://i.imgur.com/bRCx3wC.png',
    },
    {
      name: `Goblin's Cauldron`,
      theme: 'goblins-cauldron-(smoke-effect)-lsw6rsk9',
      imageURL: 'https://i.imgur.com/t9JnoFL.png',
    },
    {
      name: 'Killing Machine',
      theme: 'cosmic-marvel-dice-lsdkkil6',
      imageURL: 'https://i.imgur.com/Dh9nqgc.png',
    },
    {
      name: 'Bandit Clan',
      theme: 'bandit-clan-dice-lsip5dgk',
      imageURL: 'https://i.imgur.com/3Z9seXX.png',
    },
    {
      name: `Jester's Ruse`,
      theme: `jester's-ruse-dice-ls7j7ltq`,
      imageURL: 'https://i.imgur.com/UWQKCYb.png',
    },
    {
      name: 'Morning Star',
      theme: 'morning-star-dice-ls47rmgs',
      imageURL: 'https://i.imgur.com/ULXQSiF.png',
    },
    {
      name: 'Spooky Blue',
      theme: 'spooky-blue-luqrjhgb',
      imageURL: 'https://i.imgur.com/CJafu1F.png',
    },
  ].sort((a, b) => a.name.localeCompare(b.name)),
];

export function findDiceTheme(theme: string): DiceTheme {
  return DICE_THEMES.find((diceTheme) => diceTheme.theme === theme) || DICE_THEMES[0];
}
