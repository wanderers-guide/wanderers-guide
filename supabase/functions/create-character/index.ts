// @ts-ignore
import { serve } from 'std/server';
import { connect, upsertResponseWrapper, upsertData } from '../_shared/helpers.ts';
import type { Character } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let {
      id,
      name,
      level,
      experience,
      hp_current,
      hp_temp,
      hero_points,
      stamina_current,
      resolve_current,
      inventory,
      notes,
      details,
      roll_history,
      custom_operations,
      meta_data,
      options,
      variants,
      content_sources,
      operation_data,
      spells,
      companions,
    } = body as Character;

    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user)
      return {
        status: 'error',
        message: 'Invalid user',
      };

    const { procedure, result } = await upsertData<Character>(client, 'character', {
      id,
      user_id: user.id,
      name,
      level,
      experience,
      hp_current,
      hp_temp,
      hero_points,
      stamina_current,
      resolve_current,
      inventory,
      notes,
      details,
      roll_history,
      custom_operations,
      meta_data,
      options,
      variants,
      content_sources,
      operation_data,
      spells,
      companions,
    }, undefined, false);

    return upsertResponseWrapper(procedure, result);
  });
});
