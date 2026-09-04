/** Render actual item drawer trees with presentation, atoms and network boundaries replaced. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-drawer-tests-'));
after(() => fs.rmSync(directory, { recursive: true, force: true }));
const require = createRequire(`${root}/package.json`);
const { build } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sources = [
  'src/drawers/types/ItemDrawer.tsx',
  'src/drawers/types/InvItemDrawer.tsx',
  'src/drawers/ShowInjectedText.tsx',
  'src/common/ItemIcon.tsx',
];
const imports = new Map();
for (const file of sources) {
  const source = fs.readFileSync(`${root}/${file}`, 'utf8');
  for (const m of source.matchAll(/import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?/g)) {
    const spec = m[2];
    if (spec === 'react' || spec === '@drawers/ShowInjectedText') continue;
    const names = imports.get(spec) || new Set();
    const inside = m[1].match(/\{([\s\S]*?)\}/)?.[1];
    if (inside)
      for (const name of inside
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean))
        names.add(name.split(/\s+as\s+/)[0]);
    if (!m[1].trim().startsWith('{')) names.add('default');
    imports.set(spec, names);
  }
}
const special = {
  useAtom: '() => [null, () => {}]',
  useAtomValue: '() => null',
  useQuery: '() => ({data:undefined,isFetching:false,refetch:()=>{}})',
  useMantineTheme: '() => ({colors:{gray:Array(10).fill("gray")}})',
  getVariable:
    '(id,name) => name === "INJECT_TEXT" ? {value:[JSON.stringify({type:"item",id:801,text:id+" RESEARCH FIELD TEXT"})]} : null',
  getItemHealth: '() => ({hp:0,hp_max:0,hardness:0,broken_threshold:0})',
  compileTraits: '() => []',
  getIconMap: '() => ({})',
  glassStyle: '() => ({})',
  getAnchorStyles: '() => ({})',
  cloneDeep: 'x=>structuredClone(x)',
  getWeaponGroup: '() => ""',
  getWeaponSpecialization: '() => ({})',
  getArmorSpecialization: '() => ({})',
  toLabel: 'x=>x',
  labelToVariable: 'x=>x',
  titleCase: 'x=>x',
  priceToString: '() => ""',
};
const output = path.join(directory, 'drawers.cjs');
await build({
  absWorkingDir: root,
  stdin: {
    contents: `export {ItemDrawerContent} from './src/drawers/types/ItemDrawer.tsx'; export {InvItemDrawerContent} from './src/drawers/types/InvItemDrawer.tsx'; export {ItemIcon} from './src/common/ItemIcon.tsx';`,
    resolveDir: root,
    loader: 'tsx',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: output,
  jsx: 'automatic',
  packages: 'external',
  plugins: [
    {
      name: 'render-boundaries',
      setup(b) {
        b.onResolve({ filter: /.*/ }, (args) => {
          if (args.path === '@common/ItemIcon') return { path: `${root}/src/common/ItemIcon.tsx` };
          if (args.path === '@drawers/ShowInjectedText') return { path: `${root}/src/drawers/ShowInjectedText.tsx` };
          if (args.path.includes('/node_modules/react/')) return { path: args.path, external: true };
          if (args.path === 'react' || args.path.startsWith('react/'))
            return { path: require.resolve(args.path), external: true };
          if (imports.has(args.path)) return { path: args.path, namespace: 'mock' };
        });
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => {
          const names = imports.get(args.path);
          let text = `import {createElement} from ${JSON.stringify(require.resolve('react'))}; const component = p => createElement('div',null,p.children); ['Item','Control','Panel','Target','Dropdown','Divider'].forEach(n=>component[n]=component);\n`;
          for (const name of names) {
            let impl =
              special[name] ||
              (name === 'default' || /^[A-Z]/.test(name)
                ? 'component'
                : name.startsWith('isItem')
                  ? '() => false'
                  : '() => undefined');
            text += name === 'default' ? `export default ${impl};\n` : `export const ${name} = ${impl};\n`;
          }
          return { contents: text, loader: 'js' };
        });
      },
    },
  ],
});
const { ItemDrawerContent, InvItemDrawerContent, ItemIcon } = require(output);
const item = {
  id: 801,
  name: 'Versatile Vial',
  description: 'BASE ITEM TEXT',
  group: 'GENERAL',
  traits: [],
  meta_data: {},
};
const invItem = { id: 'inventory-copy-1', item, is_equipped: true, is_invested: false, container_contents: [] };
const tests = [
  ['catalog CHARACTER', ItemDrawerContent, { data: { item, storeID: 'CHARACTER' } }, 'CHARACTER'],
  ['inventory CHARACTER', InvItemDrawerContent, { data: { invItem, storeId: 'CHARACTER' } }, 'CHARACTER'],
  ['catalog COMPANION_0', ItemDrawerContent, { data: { item, storeID: 'COMPANION_0' } }, 'COMPANION_0'],
  ['inventory COMPANION_0', InvItemDrawerContent, { data: { invItem, storeId: 'COMPANION_0' } }, 'COMPANION_0'],
];
for (const [name, Component, props, store] of tests) {
  test(`${name} renders injected text from its own store`, () => {
    const html = renderToStaticMarkup(React.createElement(Component, props));
    assert.ok(html.includes('BASE ITEM TEXT'));
    assert.ok(html.includes(store + ' RESEARCH FIELD TEXT'));
    const otherStore = store === 'CHARACTER' ? 'COMPANION_0' : 'CHARACTER';
    assert.ok(!html.includes(otherStore + ' RESEARCH FIELD TEXT'));
  });
}

// Item metadata and its bulk section are independently optional in the content schema.
test('item icons render when optional bulk metadata is absent', () => {
  for (const meta_data of [undefined, null, {}]) {
    assert.doesNotThrow(() =>
      renderToStaticMarkup(
        React.createElement(ItemIcon, {
          item: { ...item, meta_data },
          size: '1rem',
          color: 'gray',
        })
      )
    );
  }
});
