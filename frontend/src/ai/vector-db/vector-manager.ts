import { makeRequest } from '@requests/request-manager';
import { ContentType } from '@typing/content';
import { labelToVariable } from '@variables/variable-utils';
import { chunk } from 'lodash-es';

/**
 * Generates embeddings for the given content
 */
export async function populateContent(type: ContentType, ids: number[]) {
  // Limited to 500 ids at a time
  const chunks = chunk(ids, 500);
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
  const response = await makeRequest<QueryResult[]>('vector-db-query-collection', {
    collection: 'name',
    nResults: options?.applyWeights ? amount + 10 : amount,
    //
    maxDistance: options?.maxDistance ?? 1.35,
    query: query,
    where: options?.type ? { _type: options.type } : undefined,
  });
  if (!response) {
    return [];
  }

  const sortedResults = querySorter(response, amount, options?.applyWeights).sort((a, b) => {
    if (labelToVariable(`${a.data.name}`) === labelToVariable(query) && getTypeWeight(a.data) <= 0) {
      return -1;
    }
    return `${a.data.type || a.data._type}`.localeCompare(`${b.data.type || b.data._type}`);
  });

  console.log(sortedResults);

  return sortedResults.map((result) => result.data);
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
  const response = await makeRequest<QueryResult[]>('vector-db-query-collection', {
    collection: 'content',
    nResults: options?.applyWeights ? amount + 10 : amount,
    maxDistance: undefined,
    query: query,
    where: options?.type ? { _type: options.type } : undefined,
  });
  if (!response) {
    return [];
  }
  return querySorter(response, amount, options?.applyWeights).map((result) => result.data);
}

// Smaller weight = less important
const TYPE_WEIGHTS: Record<string, number> = {
  trait: -0.2,
  action: -0.2,
  'class-feature': -0.2,
};
function getTypeWeight(data: Record<string, string | number | boolean>) {
  return -1 * (TYPE_WEIGHTS[`${data.type || data._type}`] ?? 0);
}

function querySorter(results: QueryResult[], amount: number, applyWeights?: boolean) {
  const sortedResults = results.sort((a, b) => {
    if (applyWeights) {
      const aWeight = a.distance + getTypeWeight(a.data);
      const bWeight = b.distance + getTypeWeight(b.data);
      return aWeight - bWeight;
    } else {
      return a.distance - b.distance;
    }
  });
  return sortedResults.slice(0, amount);
}
