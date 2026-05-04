import { Tab } from '@mintlify/models';
import type { Root as HastRoot } from 'hast';
export declare function retrieveTabLinks(rootNode: HastRoot, url: URL): Array<Tab> | undefined;
