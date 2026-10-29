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
      requests.every(({ headers, signal }) => headers.get('apikey') === 'fixture-public-key' && !signal.aborted)
    );
  } finally {
    globalThis.fetch = originalFetch;
    delete globalThis.__statelessTransportTest;
    await rm(directory, { recursive: true, force: true });
  }
});

/** Drive the real Functions SDK and request recovery with only network/Auth replaced. */
async function withRecoveryTransport(run) {
  const frontend = fileURLToPath(new URL('../', import.meta.url));
  const directory = await mkdtemp(join(tmpdir(), 'wg-response-deadline-'));
  const previous = { fetch: globalThis.fetch, timer: globalThis.setTimeout, clear: globalThis.clearTimeout };
  const timers = new Map();
  let nextTimer = 0;
  let now = 0;
  const requests = [];
  const state = { session: null, fetch: undefined };
  globalThis.__responseDeadlineTest = {
    auth: { getSession: async () => ({ data: { session: state.session }, error: null }) },
  };
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), ...options });
    return state.fetch(url, options, requests.length);
  };
  globalThis.setTimeout = (callback, delay) => {
    const id = ++nextTimer;
    timers.set(id, { callback, due: now + delay });
    return id;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);
  const advance = async (ms) => {
    now += ms;
    for (const [id, timer] of timers) {
      if (timer.due <= now) {
        timers.delete(id);
        timer.callback();
      }
    }
    await new Promise((resolve) => setImmediate(resolve));
  };
  try {
    await build({
      absWorkingDir: frontend,
      stdin: {
        contents: `export {functions} from './src/supabase-client'; export {makeRequest} from './src/request/request-manager';`,
        resolveDir: frontend,
      },
      outfile: join(directory, 'client.mjs'),
      bundle: true,
      platform: 'node',
      format: 'esm',
      define: {
        'import.meta.env': JSON.stringify({
          VITE_SUPABASE_URL: 'https://backend.example.test/',
          VITE_SUPABASE_KEY: 'fixture-public-key',
          PROD: false,
        }),
      },
      plugins: [
        {
          name: 'only-auth-and-notices',
          setup(builder) {
            builder.onResolve({ filter: /^@supabase\/supabase-js$/ }, () => ({ path: 'auth', namespace: 'fixture' }));
            builder.onResolve({ filter: /^@utils\/(?:error-handling|client-errors)$/ }, () => ({
              path: 'notices',
              namespace: 'fixture',
            }));
            builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
              loader: 'js',
              resolveDir: frontend,
              contents:
                path === 'auth'
                  ? `export const createClient=()=>globalThis.__responseDeadlineTest; export {FunctionsHttpError,FunctionsRelayError,FunctionsFetchError} from '@supabase/functions-js';`
                  : `export const logError=()=>{}; export const throwError=()=>{}; export const reportClientFailure=()=>{};`,
            }));
          },
        },
      ],
    });
    const api = await import(pathToFileURL(join(directory, 'client.mjs')).href);
    await run({ api, state, requests, advance, timers });
  } finally {
    globalThis.fetch = previous.fetch;
    globalThis.setTimeout = previous.timer;
    globalThis.clearTimeout = previous.clear;
    delete globalThis.__responseDeadlineTest;
    await rm(directory, { recursive: true, force: true });
  }
}
const response = () =>
  new Response(JSON.stringify({ status: 'success', data: { id: 1 } }), {
    headers: { 'Content-Type': 'application/json' },
  });
const stalledFetch = (_url, { signal }) =>
  new Promise((_resolve, reject) => {
    const abort = () => reject(new DOMException('Aborted', 'AbortError'));
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });

test('stalled response headers abort and retry one anonymous read without waiting for the body deadline', async () => {
  await withRecoveryTransport(async ({ api, state, requests, advance, timers }) => {
    state.fetch = (url, options, number) => (number === 1 ? stalledFetch(url, options) : response());
    const reading = api.makeRequest('find-character', { id: 1 }, false, { anonymous: true });
    await advance(0);
    await advance(8000);
    assert.equal(requests[0].signal.aborted, true, 'the unanswered fetch must be canceled before the retry');
    await advance(500);
    assert.deepEqual(await reading, { id: 1 });
    assert.equal(requests.length, 2);
    assert.equal(new Headers(requests[1].headers).get('authorization'), 'Bearer fixture-public-key');
    assert.equal(timers.size, 0);
  });
});

test('two unanswered read attempts stop and a changed account cannot retry an older read', async () => {
  await withRecoveryTransport(async ({ api, state, requests, advance }) => {
    state.fetch = stalledFetch;
    const reading = api.makeRequest('find-character', { id: 1 }, false, { anonymous: true });
    await advance(0);
    await advance(8000);
    await advance(500);
    await advance(8000);
    assert.equal(await reading, null);
    assert.equal(requests.length, 2);
    assert.ok(requests.every(({ signal }) => signal.aborted));
  });
  await withRecoveryTransport(async ({ api, state, requests, advance }) => {
    state.session = { user: { id: 'owner-A' }, access_token: 'actor-A-token' };
    state.fetch = stalledFetch;
    const reading = api.makeRequest('find-character', { id: 1 }, false, { expectedActorId: 'owner-A' });
    await advance(0);
    state.session = { user: { id: 'owner-B' }, access_token: 'actor-B-token' };
    await advance(8000);
    await advance(500);
    assert.equal(await reading, null);
    assert.equal(requests.length, 1);
  });
});

test('prompt headers retain long catalog body transfers and propagate later caller cancellation', async () => {
  await withRecoveryTransport(async ({ api, state, requests, advance, timers }) => {
    let body;
    state.fetch = () =>
      new Response(
        new ReadableStream({
          start(controller) {
            body = controller;
          },
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    let result = 'pending';
    const reading = api
      .makeRequest('find-ability-block', { content_sources: [3] }, false, { anonymous: true })
      .then((value) => {
        result = value;
      });
    await advance(0);
    await advance(45000);
    assert.equal(result, 'pending');
    assert.equal(requests[0].signal.aborted, false);
    body.enqueue(new TextEncoder().encode(JSON.stringify({ status: 'success', data: { id: 1 } })));
    body.close();
    await reading;
    assert.deepEqual(result, { id: 1 });
    assert.equal(requests.length, 1);
    assert.equal(timers.size, 0);

    const controller = new AbortController();
    const pending = api.functions.invoke('find-spell', { body: { id: 1 }, signal: controller.signal });
    await advance(0);
    controller.abort();
    assert.equal(requests[1].signal.aborted, true, 'caller cancellation still reaches a started response body');
    body.enqueue(new TextEncoder().encode(JSON.stringify({ status: 'success', data: { id: 1 } })));
    body.close();
    await pending;
  });
});

test('writes keep their original deadline and are never replayed after ambiguous timeouts', async () => {
  await withRecoveryTransport(async ({ api, state, requests, advance, timers }) => {
    state.session = { user: { id: 'owner' }, access_token: 'owner-token' };
    state.fetch = () => new Promise(() => {});
    let result = 'pending';
    const writing = api.makeRequest('update-character', { id: 1 }, false).then((value) => {
      result = value;
    });
    await advance(0);
    await advance(8000);
    assert.equal(result, 'pending');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].signal.aborted, false);
    await advance(22000);
    await writing;
    assert.equal(result, null);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].signal.aborted, false);
    assert.equal(timers.size, 0);
  });
});

test('an already-canceled read cannot start a live transfer', async () => {
  await withRecoveryTransport(async ({ api, state, requests, advance, timers }) => {
    state.fetch = stalledFetch;
    const controller = new AbortController();
    controller.abort();
    const reading = api.functions.invoke('find-character', { body: { id: 1 }, signal: controller.signal });
    await advance(0);
    assert.ok((await reading).error);
    assert.equal(requests[0].signal.aborted, true);
    assert.equal(timers.size, 0);
  });
});
