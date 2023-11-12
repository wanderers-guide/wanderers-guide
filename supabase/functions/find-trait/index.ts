// @ts-ignore
import { serve } from 'std/server';
import { connect, fetchData } from '../_shared/helpers.ts';
import type { Trait } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, name, content_sources } = body as {
      id?: number;
      name?: string;
      content_sources?: number[];
    };

    let results: Trait[] = [];
    if (id) {
      results = await fetchData<Trait>(client, 'trait', [
        { column: 'id', value: id },
        { column: 'content_source_id', value: content_sources },
      ]);
    } else if (name) {
      name = name.trim();
      results = await fetchData<Trait>(client, 'trait', [
        { column: 'name', value: name, options: { ignoreCase: true } },
        { column: 'content_source_id', value: content_sources },
      ]);
    } else {
      results = await fetchData<Trait>(client, 'trait', [
        { column: 'content_source_id', value: content_sources },
      ]);
    }

    const data = (id === undefined && name === undefined) ? results : (results.length > 0 ? results[0] : null);
    return {
      status: 'success',
      data,
    }
  });
});
