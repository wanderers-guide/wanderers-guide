// @ts-ignore
import { serve } from 'std/server';
import { connect, upsertResponseWrapper, upsertData, getPublicUser } from '../_shared/helpers.ts';
import type { Character } from '../_shared/content';
import { hasPatreonAccess } from '../_shared/patreon.ts';

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

    const user = await getPublicUser(client);
    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    const access = await hasPatreonAccess(client, user, 2);
    if (!access) {
      console.log('User does not have access');
      return {
        status: 'error',
        message: 'User does not have access',
      };
    }

    const { procedure, result } = await upsertData<Character>(
      client,
      'character',
      {
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
      },
      undefined,
      false
    );

    return upsertResponseWrapper(procedure, result);
  });
});
