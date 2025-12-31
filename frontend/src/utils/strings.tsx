import { titleCase } from 'title-case';

export function pluralize(word: string): string {
  if (word[word.length - 1] === 'y') {
    return word.substring(0, word.length - 1) + 'ies';
  } else if (word[word.length - 1] === 's') {
    return word + 'es';
  } else {
    return word + 's';
  }
}

export function stripEmojis(text: string) {
  return text.replace(/[^\p{L}\p{N}\p{P}\p{Z}^$\n]/gu, '');
}

export function toLabel(text?: string | null) {
  if (!text) return '';
  const OVERRIDE_CHANGES = {
    fort: 'Fortitude',
    str: 'Strength',
    dex: 'Dexterity',
    con: 'Constitution',
    int: 'Intelligence',
    wis: 'Wisdom',
    cha: 'Charisma',
    Fort: 'Fortitude',
    Str: 'Strength',
    Dex: 'Dexterity',
    Con: 'Constitution',
    Int: 'Intelligence',
    Wis: 'Wisdom',
    Cha: 'Charisma',
    FORT: 'Fortitude',
    STR: 'Strength',
    DEX: 'Dexterity',
    CON: 'Constitution',
    INT: 'Intelligence',
    WIS: 'Wisdom',
    CHA: 'Charisma',
    dc: 'DC',
    hp: 'HP',
    'Simple Weapons': 'simple weapons',
    'Martial Weapons': 'martial weapons',
    'Advanced Weapons': 'advanced weapons',
    'Unarmed Attacks': 'unarmed attacks',
    'Light Armor': 'light armor',
    'Medium Armor': 'medium armor',
    'Heavy Armor': 'heavy armor',
    'Unarmored Defense': 'unarmored defense',
    'Class DC': 'class DC',
    'Class Dc': 'class DC',
    'ability-block': 'option',
    'class-archetype': 'class archetype',
    unarmed_attack: 'unarmed',
  };
  const REMOVAL_CHANGES = [
    'skill_',
    'save_',
    'weapon_group_',
    'weapon_division_',
    'weapon_',
    'armor_group_',
    'armor_division_',
    'armor_',
    'attribute_',
    'speed_',
  ];

  let label = text.trim().toLowerCase();
  for (const [key, value] of Object.entries(OVERRIDE_CHANGES)) {
    label = label.replace(new RegExp(`\\b${key}\\b`, 'g'), value);
  }
  for (const value of REMOVAL_CHANGES) {
    label = label.replace(value, '');
  }
  label = label.replace(/_/g, ' ');
  label = titleCase(label);
  label = label.trim();

  // Run thru the override again to fix capitalization
  for (const [key, value] of Object.entries(OVERRIDE_CHANGES)) {
    label = label.replace(new RegExp(`\\b${key}\\b`, 'g'), value);
  }

  // Fix incorrect capitalizations
  if (label.includes('From') && !label.startsWith('From')) {
    label = label.replace('From', 'from');
  }

  // Lore switch
  if (label.startsWith('Lore ')) {
    label = label.replace('Lore ', '');
    label = `${label} Lore`;
  }

  // Capitalize AC and DC
  if (label.endsWith('Ac')) {
    label = label.slice(0, -2) + 'AC';
  }
  if (label.endsWith('Dc')) {
    label = label.slice(0, -2) + 'DC';
  }

  // Format rankings
  label = label.replaceAll(/(\W|^)\d(st|nd|rd|th)(\W|$)/gim, (m) => m.toLowerCase());

  return label.trim();
}

export function parseDiceRoll(dice: string): { dice: number; die: string; bonus: number; suffix: string }[] {
  const results: { dice: number; die: string; bonus: number; suffix: string }[] = [];

  // Normalize the string by converting to lowercase and replacing semicolons and plus signs with commas
  const normalizedDice = dice.toLowerCase().replace(/[.;]+/g, ',');

  // Regular expression to match each dice roll part
  const regex = /(\d+)d(\d+)(?: *([\+\-] *\d+))? *([a-zA-Z]*)/g;
  // Alt simple only: /(^|\s)(\d+)d(\d+)\s*([+-]\s*\d+)($|\s)/g;

  let match;
  while ((match = regex.exec(normalizedDice)) !== null) {
    const [_, diceCount, die, bonusStr, suffix] = match;
    results.push({
      dice: parseInt(diceCount),
      die: `d${die}`,
      bonus: bonusStr ? parseInt(bonusStr.replace(/\s+/g, '')) : 0,
      suffix: suffix || '',
    });
  }

  return results;
}
