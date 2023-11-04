// @ts-ignore
import { serve } from "std/server";
import { connect, fetchData } from "../_shared/helpers.ts";
import type { Spell } from "../_shared/content";

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, content_sources } = body as {
      id?: number;
      content_sources?: number[];
    };

    const results = await fetchData<Spell>(client, 'spell', [
      { column: 'id', value: id },
      { column: 'content_source_id', value: content_sources },
    ]);

    return id === undefined ? results : results.length > 0 ? results[0] : null;
  });
});
