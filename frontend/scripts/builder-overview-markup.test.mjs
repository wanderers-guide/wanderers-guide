/** Exercise the actual overview and conditional stat fragments without authenticated app state. */
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
const mantine = require('@mantine/core');

/** Extract exact declarations so the fixture does not duplicate production rendering logic. */
async function loadFunctions(path, names, context) {
  const text = await readFile(`${root}/src/${path}`, 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = names.map((name) => {
    const matches = source.statements.filter((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.equal(matches.length, 1);
    return matches[0].getText(source).replace(/^export (?:default )?/, '');
  });
  const module = { exports: {} };
  vm.runInNewContext(
    transformSync(`${declarations.join('\n')}\nmodule.exports={${names.join(',')}};`, {
      loader: 'tsx',
      format: 'cjs',
      target: 'node20',
      jsx: 'transform',
    }).code,
    { React, ...mantine, ...context, module },
    { timeout: 1000 }
  );
  return module.exports;
}

/** Reveal the tooltip content for deterministic markup checks, retaining actual Mantine text/list nodes. */
const RevealHoverCard = ({ children }) => React.createElement(React.Fragment, null, children);
RevealHoverCard.Target = RevealHoverCard;
RevealHoverCard.Dropdown = RevealHoverCard;
let hasConditionals = true;
const breakdown = () => ({
  conditionals: hasConditionals ? [{ text: 'against fire', source: 'Existing source' }] : [],
});
const parts = () => ({ hasConditionals, breakdown: breakdown() });
const stats = await loadFunctions(
  'process/variables/variable-display.tsx',
  ['displayFinalProfValue', 'displayFinalVariableValue', 'displayFinalAcValue', 'displayFinalSpeedValue'],
  {
    HoverCard: RevealHoverCard,
    getVariable: () => ({ value: 2 }),
    getProfValueParts: parts,
    getAcParts: parts,
    getFinalProfValue: () => 7,
    getFinalVariableValue: () => ({ total: 3 }),
    getFinalAcValue: () => 19,
    getSpeedValue: () => ({ total: 30 }),
    getVariableBreakdown: breakdown,
  }
);
const render = (child) => renderToStaticMarkup(React.createElement(mantine.MantineProvider, { env: 'test' }, child));

test('conditional stat markers stay inline and tooltip lists are not inside paragraphs', () => {
  hasConditionals = true;
  for (const [name, value] of [
    ['displayFinalProfValue', 7],
    ['displayFinalVariableValue', 3],
    ['displayFinalAcValue', 19],
    ['displayFinalSpeedValue', 30],
  ]) {
    const html = render(React.createElement(mantine.Text, null, stats[name]('CHARACTER', 'EXISTING', null)));
    assert.doesNotMatch(html, /<p\b[^>]*>\s*\*/);
    assert.doesNotMatch(html, /<p\b[^>]*>\s*<ul\b/);
    assert.match(html, /<span\b[^>]*style="[^"]*position:absolute[^"]*"[^>]*>\*<\/span>/);
    assert.match(html, new RegExp('>' + value + '<'));
    assert.match(html, /against fire/);
    assert.match(html, /Existing source/);
  }
});

test('unconditional values retain their existing text without a marker or tooltip', () => {
  hasConditionals = false;
  for (const [name, value] of [
    ['displayFinalProfValue', 7],
    ['displayFinalVariableValue', 3],
    ['displayFinalAcValue', 19],
    ['displayFinalSpeedValue', 30],
  ]) {
    const html = render(React.createElement(mantine.Text, null, stats[name]('CHARACTER', 'EXISTING', null)));
    assert.match(html, new RegExp('<span>' + value + '<\\/span>'));
    assert.doesNotMatch(html, /against fire|position:absolute|<ul\b/);
  }
});

const selection = await loadFunctions(
  'common/select/SelectContent.tsx',
  ['SelectContentButton', 'hasRankedSpellOptions'],
  {
    useAtom: () => [undefined, () => {}],
    drawerState: {},
    useState: React.useState,
    useEffect: React.useEffect,
    useRef: React.useRef,
    toLabel: (value) => value,
  }
);
const initial = await loadFunctions('process/variables/initial-stats-display.tsx', ['getDisplay'], {
  SelectContentButton: selection.SelectContentButton,
  isAttributeValue: (value) => typeof value === 'object' && value !== null && 'partial' in value,
});
const indented = await loadFunctions('common/IndentedText.tsx', ['IndentedText'], { TEXT_INDENT_AMOUNT: 10 });
/** Use the actual editable-stat and picker rendering path with finite selections, not a placeholder div. */
const editable = () =>
  initial.getDisplay(
    'CHARACTER',
    { value: 1, partial: false },
    {
      id: 'existing-selector',
      data: { title: 'Existing choice' },
    },
    { type: 'attr' },
    'READ/WRITE',
    {
      primarySource: 'existing',
      characterState: [null, () => {}],
      operationResults: [{ selection: { id: 'existing-selector', title: 'Existing choice', options: [] } }],
    }
  );
const overviewContext = {
  useState: () => [true, () => {}],
  useAtom: () => [undefined, () => {}],
  characterState: {},
  drawerState: {},
  RichText: ({ children }) => React.createElement(mantine.Text, null, children),
  IndentedText: indented.IndentedText,
  IconHelpCircle: () => React.createElement('svg'),
  IconChevronsUp: () => React.createElement('svg'),
  IconChevronsDown: () => React.createElement('svg'),
  getIconFromContentType: () => React.createElement('svg'),
  IMPRINT_BG_COLOR: 'transparent',
  IMPRINT_BORDER_COLOR: 'transparent',
  convertAncestryOperationsIntoUI: (_ancestry, _physicalFeatures, _senses, _languages, mode) => ({
    ancestryHp: { ui: mode === 'READ' ? '8' : editable() },
    size: { ui: mode === 'READ' ? 'Medium' : editable() },
    speed: { ui: mode === 'READ' ? '25 feet' : editable() },
    boostAttributes: [{ ui: mode === 'READ' ? 'Free boost' : editable() }],
    flawAttributes: [{ ui: mode === 'READ' ? 'Strength' : editable() }],
    languages: [{ ui: 'Common' }],
    additionalLanguages: mode === 'READ' ? [] : [{ ui: editable() }],
    senses: [{ ui: 'Low-light vision' }],
    physicalFeatures: [],
  }),
};
const overview = await loadFunctions('drawers/types/AncestryDrawer.tsx', ['AncestryInitialOverview'], overviewContext);
const background = await loadFunctions('drawers/types/BackgroundDrawer.tsx', ['BackgroundInitialOverview'], {
  ...overviewContext,
  convertBackgroundOperationsIntoUI: (_background, mode) => ({
    attributes: [{ ui: mode === 'READ' ? 'Free boost' : editable() }],
  }),
});

test('all ancestry overview divider labels have valid block containers and retain their wording', () => {
  const html = render(
    React.createElement(overview.AncestryInitialOverview, {
      ancestry: { description: 'Existing ancestry' },
      physicalFeatures: [],
      senses: [],
      heritages: [],
      languages: [],
      mode: 'READ',
    })
  );
  assert.doesNotMatch(html, /<p\b[^>]*>\s*<div\b/);
  for (const label of ['Attribute Boosts', 'Attribute Flaws', 'Languages', 'Special Abilities']) {
    assert.match(html, new RegExp(label));
  }
});

test('editable ancestry and background stat choices are not placed inside paragraphs', () => {
  for (const [Component, props, choices] of [
    [
      overview.AncestryInitialOverview,
      {
        ancestry: { description: 'Existing ancestry' },
        physicalFeatures: [],
        senses: [],
        heritages: [],
        languages: [],
      },
      6,
    ],
    [background.BackgroundInitialOverview, { background: { description: 'Existing background' } }, 1],
  ]) {
    const html = render(React.createElement(Component, { ...props, mode: 'READ/WRITE' }));
    assert.doesNotMatch(html, /<p\b[^>]*>\s*<div\b/);
    assert.equal((html.match(/selection-choice-base/g) ?? []).length, choices);
    assert.equal((html.match(/Existing choice/g) ?? []).length, choices);
  }
});
