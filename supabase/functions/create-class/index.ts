// @ts-ignore
import { serve } from 'std/server';
import { connect, fetchData, upsertData, upsertResponseWrapper } from '../_shared/helpers.ts';
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

    let trait_id: number | undefined = undefined;
    if (!id || id === -1) {
      // Is a new class, so we need to create a new trait
      const { procedure: traitProcedure, result: traitResult } = await upsertData<Trait>(
        client,
        'trait',
        {
          name,
          description: `This indicates content from the ${name.toLowerCase()} class.`,
          content_source_id,
          meta_data: {
            class_trait: true,
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
      const classes = await fetchData<Class>(client, 'class', [{ column: 'id', value: id }]);
      const class_ = classes[0];

      name = name.trim();
      // Update the trait name & description
      await upsertData<Trait>(client, 'trait', {
        id: class_.trait_id,
        name: name,
        description: `This indicates content from the ${name.toLowerCase()} class.`,
        content_source_id,
        meta_data: {
          class_trait: true,
        },
      });
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
