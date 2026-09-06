// @ts-ignore
import { serve } from 'std/server';
import {
  connect,
  createServiceClient,
  fetchData,
  getPublicUser,
  updateData,
  upsertResponseWrapper,
} from '../_shared/helpers.ts';
import type { ContentSource, ContentUpdate, PublicUser } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body, token) => {
    let { type, ref_id, action, data, content_source_id } = body as ContentUpdate;

    const user = await getPublicUser(client, token, { rejectAnonymous: true });
    if (!user || user.deactivated) {
      return { status: 'fail', data: { message: 'Account is unavailable' } };
    }

    // Authenticate first; only the server sets ownership, moderation state and votes.
    const service = createServiceClient();
    // Create the content_update record
    // A proposal is not applied game content: do not update the source's counters or version.
    const { data: result, error } = await service.from('content_update').insert({
      user_id: user.user_id,
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
    }).select().single();
    if (error) throw error;

    if (result) {
      // Get content source name
      const sources = await fetchData<ContentSource>(client, 'content_source', [
        { column: 'id', value: result.content_source_id },
      ]);
      const sourceName = sources.find((s) => s.id === result.content_source_id)?.name ?? 'Unknown';

      // Get user name — read via service role: public_user's all-column select is no
      // longer permitted for anon/authenticated on the restricted api/patreon columns
      // (migration 20260717000000). We only use display_name (result.user_id is the
      // submitting caller).
      const users = await fetchData<PublicUser>(createServiceClient(), 'public_user', [
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
          const { status: updateStatus } = await updateData(service, 'content_update', result.id, {
            discord_msg_id: messageId,
          });

          if (updateStatus !== 'SUCCESS') {
            return {
              status: 'error',
              message: `Failed to update content_update with discord_msg_id: ${messageId}`,
            };
          }

          return upsertResponseWrapper('insert', {
            ...result,
            discord_msg_id: messageId,
          });
        }
      } catch (e) {}
    }
    return {
      status: 'error',
      message: 'Failed to insert data',
    };
  });
});
