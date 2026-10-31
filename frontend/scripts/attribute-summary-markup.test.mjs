/** Render the actual builder summary and attribute formatter with finite variable values. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(`${root}/package.json`);
const ts = require('typescript');
const { transformSync } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MantineProvider, Box, Text } = require('@mantine/core');

/** Retain exact function bodies without loading unrelated authenticated builder modules. */
async function sourceFunction(path, name) {
  const text = await readFile(`${root}/src/${path}`, 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const matches = source.statements.filter((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.equal(matches.length, 1);
  return matches[0].getText(source).replace(/^export /, '');
}
const source = [
  await sourceFunction('process/variables/variable-display.tsx', 'displayAttributeValue'),
  await sourceFunction('pages/character_builder/CharBuilderCreation.tsx', 'AttributeModPart'),
].join('\n');
let attribute;
const module = { exports: {} };
vm.runInNewContext(
  transformSync(source + '\nmodule.exports={AttributeModPart};', {
    loader: 'tsx',
    format: 'cjs',
    target: 'node20',
    jsx: 'transform',
  }).code,
  {
    React,
    Box,
    Text,
    module,
    getVariable(store, name) {
      assert.equal(store, 'CHARACTER');
      assert.equal(name, 'ATTRIBUTE_STR');
      return attribute;
    },
  },
  { timeout: 1000 }
);
const render = (value) => {
  attribute = value;
  return renderToStaticMarkup(
    React.createElement(
      MantineProvider,
      { env: 'test' },
      React.createElement(module.exports.AttributeModPart, { attribute: 'Str', variableName: 'ATTRIBUTE_STR' })
    )
  );
};

test('builder attribute summary has no paragraph nested inside another paragraph', () => {
  const html = render({ value: { value: 2, partial: false } });
  assert.doesNotMatch(html, /<p\b[^>]*>\s*<p\b/);
  assert.equal((html.match(/<p\b/g) ?? []).length, 2);
  assert.match(html, /Str<\/p>/);
});

test('existing signed attribute values and partial-boost formatting remain unchanged', () => {
  for (const [value, sign, number] of [
    [0, '+', 0],
    [4, '+', 4],
    [-2, '-', 2],
  ]) {
    const html = render({ value: { value, partial: false } });
    assert.match(html, new RegExp('>' + sign.replace('+', '\\+') + '<\\/span>'));
    assert.match(html, new RegExp('>' + number + '<\\/span>'));
    assert.doesNotMatch(html, /text-decoration:\s*underline/);
  }
  assert.match(render({ value: { value: 1, partial: true } }), /text-decoration:\s*underline/);
});

test('an unloaded attribute retains the existing label without inventing a numeric value', () => {
  const html = render(undefined);
  assert.match(html, /Str<\/p>/);
  assert.equal((html.match(/<p\b/g) ?? []).length, 1);
  assert.doesNotMatch(html, />[+\-0-9]+<\/span>/);
});
