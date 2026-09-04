/** Render the actual inventory and Mantine controls; mock data, icons and modal boundaries only. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { inventoryItem, magicWeapon, summoner } from './fixtures/eidolon.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-inventory-render-'));
after(() => fs.rmSync(directory, { recursive: true, force: true }));
const require = createRequire(`${root}/package.json`);
const { build } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MantineProvider } = require('@mantine/core');
const sourcePath = `${root}/src/pages/character_sheet/panels/InventoryPanel.tsx`;
const source = fs.readFileSync(sourcePath, 'utf8');
const imports = new Map();
for (const match of source.matchAll(/import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?/g)) {
  const names = new Set();
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
const special = {
  useAtom: '() => [null, () => {}]',
  IMPRINT_BG_COLOR: '"transparent"',
  IMPRINT_BORDER_COLOR: '"gray"',
  isPhoneSized: 'width => width < 576',
  isItemContainer: 'item => !!item.meta_data?.bulk?.capacity',
  isItemWeapon: '() => false',
  isItemVisible: '() => true',
  isItemInvestable: 'item => !!item.traits?.includes(1527)',
  isItemEquippable: '() => true',
  canInvestEidolonWeapon: '(id,item) => id === "CHARACTER" && item.group === "WEAPON"',
  getFlatInvItems: 'inventory => inventory.items.flatMap(item => [item,...item.container_contents])',
  isPlayingStarfinder: '() => false',
  getContentFast: '() => []',
  getBulkLimit: '() => 5',
  getInvBulk: '() => 0',
  getItemBulk: '() => 0',
  labelizeBulk: 'value => String(value)',
  priceToString: '() => ""',
  cloneDeep: 'value => structuredClone(value)',
  truncate: 'value => value',
};
const output = path.join(directory, 'inventory.cjs');
await build({
  absWorkingDir: root,
  stdin: { contents: `export {default} from ${JSON.stringify(sourcePath)};`, resolveDir: root, loader: 'tsx' },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: output,
  jsx: 'automatic',
  packages: 'external',
  plugins: [
    {
      name: 'inventory-render-boundaries',
      setup(b) {
        b.onResolve({ filter: /.*/ }, (args) => {
          if (args.path.includes('/node_modules/')) return { path: args.path, external: true };
          if (args.path === '@common/ImprintButton') return { path: `${root}/src/common/ImprintButton.tsx` };
          if (['react', '@mantine/core', '@mantine/hooks'].includes(args.path) || args.path.startsWith('react/'))
            return { path: require.resolve(args.path), external: true };
          if (imports.has(args.path)) return { path: args.path, namespace: 'boundary' };
        });
        b.onLoad({ filter: /.*/, namespace: 'boundary' }, (args) => {
          let contents = `import {createElement} from ${JSON.stringify(require.resolve('react'))}; const component = p => createElement('span',null,p.children);\n`;
          for (const name of imports.get(args.path)) {
            const value =
              (args.path.startsWith('@assets/') ? '"test-image.png"' : special[name]) ||
              (name === 'default' || /^[A-Z]/.test(name) ? 'component' : '() => false');
            contents += name === 'default' ? `export default ${value};\n` : `export const ${name} = ${value};\n`;
          }
          return { contents, loader: 'js' };
        });
      },
    },
  ],
});
const InventoryPanel = require(output).default;
const spear = inventoryItem(magicWeapon);
const staff = inventoryItem({ ...magicWeapon, id: 900, name: 'Invested staff', traits: [1527] }, { is_invested: true });
const bag = inventoryItem(
  { id: 901, name: 'Container', group: 'GENERAL', traits: [1527], meta_data: { bulk: { capacity: 4 } } },
  {
    container_contents: [inventoryItem({ ...magicWeapon, id: 902, name: 'Contained weapon' })],
  }
);
for (const width of [390, 1200]) {
  test(`inventory at ${width}px keeps view, invest, equip and container controls as sibling buttons`, () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MantineProvider,
        { forceColorScheme: 'dark' },
        React.createElement(InventoryPanel, {
          id: 'CHARACTER',
          entity: summoner([spear, staff, bag]),
          setEntity: () => {},
          content: {},
          panelWidth: width,
          panelHeight: 900,
        })
      )
    );
    let buttonDepth = 0;
    for (const match of html.matchAll(/<\/?button\b[^>]*>/g)) {
      if (match[0].startsWith('</')) buttonDepth--;
      else {
        assert.equal(buttonDepth, 0, `Nested button found: ${match[0]}`);
        buttonDepth++;
      }
    }
    assert.equal(buttonDepth, 0);
    assert.match(html, /View \+2 striking spear/);
    assert.match(html, /View Contained weapon/);
    assert.match(html, /View Item/);
    assert.match(html, /Share runes/);
    assert.match(html, /Invest/);
    assert.match(html, /Equip/);
    assert.match(html, /aria-expanded="false"/);
  });
}
