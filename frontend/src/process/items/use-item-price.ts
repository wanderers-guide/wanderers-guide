import { fetchContentSources, getCachedContent } from '@content/content-store';
import { useQuery } from '@tanstack/react-query';
import { ContentSource, Item } from '@schemas/content';
import { priceToString } from './currency-handler';

/** Display an item's price using its source group or an explicitly supplied owner's credit context. */
export function useItemPrice(item?: Item, ownerUsesCredits = false): string {
  const sourceId = item?.content_source_id;
  const { data: source } = useQuery({
    // Share the source drawer's lookup and the content store's existing cache/access rules.
    queryKey: [`find-content-source-${sourceId}`, { id: sourceId }],
    queryFn: async () => (await fetchContentSources([sourceId!])).find((entry) => entry.id === sourceId) ?? null,
    initialData: () => getCachedContent<ContentSource>('content-source').find((entry) => entry.id === sourceId),
    enabled: !!sourceId && !!item?.price?.sp && !ownerUsesCredits,
  });
  const price = item?.price
    ? {
        cp: Number(item.price.cp) || undefined,
        sp: Number(item.price.sp) || undefined,
        gp: Number(item.price.gp) || undefined,
        pp: Number(item.price.pp) || undefined,
      }
    : undefined;
  return priceToString(price, ownerUsesCredits || source?.group === 'starfinder-core');
}
