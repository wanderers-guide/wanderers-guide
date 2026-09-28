// @ts-ignore
import { serve } from 'std/server';
import { connect, fetchData } from '../_shared/helpers.ts';
import type { Creature, CreatureRecordType, Hazard } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, name, content_sources, type } = body as {
      id?: number | number[];
      name?: string;
      content_sources?: number[];
      type?: CreatureRecordType;
    };

    if (type !== undefined && type !== 'creature' && type !== 'hazard') {
      return { status: 'fail', data: { type: 'Invalid content type.' } };
    }

    const results = await fetchData<Creature | Hazard>(client, 'creature', [
      { column: 'id', value: id },
      { column: 'name', value: name, options: { ignoreCase: true } },
      { column: 'content_source_id', value: content_sources },
      { column: 'type', value: type ?? 'creature' },
    ]);

    const data =
      id === undefined || Array.isArray(id) ? results : results.length > 0 ? results[0] : null;
    return {
      status: 'success',
      data,
    };
  });
});
