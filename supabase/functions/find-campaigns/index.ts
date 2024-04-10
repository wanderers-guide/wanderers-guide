// @ts-ignore
import { serve } from 'std/server';
import type { Campaign } from '../_shared/content';
import { connect, fetchData } from '../_shared/helpers.ts';

interface FindCampaignsBody {
  id?: number | number[];
  user_id?: string;
  join_key?: string;
}

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, user_id, join_key } = body as FindCampaignsBody;

    const results = await fetchData<Campaign>(client, 'campaign', [
      { column: 'id', value: id },
      { column: 'user_id', value: user_id },
      { column: 'join_key', value: join_key },
    ]);

    return {
      status: 'success',
      data: results.sort((a, b) => a.id - b.id),
    };
  });
});
