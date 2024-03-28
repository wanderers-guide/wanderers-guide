// @ts-ignore
import { serve } from 'std/server';
import { connect, getPublicUser } from '../_shared/helpers.ts';
import { removeFromGameMasterGroup } from '../_shared/patreon.ts';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { user_id } = body as {
      user_id: string;
    };

    const user = await getPublicUser(client);

    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    const result = await removeFromGameMasterGroup(user, user_id);
    if (result.status === 'SUCCESS') {
      return {
        status: 'success',
        data: 'Removed from group',
      };
    } else {
      return {
        status: 'error',
        message: 'Failed to remove from group',
      };
    }
  });
});
