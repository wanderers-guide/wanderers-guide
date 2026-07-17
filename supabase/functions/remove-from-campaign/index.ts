// @ts-ignore
import { serve } from 'std/server';
import type { Campaign, Character } from '../_shared/content';
import {
  connect,
  createServiceClient,
  fetchData,
  getPublicUser,
  updateData,
} from '../_shared/helpers.ts';

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

    // Service-role client: campaign's all-column select now fails on the restricted
    // join_key column (migration 20260717000001), and the character update below already
    // needs elevated access (see note). The read is scoped to the caller's own user_id,
    // so it does not widen access.
    const unrestrictedClient = createServiceClient();

    const campaigns = await fetchData<Campaign>(unrestrictedClient, 'campaign', [
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

    // Remove the campaign_id with the service-role client created above (row security would
    // otherwise prevent a player from detaching their own character from a campaign they
    // don't own). Ownership of the campaign was verified by the user_id-scoped read above.
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
