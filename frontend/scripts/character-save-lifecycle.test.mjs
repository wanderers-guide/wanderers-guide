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
    this.hiddenNotices = [];
    this.dirty = false;
    this.active = true;
    this.request = async (type, body) =>
      type === 'find-character' ? row(body.id) : [{ ...row(body.id), ...body, updated_at: 'version-2' }];
    this.calculate = () => new Promise(() => {});
    this.confirmHealth = () => {};
    this.saveCalculatedStats = () => {};
    this.deferCharacterCommits = false;
    this.pendingCharacterCommit = null;
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
        const next = typeof value === 'function' ? value(this.slots[index]) : value;
        if (!Object.is(this.slots[index], next)) {
          this.slots[index] = next;
          this.dirty = true;
        }
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
            (result) => {
              submitted.onSuccess?.(result, save);
              submitted.onSettled?.(result, undefined, save);
            },
            (error) => {
              submitted.onError?.(error, save);
              submitted.onSettled?.(undefined, error, save);
            }
          );
      },
    };
  }
  useQuery(options) {
    const cell = this.useRef({});
    this.remoteQuery = { options, cell };
    return cell.current;
  }
  async poll() {
    assert.ok(this.remoteQuery?.options.enabled, 'the loaded character accepts incoming remote reads');
    const { options, cell } = this.remoteQuery;
    try {
      const data = await options.queryFn();
      cell.current = { data };
    } catch (error) {
      cell.current = { ...cell.current, error };
    }
    this.dirty = true;
    await this.flush();
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
  get length() {
    return this.data.size;
  }
  key(index) {
    return [...this.data.keys()][index] ?? null;
  }
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
  useQuery: (options) => harness.useQuery(options),
  useAtom: () => [harness.character, harness.setCharacter],
  useAtomValue: () => harness.session,
  makeRequest: async (type, body, _notify, options) => {
    harness.requests.push({ type, body, options });
    return harness.request(type, body);
  },
  notify: (notice) => harness.notices.push(notice),
  hideNotice: (id) => harness.hiddenNotices.push(id),
  calculate: () => harness.calculate(),
  confirmHealth: (...args) => harness.confirmHealth(...args),
  saveCalculatedStats: (...args) => harness.saveCalculatedStats(...args),
  debounce: (value) => harness.debouncedCharacter ?? value,
  debounceCallback:
    (callback) =>
    (...args) => {
      // Mantine coalesces setter callbacks, replacing every earlier updater.
      if (harness.deferCharacterCommits) harness.pendingCharacterCommit = () => callback(...args);
      else callback(...args);
    },
  supabase: { auth: { getSession: async () => ({ data: { session: harness.session } }) } },
};
const boundaries = {
  react: 'export const {useCallback,useRef,useState,useMemo,useEffect} = globalThis.__saveHooks;',
  'react/jsx-runtime':
    'export const jsx = (type,props) => ({type,props}); export const jsxs = jsx; export const Fragment = "fragment";',
  jotai: 'export const {useAtom,useAtomValue} = globalThis.__saveHooks;',
  '@mantine/hooks':
    'export const {useDidUpdate} = globalThis.__saveHooks; export const useDebouncedValue = value => [globalThis.__saveHooks.debounce(value)]; export const useDebouncedCallback = globalThis.__saveHooks.debounceCallback;',
  '@tanstack/react-query': 'export const {useMutation,useQuery} = globalThis.__saveHooks;',
  '@constants/data': 'export const COMMON_CORE_ID = 3;',
  '@requests/request-manager':
    'export const {makeRequest} = globalThis.__saveHooks; export const hasSessionExpiredNotice = () => false;',
  '@mantine/notifications':
    'export const showNotification = globalThis.__saveHooks.notify; export const hideNotification = globalThis.__saveHooks.hideNotice;',
  '@mantine/core': 'export const Button = "button"; export const Group = "group"; export const Text = "text";',
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
  '@conditions/condition-handler':
    'export const applyConditions = () => {}; export const compiledConditions = values => values; export const getConditionByName = name => ({name,value:1});',
  '@items/inv-utils':
    'export const applyEquipmentPenalties = () => {}; export const filterByTraitType = () => []; export const getBestArmor = () => undefined;',
  '@content/collect-content':
    'export const collectEntitySpellcasting = () => ({}); export const getFocusPoints = () => ({max:0});',
  '@pages/character_sheet/entity-handler': 'export const confirmHealth = globalThis.__saveHooks.confirmHealth;',
  '@variables/calculated-stats': 'export const saveCalculatedStats = globalThis.__saveHooks.saveCalculatedStats;',
  '@variables/variable-manager':
    'export const setVariable = () => {}; export const getVariable = () => undefined; export const getVariables = () => ({}); export const addVariable = () => {};',
  './variable-manager':
    'export const getVariable = () => undefined; export const getVariables = () => ({}); export const addVariable = () => {};',
  './variable-helpers':
    'export const getFinalHealthValue = () => 10; export const getFinalStaminaValue = () => 0; export const getFinalResolveValue = () => 0; export const getFinalAcValue = () => 15; export const getFinalProfValue = () => "0";',
  './variable-utils': 'export const labelToVariable = value => value;',
  '@utils/objects':
    'export const getDeepDiff = (a,b) => JSON.stringify(a) === JSON.stringify(b) ? {} : { changed: true };',
  '@items/inv-handlers': 'export const addExtraItems = () => {}; export const checkBulkLimit = () => {};',
  '@variables/variable-helpers':
    'export const getFinalHealthValue = () => 10; export const getHealthValueParts = () => ({classHp: 6}); export const getFinalResolveValue = () => 0; export const getFinalStaminaValue = () => 0; export const isStaminaVariant = () => false;',
};
await build({
  absWorkingDir: root,
  define: { 'import.meta.env.PROD': 'false' },
  stdin: {
    contents:
      "export {default} from './src/utils/use-character'; export * from './src/utils/character-save-buffer'; export * from './src/utils/character-merge'; export {confirmHealth as actualConfirmHealth} from './src/pages/character_sheet/entity-handler'; export {saveCalculatedStats as actualSaveCalculatedStats} from './src/process/variables/calculated-stats';",
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
  journalCharacterSaveSubmission,
  mergeCharacterOnConflict,
  mergeCharacterSave,
  actualConfirmHealth,
  actualSaveCalculatedStats,
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

test('unreplayable earlier changes stay quiet and intact through focus, navigation and reopening', async () => {
  bufferCharacterSave({ ...row(), name: 'Unsynced copy' }, 'owner');
  for (const id of [1, 2, 1]) {
    harness = new HookHost();
    harness.characterId = id;
    harness.render();
    await harness.flush();
    events.get('focus')();
    await harness.flush();
    assert.equal(harness.character.name, `Character ${id}`);
    assert.equal(harness.notices.length, 0);
    assert.equal(getBufferedCharacterSave(1, 'owner').draft.body.name, 'Unsynced copy');
    assert.ok(harness.requests.every((value) => value.type === 'find-character'));
    harness.unmount();
  }
});

test('switching accounts leaves earlier changes untouched and does not present them to the next account', async () => {
  bufferCharacterSave({ ...row(), name: 'Earlier changes' }, 'owner');
  harness.render();
  await harness.flush();
  harness.session = { user: { id: 'other' } };
  harness.render();
  await harness.flush();
  assert.equal(harness.character.name, 'Character 1');
  assert.equal(harness.notices.length, 0);
  assert.equal(getBufferedCharacterSave(1, 'owner').draft.body.name, 'Earlier changes');
  assert.ok(harness.requests.every((value) => value.type === 'find-character'));
  harness.unmount();
});

test('new retained history does not interrupt an already open sheet on focus', async () => {
  harness.render();
  await harness.flush();
  bufferCharacterSave({ ...row(), name: 'Earlier changes' }, 'owner');
  events.get('focus')();
  await harness.flush();
  assert.equal(harness.notices.length, 0);
  assert.equal(harness.character.name, 'Character 1');
  assert.equal(getBufferedCharacterSave(1, 'owner').draft.body.name, 'Earlier changes');
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

test('a cached route character does not expose editing or calculate until its save context loads', async () => {
  const pending = deferred();
  harness.character = row();
  harness.request = async () => pending.promise;
  harness.render();
  await harness.flush();
  assert.equal(harness.value.isLoading, true);
  pending.resolve(row());
  await harness.flush();
  assert.equal(harness.value.isLoading, false);
  harness.request = async (_type, body) => [{ ...row(), ...body, updated_at: 'version-2' }];
  harness.edit({ name: 'First edit after loading' });
  await harness.flush();
  assert.equal(harness.requests.filter((request) => request.type === 'update-character').length, 1);
  harness.unmount();
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
  assert.equal(harness.value.saveState, 'failed');
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
  events.get('focus')();
  await harness.flush();
  assert.equal(harness.notices.length, 0, 'the existing calculation error handles retry without a download flow');
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

test('compatible concurrent edits merge and save without a notification', async () => {
  const remote = { ...row(), details: { notes: 'A campaign update' }, updated_at: 'remote-version' };
  let saves = 0;
  harness.request = async (type, body) => {
    if (type === 'find-character') return row();
    saves++;
    if (saves === 1) return { __conflict: true, character: remote };
    return [{ ...remote, ...body, updated_at: 'accepted-version' }];
  };
  harness.render();
  await harness.flush();
  harness.edit({ name: 'Local edit' });
  await harness.flush();
  const submitted = harness.requests.filter((request) => request.type === 'update-character').at(-1).body;
  assert.equal(submitted.name, 'Local edit');
  assert.equal(submitted.details.notes, 'A campaign update');
  assert.equal(harness.character.name, 'Local edit');
  assert.equal(harness.character.details.notes, 'A campaign update');
  assert.equal(getBufferedCharacterSave(1, 'owner').status, 'none');
  assert.equal(harness.notices.length, 0);
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

test('nested independent edits and stable-ID array edits survive the three-way merge', () => {
  const base = {
    ...row(),
    details: { class: { id: 1 }, background: { id: 1 } },
    inventory: {
      items: [
        { id: 'a', quantity: 1 },
        { id: 'b', quantity: 1 },
      ],
    },
  };
  const local = {
    ...base,
    details: { ...base.details, class: { id: 2 } },
    inventory: {
      items: [
        { id: 'a', quantity: 2 },
        { id: 'b', quantity: 1 },
      ],
    },
  };
  const remote = {
    ...base,
    details: { ...base.details, background: { id: 2 } },
    inventory: {
      items: [
        { id: 'b', quantity: 3 },
        { id: 'a', quantity: 1 },
        { id: 'c', quantity: 1 },
      ],
    },
  };
  const merged = mergeCharacterOnConflict(base, local, remote);
  assert.deepEqual(merged.conflicts, []);
  assert.deepEqual(merged.character.details, { class: { id: 2 }, background: { id: 2 } });
  assert.deepEqual(merged.character.inventory.items, [
    { id: 'b', quantity: 3 },
    { id: 'a', quantity: 2 },
    { id: 'c', quantity: 1 },
  ]);
});

test('same-leaf edits and delete-versus-edit conflicts are reported explicitly', () => {
  const base = { ...row(), details: { class: { id: 1 } }, inventory: { items: [{ id: 'a', quantity: 1 }] } };
  const merged = mergeCharacterOnConflict(
    base,
    { ...base, details: { class: { id: 2 } }, inventory: { items: [] } },
    { ...base, details: { class: { id: 3 } }, inventory: { items: [{ id: 'a', quantity: 2 }] } }
  );
  assert.deepEqual(merged.conflicts, ['inventory.items[a]', 'details.class.id']);
  assert.equal(merged.character.details.class.id, 2);
});

test('same-value conflict pauses saves and keeps a draft until explicit resolution', async () => {
  let saves = 0;
  harness.request = async (type, body) => {
    if (type === 'find-character') return row();
    saves++;
    if (saves === 1)
      return { __conflict: true, character: { ...row(), name: 'Remote name', updated_at: 'remote-version' } };
    return [{ ...row(), ...body, updated_at: 'accepted-version' }];
  };
  harness.render();
  await harness.flush();
  harness.edit({ name: 'My name' });
  await harness.flush();
  assert.equal(saves, 1, 'conflicting value is never silently overwritten');
  const draft = getBufferedCharacterSave(1, 'owner').draft;
  assert.equal(draft.requiresCalculation, true, 'pagehide replay cannot bypass conflict choice');
  assert.equal(draft.body.name, 'My name');
  const notice = harness.notices.find((value) => value.title === 'Conflicting character edits');
  assert(notice);
  const buttons = notice.message.props.children[1].props.children;
  buttons[0].props.onClick();
  await harness.flush();
  assert.equal(saves, 2);
  assert.equal(
    harness.requests.filter((value) => value.type === 'update-character')[1].body.expected_updated_at,
    'remote-version'
  );
  harness.unmount();
  assert.ok(harness.hiddenNotices.includes('character-conflict-1'));
});

test('choosing the saved version discards the matching conflict draft before navigation', async () => {
  const remote = { ...row(), name: 'Remote name', updated_at: 'remote-version' };
  let saves = 0;
  harness.request = async (type) => {
    if (type === 'find-character') return row();
    saves++;
    return { __conflict: true, character: remote };
  };
  harness.render();
  await harness.flush();
  harness.edit({ name: 'My rejected name' });
  await harness.flush();
  const notice = harness.notices.find((value) => value.title === 'Conflicting character edits');
  notice.message.props.children[1].props.children[1].props.onClick();
  assert.equal(getBufferedCharacterSave(1, 'owner').status, 'none');
  await harness.flush();
  assert.equal(harness.character.name, 'Remote name');
  assert.equal(saves, 1, 'choosing remote must not write rejected input back');
  harness.unmount();
  harness = new HookHost();
  harness.request = async (type) => {
    assert.equal(type, 'find-character', 'the rejected draft must never replay');
    return remote;
  };
  harness.render();
  await harness.flush();
  assert.equal(harness.character.name, 'Remote name');
  assert.equal(getBufferedCharacterSave(1, 'owner').status, 'none');
  harness.unmount();
});

test('a completed failed save retries through the editor when connectivity returns', async () => {
  let online = false;
  harness.request = async (type, body) =>
    type === 'find-character' ? row() : online ? [{ ...row(), ...body, updated_at: 'version-2' }] : null;
  harness.render();
  await harness.flush();
  harness.edit({ name: 'Survives interruption' });
  await harness.flush();
  assert.equal(getBufferedCharacterSave(1, 'owner').draft.body.name, 'Survives interruption');
  assert.equal(harness.notices.length, 1);
  assert.equal(harness.notices[0].title, 'Changes not saved');
  harness.hiddenNotices = [];
  online = true;
  events.get('online')?.();
  await harness.flush();
  assert.equal(harness.requests.filter((request) => request.type === 'update-character').length, 2);
  assert.equal(getBufferedCharacterSave(1, 'owner').status, 'none');
  assert.equal(harness.notices.length, 1, 'successful retry must not add another toast');
  assert.ok(harness.hiddenNotices.includes('character-save-failed'));
  harness.unmount();
});

test('an uncertain write preserves a later deliberate revert whether it committed or not', () => {
  const base = { ...row(), hp_current: 20 };
  const submitted = { ...base, hp_current: 10 };
  for (const remote of [base, { ...submitted, updated_at: 'version-2' }]) {
    const merged = mergeCharacterSave(base, { ...base, name: 'Later edit' }, remote, submitted);
    assert.equal(merged.character.hp_current, 20);
    assert.equal(merged.character.name, 'Later edit');
    assert.deepEqual(merged.conflicts, []);
  }
  assert.deepEqual(mergeCharacterSave(base, base, { ...base, hp_current: 5 }, submitted).conflicts, ['hp_current']);
});

test('a lost acknowledgement and a later intentional revert survive reconnect', async () => {
  let server = { ...row(), hp_current: 20 };
  const first = deferred();
  let writes = 0;
  harness.request = async (type, body) => {
    if (type === 'find-character') return server;
    writes++;
    server = { ...server, ...body, updated_at: `version-${writes + 1}` };
    return writes === 1 ? first.promise : [server];
  };
  harness.render();
  await harness.flush();
  harness.edit({ hp_current: 10 });
  await harness.flush();
  harness.edit({ hp_current: 20 });
  await harness.flush();
  assert.equal(getBufferedCharacterSave(1, 'owner').draft.body.hp_current, 20);
  assert.equal(getBufferedCharacterSave(1, 'owner').draft.submission.body.hp_current, 10);
  first.resolve(null);
  await harness.flush();
  assert.equal(harness.value.saveState, 'failed');
  events.get('focus')();
  await harness.flush();
  assert.equal(server.hp_current, 20);
  assert.equal(writes, 2);
  assert.equal(getBufferedCharacterSave(1, 'owner').status, 'none');
  harness.unmount();
});

test('reopening reconciles an uncertain submission before saving the latest input', async () => {
  const base = { ...row(), hp_current: 20 };
  bufferCharacterSave(base, 'owner', base.updated_at, { base, requiresCalculation: false });
  journalCharacterSaveSubmission(1, 'owner', { ...base, hp_current: 10 }, base.updated_at);
  let server = { ...base, hp_current: 10, updated_at: 'version-2' };
  harness.request = async (type, body) => {
    if (type === 'find-character') return server;
    server = { ...server, ...body, updated_at: 'version-3' };
    return [server];
  };
  harness.render();
  await harness.flush();
  assert.equal(harness.character.hp_current, 20);
  assert.equal(server.hp_current, 20);
  assert.equal(harness.requests.filter((request) => request.type === 'update-character').length, 1);
  harness.unmount();
});

test('independent drafts from two tabs merge without granting stale data a newer version', async () => {
  const base = { ...row(), hp_current: 20 };
  bufferCharacterSave({ ...base, name: 'Offline rename' }, 'owner', base.updated_at, {
    base,
    requiresCalculation: false,
    writerId: 'other-tab',
  });
  let server = { ...base, hp_current: 10, updated_at: 'version-2' };
  harness.request = async (type, body) => {
    if (type === 'find-character') return server;
    assert.equal(body.expected_updated_at, 'version-2');
    server = { ...server, ...body, updated_at: 'version-3' };
    return [server];
  };
  harness.render();
  await harness.flush();
  assert.equal(server.hp_current, 10);
  assert.equal(server.name, 'Offline rename');
  assert.equal(getBufferedCharacterSave(1, 'owner', 'other-tab').status, 'none');
  harness.unmount();
});

test('failed initial loading stays on the character route and can retry', async () => {
  harness.request = async () => {
    throw new Error('Connection unavailable');
  };
  harness.render();
  await harness.flush();
  assert.equal(harness.value.loadError, true);
  assert.equal(window.location.href, '');
  assert.equal(harness.character, null);
  harness.request = async () => row();
  harness.value.retryLoad();
  await harness.flush();
  assert.equal(harness.value.loadError, false);
  assert.equal(harness.character.name, row().name);
  harness.unmount();
});

test('a full local store never reports the pending edit as saved or durable', async () => {
  harness.render();
  await harness.flush();
  localStorage.setItem = () => {
    throw new Error('Quota exceeded');
  };
  harness.request = async () => null;
  harness.edit({ name: 'Memory-only edit' });
  await harness.flush();
  assert.equal(harness.value.draftStored, false);
  assert.equal(harness.value.saveState, 'failed');
  assert.equal(harness.character.name, 'Memory-only edit');
  harness.unmount();
});

test('a completed calculation cannot submit a stale debounced route snapshot over restored edits', async () => {
  bufferCharacterSave({ ...row(), name: 'Recovered name' }, 'owner', 'version-1', {
    base: row(),
    requiresCalculation: false,
    writerId: 'closed-page',
  });
  const calculation = deferred();
  harness.debouncedCharacter = row();
  harness.options = {
    type: 'EXECUTE_OPS',
    data: { content: {}, context: 'CHARACTER-SHEET', onFinishLoading: () => {} },
  };
  harness.calculate = () => calculation.promise;
  harness.render();
  await harness.flush();
  assert.equal(harness.character.name, 'Recovered name');
  calculation.resolve({});
  await harness.flush();
  const saves = harness.requests.filter((request) => request.type === 'update-character');
  assert.equal(saves.length, 1);
  assert.equal(saves[0].body.name, 'Recovered name');
  harness.unmount();
});

test('a slow calculation cannot replace a newer HP edit with its earlier clamped snapshot', async () => {
  const calculation = deferred();
  const original = { ...row(), hp_current: 20, meta_data: { reset_hp: false } };
  harness.options = {
    type: 'EXECUTE_OPS',
    data: { content: { items: [] }, context: 'CHARACTER-SHEET', onFinishLoading() {} },
  };
  harness.confirmHealth = actualConfirmHealth;
  harness.calculate = () => calculation.promise;
  harness.request = async (type, body) =>
    type === 'find-character' ? original : [{ ...original, ...body, updated_at: 'version-2' }];
  harness.render();
  await harness.flush();
  harness.edit({ hp_current: 5, name: 'Latest name', notes: 'Latest notes' });
  await harness.flush();
  assert.equal(harness.character.hp_current, 5);
  calculation.resolve({});
  await harness.flush();
  assert.equal(harness.character.hp_current, 5);
  assert.equal(harness.character.name, 'Latest name');
  assert.equal(harness.character.notes, 'Latest notes');
  const saved = harness.requests.filter((request) => request.type === 'update-character');
  assert.ok(saved.every((request) => request.body.hp_current === 5));
  harness.unmount();
});

test('delayed calculated-stat persistence preserves newer HP, name, and notes', async () => {
  let current = { ...row(), hp_current: 20, meta_data: { reset_hp: false } };
  actualSaveCalculatedStats('CHARACTER', current, (update) => {
    current = typeof update === 'function' ? update(current) : update;
  });
  current = { ...current, hp_current: 5, name: 'Latest name', notes: 'Latest notes' };
  await new Promise((resolve) => setTimeout(resolve, 120));
  assert.equal(current.hp_current, 5);
  assert.equal(current.name, 'Latest name');
  assert.equal(current.notes, 'Latest notes');
  assert.equal(current.meta_data.calculated_stats.hp_max, 10);
});

test('HP normalization delivered after another HP edit uses the latest value', async () => {
  const calculation = deferred();
  const original = { ...row(), hp_current: 20, meta_data: { reset_hp: false } };
  harness.options = {
    type: 'EXECUTE_OPS',
    data: { content: { items: [] }, context: 'CHARACTER-SHEET', onFinishLoading() {} },
  };
  harness.confirmHealth = actualConfirmHealth;
  harness.deferCharacterCommits = true;
  harness.calculate = () => calculation.promise;
  harness.request = async (type, body) =>
    type === 'find-character' ? original : [{ ...original, ...body, updated_at: 'version-2' }];
  harness.render();
  await harness.flush();
  calculation.resolve({});
  await harness.flush();
  harness.edit({ hp_current: 5 });
  const deliver = harness.pendingCharacterCommit;
  harness.pendingCharacterCommit = null;
  deliver?.();
  await harness.flush();
  assert.equal(harness.character.hp_current, 5);
  harness.unmount();
});

test('one calculation preserves both health normalization and calculated-stat completion updates', async () => {
  const calculation = deferred();
  const original = { ...row(), hp_current: 20, meta_data: { reset_hp: false } };
  harness.options = {
    type: 'EXECUTE_OPS',
    data: { content: { items: [] }, context: 'CHARACTER-SHEET', onFinishLoading() {} },
  };
  harness.confirmHealth = actualConfirmHealth;
  harness.saveCalculatedStats = actualSaveCalculatedStats;
  harness.deferCharacterCommits = true;
  harness.calculate = () => calculation.promise;
  harness.request = async (type, body) =>
    type === 'find-character' ? original : [{ ...original, ...body, updated_at: 'version-2' }];
  harness.render();
  await harness.flush();
  calculation.resolve({});
  await harness.flush();
  await new Promise((resolve) => setTimeout(resolve, 120));
  const deliver = harness.pendingCharacterCommit;
  harness.pendingCharacterCommit = null;
  deliver?.();
  await harness.flush();
  assert.equal(harness.character.hp_current, 10);
  assert.equal(harness.character.meta_data.calculated_stats.hp_max, 10);
  harness.unmount();
});

test('JSON-normalized save acknowledgements clear the draft without a notification', async () => {
  harness.request = async (type, body) =>
    type === 'find-character' ? row() : JSON.parse(JSON.stringify([{ ...row(), ...body, updated_at: 'version-2' }]));
  harness.render();
  await harness.flush();
  harness.edit({ name: 'Confirmed JSON save', details: { description: undefined } });
  await harness.flush();
  assert.equal(harness.value.saveState, 'saved');
  assert.equal(getBufferedCharacterSave(1, 'owner').status, 'none');
  assert.equal(harness.notices.length, 0);
  harness.unmount();
});

test('incoming campaign HP updates advance the server base without echoing a write', async () => {
  let remote = { ...row(), hp_current: 20 };
  harness.request = async (type) => {
    assert.equal(type, 'find-character', 'receiving remote data must not send it back');
    return structuredClone(remote);
  };
  harness.render();
  await harness.flush();
  remote = { ...remote, hp_current: 12, updated_at: 'version-2' };
  await harness.poll();
  assert.equal(harness.character.hp_current, 12);
  for (let i = 0; i < 4; i++) await harness.poll();
  assert.equal(harness.requests.filter(({ type }) => type === 'update-character').length, 0);
  assert.equal(harness.value.saveState, 'saved');
  harness.unmount();
});

test('a remote HP change merges with unsaved local notes and the single save uses the new version', async () => {
  let remote = { ...row(), hp_current: 20, notes: { pages: [] } };
  harness.request = async (type, body) => {
    if (type === 'find-character') return structuredClone(remote);
    assert.equal(body.expected_updated_at, 'version-2');
    remote = { ...remote, ...body, updated_at: 'version-3' };
    return [structuredClone(remote)];
  };
  harness.render();
  await harness.flush();
  harness.debouncedCharacter = harness.character;
  harness.edit({ notes: { pages: [{ id: 'note', title: 'My local note' }] } });
  await harness.flush();
  remote = { ...remote, hp_current: 12, updated_at: 'version-2' };
  await harness.poll();
  assert.equal(harness.character.hp_current, 12);
  assert.equal(harness.character.notes.pages[0].title, 'My local note');
  harness.debouncedCharacter = harness.character;
  harness.render();
  await harness.flush();
  for (let i = 0; i < 4; i++) await harness.poll();
  assert.equal(harness.requests.filter(({ type }) => type === 'update-character').length, 1);
  assert.equal(remote.hp_current, 12);
  assert.equal(remote.notes.pages[0].title, 'My local note');
  harness.unmount();
});

test('a delayed remote read cannot roll back a save accepted while that read was in flight', async () => {
  harness.render();
  await harness.flush();
  const stale = deferred();
  harness.request = async (type, body) =>
    type === 'find-character' ? stale.promise : [{ ...row(), ...body, updated_at: 'version-3' }];
  const polling = harness.poll();
  await harness.flush();
  harness.edit({ name: 'Newer saved name' });
  await harness.flush();
  stale.resolve({ ...row(), name: 'Older remote name', updated_at: 'version-2' });
  await polling;
  assert.equal(harness.character.name, 'Newer saved name');
  assert.equal(harness.value.saveState, 'saved');
  assert.equal(harness.requests.filter(({ type }) => type === 'update-character').length, 1);
  harness.unmount();
});

test('incoming same-field conflicts preserve the draft and pause writes until a choice', async () => {
  harness.render();
  await harness.flush();
  harness.debouncedCharacter = harness.character;
  harness.edit({ name: 'My unsaved name' });
  await harness.flush();
  harness.request = async () => ({ ...row(), name: 'GM changed name', updated_at: 'version-2' });
  await harness.poll();
  assert.equal(harness.character.name, 'My unsaved name');
  assert.equal(harness.value.saveState, 'conflict');
  assert.equal(harness.requests.filter(({ type }) => type === 'update-character').length, 0);
  assert.equal(getBufferedCharacterSave(1, 'owner').draft.body.name, 'My unsaved name');
  assert.ok(harness.notices.some(({ id }) => id === 'character-conflict-1'));
  harness.unmount();
});

test('failed incoming reads retain the current sheet and never redirect or write', async () => {
  harness.render();
  await harness.flush();
  harness.request = async () => {
    throw new Error('Connection unavailable');
  };
  await harness.poll();
  assert.equal(harness.character.name, 'Character 1');
  assert.equal(harness.value.loadError, false);
  assert.equal(window.location.href, '');
  assert.equal(harness.requests.filter(({ type }) => type === 'update-character').length, 0);
  harness.unmount();
});

test('late remote reads cannot update a different account or character after navigation', async () => {
  harness.render();
  await harness.flush();
  const stale = deferred();
  harness.request = async (type, body) => (body.id === 1 ? stale.promise : row(body.id));
  const polling = harness.poll();
  await harness.flush();
  harness.characterId = 2;
  harness.session = { user: { id: 'next-owner' } };
  harness.render();
  await harness.flush();
  stale.resolve({ ...row(), name: 'Wrong scope', updated_at: 'version-2' });
  await polling;
  assert.equal(harness.character.id, 2);
  assert.equal(harness.character.name, 'Character 2');
  assert.equal(harness.requests.filter(({ type }) => type === 'update-character').length, 0);
  harness.unmount();
});

test('incoming conditions invalidate a slow calculation and settle without echoing the remote row', async () => {
  let remote = row();
  const calculations = [];
  harness.options = {
    type: 'EXECUTE_OPS',
    data: { content: { items: [] }, context: 'CHARACTER-SHEET', onFinishLoading() {} },
  };
  harness.calculate = () => {
    const pending = deferred();
    calculations.push(pending);
    return pending.promise;
  };
  harness.request = async (type) => {
    assert.equal(type, 'find-character');
    return structuredClone(remote);
  };
  harness.render();
  await harness.flush();
  assert.equal(calculations.length, 1);
  remote = { ...remote, details: { conditions: [{ name: 'Frightened', value: 1 }] }, updated_at: 'version-2' };
  await harness.poll();
  assert.equal(calculations.length, 2);
  calculations[0].resolve({ old: true });
  await harness.flush();
  assert.equal(harness.value.results, null);
  calculations[1].resolve({ current: true });
  await harness.flush();
  for (let i = 0; i < 3; i++) await harness.poll();
  assert.deepEqual(harness.value.results, { current: true });
  assert.equal(harness.value.saveState, 'saved');
  assert.equal(harness.requests.filter(({ type }) => type === 'update-character').length, 0);
  harness.unmount();
});

test('initial HP already at maximum clears the reset flag so remote damage survives later conditions', async () => {
  let remote = { ...row(), hp_current: 10, meta_data: {} };
  let revision = 1;
  harness.options = {
    type: 'EXECUTE_OPS',
    data: {
      content: { items: [] },
      context: 'CHARACTER-SHEET',
      onFinishLoading() {},
    },
  };
  harness.calculate = async () => ({});
  harness.confirmHealth = actualConfirmHealth;
  harness.request = async (type, body) => {
    if (type === 'find-character') return structuredClone(remote);
    remote = { ...remote, ...body, updated_at: `version-${++revision}` };
    return [structuredClone(remote)];
  };
  harness.render();
  await harness.flush();
  assert.equal(remote.meta_data.reset_hp, false, 'initialization must finish even when HP needs no numeric change');
  remote = { ...remote, hp_current: 7, updated_at: `version-${++revision}` };
  await harness.poll();
  remote = {
    ...remote,
    details: { ...remote.details, conditions: [{ name: 'Frightened', value: 1 }] },
    updated_at: `version-${++revision}`,
  };
  await harness.poll();
  assert.equal(harness.character.hp_current, 7, 'a later calculation must not heal remotely applied damage');
  assert.equal(remote.hp_current, 7);
  harness.unmount();
});

test('remote source changes pause calculations until the page reloads matching content', async () => {
  let remote = { ...row(), content_sources: { enabled: [1] } };
  let calculations = 0;
  const sourceRequests = [];
  harness.options = {
    type: 'EXECUTE_OPS',
    data: {
      content: { items: [], defaultSources: { PAGE: [1, 3] } },
      context: 'CHARACTER-SHEET',
      onFinishLoading() {},
      onSourcesChange(sources) {
        sourceRequests.push(sources);
      },
    },
  };
  harness.calculate = async () => {
    calculations++;
    return {};
  };
  harness.request = async (type) => {
    assert.equal(type, 'find-character');
    return structuredClone(remote);
  };
  harness.render();
  await harness.flush();
  assert.equal(calculations, 1);
  remote = { ...remote, content_sources: { enabled: [1, 256] }, updated_at: 'version-2' };
  await harness.poll();
  assert.equal(calculations, 1, 'the old content package must not recalculate the changed character');
  assert.deepEqual(sourceRequests, [[1, 256]]);
  assert.equal(getBufferedCharacterSave(1, 'owner').draft.requiresCalculation, true);
  harness.options = {
    ...harness.options,
    data: { ...harness.options.data, content: { items: [], defaultSources: { PAGE: [1, 3, 256] } } },
  };
  harness.render();
  await harness.flush();
  assert.equal(calculations, 2);
  assert.equal(harness.requests.filter(({ type }) => type === 'update-character').length, 0);
  harness.unmount();
});

test('a public viewer receives remote changes without turning calculated local values into a conflict', async () => {
  harness.session = null;
  let remote = { ...row(), hp_current: 20 };
  harness.request = async (type) => {
    assert.equal(type, 'find-character');
    return structuredClone(remote);
  };
  harness.render();
  await harness.flush();
  harness.edit({ hp_current: 19 });
  await harness.flush();
  remote = { ...remote, hp_current: 12, updated_at: 'version-2' };
  await harness.poll();
  assert.equal(harness.character.hp_current, 12);
  assert.equal(harness.value.saveState, 'saved');
  assert.equal(harness.notices.length, 0);
  assert.equal(harness.requests.filter(({ type }) => type === 'update-character').length, 0);
  harness.unmount();
});
