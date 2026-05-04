import { visit } from 'unist-util-visit';
export function unifiedRemoveBreaks() {
    return function (node) {
        return removeBreaks(node);
    };
}
/**
 * ReadMe-specific function since they use breaks in between
 * every element, but either way our parser adds whitespace
 * automatically
 */
export function removeBreaks(node) {
    return visit(node, 'element', function (subNode, index, parent) {
        if (subNode.tagName === 'br' && parent && typeof index === 'number') {
            parent.children.splice(index, 1);
        }
    });
}
//# sourceMappingURL=breaks.js.map