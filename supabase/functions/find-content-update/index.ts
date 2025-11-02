// @ts-ignore
import { serve } from 'std/server';
import { connect, fetchData } from '../_shared/helpers.ts';
import type { ContentUpdate } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, user_id, state, created } = body as {
      id?: number;
      user_id?: string;
      state?: 'PENDING' | 'APPROVED' | 'REJECTED';
      created?: { from?: string; to?: string };
    };

    let results: ContentUpdate[] = await fetchData<ContentUpdate>(
      client,
      'content_update',
      [
        { column: 'id', value: id },
        { column: 'user_id', value: user_id },
        { column: 'status->>state', value: state },
      ],
      created
    );

    const data =
      id === undefined || Array.isArray(id) ? results : results.length > 0 ? results[0] : null;
    return {
      status: 'success',
      data,
    };
  });
});
