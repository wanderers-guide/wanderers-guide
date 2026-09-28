import { fetchContentSources, getDefaultSources, getDefaultSourcesKey } from './content-store';
import { makeRequest } from '@requests/request-manager';
import { Hazard, HazardSchema, SourceValue } from '@schemas/content';
import { z } from 'zod';

/** Resolve the same enabled INFO and PAGE sources used by the ordinary content reader. */
async function resolveHazardSources(sources?: SourceValue): Promise<number[]> {
  if (Array.isArray(sources)) return [...new Set(sources)].sort((a, b) => a - b);

  const scopes = sources ? [sources] : [getDefaultSources('INFO'), getDefaultSources('PAGE')];
  const sourceLists = await Promise.all(scopes.map((scope) => fetchContentSources(scope)));
  return [...new Set(sourceLists.flat().map((source) => source.id))].sort((a, b) => a - b);
}

/** A source change must invalidate an open hazard drawer's cached lookup. */
export function getHazardQueryKey(id?: number, sourceId?: number) {
  return sourceId === undefined
    ? ['find-hazard', id, getDefaultSourcesKey('INFO'), getDefaultSourcesKey('PAGE')]
    : ['find-hazard', id, sourceId];
}

/** Read hazard rows through the creature endpoint without entering the creature cache. */
export async function fetchHazards(sources: SourceValue): Promise<Hazard[]> {
  const sourceIds = await resolveHazardSources(sources);
  if (sourceIds.length === 0) return [];
  const result = await makeRequest<unknown>('find-creature', { type: 'hazard', content_sources: sourceIds }, false, {
    throwOnFailure: true,
  });
  return z.array(HazardSchema).parse(result);
}

/** Read one hazard for the catalog drawer, preserving source visibility. */
export async function fetchHazardById(id: number, sources?: SourceValue): Promise<Hazard | null> {
  const sourceIds = await resolveHazardSources(sources);
  if (sourceIds.length === 0) return null;
  const result = await makeRequest<unknown>(
    'find-creature',
    { id, type: 'hazard', content_sources: sourceIds },
    false,
    { throwOnFailure: true }
  );
  return result ? HazardSchema.parse(result) : null;
}
