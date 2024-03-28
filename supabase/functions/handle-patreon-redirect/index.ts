// @ts-ignore
import { serve } from 'std/server';
import { connect, getPublicUser } from '../_shared/helpers.ts';
import { handlePatreonRedirect } from '../_shared/patreon.ts';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { code, redirectOrigin } = body as {
      code: string;
      redirectOrigin: string;
    };

    const user = await getPublicUser(client);

    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    try {
      const result = await handlePatreonRedirect(
        client,
        user,
        code,
        `${redirectOrigin}/auth/patreon/redirect`
      );
      return {
        status: 'success',
        data: result ? 'Patreon connected' : 'Failed to connect',
      };
    } catch (e) {
      return {
        status: 'error',
        message: `Error: ${JSON.stringify(e)}`,
      };
    }
  });
});
