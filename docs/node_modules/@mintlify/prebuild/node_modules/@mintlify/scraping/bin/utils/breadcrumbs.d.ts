import type { Element } from 'hast';
export declare function unifiedRemoveBreadCrumbs(): (node: Element) => undefined;
/**
 * Docusaurus-specific function since their breadcrumbs
 * are within the content in the `article` itself instead
 * of outside of the `article` element
 */
export declare function removeBreadCrumbs(node: Element): undefined;
