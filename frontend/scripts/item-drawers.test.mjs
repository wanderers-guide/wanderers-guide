/** Render actual item drawer trees with presentation, atoms and network boundaries replaced. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
  'src/common/ItemRunesDescription.tsx',
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
  useQuery:
    'options => { if (globalThis.__wgRuneLookups) { globalThis.__wgRuneQuery = options; return {data:globalThis.__wgRuneItems,isFetching:false}; } return {data:globalThis.__wgDrawerQueryItem,isFetching:false,refetch:()=>{}}; }',
  fetchContentById:
    'async (_type,id) => { const result = globalThis.__wgRuneLookups.get(id); if (result instanceof Error) throw result; return result ?? null; }',
  FUNDAMENTAL_RUNES: '{potency_weapon_2:7951,striking_1:7862}',
  isItemWithRunes: 'item => !!item.meta_data?.runes',
  isItemWeapon: 'item => item.group === "WEAPON"',
  isItemArmor: '() => false',
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
    contents: `export {ItemDrawerContent} from './src/drawers/types/ItemDrawer.tsx'; export {InvItemDrawerContent} from './src/drawers/types/InvItemDrawer.tsx'; export {ItemIcon} from './src/common/ItemIcon.tsx'; export {ItemRunesDescription} from './src/common/ItemRunesDescription.tsx';`,
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
const { ItemDrawerContent, InvItemDrawerContent, ItemIcon, ItemRunesDescription } = require(output);
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

test('embedded rune links prefer current catalog content and fall back to their snapshot', () => {
  const embedded = { ...item, description: 'EMBEDDED RUNE TEXT' };
  try {
    globalThis.__wgDrawerQueryItem = { ...item, description: 'CURRENT RUNE TEXT' };
    const currentHtml = renderToStaticMarkup(
      React.createElement(ItemDrawerContent, { data: { id: item.id, item: embedded } })
    );
    assert.ok(currentHtml.includes('CURRENT RUNE TEXT'));
    assert.ok(!currentHtml.includes('EMBEDDED RUNE TEXT'));

    globalThis.__wgDrawerQueryItem = null;
    const fallbackHtml = renderToStaticMarkup(
      React.createElement(ItemDrawerContent, { data: { id: item.id, item: embedded } })
    );
    assert.ok(fallbackHtml.includes('EMBEDDED RUNE TEXT'));
    assert.ok(!fallbackHtml.includes('CURRENT RUNE TEXT'));
  } finally {
    delete globalThis.__wgDrawerQueryItem;
  }
});

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

test('unavailable fundamental runes do not crash the item and leave other rune details visible', async () => {
  const propertyRune = { id: 90001, name: 'Shock', rune: { description: 'PROPERTY RUNE DETAILS' } };
  const weapon = {
    ...item,
    group: 'WEAPON',
    meta_data: { runes: { potency: 2, striking: 1, property: [propertyRune] } },
  };
  const striking = { ...item, id: 7862, name: 'Striking', description: 'STRIKING RUNE DETAILS' };
  try {
    for (const missing of [null, new Error('Synthetic unavailable rune')]) {
      globalThis.__wgRuneLookups = new Map([
        [7951, missing],
        [7862, striking],
      ]);
      delete globalThis.__wgRuneItems;
      renderToStaticMarkup(React.createElement(ItemRunesDescription, { item: weapon }));
      globalThis.__wgRuneItems = await globalThis.__wgRuneQuery.queryFn();
      assert.deepEqual(globalThis.__wgRuneItems, [striking]);
      const html = renderToStaticMarkup(React.createElement(ItemRunesDescription, { item: weapon }));
      assert.ok(html.includes('PROPERTY RUNE DETAILS'));
      assert.ok(html.includes('STRIKING RUNE DETAILS'));
    }
    globalThis.__wgRuneLookups = new Map();
    globalThis.__wgRuneItems = await globalThis.__wgRuneQuery.queryFn();
    assert.deepEqual(globalThis.__wgRuneItems, []);
    const html = renderToStaticMarkup(React.createElement(ItemRunesDescription, { item: weapon }));
    assert.ok(html.includes('PROPERTY RUNE DETAILS'));
    assert.ok(!html.includes('Fundamental Runes'));
  } finally {
    delete globalThis.__wgRuneLookups;
    delete globalThis.__wgRuneQuery;
    delete globalThis.__wgRuneItems;
  }
});

test('upgrade descriptions display alphabetically without changing saved slots or snapshots', async (t) => {
  let networkAttempts = 0;
  t.mock.method(globalThis, 'fetch', () => {
    networkAttempts += 1;
    throw new Error('Item upgrade rendering must not make network requests');
  });
  const actualOutput = path.join(directory, 'actual-upgrade-description.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        import React from 'react';
        import { renderToStaticMarkup } from 'react-dom/server';
        import { MantineProvider, DEFAULT_THEME } from '@mantine/core';
        import { Provider } from 'jotai';
        import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
        import { ItemUpgradesDescription } from './src/common/ItemRunesDescription.tsx';
        export { ItemSchema } from './src/schemas/content';
        export function renderUpgrades(item) {
          const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
          try {
            return renderToStaticMarkup(React.createElement(MantineProvider,
              { theme: { colors: { guide: DEFAULT_THEME.colors.blue } } },
              React.createElement(Provider, null,
                React.createElement(QueryClientProvider, { client },
                  React.createElement(ItemUpgradesDescription, { item })))));
          } finally { client.clear(); }
        }
      `,
      resolveDir: root,
      loader: 'tsx',
    },
    tsconfig: path.join(root, 'tsconfig.json'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: actualOutput,
    jsx: 'automatic',
    banner: {
      js: `import { createRequire } from 'node:module'; const require = createRequire(${JSON.stringify(`${root}/package.json`)});`,
    },
    define: {
      'import.meta.env': JSON.stringify({
        MODE: 'test',
        PROD: false,
        VITE_SUPABASE_URL: 'https://item-render.invalid',
        VITE_SUPABASE_KEY: 'synthetic-not-a-credential',
      }),
      __WG_RELEASE__: JSON.stringify('item-render-test'),
    },
  });
  const { renderUpgrades, ItemSchema } = await import(pathToFileURL(actualOutput).href);
  const savedUpgrade = (id, name, grade, level, price, description) => ({
    id,
    created_at: '2026-10-08T00:00:00Z',
    name,
    price: { gp: price },
    bulk: 'L',
    level,
    rarity: 'COMMON',
    traits: [],
    description,
    group: 'GENERAL',
    hands: null,
    size: 'MEDIUM',
    craft_requirements: null,
    usage: 'installed',
    meta_data: {
      bulk: { held_or_stowed: 'L' },
      charges: { current: id % 3, max: 5 },
      starfinder: { capacity: '5', usage: 1, grade },
    },
    operations: [],
    content_source_id: 900,
    version: '1.0',
  });
  const savedItem = savedUpgrade(91000, 'Saved Host', 'SUPERIOR', 11, 14000, 'SAVED HOST DESCRIPTION');
  savedItem.meta_data.starfinder.slots = [
    {
      id: 91003,
      name: 'Zulu Upgrade',
      upgrade: savedUpgrade(91003, 'Zulu Upgrade', 'SUPERIOR', 11, 14000, 'SAVED ZULU DESCRIPTION'),
    },
    {
      id: 91001,
      name: 'Alpha Upgrade',
      upgrade: savedUpgrade(91001, 'Alpha Upgrade', 'ELITE', 14, 44000, 'SAVED ALPHA DESCRIPTION'),
    },
    {
      id: 91002,
      name: 'Middle Upgrade',
      upgrade: savedUpgrade(91002, 'Middle Upgrade', 'TACTICAL', 5, 500, 'SAVED MIDDLE DESCRIPTION'),
    },
  ];
  assert.equal(ItemSchema.safeParse(savedItem).success, true, 'the saved item fixture must satisfy the actual schema');
  const before = structuredClone(savedItem);
  const slots = savedItem.meta_data.starfinder.slots;
  const originalSlots = [...slots];
  const originalSnapshots = slots.map((slot) => slot.upgrade);
  const html = renderUpgrades(savedItem);
  assert.equal(networkAttempts, 0);
  const headings = [...html.matchAll(/<span\b[^>]*>(Alpha Upgrade|Middle Upgrade|Zulu Upgrade)<\/span>/g)].map(
    (match) => match[1]
  );
  assert.deepEqual(headings, ['Alpha Upgrade', 'Middle Upgrade', 'Zulu Upgrade']);
  for (const description of ['SAVED ALPHA DESCRIPTION', 'SAVED MIDDLE DESCRIPTION', 'SAVED ZULU DESCRIPTION']) {
    assert.ok(html.includes(description), `${description} must come from its saved snapshot`);
  }
  assert.deepEqual(savedItem, before, 'rendering must preserve the complete saved item and its upgrade order');
  assert.equal(savedItem.meta_data.starfinder.slots, slots, 'the saved slots array must keep its identity');
  for (let index = 0; index < originalSlots.length; index += 1) {
    assert.equal(slots[index], originalSlots[index], `saved slot ${index} must keep its identity and position`);
    assert.equal(slots[index].upgrade, originalSnapshots[index], `saved snapshot ${index} must keep its identity`);
  }
});
