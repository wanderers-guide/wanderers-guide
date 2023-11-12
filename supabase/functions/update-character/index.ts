// @ts-ignore
import { serve } from "std/server";
import { connect, updateData } from "../_shared/helpers.ts";
import type { Character } from "../_shared/content";

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, name, level, details, content_sources } = body as Character;

    const status = await updateData(client, 'character', id, {
      name,
      level,
      details,
      content_sources,
    });

    if (status === 'SUCCESS') {
      return {
        status: 'success',
        data: true,
      };
    } else {
      return {
        status: 'error',
        message: status,
      };
    }
  });
});
