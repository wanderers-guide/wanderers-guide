// @ts-ignore
import { serve } from 'std/server';
import { connect, getPublicUser, updateData } from '../_shared/helpers.ts';
import type { PublicUser } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body, token) => {
    let {
      display_name,
      summary,
      image_url,
      background_image_url,
      organized_play_id,
      site_theme,
      subscribed_content_sources,
      api,
    } = body as PublicUser;

    const user = await getPublicUser(client, token);

    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    const { status } = await updateData(client, 'public_user', user.id, {
      display_name,
      summary,
      image_url,
      background_image_url,
      organized_play_id,
      site_theme,
      subscribed_content_sources,
      api,
    });

    if (status === 'SUCCESS') {
      return {
        status: 'success',
        data: true,
      };
    } else {
      return {
        status: 'error',
        message: status,
      };
    }
  });
});
