import type { Element } from 'hast';
import { CONTINUE, SKIP, visit } from 'unist-util-visit';

export function getText(element: Element | undefined): string {
  if (!element) return '';
  let text = '';
  visit(element, function (node) {
    if (node.type === 'element' && node.tagName === 'svg') return SKIP;
    if (node.type === 'text') text += node.value;
    return CONTINUE;
  });
  return text;
}
