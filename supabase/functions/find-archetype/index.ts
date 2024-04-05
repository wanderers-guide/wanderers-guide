// @ts-ignore
import { serve } from 'std/server';
import { connect, fetchData } from '../_shared/helpers.ts';
import type { Archetype } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, content_sources, dedication_feat_id } = body as {
      id?: number | number[];
      content_sources?: number[];
      dedication_feat_id?: number;
    };

    const results = await fetchData<Archetype>(client, 'archetype', [
      { column: 'id', value: id },
      { column: 'content_source_id', value: content_sources },
      { column: 'dedication_feat_id', value: dedication_feat_id },
    ]);

    const data =
      id === undefined || Array.isArray(id) ? results : results.length > 0 ? results[0] : null;
    return {
      status: 'success',
      data,
    };
  });
});
