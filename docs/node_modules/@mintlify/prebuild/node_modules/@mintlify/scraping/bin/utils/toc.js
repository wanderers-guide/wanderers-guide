import { visit } from 'unist-util-visit';
import { framework } from './detectFramework.js';
export function unifiedRemoveTableOfContents() {
    return function (node) {
        return removeTableOfContents(node);
    };
}
/**
 * Docusaurus-specific function since their mobile ToC
 * is within the content in the `article` itself instead
 * of outside of the `article` element
 */
export function removeTableOfContents(node) {
    return visit(node, 'element', function (subNode, index, parent) {
        if (framework.vendor === 'docusaurus' &&
            subNode.tagName === 'div' &&
            Array.isArray(subNode.properties.className) &&
            subNode.properties.className.includes('theme-doc-toc-mobile') &&
            parent &&
            typeof index === 'number') {
            parent.children.splice(index, 1);
        }
    });
}
//# sourceMappingURL=toc.js.map