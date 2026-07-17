// @ts-ignore
import { serve } from 'std/server';
import type { Campaign } from '../_shared/content';
import {
  connect,
  createServiceClient,
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

    // campaign.join_key is no longer SELECT-able by anon/authenticated (migration
    // 20260717000001), so any all-column read/insert-returning of campaign must use a
    // service-role client. Reads here are scoped to the caller's own user_id; the insert
    // below sets user_id to the caller, so neither widens access.
    const admin = createServiceClient();

    const isCreating = !id || id === -1;
    if (isCreating) {
      // Creating new campaign
      const campaigns = await fetchData<Campaign>(admin, 'campaign', [
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
    if (isCreating) {
      join_key =
        Math.random().toString(36).substring(2, 8) +
        '-' +
        Math.random().toString(36).substring(2, 8);
    }

    // Insert (new campaign) goes through the service-role client: insertData does a
    // returning select() that would now fail on the restricted join_key column, and the
    // row's user_id is the validated caller, so there is no IDOR. Update (existing id)
    // stays on the request-scoped client so the campaign UPDATE RLS policy (owner-only)
    // still guards it — that path returns only { status } (no select), so it is unaffected.
    const writeClient = isCreating ? admin : client;
    const { procedure, result } = await upsertData<Campaign>(writeClient, 'campaign', {
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
