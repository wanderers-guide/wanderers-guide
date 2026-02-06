// @ts-ignore
import { serve } from 'std/server';
import {
  connect,
  handleAssociatedTrait,
  upsertData,
  upsertResponseWrapper,
} from '../_shared/helpers.ts';
import type { VersatileHeritage } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let {
      id,
      name,
      rarity,
      description,
      artwork_url,
      content_source_id,
      version,
      trait_id,
      heritage_id,
    } = body as VersatileHeritage;

    let traitId: number | null = trait_id ?? null;
    if (!traitId) {
      traitId = await handleAssociatedTrait(
        client,
        id,
        'versatile-heritage',
        name,
        content_source_id
      );
      if (!traitId) {
        return {
          status: 'error',
          message: 'Trait could not be created.',
        };
      }
    }

    const { procedure, result } = await upsertData<VersatileHeritage>(
      client,
      'versatile_heritage',
      {
        id,
        name,
        rarity,
        description,
        trait_id: traitId,
        artwork_url,
        content_source_id,
        version,
        heritage_id,
      }
    );

    return upsertResponseWrapper(procedure, result);
  });
});
