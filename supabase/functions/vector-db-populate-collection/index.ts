// @ts-ignore
import { serve } from 'std/server';
import { connect, convertContentTypeToTableName, fetchData } from '../_shared/helpers.ts';
import type { ContentType } from '../_shared/content';
import { convertToString, filterObject } from '../_shared/vector-db.ts';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let {
      collection: collectionName,
      type,
      ids,
    } = body as {
      collection: string;
      type: ContentType;
      ids: number[];
    };

    const tableName = convertContentTypeToTableName(type);
    if (!tableName)
      return {
        status: 'error',
        message: 'Invalid type',
      };

    const results = await fetchData(client, tableName, [{ column: 'id', value: ids }]);
    if (results.length === 0)
      return {
        status: 'error',
        message: 'No results found',
      };

    console.log(results);

    const res = await fetch('https://vector-db-client.onrender.com/api/v1/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // @ts-ignore
        Authorization: `Bearer ${Deno.env.get('VECTOR_DB_KEY')}`,
      },
      body: JSON.stringify({
        collection: collectionName,
        ids: results.map((result) => `${type}-${result.id}`),
        metadatas: results.map((result) => ({ ...filterObject(result), _type: type })),
        documents:
          collectionName === 'name'
            ? results.map((result) => result.name)
            : results.map((result) => convertToString(filterObject(result))),
      }),
    });
    if(!res.ok) {
      return {
        status: 'error',
        message: 'Failed to add to collection',
      };
    }

    return {
      status: 'success',
      data: true,
    };
  });
});
