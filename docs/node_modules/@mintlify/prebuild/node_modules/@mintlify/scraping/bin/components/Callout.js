import { assertIsStringArray } from '../assert.js';
import { turnChildrenIntoMdx } from '../utils/children.js';
export function gitBookScrapeCallout(node, _, __) {
    if (node.tagName !== 'div' ||
        !Array.isArray(node.properties.className) ||
        !node.properties.className
            .join(' ')
            .startsWith('px-4 py-4 transition-colors rounded-md straight-corners:rounded-none bg-gradient-to-b')) {
        return undefined;
    }
    assertIsStringArray(node.properties.className);
    const className = node.properties.className
        .find((className) => /^from-[a-z]+\/[0-9]$/.test(className))
        ?.replace(/^from-|\/[0-9]$/g, '') || null;
    let tagName = 'Note';
    switch (className) {
        case 'periwinkle':
            tagName = 'Info';
            break;
        case 'teal':
            tagName = 'Check';
            break;
        case 'yellow':
        case 'pomegranate':
            tagName = 'Warning';
            break;
        default:
            tagName = 'Info';
            break;
    }
    const newNode = {
        type: 'element',
        tagName: tagName,
        properties: {},
        children: turnChildrenIntoMdx(node.children),
    };
    return newNode;
}
export function readmeScrapeCallout(node, _, __) {
    if (node.tagName !== 'blockquote' ||
        !Array.isArray(node.properties.className) ||
        !node.properties.className.includes('callout')) {
        return undefined;
    }
    node.children.shift();
    assertIsStringArray(node.properties.className);
    const calloutClassNames = node.properties.className.filter((className) => className.includes('callout_'));
    const calloutClassName = calloutClassNames[0] ? calloutClassNames[0] : 'callout_info';
    let tagName = 'Note';
    switch (calloutClassName) {
        case 'callout_default':
        case 'callout_info':
            tagName = 'Info';
            break;
        case 'callout_warn':
        case 'callout_error':
            tagName = 'Warning';
            break;
        case 'callout_okay':
            tagName = 'Check';
            break;
        default:
            tagName = 'Info';
            break;
    }
    const newNode = {
        type: 'element',
        tagName: tagName,
        properties: {},
        children: turnChildrenIntoMdx(node.children),
    };
    return newNode;
}
export function docusaurusScrapeCallout(node, _, __) {
    if (node.tagName !== 'div' ||
        !Array.isArray(node.properties.className) ||
        (!node.properties.className.includes('admonition') &&
            !node.properties.className.includes('theme-admonition'))) {
        return undefined;
    }
    node.children.shift();
    const calloutClassNames = node.properties.className.filter((className) => typeof className === 'string' && className.includes('alert--'));
    const calloutClassName = calloutClassNames.length ? calloutClassNames[0] : 'alert--info';
    let tagName = 'Note';
    switch (calloutClassName) {
        case 'alert--info':
            tagName = 'Info';
            break;
        case 'alert--secondary':
            tagName = 'Note';
            break;
        case 'alert--danger':
        case 'alert--warning':
            tagName = 'Warning';
            break;
        case 'alert--success':
            tagName = 'Check';
            break;
        default:
            tagName = 'Info';
            break;
    }
    const newNode = {
        type: 'element',
        tagName: tagName,
        properties: {},
        children: turnChildrenIntoMdx(node.children),
    };
    return newNode;
}
//# sourceMappingURL=Callout.js.map