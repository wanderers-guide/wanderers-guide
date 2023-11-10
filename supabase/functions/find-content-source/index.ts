// @ts-ignore
import { serve } from "std/server";
import { connect, fetchData } from "../_shared/helpers.ts";
import type { ContentSource } from "../_shared/content";

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, foundry_id, group, homebrew, published } = body as {
      id?: number;
      foundry_id?: string;
      group?: string;
      homebrew?: boolean;
      published?: boolean;
    };

    let results = await fetchData<ContentSource>(client, 'content_source', [
      { column: 'id', value: id },
      { column: 'foundry_id', value: foundry_id },
      { column: 'group', value: group },
      { column: 'is_published', value: published },
    ]);

    // Filter out homebrew content 
    if (homebrew === undefined || homebrew === false) {
      results = results.filter((result) => result.user_id === null);
    }

    return id === undefined && foundry_id === undefined
      ? results
      : results.length > 0
      ? results[0]
      : null;
  });
});
