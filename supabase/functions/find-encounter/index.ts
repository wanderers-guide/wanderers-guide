// @ts-ignore
import { serve } from 'std/server';
import type { Encounter } from '../_shared/content';
import { connect, fetchData } from '../_shared/helpers.ts';

interface FindEncountersBody {
  id?: number | number[];
  user_id?: string;
  campaign_id?: number;
}

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, user_id, campaign_id } = body as FindEncountersBody;

    const results = await fetchData<Encounter>(client, 'encounter', [
      { column: 'id', value: id },
      { column: 'user_id', value: user_id },
      { column: 'campaign_id', value: campaign_id },
    ]);

    return {
      status: 'success',
      data: results.sort((a, b) => a.id - b.id),
    };
  });
});
