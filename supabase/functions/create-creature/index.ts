// @ts-ignore
import { serve } from "std/server";
import { connect, insertData } from "../_shared/helpers.ts";
import type { Creature } from "../_shared/content";

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let {
      name,
      level,
      rarity,
      size,
      traits,
      family_type,
      senses,
      languages,
      skills,
      items,
      attributes,
      stats,
      immunities,
      weaknesses,
      resistances,
      interaction_abilities,
      offensive_abilities,
      defensive_abilities,
      speeds,
      attacks,
      spellcasting,
      description,
      meta_data,
      content_source_id,
      version,
    } = body as Creature;

    const creature = await insertData<Creature>(client, 'creature', {
      name,
      level,
      rarity,
      size,
      traits,
      family_type,
      senses,
      languages,
      skills,
      items,
      attributes,
      stats,
      immunities,
      weaknesses,
      resistances,
      interaction_abilities,
      offensive_abilities,
      defensive_abilities,
      speeds,
      attacks,
      spellcasting,
      description,
      meta_data,
      content_source_id,
      version,
    });

    return creature;
  });
});
