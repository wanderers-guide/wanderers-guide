import { CONTINUE, visit } from 'unist-util-visit';
export function remarkRemoveEmptyEmphases() {
    return function (root) {
        return removeEmptyEmphases(root);
    };
}
function removeEmptyEmphases(root) {
    visit(root, function (node, index, parent) {
        if (node.type !== 'emphasis' && node.type !== 'strong')
            return CONTINUE;
        if (node.children.length === 0) {
            if (!parent || typeof index !== 'number')
                return CONTINUE;
            parent.children.splice(index, 1);
        }
    });
}
//# sourceMappingURL=emptyEmphasis.js.map