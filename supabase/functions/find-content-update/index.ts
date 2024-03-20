// @ts-ignore
import { serve } from 'std/server';
import { connect, fetchData } from '../_shared/helpers.ts';
import type { ContentUpdate } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id } = body as {
      id: number;
    };

    let results: ContentUpdate[] = await fetchData<ContentUpdate>(client, 'content_update', [
      { column: 'id', value: id },
    ]);

    const data =
      (id === undefined || Array.isArray(id)) && name === undefined
        ? results
        : results.length > 0
        ? results[0]
        : null;
    return {
      status: 'success',
      data,
    };
  });
});
