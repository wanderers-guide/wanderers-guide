import type { Root as MdastRoot } from 'mdast';
/** There should only be one root; this replaces any inner roots
 * that we might get because of us converting the content manually
 * to `contentAsRoot` from `content`
 */
export declare function unifiedRemoveNestedRoots(): (node: MdastRoot) => void;
