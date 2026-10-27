/** Exercise the configured stateless Functions SDK with only Auth creation and fetch replaced. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

test('captured request identities reach fetch without entering Supabase Auth again', async () => {
  const frontend = fileURLToPath(new URL('../', import.meta.url));
  const directory = await mkdtemp(join(tmpdir(), 'wg-session-transport-'));
  const originalFetch = globalThis.fetch;
  let authReads = 0;
  const requests = [];
  globalThis.__statelessTransportTest = {
    auth: {
      getSession: () => {
        authReads++;
        return new Promise(() => {});
      },
    },
  };
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), headers: new Headers(options.headers), signal: options.signal });
    return new Response(JSON.stringify({ status: 'success', data: { id: 1 } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    await build({
      absWorkingDir: frontend,
      entryPoints: ['src/supabase-client.ts'],
      outfile: join(directory, 'client.mjs'),
      bundle: true,
      platform: 'node',
      format: 'esm',
      define: {
        'import.meta.env': JSON.stringify({
          VITE_SUPABASE_URL: 'https://backend.example.test/',
          VITE_SUPABASE_KEY: 'fixture-public-key',
        }),
      },
      plugins: [
        {
          name: 'auth-only',
          setup(builder) {
            builder.onResolve({ filter: /^@supabase\/supabase-js$/ }, () => ({ path: 'auth', namespace: 'fixture' }));
            builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
              contents: 'export const createClient = () => globalThis.__statelessTransportTest;',
              loader: 'js',
            }));
          },
        },
      ],
    });
    const { functions } = await import(pathToFileURL(join(directory, 'client.mjs')).href);
    const controller = new AbortController();
    const results = await Promise.all(
      ['actor-A-token', 'fixture-public-key'].map((token) =>
        functions.invoke('find-character', {
          body: { id: 1 },
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
      )
    );
    assert.ok(results.every(({ data, error }) => data.data.id === 1 && error === null));
    assert.equal(authReads, 0);
    assert.deepEqual(
      requests.map(({ url }) => url),
      Array(2).fill('https://backend.example.test/functions/v1/find-character')
    );
    assert.deepEqual(
      requests.map(({ headers }) => headers.get('authorization')),
      ['Bearer actor-A-token', 'Bearer fixture-public-key']
    );
    assert.ok(
      requests.every(
        ({ headers, signal }) => headers.get('apikey') === 'fixture-public-key' && signal === controller.signal
      )
    );
  } finally {
    globalThis.fetch = originalFetch;
    delete globalThis.__statelessTransportTest;
    await rm(directory, { recursive: true, force: true });
  }
});
