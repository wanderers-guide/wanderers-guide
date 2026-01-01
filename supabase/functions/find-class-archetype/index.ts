// @ts-ignore
import { serve } from 'std/server';
import { connect, fetchData } from '../_shared/helpers.ts';
import type { ClassArchetype } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, content_sources, class_id } = body as {
      id?: number | number[];
      content_sources?: number[];
      class_id?: number;
    };

    const results = await fetchData<ClassArchetype>(client, 'class_archetype', [
      { column: 'id', value: id },
      { column: 'content_source_id', value: content_sources },
      { column: 'class_id', value: class_id },
    ]);

    const data =
      id === undefined || Array.isArray(id) ? results : results.length > 0 ? results[0] : null;
    return {
      status: 'success',
      data,
    };
  });
});
