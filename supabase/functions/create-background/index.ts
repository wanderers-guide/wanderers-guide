// @ts-ignore
import { serve } from "std/server";
import { connect, insertData, upsertData } from "../_shared/helpers.ts";
import type { Background } from "../_shared/content";

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, name, rarity, description, operations, content_source_id, version } = body as Background;

    const { procedure, result } = await upsertData<Background>(client, 'background', {
      id,
      name,
      rarity,
      description,
      operations,
      content_source_id,
      version,
    });

    return result;
  });
});
