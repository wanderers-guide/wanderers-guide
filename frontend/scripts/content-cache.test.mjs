import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const frontend = fileURLToPath(new URL('../', import.meta.url));
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

/** Exercise real cache logic with explicit session, network and IndexedDB boundaries. */
test('content packages and cache respect failures, sources, actors and generations', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'wg-content-cache-'));
  const state = (globalThis.__contentCacheTest = {
    actor: 'A',
    records: new Map(),
    requests: [],
    read: async (key) => state.records.get(key),
    request: async () => [],
    session: async () => ({ data: { session: { user: { id: state.actor } } } }),
  });
  const stubs = {
    '@auth/user-manager': `export const getPublicUser = async () => ({user_id:globalThis.__contentCacheTest.actor,subscribed_content_sources:[]});`,
    'supabase-client': `export const supabase = {auth:{getSession:()=>globalThis.__contentCacheTest.session()}};`,
    '@requests/request-manager': `export const makeRequest = async (...args) => { globalThis.__contentCacheTest.requests.push(args); return globalThis.__contentCacheTest.request(...args); };`,
    '@utils/images': `export const preloadImage = async () => {};`,
    'content-cache-db': `export const idbGet = key => globalThis.__contentCacheTest.read(key); export const idbSet = async (key,value) => {globalThis.__contentCacheTest.records.set(key,structuredClone(value));}; export const idbDelete = async key => {globalThis.__contentCacheTest.records.delete(key);};`,
  };
  let store;
  try {
    const result = await build({
      absWorkingDir: frontend,
      stdin: { contents: "export * from './src/process/content/content-store';", resolveDir: frontend, loader: 'ts' },
      tsconfig: join(frontend, 'tsconfig.json'),
      bundle: true,
      write: false,
      platform: 'node',
      format: 'esm',
      define: { 'import.meta.env': JSON.stringify({ VITE_ENV: 'production', PROD: true }) },
      plugins: [
        {
          name: 'boundaries',
          setup(b) {
            b.onResolve({ filter: /.*/ }, (args) => {
              const key = args.path.endsWith('content-cache-db')
                ? 'content-cache-db'
                : args.path.endsWith('supabase-client')
                  ? 'supabase-client'
                  : args.path;
              return stubs[key] ? { path: key, namespace: 'fixture' } : undefined;
            });
            b.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({ contents: stubs[args.path], loader: 'ts' }));
          },
        },
      ],
    });
    await writeFile(join(directory, 'store.mjs'), result.outputFiles[0].text);
    store = await import(pathToFileURL(join(directory, 'store.mjs')).href);
    const row = {
      id: 81001,
      uuid: 81001,
      name: 'Fixture Language',
      description: 'Fixture',
      content_source_id: 81000,
      created_at: '2026-09-05T00:00:00Z',
      updated_at: '2026-09-05T00:00:00Z',
      rarity: 'COMMON',
      availability: 'STANDARD',
      meta_data: {},
      version: '1.0',
      speakers: '',
      script: '',
      deprecated: false,
    };
    const query = { id: row.id, content_sources: [81000] };
    state.request = async () => [row];
    assert.equal((await store.fetchContent('language', query))[0].id, row.id);
    const before = state.requests.length;
    assert.equal((await store.fetchContent('language', query))[0].id, row.id);
    assert.equal(state.requests.length, before, 'same scoped request is cached');

    state.request = async () => [];
    assert.deepEqual(
      await store.fetchContent('language', { ...query, content_sources: [99999] }),
      [],
      'cached ID cannot escape source filter'
    );
    state.request = async () => [row, { ...row, id: 81002, name: 'Fixture Language Variant' }];
    assert.equal(
      (await store.fetchContent('language', { name: row.name, content_sources: [81000] })).length,
      2,
      'a cached exact name cannot swallow substring results'
    );

    state.records.set('content-store:A', {
      version: 4,
      actorId: 'A',
      savedAt: Date.now(),
      idStore: new Map([['language', new Map([[row.id, row]])]]),
      contentStore: new Map(),
    });
    state.actor = 'B';
    state.request = async () => [];
    assert.deepEqual(
      await store.fetchContent('language', query),
      [],
      'actor B cannot use actor A memory or persisted cache'
    );

    const oldSession = deferred();
    state.session = () => oldSession.promise;
    const oldLookup = store.fetchContent('language', query);
    state.actor = 'C';
    store.setContentCacheActor('C');
    state.session = async () => ({ data: { session: { user: { id: state.actor } } } });
    state.request = async () => [row];
    await store.fetchContent('language', query);
    const requestsAfterSwitch = state.requests.length;
    oldSession.resolve({ data: { session: { user: { id: 'B' } } } });
    await oldLookup;
    await store.fetchContent('language', query);
    assert.equal(state.requests.length, requestsAfterSwitch, 'an old session read cannot restore actor B over actor C');

    store.resetContentStore(true, true);
    const started = deferred(),
      late = deferred();
    state.request = async () => {
      started.resolve();
      return late.promise;
    };
    const pending = store.fetchContent('language', query);
    const rejected = assert.rejects(pending, /Content changed/);
    await started.promise;
    store.resetContentStore(true, true);
    late.resolve([row]);
    await rejected;
    assert.deepEqual(store.getCachedContent('language'), [], 'obsolete response never repopulates reset cache');

    const hydration = deferred();
    state.read = async () => hydration.promise;
    store.resetContentStore();
    store.resetContentStore(true, true);
    hydration.resolve({
      version: 4,
      actorId: 'B',
      savedAt: Date.now(),
      idStore: new Map([['language', new Map([[row.id, row]])]]),
      contentStore: new Map(),
    });
    for (let i = 0; i < 10; i++) await Promise.resolve();
    assert.deepEqual(store.getCachedContent('language'), [], 'obsolete hydration never repopulates reset cache');
    state.read = async (key) => state.records.get(key);

    state.request = async (type) => (type === 'find-ability-block' ? null : []);
    await assert.rejects(
      store.fetchContentPackage([81000]),
      /Could not load ability-block/,
      'partial package is never published'
    );
    state.request = async () => [];
    const empty = await store.fetchContentPackage([81000]);
    assert.deepEqual(empty.abilityBlocks, [], 'successful empty tables remain valid');
    assert.deepEqual(empty.classes, []);
    state.request = async (type) => (type === 'find-content-source' ? null : []);
    store.resetContentStore(true, true);
    await assert.rejects(
      store.fetchContentPackage('ALL-OFFICIAL-PUBLIC'),
      /content-source/,
      'failed source resolution cannot masquerade as an empty source set'
    );
  } finally {
    store?.resetContentStore(true, true);
    await rm(directory, { recursive: true, force: true });
    delete globalThis.__contentCacheTest;
  }
});
