import { join } from 'path';

import { addMdx } from './extension.js';
import { toFilename } from './file.js';

export function createFilename(
  rootPath: string = process.cwd(),
  filename: string | URL,
  title?: string
): string | undefined {
  if (typeof filename === 'string' && filename.startsWith('http')) {
    const url = new URL(filename);
    filename = url.pathname;
  } else if (typeof filename === 'object') {
    filename = (filename as URL).pathname;
  }

  if (filename.endsWith('/')) {
    filename += 'index';
  }

  return join(rootPath, addMdx(filename || toFilename(title || 'index')));
}
