

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
