import { visit } from 'unist-util-visit';
export function unifiedRemovePositions() {
    return function (node) {
        return removePositions(node);
    };
}
function removePositions(node) {
    return visit(node, function (subNode) {
        delete subNode.position;
    });
}
//# sourceMappingURL=position.js.map