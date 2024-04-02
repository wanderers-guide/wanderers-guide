// @ts-ignore
import { serve } from 'std/server';
import { connect, fetchData, upsertData, upsertResponseWrapper } from '../_shared/helpers.ts';
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

    let trait_id: number | undefined = undefined;
    if (!id || id === -1) {
      // Is a new archetype, so we need to create a new trait
      const { procedure: traitProcedure, result: traitResult } = await upsertData<Trait>(
        client,
        'trait',
        {
          name: `${name} Archetype`,
          description: `This indicates content from the ${name.toLowerCase()} archetype.`,
          content_source_id,
          meta_data: {
            archetype_trait: true,
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
      const archetypes = await fetchData<Archetype>(client, 'archetype', [
        { column: 'id', value: id },
      ]);
      const archetype = archetypes[0];

      name = name.trim();
      // Update the trait name & description
      await upsertData<Trait>(client, 'trait', {
        id: archetype.trait_id,
        name: `${name} Archetype`,
        description: `This indicates content from the ${name.toLowerCase()} archetype.`,
        content_source_id,
      });
    }

    const { procedure, result } = await upsertData<Archetype>(
      client,
      'archetype',
      {
        id,
        name,
        rarity,
        description,
        trait_id,
        artwork_url,
        content_source_id,
        version,
        dedication_feat_id,
      },
      undefined,
      false
    );

    return upsertResponseWrapper(procedure, result);
  });
});
