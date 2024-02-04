import { makeRequest } from "@requests/request-manager";
import { ContentType } from "@typing/content";
import { chunk } from "lodash-es";

/**
 * Generates embeddings for the given content
 */
export async function populateContent(type: ContentType, ids: number[]) {
  // Limited to 500 ids at a time
  const chunks = chunk(ids, 500);
  for (const chunk of chunks) {
    const responseName = await makeRequest("vector-db-populate-collection", {
      collection: "name",
      type: type,
      ids: chunk,
    });
    const responseContent = await makeRequest("vector-db-populate-collection", {
      collection: "content",
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

type QueryResult = {
  distance: number;
  data: Record<string, string | boolean | number>;
};

/**
 * Queries the vector database for the given content (only searching by name)
 */
export async function queryByName(
  query: string,
  options?: {
    type?: ContentType;
    amount?: number;
    maxDistance?: number;
    applyWeights?: boolean;
  }
) {
  let amount = options?.amount ?? 1;
  const response = await makeRequest<QueryResult[]>(
    "vector-db-query-collection",
    {
      collection: "name",
      nResults: options?.applyWeights ? amount + 10 : amount,
      // Most results range from 0.3 - 0.4, I've found that 0.35 does a good job at filtering out bad results
      maxDistance: options?.maxDistance ?? 0.35,
      query: query,
      where: options?.type ? { _type: options.type } : undefined,
    }
  );
  if (!response) {
    return [];
  }
  return querySorter(response, amount, options?.applyWeights).map(
    (result) => result.data
  );
}

/**
 * Queries the vector database for the given content (searching by entire object)
 */
export async function queryByContent(
  query: string,
  options?: {
    type?: ContentType;
    amount?: number;
    maxDistance?: number;
    applyWeights?: boolean;
  }
) {
  let amount = options?.amount ?? 1;
  const response = await makeRequest<QueryResult[]>(
    "vector-db-query-collection",
    {
      collection: "content",
      nResults: options?.applyWeights ? amount + 10 : amount,
      maxDistance: undefined,
      query: query,
      where: options?.type ? { _type: options.type } : undefined,
    }
  );
  if (!response) {
    return [];
  }
  return querySorter(response, amount, options?.applyWeights).map(
    (result) => result.data
  );
}

// Large weight = less important
const TYPE_WEIGHTS: Record<string, number> = {
  trait: 0.1,
  action: 0.1,
};

function querySorter(
  results: QueryResult[],
  amount: number,
  applyWeights?: boolean
) {
  const sortedResults = results.sort((a, b) => {
    if (applyWeights) {
      const aWeight =
        a.distance + (TYPE_WEIGHTS[`${a.data.type || a.data._type}`] ?? 0);
      const bWeight =
        b.distance + (TYPE_WEIGHTS[`${b.data.type || b.data._type}`] ?? 0);
      return aWeight - bWeight;
    } else {
      return a.distance - b.distance;
    }
  });
  console.log(sortedResults);
  return sortedResults.slice(0, amount);
}
