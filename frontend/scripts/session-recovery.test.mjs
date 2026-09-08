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
  define: {
    'import.meta.env.VITE_SUPABASE_KEY': JSON.stringify('anonymous-project-key'),
    'import.meta.env.PROD': 'false',
  },
  stdin: {
    contents: `export * from './src/request/request-manager'; export * from './src/request/request-rejection'; export * from './src/utils/character-save-buffer';`,
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

test('character writes can distinguish confirmed input rejection without changing default callers', async () => {
  for (const response of [
    http(400, { message: 'Invalid input' }),
    http(413, { message: 'Payload too large' }),
    http(422, { message: 'Invalid character value' }),
    { data: { status: 'fail', data: { name: 'Invalid input' } }, error: null },
  ]) {
    calls = [];
    invoke = async () => response;
    await assert.rejects(
      api.makeRequest('update-character', { id: 1 }, false, { throwOnRejection: true }),
      api.RequestRejectedError
    );
    assert.equal(calls.length, 1);
    assert.equal(refreshes, 0);
    assert.equal(notices, 0);
    assert.equal(await api.makeRequest('update-character', { id: 1 }, false), null);
  }
});

test('rejection-aware writes preserve JWT recovery and never classify ambiguous failures as rejected', async () => {
  invoke = async () => (calls.length === 1 ? expired() : ok());
  assert.deepEqual(await api.makeRequest('update-character', { id: 1 }, false, { throwOnRejection: true }), [
    { id: 1 },
  ]);
  assert.equal(refreshes, 1);
  for (const response of [
    http(429, { status: 'fail', data: { message: 'Rate limited' } }),
    http(500, { message: 'Server failure' }),
    http(503, { message: 'Unavailable' }),
    { data: null, error: new FunctionsFetchError('Offline') },
    { data: null, error: new Error('Timeout') },
    { data: { status: 'error', message: 'Unavailable' }, error: null },
  ]) {
    calls = [];
    invoke = async () => response;
    assert.equal(await api.makeRequest('update-character', { id: 1 }, false, { throwOnRejection: true }), null);
    assert.equal(calls.length, 1);
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

test('a signed-out request is explicitly anonymous even if sign-in races invocation', async () => {
  session = null;
  invoke = async () => {
    session = signedIn('newly-signed-in-token');
    return ok();
  };
  await api.makeRequest('find-character', { id: 1 });
  assert.equal(calls[0].headers.Authorization, 'Bearer anonymous-project-key');
});

test('an older acknowledgement cannot discard newly calculation-required input with identical fields', () => {
  api.bufferCharacterSave(character(), 'owner', 'version-1', { requiresCalculation: true, base: character() });
  api.acknowledgeBufferedCharacterSave(1, 'owner', character(), 'version-1', 'version-2');
  assert.equal(savedDraft().draft.requiresCalculation, true);
  assert.equal(savedDraft().draft.body.expected_updated_at, 'version-2');
  api.acknowledgeBufferedCharacterSave(1, 'owner', character(), 'version-2', 'version-2', true);
  assert.deepEqual(savedDraft(), { status: 'none' });
});

test('strict reads distinguish a successful missing record from transport and JSend failures', async () => {
  invoke = async () => ok(null);
  assert.equal(await api.makeRequest('find-language', { id: 123 }, false, { throwOnFailure: true }), null);
  invoke = async () => ({ data: { status: 'error', message: 'Unavailable' }, error: null });
  await assert.rejects(api.makeRequest('find-language', {}, false, { throwOnFailure: true }), /Request failed/);
  invoke = async () => http(500, { message: 'Unavailable' });
  await assert.rejects(api.makeRequest('find-language', {}, false, { throwOnFailure: true }), /Request failed/);
});

test('acknowledging one tab cannot advance another tab draft past independent saved HP', () => {
  const base = { ...character('Original'), hp_current: 20 };
  const tabA = { ...base, hp_current: 10 };
  const tabB = { ...base, name: 'Offline rename' };
  api.bufferCharacterSave(tabB, 'owner', 'version-1', {
    requiresCalculation: false,
    base,
    writerId: 'tab-b',
  });
  api.acknowledgeBufferedCharacterSave(1, 'owner', tabA, 'version-1', 'version-2', false, 'tab-a');
  const retained = api.getBufferedCharacterSave(1, 'owner', 'tab-b');
  assert.equal(retained.draft.body.expected_updated_at, 'version-1');
  assert.equal(retained.draft.base.hp_current, 20);
  assert.equal(retained.draft.body.name, 'Offline rename');
});

test('two offline tabs retain independent durable copies', () => {
  for (const writerId of ['tab-a', 'tab-b']) {
    api.bufferCharacterSave(character(writerId), 'owner', 'version-1', {
      requiresCalculation: false,
      base: character('Original'),
      writerId,
    });
  }
  assert.equal(api.getBufferedCharacterSave(1, 'owner', 'tab-a').draft.body.name, 'tab-a');
  assert.equal(api.getBufferedCharacterSave(1, 'owner', 'tab-b').draft.body.name, 'tab-b');
});

test('a same-tab newer intentional revert is rebased onto its acknowledged in-flight save', () => {
  const base = { ...character('Original'), hp_current: 20 };
  const submitted = { ...base, hp_current: 10 };
  api.bufferCharacterSave(base, 'owner', 'version-1', {
    requiresCalculation: false,
    base,
    writerId: 'tab-a',
  });
  api.acknowledgeBufferedCharacterSave(1, 'owner', submitted, 'version-1', 'version-2', false, 'tab-a');
  const retained = api.getBufferedCharacterSave(1, 'owner', 'tab-a');
  assert.equal(retained.draft.body.hp_current, 20);
  assert.equal(retained.draft.base.hp_current, 10);
  assert.equal(retained.draft.body.expected_updated_at, 'version-2');
});

test('restoration discovers every versioned copy without a network write or destructive claim', () => {
  for (const writerId of ['tab-a', 'tab-b']) {
    api.bufferCharacterSave(character(writerId), 'owner', 'version-1', {
      requiresCalculation: writerId === 'tab-b',
      base: character('Original'),
      writerId,
    });
  }
  const before = [...localStorage.data.entries()];
  const loaded = api.loadBufferedCharacterSaves(1, 'owner');
  assert.equal(loaded.status, 'loaded');
  assert.equal(loaded.records.length, 2);
  assert.deepEqual(loaded.retained, []);
  assert.deepEqual(
    loaded.records.map((record) => record.draft.body.name),
    ['tab-a', 'tab-b']
  );
  assert.deepEqual(api.loadBufferedCharacterSaves(1, 'owner'), loaded);
  assert.deepEqual([...localStorage.data.entries()], before);
  assert.equal(calls.length, 0);
});

test('acknowledging a recovered copy preserves a newer edit written by its original tab', () => {
  const options = { requiresCalculation: false, base: character('Original'), writerId: 'other-tab' };
  api.bufferCharacterSave(character('Recovered edit'), 'owner', 'version-1', options);
  const record = api.loadBufferedCharacterSaves(1, 'owner').records[0];
  api.bufferCharacterSave(character('Newer edit'), 'owner', 'version-1', options);
  assert.equal(api.acknowledgeBufferedCharacterRecovery(record).status, 'unchanged');
  assert.equal(api.getBufferedCharacterSave(1, 'owner', 'other-tab').draft.body.name, 'Newer edit');
  const newer = api.loadBufferedCharacterSaves(1, 'owner').records[0];
  assert.equal(api.acknowledgeBufferedCharacterRecovery(newer).status, 'removed');
  assert.deepEqual(api.getBufferedCharacterSave(1, 'owner', 'other-tab'), { status: 'none' });
});

test('restoration only exposes the requested actor drafts, including campaign editor copies', () => {
  for (const actor of ['owner', 'gm']) {
    api.bufferCharacterSave(character(actor), actor, 'version-1', {
      requiresCalculation: false,
      base: character('Original'),
    });
  }
  assert.deepEqual(api.loadBufferedCharacterSaves(1, 'other'), { status: 'loaded', records: [], retained: [] });
  assert.equal(api.loadBufferedCharacterSaves(1, 'gm').records[0].draft.body.name, 'gm');
  assert.equal(api.loadBufferedCharacterSaves(1, 'owner').records[0].draft.body.name, 'owner');
  assert.equal(calls.length, 0);
});

test('legacy bearer-token copies migrate without network access and remain explicit recovery', () => {
  const token = `header.${Buffer.from(JSON.stringify({ sub: 'owner' })).toString('base64url')}.expired-signature`;
  localStorage.setItem('autosave-character-1', JSON.stringify({ token, body: { id: 1, name: 'Legacy draft' } }));
  const foreign = api.loadBufferedCharacterSaves(1, 'gm');
  assert.deepEqual(foreign, { status: 'loaded', records: [], retained: [] });
  assert.ok(localStorage.getItem('autosave-character-1').includes(token));
  const result = api.loadBufferedCharacterSaves(1, 'owner');
  assert.deepEqual(result.records, []);
  assert.equal(result.retained[0].reason, 'unversioned');
  assert.equal(result.retained[0].body.name, 'Legacy draft');
  assert.equal(localStorage.getItem('autosave-character-1'), null);
  assert.ok([...localStorage.data.values()].every((raw) => !raw.includes(token)));
  assert.equal(calls.length, 0);
});

test('legacy account drafts migrate independently from new page drafts and preserve existing recovery', () => {
  const legacy = {
    version: 1,
    actorId: 'owner',
    body: { ...character('Old tab draft'), expected_updated_at: 'version-1' },
    base: character('Original'),
  };
  localStorage.setItem('autosave-character-1-owner', JSON.stringify(legacy));
  localStorage.setItem(
    'autosave-character-recovery-1-owner',
    JSON.stringify({
      ...legacy,
      body: { ...legacy.body, name: 'Previously rejected copy' },
    })
  );
  api.bufferCharacterSave(character('Current tab draft'), 'owner', 'version-1', {
    requiresCalculation: false,
    base: character('Original'),
  });
  const result = api.loadBufferedCharacterSaves(1, 'owner');
  assert.equal(result.records.length, 2);
  assert.deepEqual(result.records.map((record) => record.draft.body.name).sort(), [
    'Current tab draft',
    'Old tab draft',
  ]);
  assert.equal(result.retained[0].body.name, 'Previously rejected copy');
  assert.equal(result.retained[0].reason, 'recovery');
  assert.equal(localStorage.getItem('autosave-character-1-owner'), null);
});

test('invalid and incomplete drafts stay available without automatic restoration', () => {
  const inputs = [
    { body: { id: 1, name: 'Unversioned' }, base: character('Original') },
    { body: { id: 1, name: 'Missing base', expected_updated_at: 'version-1' } },
    { body: { id: 1, name: 'Wrong base', expected_updated_at: 'version-1' }, base: { ...character(), id: 2 } },
    { body: { id: 1, name: 'Invalid base', expected_updated_at: 'version-1' }, base: { id: 1 } },
  ];
  for (const [index, input] of inputs.entries()) {
    localStorage.setItem(
      `autosave-character-1-owner:writer:test-${index}`,
      JSON.stringify({
        version: 2,
        actorId: 'owner',
        writerId: `test-${index}`,
        requiresCalculation: true,
        ...input,
      })
    );
  }
  localStorage.setItem('autosave-character-1-owner:writer:broken', 'invalid json');
  const result = api.loadBufferedCharacterSaves(1, 'owner');
  assert.deepEqual(result.records, []);
  assert.equal(result.retained.length, 5);
  assert.equal(result.retained.filter((record) => record.body).length, 4);
  assert.equal(localStorage.length, 5);
  assert.equal(calls.length, 0);
});

test('lost-acknowledgement submissions survive newer edits and an intentional return to the original value', () => {
  const base = { ...character('Original'), hp_current: 20 };
  const submitted = { ...base, hp_current: 10 };
  const options = { requiresCalculation: false, base };
  api.bufferCharacterSave(submitted, 'owner', 'version-1', options);
  assert.equal(api.journalCharacterSaveSubmission(1, 'owner', submitted, 'version-1').status, 'stored');
  api.bufferCharacterSave(base, 'owner', 'version-1', options);
  const record = api.loadBufferedCharacterSaves(1, 'owner').records[0];
  assert.equal(record.draft.body.hp_current, 20);
  assert.equal(record.draft.submission.body.hp_current, 10);
  assert.equal(record.draft.submission.expectedUpdatedAt, 'version-1');
  assert.ok(!record.raw.includes('current-token'));
  api.acknowledgeBufferedCharacterSave(1, 'owner', submitted, 'version-1', 'version-2');
  assert.equal(savedDraft().draft.body.hp_current, 20);
  assert.equal(savedDraft().draft.base.hp_current, 10);
  assert.equal(savedDraft().draft.submission, undefined);
  api.acknowledgeBufferedCharacterSave(1, 'owner', base, 'version-2', 'version-3');
  assert.deepEqual(savedDraft(), { status: 'none' });
});

test('a stale acknowledgement never erases a different newer in-flight submission', () => {
  const base = { ...character('Original'), hp_current: 20 };
  const submitted = { ...base, hp_current: 10 };
  api.bufferCharacterSave(base, 'owner', 'version-2', { requiresCalculation: false, base: submitted });
  api.journalCharacterSaveSubmission(1, 'owner', base, 'version-2');
  assert.equal(api.acknowledgeBufferedCharacterSave(1, 'owner', base, 'version-1', 'version-2').status, 'unchanged');
  assert.equal(savedDraft().draft.submission.expectedUpdatedAt, 'version-2');
});

test('storage quota failures are explicit and preserve the previous durable copy', () => {
  api.bufferCharacterSave(character('Durable copy'), 'owner', 'version-1');
  const prior = savedDraft().raw;
  localStorage.setItem = () => {
    throw new Error('Quota exceeded');
  };
  assert.equal(api.bufferCharacterSave(character('Unsaved copy'), 'owner', 'version-1').status, 'unavailable');
  assert.equal(savedDraft().raw, prior);
  assert.equal(api.journalCharacterSaveSubmission(1, 'owner', character(), 'version-1').status, 'unavailable');
});

test('denied storage reads are explicit instead of pretending there are no unsynced edits', () => {
  localStorage.getItem = () => {
    throw new Error('Storage denied');
  };
  assert.equal(api.getBufferedCharacterSave(1, 'owner').status, 'unavailable');
  assert.equal(api.loadBufferedCharacterSaves(1, 'owner').status, 'unavailable');
  assert.equal(api.bufferCharacterSave(character(), 'owner', 'version-1').status, 'unavailable');
  assert.equal(
    api.acknowledgeBufferedCharacterSave(1, 'owner', character(), 'version-1', 'version-2').status,
    'unavailable'
  );
});

test('legacy migration never deletes the only copy when storage is full', () => {
  const legacy = JSON.stringify({
    version: 1,
    actorId: 'owner',
    body: { ...character(), expected_updated_at: 'version-1' },
    base: character('Original'),
  });
  localStorage.setItem('autosave-character-1-owner', legacy);
  localStorage.setItem = () => {
    throw new Error('Quota exceeded');
  };
  assert.equal(api.loadBufferedCharacterSaves(1, 'owner').status, 'unavailable');
  assert.equal(localStorage.getItem('autosave-character-1-owner'), legacy);
});

test('repeated unversioned edits retain the first and latest copies without filling storage', () => {
  for (let index = 0; index < 20; index++) api.bufferCharacterSave(character(`Edit ${index}`), 'owner');
  const result = api.loadBufferedCharacterSaves(1, 'owner');
  assert.equal(localStorage.length, 2);
  assert.deepEqual(result.records, []);
  assert.deepEqual(result.retained.map((record) => record.body.name).sort(), ['Edit 0', 'Edit 19']);
});

test('atomic reconciliation persists final intent and clears an obsolete journal without altering foreign copies', () => {
  const base = { ...character('Original'), hp_current: 20 };
  const submitted = { ...base, hp_current: 10 };
  const remote = { ...base, name: 'Remote rename', updated_at: 'version-2' };
  const merged = { ...remote, hp_current: 10 };
  api.bufferCharacterSave(submitted, 'owner', 'version-1', { requiresCalculation: false, base });
  api.journalCharacterSaveSubmission(1, 'owner', submitted, 'version-1');
  api.bufferCharacterSave(character('Other tab'), 'owner', 'version-1', {
    requiresCalculation: false,
    base,
    writerId: 'other-tab',
  });
  const foreign = api.getBufferedCharacterSave(1, 'owner', 'other-tab').raw;
  assert.equal(
    api.reconcileBufferedCharacterSave(merged, 'owner', remote, { requiresCalculation: false }).status,
    'stored'
  );
  const own = savedDraft().draft;
  assert.equal(own.body.name, 'Remote rename');
  assert.equal(own.body.hp_current, 10);
  assert.equal(own.base.hp_current, 20);
  assert.equal(own.body.expected_updated_at, 'version-2');
  assert.equal(own.submission, undefined);
  assert.equal(api.getBufferedCharacterSave(1, 'owner', 'other-tab').raw, foreign);
  assert.equal(
    api
      .loadBufferedCharacterSaves(1, 'owner')
      .records.find((record) => record.draft.writerId === api.CHARACTER_SAVE_WRITER_ID).draft.submission,
    undefined
  );
});

test('reconciliation retires an already accepted copy only after required calculation completes', () => {
  const base = { ...character('Original'), hp_current: 20 };
  const accepted = { ...base, hp_current: 10, updated_at: 'version-2' };
  api.bufferCharacterSave(accepted, 'owner', 'version-1', { requiresCalculation: false, base });
  api.journalCharacterSaveSubmission(1, 'owner', accepted, 'version-1');
  assert.equal(
    api.reconcileBufferedCharacterSave(accepted, 'owner', accepted, { requiresCalculation: true }).status,
    'stored'
  );
  assert.equal(savedDraft().draft.requiresCalculation, true);
  assert.equal(savedDraft().draft.submission, undefined);
  assert.equal(
    api.reconcileBufferedCharacterSave(accepted, 'owner', accepted, { requiresCalculation: false }).status,
    'removed'
  );
  assert.deepEqual(savedDraft(), { status: 'none' });
});
