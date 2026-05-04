import { NavigationEntry } from '@mintlify/models';
import type { Element } from 'hast';
export type ListItemOptions = {
    sectionTagName: string;
    childListTagName: string;
    title?: string;
};
export declare function processListItem(node: Element, opts?: ListItemOptions): NavigationEntry | undefined;
