import { visit } from 'unist-util-visit';
export function unifiedRemoveClassNames() {
    return function (node) {
        return removeClassNames(node);
    };
}
function removeClassNames(node) {
    return visit(node, 'element', function (subNode) {
        if ('properties' in subNode)
            delete subNode.properties.className;
    });
}
//# sourceMappingURL=className.js.map