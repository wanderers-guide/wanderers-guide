// @ts-ignore
import { serve } from 'std/server';
import { connect, deleteData, getPublicUser } from '../_shared/helpers.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req: Request) => {
  return await connect(req, async (client, _body, token) => {
    const user = await getPublicUser(client, token);

    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    // Delete the user
    const adminClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const result = await deleteData(adminClient, 'public_user', user.id);
    const response = await adminClient.auth.admin.deleteUser(user.user_id);

    return {
      status: result === 'SUCCESS' && !response.error ? 'success' : 'error',
      message: response.error ? response.error.message : 'User deleted successfully',
      data: {
        userId: response.data.user?.id,
      },
    };
  });
});
