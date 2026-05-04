import { visit, CONTINUE } from 'unist-util-visit';
export function removeHastComments(root) {
    visit(root, 'comment', function (_, index, parent) {
        if (parent && typeof index === 'number') {
            parent.children.splice(index, 1);
            return [CONTINUE, index];
        }
    });
}
export function rehypeRemoveHastComments() {
    return function (root) {
        return removeHastComments(root);
    };
}
//# sourceMappingURL=hastComments.js.map