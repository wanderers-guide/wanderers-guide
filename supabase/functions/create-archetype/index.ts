// @ts-ignore
import { serve } from 'std/server';
import {
  connect,
  fetchData,
  handleAssociatedTrait,
  upsertData,
  upsertResponseWrapper,
} from '../_shared/helpers.ts';
import type { Archetype, Trait } from '../_shared/content';

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
      dedication_feat_id,
    } = body as Archetype;

    const trait_id = await handleAssociatedTrait(client, id, 'archetype', name, content_source_id);
    if (!trait_id) {
      return {
        status: 'error',
        message: 'Trait could not be created.',
      };
    }

    const { procedure, result } = await upsertData<Archetype>(client, 'archetype', {
      id,
      name,
      rarity,
      description,
      trait_id,
      artwork_url,
      content_source_id,
      version,
      dedication_feat_id,
    });

    return upsertResponseWrapper(procedure, result);
  });
});
