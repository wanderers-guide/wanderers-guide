import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { before, after, test } from 'node:test';
import { build } from 'esbuild';
import ts from 'typescript';
import { AbilityBlockSchema, OperationResultDataSchema } from '../src/schemas/content.ts';
import { OperationSchema, OperationResultSchema, validateSelectionAliases } from '../src/schemas/operations.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { content as emptyContent, inventoryItem, summoner } from './fixtures/eidolon.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261002050000_treasure_vault_repository_selections.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-repository-selections.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$repository$')[1]);
const patch = spec.blocks[0];
const repository = { ...patch.anchor, uuid: Number(patch.anchor.uuid), created_at: '', operations: patch.after };
const tiers = patch.after.map((op) => op.data.trueOperations);
const loreNames = ['SKILL_LORE_RELIC_A', 'SKILL_LORE_RELIC_B', 'SKILL_LORE_RELIC_C'];
const template = (await readContentRows([{ table: 'item', id: 16033 }]))[0].row;
const seed = {
  ...structuredClone(template),
  id: 9902406,
  name: 'Repository regression owner',
  traits: [],
  operations: [
    {
      id: 'd6baabda-a014-44b4-bd31-0e746423d4af',
      type: 'giveAbilityBlock',
      data: { type: 'feat', abilityBlockId: 29711 },
    },
  ],
};
const prefix = `item-${seed.id}_${seed.operations[0].id}`;
const makeSelections = (tier, parent = prefix) =>
  Object.fromEntries(tiers[tier].map((op, slot) => [`${parent}_${op.id}`, loreNames[slot]]));
const selectedResults = (result) => {
  const walk = (value) =>
    [value?.selection ? value : null, ...(value?.result?.results ?? []).flatMap(walk)].filter(Boolean);
  return result.ors.itemResults.flatMap((row) => row.baseResults.flatMap(walk));
};
let engine;
let ui;
before(async () => {
  engine = await createOperationEngine();
  ui = await buildSelectionUi();
});
after(async () => {
  await engine?.cleanup();
  await ui?.cleanup();
});

/** Execute the real character controller against an exact catalog fixture, without rewriting saved selections. */
async function calculate(level, selections, ownerSeed = seed, flags = {}, selectedRepository = repository) {
  const inventory = inventoryItem(structuredClone(ownerSeed), flags);
  const items = flags.in_container
    ? [
        inventoryItem(
          {
            ...structuredClone(seed),
            id: 9902410,
            name: 'Regression container',
            operations: [],
            meta_data: { bulk: { capacity: '10' } },
          },
          { container_contents: [inventory] }
        ),
      ]
    : [inventory];
  const character = {
    ...summoner(items),
    level,
    companions: { list: [] },
    operation_data: { selections: structuredClone(selections) },
    custom_operations: loreNames.map((variable, index) => ({
      id: `private-lore-${index}`,
      type: 'createValue',
      data: { variable, type: 'prof', value: { value: 'U', attribute: 'ATTRIBUTE_INT' } },
    })),
  };
  const saved = structuredClone(character);
  const content = {
    ...emptyContent,
    items: [ownerSeed],
    abilityBlocks: [selectedRepository],
    defaultSources: { PAGE: [1, 3, 7, 16], INFO: [1, 3, 7, 16] },
  };
  engine.setFixtures([
    { table: 'ability_block', row: selectedRepository },
    { table: 'item', row: ownerSeed },
  ]);
  const result = await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-SHEET' });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(character, saved);
  return result;
}

/** Instrument only the existing content-button boundary; compile the actual recursive renderer and selector unchanged. */
async function buildSelectionUi() {
  const path = new URL('../src/pages/character_builder/CharBuilderCreation.tsx', import.meta.url);
  const source = await readFile(path, 'utf8');
  const ast = ts.createSourceFile(path.pathname, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set(['DisplayOperationResult', 'OperationResultSelector']);
  const functions = ast.statements.filter((node) => ts.isFunctionDeclaration(node) && names.has(node.name?.text));
  assert.equal(functions.length, 2);
  const loadAst = async (relative) => {
    const url = new URL(relative, import.meta.url);
    return ts.createSourceFile(
      url.pathname,
      await readFile(url, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
  };
  const drawerAst = await loadAst('../src/drawers/types/CreatureDrawer.tsx');
  const utilsAst = await loadAst('../src/process/operations/operation-utils.ts');
  const typesAst = await loadAst('../src/utils/type-fixing.ts');
  const declaration = (file, name) =>
    file.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  const localDeclaration = (file, owner, name) =>
    declaration(file, owner)
      .body.statements.filter(ts.isVariableStatement)
      .find((statement) => statement.declarationList.declarations.some((node) => node.name.getText(file) === name))
      .getText(file);
  const creatureRenderer = declaration(drawerAst, 'CreatureOperationResults').getText(drawerAst);
  const prefixMapping = declaration(utilsAst, 'convertKeyToBasePrefix').getText(utilsAst);
  const stateAction = declaration(typesAst, 'setStateActionToValue').getText(typesAst);
  const creatureCallbacks = ['setCreatureInstant', 'saveSelectionChange', 'clearSelections']
    .map((name) => localDeclaration(drawerAst, 'CreatureDrawerContent', name))
    .join('\n');
  const pcCallback = localDeclaration(ast, 'LevelSection', 'saveSelectionChange');
  const directory = await mkdtemp(join(tmpdir(), 'wg-repository-ui-'));
  try {
    const result = await build({
      absWorkingDir: new URL('..', import.meta.url).pathname,
      stdin: {
        contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server';
        const isTruthy=(value)=>!!value; const hasOperationSelection=(result)=>!!result?.selection || (result?.result?.results??[]).some(hasOperationSelection);
        const Stack=({children})=>React.createElement('div',null,children); const ResultWrapper=Stack;
        let buttons=[]; const SelectContentButton=(props)=>{buttons.push(props);return React.createElement('button',null,props.options.overrideLabel);};
        ${functions.map((node) => node.getText(ast)).join('\n')}
        const throwError=(message)=>{throw new Error(message);};
        ${prefixMapping}
        ${stateAction}
        ${creatureRenderer}
        export function creatureCallbacks(creature,updateCreature,setCreature,clearSelectionPaths){const props={data:{updateCreature}};${creatureCallbacks};return{saveSelectionChange,clearSelections};}
        export function pcCallback(setCharacter){${pcCallback};return saveSelectionChange;}
        export function renderCreature(operationResults,creature,onSaveChanges,onClearSelections){buttons=[];renderToStaticMarkup(React.createElement(CreatureOperationResults,{operationResults,creature,onSaveChanges,onClearSelections}));return buttons;}
        export function render(results,onChange,onClearSelections){buttons=[];renderToStaticMarkup(React.createElement(DisplayOperationResult,{results,onChange,onClearSelections}));return buttons;}
      `,
        resolveDir: new URL('..', import.meta.url).pathname,
        loader: 'tsx',
      },
      bundle: true,
      write: false,
      platform: 'node',
      format: 'esm',
      jsx: 'automatic',
      banner: { js: "import {createRequire} from 'node:module'; const require=createRequire(import.meta.url);" },
    });
    const module = join(directory, 'ui.mjs');
    await writeFile(module, result.outputFiles[0].text);
    return {
      ...(await import(pathToFileURL(module).href)),
      cleanup: () => rm(directory, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

test('only nine explicit alias fields change; every original operation, option and saved UUID remains', () => {
  assert.deepEqual(spec, JSON.parse(release.split('$repository$')[1]));
  assert.equal(patch.adjusted, 9);
  const restored = structuredClone(patch.after);
  for (const [tier, choices] of tiers.entries())
    for (const [slot, op] of choices.entries()) {
      validateSelectionAliases(op);
      OperationSchema.parse(op);
      assert.equal(op.id, patch.before[tier].data.trueOperations[slot].id);
      assert.deepEqual(new Set([op.id, ...op.data.selectionAliases]), new Set(tiers.map((ops) => ops[slot].id)));
      delete restored[tier].data.trueOperations[slot].data.selectionAliases;
    }
  assert.deepEqual(restored, patch.before);
  AbilityBlockSchema.parse(repository);
  assert.equal(repository.meta_data.source.url, 'https://2e.aonprd.com/Relics.aspx?ID=174');
});

test('each of all nine saved keys follows ascending and descending rank boundaries and reload without saved-key migration', async () => {
  for (const savedTier of [0, 1, 2]) {
    const selections = makeSelections(savedTier);
    for (const level of [1, 8, 9, 16, 17, 20, 17, 16, 9, 8, 1]) {
      const result = await calculate(level, JSON.parse(JSON.stringify(selections)));
      const rank = level < 9 ? 'T' : level < 17 ? 'E' : 'M';
      assert.deepEqual(
        loreNames.map((name) => result.store.variables[name].value.value),
        [rank, rank, rank]
      );
      const results = selectedResults(result);
      assert.equal(results.length, 3);
      assert.deepEqual(
        results.map((r) => r.selection.id),
        tiers[savedTier].map((op) => op.id)
      );
      for (const r of results) OperationResultSchema.parse(r);
    }
  }
});

test('primary conflicting choice wins, then authored sibling order; empty primary never resurrects stale peers', () => {
  const parent = { value: null, children: {} };
  for (const tier of [0, 1, 2]) {
    const op = tiers[tier][0];
    parent.children = Object.fromEntries(
      tiers.map((ops, index) => [ops[0].id, { value: `LORE_${index}`, children: {} }])
    );
    assert.equal(engine.resolveSelectionNode(parent, op).id, op.id);
    for (const value of ['', null]) {
      parent.children[op.id].value = value;
      assert.equal(engine.resolveSelectionNode(parent, op).node.value, value);
    }
    delete parent.children[op.id];
    assert.equal(engine.resolveSelectionNode(parent, op).id, op.data.selectionAliases[0]);
    delete parent.children[op.data.selectionAliases[0]];
    assert.equal(engine.resolveSelectionNode(parent, op).id, op.data.selectionAliases[1]);
  }
});

test('actual nested selector clears same-parent peer keys once, preserves other slots/owners and edits the resolved saved identity', async () => {
  const result = await calculate(17, makeSelections(0));
  const results = result.ors.itemResults[0].baseResults;
  const persisted = {
    ...makeSelections(0),
    ...makeSelections(1),
    ...makeSelections(2),
    ...makeSelections(0, 'item-other_grant'),
    untouched: 'keep',
  };
  const local = structuredClone(persisted);
  let saved = structuredClone(persisted);
  const publishes = [];
  const queued = [];
  const buttons = ui.render(
    results,
    (path, value) => {
      saved[`item-${seed.id}_${path}`] = value;
    },
    (paths) => {
      const fullPaths = paths.map((path) => `item-${seed.id}_${path}`);
      const updater = (previous) => engine.clearSelectionPaths(fullPaths, previous);
      saved = updater(saved);
      publishes.push(structuredClone(saved));
      queued.push(updater);
    }
  );
  assert.equal(buttons.length, 3);
  buttons[0].onClick({ _select_uuid: 'SKILL_LORE_REPLACEMENT' });
  assert.equal(saved[`${prefix}_${tiers[0][0].id}`], 'SKILL_LORE_REPLACEMENT');
  buttons[0].onClear();
  assert.equal(publishes.length, 1);
  let queuedLocal = local;
  for (const updater of queued) queuedLocal = updater(queuedLocal);
  for (const ops of tiers) assert.ok(!Object.hasOwn(saved, `${prefix}_${ops[0].id}`));
  for (const ops of tiers) for (const slot of [1, 2]) assert.equal(saved[`${prefix}_${ops[slot].id}`], loreNames[slot]);
  for (const op of tiers[0]) assert.equal(saved[`item-other_grant_${op.id}`], loreNames[tiers[0].indexOf(op)]);
  assert.equal(saved.untouched, 'keep');
  assert.deepEqual(publishes[0], saved);
  // Editing occurs through its own functional update before the following clear.
  queuedLocal[`${prefix}_${tiers[0][0].id}`] = 'SKILL_LORE_REPLACEMENT';
  queuedLocal = queued[0](queuedLocal);
  assert.deepEqual(queuedLocal, saved);
  const cleared = await calculate(9, saved);
  assert.equal(cleared.store.variables[loreNames[0]].value.value, 'U');
  assert.equal(cleared.store.variables[loreNames[1]].value.value, 'E');
});

test('unopted selectors keep their original single clear callback and never inspect an unauthored peer', () => {
  const op = structuredClone(tiers[0][0]);
  delete op.data.selectionAliases;
  const parent = { value: null, children: { [tiers[1][0].id]: { value: 'stale', children: {} } } };
  assert.deepEqual(engine.resolveSelectionNode(parent, op), { id: op.id, node: undefined });
  const calls = [];
  let batches = 0;
  ui.render(
    [{ selection: { id: op.id, title: 'Ordinary', options: [] } }],
    (...args) => calls.push(args),
    () => batches++
  )[0].onClear();
  assert.deepEqual(calls, [[op.id, '']]);
  assert.equal(batches, 0);
});

test('all three actual creature owner-prefix wrappers publish complete alias deletion once and queue the same functional state', () => {
  const selection = {
    selection: {
      id: tiers[0][0].id,
      aliases: [tiers[0][0].id, tiers[1][0].id, tiers[2][0].id],
      title: 'Lore',
      options: [],
    },
  };
  const nested = [
    {
      selection: { id: 'grant-parent', options: [] },
      result: { source: { _select_uuid: 'option-parent' }, results: [selection] },
    },
  ];
  // The outer node's empty options is a button boundary as well; target the inner Lore control.
  const operationResults = {
    creatureResults: nested,
    abilityResults: [{ baseSource: { id: 9902411, level: 1 }, baseResults: nested }],
    itemResults: [{ baseSource: { id: seed.id, level: 1 }, baseResults: nested }],
  };
  const owners = ['creature', 'ability-9902411', `item-${seed.id}`];
  const path = (owner, uuid) => `${owner}_grant-parent_option-parent_${uuid}`;
  const allSelections = {
    untouched: 'keep',
    ...Object.fromEntries(owners.flatMap((owner) => tiers.map((tier) => [path(owner, tier[0].id), 'LORE_SAVED']))),
  };
  for (const owner of owners) {
    const original = {
      id: 9902412,
      level: 10,
      details: { untouched: true },
      operation_data: { selections: structuredClone(allSelections), untouched: 'operation sibling' },
    };
    const publishes = [];
    const queued = [];
    const callbacks = ui.creatureCallbacks(
      original,
      (saved) => publishes.push(saved),
      (updater) => queued.push(updater),
      engine.clearSelectionPaths
    );
    const buttons = ui.renderCreature(
      operationResults,
      original,
      callbacks.saveSelectionChange,
      callbacks.clearSelections
    );
    const lore = buttons.filter((button) => button.options.overrideLabel === 'Lore');
    assert.equal(lore.length, 3);
    lore[owners.indexOf(owner)].onClear();
    assert.equal(publishes.length, 1);
    assert.equal(queued.length, 1);
    assert.equal(typeof queued[0], 'function');
    const expected = { ...allSelections };
    for (const tier of tiers) delete expected[path(owner, tier[0].id)];
    assert.deepEqual(publishes[0].operation_data.selections, expected);
    assert.deepEqual(queued[0](structuredClone(original)), publishes[0]);
    assert.equal(publishes[0].operation_data.untouched, 'operation sibling');
    assert.deepEqual(publishes[0].details, original.details);
    assert.deepEqual(original.operation_data.selections, allSelections);
    assert.equal(queued[0](null), null);
  }
});

test('actual PC fallback clear queues functional updates so no peer key is resurrected by successive callbacks', () => {
  const current = {
    operation_data: {
      selections: { ...makeSelections(0), ...makeSelections(1), ...makeSelections(2), untouched: 'keep' },
      untouched: 'operation sibling',
    },
  };
  const queued = [];
  const save = ui.pcCallback((updater) => queued.push(updater));
  const choice = {
    selection: {
      id: tiers[0][0].id,
      aliases: [tiers[0][0].id, tiers[1][0].id, tiers[2][0].id],
      title: 'Lore',
      options: [],
    },
  };
  const button = ui.render([choice], (path, value) => save(`${prefix}_${path}`, value))[0];
  button.onClear();
  assert.equal(queued.length, 3);
  assert.ok(queued.every((updater) => typeof updater === 'function'));
  const next = queued.reduce((previous, updater) => updater(previous), structuredClone(current));
  for (const tier of tiers) assert.ok(!Object.hasOwn(next.operation_data.selections, `${prefix}_${tier[0].id}`));
  for (const tier of tiers)
    for (const slot of [1, 2])
      assert.equal(next.operation_data.selections[`${prefix}_${tier[slot].id}`], loreNames[slot]);
  assert.equal(next.operation_data.selections.untouched, 'keep');
  assert.equal(next.operation_data.untouched, 'operation sibling');
  assert.deepEqual(queued[0](null), null);
});

test('aliases fail closed for invalid IDs, repeated/self IDs, non-Lore kinds and transitive assumptions', () => {
  for (const mutate of [
    (op) => {
      op.data.selectionAliases = ['not-a-uuid'];
    },
    (op) => {
      op.data.selectionAliases = [op.id];
    },
    (op) => {
      op.data.selectionAliases = [tiers[1][0].id, tiers[1][0].id];
    },
    (op) => {
      op.data.optionType = 'SPELL';
    },
    (op) => {
      op.data.modeType = 'PREDEFINED';
    },
    (op) => {
      op.data.optionsFilters.group = 'SKILLS';
    },
  ]) {
    const op = structuredClone(tiers[0][0]);
    mutate(op);
    assert.throws(() => OperationSchema.parse(op));
    assert.throws(() => validateSelectionAliases(op));
  }
  const op = structuredClone(tiers[0][0]);
  op.data.selectionAliases = [tiers[1][0].id];
  const parent = {
    value: null,
    children: { [tiers[2][0].id]: { value: 'not-an-authored-direct-peer', children: {} } },
  };
  assert.equal(engine.resolveSelectionNode(parent, op).node, undefined);
});

test('the legal maximum of16 peer aliases plus the primary identity roundtrips the real worker packet parser; over-bound input/results fail closed', async () => {
  const expanded = structuredClone(repository);
  const op = expanded.operations[0].data.trueOperations[0];
  op.data.selectionAliases = Array.from(
    { length: 16 },
    (_, index) => `d2358fb5-aebc-4abd-9e25-${String(index).padStart(12, '0')}`
  );
  OperationSchema.parse(op);
  const result = await calculate(8, makeSelections(0), seed, {}, expanded);
  const choice = selectedResults(result)[0];
  assert.equal(choice.selection.aliases.length, 17);
  OperationResultDataSchema.parse(structuredClone(result));
  OperationResultDataSchema.parse(JSON.parse(JSON.stringify(result)));
  const originalWorker = globalThis.Worker;
  const originalWindow = globalThis.window;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let worker;
  class PacketWorker {
    constructor() {
      worker = this;
    }
    postMessage(request) {
      this.request = request;
    }
    terminate() {}
  }
  try {
    globalThis.Worker = PacketWorker;
    globalThis.window = { Worker: PacketWorker };
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { hardwareConcurrency: 1 } });
    const pending = engine.executeOperations({
      type: 'CHARACTER',
      data: {
        character: { ...summoner([]), level: 8, companions: { list: [] } },
        content: emptyContent,
        context: 'CHARACTER-SHEET',
      },
    });
    worker.onmessage({ data: { id: worker.request.id, status: 'success', data: structuredClone(result) } });
    const decoded = await pending;
    assert.equal(selectedResults({ ors: decoded })[0].selection.aliases.length, 17);
  } finally {
    globalThis.Worker = originalWorker;
    globalThis.window = originalWindow;
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
  }
  op.data.selectionAliases.push('d2358fb5-aebc-4abd-9e25-000000000016');
  assert.throws(() => OperationSchema.parse(op));
  assert.throws(() => validateSelectionAliases(op));
  choice.selection.aliases.push('d2358fb5-aebc-4abd-9e25-000000000016');
  assert.throws(() => OperationResultSchema.parse(choice));
});

test('formula and genuine nested-container operation gates do not create or rewrite Lore choices', async () => {
  const formula = await calculate(17, makeSelections(0), seed, { is_formula: true });
  assert.deepEqual(
    loreNames.map((name) => formula.store.variables[name].value.value),
    ['U', 'U', 'U']
  );
  const held = { ...structuredClone(seed), usage: 'held in 1 hand' };
  const available = await calculate(17, makeSelections(0), held);
  assert.deepEqual(
    loreNames.map((name) => available.store.variables[name].value.value),
    ['M', 'M', 'M']
  );
  const packed = await calculate(17, makeSelections(0), held, { in_container: true });
  assert.deepEqual(
    loreNames.map((name) => packed.store.variables[name].value.value),
    ['U', 'U', 'U']
  );
  const stowable = await calculate(17, makeSelections(0), { ...held, usage: 'stowed' }, { in_container: true });
  assert.deepEqual(
    loreNames.map((name) => stowable.store.variables[name].value.value),
    ['M', 'M', 'M']
  );
  const noGrant = { ...structuredClone(seed), operations: [] };
  const removed = await calculate(17, makeSelections(0), noGrant);
  assert.deepEqual(
    loreNames.map((name) => removed.store.variables[name].value.value),
    ['U', 'U', 'U']
  );
});

test('the actual editor preserves authored peers for Lore edits and removes unsupported metadata when intentionally changing the selection kind', async () => {
  const path = new URL('../src/common/operations/selection/SelectionOperation.tsx', import.meta.url);
  const source = await readFile(path, 'utf8');
  const ast = ts.createSourceFile(path.pathname, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = ast.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'SelectionOperation'
  );
  const route = component.body.statements
    .filter(ts.isVariableStatement)
    .flatMap((node) => [...node.declarationList.declarations])
    .find((node) => node.name.getText(ast) === 'routeChange');
  const compiled = ts.transpileModule(
    `export default function edit(props, change) { const routeChange = ${route.initializer.getText(ast)}; routeChange(change); }`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }
  ).outputText;
  const { default: edit } = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);
  const original = structuredClone(tiers[0][0]);
  let changed;
  const apply = (change) => {
    edit(
      {
        data: original.data,
        onChange: (data) => {
          changed = data;
        },
      },
      change
    );
    return { ...original, data: changed };
  };
  for (const change of [
    { title: 'Updated Lore title' },
    { optionsFilters: { ...original.data.optionsFilters, value: { value: 'E' } } },
  ]) {
    const result = apply(change);
    assert.deepEqual(result.data.selectionAliases, original.data.selectionAliases);
    OperationSchema.parse(result);
  }
  for (const change of [
    { optionType: 'SPELL' },
    { modeType: 'PREDEFINED' },
    { optionsFilters: { ...original.data.optionsFilters, group: 'SKILLS' } },
  ])
    assert.ok(!Object.hasOwn(apply(change).data, 'selectionAliases'));
  assert.deepEqual(original, tiers[0][0]);
});

test('migration and release require exact complete operations, identity, all source configuration and pending-queue routes', () => {
  const body = migration.split('$repository$')[2];
  assert.match(body, /lock table public\.content_update in share mode/);
  assert.ok(body.indexOf('public.ability_block where id') < body.indexOf('public.content_source s'));
  assert.match(body, /owner baseline drift/);
  assert.match(body, /unreviewed operation graph/);
  assert.match(body, /captured CAS failed/);
  assert.match(body, /immediate readback drift/);
  assert.match(body, /final owner readback drift/);
  assert.match(body, /final pending content requires review/);
  assert.match(body, /coalesce\(u.status->>'state','PENDING'\) not in \('APPROVED','REJECTED'\)/);
  for (const sql of [body, release]) {
    assert.match(sql, /lower\(btrim\(u\.data->>'name'\)\)=lower\(btrim\(s->>'name'\)\)/);
    assert.match(sql, /lower\(btrim\(u\.data->>'name'\)\)=lower\(btrim\(p#>>'\{anchor,name\}'\)\)/);
    assert.match(sql, /u\.ref_id=\(p->>'id'\)::bigint/);
    assert.match(sql, /u\.data->>'uuid'=p#>>'\{anchor,uuid\}'/);
    assert.match(sql, /u\.content_source_id=\(p#>>'\{anchor,content_source_id\}'\)::bigint/);
  }
  assert.match(release, /\) is true/);
});
