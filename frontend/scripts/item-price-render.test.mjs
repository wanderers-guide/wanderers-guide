/** Render all three price consumers with real React, Mantine, query cache, atoms and currency formatting. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { inventoryItem, summoner } from './fixtures/eidolon.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-price-render-'));
after(() => fs.rmSync(directory, { recursive: true, force: true }));
const require = createRequire(`${root}/package.json`);
const { build } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MantineProvider } = require('@mantine/core');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const { Provider, createStore } = require('jotai');
const imports = new Map();
for (const file of [
  'src/drawers/types/ItemDrawer.tsx',
  'src/drawers/types/InvItemDrawer.tsx',
  'src/pages/character_sheet/panels/InventoryPanel.tsx',
]) {
  for (const match of fs
    .readFileSync(`${root}/${file}`, 'utf8')
    .matchAll(/import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?/g)) {
    const names = imports.get(match[2]) ?? new Set();
    for (const name of (match[1].match(/\{([\s\S]*?)\}/)?.[1] ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)) {
      names.add(name);
    }
    if (!match[1].trim().startsWith('{')) names.add('default');
    imports.set(match[2], names);
  }
}
// Unrelated item controls and icons are presentation boundaries. Price, context and query handling stay real.
const special = {
  getContentFast: '() => []',
  getCachedContent: '() => []',
  fetchContentSources: 'async () => { throw new Error("Unexpected source request in seeded render"); }',
  fetchContentById: 'async () => { throw new Error("Unexpected item request in snapshot render"); }',
  fetchItemByName: 'async () => null',
  isPhoneSized: 'width => width < 576',
  isItemVisible: '() => true',
  getFlatInvItems: 'inventory => inventory.items',
  getItemQuantity: '() => 1',
  getInvBulk: '() => 0',
  getBulkLimit: '() => 5',
  getItemBulk: '() => 0',
  labelizeBulk: 'value => String(value)',
  getItemHealth: '() => ({hp:0,hp_max:0,hardness:0,broken_threshold:0})',
  compileTraits: '() => []',
  getIconMap: '() => ({})',
  cloneDeep: 'value => structuredClone(value)',
  truncate: 'value => value',
  toLabel: 'value => value',
  titleCase: 'value => value',
  glassStyle: '() => ({})',
  getAnchorStyles: '() => ({})',
  // Old CHARACTER globals deliberately disagree with the route-bound owner in the tests below.
  getVariable: '() => ({value:true})',
};
const actual = new Map([
  ['@items/currency-handler', 'src/process/items/currency-handler.ts'],
  ['@items/armor-grade-view', 'src/process/items/armor-grade-view.ts'],
  ['@items/use-item-price', 'src/process/items/use-item-price.ts'],
  ['@content/system-handler', 'src/process/content/system-handler.ts'],
  ['@atoms/characterAtoms', 'src/atoms/characterAtoms.ts'],
  ['@atoms/navAtoms', 'src/atoms/navAtoms.ts'],
  ['@constants/data', 'src/constants/data.ts'],
  ['@common/IndentedText', 'src/common/IndentedText.tsx'],
]);
const output = path.join(directory, 'price-consumers.cjs');
await build({
  absWorkingDir: root,
  stdin: {
    contents: `export {ItemDrawerContent} from './src/drawers/types/ItemDrawer.tsx'; export {InvItemDrawerContent} from './src/drawers/types/InvItemDrawer.tsx'; export {default as InventoryPanel} from './src/pages/character_sheet/panels/InventoryPanel.tsx'; export {characterState} from './src/atoms/characterAtoms.ts';`,
    resolveDir: root,
    loader: 'tsx',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: output,
  jsx: 'automatic',
  packages: 'external',
  define: { 'import.meta.env': '{"VITE_ENV":"test"}' },
  plugins: [
    {
      name: 'unrelated-price-presentation-boundaries',
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, (args) => {
          if (args.path.includes('/node_modules/')) return { path: args.path, external: true };
          if (actual.has(args.path)) return { path: path.join(root, actual.get(args.path)) };
          if (
            ['react', 'jotai', '@mantine/core', '@mantine/hooks', '@tanstack/react-query'].includes(args.path) ||
            args.path.startsWith('react/')
          ) {
            return { path: require.resolve(args.path), external: true };
          }
          if (
            imports.has(args.path) ||
            args.path === '@variables/variable-manager' ||
            args.path === '@content/content-store'
          ) {
            return { path: args.path, namespace: 'presentation' };
          }
        });
        builder.onLoad({ filter: /.*/, namespace: 'presentation' }, (args) => {
          const names = new Set(imports.get(args.path) ?? []);
          if (args.path === '@variables/variable-manager') names.add('getVariable');
          if (args.path === '@content/content-store') {
            names.add('fetchContentSources');
            names.add('getCachedContent');
          }
          let contents = `import {createElement} from ${JSON.stringify(require.resolve('react'))}; const component = props => createElement('span',null,props.children);\n`;
          for (const name of names) {
            const value =
              (args.path.startsWith('@assets/') ? '"test-image.png"' : special[name]) ??
              (name === 'default' || /^[A-Z]/.test(name) ? 'component' : '() => false');
            contents += name === 'default' ? `export default ${value};\n` : `export const ${name} = ${value};\n`;
          }
          return { contents, loader: 'js' };
        });
      },
    },
  ],
});
const { ItemDrawerContent, InvItemDrawerContent, InventoryPanel, characterState } = require(output);
const item = {
  id: 20396,
  name: 'Forklift',
  group: 'GENERAL',
  description: 'Vehicle price fixture.',
  traits: [],
  meta_data: {},
  content_source_id: 793,
  price: { sp: 100 },
};
const render = (
  kind,
  {
    group = 'starfinder-core',
    owner = null,
    storeID = 'CHARACTER',
    sourceId = 793,
    sourceResolved = true,
    price = { sp: 100 },
    itemOverrides = {},
    assertQueryEnabled,
    route = owner ? `/sheet/${owner.id}` : '/',
  } = {}
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  if (sourceResolved)
    queryClient.setQueryData([`find-content-source-${sourceId}`, { id: sourceId }], { id: sourceId, group });
  const atomStore = createStore();
  atomStore.set(characterState, owner);
  globalThis.window = { location: { href: `http://localhost${route}` } };
  const pricedItem = { ...item, ...itemOverrides, content_source_id: sourceId, price };
  const snapshot = structuredClone(pricedItem);
  const invItem = inventoryItem(pricedItem);
  const component =
    kind === 'catalog'
      ? React.createElement(ItemDrawerContent, { data: { item: pricedItem, storeID } })
      : kind === 'owned'
        ? React.createElement(InvItemDrawerContent, { data: { invItem, storeId: storeID } })
        : React.createElement(InventoryPanel, {
            id: storeID,
            entity: summoner([invItem]),
            setEntity: () => {},
            content: {},
            panelWidth: 1200,
            panelHeight: 900,
          });
  const html = renderToStaticMarkup(
    React.createElement(
      Provider,
      { store: atomStore },
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(MantineProvider, { forceColorScheme: 'dark' }, component)
      )
    )
  );
  if (assertQueryEnabled !== undefined) {
    const sourceQuery = queryClient.getQueryCache().find({
      queryKey: [`find-content-source-${sourceId}`, { id: sourceId }],
    });
    assert.equal(sourceQuery.options.enabled, assertQueryEnabled, 'source lookup uses the effective price');
  }
  queryClient.clear();
  assert.deepEqual(pricedItem, snapshot, 'price rendering never changes the saved item');
  return html;
};
const originalWindow = globalThis.window;
const originalStorage = globalThis.localStorage;
globalThis.localStorage = { removeItem: () => {} };
after(() => {
  globalThis.window = originalWindow;
  globalThis.localStorage = originalStorage;
});

test('a Starfinder source displays credits in the standalone catalog without a character', () => {
  assert.match(render('catalog'), /100 credits/);
});

test('an owned item uses its route-bound Starfinder owner, including companion inventory', () => {
  const owner = { id: 32, content_sources: { enabled: [579] } };
  assert.match(render('owned', { owner, group: null, sourceId: 3, storeID: 'COMPANION_0' }), /100 credits/);
});

test('the inventory price column uses the same Starfinder owner context', () => {
  assert.match(
    render('inventory', { owner: { id: 32, content_sources: { enabled: [579] } }, group: 'common-core', sourceId: 3 }),
    /100 credits/
  );
});

for (const kind of ['catalog', 'owned', 'inventory']) {
  test(`${kind} labels a Starfinder printing independently of the owner and store ID`, () => {
    assert.match(
      render(kind, { owner: { id: 32, content_sources: { enabled: [1, 3] } }, storeID: 'CREATURE_2' }),
      /100 credits/
    );
  });

  test(`${kind} keeps Pathfinder, common-core, nullable and unknown groups in coin denominations`, () => {
    for (const group of ['pathfinder-core', 'common-core', null, 'starfinder-unclassified']) {
      const html = render(kind, { group, sourceId: 3, owner: { id: 32, content_sources: { enabled: [1, 3] } } });
      assert.match(html, /100 sp/);
      assert.doesNotMatch(html, /100 credits/);
    }
  });

  test(`${kind} preserves the existing coin label while its source is unresolved`, () => {
    assert.match(render(kind, { sourceResolved: false }), /100 sp/);
  });

  test(`${kind} preserves all mixed and fractional price components`, () => {
    assert.match(render(kind, { price: { cp: 0.5, sp: 2.5, gp: 3, pp: 4 } }), /0\.5 cp, 2\.5 credits, 3 gp, 4 pp/);
  });

  test(`${kind} does not treat an unrelated route's retained character as the owner`, () => {
    const html = render(kind, {
      group: 'common-core',
      sourceId: 3,
      owner: { id: 32, content_sources: { enabled: [579] } },
      route: '/',
    });
    assert.match(html, /100 sp/);
    assert.doesNotMatch(html, /100 credits/);
  });
}

test('catalog prices follow their printing even while a Starfinder character is active', () => {
  assert.match(
    render('catalog', { group: 'common-core', sourceId: 3, owner: { id: 32, content_sources: { enabled: [579] } } }),
    /100 sp/
  );
});

test('all price consumers compose final armor grades with credits and preserve ordinary Pathfinder gold', () => {
  const gradedArmor = {
    group: 'ARMOR',
    level: 1,
    meta_data: {
      ac_bonus: 2,
      dex_cap: 3,
      starfinder: { base_grade: 'COMMERCIAL', grade: 'TACTICAL', base_upgrade_slots: 0 },
    },
  };
  for (const kind of ['catalog', 'owned', 'inventory']) {
    assert.match(
      render(kind, {
        price: { sp: 50 },
        itemOverrides: gradedArmor,
        assertQueryEnabled: true,
      }),
      /1,650 credits/
    );
    for (const price of [{ sp: 0 }, {}]) {
      assert.match(render(kind, { price, itemOverrides: gradedArmor, assertQueryEnabled: true }), /1,600 credits/);
      assert.match(
        render(kind, {
          price,
          itemOverrides: gradedArmor,
          group: 'common-core',
          sourceId: 3,
          owner: { id: 32, content_sources: { enabled: [579] } },
          assertQueryEnabled: kind === 'catalog',
        }),
        kind === 'catalog' ? /1,600 sp/ : /1,600 credits/
      );
    }
    const gold = render(kind, { group: 'pathfinder-core', price: { gp: 25 } });
    assert.match(gold, /25 gp/);
    assert.doesNotMatch(gold, /credits/);
  }
});
