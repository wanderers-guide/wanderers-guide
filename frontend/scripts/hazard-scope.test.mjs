import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { build } = createRequire(`${root}/package.json`)('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-hazard-scope-'));
const outfile = join(directory, 'hazards.mjs');

after(() => rm(directory, { recursive: true, force: true }));

await build({
  entryPoints: [`${root}/src/process/content/hazards.ts`],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  tsconfig: `${root}/tsconfig.json`,
  plugins: [
    {
      name: 'hazard-request-boundary',
      setup(builder) {
        builder.onResolve({ filter: /^(\.\/content-store|@requests\/request-manager)$/ }, ({ path }) => ({
          path,
          namespace: 'hazard-test',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'hazard-test' }, ({ path }) => ({
          loader: 'js',
          contents:
            path === './content-store'
              ? `export const getDefaultSources = (scope) => scope;
                 export const getDefaultSourcesKey = (scope) => globalThis.hazardScopeTest.sourceKeys[scope] ?? scope;
                 export const fetchContentSources = async (scope) => globalThis.hazardScopeTest.sources[scope] ?? [];`
              : `export async function makeRequest(route, body) {
                   globalThis.hazardScopeTest.requests.push({ route, body });
                   return body.id === undefined ? [] : null;
                 }`,
        }));
      },
    },
  ],
});

const { fetchHazardById, fetchHazards, getHazardQueryKey } = await import(pathToFileURL(outfile));

beforeEach(() => {
  globalThis.hazardScopeTest = { requests: [], sources: {}, sourceKeys: {} };
});

test('empty explicit and default source scopes never query unrestricted hazard rows', async () => {
  assert.deepEqual(await fetchHazards([]), []);
  assert.equal(await fetchHazardById(100, []), null);
  assert.equal(await fetchHazardById(100), null);
  assert.deepEqual(globalThis.hazardScopeTest.requests, []);
});

test('enabled source IDs are deduplicated and retained in catalog requests', async () => {
  await fetchHazards([400, 400, 100]);
  await fetchHazardById(100, [400]);
  assert.deepEqual(globalThis.hazardScopeTest.requests, [
    { route: 'find-creature', body: { type: 'hazard', content_sources: [100, 400] } },
    { route: 'find-creature', body: { id: 100, type: 'hazard', content_sources: [400] } },
  ]);
});

test('default-source changes invalidate direct hazard lookups but not explicit source lookups', () => {
  const before = getHazardQueryKey(100);
  globalThis.hazardScopeTest.sourceKeys.INFO = '1,400';
  globalThis.hazardScopeTest.sourceKeys.PAGE = '400';
  const after = getHazardQueryKey(100);
  assert.notDeepEqual(after, before);
  assert.deepEqual(getHazardQueryKey(100, 400), ['find-hazard', 100, 400]);
});
