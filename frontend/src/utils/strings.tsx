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
  return _.startCase(text.toLowerCase().replace('_', ' ').replace('-', ' '));
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
