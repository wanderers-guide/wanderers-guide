/** Exercise profile reads through the actual user and request managers, mocking only external boundaries. */
import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const directory = await mkdtemp(join(tmpdir(), 'wg-public-user-requests-'));
const originalStorage = globalThis.localStorage;
const originalError = console.error;
const records = new Map();
const state = (globalThis.__publicUserRequestsTest = {
  actor: 'actor-A',
  token: 'fixture-actor-A',
  requests: [],
  response: async () => ({ id: 1, user_id: 'actor-A', name: 'First profile' }),
  session: async () => ({
    data: {
      session: state.actor ? { user: { id: state.actor }, access_token: state.token } : null,
    },
    error: null,
  }),
  invoke: async (type, options) => {
    state.requests.push({ type, options });
    return { data: { status: 'success', data: await state.response(type, options) }, error: null };
  },
});
const readSession = state.session;
globalThis.localStorage = {
  getItem: (key) => records.get(key) ?? null,
  setItem: (key, value) => records.set(key, value),
  removeItem: (key) => records.delete(key),
};
console.error = () => {};
after(async () => {
  globalThis.localStorage = originalStorage;
  console.error = originalError;
  delete globalThis.__publicUserRequestsTest;
  await rm(directory, { recursive: true, force: true });
});

await build({
  absWorkingDir: frontend,
  stdin: { contents: "export * from './src/auth/user-manager';", resolveDir: frontend, loader: 'ts' },
  outfile: join(directory, 'user-manager.mjs'),
  platform: 'node',
  format: 'esm',
  bundle: true,
  define: { 'import.meta.env': JSON.stringify({ PROD: false, VITE_SUPABASE_KEY: 'fixture-public-key' }) },
  plugins: [
    {
      name: 'external-profile-boundaries',
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, ({ path }) => {
          if (path.endsWith('/supabase-client')) return { path: 'supabase-client', namespace: 'fixture' };
          if (path === '@mantine/notifications') return { path, namespace: 'fixture' };
        });
        builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
          loader: 'js',
          contents:
            path === 'supabase-client'
              ? `export const supabase = {
                  auth: { getSession: () => globalThis.__publicUserRequestsTest.session() },
                  functions: { invoke: (...args) => globalThis.__publicUserRequestsTest.invoke(...args) }
                };`
              : 'export const showNotification = () => {}; export const hideNotification = () => {};',
        }));
      },
    },
  ],
});
const users = await import(pathToFileURL(join(directory, 'user-manager.mjs')).href);

/** Control a transport response without changing the production modules under test. */
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  state.actor = 'actor-A';
  state.token = 'fixture-actor-A';
  state.session = readSession;
  state.requests.length = 0;
  state.response = async () => ({ id: 1, user_id: 'actor-A', name: 'First profile' });
  records.clear();
  users.clearUserData();
});

test('opt-in concurrent current-profile readers share one request without caching later reads', async () => {
  const response = deferred();
  state.response = () => response.promise;
  const pending = Array.from({ length: 12 }, () => users.getPublicUser(undefined, { sharedReadScope: 0 }));
  await new Promise((resolve) => setImmediate(resolve));
  const firstRequestCount = state.requests.length;
  const first = { id: 1, user_id: 'actor-A', name: 'First profile' };
  response.resolve(first);
  assert.deepEqual(
    await Promise.all(pending),
    Array.from({ length: 12 }, () => first)
  );
  assert.equal(firstRequestCount, 1, 'the package fan-out must not multiply profile HTTP requests');
  const updated = { ...first, name: 'Updated profile', subscribed_content_sources: [{ source_id: 9 }] };
  state.response = async () => updated;
  assert.deepEqual(
    await users.getPublicUser(undefined, { sharedReadScope: 0 }),
    updated,
    'a completed request never replaces a fresh profile read'
  );
  assert.equal(state.requests.length, 2);
  assert.deepEqual(users.getCachedPublicUser(), updated);
});

test('ordinary post-write reads stay independent and an older shared response cannot overwrite them', async () => {
  const older = deferred();
  const original = { id: 1, user_id: 'actor-A', name: 'Before profile write' };
  const updated = { ...original, name: 'After profile write', subscribed_content_sources: [{ source_id: 9 }] };
  state.response = () => older.promise;
  const pendingContentLookup = users.getPublicUser(undefined, { sharedReadScope: 0, throwOnFailure: true });
  await new Promise((resolve) => setImmediate(resolve));
  state.response = async () => updated;
  assert.deepEqual(await users.getPublicUser(), updated, 'post-write refresh issues its own new request');
  assert.equal(state.requests.length, 2);
  assert.deepEqual(users.getCachedPublicUser(), updated);
  const newContentLookup = users.getPublicUser(undefined, { sharedReadScope: 0, throwOnFailure: true });
  await new Promise((resolve) => setImmediate(resolve));
  const requestsAfterRefresh = state.requests.length;
  older.resolve(original);
  assert.deepEqual(await pendingContentLookup, original, 'the original current-actor caller still gets its response');
  assert.deepEqual(await newContentLookup, updated, 'new content readers cannot rejoin the pre-write transport');
  assert.equal(requestsAfterRefresh, 3);
  assert.deepEqual(users.getCachedPublicUser(), updated, 'slower old content reads cannot undo a fresh profile');
});

test('shared failures preserve each caller policy and a later request can recover', async () => {
  const previous = { id: 1, user_id: 'actor-A', name: 'Previously cached profile' };
  records.set('user-data', JSON.stringify(previous));
  const failed = deferred();
  state.response = async () => {
    await failed.promise;
    throw new Error('Synthetic profile transport failure');
  };
  const soft = users.getPublicUser(undefined, { sharedReadScope: 0 });
  const strict = users.getPublicUser(undefined, { sharedReadScope: 0, throwOnFailure: true });
  const rejected = assert.rejects(strict, /Request failed: get-user/);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.requests.length, 1);
  failed.resolve();
  assert.equal(await soft, null);
  await rejected;
  assert.deepEqual(users.getCachedPublicUser(), previous, 'failed reads do not poison a valid display profile');
  const recovered = { ...previous, name: 'Recovered profile' };
  state.response = async () => recovered;
  assert.deepEqual(await users.getPublicUser(undefined, { sharedReadScope: 0, throwOnFailure: true }), recovered);
  assert.equal(state.requests.length, 2, 'failed promises are not retained');
});

test('signed-out current-profile reads never invoke the API', async () => {
  state.actor = null;
  assert.equal(await users.getPublicUser(), null);
  assert.equal(await users.getPublicUser(undefined, { sharedReadScope: 0, throwOnFailure: true }), null);
  assert.equal(state.requests.length, 0);
  assert.equal(users.getCachedPublicUser(), null);
});

test('switching actors separates pending requests and rejects the obsolete current-profile result', async () => {
  const responseA = deferred();
  const profileA = { id: 1, user_id: 'actor-A' };
  const profileB = { id: 2, user_id: 'actor-B' };
  state.response = () => responseA.promise;
  const softA = users.getPublicUser(undefined, { sharedReadScope: 0 });
  const strictA = users.getPublicUser(undefined, { sharedReadScope: 0, throwOnFailure: true });
  const rejectedA = assert.rejects(strictA, /Current account changed/);
  await new Promise((resolve) => setImmediate(resolve));
  state.actor = 'actor-B';
  state.token = 'fixture-actor-B';
  state.response = async () => profileB;
  assert.deepEqual(await users.getPublicUser(undefined, { sharedReadScope: 0 }), profileB);
  assert.equal(state.requests.length, 2, 'B cannot join a pending request under A');
  responseA.resolve(profileA);
  assert.equal(await softA, null);
  await rejectedA;
  assert.deepEqual(users.getCachedPublicUser(), profileB);
});

test('signing out while a profile request is pending prevents returning or caching it', async () => {
  const response = deferred();
  state.response = () => response.promise;
  const pending = users.getPublicUser(undefined, { sharedReadScope: 0 });
  await new Promise((resolve) => setImmediate(resolve));
  state.actor = null;
  response.resolve({ id: 1, user_id: 'actor-A' });
  assert.equal(await pending, null);
  assert.equal(users.getCachedPublicUser(), null);
  assert.equal(state.requests.length, 1);
});

test('clearing account data invalidates old reads without removing a newer same-actor request', async () => {
  const oldResponse = deferred();
  const newResponse = deferred();
  state.response = () => oldResponse.promise;
  const old = users.getPublicUser(undefined, { sharedReadScope: 0, throwOnFailure: true });
  const rejectedOld = assert.rejects(old, /Current account changed/);
  await new Promise((resolve) => setImmediate(resolve));
  users.clearUserData();
  state.response = () => newResponse.promise;
  const current = users.getPublicUser(undefined, { sharedReadScope: 0 });
  await new Promise((resolve) => setImmediate(resolve));
  oldResponse.resolve({ id: 1, user_id: 'actor-A', name: 'Before clear' });
  await rejectedOld;
  const anotherCurrent = users.getPublicUser(undefined, { sharedReadScope: 0 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.requests.length, 2, 'the old finally must not evict the newer shared transport');
  const fresh = { id: 1, user_id: 'actor-A', name: 'After clear' };
  newResponse.resolve(fresh);
  assert.deepEqual(await current, fresh);
  assert.deepEqual(await anotherCurrent, fresh);
  assert.deepEqual(users.getCachedPublicUser(), fresh);
});

test('explicit public-profile ID reads remain independent and do not replace the current-user cache', async () => {
  const ownProfile = { id: 1, user_id: 'actor-A' };
  const publicProfile = { id: 2, user_id: 'other-actor' };
  records.set('user-data', JSON.stringify(ownProfile));
  const response = deferred();
  state.response = () => response.promise;
  const first = users.getPublicUser('other-actor', { sharedReadScope: 0 });
  const second = users.getPublicUser('other-actor', { sharedReadScope: 0 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.requests.length, 2);
  assert.deepEqual(
    state.requests.map(({ options }) => options.body),
    [{ id: 'other-actor' }, { id: 'other-actor' }]
  );
  response.resolve(publicProfile);
  assert.deepEqual(await first, publicProfile);
  assert.deepEqual(await second, publicProfile);
  assert.deepEqual(users.getCachedPublicUser(), ownProfile);
});

test('a same-actor token refresh can share the pending profile without restarting it', async () => {
  const response = deferred();
  state.response = () => response.promise;
  const first = users.getPublicUser(undefined, { sharedReadScope: 0 });
  await new Promise((resolve) => setImmediate(resolve));
  state.token = 'fixture-refreshed-actor-A';
  const second = users.getPublicUser(undefined, { sharedReadScope: 0 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.requests.length, 1, 'refreshing a token does not change the profile actor');
  const profile = { id: 1, user_id: 'actor-A' };
  response.resolve(profile);
  assert.deepEqual(await first, profile);
  assert.deepEqual(await second, profile);
  assert.deepEqual(users.getCachedPublicUser(), profile);
});

test('clearing account data during the initial session read cannot start an obsolete transport', async () => {
  const session = deferred();
  state.session = () => session.promise;
  const pending = users.getPublicUser(undefined, { sharedReadScope: 0, throwOnFailure: true });
  const rejected = assert.rejects(pending, /Current account changed/);
  users.clearUserData();
  session.resolve(await readSession());
  await rejected;
  assert.equal(state.requests.length, 0);
  assert.equal(users.getCachedPublicUser(), null);
});

test('clearing account data during final session verification cannot republish a completed response', async () => {
  const finalSession = deferred();
  let sessionReads = 0;
  state.session = () => (++sessionReads === 3 ? finalSession.promise : readSession());
  const pending = users.getPublicUser(undefined, { sharedReadScope: 0, throwOnFailure: true });
  const rejected = assert.rejects(pending, /Current account changed/);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sessionReads, 3, 'the transport has completed and is verifying the current actor');
  users.clearUserData();
  finalSession.resolve(await readSession());
  await rejected;
  assert.equal(users.getCachedPublicUser(), null);
});

test('content generations do not share pending profiles and old scopes cannot evict newer ones', async () => {
  const oldResponse = deferred();
  const newResponse = deferred();
  state.response = () => oldResponse.promise;
  const oldLookup = users.getPublicUser(undefined, { sharedReadScope: 0, throwOnFailure: true });
  await new Promise((resolve) => setImmediate(resolve));
  state.response = () => newResponse.promise;
  const newLookup = users.getPublicUser(undefined, { sharedReadScope: 1, throwOnFailure: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.requests.length, 2, 'a content reset cannot reuse a pre-write subscription snapshot');
  const older = { id: 1, user_id: 'actor-A', subscribed_content_sources: [] };
  oldResponse.resolve(older);
  assert.deepEqual(await oldLookup, older, 'changing content scope does not cancel its original callers');
  const secondNewLookup = users.getPublicUser(undefined, { sharedReadScope: 1, throwOnFailure: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.requests.length, 2, 'the old scope finally cannot remove the newer shared transport');
  const current = { ...older, subscribed_content_sources: [{ source_id: 9 }] };
  newResponse.resolve(current);
  assert.deepEqual(await newLookup, current);
  assert.deepEqual(await secondNewLookup, current);
  assert.deepEqual(users.getCachedPublicUser(), current);
  const later = { ...current, name: 'Later profile' };
  state.response = async () => later;
  assert.deepEqual(await users.getPublicUser(undefined, { sharedReadScope: 1 }), later);
  assert.equal(state.requests.length, 3, 'a completed scope never caches the transport result');
});
