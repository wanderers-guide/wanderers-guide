export declare function write(filename: string, data: string | NodeJS.TypedArray): void;
export declare function toFilename(title: string): string;
export declare function writePage(filename?: string | URL, title?: string, description?: string, markdown?: string, url?: string): void;
export declare function formatPageWithFrontmatter(title?: string, description?: string, markdown?: string, url?: string): string;
