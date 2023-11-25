// @ts-ignore
import { serve } from "std/server";
import { connect, upsertData, upsertResponseWrapper } from "../_shared/helpers.ts";
import type { ContentSource } from "../_shared/content";

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let {
      id,
      name,
      foundry_id,
      url,
      description,
      operations,
      user_id,
      contact_info,
      require_key,
      is_published,
      required_content_sources,
    } = body as ContentSource;

    const { procedure, result } = await upsertData<ContentSource>(client, 'content_source', {
        id,
        name,
        foundry_id,
        url,
        description,
        operations,
        user_id,
        contact_info,
        require_key,
        is_published,
        required_content_sources,
    });

    return upsertResponseWrapper(procedure, result);
  });
});
