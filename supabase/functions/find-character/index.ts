// @ts-ignore
import { serve } from 'std/server';
import { connect, fetchData } from '../_shared/helpers.ts';
import type { Character } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, user_id } = body as {
      id?: number | number[];
      user_id?: string;
    };

    const results = await fetchData<Character>(client, 'character', [
      { column: 'id', value: id },
      { column: 'user_id', value: user_id },
    ]);

    const data =
      id === undefined || Array.isArray(id)
        ? results.sort((a, b) => a.id - b.id)
        : results.length > 0
        ? results[0]
        : null;
    return {
      status: 'success',
      data,
    };
  });
});
