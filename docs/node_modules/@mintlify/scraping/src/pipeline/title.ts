import type { Root as HastRoot } from 'hast';
import { CONTINUE, EXIT, visit } from 'unist-util-visit';

const defaultTitle = 'Enter name here';

export async function downloadTitle(hast: HastRoot): Promise<string> {
  let text: string | undefined = undefined as string | undefined;

  visit(hast, 'element', function (node) {
    if (node.tagName !== 'title') return CONTINUE;

    visit(node, 'text', function (subNode) {
      text = subNode.value;
      return EXIT;
    });

    if (text) {
      return EXIT;
    }
  });

  if (!text) return defaultTitle;

  const title = text as string;
  let siteGroupTitle = '';

  if (title.includes('|')) {
    siteGroupTitle = (title.split('|').at(-1) ?? '').trim() as string;
  } else if (title.includes('–')) {
    siteGroupTitle = (title.split('–').at(-1) ?? '').trim() as string;
  } else if (title.includes('-')) {
    siteGroupTitle = (title.split('-').at(-1) ?? '').trim() as string;
  } else {
    siteGroupTitle = title.trim();
  }

  return siteGroupTitle ? siteGroupTitle : defaultTitle;
}
