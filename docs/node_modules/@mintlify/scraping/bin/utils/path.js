import { join } from 'path';
import { addMdx } from './extension.js';
import { toFilename } from './file.js';
export function createFilename(rootPath = process.cwd(), filename, title) {
    if (typeof filename === 'string' && filename.startsWith('http')) {
        const url = new URL(filename);
        filename = url.pathname;
    }
    else if (typeof filename === 'object') {
        filename = filename.pathname;
    }
    if (filename.endsWith('/')) {
        filename += 'index';
    }
    return join(rootPath, addMdx(filename || toFilename(title || 'index')));
}
//# sourceMappingURL=path.js.map