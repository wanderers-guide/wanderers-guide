// @ts-ignore
import { serve } from 'std/server';
import { connect, fetchData, logEvent, updateData } from '../_shared/helpers.ts';
import type { Character } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(
    req,
    async (client, body) => {
      // Optional optimistic-concurrency token. When provided, the update only applies
      // if the row's updated_at still matches — otherwise we return the current row so
      // the caller can merge, instead of clobbering a newer write with a stale snapshot.
      const expected_updated_at = (body as { expected_updated_at?: string }).expected_updated_at;
      let {
        id,
        name,
        level,
        details,
        content_sources,
        operation_data,
        notes,
        companions,
        spells,
        variants,
        options,
        meta_data,
        roll_history,
        custom_operations,
        inventory,
        resolve_current,
        experience,
        hp_current,
        hp_temp,
        hero_points,
        stamina_current,
        campaign_id,
      } = body as Character;

      const { status, data } = await updateData(
        client,
        'character',
        id,
        {
          name,
          level,
          details,
          content_sources,
          operation_data,
          notes,
          companions,
          spells,
          variants,
          options,
          meta_data,
          roll_history,
          custom_operations,
          inventory,
          resolve_current,
          experience,
          hp_current,
          hp_temp,
          hero_points,
          stamina_current,
          campaign_id,
        },
        true,
        expected_updated_at ? { guard: { column: 'updated_at', value: expected_updated_at } } : undefined
      );

      if (status === 'SUCCESS') {
        return {
          status: 'success',
          data: data,
        };
      } else if (status === 'CONFLICT') {
        // The guarded UPDATE matched no row. Two very different causes look identical
        // at that point: (a) the row changed since the caller's snapshot — a genuine
        // conflict to merge; (b) RLS lets the caller SELECT the row but not UPDATE it
        // (e.g. anyone viewing a public character). Re-read with the same RLS-scoped
        // client to tell them apart — misreporting (b) as a conflict makes read-only
        // clients merge-and-retry forever.
        const current = await fetchData<Character>(client, 'character', [{ column: 'id', value: id }]);
        const row = current[0] ?? null;
        if (!row) {
          // The caller can't even see the row (deleted, or no read access) — there is
          // nothing to merge and retrying will never succeed.
          logEvent('warn', 'update-character', 'save_forbidden', { id, reason: 'NOT_VISIBLE' });
          return {
            status: 'success',
            data: { __forbidden: true, reason: 'NOT_VISIBLE' },
          };
        }
        if (row.updated_at === expected_updated_at) {
          // The token still matches the row, so the UPDATE wasn't raced — it was
          // filtered by RLS. The caller can read but not write this character.
          logEvent('warn', 'update-character', 'save_forbidden', { id, reason: 'WRITE_DENIED' });
          return {
            status: 'success',
            data: { __forbidden: true, reason: 'WRITE_DENIED' },
          };
        }
        // The row really did change since the caller's snapshot. Don't overwrite —
        // return the current server row so the client can merge and retry.
        logEvent('info', 'update-character', 'save_conflict', {
          id,
          expected: expected_updated_at,
          actual: row.updated_at,
        });
        return {
          status: 'success',
          data: { __conflict: true, character: row },
        };
      } else {
        logEvent('error', 'update-character', 'save_failed', { id, result: status });
        return {
          status: 'error',
          message: status,
        };
      }
    },
    { supportsCharacterAPI: true }
  );
});
