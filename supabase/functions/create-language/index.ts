// @ts-ignore
import { serve } from 'std/server';
import { connect, upsertData, upsertResponseWrapper } from '../_shared/helpers.ts';
import type { Language } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, name, speakers, script, rarity, availability, description, content_source_id } =
      body as Language;

    const { procedure, result } = await upsertData<Language>(client, 'language', {
      id,
      name,
      speakers,
      script,
      rarity,
      availability,
      description,
      content_source_id,
    });

    return upsertResponseWrapper(procedure, result);
  });
});
