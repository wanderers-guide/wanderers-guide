import type { Element } from 'hast';
export declare function unifiedRemoveBreaks(): (node: Element) => undefined;
/**
 * ReadMe-specific function since they use breaks in between
 * every element, but either way our parser adds whitespace
 * automatically
 */
export declare function removeBreaks(node: Element): undefined;
