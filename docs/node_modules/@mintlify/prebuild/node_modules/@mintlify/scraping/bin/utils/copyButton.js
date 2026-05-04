import { CONTINUE, EXIT, visit } from 'unist-util-visit';
export function unifiedRemoveCopyButtons() {
    return function (root) {
        return removeCopyButtons(root);
    };
}
// GitBook specific, since they have a 'Copy' button in every
// code block which can't be not scraped since it's included
// in every HTML output
export function removeCopyButtons(root) {
    visit(root, 'element', function (node, index, parent) {
        if (node.tagName !== 'button' ||
            !Array.isArray(node.properties.className) ||
            !node.properties.className.includes('group-hover/codeblock:opacity-[1]'))
            return CONTINUE;
        let isCopyButton = false;
        visit(node, 'text', function (textNode) {
            if (textNode.value === 'Copy' || textNode.value === 'copy') {
                isCopyButton = true;
                return EXIT;
            }
        });
        if (isCopyButton) {
            if (!parent || typeof index !== 'number')
                return CONTINUE;
            parent.children.splice(index, 1);
        }
    });
}
//# sourceMappingURL=copyButton.js.map