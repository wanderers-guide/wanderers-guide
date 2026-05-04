import type { Root as HastRoot, Element } from 'hast';
import type { State } from 'hast-util-to-mdast';
import type { Root as MdastRoot } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
export declare function mdxJsxFlowElementHandler(_: State, node: Element): MdxJsxFlowElement;
export declare function selectiveRehypeRemark(): (tree: HastRoot) => MdastRoot;
