// @ts-ignore
import { serve } from 'std/server';
import { TableName, connect, fetchData } from '../_shared/helpers.ts';
import type { ContentSource } from '../_shared/content.d.ts';

serve(async (req: Request) => {
  return await connect(req, async (client, { content_source_id }) => {
    const results = await fetchData<ContentSource>(client, 'content_source', [
      { column: 'id', value: content_source_id },
    ]);
    const source = results.length > 0 ? results[0] : null;

    const searchString = `"source_id":${content_source_id}`;
    const { error, count } = await client
      .from('public_user' satisfies TableName)
      .select('*', { count: 'exact' })
      .like('subscribed_content_sources::text', `%${searchString}%`);
    if (error) {
      console.error('Error fetching data:', error);
    }

    return {
      status: 'success',
      data: {
        source,
        count,
      },
    };
  });
});
