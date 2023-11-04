// @ts-ignore
import { serve } from "std/server";
import { connect, updateData } from "../_shared/helpers.ts";
import type { Character } from "../_shared/content";

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, name, level, details, content_sources } = body as Character;

    const result = await updateData(client, 'character', id, {
      name,
      level,
      details,
      content_sources,
    });

    return {
      success: result === 'SUCCESS',
      status: result,
    };
  });
});
