import { visit, EXIT, CONTINUE } from 'unist-util-visit';
import { framework } from '../utils/detectFramework.js';
export function retrieveRootContent(rootNode) {
    let rootSelector = new Map([['main', 'break-anywhere']]);
    switch (framework.vendor) {
        case 'docusaurus':
            rootSelector = new Map([
                ['article', undefined],
                ['div', 'index-page'],
            ]);
            break;
        case 'gitbook':
            rootSelector = new Map([['main', undefined]]);
            break;
        case 'readme':
            rootSelector = new Map([['article', 'rm-Article']]);
            break;
    }
    let element = undefined;
    visit(rootNode, 'element', function (node) {
        if (!rootSelector.has(node.tagName)) {
            return CONTINUE;
        }
        const classNameSelector = rootSelector.get(node.tagName);
        const { className } = node.properties;
        if (!classNameSelector || (Array.isArray(className) && className.includes(classNameSelector))) {
            element = node;
            return EXIT;
        }
    });
    return element;
}
//# sourceMappingURL=retrieve.js.map