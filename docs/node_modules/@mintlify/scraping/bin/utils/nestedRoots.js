import { CONTINUE, visit } from 'unist-util-visit';
/** There should only be one root; this replaces any inner roots
 * that we might get because of us converting the content manually
 * to `contentAsRoot` from `content`
 */
export function unifiedRemoveNestedRoots() {
    return function (node) {
        return removeNestedRoots(node);
    };
}
function removeNestedRoots(root) {
    visit(root, 'root', function (node, _, parent) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!parent)
            return CONTINUE;
        parent.children = node.children;
    });
}
//# sourceMappingURL=nestedRoots.js.map