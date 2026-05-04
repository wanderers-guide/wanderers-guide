import type { ElementContent, Comment, Text, Element, RootContent as HastRootContent } from 'hast';
import type { RootContent as MdastRootContent } from 'mdast';
export declare function turnChildrenIntoMdx(children: Array<HastRootContent | ElementContent | Element | Comment | Text>, opts?: {
    jsxImages: boolean;
}): Array<MdastRootContent>;
