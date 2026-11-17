// @ts-ignore
import { serve } from 'std/server';
import { connect, createServiceClient, fetchData, getPublicUser } from '../_shared/helpers.ts';
import { getPatreonConnectionStatus } from '../_shared/patreon-connection.ts';
import { applyCreatorMembership } from '../_shared/patreon-creator.ts';
import type { PublicUser } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body, token) => {
    let { id, _id } = body as {
      _id?: string;
      id?: string;
    };

    if (id || _id) {
      // Read another user's public profile with a service-role client: the secret columns
      // (api, patreon) are no longer SELECT-able by anon/authenticated over PostgREST (see
      // migration 20260717000000), so the request-scoped client's all-column select would
      // fail. We fetch the row and then explicitly blank every secret below before it ever
      // leaves the function — a viewer only receives display/profile fields.
      const results = await fetchData<PublicUser>(createServiceClient(), 'public_user', [
        { column: 'id', value: _id },
        { column: 'user_id', value: id },
      ]);

      if (results.length === 0) {
        return {
          status: 'error',
          message: 'User not found',
        };
      }

      const user = results[0];

      // Remove sensitive information

      user.api?.clients?.forEach((client) => {
        client.api_key = '<SECRET>';
      });

      if (user.patreon) {
        user.patreon.access_token = '<SECRET>';
        user.patreon.refresh_token = '<SECRET>';
        user.patreon.patreon_name = '<SECRET>';
        user.patreon.patreon_email = '<SECRET>';
        user.patreon.patreon_user_id = '<SECRET>';
        if (user.patreon.game_master) {
          user.patreon.game_master.access_code = '<SECRET>';
        }
      }

      return {
        status: 'success',
        data: results[0],
      };
    }

    const user = await getPublicUser(client, token);

    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    if (user.patreon) {
      const service = createServiceClient();
      try {
        user.patreon.connection_status = (await applyCreatorMembership(service, user))
          ? 'connected'
          : getPatreonConnectionStatus(user.patreon);
      } catch {
        user.patreon.connection_status = 'verification_unavailable';
      }
      const virtual = user.patreon.game_master?.virtual_tier;
      if (virtual) {
        const sponsors = await fetchData<PublicUser>(createServiceClient(), 'public_user', [
          { column: 'user_id', value: virtual.game_master_user_id },
        ]);
        const sponsor = sponsors[0];
        let status: NonNullable<PublicUser['patreon']>['connection_status'];
        try {
          status =
            sponsor && (await applyCreatorMembership(service, sponsor))
              ? 'connected'
              : getPatreonConnectionStatus(sponsor?.patreon);
        } catch {
          status = 'verification_unavailable';
        }
        virtual.access_status =
          ['connected', 'migration_required'].includes(status) && sponsor?.patreon?.tier !== 'GAME-MASTER'
            ? 'not_connected'
            : status;
      }
    }
    return {
      status: 'success',
      data: user,
    };
  });
});
