import { ContentSource, PublicUser } from '@typing/content';
import _ from 'lodash-es';
import { fetchContentSources } from './content-store';

export async function updateSubscriptions(user: PublicUser | undefined | null, source: ContentSource, add: boolean) {
  if (!user) return [];

  let subscriptions = add
    ? [
        ...(user.subscribed_content_sources ?? []),
        { source_id: source.id, source_name: source.name, added_at: `${new Date().getTime()}` },
      ]
    : user.subscribed_content_sources?.filter((src) => src.source_id !== source?.id);
  subscriptions = _.uniq(subscriptions);

  const sources = await fetchContentSources({ ids: subscriptions.map((s) => s.source_id) });
  subscriptions = subscriptions.filter((s) => sources.find((src) => src.id === s.source_id));
  return subscriptions;
}
