import * as _ from 'lodash-es';
import { ReactNode } from 'react';
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
    unarmed_attack: 'unarmed',
  };
  const REMOVAL_CHANGES = [
    'skill_',
    'save_',
    'weapon_group_',
    'weapon_',
    'armor_group_',
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

  return label.trim();
}

// export function listToLabel(strings: string[], endingWord: string): string {
//   return strings.length === 0
//     ? ''
//     : strings.length === 1
//     ? strings[0]
//     : `${strings.slice(0, -1).join(', ')} ${endingWord} ${strings.slice(-1)[0]}`;
// }

export function listToLabel(nodes: ReactNode[], endingWord: string): ReactNode {
  if (nodes.length === 0) {
    return '';
  } else if (nodes.length === 1) {
    return nodes[0];
  } else {
    const joinedNodes = nodes.slice(0, -1).reduce(
      (acc, node, index) => (
        <>
          {acc}
          {index > 0 && ', '}
          {node}
        </>
      ),
      null
    );

    return (
      <>
        {joinedNodes} {endingWord} {nodes.slice(-1)[0]}
      </>
    );
  }
}

// export function startCase(text: string) {
//   text = text
//     .trim()
//     .toLowerCase()
//     .replace(/(^|\s|[^a-zA-Z0-9])([a-zA-Z0-9])/g, (match, prefix, letter) => {
//       return prefix + letter.toUpperCase();
//     });
//   text = text.replace(' And ', ' and ');
//   text = text.replace(' Or ', ' or ');
//   text = text.replace(' In ', ' in ');
//   text = text.replace(' By ', ' by ');
//   text = text.replace(' Of ', ' of ');
//   text = text.replace(' The ', ' the ');
//   text = text.replace(' A ', ' a ');
//   text = text.replace(' An ', ' an ');
//   text = text.replace(' On ', ' on ');
//   return text;
// }
