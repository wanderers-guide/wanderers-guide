import { MintConfig, Tab } from '@mintlify/models';
import type { Root as HastRoot } from 'hast';
import type { Result } from '../types/result.js';
export declare function scrapeSite(html: string, url: string | URL, opts?: {
    hast?: HastRoot;
    tabs?: Array<Tab>;
}): Promise<Result<MintConfig>>;
