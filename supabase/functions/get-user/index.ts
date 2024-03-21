// @ts-ignore
import { serve } from 'std/server';
import { connect, fetchData, getPublicUser } from '../_shared/helpers.ts';
import type { PublicUser } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id } = body as {
      id?: string;
    };

    if (id) {
      const results = await fetchData<PublicUser>(client, 'public_user', [
        { column: 'user_id', value: id },
      ]);

      if (results.length === 0) {
        return {
          status: 'error',
          message: 'User not found',
        };
      }

      return {
        status: 'success',
        data: results[0],
      };
    }

    const user = await getPublicUser(client);

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
