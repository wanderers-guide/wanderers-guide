/** Render the actual class overview with exact editable-stat and selector functions. */
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

/** Extract unchanged function bodies instead of duplicating their production rendering logic. */
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
const display = await loadFunctions('process/variables/initial-stats-display.tsx', ['getDisplay'], {
  SelectContentButton: selection.SelectContentButton,
  isAttributeValue: (value) => typeof value === 'object' && value !== null && 'partial' in value,
  isProficiencyValue: (value) => typeof value === 'object' && value !== null && 'increases' in value,
});
const indented = await loadFunctions('common/IndentedText.tsx', ['IndentedText'], { TEXT_INDENT_AMOUNT: 10 });

/** Finite render inputs exercise all fourteen editable containers, including valid homebrew-selectable stats. */
function editable(name, type = 'prof') {
  const value = type === 'attr' ? { value: 1, partial: false } : type === 'num' ? 10 : { value: 'T', increases: 0 };
  return display.getDisplay(
    'CHARACTER',
    value,
    { id: `existing-${name}`, data: { title: `Existing ${name} choice` } },
    { type },
    'READ/WRITE',
    {
      primarySource: 'class',
      characterState: [null, () => {}],
      operationResults: [{ selection: { id: `existing-${name}`, title: `Existing ${name} choice`, options: [] } }],
    }
  );
}
const editableFields = [
  'keyAttribute',
  'classHp',
  'perception',
  'skills',
  'additionalSkillTrainings',
  'saves',
  'simpleWeapons',
  'martialWeapons',
  'advancedWeapons',
  'unarmedAttacks',
  'lightArmor',
  'mediumArmor',
  'heavyArmor',
  'unarmoredDefense',
];
const readValues = {
  keyAttribute: 'Dexterity',
  classHp: '10',
  perception: 'Expert in Perception',
  skills: 'Trained in Nature',
  additionalSkillTrainings: 'Trained in additional skills',
  saves: 'Expert in Fortitude',
  simpleWeapons: 'Trained in simple weapons',
  martialWeapons: 'Trained in martial weapons',
  advancedWeapons: 'Untrained in advanced weapons',
  unarmedAttacks: 'Trained in unarmed attacks',
  lightArmor: 'Trained in light armor',
  mediumArmor: 'Trained in medium armor',
  heavyArmor: 'Untrained in heavy armor',
  unarmoredDefense: 'Trained in unarmored defense',
};
const fixedReadValues = {
  spellAttack: 'Trained in spell attacks',
  spellDC: 'Trained in spell DC',
  classDC: 'Trained in class DC',
};
const icon = () => React.createElement('svg');
const overview = await loadFunctions('drawers/types/ClassDrawer.tsx', ['ClassInitialOverview'], {
  useState: () => [true, () => {}],
  useAtom: () => [undefined, () => {}],
  characterState: {},
  RichText: ({ children }) => React.createElement(mantine.Text, null, children),
  IndentedText: indented.IndentedText,
  IconHelpCircle: icon,
  IconEyeFilled: icon,
  IconBadgesFilled: icon,
  IconHeartHandshake: icon,
  IconSword: icon,
  IconShieldCheckeredFilled: icon,
  IconFlare: icon,
  IconVocabulary: icon,
  IMPRINT_BG_COLOR: 'transparent',
  IMPRINT_BORDER_COLOR: 'transparent',
  convertClassOperationsIntoUI: (_class, mode) => {
    const values = Object.fromEntries(
      editableFields.map((name) => [
        name,
        {
          ui:
            mode === 'READ'
              ? readValues[name]
              : editable(name, name === 'keyAttribute' ? 'attr' : name === 'classHp' ? 'num' : 'prof'),
        },
      ])
    );
    for (const name of ['skills', 'additionalSkillTrainings', 'saves']) values[name] = [values[name]];
    for (const [name, value] of Object.entries(fixedReadValues)) values[name] = { ui: value };
    return values;
  },
});
const render = (mode) =>
  renderToStaticMarkup(
    React.createElement(
      mantine.MantineProvider,
      { env: 'test' },
      React.createElement(overview.ClassInitialOverview, { class_: { description: 'Existing class' }, mode })
    )
  );
const labels = ['Perception', 'Skills', 'Saving Throws', 'Attacks', 'Defenses', 'Spells', 'Class DC'];

test('read-only class overview labels have valid block containers and every existing stat value remains', () => {
  const html = render('READ');
  assert.doesNotMatch(html, /<p\b[^>]*>\s*<div\b/);
  assert.doesNotMatch(html, /selection-choice-base/);
  for (const text of [...labels, ...Object.values(readValues), ...Object.values(fixedReadValues)]) {
    assert.ok(html.includes(text), text);
  }
});

test('all fourteen editable class stat paths render their actual picker outside a paragraph', () => {
  const html = render('READ/WRITE');
  assert.doesNotMatch(html, /<p\b[^>]*>\s*<div\b/);
  assert.equal((html.match(/selection-choice-base/g) ?? []).length, 14);
  for (const name of editableFields) assert.ok(html.includes(`Existing ${name} choice`), name);
  for (const text of [...labels, ...Object.values(fixedReadValues)]) assert.ok(html.includes(text), text);
});
