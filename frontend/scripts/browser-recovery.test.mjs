import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const { build } = createRequire(`${root}/package.json`)('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-browser-recovery-'));
after(() => rm(directory, { recursive: true, force: true }));
let cleanup;
let host;
let shown = 0;
globalThis.__recovery = {
  effect: (fn, deps) => (host ? host.effect(fn, deps) : (cleanup = fn())),
  ref: (value) => (host ? host.ref(value) : { current: value }),
  state: (value) => host.state(value),
  query: (options) => {
    host.options = options;
    return host.snapshot;
  },
  show: () => {
    shown++;
  },
  hide: () => {},
};
const outfile = join(directory, 'recovery.mjs');
await build({
  stdin: {
    contents: `export {AppUpdates} from './src/common/AppUpdates'; export {useQuietRetry} from './src/utils/use-quiet-retry'; export {useCharacterContent} from './src/utils/use-character-content'; export {preloadImage} from './src/utils/images'; export {reportClientFailure} from './src/utils/client-errors';`,
    resolveDir: root,
  },
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  jsx: 'automatic',
  tsconfig: `${root}/tsconfig.json`,
  define: {
    'import.meta.env.PROD': 'true',
    'import.meta.env.VITE_SUPABASE_URL': '"https://fixture.invalid"',
    'import.meta.env.VITE_SUPABASE_KEY': '"public-fixture"',
    __WG_RELEASE__: '"abcdef123"',
  },
  plugins: [
    {
      name: 'ui-boundaries',
      setup(plugin) {
        plugin.onResolve(
          {
            filter:
              /^(react(?:\/jsx-runtime)?|@mantine\/core|@mantine\/notifications|\.\/strings|@tanstack\/react-query|@content\/content-store|@requests\/request-manager)$/,
          },
          (args) => ({ path: args.path, namespace: 'boundary' })
        );
        plugin.onLoad({ filter: /.*/, namespace: 'boundary' }, () => ({
          contents: `
      export const useEffect = globalThis.__recovery.effect;
      export const useRef = globalThis.__recovery.ref, useState = globalThis.__recovery.state;
      export const useQuery = globalThis.__recovery.query;
      export const defineDefaultSources = (_, sources) => sources;
      export const fetchContentSources = async () => [];
      export const fetchContentPackage = async () => ({});
      export const makeRequest = async () => ({content_sources: {enabled: [1]}});
      export const showNotification = globalThis.__recovery.show, hideNotification = globalThis.__recovery.hide;
      export const Button = 'button', Group = 'group', Text = 'text', Fragment = 'fragment';
      export const jsx = (type, props) => ({type,props}), jsxs = jsx;
      export const toLabel = value => value;
    `,
        }));
      },
    },
  ],
});
const { AppUpdates, useQuietRetry, useCharacterContent, preloadImage, reportClientFailure } = await import(
  pathToFileURL(outfile)
);
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
test('app updates stay quiet and never reload or activate underneath open edits', async () => {
  shown = 0;
  const order = [];
  let checks = 0;
  const registration = Object.assign(new EventTarget(), {
    waiting: { postMessage: () => order.push('activate') },
    update: async () => {
      checks++;
    },
  });
  const worker = Object.assign(new EventTarget(), { controller: {}, register: async () => registration });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { serviceWorker: worker, onLine: true },
  });
  globalThis.window = Object.assign(new EventTarget(), { location: { reload: () => order.push('reload') } });
  AppUpdates();
  await tick();
  worker.controller = registration.waiting;
  worker.dispatchEvent(new Event('controllerchange'));
  window.dispatchEvent(new Event('focus'));
  window.dispatchEvent(new Event('focus'));
  await tick();
  assert.equal(shown, 0, 'updates do not display maintenance prompts');
  assert.deepEqual(order, [], 'updates never activate or reload an open editor');
  assert.equal(checks, 1, 'focus checks are throttled');
  cleanup();
  worker.dispatchEvent(new Event('controllerchange'));
  window.dispatchEvent(new Event('focus'));
  assert.equal(checks, 1, 'unmount removes the focus listener');
  assert.deepEqual(order, []);
});

test('image failures are Error objects and diagnostics cannot throw or expose page identifiers', async () => {
  globalThis.Image = class {
    set src(_value) {
      queueMicrotask(() => this.onerror(new Event('error')));
    }
  };
  await assert.rejects(preloadImage('https://fixture.invalid/image'), {
    name: 'Error',
    message: 'Image preload failed',
  });
  const reports = [];
  window.location = { pathname: '/sheet/private-character-id' };
  globalThis.fetch = (_url, options) => {
    reports.push(JSON.parse(options.body));
    return Promise.reject(new Error('Transport failed'));
  };
  reportClientFailure('save_failed');
  reportClientFailure('save_failed');
  await tick();
  assert.equal(reports.length, 1);
  assert.deepEqual(Object.keys(reports[0]).sort(), ['code', 'release', 'surface', 'trace_id']);
  assert.equal(reports[0].surface, 'sheet');
  assert(!JSON.stringify(reports).includes('private-character-id'));
  globalThis.fetch = () => {
    throw new Error('Synchronous browser failure');
  };
  assert.doesNotThrow(() => reportClientFailure('content_load_failed'));
});

/** Controlled hook storage exercises the real content-retention and retry code. */
class ContentHost {
  slots = [];
  scope = { characterId: 1, actorId: 'owner', context: 'sheet' };
  snapshot = {};
  render() {
    host = this;
    this.cursor = 0;
    this.effects = [];
    const result = useCharacterContent(this.scope);
    for (const effect of this.effects) effect();
    return result;
  }
  ref(value) {
    const index = this.cursor++;
    return (this.slots[index] ??= { current: value });
  }
  state(value) {
    const index = this.cursor++;
    if (!(index in this.slots)) this.slots[index] = value;
    return [
      this.slots[index],
      (next) => {
        this.slots[index] = next;
      },
    ];
  }
  effect(fn, deps) {
    const index = this.cursor++;
    const previous = this.slots[index];
    if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
      this.effects.push(() => {
        previous?.cleanup?.();
        this.slots[index] = { deps, cleanup: fn() };
      });
    }
  }
  unmount() {
    for (const slot of this.slots) slot?.cleanup?.();
    host = undefined;
  }
}

test('a complete library remains visible through failures, but cannot cross character or account scopes', () => {
  globalThis.document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const view = new ContentHost();
  const complete = {
    defaultSources: { PAGE: [1] },
    abilityBlocks: [],
    classes: [],
    ancestries: [],
    backgrounds: [],
    items: [],
    traits: [],
    sources: [],
    languages: [],
    spells: [],
  };
  try {
    view.snapshot = { data: complete };
    assert.equal(view.render(), complete);
    view.scope = { ...view.scope, sources: [3] };
    view.snapshot = { isFetching: true };
    assert.equal(view.render(), complete, 'background source refresh keeps the prior complete view');
    view.snapshot = { isError: true, isFetching: false };
    assert.equal(view.render(), complete, 'a failed refresh does not unmount the editor');
    view.scope = { ...view.scope, actorId: 'other-account' };
    assert.equal(view.render(), undefined, 'another account cannot inherit the displayed package');
    view.scope = { ...view.scope, actorId: 'owner', characterId: 2 };
    assert.equal(view.render(), undefined, 'another character cannot inherit the displayed package');
    const replacement = { ...complete, defaultSources: { PAGE: [3] } };
    view.scope = { ...view.scope, characterId: 1 };
    view.snapshot = { data: replacement };
    assert.equal(view.render(), replacement);
    view.snapshot = { isError: true, isFetching: false };
    assert.equal(view.render(), replacement, 'successful replacement becomes the retained view');
  } finally {
    view.unmount();
  }
});

test('quiet retries wait, never overlap, pause offline and stop after unmount', async () => {
  const originalTimer = globalThis.setTimeout;
  const originalClear = globalThis.clearTimeout;
  const timers = new Map();
  let now = 0;
  let next = 0;
  globalThis.setTimeout = (callback, delay) => {
    const id = ++next;
    timers.set(id, { callback, at: now + delay });
    return id;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);
  const advance = async (ms) => {
    now += ms;
    for (const [id, timer] of timers)
      if (timer.at <= now) {
        timers.delete(id);
        timer.callback();
      }
    await Promise.resolve();
  };
  let calls = 0;
  let finish;
  globalThis.document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  try {
    useQuietRetry(true, () => {
      calls++;
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
    await advance(29999);
    assert.equal(calls, 0);
    await advance(1);
    assert.equal(calls, 1);
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('online'));
    assert.equal(calls, 1, 'focus/reconnect cannot duplicate a pending read');
    finish();
    await advance(0);
    navigator.onLine = false;
    await advance(30000);
    assert.equal(calls, 1, 'offline reads wait for reconnection');
    navigator.onLine = true;
    window.dispatchEvent(new Event('online'));
    assert.equal(calls, 2, 'reconnect retries without a user control');
    cleanup();
    finish();
    await advance(60000);
    window.dispatchEvent(new Event('focus'));
    assert.equal(calls, 2, 'unmounted views cannot keep retrying');
    assert.equal(timers.size, 0);
  } finally {
    cleanup?.();
    globalThis.setTimeout = originalTimer;
    globalThis.clearTimeout = originalClear;
  }
});
