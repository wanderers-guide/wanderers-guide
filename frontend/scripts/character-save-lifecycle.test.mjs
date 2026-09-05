/** Exercise the real character hook's effects and save callbacks with controlled hook/network boundaries. */
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
const directory = await mkdtemp(join(tmpdir(), 'wg-save-lifecycle-'));
const originalError = console.error;
const originalLog = console.log;
console.error = () => {};
console.log = () => {};
after(async () => {
  console.error = originalError;
  console.log = originalLog;
  await rm(directory, { recursive: true, force: true });
});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
let harness;
class HookHost {
  constructor() {
    this.setCharacter = (value) => {
      this.character = typeof value === 'function' ? value(this.character) : value;
      this.dirty = true;
    };
    this.character = null;
    this.session = { user: { id: 'owner' } };
    this.characterId = 1;
    this.options = { type: 'SIMPLE' };
    this.slots = [];
    this.cursor = 0;
    this.effects = [];
    this.requests = [];
    this.notices = [];
    this.downloads = [];
    this.dirty = false;
    this.active = true;
    this.request = async (type, body) =>
      type === 'find-character' ? row(body.id) : [{ ...row(body.id), ...body, updated_at: 'version-2' }];
    this.calculate = () => new Promise(() => {});
  }
  useRef(value) {
    const index = this.cursor++;
    return (this.slots[index] ??= { current: value });
  }
  useState(value) {
    const index = this.cursor++;
    if (!(index in this.slots)) this.slots[index] = value;
    return [
      this.slots[index],
      (value) => {
        this.slots[index] = typeof value === 'function' ? value(this.slots[index]) : value;
        this.dirty = true;
      },
    ];
  }
  useMemo(callback, deps) {
    const index = this.cursor++;
    if (!sameDeps(this.slots[index]?.deps, deps)) this.slots[index] = { deps, value: callback() };
    return this.slots[index].value;
  }
  useEffect(callback, deps) {
    const index = this.cursor++;
    const prior = this.slots[index];
    if (!prior || !sameDeps(prior.deps, deps)) {
      this.effects.push(() => {
        prior?.cleanup?.();
        this.slots[index] = { deps, cleanup: callback() };
      });
    }
  }
  useDidUpdate(callback, deps) {
    const first = this.useRef(true);
    this.useEffect(() => {
      if (first.current) first.current = false;
      else return callback();
    }, deps);
  }
  useMutation(options) {
    const cell = this.useRef(options);
    cell.current = options;
    return {
      mutate: (save) => {
        const submitted = cell.current;
        Promise.resolve()
          .then(() => submitted.mutationFn(save))
          .then(
            (result) => submitted.onSuccess?.(result, save),
            (error) => submitted.onError?.(error, save)
          )
          .finally(() => submitted.onSettled?.(undefined, undefined, save));
      },
    };
  }
  render() {
    harness = this;
    this.cursor = 0;
    this.effects = [];
    this.dirty = false;
    this.value = useCharacter(this.characterId, this.options);
    for (const effect of this.effects) effect();
    return this.value;
  }
  async flush() {
    for (let index = 0; index < 30; index++) {
      await Promise.resolve();
      if (this.dirty && this.active) this.render();
    }
  }
  edit(fields) {
    this.character = { ...this.character, ...fields };
    this.render();
  }
  unmount() {
    this.active = false;
    for (const slot of this.slots) slot?.cleanup?.();
  }
}
class Storage {
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
}
const events = new Map();
globalThis.__saveHooks = {
  useCallback: (fn, deps) => harness.useMemo(() => fn, deps),
  useRef: (value) => harness.useRef(value),
  useState: (value) => harness.useState(value),
  useMemo: (fn, deps) => harness.useMemo(fn, deps),
  useEffect: (fn, deps) => harness.useEffect(fn, deps),
  useDidUpdate: (fn, deps) => harness.useDidUpdate(fn, deps),
  useMutation: (options) => harness.useMutation(options),
  useAtom: () => [harness.character, harness.setCharacter],
  useAtomValue: () => harness.session,
  makeRequest: async (type, body, _notify, options) => {
    harness.requests.push({ type, body, options });
    return harness.request(type, body);
  },
  notify: (notice) => harness.notices.push(notice),
  download: (body, name) => harness.downloads.push({ body, name }),
  calculate: () => harness.calculate(),
  supabase: { auth: { getSession: async () => ({ data: { session: harness.session } }) } },
};
const boundaries = {
  react: 'export const {useCallback,useRef,useState,useMemo,useEffect} = globalThis.__saveHooks;',
  'react/jsx-runtime': 'export const jsx = (type,props) => ({type,props}); export const jsxs = jsx;',
  jotai: 'export const {useAtom,useAtomValue} = globalThis.__saveHooks;',
  '@mantine/hooks':
    'export const {useDidUpdate} = globalThis.__saveHooks; export const useDebouncedValue = value => [value]; export const useDebouncedCallback = callback => callback;',
  '@tanstack/react-query': 'export const {useMutation} = globalThis.__saveHooks; export const useQuery = () => {};',
  '@requests/request-manager':
    'export const {makeRequest} = globalThis.__saveHooks; export const hasSessionExpiredNotice = () => false;',
  '@mantine/notifications':
    'export const showNotification = globalThis.__saveHooks.notify; export const hideNotification = () => {};',
  '@mantine/core': 'export const Button = "button";',
  '@export/export-to-json': 'export const downloadObjectAsJson = globalThis.__saveHooks.download;',
  '../supabase-client': 'export const supabase = globalThis.__saveHooks.supabase;',
  '@atoms/characterAtoms': 'export const characterState = {};',
  '@atoms/supabaseAtoms': 'export const sessionState = {};',
  '@auth/user-manager': 'export const getCachedPublicUser = () => null;',
  '@content/content-store':
    'export const defineDefaultSources = () => {}; export const isContentPackageEmpty = () => false;',
  '@content/customization-cache': 'export const saveCustomization = () => {};',
  '@operations/operations.main':
    'export const executeOperations = globalThis.__saveHooks.calculate; export const isOperationCancelled = () => false;',
  '@tabler/icons-react': 'export const IconRefresh = () => null; export const IconAlertCircle = () => null;',
  './numbers': 'export const hashData = value => JSON.stringify(value);',
  './objects': 'export const getDeepDiff = (a,b) => JSON.stringify(a) === JSON.stringify(b) ? {} : { changed: true };',
  './type-fixing': 'export const convertToSetEntity = value => value;',
  '@conditions/condition-handler': 'export const applyConditions = () => {};',
  '@items/inv-utils': 'export const applyEquipmentPenalties = () => {};',
  '@pages/character_sheet/entity-handler': 'export const confirmHealth = () => {};',
  '@variables/calculated-stats': 'export const saveCalculatedStats = () => {};',
  '@variables/variable-manager': 'export const setVariable = () => {};',
  '@items/inv-handlers': 'export const addExtraItems = () => {}; export const checkBulkLimit = () => {};',
  '@variables/variable-helpers':
    'export const getFinalHealthValue = () => 10; export const getHealthValueParts = () => ({classHp: 6});',
};
await build({
  absWorkingDir: root,
  stdin: {
    contents: "export {default} from './src/utils/use-character'; export * from './src/utils/character-save-buffer';",
    resolveDir: root,
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: join(directory, 'hook.mjs'),
  jsx: 'automatic',
  plugins: [
    {
      name: 'hook-boundaries',
      setup(b) {
        b.onResolve({ filter: /.*/ }, (args) =>
          args.path in boundaries ? { path: args.path, namespace: 'boundary' } : undefined
        );
        b.onLoad({ filter: /.*/, namespace: 'boundary' }, (args) => ({
          contents: boundaries[args.path],
          loader: 'js',
        }));
      },
    },
  ],
});
const {
  default: useCharacter,
  bufferCharacterSave,
  getBufferedCharacterSave,
} = await import(pathToFileURL(join(directory, 'hook.mjs')).href);
const row = (id = 1) => ({
  id,
  user_id: 'owner',
  name: `Character ${id}`,
  level: 1,
  details: {},
  inventory: { items: [] },
  content_sources: { enabled: [] },
  updated_at: 'version-1',
});
beforeEach(() => {
  globalThis.localStorage = new Storage();
  events.clear();
  globalThis.document = {
    visibilityState: 'visible',
    addEventListener: (name, fn) => events.set(name, fn),
    removeEventListener: (name) => events.delete(name),
  };
  globalThis.window = {
    location: { href: '', pathname: '/sheet/1' },
    addEventListener: (name, fn) => events.set(name, fn),
    removeEventListener: (name) => events.delete(name),
  };
  harness = new HookHost();
});

test('retained replay still loads the server row and exposes a downloadable copy', async () => {
  bufferCharacterSave({ ...row(), name: 'Unsynced copy' }, 'owner');
  harness.render();
  await harness.flush();
  assert.equal(harness.character.name, 'Character 1');
  const notice = harness.notices.find((value) => value.id === 'character-recovery-1');
  assert.ok(notice);
  notice.message.props.onClick();
  assert.equal(harness.downloads[0].body.name, 'Unsynced copy');
  assert.equal(getBufferedCharacterSave(1, 'owner').draft.body.name, 'Unsynced copy');
  assert.equal(harness.requests.filter((value) => value.type === 'update-character').length, 0);
  harness.unmount();
});

test('late initial fetch cannot replace another character after navigation', async () => {
  const first = deferred();
  harness.request = async (type, body) => (body.id === 1 ? first.promise : row(body.id));
  harness.render();
  await harness.flush();
  harness.characterId = 2;
  harness.render();
  await harness.flush();
  first.resolve(row(1));
  await harness.flush();
  assert.equal(harness.character.id, 2);
  harness.unmount();
  assert.equal(localStorage.getItem('autosave-character-1-owner'), null);
});

test('queued edits keep a durable latest snapshot and use the acknowledged server version', async () => {
  const saves = [];
  harness.request = async (type, body) => {
    if (type === 'find-character') return row();
    const pending = deferred();
    saves.push({ body, pending });
    return pending.promise;
  };
  harness.render();
  await harness.flush();
  harness.edit({ name: 'First edit' });
  await harness.flush();
  harness.edit({ name: 'Latest edit' });
  await harness.flush();
  assert.equal(saves.length, 1);
  assert.equal(getBufferedCharacterSave(1, 'owner').draft.body.name, 'Latest edit');
  saves[0].pending.resolve([{ ...row(), ...saves[0].body, updated_at: 'version-2' }]);
  await harness.flush();
  assert.equal(saves.length, 2);
  assert.equal(saves[1].body.expected_updated_at, 'version-2');
  assert.equal(saves[1].body.name, 'Latest edit');
  saves[1].pending.resolve([{ ...row(), ...saves[1].body, updated_at: 'version-3' }]);
  await harness.flush();
  assert.deepEqual(getBufferedCharacterSave(1, 'owner'), { status: 'none' });
  harness.unmount();
});

test('failed saves retain edits and account changes cannot replay their queued writes', async () => {
  const save = deferred();
  harness.request = async (type) => (type === 'find-character' ? row() : save.promise);
  harness.render();
  await harness.flush();
  harness.edit({ name: 'Owner edit' });
  await harness.flush();
  harness.edit({ name: 'Queued owner edit' });
  await harness.flush();
  harness.session = { user: { id: 'other' } };
  harness.render();
  await harness.flush();
  save.resolve(null);
  await harness.flush();
  assert.equal(harness.requests.filter((value) => value.type === 'update-character').length, 1);
  assert.equal(getBufferedCharacterSave(1, 'owner').draft.body.name, 'Queued owner edit');
  assert.equal(harness.notices.filter((value) => value.id === 'character-save-failed').length, 0);
  harness.unmount();
});

test('an empty success payload remains a failed save with a retained draft', async () => {
  harness.request = async (type) => (type === 'find-character' ? row() : []);
  harness.render();
  await harness.flush();
  harness.edit({ name: 'Retained edit' });
  await harness.flush();
  assert.equal(getBufferedCharacterSave(1, 'owner').draft.body.name, 'Retained edit');
  assert.equal(harness.notices.filter((value) => value.id === 'character-save-failed').length, 1);
  harness.unmount();
});

test('pending and failed calculations retain inputs locally without writing derived state', async () => {
  const calculation = deferred();
  harness.options = {
    type: 'EXECUTE_OPS',
    data: { content: {}, context: 'CHARACTER-SHEET', onFinishLoading: () => {} },
  };
  harness.calculate = () => calculation.promise;
  harness.render();
  await harness.flush();
  harness.edit({ name: 'Edit during calculation' });
  await harness.flush();
  events.get('pagehide')();
  assert.equal(getBufferedCharacterSave(1, 'owner').draft.requiresCalculation, true);
  assert.equal(getBufferedCharacterSave(1, 'owner').draft.body.name, 'Edit during calculation');
  calculation.reject(new Error('worker crashed'));
  await harness.flush();
  events.get('pagehide')();
  assert.equal(getBufferedCharacterSave(1, 'owner').draft.requiresCalculation, true);
  assert.equal(getBufferedCharacterSave(1, 'owner').draft.body.name, 'Edit during calculation');
  assert.equal(harness.requests.filter((value) => value.type === 'update-character').length, 0);
  assert.ok(harness.value.operationError);
  harness.unmount();
});

test('a missing server version preserves the edit instead of issuing an unguarded write', async () => {
  harness.request = async () => ({ ...row(), updated_at: undefined });
  harness.render();
  await harness.flush();
  harness.edit({ name: 'Versionless edit' });
  await harness.flush();
  assert.equal(harness.requests.filter((value) => value.type === 'update-character').length, 0);
  assert.equal(getBufferedCharacterSave(1, 'owner').draft.body.name, 'Versionless edit');
  harness.unmount();
});

test('a conflict retries the unchanged local merge with the new version instead of silently stopping', async () => {
  let saves = 0;
  harness.request = async (type, body) => {
    if (type === 'find-character') return row();
    saves++;
    if (saves === 1) return { __conflict: true, character: { ...row(), updated_at: 'remote-version' } };
    return [{ ...row(), ...body, updated_at: 'accepted-version' }];
  };
  harness.render();
  await harness.flush();
  harness.edit({ name: 'Local edit' });
  await harness.flush();
  assert.equal(saves, 2);
  assert.equal(
    harness.requests.filter((value) => value.type === 'update-character')[1].body.expected_updated_at,
    'remote-version'
  );
  assert.deepEqual(getBufferedCharacterSave(1, 'owner'), { status: 'none' });
  harness.unmount();
});

test('immediate builder navigation retains the class and merges newer remote data before recalculating', async () => {
  const pending = deferred();
  const options = {
    type: 'EXECUTE_OPS',
    data: { content: {}, context: 'CHARACTER-BUILDER', onFinishLoading: () => {} },
  };
  harness.options = options;
  harness.calculate = () => pending.promise;
  harness.render();
  await harness.flush();
  harness.edit({ details: { class: { id: 1, name: 'Wizard' } } });
  await harness.flush();
  assert.equal(getBufferedCharacterSave(1, 'owner').draft.requiresCalculation, true);
  harness.unmount();

  // The previous page may still have a save in flight, or another device may
  // update an unrelated field. Rebase the retained input onto the fresh row.
  harness = new HookHost();
  const calculated = deferred();
  harness.options = options;
  harness.calculate = () => calculated.promise;
  harness.request = async (type, body) =>
    type === 'find-character'
      ? { ...row(), notes: { text: 'Other device note' }, updated_at: 'remote-version' }
      : [{ ...row(), ...body, updated_at: 'accepted-version' }];
  harness.render();
  await harness.flush();
  assert.equal(harness.character.details.class.name, 'Wizard');
  assert.equal(harness.character.notes.text, 'Other device note');
  assert.equal(harness.requests.filter((value) => value.type === 'update-character').length, 0);
  calculated.resolve({});
  await harness.flush();
  const save = harness.requests.find((value) => value.type === 'update-character');
  assert.equal(save.body.details.class.name, 'Wizard');
  assert.equal(save.body.notes.text, 'Other device note');
  assert.equal(save.body.expected_updated_at, 'remote-version');
  assert.deepEqual(getBufferedCharacterSave(1, 'owner'), { status: 'none' });
  harness.unmount();
});

test('an intermediate editor without calculations cannot persist a pending calculation snapshot', async () => {
  bufferCharacterSave({ ...row(), details: { class: { id: 1, name: 'Wizard' } } }, 'owner', 'version-1', {
    requiresCalculation: true,
    base: row(),
  });
  harness.render();
  await harness.flush();
  harness.edit({ name: 'New name before recalculation' });
  await harness.flush();
  assert.equal(harness.character.details.class.name, 'Wizard');
  assert.equal(harness.requests.filter((value) => value.type === 'update-character').length, 0);
  assert.equal(getBufferedCharacterSave(1, 'owner').draft.requiresCalculation, true);
  harness.unmount();
});
