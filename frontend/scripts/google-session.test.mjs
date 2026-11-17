/** Exercise the real configured Auth SDK and App subscription with synthetic browser storage and HTTP. */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { build, transformSync } from 'esbuild';
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const effect = app.match(/useEffect\(\(\) => \{\n    resetContentStore\(\);([\s\S]*?)\n  \}, \[\]\);/);
assert(effect);
const mountSource = transformSync(`function mountAuth(){resetContentStore();${effect[1]}}`, { loader: 'ts' }).code;
const user = {
  id: 'audit-user',
  aud: 'authenticated',
  email: 'audit@example.test',
  app_metadata: { provider: 'google', providers: ['google'] },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
};
const token = (suffix = 'initial') =>
  [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(
      JSON.stringify({
        sub: user.id,
        aud: 'authenticated',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64url'),
    suffix,
  ].join('.');
const session = (suffix = 'initial') => ({
  access_token: token(suffix),
  refresh_token: `fixture-refresh-${suffix}`,
  token_type: 'bearer',
  expires_in: 3600,
  user,
});
/** Create an isolated browser seam without replacing the real SDK, session storage, or App auth effect. */
async function withAuth(run, provider = 'google') {
  const callbackUser = { ...user, app_metadata: { provider, providers: [provider] } };
  const directory = await mkdtemp(join(tmpdir(), 'wg-google-auth-'));
  const names = ['window', 'document', 'localStorage', 'BroadcastChannel', 'fetch'];
  const descriptors = new Map(names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const values = new Map(),
    clients = [];
  let location = new URL('https://site.example.test/');
  let fetchMode = 'success',
    refreshes = 0,
    userReads = 0;
  let finishOldRefresh;
  const requests = [];
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  const globals = {
    window: {
      get location() {
        return location;
      },
      history: {
        state: null,
        replaceState(_s, _t, url) {
          location = new URL(url);
        },
      },
      addEventListener() {},
      removeEventListener() {},
    },
    document: { visibilityState: 'hidden', addEventListener() {}, removeEventListener() {} },
    localStorage: storage,
    BroadcastChannel: undefined,
    fetch: async (input, init = {}) => {
      const url = String(input);
      requests.push(new URL(url).pathname);
      if (url.includes('/auth/v1/user')) {
        if (fetchMode === 'callback-down')
          return Response.json({ message: 'temporary fixture outage' }, { status: 503 });
        if (fetchMode === 'callback-rejected')
          return Response.json({ error_code: 'bad_jwt', msg: 'Invalid token' }, { status: 401 });
        userReads++;
        if (fetchMode === 'callback-transient' && userReads === 1)
          return Response.json({ message: 'temporary callback validation outage' }, { status: 503 });
        return Response.json(callbackUser);
      }
      if (url.includes('/auth/v1/token')) {
        refreshes++;
        if (fetchMode === 'delayed-revoked' || fetchMode === 'delayed-success') {
          const outcome = fetchMode;
          return await new Promise((resolve) => {
            finishOldRefresh = () =>
              resolve(
                outcome === 'delayed-revoked'
                  ? Response.json(
                      { error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' },
                      { status: 400 }
                    )
                  : Response.json(session('older-refresh'))
              );
          });
        }
        if (fetchMode === 'transient' && refreshes === 1)
          return Response.json({ message: 'temporary fixture outage' }, { status: 503 });
        if (fetchMode === 'revoked')
          return Response.json(
            { error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' },
            { status: 400 }
          );
        return Response.json(session('renewed'));
      }
      throw new Error(`Unexpected test request path: ${new URL(url).pathname}`);
    },
  };
  for (const [name, value] of Object.entries(globals))
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  try {
    await build({
      absWorkingDir: new URL('..', import.meta.url).pathname,
      entryPoints: ['src/supabase-client.ts'],
      outfile: join(directory, 'client.mjs'),
      bundle: true,
      platform: 'node',
      format: 'esm',
      define: {
        'import.meta.env': JSON.stringify({
          VITE_SUPABASE_URL: 'https://backend.example.test',
          VITE_SUPABASE_KEY: 'fixture-public-key',
        }),
      },
    });
    async function load() {
      const { supabase } = await import(
        pathToFileURL(join(directory, 'client.mjs')).href + `?client=${clients.length}`
      );
      clients.push(supabase);
      let state;
      const events = [];
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
        mountSource + ';return mountAuth();'
      )(
        () => {},
        supabase,
        () => {},
        (value) => {
          state = typeof value === 'function' ? value(state) : value;
        },
        () => null,
        () => {},
        () => {},
        () => {},
        globalThis.window
      );
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => events.push(event));
      await supabase.auth.initialize();
      await new Promise(setImmediate);
      await supabase.auth.stopAutoRefresh();
      return {
        supabase,
        events,
        get state() {
          return state;
        },
        cleanup() {
          cleanup();
          subscription.unsubscribe();
        },
      };
    }
    await run({
      load,
      values,
      requests,
      setMode: (value) => {
        fetchMode = value;
        refreshes = 0;
        userReads = 0;
      },
      setUrl: (value) => {
        location = new URL(value);
      },
      getUrl: () => location,
      refreshCount: () => refreshes,
      finishOldRefresh: () => finishOldRefresh(),
      expireStoredSession: () => {
        for (const [key, value] of values) {
          const stored = JSON.parse(value);
          if (stored?.refresh_token)
            values.set(key, JSON.stringify({ ...stored, expires_at: Math.floor(Date.now() / 1000) - 10 }));
        }
      },
    });
  } finally {
    for (const client of clients) await client.auth.stopAutoRefresh();
    for (const [name, descriptor] of descriptors)
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    await rm(directory, { recursive: true, force: true });
  }
}
for (const provider of ['google', 'discord'])
  test(`${provider} callback persists the same actor across App startup and reload, removing callback tokens`, async () =>
    withAuth(async (h) => {
      const supplied = session();
      h.setUrl(
        'https://site.example.test/#' +
          new URLSearchParams({
            access_token: supplied.access_token,
            refresh_token: supplied.refresh_token,
            expires_in: '3600',
            token_type: 'bearer',
            provider_token: 'fixture-google-token',
          })
      );
      const first = await h.load();
      assert.equal(first.state?.user.id, user.id);
      assert.equal(h.getUrl().hash, '');
      assert(!first.events.includes('SIGNED_OUT'));
      first.cleanup();
      const reloaded = await h.load();
      assert.equal(reloaded.state?.user.id, user.id);
      assert(!reloaded.events.includes('SIGNED_OUT'));
      assert.equal((await reloaded.supabase.auth.getSession()).data.session.user.id, user.id);
      reloaded.cleanup();
    }, provider));
test('a transient refresh response preserves the signed-in actor and retries rather than signing out', async () =>
  withAuth(async (h) => {
    h.setUrl(
      'https://site.example.test/#' + new URLSearchParams({ ...session(), user: undefined, expires_in: '3600' })
    );
    const client = await h.load();
    h.setMode('transient');
    const refreshed = await client.supabase.auth.refreshSession();
    await new Promise(setImmediate);
    assert.equal(refreshed.error, null);
    assert.equal(refreshed.data.session.user.id, user.id);
    assert.equal(client.state?.user.id, user.id);
    assert(!client.events.includes('SIGNED_OUT'));
    assert.equal(h.refreshCount(), 2);
    client.cleanup();
  }));
test('a revoked refresh token clears the session instead of retaining a falsely authenticated account', async () =>
  withAuth(async (h) => {
    h.setUrl(
      'https://site.example.test/#' + new URLSearchParams({ ...session(), user: undefined, expires_in: '3600' })
    );
    const client = await h.load();
    h.expireStoredSession();
    h.setMode('revoked');
    const refreshed = await client.supabase.auth.refreshSession();
    await new Promise(setImmediate);
    assert(refreshed.error);
    assert.equal(client.state, null);
    assert(client.events.includes('SIGNED_OUT'));
    assert.equal((await client.supabase.auth.getSession()).data.session, null);
    client.cleanup();
  }));

test('a transient Google callback validation outage does not discard a valid OAuth session', async () =>
  withAuth(async (h) => {
    h.setMode('callback-transient');
    h.setUrl(
      'https://site.example.test/#' + new URLSearchParams({ ...session(), user: undefined, expires_in: '3600' })
    );
    const client = await h.load();
    assert.equal(client.state?.user.id, user.id);
    assert.equal((await client.supabase.auth.getSession()).data.session?.user.id, user.id);
    client.cleanup();
  }));

test('authentication rejections are terminal and are not retried', async () =>
  withAuth(async (h) => {
    h.setMode('callback-rejected');
    h.setUrl(
      'https://site.example.test/#' + new URLSearchParams({ ...session(), user: undefined, expires_in: '3600' })
    );
    const client = await h.load();
    assert.equal(client.state, null);
    assert.equal(h.requests.filter((path) => path === '/auth/v1/user').length, 1);
    client.cleanup();
  }));

test('a genuinely new login remains possible after rejecting a revoked session', async () =>
  withAuth(async (h) => {
    h.setUrl(
      'https://site.example.test/#' + new URLSearchParams({ ...session(), user: undefined, expires_in: '3600' })
    );
    const client = await h.load();
    h.expireStoredSession();
    h.setMode('revoked');
    await client.supabase.auth.refreshSession();
    await new Promise(setImmediate);
    h.setMode('success');
    const fresh = session('fresh-login');
    const response = await client.supabase.auth.setSession(fresh);
    await new Promise(setImmediate);
    assert.equal(response.error, null);
    assert.equal(client.state?.user.id, user.id);
    assert.equal(client.state?.access_token, fresh.access_token);
    client.cleanup();
  }));

test('persistent callback outages stop after three user-validation reads', async () =>
  withAuth(async (h) => {
    h.setMode('callback-down');
    h.setUrl(
      'https://site.example.test/#' + new URLSearchParams({ ...session(), user: undefined, expires_in: '3600' })
    );
    const client = await h.load();
    assert.equal(client.state, null);
    assert.equal(h.requests.filter((path) => path === '/auth/v1/user').length, 3);
    client.cleanup();
  }));

test('an older tab refresh rejection cannot erase a newer callback session', async () =>
  withAuth(async (h) => {
    h.setUrl('https://site.example.test/#' + new URLSearchParams({ ...session('old'), user: undefined }));
    const old = await h.load();
    h.setMode('delayed-revoked');
    const pending = old.supabase.auth.refreshSession();
    await new Promise(setImmediate);
    h.setMode('success');
    const freshSession = session('fresh');
    h.setUrl('https://site.example.test/#' + new URLSearchParams({ ...freshSession, user: undefined }));
    const fresh = await h.load();
    assert.equal(fresh.state?.access_token, freshSession.access_token);
    h.finishOldRefresh();
    await pending;
    assert.equal((await fresh.supabase.auth.getSession()).data.session?.access_token, freshSession.access_token);
    old.cleanup();
    fresh.cleanup();
  }));

test('an older tab successful refresh cannot overwrite a newer callback session', async () =>
  withAuth(async (h) => {
    h.setUrl('https://site.example.test/#' + new URLSearchParams({ ...session('old'), user: undefined }));
    const old = await h.load();
    h.setMode('delayed-success');
    const pending = old.supabase.auth.refreshSession();
    await new Promise(setImmediate);
    h.setMode('success');
    const freshSession = session('fresh');
    h.setUrl('https://site.example.test/#' + new URLSearchParams({ ...freshSession, user: undefined }));
    const fresh = await h.load();
    h.finishOldRefresh();
    await pending;
    assert.equal((await fresh.supabase.auth.getSession()).data.session?.access_token, freshSession.access_token);
    old.cleanup();
    fresh.cleanup();
  }));

test('a failed proactive refresh preserves an access token that is still valid', async () =>
  withAuth(async (h) => {
    h.setUrl('https://site.example.test/#' + new URLSearchParams({ ...session(), user: undefined }));
    const client = await h.load();
    h.setMode('revoked');
    assert((await client.supabase.auth.refreshSession()).error);
    assert.equal(client.state?.user.id, user.id);
    assert.equal((await client.supabase.auth.getSession()).data.session?.user.id, user.id);
    client.cleanup();
  }));
