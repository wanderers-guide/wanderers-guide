import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const { transformSync } = require('esbuild');
const source = readFileSync(new URL('../src/startup-recovery.ts', import.meta.url), 'utf8');
const code = transformSync(source, { loader: 'ts', target: 'es2020' }).code;
const tick = () => new Promise((resolve) => setImmediate(resolve));

/** Execute the real pre-bundle script with controlled browser boundaries and deadlines. */
function startup(options = {}) {
  const timers = new Map();
  let nextTimer = 0;
  const setTimeout = (callback, delay) => {
    timers.set(++nextTimer, { callback, delay });
    return nextTimer;
  };
  const clearTimeout = (id) => timers.delete(id);
  const document = Object.assign(new EventTarget(), {
    getElementById: () => ({ childNodes: options.children ?? [] }),
  });
  const window = Object.assign(new EventTarget(), { setTimeout, clearTimeout });
  const storage = options.storage ?? new Map();
  const effects = [];
  const controller = { scriptURL: 'https://fixture.invalid/sw.js' };
  const registration = {
    scope: 'https://fixture.invalid/',
    active: controller,
    unregister: async () => {
      effects.push('unregister');
      return true;
    },
    ...options.registration,
  };
  const navigator = {
    onLine: options.online ?? true,
    serviceWorker: {
      controller: options.controller === undefined ? controller : options.controller,
      getRegistration: async () => registration,
    },
  };
  const warnings = [];
  const context = {
    window,
    document,
    navigator,
    URL,
    Event,
    AbortController,
    setTimeout,
    clearTimeout,
    console: { warn: (...args) => warnings.push(args) },
    location: { origin: 'https://fixture.invalid', reload: () => effects.push('reload') },
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        if (options.storageDenied) throw new Error('Storage disabled');
        storage.set(key, value);
      },
    },
    fetch:
      options.fetch ??
      (async (url, init) => {
        assert.equal(url.pathname, '/index.html');
        assert(url.searchParams.has('wg-startup-probe'));
        assert.equal(init.cache, 'no-store');
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'text/html' }),
          text: async () => '<div id="root"></div><script type="module"></script>',
        };
      }),
  };
  runInNewContext(code, context);
  return {
    ...context,
    effects,
    registration,
    storage,
    warnings,
    timers,
    async timeout(delay = 20000) {
      const entry = [...timers].find(([, timer]) => timer.delay === delay);
      assert(entry, `Missing ${delay}ms deadline`);
      timers.delete(entry[0]);
      entry[1].callback();
      await tick();
    },
  };
}

test('a blank controlled startup retires the stale worker and reloads once, preserving stored edits', async () => {
  const storage = new Map([
    ['draft', 'unsaved text'],
    ['auth', 'saved login'],
  ]);
  const page = startup({ storage });
  await page.timeout();
  assert.deepEqual(page.effects, ['unregister', 'reload']);
  assert.equal(storage.get('draft'), 'unsaved text');
  assert.equal(storage.get('auth'), 'saved login');
  const retry = startup({ storage });
  await retry.timeout();
  assert.deepEqual(retry.effects, [], 'a second broken startup cannot enter a reload loop');
});

test('starting the app permanently cancels the watchdog, including an already queued callback', async () => {
  const page = startup();
  const callback = [...page.timers.values()][0].callback;
  page.window.dispatchEvent(new Event('wg:app-started'));
  callback();
  page.window.dispatchEvent(new Event('online'));
  await tick();
  assert.deepEqual(page.effects, []);
  assert.equal(page.timers.size, 0);
});

for (const event of ['input', 'change', 'submit']) {
  test(`${event} disables recovery even before the app readiness signal`, async () => {
    const page = startup();
    const callback = [...page.timers.values()][0].callback;
    page.document.dispatchEvent(new Event(event));
    callback();
    await tick();
    assert.deepEqual(page.effects, []);
  });
}

test('a mounted page is never inferred to be saved or safe to reload', async () => {
  const page = startup({ children: [{}] });
  await page.timeout();
  assert.deepEqual(page.effects, []);
});

test('offline startup stays intact and can recover when connectivity returns', async () => {
  const page = startup({ online: false });
  await page.timeout();
  assert.deepEqual(page.effects, []);
  page.navigator.onLine = true;
  page.window.dispatchEvent(new Event('online'));
  await tick();
  assert.deepEqual(page.effects, ['unregister', 'reload']);
});

for (const [name, fetch] of [
  [
    'network failure',
    async () => {
      throw new Error('Offline');
    },
  ],
  ['server error', async () => ({ ok: false })],
  ['wrong content type', async () => ({ ok: true, headers: new Headers({ 'content-type': 'text/plain' }) })],
  [
    'non-app HTML',
    async () => ({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<h1>Unavailable</h1>',
    }),
  ],
]) {
  test(`${name} does not remove offline support or reload`, async () => {
    const page = startup({ fetch });
    await page.timeout();
    assert.deepEqual(page.effects, []);
  });
}

test('storage denial fails closed without unregistering or reloading', async () => {
  const page = startup({ storageDenied: true });
  await page.timeout();
  assert.deepEqual(page.effects, []);
});

test('unrelated workers and uncontrolled pages are untouched', async () => {
  for (const controller of [null, { scriptURL: 'https://fixture.invalid/other-worker.js' }]) {
    const page = startup({ controller });
    await page.timeout();
    assert.deepEqual(page.effects, []);
  }
});

test('a hanging worker API times out and never reloads on a late completion', async () => {
  let finish;
  const page = startup({
    registration: {
      unregister: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    },
  });
  await page.timeout();
  await page.timeout(4000);
  finish(true);
  await tick();
  assert.deepEqual(page.effects, []);
});

test('an app starting during the network probe prevents retirement and reload', async () => {
  let respond;
  const page = startup({
    fetch: () =>
      new Promise((resolve) => {
        respond = resolve;
      }),
  });
  await page.timeout();
  page.window.dispatchEvent(new Event('wg:app-started'));
  respond({
    ok: true,
    headers: new Headers({ 'content-type': 'text/html' }),
    text: async () => '<div id="root"></div><script type="module"></script>',
  });
  await tick();
  assert.deepEqual(page.effects, []);
});

test('an app starting during unregister is never reloaded', async () => {
  let finish;
  const page = startup({
    registration: {
      unregister: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    },
  });
  await page.timeout();
  page.window.dispatchEvent(new Event('wg:app-started'));
  finish(true);
  await tick();
  assert.deepEqual(page.effects, []);
});
