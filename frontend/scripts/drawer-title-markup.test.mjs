/** Render the real drawer title JSX and current App theme override without authenticated state. */
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
const mantine = require('@mantine/core');
const icons = require('@tabler/icons-react');
const { renderToStaticMarkup } = require('react-dom/server');

/** Read exact source nodes instead of duplicating the production header structure. */
async function sourceFile(path) {
  const text = await readFile(`${root}/src/${path}`, 'utf8');
  return ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
async function titleExpression(path) {
  const source = await sourceFile(path);
  const expressions = [];
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(source) === 'Drawer') {
      const title = node.attributes.properties.find(
        (prop) => ts.isJsxAttribute(prop) && prop.name.getText(source) === 'title'
      );
      assert(title && ts.isJsxExpression(title.initializer));
      expressions.push(title.initializer.expression.getText(source));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(expressions.length, 1);
  return expressions[0];
}
async function functionDeclaration(path, name) {
  const source = await sourceFile(path);
  const matches = source.statements.filter((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.equal(matches.length, 1);
  return matches[0].getText(source).replace(/^export /, '');
}

const app = await sourceFile('App.tsx');
const defaults = [];
const findDefaults = (node) => {
  if (ts.isPropertyAssignment(node) && node.name.getText(app) === 'DrawerTitle') {
    defaults.push(node.initializer.getText(app));
  }
  ts.forEachChild(node, findDefaults);
};
findDefaults(app);
assert(defaults.length <= 1);
const themeModule = { exports: undefined };
vm.runInNewContext(`module.exports=${defaults[0] ?? 'undefined'};`, { module: themeModule }, { timeout: 1000 });
const actualTheme = mantine.createTheme({ components: { DrawerTitle: themeModule.exports } });
const [ordinary, creature, traitTitle, creatureTitle] = await Promise.all([
  titleExpression('drawers/DrawerBase.tsx'),
  titleExpression('drawers/DrawerCreatureBase.tsx'),
  functionDeclaration('drawers/types/TraitDrawer.tsx', 'TraitDrawerTitle'),
  functionDeclaration('drawers/types/CreatureDrawer.tsx', 'CreatureDrawerTitle'),
]);
const module = { exports: {} };
vm.runInNewContext(
  transformSync(
    `${traitTitle}\n${creatureTitle}\nfunction DrawerTitle(){return <TraitDrawerTitle data={{trait:{name:'Robot'}}}/>;}\nfunction OrdinaryTitle(){return ${ordinary};}\nfunction CreatureTitle(){return ${creature};}\nmodule.exports={OrdinaryTitle,CreatureTitle};`,
    { loader: 'tsx', format: 'cjs', target: 'node20', jsx: 'transform' }
  ).code,
  {
    React,
    Suspense: React.Suspense,
    ...mantine,
    ...icons,
    module,
    toLabel: (value) => value,
    determineCompanionType: () => 'Creature',
    getEntityLevel: (value) => value.level,
    useQuery: () => ({ data: undefined, isFetching: false, refetch: () => assert.fail('No query calls in SSR') }),
    fetchContentById: () => assert.fail('No content reads in SSR'),
    displayTitle: true,
    ref: undefined,
    opened: true,
    _drawer: { extra: { history: [] }, data: { creature: { name: 'Minibot', level: -1 } } },
    handleDrawerGoBack: () => assert.fail('No interactions in SSR'),
    handleDrawerClose: () => assert.fail('No interactions in SSR'),
  },
  { timeout: 1000 }
);
const render = (kind, theme) =>
  renderToStaticMarkup(
    React.createElement(
      mantine.MantineProvider,
      { env: 'test', ...(theme ? { theme } : {}) },
      React.createElement(
        mantine.Drawer,
        {
          opened: true,
          onClose: () => {},
          withinPortal: false,
          title: React.createElement(module.exports[kind]),
          withCloseButton: false,
        },
        React.createElement(mantine.Text, null, 'Existing drawer body')
      )
    )
  );

test('actual ordinary and creature drawer titles keep one inner heading without a nested heading wrapper', () => {
  for (const kind of ['OrdinaryTitle', 'CreatureTitle']) {
    const html = render(kind, actualTheme);
    assert.doesNotMatch(html, /<h2\b[^>]*>[\s\S]*?<h3\b/);
    assert.equal((html.match(/<h3\b/g) ?? []).length, 1);
    assert.match(html, /mantine-Drawer-title" id="[^"]+"/);
    assert.match(html, kind === 'OrdinaryTitle' ? /Robot/ : /Minibot/);
  }
});

test('the actual theme changes only the outer heading tag; title ID, styles, inner heading and all SSR attributes remain', () => {
  for (const kind of ['OrdinaryTitle', 'CreatureTitle']) {
    const before = render(kind);
    const current = render(kind, actualTheme);
    const title = /<h2\b([^>]*class="[^"]*mantine-Drawer-title[^"]*"[^>]*)>([\s\S]*?)<\/h2>/.exec(before);
    assert(title);
    assert.equal(current, before.replace(title[0], `<div${title[1]}>${title[2]}</div>`));
    assert.deepEqual(current.match(/aria-labelledby="[^"]+"/g), before.match(/aria-labelledby="[^"]+"/g));
  }
  // aria-labelledby and focus behavior complete on client mount, outside this finite SSR assertion.
});
