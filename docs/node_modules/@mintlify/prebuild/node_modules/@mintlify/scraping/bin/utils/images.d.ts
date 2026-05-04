import type { Result } from '../types/result.js';
export declare function downloadImage(src: string, rootPath: string): Promise<Result<[string, string]>>;
export declare function isValidImageSrc(src: string): boolean;
export declare function getFilenameBeforeMetadata(src: string, ext: string): string;
export declare function removeMetadataFromImageSrc(src: string): string;
