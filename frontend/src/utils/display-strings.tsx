import { ReactNode } from 'react';

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
