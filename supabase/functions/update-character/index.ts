// @ts-ignore
import { serve } from 'std/server';
import { connect, fetchData, updateData } from '../_shared/helpers.ts';
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
        // The character was updated elsewhere since the caller's snapshot. Don't
        // overwrite — return the current server row so the client can merge and retry.
        const current = await fetchData<Character>(client, 'character', [{ column: 'id', value: id }]);
        return {
          status: 'success',
          data: { __conflict: true, character: current[0] ?? null },
        };
      } else {
        return {
          status: 'error',
          message: status,
        };
      }
    },
    { supportsCharacterAPI: true }
  );
});
