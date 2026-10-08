/** Exercise real appearance storage, foreground contrast and logout draft preservation. */
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(`${root}/package.json`);
const { build } = require('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-appearance-'));
const outfile = join(directory, 'appearance.cjs');
await build({
  stdin: {
    contents: `export {colorSchemeAtom} from './src/atoms/appearance'; export {createAppTheme,appCssVariablesResolver} from './src/utils/theme'; export {interpolateHealth} from './src/utils/colors'; export {clearSessionDataPreservingDrafts} from './src/utils/character-save-buffer'; export {createStore} from 'jotai/vanilla'; export {mergeMantineTheme,DEFAULT_THEME} from '@mantine/core'; export {default as Color} from 'colorjs.io';`,
    resolveDir: root,
  },
  outfile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  define: { 'import.meta.env': JSON.stringify({ VITE_ENV: 'test', MODE: 'test' }) },
  tsconfig: `${root}/tsconfig.json`,
});
class MemoryStorage {
  values = new Map();
  get length() {
    return this.values.size;
  }
  key(i) {
    return [...this.values.keys()][i] ?? null;
  }
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
  removeItem(key) {
    this.values.delete(key);
  }
}
const previousWindow = globalThis.window,
  previousStorage = globalThis.localStorage,
  previousStorageClass = globalThis.Storage;
let storage;
const listeners = new Set();
function load(raw) {
  storage = new MemoryStorage();
  if (raw !== undefined) storage.setItem('wg-color-scheme', raw);
  globalThis.localStorage = storage;
  globalThis.Storage = MemoryStorage;
  globalThis.window = {
    Storage: MemoryStorage,
    localStorage: storage,
    addEventListener: (name, listener) => {
      if (name === 'storage') listeners.add(listener);
    },
    removeEventListener: (name, listener) => listeners.delete(listener),
  };
  delete require.cache[require.resolve(outfile)];
  return require(outfile);
}
after(async () => {
  globalThis.window = previousWindow;
  globalThis.localStorage = previousStorage;
  globalThis.Storage = previousStorageClass;
  await rm(directory, { recursive: true, force: true });
});
test('dark remains the initial appearance and a light choice survives a fresh store', () => {
  let api = load();
  let store = api.createStore();
  assert.equal(store.get(api.colorSchemeAtom), 'dark');
  store.set(api.colorSchemeAtom, 'light');
  assert.equal(storage.getItem('wg-color-scheme'), '"light"');
  api = load(storage.getItem('wg-color-scheme'));
  store = api.createStore();
  assert.equal(store.get(api.colorSchemeAtom), 'light');
});
test('malformed or unsupported stored choices quietly fall back to dark', () => {
  for (const raw of ['invalid', '"auto"', 'null', '{}', '42']) {
    const api = load(raw);
    assert.equal(api.createStore().get(api.colorSchemeAtom), 'dark');
  }
});
test('appearance follows valid changes from another tab and rejects invalid storage events', () => {
  const api = load('"dark"'),
    store = api.createStore();
  const unsubscribe = store.sub(api.colorSchemeAtom, () => {});
  const fire = (value) => {
    for (const listener of listeners) listener({ storageArea: storage, key: 'wg-color-scheme', newValue: value });
  };
  fire('"light"');
  assert.equal(store.get(api.colorSchemeAtom), 'light');
  fire('"auto"');
  assert.equal(store.get(api.colorSchemeAtom), 'dark');
  unsubscribe();
});
test('blocked persistence does not prevent changing the current tab appearance', () => {
  const api = load(),
    store = api.createStore();
  storage.setItem = () => {
    throw new Error('Storage unavailable');
  };
  const warn = console.warn;
  const warnings = [];
  console.warn = (message) => warnings.push(message);
  try {
    store.set(api.colorSchemeAtom, 'light');
    assert.equal(store.get(api.colorSchemeAtom), 'light');
    assert.deepEqual(warnings, ['Appearance preference could not be saved.']);
  } finally {
    console.warn = warn;
  }
});
test('logout preserves appearance and every account-scoped draft while removing cached session data', () => {
  const api = load('"light"');
  storage.setItem('autosave-character-owner-a-1', 'retained-a');
  storage.setItem('autosave-character-owner-b-1', 'retained-b');
  storage.setItem('account-cache', 'private');
  storage.setItem('auth-session', 'private');
  assert.deepEqual(api.clearSessionDataPreservingDrafts(), { status: 'cleared' });
  assert.deepEqual(
    [...storage.values.entries()],
    [
      ['wg-color-scheme', '"light"'],
      ['autosave-character-owner-a-1', 'retained-a'],
      ['autosave-character-owner-b-1', 'retained-b'],
    ]
  );
});
test('light foregrounds and health values retain readable contrast over the darkest pale glass', () => {
  const api = load();
  const backdrop = new api.Color('rgb(200,205,212)');
  const nestedBackdrop = new api.Color('rgb(190,196,204)');
  for (const accent of ['#199bd4', '#ffffff', '#ffff00', '#ff5252', '#000000', '#ae3ec9']) {
    const light = api.createAppTheme({ scheme: 'light', accent });
    for (const [name, shades] of Object.entries(light.colors).filter(
      ([name]) => name === 'text' || name.endsWith('Ink')
    )) {
      for (const shade of shades)
        assert.ok(
          new api.Color(shade).contrast(name === 'text' || name === 'darkInk' ? backdrop : nestedBackdrop, 'WCAG21') >=
            4.5 - 0.005,
          `${name}: ${shade}`
        );
    }
  }
  for (const percentage of [0, 0.1, 0.25, 0.5, 0.75, 1])
    assert.ok(
      new api.Color(api.interpolateHealth(percentage, 'light')).contrast(nestedBackdrop, 'WCAG21') >= 4.5 - 0.005
    );
});
test('dark foregrounds match the original palettes and character accents remain distinct', () => {
  const api = load();
  const dark = api.createAppTheme({ scheme: 'dark', accent: '#fa5252' });
  assert.deepEqual(
    dark.colors.text.map((c) => new api.Color(c).toJSON()),
    dark.colors.gray.map((c) => new api.Color(c).toJSON())
  );
  assert.deepEqual(
    dark.colors.darkInk.map((c) => new api.Color(c).toJSON()),
    dark.colors.dark.map((c) => new api.Color(c).toJSON())
  );
  assert.deepEqual(dark.colors.guideInk, dark.colors.guide);
  assert.notDeepEqual(dark.colors.guide, api.createAppTheme({ scheme: 'dark' }).colors.guide);
  const vars = api.appCssVariablesResolver(api.mergeMantineTheme(api.DEFAULT_THEME, dark));
  assert.equal(vars.dark['--mantine-color-text'], 'rgb(202, 202, 202)');
  assert.equal(vars.dark['--mantine-color-body'], 'rgba(26, 27, 30, 1)');
});

test('secondary light controls with explicit neutral shades keep a pale fill', () => {
  const api = load();
  const theme = api.mergeMantineTheme(api.DEFAULT_THEME, api.createAppTheme({ scheme: 'light' }));
  const colors = theme.variantColorResolver({ theme, color: 'gray.6', variant: 'light' });
  assert.equal(Number(new api.Color(colors.background).alpha), 0.1);
  assert.equal(Number(new api.Color(colors.hover).alpha), 0.16);
  assert.equal(colors.color, 'var(--mantine-color-text-6)');
});

/** Native filled colors must choose the readable black/white label, including indigo rarity badges. */
test('filled light controls choose an accessible foreground across native palettes', () => {
  const api = load();
  for (const accent of ['#199bd4', '#ffffff', '#ffff00', '#ff5252', '#000000', '#ae3ec9']) {
    const theme = api.mergeMantineTheme(api.DEFAULT_THEME, api.createAppTheme({ scheme: 'light', accent }));
    for (const [name, shades] of Object.entries(theme.colors).filter(
      ([name]) => name !== 'dark' && name !== 'text' && !name.endsWith('Ink')
    )) {
      for (let shade = 0; shade < shades.length; shade++) {
        const resolved = theme.variantColorResolver({ theme, color: name + '.' + shade, variant: 'filled' });
        const foreground = resolved.color === 'var(--mantine-color-black)' ? theme.black : theme.white;
        assert.ok(
          new api.Color(foreground).contrast(new api.Color(shades[shade]), 'WCAG21') >= 4.5,
          name + '.' + shade
        );
        const hoverShade = shade === 9 ? 8 : shade + 1;
        const hoverForeground = resolved.hoverColor === 'var(--mantine-color-black)' ? theme.black : theme.white;
        assert.ok(
          new api.Color(hoverForeground).contrast(new api.Color(shades[hoverShade]), 'WCAG21') >= 4.5,
          name + '.' + shade + ' hover'
        );
      }
    }
  }
});

/** Stored encounter/note colors need readable secondary controls; CSS variables remain contextual. */
test('custom light control colors stay readable without parsing contextual CSS values', () => {
  const api = load();
  const theme = api.mergeMantineTheme(api.DEFAULT_THEME, api.createAppTheme({ scheme: 'light' }));
  for (const color of ['#359fdf', '#fff', '#ff00ff', 'rgb(53, 159, 223)', 'white']) {
    for (const variant of ['light', 'subtle', 'outline', 'transparent']) {
      const resolved = theme.variantColorResolver({ theme, color, variant });
      assert.ok(new api.Color(resolved.color).contrast(new api.Color('rgb(190,196,204)'), 'WCAG21') >= 4.5);
    }
  }
  for (const color of ['var(--custom-color)', 'currentColor'])
    assert.doesNotThrow(() => theme.variantColorResolver({ theme, color, variant: 'light' }));
});

/** Native gradient controls retain their colors with a readable white label across the whole fill. */
test('light gradients keep readable labels across default, native and stored custom colors', () => {
  const api = load();
  for (const accent of ['#199bd4', '#ffffff', '#ffff00', '#ff5252', '#000000', '#ae3ec9']) {
    const theme = api.mergeMantineTheme(api.DEFAULT_THEME, api.createAppTheme({ scheme: 'light', accent }));
    for (const gradient of [
      undefined,
      { from: 'green', to: 'guide' },
      { from: 'guide', to: 'teal' },
      { from: '#359fdf', to: '#fab005' },
    ]) {
      const resolved = theme.variantColorResolver({ theme, color: 'guide', variant: 'gradient', gradient });
      const colors = [...resolved.background.matchAll(/rgb\([^)]+\)/g)].map((match) => new api.Color(match[0]));
      assert.equal(colors.length, 2);
      for (let step = 0; step <= 100; step++) {
        const value = colors[0].mix(colors[1], step / 100, { space: 'srgb' });
        assert.ok(value.contrast(new api.Color(theme.white), 'WCAG21') >= 4.5, 'gradient label contrast');
      }
      assert.equal(resolved.hover, resolved.background);
    }
  }
});
