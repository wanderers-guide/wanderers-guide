import { toMdast, defaultHandlers } from 'hast-util-to-mdast';
import { ESCAPED_COMPONENTS } from '../constants.js';
export function mdxJsxFlowElementHandler(_, node) {
    return {
        type: 'mdxJsxFlowElement',
        name: node.tagName,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        attributes: Object.entries(node.properties ?? {}).map(([key, value]) => ({
            type: 'mdxJsxAttribute',
            name: key,
            value: value,
        })),
        children: node.children,
    };
}
export function selectiveRehypeRemark() {
    const handlers = { ...defaultHandlers };
    ESCAPED_COMPONENTS.forEach((tagName) => {
        handlers[tagName] = mdxJsxFlowElementHandler;
    });
    handlers.mdxJsxFlowElement = mdxJsxFlowElementHandler;
    return function (tree) {
        const newTree = toMdast(tree, {
            handlers,
        });
        return newTree;
    };
}
//# sourceMappingURL=selective.js.map