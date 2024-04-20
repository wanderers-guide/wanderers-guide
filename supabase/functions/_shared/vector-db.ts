import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContentType, JSendResponse } from './content';
import { convertContentTypeToTableName, fetchData } from './helpers';

export async function populateCollection(
  client: SupabaseClient<any, 'public', any>,
  collection: 'name' | 'content',
  type: ContentType,
  ids: number[]
): Promise<JSendResponse> {
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

  if (!results[0].uuid)
    return {
      status: 'error',
      message: 'Data needs a UUID field',
    };

  const res = await fetch('https://vector-db-client.onrender.com/api/v1/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // @ts-ignore
      Authorization: `Bearer ${Deno.env.get('VECTOR_DB_KEY')}`,
    },
    body: JSON.stringify({
      collection: collection,
      ids: results.map((result) => `${result.uuid}`),
      metadatas: results.map((result) => ({ ...filterObject(result), _type: type })),
      documents:
        collection === 'name'
          ? results.map((result) => `${result.name} ${result.type || type}`)
          : results.map((result) => convertToString(filterObject(result))),
    }),
  });
  if (!res.ok) {
    return {
      status: 'error',
      message: `Failed to add to collection: ${res.statusText}`,
    };
  }

  return {
    status: 'success',
    data: true,
  };
}

function filterObject(obj: Record<string, any>): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        result[key] = value;
      }
    }
  }

  return result;
}

const MAX_STRING_LENGTH = 10000; // 8k token limit for OpenAI
function convertToString(obj: Record<string, string | number | boolean>): string {
  const result = Object.entries(obj)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
  return result.length > MAX_STRING_LENGTH ? result.substring(0, MAX_STRING_LENGTH) : result;
}
