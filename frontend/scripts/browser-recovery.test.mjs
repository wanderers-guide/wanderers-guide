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
let notice;
let hidden;
globalThis.__recovery = {
  effect: (fn) => {
    cleanup = fn();
  },
  show: (value) => {
    notice = value;
  },
  hide: (id) => {
    hidden = id;
  },
};
const outfile = join(directory, 'recovery.mjs');
await build({
  stdin: {
    contents: `export {AppUpdateNotice} from './src/common/AppUpdateNotice'; export {preloadImage} from './src/utils/images'; export {reportClientFailure} from './src/utils/client-errors';`,
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
          { filter: /^(react(?:\/jsx-runtime)?|@mantine\/core|@mantine\/notifications|\.\/strings)$/ },
          (args) => ({ path: args.path, namespace: 'boundary' })
        );
        plugin.onLoad({ filter: /.*/, namespace: 'boundary' }, () => ({
          contents: `
      export const useEffect = globalThis.__recovery.effect;
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
const { AppUpdateNotice, preloadImage, reportClientFailure } = await import(pathToFileURL(outfile));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const buttons = (node) =>
  !node || typeof node !== 'object'
    ? []
    : node.type === 'button'
      ? [node]
      : [node.props?.children].flat().flatMap(buttons);

test('updates activated in another tab never force reload; user reload flushes before activation', async () => {
  const order = [];
  const registration = Object.assign(new EventTarget(), {
    waiting: { postMessage: () => order.push('activate') },
    installing: null,
    update: async () => {},
  });
  const worker = Object.assign(new EventTarget(), { controller: {}, register: async () => registration });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { serviceWorker: worker, onLine: true },
  });
  globalThis.window = Object.assign(new EventTarget(), { location: { reload: () => order.push('reload') } });
  globalThis.HTMLElement = class {
    blur() {
      order.push('blur');
    }
  };
  globalThis.document = { activeElement: new HTMLElement() };
  window.addEventListener('wg:before-update', () => order.push('flush'));
  AppUpdateNotice();
  await tick();
  assert.equal(notice.title, 'An app update is ready');
  buttons(notice.message)
    .find((button) => button.props.children === 'Later')
    .props.onClick();
  assert.equal(hidden, 'app-update-available');
  assert.deepEqual(order, []);
  worker.dispatchEvent(new Event('controllerchange'));
  assert.deepEqual(order, [], 'activation elsewhere cannot discard this tab input');
  buttons(notice.message)
    .find((button) => button.props.children === 'Reload app')
    .props.onClick();
  await tick();
  assert.deepEqual(order, ['blur', 'flush', 'activate']);
  worker.dispatchEvent(new Event('controllerchange'));
  assert.deepEqual(order, ['blur', 'flush', 'activate', 'reload']);
  cleanup();
  worker.dispatchEvent(new Event('controllerchange'));
  assert.equal(order.length, 4, 'unmounted notices cannot reload');
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
