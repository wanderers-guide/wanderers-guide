import type {
  ElementContent,
  Root as HastRoot,
  Comment,
  Text,
  Element,
  RootContent as HastRootContent,
} from 'hast';
import { toMdast, defaultHandlers } from 'hast-util-to-mdast';
import type { State, Handle } from 'hast-util-to-mdast';
import type { RootContent as MdastRootContent, Root as MdastRoot } from 'mdast';
import { unified } from 'unified';

import { ESCAPED_COMPONENTS } from '../constants.js';
import { mdxJsxFlowElementHandler } from '../customComponents/selective.js';

export function turnChildrenIntoMdx(
  children: Array<HastRootContent | ElementContent | Element | Comment | Text>,
  opts: { jsxImages: boolean } = { jsxImages: false }
): Array<MdastRootContent> {
  const hast: HastRoot = {
    type: 'root',
    children,
  };

  const handlers: Record<string, Handle> = { ...defaultHandlers };
  if (opts.jsxImages) {
    handlers['img'] = function (h: State, node: Element) {
      Object.keys(node.properties).forEach((key) => {
        if (key !== 'src') delete node.properties[key];
      });
      return mdxJsxFlowElementHandler(h, node);
    };
  }

  ESCAPED_COMPONENTS.forEach((component) => {
    handlers[component] = function (h: State, node: Element) {
      return mdxJsxFlowElementHandler(h, node);
    };
  });

  const mdxAst = unified()
    .use(function () {
      return function (tree: HastRoot): MdastRoot {
        const newTree = toMdast(tree, {
          handlers,
        }) as MdastRoot;
        return newTree;
      };
    })
    .runSync(hast);

  mdxAst.children.forEach((child, index) => {
    if (child.type === 'html') mdxAst.children.splice(index, 1);
  });

  return mdxAst.children;
}
