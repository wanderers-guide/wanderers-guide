/** Exercise actual rich text and the shared picker title without authenticated app state. */
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createOperationEngine } from './operation-test-harness.mjs';

const require = createRequire(import.meta.url);
const React = require('react');
const mantine = require('@mantine/core');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const { transformSync } = require('esbuild');
const engine = await createOperationEngine({ renderRichText: true });
after(() => engine.cleanup());

/** Inspect source HTML before a browser parser repairs invalid paragraph or heading nesting. */
function invalidNesting(html) {
  const stack = [];
  const invalid = [];
  const voids = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ]);
  for (const match of html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '')
    .matchAll(/<(\/?)([a-z][a-z0-9-]*)\b[^>]*>/gi)) {
    const tag = match[2].toLowerCase();
    if (match[1]) {
      const index = stack.lastIndexOf(tag);
      if (index >= 0) stack.length = index;
    } else if (!voids.has(tag)) {
      if (stack.includes('p') && ['p', 'div', 'ul', 'ol'].includes(tag)) invalid.push(`p/${tag}`);
      if (/^h[1-6]$/.test(tag) && stack.some((parent) => /^h[1-6]$/.test(parent))) invalid.push(`heading/${tag}`);
      stack.push(tag);
    }
  }
  return invalid;
}

test('loose and nested rich-text lists do not put paragraphs or lists inside paragraphs', () => {
  for (const text of [
    '- First paragraph.\n\n  Second paragraph.\n\n- Last item.',
    '- Outer item\n  - Nested item\n\n- Last item.',
    '1. First paragraph.\n\n   Second paragraph.\n\n2. Last item.',
  ]) {
    const html = engine.renderRichText(text);
    assert.deepEqual(invalidNesting(html), []);
    assert.match(html, /Last item/);
  }
});

test('list formatting retains every link, code literal, emphasis and action symbol', () => {
  const html = engine.renderRichText(
    '- [Craft](link_action_19617), *[Shield](link_spell_4831)* and [Craft](link_action_19617).\n\n  **Effect** Keep `link_item_123` literal. <abbr class="action-symbol">1</abbr>\n\n- Last item.'
  );
  assert.deepEqual(invalidNesting(html), []);
  assert.equal((html.match(/>Craft<\/a>/g) ?? []).length, 2);
  assert.equal((html.match(/>Shield<\/a>/g) ?? []).length, 1);
  assert.match(html, /<em>\s*<a\b/);
  assert.match(html, /<strong>Effect<\/strong>/);
  assert.match(html, /<code\b[^>]*>link_item_123<\/code>/);
  assert.match(html, /<abbr class="action-symbol">1<\/abbr>/);
});

const source = await readFile(new URL('../src/common/select/SelectContent.tsx', import.meta.url), 'utf8');
const file = ts.createSourceFile('SelectContent.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declaration = file.statements.find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'selectContent'
);
assert(declaration);
test('all five shared picker titles retain their original size with a non-heading block wrapper', () => {
  const titles = [];
  const visit = (node) => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(file) === 'Title') {
      titles.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  assert.equal(titles.length, 5);
  assert.deepEqual(
    titles.map((node) =>
      node.attributes.properties.find((prop) => prop.name?.text === 'order')?.initializer?.getText(file)
    ),
    ['{3}', '{3}', '{4}', '{4}', '{4}']
  );
  for (const node of titles) {
    const properties = node.attributes.properties;
    assert.equal(properties.find((prop) => prop.name?.text === 'component')?.initializer?.text, 'span');
    assert.equal(
      properties.find((prop) => prop.name?.text === 'style')?.initializer?.getText(file),
      "{{ display: 'block' }}"
    );
  }
});
let opened;
const module = { exports: {} };
vm.runInNewContext(
  transformSync(`${declaration.getText(file).replace(/^export /, '')}\nmodule.exports={selectContent};`, {
    loader: 'tsx',
    format: 'cjs',
    target: 'node20',
    jsx: 'transform',
  }).code,
  {
    React,
    Title: mantine.Title,
    module,
    toLabel: (value) => value,
    openContextModal: (options) => {
      opened = options;
    },
  },
  { timeout: 1000 }
);

test('the actual shared picker keeps its label, callback, options and one modal heading', () => {
  const selected = [];
  const callback = (value) => selected.push(value);
  const options = { overrideLabel: 'Select an Attribute', overrideOptions: [{ id: 1 }], zIndex: 901 };
  module.exports.selectContent('ability-block', callback, options);
  assert.equal(opened.modal, 'selectContent');
  assert.equal(opened.innerProps.options, options);
  assert.equal(opened.zIndex, 901);
  const choice = { id: 1 };
  opened.innerProps.onClick(choice);
  assert.deepEqual(selected, [choice]);
  const html = renderToStaticMarkup(
    React.createElement(
      mantine.MantineProvider,
      { env: 'test' },
      React.createElement(
        mantine.Modal,
        { opened: true, onClose: () => {}, withinPortal: false, title: opened.title },
        'Existing choices'
      )
    )
  );
  assert.match(html, /Select an Attribute/);
  assert.match(html, /Existing choices/);
  assert.deepEqual(invalidNesting(html), []);
  assert.equal((html.match(/<h[1-6]\b/g) ?? []).length, 1);
  assert.match(html, /data-order="3"/);
});
