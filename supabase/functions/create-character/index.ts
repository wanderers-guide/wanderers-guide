// @ts-ignore
import { serve } from "std/server";
import { connect, upsertResponseWrapper, upsertData } from '../_shared/helpers.ts';
import type { Character } from "../_shared/content";

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {

    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user)
      return {
        status: 'error',
        message: 'Invalid user',
      };

    const { procedure, result } = await upsertData<Character>(client, 'character', {
      user_id: user.id,
    });

    return upsertResponseWrapper(procedure, result);
  });
});
