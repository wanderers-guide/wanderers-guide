// @ts-ignore
import { serve } from 'std/server';
import { connect, upsertData, upsertResponseWrapper } from '../_shared/helpers.ts';
import type { ClassArchetype } from '../_shared/content';

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
      operations,
      feature_adjustments,
      class_id,
      archetype_id,
    } = body as ClassArchetype;

    const { procedure, result } = await upsertData<ClassArchetype>(client, 'class_archetype', {
      id,
      name,
      rarity,
      description,
      artwork_url,
      content_source_id,
      version,
      feature_adjustments,
      class_id,
      archetype_id,
      operations,
    });

    return upsertResponseWrapper(procedure, result);
  });
});
