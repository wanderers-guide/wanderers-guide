import { buildHrefFromContentData } from '@common/rich_text_input/ContentLinkExtension';
import { AbilityBlockType, ContentType } from '@typing/content';

const actionMap: Record<string, number> = {
  // Hardcoded action ids:
  Strike: 19856,
};

export function convertToHardcodedLink(text: string, type: ContentType | AbilityBlockType) {
  let id;
  if (type === 'action') {
    id = actionMap[text];
  }
  if (id) {
    return `[${text}](${buildHrefFromContentData(type, id)})`;
  }
  return text;
}
