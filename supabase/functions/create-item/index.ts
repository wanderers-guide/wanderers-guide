// @ts-ignore
import { serve } from 'std/server';
import { connect, insertData, upsertData, upsertResponseWrapper } from '../_shared/helpers.ts';
import type { Item } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let {
      id,
      name,
      price,
      bulk,
      level,
      rarity,
      traits,
      description,
      hands,
      size,
      craft_requirements,
      usage,
      group,
      meta_data,
      operations,
      content_source_id,
      version,
    } = body as Item;

    const { procedure, result } = await upsertData<Item>(client, 'item', {
      id,
      name,
      price,
      bulk,
      level,
      rarity,
      traits,
      description,
      group,
      hands,
      size,
      craft_requirements,
      usage,
      meta_data,
      operations,
      content_source_id,
      version,
    });

    return upsertResponseWrapper(procedure, result);
  });
});
