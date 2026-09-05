// @ts-ignore
import { serve } from 'std/server';
import { TableName, connect, fetchData } from '../_shared/helpers.ts';
import type { ContentSource } from '../_shared/content.d.ts';
import { z } from 'https://esm.sh/zod@3.24.2';
import { HttpError, isAuthenticationError } from '../_shared/http-errors.ts';

const requestSchema = z.object({ content_source_id: z.number().int().positive().safe() }).strict();

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    const request = requestSchema.safeParse(body);
    if (!request.success) throw new HttpError(400, 'A positive content_source_id is required.', 'INVALID_REQUEST');
    const { content_source_id } = request.data;
    const results = await fetchData<ContentSource>(client, 'content_source', [
      { column: 'id', value: content_source_id },
    ]);
    const source = results.length > 0 ? results[0] : null;

    // JSONB membership matches the numeric ID exactly (1 must not match 10).
    // A HEAD count also avoids transferring subscriber rows or protected columns.
    const { error, count } = await client
      .from('public_user' satisfies TableName)
      .select('id', { count: 'exact', head: true })
      // supabase-js 2.7 treats JS arrays as PostgreSQL array literals; JSONB
      // containment needs the explicitly serialized JSON array instead.
      .contains('subscribed_content_sources', JSON.stringify([{ source_id: content_source_id }]));
    if (error || count === null) {
      if (isAuthenticationError(error)) throw error;
      console.error('Error fetching data:', error);
      throw new HttpError(503, 'Content source statistics are temporarily unavailable.', 'SOURCE_STATS_UNAVAILABLE');
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
