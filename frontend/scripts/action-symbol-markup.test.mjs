/** Exercise every existing action-cost glyph with the actual Mantine renderer. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const React = require('react');
const mantine = require('@mantine/core');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const { transformSync } = require('esbuild');
const source = await readFile(new URL('../src/common/Actions.tsx', import.meta.url), 'utf8');
const file = ts.createSourceFile('Actions.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = ['ActionStructure', 'ActionSymbol'].map((name) => {
  const matches = file.statements.filter((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.equal(matches.length, 1);
  return matches[0].getText(file).replace(/^export /, '');
});
const module = { exports: {} };
vm.runInNewContext(
  transformSync(`${declarations.join('\n')}\nmodule.exports={ActionSymbol};`, {
    loader: 'tsx',
    format: 'cjs',
    target: 'node20',
    jsx: 'transform',
  }).code,
  { React, ...mantine, module },
  { timeout: 1000 }
);
const cases = [
  ['ONE-ACTION', [1]],
  ['TWO-ACTIONS', [2]],
  ['THREE-ACTIONS', [3]],
  ['FREE-ACTION', [4]],
  ['REACTION', [5]],
  ['REACTION-OR-ONE-ACTION', [5, 1]],
  ['ONE-TO-TWO-ACTIONS', [1, 2]],
  ['ONE-TO-THREE-ACTIONS', [1, 3]],
  ['TWO-TO-THREE-ACTIONS', [2, 3]],
  ['TWO-TO-TWO-ROUNDS', [2]],
  ['THREE-TO-TWO-ROUNDS', [3]],
  ['TWO-TO-THREE-ROUNDS', [2]],
  ['THREE-TO-THREE-ROUNDS', [3]],
];
const render = (props) =>
  renderToStaticMarkup(
    React.createElement(
      mantine.MantineProvider,
      { env: 'test' },
      React.createElement(module.exports.ActionSymbol, props)
    )
  );

test('all existing action costs retain their exact glyphs without nested paragraphs', () => {
  for (const [cost, glyphs] of cases) {
    const html = render({ cost });
    assert.doesNotMatch(html, /<p\b[^>]*>\s*<p\b/, cost);
    const actual = [...html.matchAll(/<(?:span|p)\b[^>]*font-family:ActionIcons[^>]*>(\d)<\/(?:span|p)>/g)].map(
      (match) => Number(match[1])
    );
    assert.deepEqual(actual, glyphs, cost);
    assert.match(html, /position:absolute;top:-1px;left:0;transform:translate\(-50%, -50%\)/, cost);
  }
});

test('the action glyph retains caller size, color and spacing and unknown costs stay empty', () => {
  const html = render({ cost: 'REACTION', size: 31, mx: 9, c: 'red.6' });
  assert.match(html, /font-size:calc\(1\.9375rem \* var\(--mantine-scale\)\)/);
  assert.match(html, /color:var\(--mantine-color-red-6\)/);
  assert.match(html, /margin-inline:calc\(0\.5625rem \* var\(--mantine-scale\)\)/);
  assert.doesNotMatch(render({ cost: 'UNKNOWN' }), /ActionIcons/);
});
