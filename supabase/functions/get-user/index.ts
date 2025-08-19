// @ts-ignore
import { serve } from 'std/server';
import { connect, fetchData, getPublicUser } from '../_shared/helpers.ts';
import type { PublicUser } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body, token) => {
    let { id, _id } = body as {
      _id?: string;
      id?: string;
    };

    if (id || _id) {
      const results = await fetchData<PublicUser>(client, 'public_user', [
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

    return {
      status: 'success',
      data: user,
    };
  });
});
