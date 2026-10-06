/** Run the real picker render logic with delayed query data and the real search index. */
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(`${root}/package.json`);
const { build } = require('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-content-selection-'));
after(() => rm(directory, { recursive: true, force: true }));
let host;
class RenderHost {
  constructor() {
    this.data = undefined;
    this.slots = [];
    this.effects = [];
  }
  render(component, props) {
    host = this;
    this.cursor = 0;
    this.effects = [];
    const result = component(props);
    for (const effect of this.effects) effect();
    return result;
  }
  memo(callback, deps) {
    const index = this.cursor++;
    const prior = this.slots[index];
    if (!prior || deps.some((value, i) => !Object.is(value, prior.deps[i])))
      this.slots[index] = { deps, value: callback() };
    return this.slots[index].value;
  }
  ref(value) {
    const index = this.cursor++;
    return (this.slots[index] ??= { current: value });
  }
  effect(callback, deps) {
    const index = this.cursor++;
    const prior = this.slots[index];
    if (!prior || !deps || deps.some((value, i) => !Object.is(value, prior.deps?.[i]))) {
      this.slots[index] = { deps };
      this.effects.push(callback);
    }
  }
  state(value) {
    const index = this.cursor++;
    if (this.searchQuery !== undefined && typeof value === 'string') return [this.searchQuery, () => {}];
    const slot = (this.slots[index] ??= { value: typeof value === 'function' ? value() : value });
    return [slot.value, (next) => (slot.value = typeof next === 'function' ? next(slot.value) : next)];
  }
}
globalThis.__selectionHooks = {
  useRef: (value) => host.ref(value),
  useMemo: (callback, deps) => host.memo(callback, deps),
  useEffect: (callback, deps) => host.effect(callback, deps),
  useState: (value) => host.state(value),
  useQuery: (options) => {
    host.queryOptions = options;
    return {
      data: host.data,
      isFetching: host.data === undefined && !host.error,
      isError: !!host.error,
      refetch: () => (host.retried = true),
    };
  },
};
const special = {
  useAtom: '() => [null, value => { globalThis.__selectionDrawer = value; }]',
  useAtomValue: '() => null',
  collectEntitySpellcasting: '(id, entity) => entity.spells',
  isSpellVisible: '() => true',
  isNormalSpell: '() => true',
  isRitual: '() => false',
  isTruthy: 'value => !!value',
  getVariable: '() => undefined',
  useMantineTheme: '() => ({colors:{dark:[],guide:[]}})',
  useMantineColorScheme: '() => ({colorScheme:"dark"})',
  getDefaultSources: '() => [1]',
  getDefaultSourcesKey: '() => "1"',
  openContextModal: 'value => { globalThis.__selectionModal = value; }',
  useDebouncedValue: 'value => [value]',
  getCachedContent: '() => []',
  getContentFast: '() => []',
  fetchContent: 'async (...args) => { globalThis.__selectionFetch = args; return []; }',
  fetchContentAll: 'async (...args) => { globalThis.__selectionFetchAll = args; return []; }',
  fetchHazards: 'async (...args) => { globalThis.__selectionHazards = args; return []; }',
  fetchContentSources: 'async () => []',
  filterByTraitType: '() => []',
  hashData: 'value => JSON.stringify(value)',
  toLabel: 'value => String(value)',
  labelToVariable: 'value => globalThis.__selectionLabels(value)',
  Accordion: 'Object.assign(() => {}, {Item:"Accordion.Item",Control:"Accordion.Control",Panel:"Accordion.Panel"})',
};
const imports = new Map();
const paths = [
  'src/common/select/SelectContent.tsx',
  'src/modals/ManageSpellsModal.tsx',
  'src/modals/AddItemsModal.tsx',
  'src/modals/AdvancedSearchModal.tsx',
  'src/pages/character_sheet/panels/SpellsPanel.tsx',
  'src/process/spells/item-spell-dependencies.ts',
];
for (const path of paths) {
  const source = await readFile(join(root, path), 'utf8');
  for (const match of source.matchAll(/import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?/g)) {
    if (
      [
        'react',
        'js-search',
        'lodash-es',
        '@tanstack/react-query',
        './AdvancedSearchModal',
        '@spells/item-spell-dependencies',
      ].includes(match[2])
    )
      continue;
    const names = imports.get(match[2]) ?? new Set();
    const inside = match[1].match(/\{([\s\S]*?)\}/)?.[1];
    if (inside)
      for (const name of inside
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean))
        names.add(name);
    if (!match[1].trim().startsWith('{')) names.add('default');
    imports.set(match[2], names);
  }
}
const output = join(directory, 'selection.mjs');
await build({
  absWorkingDir: root,
  stdin: {
    contents: `export {SelectContentButton, selectContent, SelectionOptions, HazardSelectionOption, FeatSelectionOption} from './src/common/select/SelectContent'; export {default as ManageSpellsModal} from './src/modals/ManageSpellsModal'; export {default as AddItemsModal} from './src/modals/AddItemsModal'; export {AdvancedSearchModal} from './src/modals/AdvancedSearchModal'; export {default as SpellsPanel} from './src/pages/character_sheet/panels/SpellsPanel';`,
    resolveDir: root,
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: output,
  jsx: 'automatic',
  plugins: [
    {
      name: 'selection-render-boundaries',
      setup(b) {
        b.onResolve({ filter: /.*/ }, (args) => {
          if (
            args.path === 'react' ||
            args.path === 'react/jsx-runtime' ||
            args.path === '@tanstack/react-query' ||
            imports.has(args.path)
          )
            return { path: args.path, namespace: 'boundary' };
        });
        b.onLoad({ filter: /SelectContent\.tsx$/ }, async (args) => ({
          contents: `${await readFile(args.path, 'utf8')}\nexport {SelectionOptions};`,
          loader: 'tsx',
        }));
        b.onLoad({ filter: /.*/, namespace: 'boundary' }, (args) => {
          if (args.path === 'react')
            return { contents: 'export const {useRef,useMemo,useEffect,useState}=globalThis.__selectionHooks;' };
          if (args.path === '@tanstack/react-query')
            return { contents: 'export const {useQuery}=globalThis.__selectionHooks;' };
          if (args.path === 'react/jsx-runtime')
            return {
              contents:
                'export const jsx=(type,props)=>({type,props}); export const jsxs=jsx; export const Fragment="fragment";',
            };
          let contents = '';
          for (const name of imports.get(args.path)) {
            const value =
              special[name] ?? (name === 'default' || /^[A-Z]/.test(name) ? JSON.stringify(name) : '() => undefined');
            contents += name === 'default' ? `export default ${value};\n` : `export const ${name} = ${value};\n`;
          }
          return { contents };
        });
      },
    },
  ],
});
const {
  SelectContentButton,
  selectContent,
  SelectionOptions,
  HazardSelectionOption,
  FeatSelectionOption,
  ManageSpellsModal,
  AddItemsModal,
  AdvancedSearchModal,
  SpellsPanel,
} = await import(pathToFileURL(output).href);
const charm = { id: 1, name: 'Charm', rank: 1 };
const command = { id: 2, name: 'Command', rank: 1 };
const picker = { type: 'spell', searchQuery: 'Charm', limitSelectedOptions: false };
test('deprecated legacy feats stay visible for saved selections and disappear from new choices', () => {
  const host = new RenderHost();
  const feat = { id: 22108, name: 'Heal Companion', type: 'feat', meta_data: { deprecated: true } };
  assert.equal(host.render(FeatSelectionOption, { feat, onClick: () => {} }), null);
  assert.ok(host.render(FeatSelectionOption, { feat, selected: true, onClick: () => {} }));
  assert.ok(host.render(FeatSelectionOption, { feat: { ...feat, meta_data: {} }, onClick: () => {} }));
});
test('an already typed search displays content in the same render that its delayed query resolves', () => {
  const host = new RenderHost();
  assert.deepEqual(host.render(SelectionOptions, picker).props.options, []);
  host.data = [charm, command];
  assert.deepEqual(host.render(SelectionOptions, picker).props.options, [charm]);
});
test('search never offers an option removed by the current filter or override list', () => {
  const host = new RenderHost();
  host.data = [charm, command];
  host.render(SelectionOptions, picker);
  assert.deepEqual(host.render(SelectionOptions, picker).props.options, [charm]);
  assert.deepEqual(
    host.render(SelectionOptions, { ...picker, filterFn: (spell) => spell.id !== charm.id }).props.options,
    []
  );
  assert.deepEqual(host.render(SelectionOptions, { ...picker, overrideOptions: [command] }).props.options, []);
});

test('hazard selections use their source-scoped reader without entering the creature cache', async () => {
  const host = new RenderHost();
  const hazard = { id: 11, name: 'Boneburst', level: 14, content_source_id: 400 };
  const windSurge = { id: 12, name: 'Wind Surge', level: 7, content_source_id: 401 };
  globalThis.__selectionFetchAll = undefined;
  globalThis.__selectionHazards = undefined;
  host.render(SelectionOptions, { type: 'hazard', searchQuery: 'Bone', limitSelectedOptions: false });
  await host.queryOptions.queryFn();
  assert.deepEqual(globalThis.__selectionHazards, [[1]]);
  assert.equal(globalThis.__selectionFetchAll, undefined);
  assert.equal(host.queryOptions.queryKey[0], 'select-content-options-hazard');
  host.data = [hazard, windSurge];
  assert.deepEqual(
    host.render(SelectionOptions, { type: 'hazard', searchQuery: 'Bone', limitSelectedOptions: false }).props.options,
    [hazard]
  );
  const result = host.render(SelectionOptions, {
    type: 'hazard',
    sourceId: 401,
    searchQuery: '',
    limitSelectedOptions: false,
  });
  assert.deepEqual(result.props.options, [windSurge]);
  await host.queryOptions.queryFn();
  assert.deepEqual(globalThis.__selectionHazards, [[401]]);
});

test('creature selections retain their ordinary source-scoped reader', async () => {
  const host = new RenderHost();
  globalThis.__selectionHazards = undefined;
  host.render(SelectionOptions, { type: 'creature', sourceId: 400, searchQuery: '', limitSelectedOptions: false });
  await host.queryOptions.queryFn();
  assert.deepEqual(globalThis.__selectionFetchAll, ['creature', [400]]);
  assert.equal(globalThis.__selectionHazards, undefined);
});

test('a failed hazard catalog offers retry instead of claiming the book contains no hazards', () => {
  const host = new RenderHost();
  host.error = new Error('Hazard catalog unavailable');
  const tree = host.render(SelectionOptions, { type: 'hazard', searchQuery: '', limitSelectedOptions: false });
  const retry = findChild(tree, 'Button');
  assert.equal(retry.props.children, 'Retry');
  assert.equal(retry.props.loading, false);
  retry.props.onClick();
  assert.equal(host.retried, true);
});

test('hazard rows preview their exact snapshot above the picker and select without creature adjustments', () => {
  const host = new RenderHost();
  const hazard = {
    id: 11,
    name: 'Boneburst',
    level: 14,
    deprecated: false,
    details: { complexity: 'COMPLEX' },
  };
  let selected;
  const tree = host.render(HazardSelectionOption, {
    hazard,
    previewZIndex: 751,
    onClick: (option) => (selected = option),
  });
  assert.equal(tree.props.level, 14);
  tree.props.onClick();
  assert.deepEqual(globalThis.__selectionDrawer, {
    type: 'hazard',
    data: { hazard, zIndex: 751 },
    extra: { addToHistory: true },
  });
  assert.equal(tree.props.buttonOverride.type, 'Button');
  assert.equal(tree.props.buttonOverride.props.children, 'Select');
  assert.equal(tree.props.includeOptions, undefined);
  let propagationStopped = false;
  tree.props.buttonOverride.props.onClick({ stopPropagation: () => (propagationStopped = true) });
  assert.equal(propagationStopped, true);
  assert.equal(selected, hazard);
  assert.equal(host.render(HazardSelectionOption, { hazard: { ...hazard, deprecated: true }, onClick() {} }), null);
});

test('the shared picker preserves hazard modal options and selection callbacks', () => {
  const hazard = { id: 11, name: 'Boneburst' };
  let selected;
  selectContent('hazard', (option) => (selected = option), { zIndex: 750 });
  assert.equal(globalThis.__selectionModal.innerProps.type, 'hazard');
  assert.equal(globalThis.__selectionModal.zIndex, 750);
  globalThis.__selectionModal.innerProps.onClick(hazard);
  assert.equal(selected, hazard);
});

test('an optimistic selection does not roll back while its parent value is stale', () => {
  const host = new RenderHost();
  const first = { id: 'first', name: 'First option' };
  const second = { id: 'second', name: 'Second option' };
  const props = {
    type: 'item',
    selectedId: first.id,
    options: { overrideOptions: [first, second] },
    onClick: () => {},
  };
  const buttons = (node) => {
    if (!node || typeof node !== 'object') return [];
    return [node.type === 'Button' ? node : [], ...[node.props?.children].flat(Infinity).flatMap(buttons)].flat();
  };

  host.render(SelectContentButton, props);
  let tree = host.render(SelectContentButton, props);
  buttons(tree)[1].props.onClick();
  globalThis.__selectionModal.innerProps.onClick(second);

  tree = host.render(SelectContentButton, { ...props, options: { overrideOptions: [first, second] } });
  assert.equal(buttons(tree)[0].props.children, second.name);
  tree = host.render(SelectContentButton, { ...props, options: { overrideOptions: [first, second] } });
  assert.equal(buttons(tree)[0].props.children, second.name);

  tree = host.render(SelectContentButton, { ...props, selectedId: second.id });
  assert.equal(buttons(tree)[0].props.children, second.name);
});

function findChild(node, componentName) {
  if (!node || typeof node !== 'object') return undefined;
  if (node.type?.name === componentName || node.type === componentName) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const found = findChild(child, componentName);
    if (found) return found;
  }
}
test('manage spells updates an active search when its catalog arrives or a source is removed', () => {
  const host = new RenderHost();
  host.searchQuery = 'Charm';
  const props = {
    id: 'CHARACTER',
    entity: { id: 1, spells: { list: [{ spell_id: 1, source: 'Wizard', rank: 1 }], slots: [] } },
    source: 'Wizard',
    type: 'LIST-ONLY',
    opened: true,
    onClose: () => {},
    setEntity: () => {},
  };
  const list = () => findChild(host.render(ManageSpellsModal, props), 'ListSection').props.spells;
  assert.deepEqual(list(), []);
  host.data = [charm, command];
  assert.deepEqual(list(), [charm]);
  host.data = [command];
  assert.deepEqual(list(), []);
});

/** Flush the preset effect and inspect the next render, as React does after a state change. */
function searchTree(host, props) {
  host.render(AdvancedSearchModal, props);
  return host.render(AdvancedSearchModal, props);
}

test('item search keeps user filters through parent rerenders with equivalent presets', () => {
  const parent = new RenderHost();
  parent.data = [];
  const child = new RenderHost();
  const props = { context: { closeModal() {} }, id: 'items', innerProps: { onAddItem() {} } };
  const childProps = () => ({
    ...findChild(parent.render(AddItemsModal, props), AdvancedSearchModal).props,
    opened: true,
  });
  let p = childProps();
  let tree = searchTree(child, p);
  findChild(tree, 'RangeSlider').props.onChange([3, 7]);
  assert.deepEqual(findChild(searchTree(child, p), 'RangeSlider').props.value, [3, 7]);
  for (let i = 0; i < 3; i++) {
    const next = childProps();
    assert.notEqual(next.presetFilters, p.presetFilters);
    assert.deepEqual(next.presetFilters, p.presetFilters);
    assert.deepEqual(findChild(searchTree(child, next), 'RangeSlider').props.value, [3, 7]);
    p = next;
  }
});

test('advanced search still resets when preset values or source scope really change', () => {
  const host = new RenderHost();
  let props = { opened: true, presetFilters: { type: 'item', content_sources: [1] } };
  let tree = searchTree(host, props);
  findChild(tree, 'RangeSlider').props.onChange([3, 7]);
  props = { ...props, presetFilters: { type: 'item', content_sources: [7], level_min: 2, level_max: 8 } };
  tree = searchTree(host, props);
  assert.deepEqual(findChild(tree, 'RangeSlider').props.value, [2, 8]);
  props = { ...props, presetFilters: { type: 'item', content_sources: [1] } };
  assert.deepEqual(findChild(searchTree(host, props), 'RangeSlider').props.value, [0, 30]);
});

const protectorTree = { id: 6759, name: 'Protector Tree', rank: 1 };
const spellPanelProps = {
  id: 'CHARACTER',
  content: { items: [], spells: [charm] },
  entity: { id: 1, spells: { sources: [], list: [], slots: [], focus: [], innate: [{ spell_id: 6759 }] } },
  setEntity() {},
  panelHeight: 600,
  panelWidth: 500,
};

test('innate spells from other books supplement the loaded catalog without delaying it', async () => {
  const host = new RenderHost();
  host.render(SpellsPanel, { ...spellPanelProps, entity: null });
  const spells = () => findChild(host.render(SpellsPanel, spellPanelProps), 'SpellList').props.allSpells;
  assert.deepEqual(spells(), [charm]);
  host.data = [protectorTree];
  assert.deepEqual(spells(), [charm, protectorTree]);
  assert.equal(host.queryOptions.enabled, true);
  await host.queryOptions.queryFn();
  assert.deepEqual(globalThis.__selectionFetch, ['spell', { id: [6759] }]);
  // Only currently granted, missing spells belong in the supplement, even if a
  // previous response contains other spells or a grant has just been removed.
  host.data = [protectorTree, command, charm];
  assert.deepEqual(spells(), [charm, protectorTree]);
  const withoutGrant = {
    ...spellPanelProps,
    entity: { ...spellPanelProps.entity, spells: { ...spellPanelProps.entity.spells, innate: [] } },
  };
  const removed = host.render(SpellsPanel, withoutGrant);
  assert.deepEqual(findChild(removed, 'SpellList').props.allSpells, [charm]);
  assert.equal(host.queryOptions.enabled, false);
});

test('late innate spell data respects an active search and never replaces source-enabled rows', () => {
  const host = new RenderHost();
  let tree = host.render(SpellsPanel, spellPanelProps);
  findChild(tree, 'TextInput').props.onChange({ target: { value: 'Protector' } });
  assert.deepEqual(findChild(host.render(SpellsPanel, spellPanelProps), 'SpellList').props.allSpells, []);
  host.data = [protectorTree];
  tree = host.render(SpellsPanel, spellPanelProps);
  assert.deepEqual(findChild(tree, 'SpellList').props.allSpells, [protectorTree]);
  const enabledTree = { ...protectorTree, name: 'Protector Tree (current)' };
  const enabled = { ...spellPanelProps, content: { ...spellPanelProps.content, spells: [charm, enabledTree] } };
  assert.deepEqual(findChild(host.render(SpellsPanel, enabled), 'SpellList').props.allSpells, [enabledTree]);
  assert.equal(host.queryOptions.enabled, false);
});

test('War item selections retain intrinsic traits with the parent book disabled and preserve saved copies', async (t) => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20260930010000_war_of_immortals_item_traits.sql', import.meta.url),
    'utf8'
  );
  const patches = JSON.parse(migration.split('$patches$')[1]);
  assert.deepEqual(
    patches.map(({ id, before, after }) => ({ id, before, after })),
    [
      { id: 17481, before: [1504, 4072], after: [1504, 4072, 1706, 1537] },
      { id: 17480, before: [], after: [1533] },
    ]
  );
  const fixtures = await readContentRows([
    ...[17481, 17480, 16297].map((id) => ({ table: 'item', id })),
    ...[1504, 4072, 1706, 1537, 1533].map((id) => ({ table: 'trait', id })),
  ]);
  const originals = structuredClone(fixtures);
  const engine = await createOperationEngine();
  t.after(() => engine.cleanup());
  engine.setFixtures(fixtures);
  globalThis.__selectionLabels = engine.labelToVariable;
  t.after(() => delete globalThis.__selectionLabels);
  const ogreHook = fixtures.find(({ table, row }) => table === 'item' && row.id === 16297).row;
  assert.equal(ogreHook.content_source_id, 318);
  assert.deepEqual(ogreHook.traits, [1706, 1537]);

  for (const patch of patches) {
    const original = fixtures.find(({ table, row }) => table === 'item' && row.id === patch.id).row;
    assert.equal(original.name, patch.name);
    assert.equal(original.content_source_id, 400);
    assert.equal(original.meta_data.source.url, patch.url);
    assert.ok(
      JSON.stringify(original.traits) === JSON.stringify(patch.before) ||
        JSON.stringify(original.traits) === JSON.stringify(patch.after),
      `${patch.name} must be the reviewed before or after state`
    );
    const corrected = { ...structuredClone(original), traits: [...patch.after] };
    assert.deepEqual({ ...corrected, traits: original.traits }, original);
    const saved = { ...structuredClone(original), traits: [...patch.before] };
    delete saved.meta_data.base_item_content;
    const savedEntry = {
      id: `saved-${original.id}`,
      item: saved,
      is_formula: false,
      is_equipped: true,
      is_invested: false,
      container_contents: [],
    };
    const beforeSaved = structuredClone(savedEntry);

    for (const enableMonsterCore of [false, true]) {
      const host = new RenderHost();
      host.data = [corrected, ...(enableMonsterCore ? [ogreHook] : [])];
      let selected;
      const props = {
        context: { closeModal() {} },
        id: 'items',
        innerProps: { onAddItem: (item) => (selected = item) },
      };
      const tree = host.render(AddItemsModal, props);
      if (enableMonsterCore) {
        findChild(tree, AdvancedSearchModal).props.onSelect(corrected);
      } else {
        findChild(tree, 'ItemsList').props.onClick(corrected, 'GIVE');
      }
      assert.ok(selected);
      assert.equal(
        selected.meta_data.base_item_content?.id,
        patch.id === 17481 && enableMonsterCore ? ogreHook.id : undefined
      );
      assert.deepEqual(engine.compileTraits(selected), patch.after);
      assert.equal(new Set(engine.compileTraits(selected)).size, patch.after.length);
      let entity = { id: 1, inventory: { items: [savedEntry], coins: { gp: 0 } } };
      await engine.handleAddItem((update) => (entity = update(entity)), selected, false);
      assert.deepEqual(
        entity.inventory.items.find(({ id }) => id === savedEntry.id),
        beforeSaved
      );
      const added = entity.inventory.items.find(({ id }) => id !== savedEntry.id).item;
      assert.deepEqual(engine.compileTraits(added), patch.after);
      assert.deepEqual(savedEntry, beforeSaved, 'the old saved item is never repaired implicitly');
    }
  }
  assert.deepEqual(fixtures, originals, 'catalog selection never rewrites the original rows');
  assert.match(migration, /to_jsonb\(entry\.traits\) is distinct from patch->'before'/);
  assert.match(migration, /type = 'item' and ref_id = entry\.id and status->>'state' = 'PENDING'/);
});
