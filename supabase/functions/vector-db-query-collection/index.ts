// @ts-ignore
import { serve } from 'std/server';
import { connect, convertContentTypeToTableName, fetchData } from '../_shared/helpers.ts';
import type { ContentType } from '../_shared/content';
import { convertToString, filterObject, getCollection } from '../_shared/vector-db.ts';
import { result } from 'lodash';
import { IncludeEnum } from 'chromadb';

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
      maxDistance?: number;
      query?: string;
      where?: Record<string, string | number | boolean>;
    };

    const collection = await getCollection(collectionName);
    if (!collection)
      return {
        status: 'error',
        message: 'Invalid collection',
      };

    const results = await collection.query({
      nResults: nResults || 1,
      where: where,
      queryTexts: query,
      include: [IncludeEnum.Metadatas, IncludeEnum.Distances]
    });

    for(let i = 0; i < results.ids.length; i++) {
      for(let c = 0; c < results.ids[i].length; c++) {
        const id = results.ids[i][c];
        const metadata = results.metadatas[i][c];
        const distance = results.distances![i][c];

        console.log(id, metadata, distance);
      }
    }

    return {
      status: 'success',
      data: true,
    };
  });
});
