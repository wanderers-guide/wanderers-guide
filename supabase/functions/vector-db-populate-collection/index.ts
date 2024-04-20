// @ts-ignore
import { serve } from 'std/server';
import { connect } from '../_shared/helpers.ts';
import type { ContentType } from '../_shared/content';
import { populateCollection } from '../_shared/vector-db.ts';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { collection, type, ids } = body as {
      collection: string;
      type: ContentType;
      ids: number[];
    };

    if (collection !== 'name' && collection !== 'content') {
      return {
        status: 'error',
        message: 'Invalid collection',
      };
    }

    return await populateCollection(client, collection, type, ids);
  });
});
