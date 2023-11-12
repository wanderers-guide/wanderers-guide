// @ts-ignore
import { serve } from "std/server";
import { connect, fetchData } from "../_shared/helpers.ts";
import type { Character } from "../_shared/content.d.ts";

serve(async (req: Request) => {
  return await connect(req, async (client, { character_id }) => {

    const characters = await fetchData<Character>(client, "character", [
      { column: "id", value: character_id },
    ]);

    return {
      status: "success",
      data: characters[0],
    };
  });
});
