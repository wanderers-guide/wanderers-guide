import type { Root as MdastRoot } from 'mdast';
import type { Result } from '../types/result.js';
export declare function downloadImagesFromFile(root: MdastRoot, url: string | URL): Promise<Array<Result<[string, string]>>>;
