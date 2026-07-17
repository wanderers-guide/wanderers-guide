// @ts-ignore
import { serve } from 'std/server';
import { connect, createServiceClient, getPublicUser } from '../_shared/helpers.ts';
import { handlePatreonRedirect } from '../_shared/patreon.ts';

serve(async (req: Request) => {
  return await connect(req, async (client, body, token) => {
    let { code, redirectOrigin } = body as {
      code: string;
      redirectOrigin: string;
    };

    const user = await getPublicUser(client, token);

    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    try {
      // The Patreon flow reads and writes patreon token data, including cross-user GM
      // group lookups (public_user.patreon), which anon/authenticated can no longer SELECT
      // (migration 20260717000000). Run it with a service-role client. This preserves
      // prior behavior: every write already targets an explicit, validated user id
      // (the caller above, or a resolved GM relationship) — no new access is introduced.
      const result = await handlePatreonRedirect(
        createServiceClient(),
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
