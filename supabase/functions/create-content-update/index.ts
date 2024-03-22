// @ts-ignore
import { serve } from 'std/server';
import {
  connect,
  fetchData,
  insertData,
  updateData,
  upsertResponseWrapper,
} from '../_shared/helpers.ts';
import type { ContentSource, ContentUpdate, PublicUser } from '../_shared/content';

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

    // Create the content_update record
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
        status: {
          state: 'PENDING',
          discord_user_id: undefined,
          discord_user_name: undefined,
        },
        upvotes: [],
        downvotes: [],
      },
      undefined,
      false
    );

    if (result) {
      // Get content source name
      const sources = await fetchData<ContentSource>(client, 'content_source', [
        { column: 'id', value: result.content_source_id },
      ]);
      const sourceName = sources.length > 0 ? sources[0].name : 'Unknown';

      // Get user name
      const users = await fetchData<PublicUser>(client, 'public_user', [
        { column: 'user_id', value: result.user_id },
      ]);
      const userName = users.length > 0 ? users[0].display_name : 'Unknown';

      // Send Discord message
      const res = await fetch('https://content-updates-bot.onrender.com/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // @ts-ignore
          Authorization: `Bearer ${Deno.env.get('CONTENT_UPDATE_KEY')}`,
        },
        body: JSON.stringify({
          update: result,
          username: userName,
          source: sourceName,
        }),
      });

      try {
        const response = await res.json();
        const messageId = response?.message_id;

        if (messageId) {
          // Update the content_update with the Discord message_id
          const updateStatus = await updateData(client, 'content_update', result.id, {
            discord_msg_id: messageId,
          });

          if (updateStatus !== 'SUCCESS') {
            return {
              status: 'error',
              message: `Failed to update content_update with discord_msg_id: ${messageId}`,
            };
          }

          return upsertResponseWrapper('insert', result);
        }
      } catch (e) {}
    }
    return {
      status: 'error',
      message: 'Failed to insert data',
    };
  });
});
