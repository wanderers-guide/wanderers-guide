import type { Result } from '../types/result.js';
export declare function scrapePage(html: string, url: string | URL, opts?: {
    externalLink: boolean;
    isOverviewPage?: boolean;
    rootPath?: string;
}): Promise<Result<[string, string]>>;
