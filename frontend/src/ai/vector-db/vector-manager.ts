import { makeRequest } from "@requests/request-manager";
import { ContentType } from "@typing/content";
import _ from "lodash";

/**
 * Generates embeddings for the given content
 */
export async function populateContent(type: ContentType, ids: number[]) {
  // Limited to 1000 ids at a time
  const chunks = _.chunk(ids, 1000);
  for (const chunk of chunks) {
    const responseName = await makeRequest('vector-db-populate-collection', {
      collection: 'name',
      type: type,
      ids: chunk,
    });
    const responseContent = await makeRequest('vector-db-populate-collection', {
      collection: 'content',
      type: type,
      ids: chunk,
    });
    console.log(responseName, responseContent);
  }
  return {
    chunks: chunks.length,
    total: ids.length,
  };
}

/**
 * Queries the vector database for the given content (only searching by name)
 */
export async function queryByName(query: string, type?: ContentType, amount?: number) {
  const response = await makeRequest<{
    distance: number;
    data: Record<string, string | boolean | number>;
  }[]>('vector-db-query-collection', {
    collection: 'name',
    nResults: amount || 1,
    // Most results range from 0.3 - 0.4, I've found that 0.35 does a good job at filtering out bad results
    maxDistance: 0.35,
    query: query,
    where: type ? { _type: type } : undefined,
  });
  if(!response) {
    return [];
  }
  console.log(response);
  return response.map((result) => result.data);
}

/**
 * Queries the vector database for the given content (searching by entire object)
 */
export async function queryByContent(query: string, type?: ContentType, amount?: number) {
  const response = await makeRequest<{
    distance: number;
    data: Record<string, string | boolean | number>;
  }[]>('vector-db-query-collection', {
    collection: 'content',
    nResults: amount || 1,
    maxDistance: undefined,
    query: query,
    where: type ? { _type: type } : undefined,
  });
  if(!response) {
    return [];
  }
  console.log(response);
  return response.map((result) => result.data);
}
