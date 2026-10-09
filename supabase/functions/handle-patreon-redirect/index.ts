// @ts-ignore
import { serve } from 'std/server';
import { z } from 'https://esm.sh/zod@3.24.2';
import { connect, createServiceClient, getPublicUser, logEvent } from '../_shared/helpers.ts';
import { handlePatreonRedirect } from '../_shared/patreon.ts';
import { PatreonApiError } from '../_shared/patreon-api.ts';

const input = z.object({
  code: z.string().trim().min(1).max(2048),
  redirectOrigin: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        url.origin === value &&
        (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
      );
    }),
});

serve(async (req: Request) => {
  return await connect(req, async (client, body, token) => {
    const user = await getPublicUser(client, token, { rejectAnonymous: true });

    if (!user || user.deactivated) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    const parsed = input.safeParse(body);
    if (!parsed.success) return { status: 'fail', data: { message: 'Invalid Patreon callback.' } };
    const { code, redirectOrigin } = parsed.data;

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
      if (!result) throw new Error('Patreon account write failed');
      return {
        status: 'success',
        data: 'Patreon connected',
      };
    } catch (error) {
      logEvent('error', 'handle-patreon-redirect', 'patreon_link_failed', {
        stage: error instanceof PatreonApiError ? error.stage : 'persistence',
        status: error instanceof PatreonApiError ? error.status : undefined,
      });
      return {
        status: 'error',
        message: 'Patreon connection could not be completed.',
      };
    }
  });
});
