// @ts-ignore
import { serve } from 'std/server';
import {
  connect,
  convertContentTypeToTableName,
  deleteData,
  fetchData,
  insertData,
  updateData,
} from '../_shared/helpers.ts';
import type { ContentUpdate } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { auth_token, discord_msg_id, discord_user_id, discord_user_name, state } = body as {
      auth_token: string; // TODO: Should be in a header
      discord_msg_id: string;
      discord_user_id: string;
      discord_user_name: string;
      state: 'APPROVE' | 'REJECT' | 'UPVOTE' | 'DOWNVOTE';
    };

    // @ts-ignore
    if (auth_token !== Deno.env.get('CONTENT_UPDATE_KEY')) {
      return {
        status: 'error',
        message: 'Invalid auth token',
      };
    }

    let results: ContentUpdate[] = await fetchData<ContentUpdate>(client, 'content_update', [
      { column: 'discord_msg_id', value: discord_msg_id },
    ]);
    const update = results.length > 0 ? results[0] : null;

    if (!update) {
      return {
        status: 'error',
        message: 'Content update not found',
      };
    }

    let result: 'SUCCESS' | 'ERROR_DUPLICATE' | 'ERROR_UNKNOWN' = 'ERROR_UNKNOWN';
    if (state === 'APPROVE') {
      result = await updateData(client, 'content_update', update.id, {
        status: {
          state: 'APPROVED',
          discord_user_id: discord_user_id,
          discord_user_name: discord_user_name,
        },
      });

      // If the update was approved, apply the changes
      const tableName = convertContentTypeToTableName(update.type);
      if (!tableName)
        return {
          status: 'error',
          message: 'Invalid content type',
        };

      if (update.action === 'UPDATE' && update.ref_id) {
        result = await updateData(client, tableName, update.ref_id, update.data);
      } else if (update.action === 'CREATE') {
        const newData = await insertData(
          client,
          tableName,
          {
            ...update.data,
            content_source_id: update.content_source_id,
          },
          update.data?.type
        );
        result = newData ? 'SUCCESS' : 'ERROR_UNKNOWN';
      } else if (update.action === 'DELETE' && update.ref_id) {
        result = await deleteData(client, tableName, update.ref_id);
      } else {
        return {
          status: 'error',
          message: 'Invalid update action',
        };
      }
    } else if (state === 'REJECT') {
      result = await updateData(client, 'content_update', update.id, {
        status: {
          state: 'REJECTED',
          discord_user_id: discord_user_id,
          discord_user_name: discord_user_name,
        },
      });
    } else if (state === 'UPVOTE') {
      // Remove all upvotes and downvotes from the user
      update.upvotes = update.upvotes.filter((u) => u.discord_user_id !== discord_user_id);
      update.downvotes = update.downvotes.filter((u) => u.discord_user_id !== discord_user_id);

      // Add the upvote
      update.upvotes = [...update.upvotes, { discord_user_id }];

      result = await updateData(client, 'content_update', update.id, {
        upvotes: update.upvotes,
        downvotes: update.downvotes,
      });
    } else if (state === 'DOWNVOTE') {
      // Remove all upvotes and downvotes from the user
      update.upvotes = update.upvotes.filter((u) => u.discord_user_id !== discord_user_id);
      update.downvotes = update.downvotes.filter((u) => u.discord_user_id !== discord_user_id);

      // Add the downvote
      update.downvotes = [...update.downvotes, { discord_user_id }];

      result = await updateData(client, 'content_update', update.id, {
        upvotes: update.upvotes,
        downvotes: update.downvotes,
      });
    }

    if (result === 'SUCCESS') {
      return {
        status: 'success',
        data: true,
      };
    } else {
      return {
        status: 'error',
        message: result,
      };
    }
  });
});
