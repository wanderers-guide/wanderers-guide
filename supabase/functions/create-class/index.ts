// @ts-ignore
import { serve } from 'std/server';
import {
  connect,
  fetchData,
  handleAssociatedTrait,
  upsertData,
  upsertResponseWrapper,
} from '../_shared/helpers.ts';
import type { Class, Trait } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let {
      id,
      name,
      rarity,
      description,
      operations,
      skill_training_base,
      artwork_url,
      content_source_id,
      version,
    } = body as Class;

    const trait_id = await handleAssociatedTrait(client, id, 'class', name, content_source_id);
    if (!trait_id) {
      return {
        status: 'error',
        message: 'Trait could not be created.',
      };
    }

    const { procedure, result } = await upsertData<Class>(client, 'class', {
      id,
      name,
      rarity,
      description,
      operations,
      skill_training_base,
      trait_id,
      artwork_url,
      content_source_id,
      version,
    });

    return upsertResponseWrapper(procedure, result);
  });
});
