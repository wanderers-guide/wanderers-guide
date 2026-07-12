// @ts-ignore
import { serve } from 'std/server';
import type { Character } from '../_shared/content';
import { connect, fetchData } from '../_shared/helpers.ts';

serve(async (req: Request) => {
  return await connect<{
    id?: number | number[];
    user_id?: string;
    campaign_id?: number;
  }>(
    req,
    async (client, body) => {
      let { id, user_id, campaign_id } = body;

      // Campaign visibility is enforced by RLS: the character SELECT policy already lets a
      // campaign's GM (campaign.user_id = auth.uid()) see every character in it. We deliberately
      // do NOT escalate to a service-role fetch of the whole campaign here. The previous
      // `results.length > 0` gate was an IDOR — any authenticated user could set their own
      // character's campaign_id to a victim campaign (self-update is allowed by the UPDATE
      // policy) and then read every character in it. Letting non-GM players see each other
      // needs a real membership model; until then we return only RLS-scoped results.
      const results = await fetchData<Character>(client, 'character', [
        { column: 'id', value: id },
        { column: 'user_id', value: user_id },
        { column: 'campaign_id', value: campaign_id },
      ]);

      if (id && !Array.isArray(id)) {
        return {
          status: 'success',
          data: results[0],
        };
      }

      return {
        status: 'success',
        data: results.sort((a, b) => a.id - b.id),
      };
    },
    { supportsCharacterAPI: true }
  );
});
