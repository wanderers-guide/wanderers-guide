// @ts-ignore
import { serve } from 'std/server';
import { connect, getPublicUser } from '../_shared/helpers.ts';
import { regenerateGameMasterAccessCode } from '../_shared/patreon.ts';

serve(async (req: Request) => {
  return await connect(req, async (client, _body, token) => {
    const user = await getPublicUser(client, token);

    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    const result = await regenerateGameMasterAccessCode(client, user);
    if (result.status === 'SUCCESS') {
      return {
        status: 'success',
        data: 'Code regenerated',
      };
    } else {
      return {
        status: 'error',
        message: 'Failed to regenerate code',
      };
    }
  });
});
