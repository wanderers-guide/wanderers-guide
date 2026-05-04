import type { Element } from 'hast';
export declare function unifiedRemoveTableOfContents(): (node: Element) => undefined;
/**
 * Docusaurus-specific function since their mobile ToC
 * is within the content in the `article` itself instead
 * of outside of the `article` element
 */
export declare function removeTableOfContents(node: Element): undefined;
