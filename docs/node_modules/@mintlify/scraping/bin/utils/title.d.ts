import type { Element, ElementContent, Root as HastRoot } from 'hast';
import type { Root as MdastRoot, BlockContent } from 'mdast';
export declare function findTitle(node: Element | ElementContent | BlockContent | MdastRoot | HastRoot | undefined, opts?: {
    delete: boolean;
    nodeType?: string;
    tagName?: string;
    escaped?: boolean;
}): string;
export declare function getTitleFromHeading(root: MdastRoot): string;
export declare function getDescriptionFromRoot(root: MdastRoot): string;
export declare function getTitleFromLink(url: string): string;
