// @ts-ignore
import { serve } from 'std/server';
import {
  connect,
  createServiceClient,
  getPublicUser,
  updateData,
  upsertData,
  upsertResponseWrapper,
} from '../_shared/helpers.ts';

/**
 * Persists the raw Pathbuilder 2e share payload behind an import.
 *
 * Called twice per import: once with `id: -1` to record the payload before the
 * character is built (so a failed character creation still leaves provenance),
 * and once with the returned `id` to attach `character_id`.
 *
 * The row is owned by the caller; `user_id` is taken from the session token and
 * never from the body, so a client cannot write a snapshot onto another user.
 */
serve(async (req: Request) => {
  return await connect(req, async (client, body, token) => {
    const {
      id,
      character_id,
      build_id,
      source_url,
      format_version,
      character_data,
      custom_files,
      derived_data,
      unresolved,
    } = body as Record<string, any>;

    const user = await getPublicUser(client, token, { rejectAnonymous: true });
    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    const isCreate = id === undefined || id === null || id === -1;
    if (isCreate && (typeof build_id !== 'string' || !/^\d+$/.test(build_id.trim()))) {
      return {
        status: 'fail',
        data: { build_id: 'a numeric build_id is required when creating a row' },
      };
    }

    if (!isCreate && (!Number.isInteger(id) || id < 1)) {
      return {
        status: 'fail',
        data: { id: 'id must be a positive integer when updating a row' },
      };
    }

    if (character_id !== undefined && character_id !== null && (!Number.isInteger(character_id) || character_id < 1)) {
      return {
        status: 'fail',
        data: { character_id: 'character_id must be null or a positive integer' },
      };
    }

    // Strip undefined keys so the update path (attaching character_id) only
    // touches the columns the caller actually sent. `.update()` with an explicit
    // undefined would otherwise risk clobbering the stored payload.
    const payload: Record<string, any> = { id, user_id: user.user_id };
    for (const [key, value] of Object.entries({
      character_id,
      build_id: build_id === undefined ? undefined : String(build_id),
      source_url,
      format_version,
      character_data,
      custom_files,
      derived_data,
      unresolved,
    })) {
      if (value !== undefined) payload[key] = value;
    }

    // All writes use the service-role client after connect() has authenticated the caller.
    // Updates additionally guard on user_id in the same SQL UPDATE, preventing an IDOR
    // where an authenticated user supplies another user's snapshot id.
    const serviceClient = createServiceClient();

    if (!isCreate) {
      const { status } = await updateData(
        serviceClient,
        'pathbuilder_import',
        id as number,
        payload,
        false,
        { guard: { column: 'user_id', value: user.user_id } }
      );

      if (status === 'SUCCESS') {
        return { status: 'success', data: true };
      }

      if (status === 'CONFLICT') {
        return {
          status: 'fail',
          data: { id: 'Import snapshot not found or not owned by the current user' },
        };
      }

      if (status === 'ERROR_DUPLICATE') {
        return {
          status: 'fail',
          data: { id: 'A conflicting import snapshot already exists' },
        };
      }

      return {
        status: 'error',
        message: 'Failed to update import snapshot',
      };
    }

    const { procedure, result } = await upsertData(serviceClient, 'pathbuilder_import', payload);
    return upsertResponseWrapper(procedure, result);
  });
});
