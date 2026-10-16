type StorageReset = {
  command: 'Storage.clearDataForOrigin';
  params: { origin: string; storageTypes: 'indexeddb' };
};

/** Different mocked catalogs can reuse source IDs; only clear the owned test browser's local origins. */
export async function clearFixtureIndexedDb(
  baseUrl: unknown,
  modulePreviewUrl: unknown,
  execute: (request: StorageReset) => PromiseLike<unknown>
): Promise<void> {
  const origins = [
    ...new Set(
      [baseUrl, modulePreviewUrl]
        .filter((value) => value != null && value !== '')
        .map((value) => {
          if (typeof value !== 'string') throw new Error('Expected a local fixture URL');
          const url = new URL(value);
          if (
            !['http:', 'https:'].includes(url.protocol) ||
            !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
            url.username ||
            url.password
          )
            throw new Error('Fixture storage cleanup is restricted to loopback test origins');
          return url.origin;
        })
    ),
  ];
  for (const origin of origins)
    await execute({ command: 'Storage.clearDataForOrigin', params: { origin, storageTypes: 'indexeddb' } });
}
