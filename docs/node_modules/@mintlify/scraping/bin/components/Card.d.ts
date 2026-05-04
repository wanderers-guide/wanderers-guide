import type { Element } from 'hast';
import type { HastNode, HastNodeIndex, HastNodeParent } from '../types/hast.js';
export declare function gitBookScrapeCard(node: HastNode, _: HastNodeIndex, __: HastNodeParent): Element | undefined;
export declare function readmeScrapeCard(node: HastNode, _: HastNodeIndex, parent: HastNodeParent): Element | undefined;
export declare function docusaurusScrapeCard(node: HastNode, _: HastNodeIndex, parent: HastNodeParent): Element | undefined;
