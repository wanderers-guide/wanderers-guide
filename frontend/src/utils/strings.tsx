import * as _ from 'lodash-es';
import { ReactNode } from 'react';

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
  text = text.replace('ability-block', 'option');
  text = text.replace('unarmed_attack', 'unarmed');

  // Replace parentheses with a unique placeholder
  text = text.replace(/\(/g, '_lp_').replace(/\)/g, '_rp_');

  text = _.startCase(text.toLowerCase());

  // Replace the unique placeholder with parentheses
  text = text.replace(/Lp/g, '(').replace(/Rp/g, ')');

  if (text.endsWith('Ac')) {
    text = text.slice(0, -2) + 'AC';
  }
  if (text.endsWith('Dc')) {
    text = text.slice(0, -2) + 'DC';
  }
  return text;
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

export function startCase(text: string) {
  text = text
    .trim()
    .toLowerCase()
    .replace(/(^|\s|[^a-zA-Z0-9])([a-zA-Z0-9])/g, (match, prefix, letter) => {
      return prefix + letter.toUpperCase();
    });
  text = text.replace(' And ', ' and ');
  text = text.replace(' Or ', ' or ');
  text = text.replace(' In ', ' in ');
  text = text.replace(' By ', ' by ');
  text = text.replace(' Of ', ' of ');
  text = text.replace(' The ', ' the ');
  text = text.replace(' A ', ' a ');
  text = text.replace(' An ', ' an ');
  text = text.replace(' On ', ' on ');
  return text;
}
