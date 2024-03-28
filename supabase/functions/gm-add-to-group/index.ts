// @ts-ignore
import { serve } from 'std/server';
import { connect, getPublicUser } from '../_shared/helpers.ts';
import { addToGameMasterGroup } from '../_shared/patreon.ts';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { gm_user_id, access_code } = body as {
      gm_user_id: string;
      access_code: string;
    };

    const user = await getPublicUser(client);

    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    const result = await addToGameMasterGroup(client, user, gm_user_id, access_code);
    if (result.status === 'SUCCESS') {
      return {
        status: 'success',
        data: 'Added to group',
      };
    } else {
      return {
        status: 'error',
        message: 'Failed to add to group',
      };
    }
  });
});
