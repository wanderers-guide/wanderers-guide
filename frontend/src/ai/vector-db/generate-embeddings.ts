import { hideNotification, showNotification } from '@mantine/notifications';
import { getAllContentForSource } from '@content/content-controller';
import { populateContent } from './vector-manager';

export async function generateEmbeddings(sourceId: number) {
  showNotification({
    id: 'generate-embeddings',
    title: `Generating embeddings...`,
    message: `This may take a minute or two.`,
    autoClose: false,
  });

  const content = await getAllContentForSource(sourceId);
  const embeddings = await Promise.all([
    populateContent(
      'ancestry',
      content.ancestries.map((n) => n.id)
    ),
    populateContent(
      'background',
      content.backgrounds.map((n) => n.id)
    ),
    populateContent(
      'class',
      content.classes.map((n) => n.id)
    ),
    populateContent(
      'ability-block',
      content.abilityBlocks.map((n) => n.id)
    ),
    populateContent(
      'item',
      content.items.map((n) => n.id)
    ),
    populateContent(
      'language',
      content.languages.map((n) => n.id)
    ),
    populateContent(
      'spell',
      content.spells.map((n) => n.id)
    ),
    populateContent(
      'trait',
      content.traits.map((n) => n.id)
    ),
    populateContent(
      'creature',
      content.creatures.map((n) => n.id)
    ),
  ]);

  hideNotification('generate-embeddings');
  showNotification({
    id: 'generate-embeddings',
    title: `Successfully Generated Embeddings`,
    message: `See logs for more details.`,
    autoClose: 6000,
  });
  console.log(embeddings);

  return embeddings;
}
