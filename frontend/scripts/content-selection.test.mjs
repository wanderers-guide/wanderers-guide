/** Run the real picker render logic with delayed query data and the real search index. */
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
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
}
globalThis.__selectionHooks = {
  useRef: (value) => host.ref(value),
  useMemo: (callback, deps) => host.memo(callback, deps),
  useEffect: (callback) => {
    host.effects.push(callback);
  },
  useState: (value) => [host.searchQuery ?? (typeof value === 'function' ? value() : value), () => {}],
  useQuery: () => ({ data: host.data, isFetching: host.data === undefined }),
};
const special = {
  useAtom: '() => [null, () => {}]',
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
};
const imports = new Map();
const paths = ['src/common/select/SelectContent.tsx', 'src/modals/ManageSpellsModal.tsx'];
for (const path of paths) {
  const source = await readFile(join(root, path), 'utf8');
  for (const match of source.matchAll(/import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?/g)) {
    if (['react', 'js-search', 'lodash-es', '@tanstack/react-query'].includes(match[2])) continue;
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
    contents: `export {SelectionOptions} from './src/common/select/SelectContent'; export {default as ManageSpellsModal} from './src/modals/ManageSpellsModal';`,
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
const { SelectionOptions, ManageSpellsModal } = await import(pathToFileURL(output).href);
const charm = { id: 1, name: 'Charm', rank: 1 };
const command = { id: 2, name: 'Command', rank: 1 };
const picker = { type: 'spell', searchQuery: 'Charm', limitSelectedOptions: false };
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

function findChild(node, componentName) {
  if (!node || typeof node !== 'object') return undefined;
  if (node.type?.name === componentName) return node;
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
