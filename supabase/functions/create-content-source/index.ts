// @ts-ignore
import { serve } from 'std/server';
import { connect, getPublicUser, upsertData, upsertResponseWrapper } from '../_shared/helpers.ts';
import type { ContentSource } from '../_shared/content';
import { hasPatreonAccess } from '../_shared/patreon.ts';

serve(async (req: Request) => {
  return await connect(req, async (client, body, token) => {
    let {
      id,
      name,
      foundry_id,
      url,
      description,
      operations,
      contact_info,
      artwork_url,
      require_key,
      keys,
      is_published,
      required_content_sources,
    } = body as ContentSource;

    let user_id: string | undefined = undefined;
    if (!id || id === -1) {
      const user = await getPublicUser(client, token);
      if (!user) {
        return {
          status: 'error',
          message: 'User not found',
        };
      }
      user_id = user.user_id;

      // Check if user has access
      const access = await hasPatreonAccess(user, 2);
      if (!access) {
        return {
          status: 'error',
          message: 'User does not have access',
        };
      }
    }

    const { procedure, result } = await upsertData<ContentSource>(client, 'content_source', {
      id,
      name,
      foundry_id,
      url,
      description,
      operations,
      user_id,
      contact_info,
      require_key,
      keys,
      artwork_url,
      is_published,
      required_content_sources,
    });

    return upsertResponseWrapper(procedure, result);
  });
});
