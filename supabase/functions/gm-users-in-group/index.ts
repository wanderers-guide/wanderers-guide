// @ts-ignore
import { serve } from 'std/server';
import { connect, getPublicUser } from '../_shared/helpers.ts';
import { getAllUsersInGameMasterGroup } from '../_shared/patreon.ts';

serve(async (req: Request) => {
  return await connect(req, async (client, _body, token) => {
    const user = await getPublicUser(client, token);

    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    const result = await getAllUsersInGameMasterGroup(user);
    return {
      status: 'success',
      data: result,
    };
  });
});
