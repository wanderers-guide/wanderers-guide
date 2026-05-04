import type { Result } from '../types/result.js';
export declare function scrapePageGroup(navGroup: Array<URL>, needsBrowser: boolean, opts?: {
    externalLinks: boolean;
    rootPaths?: Array<string>;
}): Promise<Array<Result<[string, string]>>>;
