import { AbilityBlock, AbilityBlockType, ContentType } from '@schemas/content';
import { getCachedContent } from '@content/content-store';

/**
 * Build a markdown content link (e.g. `[fire](link_trait_123)`) for the given content reference
 * so the RichText renderer can turn it into a clickable drawer link.
 *
 * Lookup is purely cache-driven and case-insensitive. We try the type-specific cache first
 * (for top-level ContentTypes like trait/spell/item), then fall back to the shared 'ability-block'
 * cache filtered by subtype (for action/feat/class-feature/...).
 *
 * If no id resolves (cache not yet populated, or no name match), the original prose text is
 * returned unchanged so the description still reads correctly.
 */
export function convertToHardcodedLink(type: ContentType | AbilityBlockType, text: string, displayText?: string) {
  const lookup = text.toLowerCase();

  // Top-level ContentType caches (trait, spell, item, ...) are keyed directly by `type`.
  // For an AbilityBlockType ('action' etc.) this returns [] since no cache is keyed by that name.
  let id = getCachedContent<{ id: number; name: string }>(type as ContentType).find(
    (i) => i.name.toLowerCase() === lookup
  )?.id;

  // Fall back to the shared 'ability-block' cache, filtered by the requested subtype.
  if (!id) {
    id = getCachedContent<AbilityBlock>('ability-block').find(
      (b) => b.type === type && b.name.toLowerCase() === lookup
    )?.id;
  }

  if (id) {
    return `[${displayText ?? text}](${buildHrefFromContentData(type, id)})`;
  }
  return displayText ?? text;
}

export function buildHrefFromContentData(type: ContentType | AbilityBlockType, id: string | number) {
  return `link_${type}_${id}`;
}
