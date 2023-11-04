// @ts-ignore
import { serve } from "std/server";
import { connect, insertData } from "../_shared/helpers.ts";
import type { Spell } from "../_shared/content";

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let {
      name,
      rank,
      traditions,
      rarity,
      cast,
      traits,
      defenses,
      cost,
      trigger,
      requirements,
      range,
      area,
      targets,
      duration,
      description,
      heightened,
      meta_data,
      content_source_id,
      version,
    } = body as Spell;

    const spell = await insertData<Spell>(
      client,
      "spell",
      {
        name,
        rank,
        traditions,
        rarity,
        cast,
        traits,
        defenses,
        cost,
        trigger,
        requirements,
        range,
        area,
        targets,
        duration,
        description,
        heightened,
        meta_data,
        content_source_id,
        version,
      },
    );

    return spell;
  });
});
