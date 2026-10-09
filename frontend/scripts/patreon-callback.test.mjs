import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const { build } = createRequire(`${root}/package.json`)('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-patreon-callback-'));
after(() => rm(directory, { recursive: true, force: true }));
let effects, ref, params, calls, navigations, result;
globalThis.__patreonCallback = {
  session: undefined,
  effect: (fn) => effects.push(fn),
  ref: () => ref,
  search: () => [params],
  navigate: () => (path, options) => {
    assert.equal(options.replace, true);
    navigations.push(path);
  },
  query: () => ({
    invalidateQueries: async (options) => {
      assert.deepEqual(options.queryKey, ['find-account-self']);
    },
  }),
  request: async (...args) => {
    calls.push(args);
    return await result();
  },
};
globalThis.window = { location: { origin: 'https://fixture.invalid', replace: (value) => navigations.push(value) } };
const outfile = join(directory, 'callback.mjs');
await build({
  stdin: {
    contents: `export {Component} from './src/pages/PatreonRedirectPage'; export {AuthRouteWrapper} from './src/auth/AuthedRouteWrapper'; export {PATREON_AUTH_URL} from './src/constants/urls';`,
    resolveDir: root,
  },
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  jsx: 'automatic',
  tsconfig: `${root}/tsconfig.json`,
  define: { 'import.meta.env.VITE_PATREON_CLIENT_ID': '"fixture-v2-client"', 'import.meta.env.DEV': 'false' },
  plugins: [
    {
      name: 'component-boundaries',
      setup(b) {
        b.onResolve(
          {
            filter:
              /^(react(?:\/jsx-runtime)?|react-router-dom|jotai|@atoms\/supabaseAtoms|@mantine\/core|@tanstack\/react-query|@requests\/request-manager|@utils\/document-change)$/,
          },
          (a) => ({ path: a.path, namespace: 'fixture' })
        );
        b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
          contents: `export const useEffect=globalThis.__patreonCallback.effect,useRef=globalThis.__patreonCallback.ref,useSearchParams=globalThis.__patreonCallback.search,useNavigate=globalThis.__patreonCallback.navigate,useQueryClient=globalThis.__patreonCallback.query,makeRequest=globalThis.__patreonCallback.request; export const useAtomValue=()=>globalThis.__patreonCallback.session,sessionState={},useLocation=()=>({pathname:'/auth/patreon/redirect',search:'?code=one-use-code'}),Navigate='Navigate',Outlet='Outlet'; export const setPageTitle=()=>{},Loader=()=>null,jsx=(component,props)=>({component,props});`,
          loader: 'js',
        }));
      },
    },
  ],
});
const { Component, AuthRouteWrapper, PATREON_AUTH_URL } = await import(pathToFileURL(outfile).href);
async function render(query, action, run, strict = false) {
  params = new URLSearchParams(query);
  ref = { current: false };
  effects = [];
  calls = [];
  navigations = [];
  result = action;
  const realSet = globalThis.setTimeout,
    realClear = globalThis.clearTimeout;
  const timers = new Map();
  let id = 0;
  globalThis.setTimeout = (fn, ms) => {
    timers.set(++id, { fn, ms });
    return id;
  };
  globalThis.clearTimeout = (key) => timers.delete(key);
  const tick = async (ms) => {
    for (const [key, timer] of [...timers])
      if (timer.ms <= ms) {
        timers.delete(key);
        void timer.fn();
      }
    for (let n = 0; n < 10; n++) await Promise.resolve();
  };
  try {
    Component();
    let cleanup = effects.at(-1)();
    if (strict) {
      cleanup();
      Component();
      cleanup = effects.at(-1)();
    }
    await run(tick, cleanup);
    cleanup();
  } finally {
    globalThis.setTimeout = realSet;
    globalThis.clearTimeout = realClear;
  }
}
for (const [label, action] of [
  ['success', () => 'Patreon connected'],
  ['rejected request', () => null],
  [
    'exception',
    () => {
      throw Error('private failure');
    },
  ],
]) {
  test(`${label} exits quietly and consumes the callback once under StrictMode`, async () => {
    await render(
      'code=one-use-code',
      action,
      async (tick) => {
        await tick(100);
        assert.deepEqual(navigations, ['/account']);
        assert.equal(calls.length, 1);
        assert.equal(calls[0][2], false);
      },
      true
    );
  });
}
for (const query of ['', 'error=access_denied', 'error=access_denied&code=ignored']) {
  test(`missing/denied authorization never sends a request: ${query}`, async () => {
    await render(
      query,
      () => {
        throw Error('must not call');
      },
      async (tick) => {
        await tick(100);
        assert.deepEqual(navigations, ['/account']);
        assert.equal(calls.length, 0);
      }
    );
  });
}
test('stalled session/request cannot leave an indefinite loader or replay an OAuth code', async () => {
  await render(
    'code=code',
    () => new Promise(() => {}),
    async (tick) => {
      await tick(100);
      assert.equal(navigations.length, 0);
      await tick(35000);
      assert.deepEqual(navigations, ['/account']);
      assert.equal(calls.length, 1);
    }
  );
});
test('leaving the callback cancels pending setup and navigation', async () => {
  await render(
    'code=code',
    () => null,
    async (tick, cleanup) => {
      cleanup();
      await tick(35000);
      assert.equal(calls.length, 0);
      assert.equal(navigations.length, 0);
    }
  );
});
test('authorization URL uses configured v2 client and minimal identity scopes', () => {
  const url = new URL(PATREON_AUTH_URL);
  assert.equal(url.searchParams.get('client_id'), 'fixture-v2-client');
  assert.equal(url.searchParams.get('scope'), 'identity identity[email]');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://fixture.invalid/auth/patreon/redirect');
});
test('an unresolved session neither mounts the callback nor redirects through sign-in', () => {
  globalThis.__patreonCallback.session = undefined;
  assert.equal(AuthRouteWrapper(), null);
});
test('only a confirmed signed-out session redirects, preserving the callback destination', () => {
  globalThis.__patreonCallback.session = null;
  const result = AuthRouteWrapper();
  assert.equal(result.component, 'Navigate');
  assert.equal(result.props.replace, true);
  assert.equal(result.props.to, '/login?redirect=auth%2Fpatreon%2Fredirect%3Fcode%3Done-use-code');
});
test('an established session mounts the protected route', () => {
  globalThis.__patreonCallback.session = { user: { id: 'fixture-actor' } };
  assert.equal(AuthRouteWrapper().component, 'Outlet');
});
