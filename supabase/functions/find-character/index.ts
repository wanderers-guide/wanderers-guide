// @ts-ignore
import { serve } from 'std/server';
import type { Character } from '../_shared/content';
import { connect, fetchData } from '../_shared/helpers.ts';
import { createClient } from '@supabase/supabase-js';

interface FindCharacterBody {
  id?: number | number[];
  user_id?: string;
  campaign_id?: number;
}

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, user_id, campaign_id } = body as FindCharacterBody;

    let results = await fetchData<Character>(client, 'character', [
      { column: 'id', value: id },
      { column: 'user_id', value: user_id },
      { column: 'campaign_id', value: campaign_id },
    ]);

    // If we're using only campaign_id and we found at least one character, then return all campaign's characters
    // This is so a member of the campaign can see all other player characters
    if (!id && !user_id && campaign_id && results.length > 0) {
      // Use unrestricted client access because we need to fetch all campaign characters
      const unrestrictedClient = createClient(
        // @ts-ignore
        Deno.env.get('SUPABASE_URL') ?? '',
        // @ts-ignore
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      results = await fetchData<Character>(unrestrictedClient, 'character', [
        { column: 'campaign_id', value: campaign_id },
      ]);
    }

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
  });
});
