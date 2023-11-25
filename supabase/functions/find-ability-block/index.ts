// @ts-ignore
import { serve } from "std/server";
import { connect, fetchData } from "../_shared/helpers.ts";
import type { AbilityBlock } from "../_shared/content";

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, ids, type, content_sources, traits, prerequisites } = body as {
      id?: number;
      ids?: number[];
      type?: string;
      content_sources?: number[];
      traits?: number[];
      prerequisites?: string[];
    };

    const results = await fetchData<AbilityBlock>(client, 'ability_block', [
      { column: 'id', value: id },
      { column: 'id', value: ids },
      { column: 'type', value: type },
      { column: 'content_source_id', value: content_sources },
      { column: 'traits', value: traits, options: { arrayContains: true } },
      { column: 'prerequisites', value: prerequisites, options: { arrayContains: true } },
    ]);

    const data = id === undefined ? results : results.length > 0 ? results[0] : null;
    return {
      status: 'success',
      data,
    };
  });
});
