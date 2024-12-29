// @ts-ignore
import { serve } from 'std/server';
import { connect, upsertData, upsertResponseWrapper } from '../_shared/helpers.ts';
import type { Creature } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let {
      id,
      name,
      level,
      rarity,
      inventory,
      notes,
      details,
      roll_history,
      operations,
      abilities_base,
      abilities_added,
      spells,
      meta_data,
      content_source_id,
      version,
    } = body as Creature;

    const { procedure, result } = await upsertData<Creature>(client, 'creature', {
      id,
      name,
      level,
      rarity,
      inventory,
      notes,
      details,
      roll_history,
      operations,
      abilities_base,
      abilities_added,
      spells,
      meta_data,
      content_source_id,
      version,
    });

    return upsertResponseWrapper(procedure, result);
  });
});
