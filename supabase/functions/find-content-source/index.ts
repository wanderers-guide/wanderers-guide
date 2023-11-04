// @ts-ignore
import { serve } from "std/server";
import { connect, fetchData } from "../_shared/helpers.ts";
import type { ContentSource } from "../_shared/content";

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, foundry_id } = body as {
      id?: number;
      foundry_id?: string;
    };

    const results = await fetchData<ContentSource>(client, 'content_source', [
      { column: 'id', value: id },
      { column: 'foundry_id', value: foundry_id },
    ]);

    return id === undefined ? results : results.length > 0 ? results[0] : null;
  });
});
