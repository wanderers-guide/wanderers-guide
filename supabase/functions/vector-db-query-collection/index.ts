// @ts-ignore
import { serve } from 'std/server';
import { connect } from '../_shared/helpers.ts';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let {
      collection: collectionName,
      nResults,
      maxDistance,
      query,
      where,
    } = body as {
      collection: string;
      nResults?: number;
      maxDistance?: number; // from 0.0 - 1.0, 1.0 being the furthest
      query?: string;
      where?: Record<string, string | number | boolean>;
    };

    const res = await fetch('https://vector-db-client.onrender.com/api/v1/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // @ts-ignore
        Authorization: `Bearer ${Deno.env.get('VECTOR_DB_KEY')}`,
      },
      body: JSON.stringify({
        collection: collectionName,
        nResults: nResults || 1,
        where: where,
        query: query,
      }),
    });
    if (!res.ok) {
      return {
        status: 'error',
        message: `Failed to query collection: ${res.statusText}`,
      };
    }
    const results = await res.json();

    const formattedResults: {
      data: Record<string, string | number | boolean>;
      distance: number;
    }[] = [];

    for (let i = 0; i < results.ids.length; i++) {
      for (let c = 0; c < results.ids[i].length; c++) {
        const metadata = results.metadatas[i][c];
        const distance = results.distances[i][c];

        if (metadata && distance <= (maxDistance ?? 1.0)) {
          formattedResults.push({
            data: metadata,
            distance: distance,
          });
        }
      }
    }

    return {
      status: 'success',
      data: formattedResults,
    };
  });
});
