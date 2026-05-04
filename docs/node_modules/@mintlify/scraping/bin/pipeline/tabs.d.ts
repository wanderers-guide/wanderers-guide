import { MintConfig } from '@mintlify/models';
import type { Result } from '../types/result.js';
export declare function scrapeAllSiteTabs(html: string, url: string | URL): Promise<Result<MintConfig>>;
