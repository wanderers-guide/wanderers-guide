// @ts-ignore
import { serve } from 'std/server';
import { connect, fetchData } from '../_shared/helpers.ts';
import type { Spell } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, name, content_sources, traits } = body as {
      id?: number | number[];
      name?: string;
      content_sources?: number[];
      traits?: number[];
    };

    const results = await fetchData<Spell>(client, 'spell', [
      { column: 'id', value: id },
      { column: 'name', value: name, options: { ignoreCase: true } },
      { column: 'content_source_id', value: content_sources },
      { column: 'traits', value: traits, options: { arrayContains: true } },
    ]);

    const data =
      id === undefined || Array.isArray(id) ? results : results.length > 0 ? results[0] : null;
    return {
      status: 'success',
      data,
    };
  });
});
