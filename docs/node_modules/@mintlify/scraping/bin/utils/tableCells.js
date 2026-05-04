import { CONTINUE, visit } from 'unist-util-visit';
export function remarkRemoveCodeBlocksInCells() {
    return function (root) {
        return removeCodeBlocksInCells(root);
    };
}
// ReadMe specific, since they allow for `<pre>` blocks inside
// of table cells, could be supported elsewhere, but haven't seen it
function removeCodeBlocksInCells(root) {
    visit(root, 'tableCell', function (node) {
        visit(node, 'code', function (subNode, index, parent) {
            if (!parent || typeof index !== 'number')
                return CONTINUE;
            const newNode = {
                type: 'inlineCode',
                value: subNode.value,
            };
            parent.children[index] = newNode;
        });
    });
}
//# sourceMappingURL=tableCells.js.map