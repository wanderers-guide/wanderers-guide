// @ts-ignore
import { serve } from 'std/server';
import { connect, insertData, upsertResponseWrapper } from '../_shared/helpers.ts';
import type { ContentUpdate } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { type, ref_id, action, data, content_source_id } = body as ContentUpdate;

    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user)
      return {
        status: 'error',
        message: 'Invalid user',
      };

    const result = await insertData<ContentUpdate>(
      client,
      'content_update',
      {
        user_id: user.id,
        type: type,
        ref_id: ref_id,
        action: action,
        data: data,
        content_source_id: content_source_id,
      },
      undefined,
      false
    );

    return upsertResponseWrapper('insert', result);
  });
});
