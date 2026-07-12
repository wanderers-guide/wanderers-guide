// @ts-ignore
import { serve } from 'std/server';
import {
  connect,
  convertContentTypeToTableName,
  deleteData,
  fetchData,
  handleAssociatedTrait,
  insertData,
  updateData,
} from '../_shared/helpers.ts';
import type { ContentUpdate, PublicUser } from '../_shared/content';
import { populateCollection } from '../_shared/vector-db.ts';
import { createClient } from '@supabase/supabase-js';

const CONTENT_TIER_ACCESS_THRESHOLD = 100;

serve(async (req: Request) => {
  return await connect(
    req,
    async (client, body, token) => {
      let { discord_msg_id, discord_user_id, discord_user_name, state } = body as {
        discord_msg_id: string;
        discord_user_id: string;
        discord_user_name: string;
        state: 'APPROVE' | 'REJECT' | 'UPVOTE' | 'DOWNVOTE';
      };

      // @ts-ignore
      if (token !== Deno.env.get('CONTENT_UPDATE_KEY')) {
        return {
          status: 'fail',
          data: { message: 'Invalid auth token' },
        };
      }

      // This is a validated service-to-service webhook (bypassAuth). Its writes are admin
      // operations that must bypass RLS: content_update and the content tables have write
      // policies scoped TO authenticated, but the connect() client here is anon — so
      // RLS-scoped writes would match 0 rows and (because updateData treats a 0-row write as
      // SUCCESS) silently no-op while reporting success. That is how "approved but didn't
      // apply" could recur even after the apply-then-approve reorder. Use a service-role
      // client for the actual reads/writes.
      // @ts-ignore
      client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

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
        const updateRes = await updateData(client, 'content_update', update.id, {
          status: {
            state: 'APPROVED',
            discord_user_id: discord_user_id,
            discord_user_name: discord_user_name,
          },
        });
        result = updateRes.status;

        // If the update was approved, apply the changes
        const tableName = convertContentTypeToTableName(update.type);
        if (!tableName)
          return {
            status: 'error',
            message: 'Invalid content type',
          };

        // If they've reached the threshold, update their tier
        const contentUpdates: ContentUpdate[] = await fetchData<ContentUpdate>(
          client,
          'content_update',
          [{ column: 'user_id', value: update.user_id }]
        );
        const approvedContent = contentUpdates.filter(
          (update) => update.status.state === 'APPROVED'
        );
        if (approvedContent.length >= CONTENT_TIER_ACCESS_THRESHOLD) {
          // Update the user's tier
          const results = await fetchData<PublicUser>(client, 'public_user', [
            { column: 'user_id', value: update.user_id },
          ]);
          if (results && results.length > 0 && !results[0].is_community_paragon) {
            await updateData(client, 'public_user', results[0].id, {
              is_community_paragon: true,
            });
          }
        }

        let content_id = update.ref_id;
        if (update.action === 'UPDATE' && update.ref_id) {
          if (update.data.trait_id) {
            // Update the associated trait's name & description
            const trait_id = await handleAssociatedTrait(
              client,
              update.ref_id,
              update.type,
              update.data.name,
              update.content_source_id
            );
            console.log('updated -> trait_id', trait_id);
          }

          const updateRes = await updateData(client, tableName, update.ref_id, update.data);
          result = updateRes.status;
        } else if (update.action === 'CREATE') {
          let trait_id = null;
          if (update.data.trait_id) {
            // Create the associated trait
            trait_id = await handleAssociatedTrait(
              client,
              undefined,
              update.type,
              update.data.name,
              update.content_source_id
            );
            console.log('created -> trait_id', trait_id);
          }

          const newData = await insertData(
            client,
            tableName,
            {
              ...update.data,
              trait_id: trait_id ? trait_id : undefined,
              content_source_id: update.content_source_id,
            },
            update.data?.type
          );
          result = newData ? 'SUCCESS' : 'ERROR_UNKNOWN';
          console.log('created -> content_id', newData?.id);
          content_id = newData?.id;
        } else if (update.action === 'DELETE' && update.ref_id) {
          result = await deleteData(client, tableName, update.ref_id);
        } else {
          return {
            status: 'error',
            message: 'Invalid update action',
          };
        }

        // Generate embeddings for the updated content
        console.log('content_id', content_id, 'result', result);
        if (result === 'SUCCESS' && content_id) {
          await populateCollection(client, 'name', update.type, [content_id]);
        }
      } else if (state === 'REJECT') {
        const updateRes = await updateData(client, 'content_update', update.id, {
          status: {
            state: 'REJECTED',
            discord_user_id: discord_user_id,
            discord_user_name: discord_user_name,
          },
        });
        result = updateRes.status;
      } else if (state === 'UPVOTE') {
        // Remove all upvotes and downvotes from the user
        update.upvotes = update.upvotes.filter((u) => u.discord_user_id !== discord_user_id);
        update.downvotes = update.downvotes.filter((u) => u.discord_user_id !== discord_user_id);

        // Add the upvote
        update.upvotes = [...update.upvotes, { discord_user_id }];

        const updateRes = await updateData(client, 'content_update', update.id, {
          upvotes: update.upvotes,
          downvotes: update.downvotes,
        });
        result = updateRes.status;
      } else if (state === 'DOWNVOTE') {
        // Remove all upvotes and downvotes from the user
        update.upvotes = update.upvotes.filter((u) => u.discord_user_id !== discord_user_id);
        update.downvotes = update.downvotes.filter((u) => u.discord_user_id !== discord_user_id);

        // Add the downvote
        update.downvotes = [...update.downvotes, { discord_user_id }];

        const updateRes = await updateData(client, 'content_update', update.id, {
          upvotes: update.upvotes,
          downvotes: update.downvotes,
        });
        result = updateRes.status;
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
    },
    { bypassAuth: true }
  );
});
