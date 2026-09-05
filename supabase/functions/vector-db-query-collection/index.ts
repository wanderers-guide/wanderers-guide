// @ts-ignore
import { serve } from 'std/server';
import { connect } from '../_shared/helpers.ts';
import {
  consumeWorkBudget,
  fetchWorkText,
  parseRequest,
  queryRequest,
  requireWorkUser,
  vectorResponse,
} from '../_shared/costly-requests.ts';
import { HttpError } from '../_shared/http-errors.ts';

serve(async (req: Request) => {
  return await connect(
    req,
    async (client, body, token) => {
      const user = await requireWorkUser(client, token);
      const { collection: collectionName, nResults, maxDistance, query, where } = parseRequest(queryRequest, body);
      await consumeWorkBudget(
        'vector-query',
        user.user_id,
        Math.max(Math.ceil(query.length / 4000), Math.ceil(nResults / 10))
      );
      const responseText = await fetchWorkText(
        'https://vector-db-client.onrender.com/api/v1/query',
        {
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
        },
        20_000
      );
      let results;
      try {
        results = vectorResponse.parse(JSON.parse(responseText));
      } catch {
        throw new HttpError(502, 'The upstream response was invalid.', 'UPSTREAM_FAILURE');
      }

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
    },
    { maxBodyBytes: 64 * 1024 }
  );
});
