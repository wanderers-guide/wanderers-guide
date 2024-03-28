// @ts-ignore
import { serve } from 'std/server';
import {
  connect,
  upsertResponseWrapper,
  upsertData,
  getPublicUser,
  fetchData,
} from '../_shared/helpers.ts';
import type { Character } from '../_shared/content';
import { hasPatreonAccess } from '../_shared/patreon.ts';

const CHARACTER_SLOT_CAP = 3;

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

    if (!id || id === -1) {
      // Creating new character
      const characters = await fetchData<Character>(client, 'character', [
        { column: 'user_id', value: user.user_id },
      ]);
      if (characters.length >= CHARACTER_SLOT_CAP) {
        const access = await hasPatreonAccess(user, 2);
        if (!access) {
          console.log('User does not have access');
          return {
            status: 'error',
            message: 'User does not have access',
          };
        }
      }
    }

    const { procedure, result } = await upsertData<Character>(
      client,
      'character',
      {
        id,
        user_id: user.user_id,
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
