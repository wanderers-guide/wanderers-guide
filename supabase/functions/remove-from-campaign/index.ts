// @ts-ignore
import { serve } from 'std/server';
import type { Campaign, Character } from '../_shared/content';
import { connect, fetchData, getPublicUser, updateData } from '../_shared/helpers.ts';
import { createClient } from '@supabase/supabase-js';

interface RemoveFromCampaignBody {
  character_id?: string;
  campaign_id?: string;
}

serve(async (req: Request) => {
  return await connect(req, async (client, body, token) => {
    const { character_id, campaign_id } = body as RemoveFromCampaignBody;

    const characters = await fetchData<Character>(client, 'character', [
      { column: 'id', value: character_id },
    ]);

    if (characters.length === 0) {
      return {
        status: 'error',
        message: 'Character not found',
      };
    }

    const user = await getPublicUser(client, token);
    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    const campaigns = await fetchData<Campaign>(client, 'campaign', [
      { column: 'id', value: campaign_id },
      { column: 'user_id', value: user.user_id },
    ]);

    if (campaigns.length === 0) {
      return {
        status: 'error',
        message: 'Campaign not found',
      };
    }

    const character = characters[0];
    const campaign = campaigns.find((c) => character.campaign_id && c.id === character.campaign_id);

    if (!campaign) {
      return {
        status: 'error',
        message: 'Character not in campaign',
      };
    }

    // Use unrestricted client access because we're only removing the campaign_id under certain conditions
    // Can't use normal client because row security will prevent the update
    const unrestrictedClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { status, data } = await updateData(
      unrestrictedClient,
      'character',
      character.id,
      {
        campaign_id: null,
      },
      true
    );

    if (status === 'SUCCESS') {
      return {
        status: 'success',
        data: data,
      };
    } else {
      return {
        status: 'error',
        message: status,
      };
    }
  });
});
