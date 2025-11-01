// @ts-ignore
import { serve } from 'std/server';
import type { Campaign } from '../_shared/content';
import {
  connect,
  fetchData,
  getPublicUser,
  upsertData,
  upsertResponseWrapper,
} from '../_shared/helpers.ts';

interface ResetCampaignKeyBody {
  id: number;
}

serve(async (req: Request) => {
  return await connect(req, async (client, body, token) => {
    const { id } = body as ResetCampaignKeyBody;

    const user = await getPublicUser(client, token);
    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    const campaigns = await fetchData<Campaign>(client, 'campaign', [{ column: 'id', value: id }]);
    if (!campaigns || campaigns.length === 0) {
      return {
        status: 'error',
        message: 'Campaign not found',
      };
    }

    if (campaigns.length > 0 && campaigns[0].user_id !== user.user_id) {
      return {
        status: 'error',
        message: 'User does not have access',
      };
    }

    const payload = {
      id,
      join_key:
        Math.random().toString(36).substring(2, 8) +
        '-' +
        Math.random().toString(36).substring(2, 8),
    };
    const { procedure, result } = await upsertData<Campaign>(client, 'campaign', payload);

    return upsertResponseWrapper(procedure, result);
  });
});
