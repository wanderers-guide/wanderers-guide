// @ts-ignore
import { serve } from 'std/server';
import { connect, fetchData, upsertData, upsertResponseWrapper } from '../_shared/helpers.ts';
import type { Trait, VersatileHeritage } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, name, rarity, description, artwork_url, content_source_id, version, heritage_id } =
      body as VersatileHeritage;

    let trait_id: number | undefined = undefined;
    if (!id || id === -1) {
      // Is a new versatile heritage, so we need to create a new trait
      const { procedure: traitProcedure, result: traitResult } = await upsertData<Trait>(
        client,
        'trait',
        {
          name: `${name}`,
          description: `This indicates content from the ${name.toLowerCase()} versatile heritage.`,
          content_source_id,
          meta_data: {
            versatile_heritage_trait: true,
          },
        }
      );
      console.log('Trait result', traitResult);
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

    if (name && trait_id === undefined && id && id !== -1) {
      const versHeritages = await fetchData<VersatileHeritage>(client, 'versatile_heritage', [
        { column: 'id', value: id },
      ]);
      const versHeritage = versHeritages[0];

      name = name.trim();
      // Update the trait name & description
      await upsertData<Trait>(client, 'trait', {
        id: versHeritage.trait_id,
        name: `${name}`,
        description: `This indicates content from the ${name.toLowerCase()} versatile heritage.`,
        content_source_id,
        meta_data: {
          versatile_heritage_trait: true,
        },
      });
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
      },
      undefined,
      false
    );

    return upsertResponseWrapper(procedure, result);
  });
});
