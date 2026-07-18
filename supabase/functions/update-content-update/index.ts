// @ts-ignore
import { serve } from 'std/server';
import {
  connect,
  convertContentTypeToTableName,
  deleteData,
  fetchData,
  handleAssociatedTrait,
  insertData,
  logEvent,
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
      let { auth_token, discord_msg_id, discord_user_id, discord_user_name, state } = body as {
        auth_token?: string;
        discord_msg_id: string;
        discord_user_id: string;
        discord_user_name: string;
        state: 'APPROVE' | 'REJECT' | 'UPVOTE' | 'DOWNVOTE';
      };

      // Accept the shared key from the Authorization header OR the legacy `auth_token`
      // body field. The deployed content-updates bot sends it in the body; when the
      // header-only check shipped (May 2026 change, deployed 2026-07-12) every bot call
      // was rejected as "Invalid auth token" and all approvals/votes silently or loudly
      // failed. Keep both until every caller sends the header, then drop the body path.
      // @ts-ignore
      const expectedKey = Deno.env.get('CONTENT_UPDATE_KEY');
      if (!expectedKey || (token !== expectedKey && auth_token !== expectedKey)) {
        // Log which transports were present (never the values) — this exact failure
        // mode was invisible for two days because rejected calls left no log line.
        logEvent('warn', 'update-content-update', 'auth_rejected', {
          keyConfigured: !!expectedKey,
          hadHeaderToken: !!token,
          hadBodyToken: !!auth_token,
          state,
        });
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
        logEvent('warn', 'update-content-update', 'update_not_found', { discord_msg_id, state });
        return {
          status: 'error',
          message: 'Content update not found',
        };
      }

      let result: 'SUCCESS' | 'ERROR_DUPLICATE' | 'ERROR_UNKNOWN' = 'ERROR_UNKNOWN';
      if (state === 'APPROVE') {
        // Apply the content change FIRST, and only mark the request APPROVED if it
        // actually succeeds. Previously the status was flipped to APPROVED up front and
        // the content write ran afterward with no rollback — so any failure (or a missing
        // ref_id) left the request permanently "approved" on the site while the content
        // never changed, and the error was swallowed by the Discord bot (the reported
        // "shows approved but didn't apply" bug).
        const tableName = convertContentTypeToTableName(update.type);
        if (!tableName)
          return {
            status: 'error',
            message: 'Invalid content type',
          };

        // Idempotency claim. The Discord bot can fire the same approval more than once
        // (duplicate reaction events, or multiple bot instances) — we've observed a single
        // approval invoking this function 3x in the same second. Without a guard each
        // invocation applied the change independently: one insert won and the others hit
        // the unique constraint and failed, so the bot surfaced a false "didn't apply"
        // even though the record WAS created. Atomically transition the request to
        // APPROVED, but only if it isn't already. Postgres serializes concurrent updates
        // on the row, so exactly one invocation matches the `!= APPROVED` filter and wins
        // the claim; the rest match zero rows and no-op as success below.
        const { data: claimed } = await client
          .from('content_update')
          .update({
            status: { state: 'APPROVED', discord_user_id, discord_user_name },
          })
          .eq('id', update.id)
          .neq('status->>state', 'APPROVED')
          .select('id');

        if (!claimed || claimed.length === 0) {
          // Already approved by a concurrent or earlier invocation — nothing to do.
          logEvent('info', 'update-content-update', 'approve_deduped', { updateId: update.id });
          return { status: 'success', data: true };
        }

        // We own the claim. Apply the content change below; if it fails we revert the
        // claim so the request is not left falsely APPROVED and can be retried.
        const revertClaim = async () => {
          await updateData(client, 'content_update', update.id, { status: { state: 'PENDING' } });
        };

        // Apply the content change. Wrapped in try/catch because the data helpers THROW on
        // DB errors (e.g. updateData throws on a constraint violation) rather than returning
        // a status — without catching, the throw would skip the revert below and leave the
        // request falsely APPROVED (the very bug the claim/revert exists to prevent).
        let content_id = update.ref_id;
        try {
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
            // Invalid action — release the claim so the request returns to PENDING.
            await revertClaim();
            return {
              status: 'error',
              message: 'Invalid update action',
            };
          }
        } catch (applyError) {
          // The apply threw (e.g. a constraint violation). Release the claim so the
          // request returns to PENDING (not falsely APPROVED) and can be retried.
          await revertClaim();
          logEvent('error', 'update-content-update', 'apply_threw', {
            updateId: update.id,
            contentType: update.type,
            action: update.action,
            message: (applyError as { message?: string })?.message ?? `${applyError}`,
          });
          return { status: 'error', message: 'ERROR_UNKNOWN' };
        }

        console.log('content_id', content_id, 'result', result);

        // The request was already marked APPROVED by the claim above. If the content write
        // actually succeeded, refresh the contributor's tier and (re)generate embeddings.
        // If it failed, revert the claim to PENDING (so it is not shown as applied and can
        // be retried) and fall through to the error response below.
        if (result === 'SUCCESS') {
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

          // Generate embeddings for the updated content
          if (content_id) {
            await populateCollection(client, 'name', update.type, [content_id]);
          }
        } else {
          // The content write failed after we claimed the request — revert it to PENDING
          // so it is not left falsely APPROVED and can be retried. Falls through to the
          // error response below (result !== 'SUCCESS').
          await revertClaim();
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
        // The state change did NOT apply (the request stays un-approved / un-voted).
        logEvent('error', 'update-content-update', 'apply_failed', {
          updateId: update.id,
          contentType: update.type,
          action: update.action,
          state,
          result,
        });
        return {
          status: 'error',
          message: result,
        };
      }
    },
    { bypassAuth: true }
  );
});
