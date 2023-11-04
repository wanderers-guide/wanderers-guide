// @ts-ignore
import { serve } from "std/server";
import { connect, insertData } from "../_shared/helpers.ts";
import type { Trait } from "../_shared/content";

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { name, description, meta_data, content_source_id } = body as {
      name: string;
      description: string;
      meta_data?: Record<string, any>;
      content_source_id: number;
    };

    const trait = await insertData<Trait>(client, "trait", {
      name,
      description,
      meta_data,
      content_source_id,
    });

    return trait;
  });
});
