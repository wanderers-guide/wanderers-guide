/** Exercise the actual worker, controller and content-store seam with every network boundary unavailable. */
import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';

const directory = await mkdtemp(join(tmpdir(), 'wg-worker-package-'));
const root = resolve(import.meta.dirname, '..');
const messages = [];
let networkCalls = 0;
const requests = [];
const originalSelf = globalThis.self;
const originalFetch = globalThis.fetch;
const originalLog = console.log;
globalThis.self = { postMessage: (message) => messages.push(message) };
globalThis.__workerPackageTest = {
  unavailable: async () => {
    networkCalls += 1;
    throw new Error('Network is unavailable');
  },
};
globalThis.__workerPackageTest.request = (...args) => globalThis.__workerPackageTest.unavailable(...args);
globalThis.__workerPackageTest.session = () => globalThis.__workerPackageTest.unavailable();
globalThis.__workerPackageTest.user = () => globalThis.__workerPackageTest.unavailable();
globalThis.fetch = globalThis.__workerPackageTest.unavailable;
console.log = () => {};
after(async () => {
  globalThis.self = originalSelf;
  globalThis.fetch = originalFetch;
  console.log = originalLog;
  delete globalThis.__workerPackageTest;
  await rm(directory, { recursive: true, force: true });
});
const boundaries = {
  '@requests/request-manager':
    'export const makeRequest = (...args) => globalThis.__workerPackageTest.request(...args);',
  '@auth/user-manager':
    'export const getPublicUser = () => globalThis.__workerPackageTest.user(); export const getCachedPublicUser = () => null;',
  '@utils/client-errors': 'export const reportClientFailure = () => {};',
  '@utils/notifications': 'export const displayError = () => {};',
};
await build({
  absWorkingDir: root,
  stdin: {
    contents: `import './src/process/operations/operations.worker'; export * from './src/process/operations/operation-content-package'; export {fetchContent, getCachedContent} from './src/process/content/content-store';`,
    resolveDir: root,
  },
  outfile: join(directory, 'worker.mjs'),
  platform: 'node',
  format: 'esm',
  bundle: true,
  define: { 'import.meta.env': JSON.stringify({ VITE_ENV: 'production' }) },
  plugins: [
    {
      name: 'network-boundaries',
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, ({ path }) =>
          path in boundaries || path.endsWith('/supabase-client') ? { path, namespace: 'boundary' } : undefined
        );
        builder.onLoad({ filter: /.*/, namespace: 'boundary' }, ({ path }) => ({
          loader: 'js',
          contents: path.endsWith('/supabase-client')
            ? 'export const supabase = {auth:{getSession:() => globalThis.__workerPackageTest.session()}};'
            : boundaries[path],
        }));
      },
    },
  ],
});
const api = await import(join(directory, 'worker.mjs'));
beforeEach(() => {
  messages.length = 0;
  networkCalls = 0;
  requests.length = 0;
  globalThis.__workerPackageTest.request = (...args) => globalThis.__workerPackageTest.unavailable(...args);
  globalThis.__workerPackageTest.session = () => globalThis.__workerPackageTest.unavailable();
  globalThis.__workerPackageTest.user = () => globalThis.__workerPackageTest.unavailable();
});

const operation = (id, type, data) => ({ id, type, data });
const source = (id, user_id = null, is_published = true) => ({
  id,
  name: `Source ${id}`,
  user_id,
  is_published,
  operations: [],
});
const packet = (languageName = 'Auran', sourceId = 1) => ({
  defaultSources: { PAGE: [sourceId], INFO: 'ALL-USER-ACCESSIBLE' },
  ancestries: [],
  backgrounds: [],
  classes: [],
  archetypes: [],
  versatileHeritages: [],
  classArchetypes: [],
  items: [],
  spells: [],
  traits: [],
  creatures: [],
  sources: [
    source(sourceId, sourceId === 8 ? 'different-actor' : null, sourceId !== 8),
    source(2, 'another-user', false),
  ],
  languages: [
    { id: 101, name: languageName, content_source_id: sourceId },
    { id: 102, name: 'Disabled language', content_source_id: 2 },
  ],
  abilityBlocks: [
    {
      id: 700,
      name: 'Language Feat',
      type: 'feat',
      content_source_id: sourceId,
      traits: [11],
      prerequisites: ['Trained'],
      operations: [operation('grant-language', 'giveLanguage', { languageId: 101 })],
    },
  ],
});
const character = () => ({
  id: 1,
  level: 1,
  name: 'Offline calculation',
  details: {},
  content_sources: { enabled: [1] },
  inventory: { coins: { cp: 0, sp: 0, gp: 0, pp: 0 }, items: [] },
  operation_data: {},
  meta_data: {},
  variants: {},
  companions: { list: [] },
  options: { custom_operations: true },
  custom_operations: [operation('select-feat', 'giveAbilityBlock', { type: 'feat', abilityBlockId: 700 })],
});
const run = async (content, id = 1) => {
  await self.onmessage({
    data: {
      id,
      execution: { type: 'CHARACTER', data: { character: character(), content, context: 'CHARACTER-SHEET' } },
    },
  });
  assert.equal(messages.length, 1);
  return messages.pop();
};

test('actual worker calculates grants from its posted package with all network calls unavailable', async () => {
  const response = await run(packet());
  assert.equal(response.status, 'success', response.message);
  assert.deepEqual(response.data.store.variables.LANGUAGE_IDS.value, ['101']);
  assert.deepEqual(response.data.store.variables.LANGUAGE_NAMES.value, ['AURAN']);
  assert.equal(networkCalls, 0);
  assert.equal(api.getWorkerContentReader(), undefined);
  assert.deepEqual(api.getCachedContent('language'), [], 'the job package never seeds the ordinary cache');
});

test('next worker job sees only its own package, including reused IDs from another source or actor', async () => {
  assert.equal((await run(packet())).status, 'success');
  const response = await run(packet('Different private language', 8), 2);
  assert.equal(response.status, 'success', response.message);
  assert.deepEqual(response.data.store.variables.LANGUAGE_NAMES.value, ['DIFFERENT PRIVATE LANGUAGE']);
  const returned = await run(packet(), 3);
  assert.deepEqual(returned.data.store.variables.LANGUAGE_NAMES.value, ['AURAN']);
  assert.equal(networkCalls, 0);
  assert.deepEqual(api.getCachedContent('language'), []);
});

test('missing required tables fail and the next complete worker job still calculates', async () => {
  const incomplete = packet();
  delete incomplete.languages;
  const failed = await run(incomplete);
  assert.equal(failed.status, 'error');
  assert.match(failed.message, /missing language content/);
  assert.equal(api.getWorkerContentReader(), undefined);
  assert.equal((await run(packet(), 2)).status, 'success');
  assert.equal(networkCalls, 0);
});

test('controller failures release the package without keeping a partial worker context', async () => {
  await self.onmessage({
    data: {
      id: 1,
      execution: {
        type: 'CHARACTER',
        data: {
          character: null,
          content: packet(),
          context: 'CHARACTER-SHEET',
        },
      },
    },
  });
  assert.equal(messages.pop().status, 'error');
  assert.equal(api.getWorkerContentReader(), undefined);
  assert.equal((await run(packet())).status, 'success');
  assert.equal(networkCalls, 0);
});

test('creature jobs use their posted content and parent store without another network request', async () => {
  const parent = await run(packet());
  await self.onmessage({
    data: {
      id: 2,
      charStore: parent.data.store,
      execution: {
        type: 'CREATURE',
        data: {
          id: 'creature-offline',
          content: packet(),
          creature: {
            name: 'Offline companion',
            level: 3,
            abilities_base: [],
            abilities_added: [],
            inventory: { coins: { cp: 0, sp: 0, gp: 0, pp: 0 }, items: [] },
            operations: [operation('companion-language', 'giveLanguage', { languageId: 101 })],
          },
        },
      },
    },
  });
  const response = messages.pop();
  assert.equal(response.status, 'success', response.message);
  assert.deepEqual(response.data.store.variables.LANGUAGE_IDS.value, ['101']);
  assert.equal(response.data.store.variables.LEVEL.value, 3);
  assert.equal(parent.data.store.variables.LEVEL.value, 1);
  assert.equal(networkCalls, 0);
  assert.equal(api.getWorkerContentReader(), undefined);
});

test('package lookup preserves explicit ID, names, subtype, array and source filtering', () => {
  const reader = api.createOperationContentReader(packet());
  assert.equal(reader.fetch('ability-block', { id: 700 })[0].name, 'Language Feat');
  assert.equal(
    reader.fetch('ability-block', { name: 'language feat', type: 'feat', traits: [11], prerequisites: ['Trained'] })
      .length,
    1
  );
  assert.equal(reader.fetch('ability-block', { name: '%FEAT', type: 'action' }).length, 0);
  assert.equal(reader.fetch('ability-block', { name: 'Language _eat' }).length, 1);
  assert.equal(reader.fetch('language', { id: [101, 102] }).length, 1);
  assert.deepEqual(reader.fetch('language', { content_sources: [] }), []);
  assert.deepEqual(reader.fetch('language', { content_sources: [2] }), []);
  assert.equal(reader.fetch('language', { content_sources: 'ALL-USER-ACCESSIBLE' }).length, 1);
  assert.deepEqual(
    reader.sources('ALL-USER-ACCESSIBLE').map((row) => row.id),
    [1]
  );
  assert.deepEqual(reader.cached('feat'), [], 'prose lookups still fall back to ability-block');
});

test('packages without optional source metadata can calculate but cannot pretend to resolve source metadata', async () => {
  const withoutSources = packet();
  delete withoutSources.sources;
  assert.equal((await run(withoutSources)).status, 'success');
  const reader = api.createOperationContentReader(withoutSources);
  assert.deepEqual(reader.cached('content-source'), []);
  assert.deepEqual(reader.fetch('content-source', { id: 1 }), [], 'an identity miss can use the original lookup');
  assert.throws(() => reader.sources('ALL-USER-ACCESSIBLE'), /missing content-source content/);
});

/** Controlled old request boundary, including the INFO book catalog outside the PAGE package. */
function allowCrossBookLookup(languageResult = { id: 101, name: 'Cross-book language', content_source_id: 9 }) {
  globalThis.__workerPackageTest.session = async () => ({ data: { session: null } });
  globalThis.__workerPackageTest.user = async () => null;
  globalThis.__workerPackageTest.request = async (type, body) => {
    networkCalls += 1;
    requests.push({ type, body });
    if (type === 'find-content-source') {
      const all = [source(1), source(3), source(9)];
      return Array.isArray(body.id) ? all.filter((row) => body.id.includes(row.id)) : all;
    }
    assert.equal(type, 'find-language');
    assert.ok(body.content_sources.includes(9), 'original INFO+PAGE scope includes the referenced book');
    if (languageResult instanceof Error) throw languageResult;
    return languageResult;
  };
}

test('explicit missing cross-book grants preserve original scope without storing fallback rows', async () => {
  allowCrossBookLookup();
  const content = packet();
  content.languages = [];
  const response = await run(content);
  assert.equal(response.status, 'success', response.message);
  assert.deepEqual(response.data.store.variables.LANGUAGE_NAMES.value, ['CROSS-BOOK LANGUAGE']);
  assert.ok(networkCalls > 0);
  assert.equal(api.getWorkerContentReader(), undefined);
  assert.deepEqual(api.getCachedContent('language'), []);
  assert.deepEqual(api.getCachedContent('content-source'), []);
});

test('unavailable cross-book references fail the worker instead of silently dropping a grant', async () => {
  allowCrossBookLookup(new Error('Required reference unavailable'));
  const content = packet();
  content.languages = [];
  const failed = await run(content);
  assert.equal(failed.status, 'error');
  assert.match(failed.message, /Required reference unavailable/);
  assert.equal(api.getWorkerContentReader(), undefined);
  assert.deepEqual(api.getCachedContent('language'), []);
  const previousCalls = networkCalls;
  assert.equal((await run(packet(), 2)).status, 'success');
  assert.equal(networkCalls, previousCalls);
});

test('confirmed absent removed references retain the existing successful not-found behavior', async () => {
  allowCrossBookLookup(null);
  const content = packet();
  content.languages = [];
  const response = await run(content);
  assert.equal(response.status, 'success', response.message);
  assert.deepEqual(response.data.store.variables.LANGUAGE_IDS.value, []);
  assert.equal(api.getWorkerContentReader(), undefined);
});

test('implicit INFO name queries keep all server matches while explicit PAGE lists stay package-bound', async () => {
  allowCrossBookLookup([
    { id: 101, name: 'Auran', content_source_id: 1 },
    { id: 201, name: 'Auran', content_source_id: 9 },
  ]);
  await api.withWorkerContentPackage(packet(), async () => {
    const names = await api.fetchContent('language', { name: 'Auran' });
    assert.deepEqual(
      names.map((row) => row.id),
      [101, 201]
    );
    const previousCalls = networkCalls;
    const page = await api.fetchContent('language', { content_sources: [1, 3] });
    assert.deepEqual(
      page.map((row) => row.id),
      [101]
    );
    assert.equal(networkCalls, previousCalls);
  });
  assert.equal(api.getWorkerContentReader(), undefined);
  assert.deepEqual(api.getCachedContent('language'), []);
});

test('the dedicated worker override cannot hijack a main-thread direct calculation or UI fetch', async () => {
  globalThis.document = {};
  try {
    await assert.rejects(
      api.withWorkerContentPackage(packet(), async () => {}),
      /restricted to workers/
    );
    assert.equal(api.getWorkerContentReader(), undefined);
  } finally {
    delete globalThis.document;
  }
});
