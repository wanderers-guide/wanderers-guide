// @ts-ignore
import { serve } from 'std/server';
import { connect, convertContentTypeToTableName, fetchData } from '../_shared/helpers.ts';
import type { ContentType } from '../_shared/content';
import { convertToString, filterObject, getCollection } from '../_shared/vector-db.ts';

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

    const collection = await getCollection(collectionName);
    if (!collection)
      return {
        status: 'error',
        message: 'Invalid collection',
      };

    const results = await fetchData(client, tableName, [{ column: 'id', value: ids }]);
    if (results.length === 0)
      return {
        status: 'error',
        message: 'No results found',
      };

    if (collection.name === 'name') {
      try {
        await collection.add({
          ids: results.map((result) => `${type}-${result.id}`),
          metadatas: results.map((result) => filterObject(result)),
          documents: results.map((result) => result.name),
        });
      } catch (e) {
        console.error(e);
        return {
          status: 'error',
          message: 'Failed to add to collection',
        };
      }
    } else if (collection.name === 'content') {
      try {
        await collection.add({
          ids: results.map((result) => `${type}-${result.id}`),
          metadatas: results.map((result) => filterObject(result)),
          documents: results.map((result) => convertToString(filterObject(result))),
        });
      } catch (e) {
        console.error(e);
        return {
          status: 'error',
          message: 'Failed to add to collection',
        };
      }
    }

    return {
      status: 'success',
      data: true,
    };
  });
});
