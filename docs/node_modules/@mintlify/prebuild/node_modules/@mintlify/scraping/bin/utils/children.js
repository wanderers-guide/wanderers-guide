import { toMdast, defaultHandlers } from 'hast-util-to-mdast';
import { unified } from 'unified';
import { ESCAPED_COMPONENTS } from '../constants.js';
import { mdxJsxFlowElementHandler } from '../customComponents/selective.js';
export function turnChildrenIntoMdx(children, opts = { jsxImages: false }) {
    const hast = {
        type: 'root',
        children,
    };
    const handlers = { ...defaultHandlers };
    if (opts.jsxImages) {
        handlers['img'] = function (h, node) {
            Object.keys(node.properties).forEach((key) => {
                if (key !== 'src')
                    delete node.properties[key];
            });
            return mdxJsxFlowElementHandler(h, node);
        };
    }
    ESCAPED_COMPONENTS.forEach((component) => {
        handlers[component] = function (h, node) {
            return mdxJsxFlowElementHandler(h, node);
        };
    });
    const mdxAst = unified()
        .use(function () {
        return function (tree) {
            const newTree = toMdast(tree, {
                handlers,
            });
            return newTree;
        };
    })
        .runSync(hast);
    mdxAst.children.forEach((child, index) => {
        if (child.type === 'html')
            mdxAst.children.splice(index, 1);
    });
    return mdxAst.children;
}
//# sourceMappingURL=children.js.map