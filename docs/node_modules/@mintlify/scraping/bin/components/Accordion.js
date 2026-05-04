import { assertIsDefined, assertIsNumber } from '../assert.js';
import { turnChildrenIntoMdx } from '../utils/children.js';
import { findTitle } from '../utils/title.js';
export function gitBookScrapeAccordion(node, _, __) {
    if (node.tagName !== 'details') {
        return undefined;
    }
    const title = findTitle(node, { delete: true, nodeType: 'element', tagName: 'summary' });
    const newNode = {
        type: 'element',
        tagName: 'Accordion',
        properties: {
            title: title,
        },
        children: turnChildrenIntoMdx(node.children),
    };
    return newNode;
}
export function readmeScrapeAccordion(node, index, parent) {
    if (node.tagName !== 'button' ||
        !node.properties.className ||
        !node.properties.className.includes('accordion')) {
        return undefined;
    }
    assertIsNumber(index);
    assertIsDefined(parent);
    const title = findTitle(node);
    parent.children.shift();
    const newNode = {
        type: 'element',
        tagName: 'Accordion',
        properties: {
            title: title,
        },
        children: turnChildrenIntoMdx(parent.children),
    };
    return newNode;
}
export function docusaurusScrapeAccordion(node, _, __) {
    if (node.tagName !== 'details') {
        return undefined;
    }
    const title = findTitle(node, { delete: true, nodeType: 'element', tagName: 'summary' });
    const newNode = {
        type: 'element',
        tagName: 'Accordion',
        properties: {
            title: title,
        },
        children: turnChildrenIntoMdx(node.children),
    };
    return newNode;
}
//# sourceMappingURL=Accordion.js.map