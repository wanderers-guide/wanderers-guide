// @ts-ignore
import { serve } from 'std/server';
import type { Encounter } from '../_shared/content';
import { connect, getPublicUser, upsertData, upsertResponseWrapper } from '../_shared/helpers.ts';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, name, icon, color, combatants, meta_data, campaign_id } = body as Encounter;

    const user = await getPublicUser(client);
    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    const { procedure, result } = await upsertData<Encounter>(client, 'encounter', {
      id,
      user_id: user.user_id,
      name,
      icon,
      color,
      combatants,
      campaign_id,
      meta_data,
    });

    return upsertResponseWrapper(procedure, result);
  });
});
