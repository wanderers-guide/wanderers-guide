import {
  assertContentReadScope,
  captureContentReadScope,
  defineDefaultSources,
  fetchContentPackage,
  fetchContentSources,
} from '@content/content-store';
import { makeRequest } from '@requests/request-manager';
import { Character, ContentPackage } from '@schemas/content';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useQuietRetry } from './use-quiet-retry';

type ContentScope = {
  characterId: string | number;
  actorId: string | null;
  authPending?: boolean;
  enabled?: boolean;
  sources?: number[];
  context: 'sheet' | 'builder';
};

/** Keep the last complete library visible for this character/account during quiet recovery. */
export function useCharacterContent({
  characterId,
  actorId,
  authPending = false,
  enabled = true,
  sources,
  context,
}: ContentScope): ContentPackage | undefined {
  const identity = JSON.stringify([context, String(characterId), actorId]);
  const [ready, setReady] = useState<{ identity: string; content: ContentPackage }>();
  const { data, isError, isFetching, refetch } = useQuery({
    queryKey:
      context === 'sheet'
        ? [`find-content-${characterId}`, { actor: actorId, authPending, sources: sources ?? null }]
        : [
            `find-content-${characterId}-for-char-builder-creation`,
            { characterId, actor: actorId, authPending, sources: sources ?? null },
          ],
    queryFn: async () => {
      const readScope = captureContentReadScope(actorId);
      const character = await makeRequest<Character>('find-character', { id: characterId }, false, {
        throwOnFailure: true,
        ...(actorId ? { expectedActorId: actorId } : { anonymous: true }),
      });
      assertContentReadScope(readScope);
      // An anonymous miss cannot deny access while the saved account is unresolved.
      if (!character && authPending) throw new Error('Waiting for the saved session before loading this character.');
      const requested = defineDefaultSources('PAGE', sources ?? character?.content_sources?.enabled ?? []);
      await fetchContentSources(requested, false, readScope);
      return fetchContentPackage(requested, { fetchSources: true, fetchCreatures: context === 'sheet', readScope });
    },
    retry: 1,
    enabled,
    retryDelay: 2000,
    refetchOnWindowFocus: false,
  });
  useQuietRetry(enabled && isError && !isFetching, refetch);
  useEffect(() => {
    if (data) setReady({ identity, content: data });
  }, [data, identity]);
  // The old package is display-only after a source change: useCharacter pauses
  // calculations and derived saves until a complete matching package arrives.
  return data ?? (ready?.identity === identity ? ready.content : undefined);
}
