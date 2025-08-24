// @ts-ignore
import { serve } from 'std/server';
import { connect, upsertData, upsertResponseWrapper } from '../_shared/helpers.ts';
import type { AbilityBlock } from '../_shared/content';

serve(async (req: Request) => {
  return await connect<AbilityBlock>(req, async (client, body) => {
    let {
      id,
      operations,
      name,
      actions,
      level,
      rarity,
      availability,
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
    } = body;

    const { procedure, result } = await upsertData<AbilityBlock>(
      client,
      'ability_block',
      {
        id,
        operations,
        name,
        actions,
        level,
        rarity,
        availability,
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

    return upsertResponseWrapper(procedure, result);
  });
});
