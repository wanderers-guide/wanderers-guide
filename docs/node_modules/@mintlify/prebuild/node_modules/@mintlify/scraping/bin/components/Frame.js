import { turnChildrenIntoMdx } from '../utils/children.js';
import { findTitle } from '../utils/title.js';
export function gitBookScrapeFrame(node, _, __) {
    if ((node.tagName === 'figure' &&
        node.children.find((subNode) => subNode.type === 'element' && subNode.tagName === 'picture')) ||
        (node.tagName !== 'picture' && node.tagName !== 'figure'))
        return undefined;
    const newNode = {
        type: 'element',
        tagName: 'Frame',
        properties: {},
        children: turnChildrenIntoMdx(node.children, { jsxImages: true }),
    };
    const caption = findTitle(newNode);
    if (caption)
        newNode.properties.caption = caption;
    return newNode;
}
export function readmeScrapeFrame(node, _, __) {
    if ((node.tagName === 'figure' &&
        node.children.find((subNode) => subNode.type === 'element' && subNode.tagName === 'picture')) ||
        (node.tagName !== 'picture' && node.tagName !== 'figure'))
        return undefined;
    const newNode = {
        type: 'element',
        tagName: 'Frame',
        properties: {},
        children: turnChildrenIntoMdx(node.children, { jsxImages: true }),
    };
    const caption = findTitle(newNode);
    if (caption)
        newNode.properties.caption = caption;
    return newNode;
}
export function docusaurusScrapeFrame(node, _, __) {
    if ((node.tagName === 'figure' &&
        node.children.find((subNode) => subNode.type === 'element' && subNode.tagName === 'picture')) ||
        (node.tagName !== 'picture' && node.tagName !== 'figure'))
        return undefined;
    const newNode = {
        type: 'element',
        tagName: 'Frame',
        properties: {},
        children: turnChildrenIntoMdx(node.children, { jsxImages: true }),
    };
    const caption = findTitle(newNode);
    if (caption)
        newNode.properties.caption = caption;
    return newNode;
}
//# sourceMappingURL=Frame.js.map