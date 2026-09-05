/** Exercise real request recovery and durable buffers with only auth/network/storage boundaries replaced. */
import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(`${root}/package.json`);
const { build } = require('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-session-tests-'));
class FunctionsHttpError extends Error {
  constructor(context) {
    super('HTTP error');
    this.context = context;
  }
}
class FunctionsFetchError extends Error {}
class FunctionsRelayError extends Error {}
class MemoryStorage {
  data = new Map();
  getItem(key) {
    return this.data.get(key) ?? null;
  }
  setItem(key, value) {
    this.data.set(key, value);
  }
  removeItem(key) {
    this.data.delete(key);
  }
  key(index) {
    return [...this.data.keys()][index] ?? null;
  }
  get length() {
    return this.data.size;
  }
}
let session;
let calls;
let refreshes;
let notices;
let hides;
let invoke;
let refresh;
const client = {
  auth: {
    getSession: async () => ({ data: { session }, error: null }),
    refreshSession: async () => {
      refreshes++;
      return refresh();
    },
  },
  functions: {
    invoke: async (type, options) => {
      calls.push({ type, ...options });
      return invoke(type, options);
    },
  },
};
globalThis.__sessionTest = {
  client,
  FunctionsHttpError,
  FunctionsFetchError,
  FunctionsRelayError,
  showNotification: () => notices++,
  hideNotification: () => hides++,
};
await build({
  absWorkingDir: root,
  define: { 'import.meta.env.VITE_SUPABASE_KEY': JSON.stringify('anonymous-project-key') },
  stdin: {
    contents: `export * from './src/request/request-manager'; export * from './src/utils/character-save-buffer';`,
    resolveDir: root,
  },
  outfile: join(directory, 'session.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  plugins: [
    {
      name: 'auth-boundaries',
      setup(b) {
        b.onResolve(
          {
            filter: /^(?:@supabase\/supabase-js|@utils\/error-handling|@mantine\/notifications|\.\.\/supabase-client)$/,
          },
          (args) => ({ path: args.path, namespace: 'boundary' })
        );
        b.onLoad({ filter: /.*/, namespace: 'boundary' }, (args) => ({
          loader: 'js',
          contents: args.path.includes('supabase-js')
            ? 'export const {FunctionsHttpError,FunctionsFetchError,FunctionsRelayError} = globalThis.__sessionTest;'
            : args.path.includes('supabase-client')
              ? 'export const supabase = globalThis.__sessionTest.client;'
              : args.path.includes('notifications')
                ? 'export const {showNotification,hideNotification} = globalThis.__sessionTest;'
                : 'export const logError = () => {}; export const throwError = () => {};',
        }));
      },
    },
  ],
});
const api = await import(pathToFileURL(join(directory, 'session.mjs')).href);
const originalError = console.error;
const originalTimer = globalThis.setTimeout;
console.error = () => {}; // Expected failures are asserted below, not emitted as noisy logs.
globalThis.setTimeout = (callback, delay, ...args) => originalTimer(callback, delay === 30000 ? delay : 0, ...args);
after(async () => {
  console.error = originalError;
  globalThis.setTimeout = originalTimer;
  await rm(directory, { recursive: true, force: true });
  delete globalThis.__sessionTest;
});
const signedIn = (token = 'current-token', id = 'owner') => ({
  access_token: token,
  refresh_token: 'refresh-token',
  user: { id },
});
const ok = (data = [{ id: 1 }]) => ({ data: { status: 'success', data }, error: null });
const http = (status, payload) => ({
  data: null,
  error: new FunctionsHttpError(new Response(JSON.stringify(payload), { status })),
});
const expired = () => http(400, { status: 'fail', data: { error: { code: 'PGRST301', message: 'JWT expired' } } });
const character = (name = 'Local draft') => ({ id: 1, user_id: 'owner', name, level: 2, updated_at: 'version-1' });
const savedDraft = (actor = 'owner') => api.getBufferedCharacterSave(1, actor);
beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
  session = signedIn();
  calls = [];
  refreshes = 0;
  notices = 0;
  hides = 0;
  invoke = async () => ok();
  refresh = async () => {
    session = signedIn('fresh-token');
    return { data: { session }, error: null };
  };
  api.resetSessionExpiredNotice();
  hides = 0;
});

test('legacy HTTP 400/PGRST301 refreshes and replays exactly once with the fresh token', async () => {
  invoke = async () => (calls.length === 1 ? expired() : ok());
  assert.deepEqual(await api.makeRequest('update-character', { id: 1 }), [{ id: 1 }]);
  assert.equal(refreshes, 1);
  assert.equal(calls.length, 2);
  assert.deepEqual(
    calls.map((c) => c.headers.Authorization),
    ['Bearer current-token', 'Bearer fresh-token']
  );
  assert.equal(notices, 0);
});

test('gateway HTTP 401 Invalid JWT is recoverable', async () => {
  invoke = async () => (calls.length === 1 ? http(401, { message: 'Invalid JWT' }) : ok());
  assert.deepEqual(await api.makeRequest('update-character', { id: 1 }), [{ id: 1 }]);
  assert.equal(refreshes, 1);
  assert.equal(calls.length, 2);
});

test('many concurrent rejected requests share one refresh', async () => {
  invoke = async (_type, options) => (options.headers.Authorization === 'Bearer current-token' ? expired() : ok());
  const results = await Promise.all(Array.from({ length: 16 }, () => api.makeRequest('update-character', { id: 1 })));
  assert.equal(refreshes, 1);
  assert.equal(calls.length, 32);
  assert.ok(results.every((result) => result?.[0]?.id === 1));
});

test('one rejected auth retry stops and shows a persistent, resettable notice', async () => {
  localStorage.setItem('user-data', '{"id":"owner"}');
  invoke = async () => expired();
  assert.equal(await api.makeRequest('update-character', { id: 1 }), null);
  assert.equal(refreshes, 1);
  assert.equal(calls.length, 2);
  assert.equal(notices, 1);
  assert.equal(api.hasSessionExpiredNotice(), true);
  api.resetSessionExpiredNotice();
  assert.equal(api.hasSessionExpiredNotice(), false);
  assert.ok(hides > 0);
});

test('expired saved session with no refreshable session surfaces the auth notice', async () => {
  session = null;
  localStorage.setItem('user-data', '{"id":"owner"}');
  invoke = async () => expired();
  assert.equal(await api.makeRequest('update-character', { id: 1 }), null);
  assert.equal(refreshes, 0);
  assert.equal(calls.length, 1);
  assert.equal(notices, 1);
});

test('permission, API-key, and application failures never trigger auth retries', async () => {
  for (const response of [
    http(403, { code: 'PGRST301' }),
    http(401, { message: 'Invalid API Key' }),
    http(400, { message: 'Invalid input' }),
    { data: { status: 'error', message: 'JWT expired' }, error: null },
  ]) {
    calls = [];
    invoke = async () => response;
    assert.equal(await api.makeRequest('update-character', { id: 1 }), null);
    assert.equal(calls.length, 1);
    assert.equal(refreshes, 0);
    assert.equal(notices, 0);
  }
});

test('a changed account cannot inherit an old request or receive its expired-session notice', async () => {
  invoke = async () => {
    session = signedIn('other-token', 'other');
    return expired();
  };
  assert.equal(await api.makeRequest('update-character', { id: 1 }), null);
  assert.equal(calls.length, 1);
  assert.equal(refreshes, 0);
  assert.equal(notices, 0);
  assert.equal(await api.makeRequest('update-character', { id: 1 }, false, { expectedActorId: 'owner' }), null);
  assert.equal(calls.length, 1);
});

test('a timeout never sends a replacement write', async () => {
  globalThis.setTimeout = (callback, delay, ...args) => originalTimer(callback, delay === 30000 ? 1 : 0, ...args);
  try {
    invoke = () => new Promise(() => {});
    assert.equal(await api.makeRequest('update-character', { id: 1 }), null);
    assert.equal(calls.length, 1);
    assert.equal(refreshes, 0);
  } finally {
    globalThis.setTimeout = (callback, delay, ...args) => originalTimer(callback, delay === 30000 ? delay : 0, ...args);
  }
});

test('buffered saves contain no bearer token and replay with the current authenticated token', async () => {
  api.bufferCharacterSave(character(), 'owner', 'version-1');
  assert.equal(savedDraft().draft.actorId, 'owner');
  assert.equal(savedDraft().draft.body.expected_updated_at, 'version-1');
  assert.ok(!savedDraft().raw.includes('token'));
  session = signedIn('new-current-token');
  assert.deepEqual(await api.replayBufferedCharacterSave(1), { status: 'saved' });
  assert.equal(calls[0].headers.Authorization, 'Bearer new-current-token');
  assert.deepEqual(savedDraft(), { status: 'none' });
});

test('drafts survive every semantic rejection, empty response, and forbidden/conflict envelope', async () => {
  for (const response of [
    ok({ __conflict: true, character: { id: 1 } }),
    ok({ __forbidden: true }),
    ok([]),
    ok([{ id: 2 }]),
    { data: { status: 'fail', data: {} }, error: null },
    { data: { status: 'error', message: 'failed' }, error: null },
    { data: { data: [{ id: 1 }] }, error: null },
  ]) {
    api.bufferCharacterSave(character(), 'owner', 'version-1');
    invoke = async () => response;
    assert.equal((await api.replayBufferedCharacterSave(1)).status, 'retained');
    assert.equal(savedDraft().draft.body.name, 'Local draft');
  }
});

test('network failures retain the draft and remain bounded', async () => {
  api.bufferCharacterSave(character(), 'owner', 'version-1');
  invoke = async () => ({ data: null, error: new FunctionsFetchError('offline') });
  assert.equal((await api.replayBufferedCharacterSave(1)).status, 'retained');
  assert.equal(calls.length, 1);
  assert.equal(savedDraft().draft.body.name, 'Local draft');
});

test('simultaneous replay attempts send one write', async () => {
  api.bufferCharacterSave(character(), 'owner', 'version-1');
  const results = await Promise.all([api.replayBufferedCharacterSave(1), api.replayBufferedCharacterSave(1)]);
  assert.deepEqual(results, [{ status: 'saved' }, { status: 'saved' }]);
  assert.equal(calls.length, 1);
});

test('acknowledging an older replay never removes a newer draft', async () => {
  api.bufferCharacterSave(character(), 'owner', 'version-1');
  invoke = async () => {
    api.bufferCharacterSave(character('Newer edit'), 'owner', 'version-1');
    return ok();
  };
  await api.replayBufferedCharacterSave(1);
  assert.equal(savedDraft().draft.body.name, 'Newer edit');
});

test('account switching cannot replay another actor draft, and GM drafts use their own actor', async () => {
  api.bufferCharacterSave(character(), 'owner', 'version-1');
  session = signedIn('gm-token', 'gm');
  assert.deepEqual(await api.replayBufferedCharacterSave(1), { status: 'none' });
  assert.equal(calls.length, 0);
  api.bufferCharacterSave(character('GM edit'), 'gm', 'version-1');
  await api.replayBufferedCharacterSave(1);
  assert.equal(calls[0].headers.Authorization, 'Bearer gm-token');
  assert.equal(savedDraft('owner').draft.body.name, 'Local draft');
});

test('legacy unversioned buffers expose a recoverable body and drop their expired bearer token', async () => {
  const token = `header.${Buffer.from(JSON.stringify({ sub: 'owner' })).toString('base64url')}.expired-signature`;
  localStorage.setItem('autosave-character-1', JSON.stringify({ token, body: { id: 1, name: 'Legacy draft' } }));
  const result = await api.replayBufferedCharacterSave(1);
  assert.equal(result.status, 'retained');
  assert.equal(result.reason, 'unversioned');
  assert.equal(result.body.name, 'Legacy draft');
  assert.equal(calls.length, 0);
  assert.equal(localStorage.getItem('autosave-character-1'), null);
  assert.ok(!savedDraft().raw.includes(token));
});

test('malformed drafts and signed-out sessions remain locally recoverable', async () => {
  localStorage.setItem('autosave-character-1-owner', 'invalid json');
  assert.equal((await api.replayBufferedCharacterSave(1)).reason, 'invalid');
  assert.equal(localStorage.getItem('autosave-character-1-owner'), 'invalid json');
  session = null;
  assert.equal((await api.replayBufferedCharacterSave(1)).reason, 'signed-out');
  assert.equal(calls.length, 0);
});

test('logout clears account caches but preserves every account draft', () => {
  api.bufferCharacterSave(character(), 'owner', 'version-1');
  api.bufferCharacterSave(character(), 'gm', 'version-1');
  localStorage.setItem('user-data', '{"id":"owner"}');
  localStorage.setItem('auth-token', 'session');
  api.clearSessionDataPreservingDrafts();
  assert.equal(localStorage.length, 2);
  assert.equal(savedDraft('owner').draft.actorId, 'owner');
  assert.equal(savedDraft('gm').draft.actorId, 'gm');
});

test('canonical AUTH_REQUIRED responses refresh before replaying', async () => {
  invoke = async () =>
    calls.length === 1
      ? http(401, { status: 'fail', data: { code: 'AUTH_REQUIRED', message: 'Sign in again.' } })
      : ok();
  assert.deepEqual(await api.makeRequest('update-character', { id: 1 }), [{ id: 1 }]);
  assert.equal(refreshes, 1);
  assert.equal(calls.length, 2);
});

test('ambiguous lost responses retry reads once and never duplicate mutations', async () => {
  for (const type of ['create-character', 'update-character', 'open-ai-request', 'vector-db-populate-collection']) {
    calls = [];
    invoke = async () => http(502, { message: 'lost response' });
    assert.equal(await api.makeRequest(type, { id: 1 }), null);
    assert.equal(calls.length, 1);
  }
  calls = [];
  invoke = async () => (calls.length === 1 ? { data: null, error: new FunctionsFetchError('offline') } : ok());
  assert.deepEqual(await api.makeRequest('find-character', { id: 1 }), [{ id: 1 }]);
  assert.equal(calls.length, 2);
});

test('a rejected copy survives subsequent editing, successful replay, and remount discovery', async () => {
  api.bufferCharacterSave(character('Rejected original'), 'owner', 'version-1');
  invoke = async () => ok({ __conflict: true });
  assert.equal((await api.replayBufferedCharacterSave(1)).recovery.name, 'Rejected original');
  api.bufferCharacterSave(character('Latest draft'), 'owner', 'version-2');
  invoke = async () => ok();
  const replayed = await api.replayBufferedCharacterSave(1);
  assert.equal(replayed.status, 'saved');
  assert.equal(replayed.recovery.name, 'Rejected original');
  const remounted = await api.replayBufferedCharacterSave(1);
  assert.equal(remounted.status, 'none');
  assert.equal(remounted.recovery.name, 'Rejected original');
  session = signedIn('other-token', 'other');
  assert.deepEqual(await api.replayBufferedCharacterSave(1), { status: 'none' });
});

test('a signed-out request is explicitly anonymous even if sign-in races invocation', async () => {
  session = null;
  invoke = async () => {
    session = signedIn('newly-signed-in-token');
    return ok();
  };
  await api.makeRequest('find-character', { id: 1 });
  assert.equal(calls[0].headers.Authorization, 'Bearer anonymous-project-key');
});

test('pending calculation input is never replayed without a matching valid base and server version', async () => {
  for (const options of [
    { base: { id: 2, name: 'Other character', level: 1 }, expected_updated_at: 'version-1' },
    { base: { id: 1 }, expected_updated_at: 'version-1' },
    { base: undefined, expected_updated_at: 'version-1' },
    { base: { id: 1, name: 'Character', level: 1 }, expected_updated_at: undefined },
  ]) {
    localStorage.setItem(
      'autosave-character-1-owner',
      JSON.stringify({
        version: 1,
        actorId: 'owner',
        requiresCalculation: true,
        base: options.base,
        body: { id: 1, name: 'Retained input', expected_updated_at: options.expected_updated_at },
      })
    );
    const result = await api.replayBufferedCharacterSave(1);
    assert.equal(result.status, 'retained');
    assert.equal(result.body.name, 'Retained input');
    assert.equal(calls.length, 0);
  }
});

test('an older acknowledgement cannot discard newly calculation-required input with identical fields', () => {
  api.bufferCharacterSave(character(), 'owner', 'version-1', { requiresCalculation: true, base: character() });
  api.acknowledgeBufferedCharacterSave(1, 'owner', character(), 'version-1', 'version-2');
  assert.equal(savedDraft().draft.requiresCalculation, true);
  assert.equal(savedDraft().draft.body.expected_updated_at, 'version-2');
  api.acknowledgeBufferedCharacterSave(1, 'owner', character(), 'version-2', 'version-2', true);
  assert.deepEqual(savedDraft(), { status: 'none' });
});
