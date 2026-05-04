export function* intoChunks<T>(values: T[], chunkSize = 16) {
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    yield chunk;
  }
}
