// @ts-ignore
import { serve } from 'std/server';
import { connect, upsertData, upsertResponseWrapper } from '../_shared/helpers.ts';
import type { Ancestry, Trait } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let {
      id,
      name,
      rarity,
      description,
      operations,
      artwork_url,
      content_source_id,
      version,
    } = body as Ancestry;

    let trait_id: number | undefined = undefined;
    if (!id || id === -1) {
      // Is a new ancestry, so we need to create a new trait
      const { procedure: traitProcedure, result: traitResult } = await upsertData<Trait>(
        client,
        'trait',
        {
          name,
          description: `This indicates content from the ${name.toLowerCase()} ancestry.`,
          content_source_id,
        }
      );
      if (traitResult && (traitResult as Trait).id && traitProcedure === 'insert') {
        trait_id = (traitResult as Trait).id;
      }
      if (!trait_id) {
        return {
          status: 'error',
          message: 'Trait could not be created.',
        };
      }
    }

    const { procedure, result } = await upsertData<Ancestry>(client, 'ancestry', {
      id,
      name,
      rarity,
      description,
      operations,
      trait_id,
      artwork_url,
      content_source_id,
      version,
    });

    return upsertResponseWrapper(procedure, result);
  });
});
