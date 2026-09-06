import type { Character } from '@schemas/content';
import { makeRequest } from '@requests/request-manager';
import { queryOptions } from '@tanstack/react-query';
import { EncounterCharacterSchema } from './encounter-character-schema';

/** Share campaign reads across the overview/drawer without clearing good data on an outage. */
export function campaignCharactersQuery(campaignId: number, actorId?: string) {
  return queryOptions({
    queryKey: ['find-campaign-characters', { campaign_id: campaignId, actor: actorId ?? null }],
    queryFn: async (): Promise<Character[]> => {
      const characters = await makeRequest<Character[]>('find-character', { campaign_id: campaignId }, false, {
        throwOnFailure: true,
        ...(actorId ? { expectedActorId: actorId } : {}),
      });
      if (!EncounterCharacterSchema.array().safeParse(characters).success || !characters)
        throw new Error('Campaign characters returned an invalid response');
      // Validate without stripping extension fields in nested character JSON columns.
      return characters;
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    // makeRequest already retries a transient read once; the interval is the next attempt.
    retry: false,
  });
}
