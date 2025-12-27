import { ContentSource, PublicUser } from '@typing/content';
import { defineDefaultSources, fetchContentSources, SourceKey } from './content-store';
import { getPublicUser } from '@auth/user-manager';
import { isEqual, uniqWith } from 'lodash-es';

export async function updateSubscriptions(user: PublicUser | undefined | null, source: ContentSource, add: boolean) {
  if (!user) return [];

  let subscriptions = add
    ? [
        ...(user.subscribed_content_sources ?? []).filter((src) => src.source_id !== source?.id),
        { source_id: source.id, source_name: source.name, added_at: `${new Date().getTime()}` },
      ]
    : user.subscribed_content_sources?.filter((src) => src.source_id !== source?.id);
  subscriptions = uniqWith(subscriptions, isEqual);

  const sources = await fetchContentSources(subscriptions.map((s) => s.source_id));
  subscriptions = subscriptions.filter((s) => sources.find((src) => src.id === s.source_id));
  return subscriptions;
}

export async function defineDefaultSourcesForSource(view: SourceKey, source: ContentSource) {
  const allSources = await fetchContentSources('ALL-OFFICIAL-PUBLIC');
  const user = await getPublicUser();
  // TODO: change to only the bundle's required sources
  return defineDefaultSources(view, [
    ...allSources.map((source) => source.id), // shouldn't be needed
    ...(user?.subscribed_content_sources?.map((s) => s.source_id) ?? []), // shouldn't be needed
    ...(source.required_content_sources ?? []),
    source.id,
  ]);
}
