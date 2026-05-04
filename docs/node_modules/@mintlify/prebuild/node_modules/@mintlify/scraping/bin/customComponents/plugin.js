import { visit } from 'unist-util-visit';
import { ESCAPED_COMPONENTS } from '../constants.js';
export function rehypeToRemarkCustomComponents() {
    return function (tree) {
        visit(tree, 'element', function (node, index, parent) {
            if (ESCAPED_COMPONENTS.includes(node.tagName)) {
                const newNode = {
                    type: 'mdxJsxFlowElement',
                    name: node.tagName,
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    attributes: Object.entries(node.properties || {}).map(([key, value]) => ({
                        type: 'mdxJsxAttribute',
                        name: key,
                        value: value,
                    })),
                    children: node.children,
                };
                if (parent && typeof index === 'number') {
                    parent.children[index] = newNode;
                }
            }
        });
        return tree;
    };
}
//# sourceMappingURL=plugin.js.map