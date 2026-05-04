import { CONTINUE, visit } from 'unist-util-visit';
export function remarkSpaceListsOut() {
    return function (root) {
        return spaceListsOut(root);
    };
}
// ReadMe-specific function since they sometimes stack `<ol>`
// elements right on top of each other
function spaceListsOut(root) {
    return visit(root, 'list', (_, index, parent) => {
        if (!parent || typeof index !== 'number')
            return CONTINUE;
        if (index && index > 0 && parent.children[index - 1]?.type === 'list') {
            parent.children.splice(index, 0, {
                type: 'paragraph',
                children: [{ type: 'text', value: '' }],
            });
        }
    });
}
//# sourceMappingURL=lists.js.map