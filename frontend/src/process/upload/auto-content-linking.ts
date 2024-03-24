import { detectPotentialContentLinks } from '@ai/open-ai-handler';
import { queryByName } from '@ai/vector-db/vector-manager';

const ENABLED = false;

/**
 * Finds potential content links and attempts to convert them to actual content links.
 * @param text
 * @returns
 */
export async function performAutoContentLinking(text: string) {
  if (!ENABLED) {
    return text;
  }

  let detectedText = (await detectPotentialContentLinks(text)) ?? '';

  // If the AI added more than just the potential links, we don't want to use it.
  if (stripPotentialContentLinks(text.trim()) !== stripPotentialContentLinks(detectedText.trim())) {
    console.log('AI added more than just potential content links, not using it.');
    console.log('Original text:', text);
    console.log('Detected text:', detectedText);
    return text;
  }

  // For each pontential link, we'll try to find the linked content.
  const potentialLinks = detectedText.match(/\[\[(.*?)\]\]/g) ?? [];
  for (const potentialLink of potentialLinks) {
    const potentialContentName = stripPotentialContentLinks(potentialLink);
    const potentialContentList = await queryByName(potentialContentName, {
      amount: 3,
      maxDistance: 0.25,
    });

    let potentialContent = potentialContentList.find(
      (content) => `${content.name}`.trim().toLowerCase() === potentialContentName.trim().toLowerCase()
    );
    if (!potentialContent && potentialContentList.length > 0) {
      potentialContent = potentialContentList[0];
    }

    if (potentialContent) {
      const type = potentialContent._type === 'ability-block' ? potentialContent.type : potentialContent._type;
      detectedText = detectedText.replace(
        potentialLink,
        `<a href="link_${type}_${potentialContent.id}">${stripPotentialContentLinks(potentialLink)}</a>`
      );
    }
  }

  return stripPotentialContentLinks(detectedText);
}

function stripPotentialContentLinks(text: string) {
  return text.replace(/[\[\]]/g, '');
}
