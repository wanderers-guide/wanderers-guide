// @ts-ignore
import { serve } from 'std/server';
import { connect, fetchData } from '../_shared/helpers.ts';
import type { Language } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, name, content_sources } = body as {
      id?: number | number[];
      name?: string;
      content_sources?: number[];
    };

    const results = await fetchData<Language>(client, 'language', [
      { column: 'id', value: id },
      { column: 'name', value: name, options: { ignoreCase: true } },
      { column: 'content_source_id', value: content_sources },
    ]);

    const data =
      id === undefined || Array.isArray(id) ? results : results.length > 0 ? results[0] : null;
    return {
      status: 'success',
      data,
    };
  });
});
