// @ts-ignore
import { serve } from "std/server";
import { connect, insertData } from "../_shared/helpers.ts";
import type { AbilityBlock, Trait } from "../_shared/content";

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let {
      operations,
      name,
      actions,
      level,
      rarity,
      prerequisites,
      frequency,
      cost,
      trigger,
      requirements,
      access,
      description,
      special,
      type,
      meta_data,
      traits,
      content_source_id,
      version,
    } = body as AbilityBlock;

    const abilityBlock = await insertData<AbilityBlock>(
      client,
      "ability_block",
      {
        operations,
        name,
        actions,
        level,
        rarity,
        prerequisites,
        frequency,
        cost,
        trigger,
        requirements,
        access,
        description,
        special,
        type,
        meta_data,
        traits,
        content_source_id,
        version,
      },
      type
    );

    return abilityBlock;
  });
});
