import type { Code, Parent, InlineCode, Root as MdastRoot } from 'mdast';
import { CONTINUE, visit } from 'unist-util-visit';

export function remarkRemoveCodeBlocksInCells() {
  return function (root: MdastRoot) {
    return removeCodeBlocksInCells(root);
  };
}

// ReadMe specific, since they allow for `<pre>` blocks inside
// of table cells, could be supported elsewhere, but haven't seen it
function removeCodeBlocksInCells(root: MdastRoot) {
  visit(root, 'tableCell', function (node) {
    visit(node, 'code', function (subNode: Code, index, parent: Parent | undefined) {
      if (!parent || typeof index !== 'number') return CONTINUE;
      const newNode: InlineCode = {
        type: 'inlineCode',
        value: subNode.value,
      };
      (parent as Parent).children[index] = newNode;
    });
  });
}
