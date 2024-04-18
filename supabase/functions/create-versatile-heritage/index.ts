// @ts-ignore
import { serve } from 'std/server';
import {
  connect,
  fetchData,
  handleAssociatedTrait,
  upsertData,
  upsertResponseWrapper,
} from '../_shared/helpers.ts';
import type { Trait, VersatileHeritage } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, name, rarity, description, artwork_url, content_source_id, version, heritage_id } =
      body as VersatileHeritage;

    const trait_id = await handleAssociatedTrait(
      client,
      id,
      'versatile-heritage',
      name,
      content_source_id
    );
    if (!trait_id) {
      return {
        status: 'error',
        message: 'Trait could not be created.',
      };
    }

    const { procedure, result } = await upsertData<VersatileHeritage>(
      client,
      'versatile_heritage',
      {
        id,
        name,
        rarity,
        description,
        trait_id,
        artwork_url,
        content_source_id,
        version,
        heritage_id,
      }
    );

    return upsertResponseWrapper(procedure, result);
  });
});
