/** Exercise the actual inline drawer assemblies without authenticated app state. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const React = require('react');
const mantine = require('@mantine/core');
const { renderToStaticMarkup } = require('react-dom/server');
const { transformSync } = require('esbuild');

/** Extract the exact existing assembly, keeping rendering logic in its production file. */
async function assembly(path, start, end, signature, result, context = {}) {
  const source = await readFile(new URL('../src/' + path, import.meta.url), 'utf8');
  const begin = source.indexOf(start),
    finish = source.indexOf(end, begin);
  assert(begin > 0 && finish > begin);
  assert.equal(source.split(start).length, 2);
  const code = `function parts(${signature}) { ${source.slice(begin, finish)} return ${result}; } module.exports = parts;`;
  const module = { exports: undefined };
  vm.runInNewContext(
    transformSync(code, { loader: 'tsx', format: 'cjs', target: 'node20', jsx: 'transform' }).code,
    { React, Fragment: React.Fragment, Text: mantine.Text, module, ...context },
    { timeout: 1000 }
  );
  return module.exports;
}

const itemParts = await assembly(
  'drawers/types/ItemDrawer.tsx',
  '  const UBH = [];',
  '  let craftReq = null;',
  'item',
  'UBH',
  {
    isItemMetaAttack: (item) => item.metaAttack === true,
    labelizeBulk: (value) => String(value),
  }
);
const prereqParts = await assembly(
  'drawers/types/FeatDrawer.tsx',
  '  const prereqUI: ReactNode[] = [];',
  '  const hasTopSection =',
  'feat, prereqMet, theme',
  'prereqUI'
);
const theme = {
  primaryColor: 'blue',
  colors: { blue: ['0', '1', 'light', '3', 'full'], red: ['0', '1', '2', '3', 'not'], yellow: ['0', '1', 'unknown'] },
};

/** Use actual Mantine text and retain every original separator; keys do not render HTML. */
function render(nodes) {
  const errors = [],
    original = console.error;
  console.error = (...args) => errors.push(args.map(String).join(' '));
  try {
    const html = renderToStaticMarkup(
      React.createElement(
        mantine.MantineProvider,
        { env: 'test' },
        React.createElement(
          mantine.Text,
          null,
          nodes.flatMap((node, index) => (index < nodes.length - 1 ? [node, '; '] : [node]))
        )
      )
    );
    assert.deepEqual(errors, []);
    return html;
  } finally {
    console.error = original;
  }
}

test('item Usage Bulk and Hands fragments have stable semantic keys and retain original labels and values', () => {
  for (const [item, keys, labels] of [
    [{ usage: 'held-in-one-hand', bulk: '1', hands: 1 }, ['usage', 'bulk'], ['Usage', 'held in one hand', 'Bulk', '1']],
    [{ usage: '', bulk: '0', hands: 2 }, ['bulk', 'hands'], ['Bulk', '0', 'Hands', '2']],
    [{ usage: 'worn', bulk: null }, ['usage'], ['Usage', 'worn']],
    [{ metaAttack: true, bulk: '0' }, [], []],
  ]) {
    const before = JSON.stringify(item),
      nodes = itemParts(item);
    assert.deepEqual(
      [...nodes].map((node) => node.key),
      keys
    );
    assert(nodes.every((node) => node.type === React.Fragment));
    const html = render(nodes);
    for (const label of labels) assert(html.includes(label));
    assert.equal((html.match(/; /g) ?? []).length, Math.max(0, labels.length / 2 - 1));
    assert.equal(JSON.stringify(item), before);
  }
});

test('undetected and unmet prerequisites remain exact text including duplicate or markdown-looking strings', () => {
  const feat = { prerequisites: ['Existing feat', 'Existing feat', '[Existing](link_feat_123)'] };
  const before = JSON.stringify(feat);
  for (const met of [false, { meetMap: new Map() }]) {
    const nodes = prereqParts(feat, met, theme);
    assert.deepEqual([...nodes], feat.prerequisites);
    const html = render(nodes);
    assert.equal((html.match(/Existing feat/g) ?? []).length, 2);
    assert.equal((html.match(/; /g) ?? []).length, 2);
    assert.match(html, /\[Existing\]\(link_feat_123\)/);
    assert.doesNotMatch(html, /<a\b/);
  }
  const unmet = prereqParts(feat, { meetMap: new Map([['Existing feat', false]]) }, theme);
  assert.deepEqual([...unmet], ['Existing feat']);
  render(unmet);
  assert.equal(JSON.stringify(feat), before);
});

test('all detected prerequisite states retain text and underline colors with unique prerequisite keys', () => {
  const states = ['FULLY', 'PARTIALLY', 'NOT', 'UNKNOWN'];
  const names = states.map((state) => state + ' prerequisite');
  const met = { meetMap: new Map(states.map((state, index) => [names[index], state])) };
  const nodes = prereqParts({ prerequisites: names }, met, theme);
  assert.deepEqual(
    [...nodes].map((node) => node.key),
    names
  );
  assert.equal(new Set(nodes.map((node) => node.key)).size, 4);
  for (const [index, node] of nodes.entries()) {
    assert.equal(node.type, React.Fragment);
    assert.equal(node.props.children.type, mantine.Text);
    assert.equal(node.props.children.props.children, names[index]);
    assert.equal(node.props.children.props.span, true);
    assert.equal(node.props.children.props.style.textDecoration, 'underline');
    assert.equal(node.props.children.props.style.textDecorationColor, ['full', 'light', 'not', 'unknown'][index]);
  }
  const html = render(nodes);
  for (const name of names) assert(html.includes(name));
  assert.equal((html.match(/; /g) ?? []).length, 3);
});
