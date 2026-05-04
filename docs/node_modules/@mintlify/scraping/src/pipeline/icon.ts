import type { Root as HastRoot } from 'hast';
import { EXIT, visit } from 'unist-util-visit';

import { framework } from '../utils/detectFramework.js';
import { downloadImage } from '../utils/images.js';

export async function downloadFavicon(hast: HastRoot): Promise<string> {
  let src: string = '';
  const tagName = framework.vendor === 'docusaurus' ? 'meta' : 'link';
  visit(hast, 'element', function (node) {
    if (
      node.tagName === tagName &&
      Array.isArray(node.properties.rel) &&
      node.properties.rel.includes('icon')
    ) {
      src = node.properties.href as string;
      return EXIT;
    }
  });

  if (!src) {
    return '/favicon.svg';
  }

  const res = await downloadImage(src, process.cwd());
  if (!res.success || !res.data) return '/favicon.svg';

  return res.data[1];
}
