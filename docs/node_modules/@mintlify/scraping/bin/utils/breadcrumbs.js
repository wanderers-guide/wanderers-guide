import { visit } from 'unist-util-visit';
import { framework } from './detectFramework.js';
export function unifiedRemoveBreadCrumbs() {
    return function (node) {
        return removeBreadCrumbs(node);
    };
}
/**
 * Docusaurus-specific function since their breadcrumbs
 * are within the content in the `article` itself instead
 * of outside of the `article` element
 */
export function removeBreadCrumbs(node) {
    return visit(node, 'element', function (subNode, index, parent) {
        if (framework.vendor === 'docusaurus' &&
            subNode.tagName === 'nav' &&
            Array.isArray(subNode.properties.className) &&
            subNode.properties.className.includes('theme-doc-breadcrumbs') &&
            parent &&
            typeof index === 'number') {
            parent.children.splice(index, 1);
        }
    });
}
//# sourceMappingURL=breadcrumbs.js.map