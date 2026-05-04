import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { getErrorMessage } from './errors.js';
import { log } from './log.js';
import { createFilename } from './path.js';

export function write(filename: string, data: string | NodeJS.TypedArray) {
  writeFileSync(filename, data);
}

export function toFilename(title: string) {
  // Gets rid of special characters at the start and end
  // of the name by converting to spaces then using trim.
  //
  // I did not write this, I can feel the regex jokes
  // coming already. - Ricardo
  return title
    .replace(/[^a-z0-9]/gi, ' ')
    .trim()
    .replace(/ /g, '-')
    .toLowerCase();
}

export function writePage(
  filename: string | URL = '',
  title: string = '',
  description: string = '',
  markdown: string = '',
  url?: string
): void {
  const rootPath = process.cwd();
  const writePath = createFilename(rootPath, filename, title);
  if (!writePath) return;

  const cleanedWritePath = writePath.replace(rootPath, '.');

  try {
    mkdirSync(dirname(writePath), { recursive: true });
    write(writePath, formatPageWithFrontmatter(title, description, markdown, url));
    log(`${cleanedWritePath} written to disk`, 'success');
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    log(`${cleanedWritePath} couldn't download to disk${errorMessage}`);
  }
}

export function formatPageWithFrontmatter(
  title: string = '',
  description: string = '',
  markdown: string = '',
  url: string = ''
) {
  const optionalTitle = title ? `\ntitle: "${title}"` : '';
  const optionalDescription = description ? `\ndescription: "${description}"` : '';
  const optionalUrl = url ? `\nurl: "${url}"` : '';
  return `---${optionalTitle}${optionalDescription}${optionalUrl}\n---\n\n${markdown}`;
}
