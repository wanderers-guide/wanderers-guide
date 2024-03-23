import { buildHrefFromContentData } from '@common/rich_text_input/ContentLinkExtension';
import { AbilityBlockType, ContentType } from '@typing/content';

const actionMap: Record<string, number> = {
  // Hardcoded action ids:
  Strike: 19856,
  Seek: 19845,
  'Recall Knowledge': 19753,
  'Treat Wounds': 19864,
  Subsist: 19857,
  Escape: 19632,
  Crawl: 19618,
  Stand: 19851,
  'Take Cover': 19860,
  Sneak: 19850,
  Hide: 19726,
};

export function convertToHardcodedLink(type: ContentType | AbilityBlockType, text: string, displayText?: string) {
  let id;
  if (type === 'action') {
    id = actionMap[text];
  }
  if (id) {
    return `[${displayText ?? text}](${buildHrefFromContentData(type, id)})`;
  }
  return text;
}
