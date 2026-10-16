import { fetchContentSources, getDefaultSources, getDefaultSourcesKey } from './content-store';
import { makeRequest } from '@requests/request-manager';
import { StarshipSchema, type Starship } from '@schemas/content';

/** Scope starship references like hazard references, without putting them in the creature cache. */
export function getStarshipQueryKey(id?: number, sourceId?: number) {
  return ['find-starship', id, sourceId, getDefaultSourcesKey('INFO'), getDefaultSourcesKey('PAGE')];
}

/** Read a catalog ship; this path never creates an actor or runs character operations. */
export async function fetchStarshipById(id: number, sourceId?: number): Promise<Starship | null> {
  const scopes = sourceId === undefined ? [getDefaultSources('INFO'), getDefaultSources('PAGE')] : [[sourceId]];
  const sources = await Promise.all(scopes.map((scope) => fetchContentSources(scope)));
  const ids = [...new Set(sources.flat().map((source) => source.id))];
  if (!ids.length) return null;
  const row = await makeRequest<unknown>('find-creature', { id, type: 'starship', content_sources: ids }, false, {
    throwOnFailure: true,
  });
  return row ? StarshipSchema.parse(row) : null;
}
