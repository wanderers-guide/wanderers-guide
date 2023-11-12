// @ts-ignore
import { serve } from "std/server";
import { connect, insertData, upsertData, upsertResponseWrapper } from "../_shared/helpers.ts";
import type { Creature } from "../_shared/content";

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let {
      id,
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

    const { procedure, result } = await upsertData<Creature>(client, 'creature', {
      id,
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

    return upsertResponseWrapper(procedure, result);
  });
});
