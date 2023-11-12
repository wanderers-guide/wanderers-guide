// @ts-ignore
import { serve } from "std/server";
import { connect, insertData, upsertResponseWrapper, upsertData } from '../_shared/helpers.ts';
import type { Trait } from "../_shared/content";

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, name, description, meta_data, content_source_id } = body as Trait;

    const { procedure, result } = await upsertData<Trait>(client, 'trait', {
      id,
      name,
      description,
      meta_data,
      content_source_id,
    });

    return upsertResponseWrapper(procedure, result);
  });
});
