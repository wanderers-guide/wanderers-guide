/** Mount the actual controlled conditional editor with Mantine; no accounts, APIs or saved content. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import cypress from 'cypress';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = await mkdtemp(join(tmpdir(), 'wg-contribution-authoring-'));
const screenshotsArgument = process.argv.indexOf('--screenshots-dir');
const screenshotsDirectory =
  screenshotsArgument === -1 ? join(directory, 'screenshots') : resolve(process.argv[screenshotsArgument + 1]);
const operationsFile = join(frontend, 'src/common/operations/Operations.tsx');
const operationsSource = await readFile(operationsFile, 'utf8');
const unrelatedViews = new Map();
for (const match of operationsSource.matchAll(/import\s+\{([^}]+)\}\s+from\s+'(\.\/[^']+)';/g)) {
  if (match[2] === './variables/AdjValOperation') continue;
  unrelatedViews.set(
    match[2],
    match[1].split(',').map((name) => name.trim())
  );
}

const check = (id, overrides = {}) => ({
  id,
  name: 'RESISTANCES',
  type: 'list-str',
  operator: 'INCLUDES',
  value: 'fire, {{level/2}}',
  ...overrides,
});
const qualifier = { categories: ['heritage'], match: 'typed-amount', excludeCurrentContent: true };
const conditional = (conditions = [check('check-a')], contributionChecks) => ({
  id: 'conditional-a',
  type: 'conditional',
  data: {
    conditions,
    trueOperations: [],
    falseOperations: [],
    ...(contributionChecks ? { contributionChecks } : {}),
  },
});
const cases = {
  ordinary: conditional(),
  qualified: conditional(undefined, { 'check-a': qualifier }),
  constructor: conditional([check('check-a'), check('constructor')], { 'check-a': qualifier }),
  toString: conditional([check('check-a'), check('toString')], { 'check-a': qualifier }),
  reserved: conditional([check('check-a'), check('__proto__')], { 'check-a': qualifier }),
  multiple: conditional([check('check-a'), check('check-b', { name: 'WEAKNESSES', value: 'cold, 3' })], {
    'check-a': qualifier,
    'check-b': { ...qualifier, categories: ['class-feat'] },
  }),
  defaults: conditional(
    [
      check('check-prof-a', { name: 'SKILL_MEDICINE', type: 'prof', operator: 'EQUALS', value: '' }),
      check('check-prof-b', { name: 'SKILL_CRAFTING', type: 'prof', operator: 'EQUALS', value: '' }),
      check('check-a'),
    ],
    { 'check-a': qualifier }
  ),
  fallback: conditional([]),
  duplicate: conditional([
    check('duplicate-check', { value: 'fire, 5' }),
    check('duplicate-check', { name: 'WEAKNESSES', value: 'cold, 3' }),
  ]),
  legacy: conditional([
    check('legacy-bool', { name: 'WEAPON_SPECIALIZATION', type: 'bool', operator: 'EQUALS', value: '' }),
    check('legacy-string', { name: 'SENSES', type: 'str', operator: 'INCLUDES', value: 'fire' }),
  ]),
};

const entry = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MantineProvider, Button, Group, Stack, DEFAULT_THEME} from '@mantine/core';
import {OperationDisplay} from '@common/operations/Operations';
import {OperationSchema} from '@schemas/operations';
import {resetVariables} from '@variables/variable-manager';
resetVariables('CHARACTER');
const cases = ${JSON.stringify(cases)};
window.__editor = {cases, changes: [], initial: null, state: null, valid: false};
window.__editor.validate = operation => OperationSchema.safeParse(JSON.parse(JSON.stringify(operation))).success;
function Fixture() {
  const [operation, setOperation] = useState(structuredClone(cases.ordinary));
  const [theme, setTheme] = useState('dark');
  window.__editor.load = (name) => {
    const next = structuredClone(cases[name]);
    window.__editor.initial = structuredClone(next);
    window.__editor.changes = [];
    setOperation(next);
  };
  window.__editor.replace = (next) => setOperation(structuredClone(next));
  window.__editor.state = structuredClone(operation);
  window.__editor.valid = OperationSchema.safeParse(JSON.parse(JSON.stringify(operation))).success;
  window.__editor.roundtrip = () => OperationSchema.parse(JSON.parse(JSON.stringify(window.__editor.state)));
  return <MantineProvider forceColorScheme={theme} theme={{colors:{guide:DEFAULT_THEME.colors.blue}}}>
    <Stack p='md'>
      <Group>{Object.keys(cases).map(name => <Button key={name} size='xs' onClick={() => window.__editor.load(name)}>{name}</Button>)}
      <Button size='xs' onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Toggle theme</Button></Group>
      <OperationDisplay key={operation.id} operation={operation} onRemove={() => {}} onChange={next => {
        window.__editor.changes.push(structuredClone(next));
        setOperation(next);
      }}/>
    </Stack>
  </MantineProvider>;
}
window.__editor.load = () => {};
createRoot(document.getElementById('root')).render(<Fixture/>);
`;

const spec = `
const data = () => cy.window().its('__editor.state.data');
const load = name => {
  cy.window().then(win => {
    // A new conditional identity deliberately remounts the actual check editor for each independent case.
    const next = structuredClone(win.__editor.cases[name]);
    next.id = 'fixture-' + name;
    win.__editor.changes = [];
    win.__editor.initial = structuredClone(next);
    win.__editor.replace(next);
  });
  return cy.window().its('__editor.state.id').should('eq','fixture-' + name);
};
const match = index => cy.get('input').filter((_, input) => input.labels?.[0]?.textContent === 'Match').eq(index);
const category = index => cy.get('input').filter((_, input) => input.labels?.[0]?.textContent === 'Source categories').eq(index).closest('.mantine-MultiSelect-root').find('.mantine-MultiSelect-input');
const pick = (control, label) => {
  control.then(element => {
    const combobox = element.is('[role=combobox]') ? element : element.find('[role=combobox]');
    // MultiSelect retains its open dropdown after choosing an option; do not toggle it closed.
    const isExpanded = element.attr('data-expanded') === 'true' || combobox.attr('aria-expanded') === 'true';
    if (!isExpanded) cy.wrap(element).click();
  });
  cy.get('[role=option]').filter(':visible').contains(new RegExp('^' + label + '$')).click();
};
const typed = index => pick(match(index), 'Type and amount');
const text = index => pick(match(index), 'Text');
const assertValid = () => cy.window().should(win => {
  expect(win.__editor.valid).to.eq(true);
  expect(() => win.__editor.roundtrip()).not.to.throw();
  win.__editor.changes.forEach(operation => {
    expect(win.__editor.validate(operation)).to.eq(true);
    const maps = operation.data.contributionChecks || {};
    Object.entries(maps).forEach(([id, value]) => {
      expect(value.categories).to.have.length.greaterThan(0);
      expect(value.excludeCurrentContent).to.eq(true);
      expect(value.match).to.eq('typed-amount');
      expect(operation.data.conditions.filter(check => check.id === id && check.type === 'list-str' && check.operator === 'INCLUDES')).to.have.length(1);
    });
  });
});
describe('controlled contribution authoring on a credential-free synthetic mount', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().should(win => expect(win.__editor?.state).to.exist);
  });
  it('keeps Text default unchanged and roundtrips the explicit opt-in with fixed self-exclusion', () => {
    load('ordinary');
    match(0).should('have.value', 'Text');
    data().should(value => expect(value).not.to.have.property('contributionChecks'));
    typed(0);
    data().should(value => expect(value.contributionChecks).to.deep.eq({'check-a': {
      categories:['heritage','ancestry-feat','class-feat','archetype-feat'], match:'typed-amount', excludeCurrentContent:true
    }}));
    text(0);
    data().should(value => expect(value).not.to.have.property('contributionChecks'));
    assertValid();
  });
  it('retains the last category without emitting an invalid intermediate map', () => {
    load('qualified');
    typed(0);
    data().should(value => expect(value.contributionChecks['check-a'].categories).to.deep.eq(['heritage']));
    pick(category(0), 'Heritage');
    data().should(value => expect(value.contributionChecks['check-a'].categories).to.deep.eq(['heritage']));
    pick(category(0), 'Class feat');
    data().should(value => expect(value.contributionChecks['check-a'].categories).to.deep.eq(['heritage','class-feat']));
    pick(category(0), 'Heritage');
    data().should(value => expect(value.contributionChecks['check-a'].categories).to.deep.eq(['class-feat']));
    assertValid();
  });
  it('keeps independent stable keys on multi-check edits, addition and removal', () => {
    load('multiple');
    cy.get('input[placeholder="Text (case insensitive)"]').eq(1).clear().type('cold, 4');
    data().should(value => {
      expect(value.conditions.map(check => check.id)).to.deep.eq(['check-a','check-b']);
      expect(value.conditions[1].value).to.eq('cold, 4');
      expect(Object.keys(value.contributionChecks)).to.deep.eq(['check-a','check-b']);
    });
    cy.get('input[placeholder="Text (case insensitive)"]').eq(1).closest('.mantine-Group-root').find('button').filter((_,button) => button.querySelector('.tabler-icon-circle-minus')).click();
    data().should(value => {
      expect(value.conditions.map(check => check.id)).to.deep.eq(['check-a']);
      expect(Object.keys(value.contributionChecks)).to.deep.eq(['check-a']);
    });
    cy.get('input[placeholder="Text (case insensitive)"]').eq(0).closest('.mantine-Group-root').find('button').filter((_,button) => button.querySelector('.tabler-icon-circle-plus')).click();
    data().should(value => {
      expect(value.conditions).to.have.length(2);
      expect(value.conditions[0].id).to.eq('check-a');
      expect(value.conditions[1].id).not.to.eq('check-a');
      expect(Object.keys(value.contributionChecks)).to.deep.eq(['check-a']);
    });
    assertValid();
  });
  it('prunes only the invalid qualifier on operator and value-type edits', () => {
    load('multiple');
    pick(cy.get('input[placeholder=Operator]').eq(1), 'not includes');
    data().should(value => expect(Object.keys(value.contributionChecks)).to.deep.eq(['check-a']));
    pick(cy.get('input[placeholder="Value Type"]').eq(0), 'Text');
    data().should(value => expect(value).not.to.have.property('contributionChecks'));
    cy.get('input').filter((_,input) => input.labels?.[0]?.textContent === 'Match').should('not.exist');
    assertValid();
  });
  it('keeps rendered check values with their UUIDs through parent reordering and removal', () => {
    load('multiple');
    cy.get('input[placeholder="Text (case insensitive)"]').eq(1).clear().type('cold, 4');
    data().should(value => expect(value.conditions[1].value).to.eq('cold, 4'));
    cy.window().then(win => {
      const next = structuredClone(win.__editor.state);
      next.data.conditions.reverse();
      win.__editor.replace(next);
    });
    cy.get('input[placeholder="Text (case insensitive)"]').eq(0).should('have.value','cold, 4');
    cy.get('input[placeholder="Text (case insensitive)"]').eq(1).should('have.value','fire, {{level/2}}');
    cy.window().then(win => {
      const next = structuredClone(win.__editor.state);
      next.data.conditions = next.data.conditions.filter(check => check.id === 'check-b');
      delete next.data.contributionChecks['check-a'];
      win.__editor.replace(next);
    });
    cy.get('input[placeholder="Text (case insensitive)"]').should('have.length',1).and('have.value','cold, 4');
    data().should(value => expect(Object.keys(value.contributionChecks)).to.deep.eq(['check-b']));
    assertValid();
  });
  it('retains qualifiers on both actual branch additions and existing check values', () => {
    load('qualified');
    pick(cy.get('input[placeholder="+ Add Operation"]').eq(0), 'Adjust Value');
    data().should(value => {
      expect(value.trueOperations).to.have.length(1);
      expect(value.trueOperations[0].type).to.eq('adjValue');
      expect(value.conditions[0].value).to.eq('fire, {{level/2}}');
      expect(value.contributionChecks['check-a'].categories).to.deep.eq(['heritage']);
    });
    pick(cy.get('input[placeholder="+ Add Operation"]').eq(1), 'Adjust Value');
    data().should(value => {
      expect(value.falseOperations).to.have.length(1);
      expect(value.trueOperations).to.have.length(1);
      expect(value.contributionChecks['check-a'].categories).to.deep.eq(['heritage']);
    });
    assertValid();
  });
  it('accumulates simultaneous sibling mount defaults without overwriting check values or qualifiers', () => {
    load('defaults');
    data().should(value => {
      expect(value.conditions.map(check => check.id)).to.deep.eq(['check-prof-a','check-prof-b','check-a']);
      expect(value.conditions.map(check => check.value)).to.deep.eq(['U','U','fire, {{level/2}}']);
      expect(value.contributionChecks['check-a'].categories).to.deep.eq(['heritage']);
    });
    assertValid();
  });
  it('keeps the fallback UUID stable through branch edits and rerenders', () => {
    load('fallback');
    data().should(value => expect(value.conditions).to.have.length(1));
    data().then(value => {
      const id = value.conditions[0].id;
      expect(id).to.match(/^[0-9a-f-]{36}$/);
      pick(cy.get('input[placeholder="+ Add Operation"]').eq(0), 'Adjust Value');
      data().should(next => expect(next.conditions[0].id).to.eq(id));
      cy.contains('button','Toggle theme').click();
      data().should(next => expect(next.conditions[0].id).to.eq(id));
    });
    assertValid();
  });
  it('reflects parent qualifier rerenders without retaining a local stale qualifier', () => {
    load('qualified');
    match(0).should('have.value','Type and amount');
    cy.window().then(win => {
      const next = structuredClone(win.__editor.state);
      delete next.data.contributionChecks;
      win.__editor.replace(next);
    });
    match(0).should('have.value','Text');
    data().should(value => expect(value).not.to.have.property('contributionChecks'));
    typed(0);
    assertValid();
  });
  it('keeps a legacy unopted duplicate-ID sibling untouched when editing one check', () => {
    load('duplicate');
    cy.get('input[placeholder="Text (case insensitive)"]').eq(0).clear().type('fire, 6');
    data().should(value => {
      expect(value.conditions).to.have.length(2);
      expect(value.conditions[0].name).to.eq('RESISTANCES');
      expect(value.conditions[0].value).to.eq('fire, 6');
      expect(value.conditions[1].name).to.eq('WEAKNESSES');
      expect(value.conditions[1].value).to.eq('cold, 3');
      expect(value).not.to.have.property('contributionChecks');
    });
    cy.get('input[placeholder="Text (case insensitive)"]').eq(1).should('have.value','cold, 3');
    assertValid();
  });
  it('cannot persist an invalid contribution key on legacy duplicate check IDs', () => {
    load('duplicate');
    typed(0);
    match(0).should('have.value','Text');
    data().should(value => {
      expect(value).not.to.have.property('contributionChecks');
      expect(value.conditions.map(check => check.value)).to.deep.eq(['fire, 5','cold, 3']);
    });
    assertValid();
  });
  it('leaves ordinary legacy boolean/string semantics unchanged and never offers unsupported match controls', () => {
    load('legacy');
    data().should(value => {
      expect(value.conditions[0].value).to.eq('');
      expect(value.conditions[1].value).to.eq('fire');
      expect(value).not.to.have.property('contributionChecks');
    });
    cy.contains('label','False').should('exist');
    cy.get('input').filter((_,input) => input.labels?.[0]?.textContent === 'Match').should('not.exist');
    assertValid();
  });
  for (const id of ['constructor','toString']) {
    it('edits an own '+id+' qualifier without inheriting a sibling map entry', () => {
      load(id);
      match(0).should('have.value','Type and amount');
      match(1).should('have.value','Text');
      cy.get('.mantine-MultiSelect-root').should('have.length',1);
      typed(1);
      data().should(value => {
        expect(Object.hasOwn(value.contributionChecks,id)).to.eq(true);
        expect(Object.keys(value.contributionChecks)).to.deep.eq(['check-a',id]);
        expect(value.contributionChecks[id].categories).to.deep.eq(['heritage','ancestry-feat','class-feat','archetype-feat']);
      });
      cy.window().should(win => {
        const parsed = win.__editor.roundtrip();
        expect(Object.hasOwn(parsed.data.contributionChecks,id)).to.eq(true);
        expect(parsed).to.deep.eq(JSON.parse(JSON.stringify(win.__editor.state)));
        expect(Object.getPrototypeOf(win.__editor.state.data.contributionChecks)).to.eq(win.Object.prototype);
      });
      text(1);
      data().should(value => expect(Object.keys(value.contributionChecks)).to.deep.eq(['check-a']));
      match(1).should('have.value','Text');
      assertValid();
    });
  }
  it('keeps a reserved unopted __proto__ check editable without offering a lossy qualifier', () => {
    load('reserved');
    cy.get('input').filter((_,input) => input.labels?.[0]?.textContent === 'Match').should('have.length',1);
    cy.get('.mantine-MultiSelect-root').should('have.length',1);
    cy.get('input[placeholder="Text (case insensitive)"]').eq(1).clear().type('cold, 6');
    data().should(value => {
      expect(value.conditions[1].id).to.eq('__proto__');
      expect(value.conditions[1].value).to.eq('cold, 6');
      expect(Object.keys(value.contributionChecks)).to.deep.eq(['check-a']);
    });
    cy.window().should(win => {
      const invalid = structuredClone(win.__editor.state);
      invalid.data.contributionChecks = {...invalid.data.contributionChecks,['__proto__']:invalid.data.contributionChecks['check-a']};
      expect(Object.hasOwn(invalid.data.contributionChecks,'__proto__')).to.eq(true);
      expect(win.__editor.validate(invalid)).to.eq(false);
    });
    assertValid();
  });
  for (const width of [390,1280]) for (const theme of ['dark','light']) {
    it('renders all source categories at '+width+'px in '+theme+' without horizontal overflow', () => {
      cy.viewport(width,900);
      load('multiple');
      text(0); typed(0); text(1); typed(1);
      if (theme === 'light') cy.contains('button','Toggle theme').click();
      cy.get('html').should('have.attr','data-mantine-color-scheme',theme);
      cy.window().should(win => {
        expect(win.innerWidth).to.eq(width);
        expect(win.innerHeight).to.eq(900);
        expect(win.document.documentElement.scrollWidth).to.be.at.most(win.document.documentElement.clientWidth);
      });
      cy.get('.mantine-MultiSelect-root').should('have.length',2).each(control => {
        cy.wrap(control).should('be.visible').find('.mantine-Pill-root').should('have.length',4);
      });
      assertValid();
      cy.screenshot('contribution-authoring-'+theme+'-'+width,{capture:'viewport'});
    });
  }
});
`;

let server;
let sentinel;
try {
  await build({
    absWorkingDir: frontend,
    stdin: { contents: entry, resolveDir: frontend, loader: 'tsx' },
    tsconfig: join(frontend, 'tsconfig.json'),
    bundle: true,
    outfile: join(directory, 'editor.js'),
    platform: 'browser',
    format: 'iife',
    define: { 'import.meta.env': JSON.stringify({ VITE_ENV: 'production' }) },
    plugins: [
      {
        name: 'unrelated-editor-boundaries',
        setup(plugin) {
          plugin.onResolve({ filter: /.*/ }, (args) => {
            if (args.importer === operationsFile && unrelatedViews.has(args.path)) {
              return { path: args.path, namespace: 'unrelated-view' };
            }
          });
          plugin.onLoad({ filter: /.*/, namespace: 'unrelated-view' }, (args) => ({
            contents: unrelatedViews
              .get(args.path)
              .map((name) => 'export function ' + name + '(){return null;}')
              .join('\n'),
            loader: 'js',
          }));
          plugin.onResolve({ filter: /^@content\/content-store$/ }, () => ({
            path: 'content',
            namespace: 'fixture-content',
          }));
          plugin.onLoad({ filter: /.*/, namespace: 'fixture-content' }, () => ({
            contents:
              'export const getCachedContent=()=>[]; export const getContentFast=()=>[]; export const getDefaultSources=()=>[]; export const fetchContentAll=async()=>[]; export const fetchContentById=async()=>null; export const fetchTraitByName=async()=>null; export const fetchArchetypeByDedicationFeat=async()=>null;',
            loader: 'js',
          }));
        },
      },
    ],
  });
  await writeFile(
    join(directory, 'index.html'),
    '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/mantine.css"></head><body><div id="root"></div><script src="/editor.js"></script></body></html>'
  );
  await writeFile(
    join(directory, 'mantine.css'),
    await readFile(join(frontend, 'node_modules/@mantine/core/styles.css'))
  );
  await writeFile(join(directory, 'authoring.cy.js'), spec);
  server = createServer(async (request, response) => {
    const paths = { '/': 'index.html', '/editor.js': 'editor.js', '/mantine.css': 'mantine.css' };
    const filename = paths[request.url];
    if (!filename) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.setHeader(
      'Content-Type',
      filename.endsWith('.js') ? 'text/javascript' : filename.endsWith('.css') ? 'text/css' : 'text/html'
    );
    response.end(await readFile(join(directory, filename)));
  });
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const baseUrl = 'http://127.0.0.1:' + address.port;
  console.log('Credential-free authoring fixture: ' + baseUrl + ' (temporary files: ' + directory + ')');
  if (process.argv.includes('--preview')) {
    console.log('Preview only; stop with Ctrl-C. No API, account or content-editor save is connected.');
    await new Promise((resolveStop) => {
      process.once('SIGINT', resolveStop);
      process.once('SIGTERM', resolveStop);
    });
  } else {
    // External artifact folders may contain prior captures; prove Cypress leaves unrelated contents intact.
    await mkdir(screenshotsDirectory, { recursive: true });
    sentinel = join(screenshotsDirectory, basename(directory) + '-preservation.txt');
    const sentinelContents = 'Existing screenshot-folder content must survive this run.\n';
    await writeFile(sentinel, sentinelContents, { flag: 'wx' });
    const configFile = join(directory, 'cypress.config.cjs');
    await writeFile(
      configFile,
      'module.exports = ' +
        JSON.stringify({
          video: false,
          screenshotOnRunFailure: true,
          trashAssetsBeforeRuns: false,
          screenshotsFolder: screenshotsDirectory,
          e2e: { baseUrl, supportFile: false, specPattern: join(directory, 'authoring.cy.js') },
        }) +
        ';'
    );
    const result = await cypress.run({
      project: directory,
      configFile,
      browser: 'electron',
      spec: join(directory, 'authoring.cy.js'),
    });
    assert.equal(await readFile(sentinel, 'utf8'), sentinelContents);
    console.log('Existing screenshot-folder sentinel preserved: ' + sentinel);
    await rm(sentinel);
    assert.equal(result.failures ?? 0, 0, result.message);
    assert.equal(result.totalTests, 19);
    assert.equal(result.totalFailed, 0);
    assert.equal(result.totalPassed, 19);
  }
} finally {
  if (server?.listening) await new Promise((resolveClose) => server.close(resolveClose));
  if (sentinel) await rm(sentinel, { force: true });
  await rm(directory, { recursive: true, force: true });
}
