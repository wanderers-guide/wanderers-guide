// @ts-ignore
import { serve } from 'std/server';
import type { Campaign } from '../_shared/content';
import { connect, getPublicUser, upsertData, upsertResponseWrapper } from '../_shared/helpers.ts';

interface ResetCampaignKeyBody {
  id: number;
}

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    const { id } = body as ResetCampaignKeyBody;

    const user = await getPublicUser(client);
    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    if (!id || id === -1) {
      return {
        status: 'error',
        message: 'User does not have access',
      };
    }

    const payload = {
      id,
      join_key:
        Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8),
    };
    const { procedure, result } = await upsertData<Campaign>(client, 'campaign', payload);

    return upsertResponseWrapper(procedure, result);
  });
});
