import { OpenAIEmbeddingFunction, ChromaClient } from 'chromadb';

function getCollectionTypes() {
  return ['name', 'content'];
}

export async function getCollection(name: string) {
  if (!getCollectionTypes().includes(name)) return null;
  const client = new ChromaClient({
    path: 'https://vector-db-94hy.onrender.com',
  });
  const embedder = new OpenAIEmbeddingFunction({
    // @ts-ignore
    openai_api_key: Deno.env.get('OPEN_AI_KEY'),
  });
  const collection = await client.getOrCreateCollection({
    name: name,
    embeddingFunction: embedder,
  });
  return collection;
}

export function filterObject(obj: Record<string, any>): Record<string, string | number | boolean> {
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
export function convertToString(obj: Record<string, string | number | boolean>): string {
  const result = Object.entries(obj)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
  return result.length > MAX_STRING_LENGTH ? result.substring(0, MAX_STRING_LENGTH) : result;
}
