/** Control the actual App auth effect's promise/event order without rendering unrelated UI. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { transformSync } from 'esbuild';

const source = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const effect = source.match(/useEffect\(\(\) => \{\n    resetContentStore\(\);([\s\S]*?)\n  \}, \[\]\);/);
assert(effect, 'exercise App’s real auth effect');
const compiled = transformSync(`function mountAuth(){resetContentStore();${effect[1]}}`, { loader: 'ts' }).code;
const older = { user: { id: 'older-account' } },
  newer = { user: { id: 'newer-account' } };
function mount() {
  let resolve,
    reject,
    callback,
    state,
    actor,
    clears = 0,
    cached = true,
    expired = 0,
    unsubscribed = false;
  const initial = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  const cleanup = new Function(
    'resetContentStore',
    'supabase',
    'setContentCacheActor',
    'setSession',
    'getCachedPublicUser',
    'clearUserData',
    'resetSessionExpired',
    'markSessionExpired',
    'window',
    compiled + ';return mountAuth();'
  )(
    () => {},
    {
      auth: {
        getSession: () => initial,
        onAuthStateChange: (handler) => {
          callback = handler;
          return {
            data: {
              subscription: {
                unsubscribe: () => {
                  unsubscribed = true;
                },
              },
            },
          };
        },
      },
    },
    (value) => {
      actor = value;
    },
    (value) => {
      state = typeof value === 'function' ? value(state) : value;
    },
    () => (cached ? { user_id: 'cached-account' } : null),
    () => {
      clears++;
      cached = false;
    },
    () => {},
    () => {
      expired++;
    },
    { location: { pathname: '/sheet/1' } }
  );
  return {
    emit: (event, value) => callback(event, value),
    cleanup,
    async finish(value) {
      resolve({ data: { session: value } });
      await new Promise(setImmediate);
    },
    async fail() {
      reject(new Error('Synthetic initial storage failure'));
      await new Promise(setImmediate);
    },
    get state() {
      return state;
    },
    get actor() {
      return actor;
    },
    get clears() {
      return clears;
    },
    get expired() {
      return expired;
    },
    get unsubscribed() {
      return unsubscribed;
    },
  };
}
test('late initial account cannot overwrite a newer sign-in or its cache actor', async () => {
  const h = mount();
  h.emit('SIGNED_IN', newer);
  await h.finish(older);
  assert.equal(h.state, newer);
  assert.equal(h.actor, newer.user.id);
  assert.equal(h.clears, 0);
});
test('late signed-out initial snapshot cannot clear a newer signed-in profile', async () => {
  const h = mount();
  h.emit('SIGNED_IN', newer);
  await h.finish(null);
  assert.equal(h.state, newer);
  assert.equal(h.actor, newer.user.id);
  assert.equal(h.clears, 0);
});
test('late initial account cannot resurrect an intentional or expired sign-out', async () => {
  const h = mount();
  h.emit('SIGNED_OUT', null);
  await h.finish(older);
  assert.equal(h.state, null);
  assert.equal(h.actor, null);
  assert.equal(h.clears, 1);
  assert.equal(h.expired, 1);
});
test('late INITIAL_SESSION event cannot supersede a later live sign-in', async () => {
  const h = mount();
  h.emit('SIGNED_IN', newer);
  h.emit('INITIAL_SESSION', older);
  await h.finish(older);
  assert.equal(h.state, newer);
  assert.equal(h.actor, newer.user.id);
});
test('absent INITIAL_SESSION clears cached chrome before the initial read without reporting expiry', async () => {
  const h = mount();
  h.emit('INITIAL_SESSION', null);
  await h.finish(null);
  assert.equal(h.state, null);
  assert.equal(h.actor, null);
  assert.equal(h.clears, 1);
  assert.equal(h.expired, 0);
});
test('absent initial read and later INITIAL_SESSION clear cached chrome only once', async () => {
  const h = mount();
  await h.finish(null);
  h.emit('INITIAL_SESSION', null);
  assert.equal(h.state, null);
  assert.equal(h.clears, 1);
  assert.equal(h.expired, 0);
});
test('uncontested initial read still establishes the account and cache actor', async () => {
  const h = mount();
  await h.finish(older);
  assert.equal(h.state, older);
  assert.equal(h.actor, older.user.id);
});
test('failed initial read still releases an uninitialized route', async () => {
  const h = mount();
  await h.fail();
  assert.equal(h.state, null);
});
test('a newer auth event remains authoritative after initial read failure', async () => {
  const h = mount();
  h.emit('SIGNED_IN', newer);
  await h.fail();
  assert.equal(h.state, newer);
  assert.equal(h.actor, newer.user.id);
});
test('cleanup prevents pending reads and retained callbacks changing the next mount', async () => {
  const h = mount();
  h.cleanup();
  h.emit('SIGNED_IN', newer);
  await h.finish(older);
  assert.equal(h.state, undefined);
  assert.equal(h.actor, undefined);
  assert.equal(h.unsubscribed, true);
});
