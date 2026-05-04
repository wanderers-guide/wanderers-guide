import type { Root as HastRoot, Element } from 'hast';
import { toMdast, defaultHandlers } from 'hast-util-to-mdast';
import type { State, Handle } from 'hast-util-to-mdast';
import type { Root as MdastRoot } from 'mdast';
import type { BlockContent, DefinitionContent } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

import { ESCAPED_COMPONENTS } from '../constants.js';

export function mdxJsxFlowElementHandler(_: State, node: Element): MdxJsxFlowElement {
  return {
    type: 'mdxJsxFlowElement',
    name: node.tagName,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    attributes: Object.entries(node.properties ?? {}).map(([key, value]) => ({
      type: 'mdxJsxAttribute',
      name: key,
      value: value as string,
    })),
    children: node.children as Array<BlockContent | DefinitionContent>,
  };
}

export function selectiveRehypeRemark() {
  const handlers: Record<string, Handle> = { ...defaultHandlers };
  ESCAPED_COMPONENTS.forEach((tagName) => {
    handlers[tagName] = mdxJsxFlowElementHandler;
  });
  handlers.mdxJsxFlowElement = mdxJsxFlowElementHandler;

  return function (tree: HastRoot) {
    const newTree = toMdast(tree, {
      handlers,
    }) as MdastRoot;
    return newTree;
  };
}
