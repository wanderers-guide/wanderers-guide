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
import { hasPatreonAccess } from '../_shared/patreon.ts';

const CAMPAIGN_SLOT_CAP = 1;

serve(async (req: Request) => {
  return await connect(req, async (client, body, token) => {
    let {
      id,
      name,
      description,
      notes,
      recommended_options,
      recommended_variants,
      recommended_content_sources,
      custom_operations,
      meta_data,
    } = body as Campaign;

    const user = await getPublicUser(client, token);
    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    if (!id || id === -1) {
      // Creating new campaign
      const campaigns = await fetchData<Campaign>(client, 'campaign', [
        { column: 'user_id', value: user.user_id },
      ]);
      if (campaigns.length >= CAMPAIGN_SLOT_CAP) {
        const access = await hasPatreonAccess(user, 2);
        if (!access) {
          return {
            status: 'error',
            message: 'User does not have access',
          };
        }
      }
    }

    // Generate join key for new campaigns
    let join_key: string | undefined = undefined;
    if (!id || id === -1) {
      join_key =
        Math.random().toString(36).substring(2, 8) +
        '-' +
        Math.random().toString(36).substring(2, 8);
    }

    const { procedure, result } = await upsertData<Campaign>(client, 'campaign', {
      id,
      user_id: user.user_id,
      name,
      description,
      notes,
      recommended_options,
      recommended_content_sources,
      recommended_variants,
      custom_operations,
      meta_data,
      join_key,
    });

    return upsertResponseWrapper(procedure, result);
  });
});
