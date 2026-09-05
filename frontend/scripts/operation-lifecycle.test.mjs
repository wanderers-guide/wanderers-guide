import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { content, summoner, inventoryItem } from './fixtures/eidolon.mjs';

let engine;
let results;
let creatureResults;
let workers;
let failConstructor;
let failPost;
const originalWindow = globalThis.window;
const originalWorker = globalThis.Worker;
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const character = (level = 1) => ({ ...summoner(), level, companions: { list: [] } });
const execution = (level = 1) => ({
  type: 'CHARACTER',
  data: { character: character(level), content, context: 'CHARACTER-SHEET' },
});
const creature = (id) => ({ type: 'CREATURE', data: { id, creature: {}, content } });
const flush = () => new Promise((resolve) => queueMicrotask(resolve));
const level = () => engine.getVariable('CHARACTER', 'LEVEL').value;
class TestWorker {
  requests = [];
  terminated = false;
  constructor() {
    if (failConstructor) throw new Error('Worker bootstrap failed');
    workers.push(this);
  }
  postMessage(message) {
    if (failPost) throw new Error('DataCloneError');
    this.requests.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  reply(data, id = this.requests.at(-1).id) {
    this.onmessage({ data: { id, status: 'success', data } });
  }
}

beforeEach(async () => {
  workers = [];
  failConstructor = false;
  failPost = false;
  globalThis.Worker = TestWorker;
  globalThis.window = { Worker: TestWorker };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { hardwareConcurrency: 1 } });
  engine = await createOperationEngine();
  // Generate response packets using the actual controller and variable store.
  results = [];
  for (const value of [1, 9]) results.push(await engine._executeCharacterOperations(execution(value).data));
  creatureResults = [];
  for (const value of [1, 9])
    creatureResults.push(
      await engine._executeCreatureOperations({
        id: 'fixture',
        creature: { name: 'Test creature', level: value, operations: [] },
        content,
        charStore: results[0].store,
      })
    );
  engine.importVariableStore('CHARACTER', results[0].store);
});
afterEach(async () => {
  await engine?.cleanup();
  globalThis.window = originalWindow;
  globalThis.Worker = originalWorker;
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  else delete globalThis.navigator;
});

test('real concurrent controllers return independent stores', async () => {
  const actual = await Promise.all([1, 9].map((value) => engine._executeCharacterOperations(execution(value).data)));
  assert.deepEqual(
    actual.map((result) => result.store.variables.LEVEL.value),
    [1, 9]
  );
});

test('a replaced request cannot import its store or report its old errors', async () => {
  const old = engine.executeOperations(execution());
  const rejected = assert.rejects(old, { name: 'AbortError' });
  const staleWorker = workers[0];
  const current = engine.executeOperations(execution(9));
  assert.equal(staleWorker.terminated, true);
  staleWorker.reply({ ...results[0], errors: ['Obsolete calculation'] });
  workers.at(-1).reply(results[1]);
  await Promise.all([rejected, current]);
  assert.equal(level(), 9);
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
});

test('abort and late completion preserve the last committed store', async () => {
  const controller = new AbortController();
  const pending = engine.executeOperations(execution(9), { signal: controller.signal });
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  controller.abort();
  workers[0].reply(results[1]);
  await rejected;
  assert.equal(level(), 1);
});

for (const failure of ['bootstrap', 'post', 'runtime', 'decode', 'malformed', 'controller']) {
  test(`${failure} failure releases the request and permits the identical calculation to retry`, async () => {
    failConstructor = failure === 'bootstrap';
    failPost = failure === 'post';
    const pending = engine.executeOperations(execution(9));
    const rejected = assert.rejects(pending);
    const worker = workers.at(-1);
    if (failure === 'runtime') worker.onerror({ preventDefault() {} });
    if (failure === 'decode') worker.onmessageerror();
    if (failure === 'malformed') worker.reply({ store: null });
    if (failure === 'controller')
      worker.onmessage({ data: { id: worker.requests.at(-1).id, status: 'error', message: 'Invalid operation' } });
    await rejected;
    assert.equal(level(), 1);
    failConstructor = false;
    failPost = false;
    const retried = engine.executeOperations(execution(9));
    workers.at(-1).reply(results[1]);
    await retried;
    assert.equal(level(), 9);
  });
}

test('deadline terminates a stuck worker and retry gets a new worker', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = engine.executeOperations(execution(9));
  const rejected = assert.rejects(pending, /too long/);
  t.mock.timers.tick(60_000);
  await rejected;
  assert.equal(workers[0].terminated, true);
  assert.equal(level(), 1);
  const retry = engine.executeOperations(execution(9));
  workers.at(-1).reply(results[1]);
  await retry;
  assert.equal(level(), 9);
});

test('workers run one job at a time and cancellation removes queued work', async () => {
  const active = engine.executeOperations(creature('a'));
  const controller = new AbortController();
  const queued = engine.executeOperations(creature('b'), { signal: controller.signal });
  const rejected = assert.rejects(queued, { name: 'AbortError' });
  assert.equal(workers.length, 1);
  assert.equal(workers[0].requests.length, 1);
  controller.abort();
  workers[0].reply(creatureResults[0]);
  await Promise.all([active, rejected]);
  await flush();
  assert.equal(workers[0].requests.length, 1);
  const next = engine.executeOperations(creature('c'));
  assert.equal(workers[0].requests.length, 2);
  workers[0].reply(creatureResults[1]);
  await next;
  assert.equal(engine.getVariable('c', 'LEVEL').value, 9);
});

test('a character change retries running, queued and newly requested companions against its committed snapshot', async () => {
  const active = engine.executeOperations(creature('a'));
  const queued = engine.executeOperations(creature('b'));
  const obsolete = workers[0];
  const current = engine.executeOperations(execution(9));
  const newlyOpened = engine.executeOperations(creature('c'));
  assert.equal(obsolete.terminated, true);
  obsolete.reply(creatureResults[0]);
  workers.at(-1).reply(results[1]);
  await current;
  const ids = [];
  for (let i = 0; i < 3; i++) {
    await flush();
    const request = workers.at(-1).requests.at(-1);
    ids.push(request.execution.data.id);
    assert.equal(request.charStore.variables.LEVEL.value, 9);
    workers.at(-1).reply(creatureResults[0]);
  }
  await Promise.all([active, queued, newlyOpened]);
  assert.deepEqual(ids.sort(), ['a', 'b', 'c']);
});

test('waiting companions reject on navigation or their own supersession', async () => {
  const current = engine.executeOperations(execution(9));
  const controller = new AbortController();
  const navigated = engine.executeOperations(creature('a'), { signal: controller.signal });
  const old = engine.executeOperations(creature('b'));
  const rejected = [assert.rejects(navigated, { name: 'AbortError' }), assert.rejects(old, { name: 'AbortError' })];
  const replacement = engine.executeOperations(creature('b'));
  controller.abort();
  await Promise.all(rejected);
  assert.equal(workers[0].requests.length, 1);
  workers[0].reply(results[1]);
  await current;
  await flush();
  assert.equal(workers[0].requests.at(-1).execution.data.id, 'b');
  workers[0].reply(creatureResults[0]);
  await replacement;
});

test('parent failure releases waiting companions immediately and a later successful parent permits retry', async () => {
  const current = engine.executeOperations(execution(9));
  const parentRejected = assert.rejects(current, /worker failed/);
  const companion = engine.executeOperations(creature('a'));
  const childRejected = assert.rejects(companion, /character calculation failed/);
  workers[0].onerror({ preventDefault() {} });
  await Promise.all([parentRejected, childRejected]);
  const retry = engine.executeOperations(execution(9));
  const companionRetry = engine.executeOperations(creature('a'));
  workers.at(-1).reply(results[1]);
  await retry;
  await flush();
  workers.at(-1).reply(creatureResults[0]);
  await companionRetry;
});

test('a waiting companion captures character effects applied by the completion caller', async () => {
  const current = engine.executeOperations(execution(9)).then(() => {
    engine.setVariable('CHARACTER', 'ATTRIBUTE_STR', { value: 4 });
  });
  const companion = engine.executeOperations(creature('a'));
  workers[0].reply(results[1]);
  await current;
  await flush();
  assert.equal(workers[0].requests.at(-1).charStore.variables.ATTRIBUTE_STR.value.value, 4);
  workers[0].reply(creatureResults[0]);
  await companion;
});

test('a valid packet for the wrong entity cannot be committed', async () => {
  const companion = engine.executeOperations(creature('a'));
  const rejected = assert.rejects(companion, /wrong entity type/);
  workers[0].reply(results[0]);
  await rejected;
  assert.equal(workers[0].terminated, true);
});

test('runtime response schemas accept rich actual character and creature packets from official item operations', async () => {
  const rows = await readContentRows([14361, 16286, 7096].map((id) => ({ table: 'item', id })));
  const items = rows.map(({ row }) => row);
  const packageContent = { ...content, items };
  const characterData = {
    character: {
      ...character(),
      inventory: {
        ...character().inventory,
        items: items.map((item) => inventoryItem(item, { is_equipped: true, is_invested: true })),
      },
    },
    content: packageContent,
    context: 'CHARACTER-SHEET',
  };
  const characterPacket = await engine._executeCharacterOperations(characterData);
  assert.equal(characterPacket.ors.itemResults.length, 3);
  const current = engine.executeOperations({ type: 'CHARACTER', data: characterData });
  workers[0].reply(characterPacket);
  const characterResult = await current;
  assert.deepEqual(
    characterResult.itemResults.map((result) => result.baseSource.id),
    items.map((item) => item.id)
  );
  const creatureData = {
    id: 'companion',
    creature: { name: 'Test creature', level: 1, operations: [], inventory: characterData.character.inventory },
    content: packageContent,
  };
  const creaturePacket = await engine._executeCreatureOperations({ ...creatureData, charStore: characterPacket.store });
  const companion = engine.executeOperations({ type: 'CREATURE', data: creatureData });
  workers[0].reply(creaturePacket);
  const creatureResult = await companion;
  assert.deepEqual(
    creatureResult.itemResults.map((result) => result.baseSource.id),
    items.map((item) => item.id)
  );
});

test('Elf ancestry and Acolyte backgrounds preserve generated feat descriptors through the worker protocol', async () => {
  const rows = await readContentRows([
    { table: 'ancestry', id: 3 },
    { table: 'background', id: 725 },
    { table: 'background', id: 1663 },
    { table: 'ability_block', id: 19330 },
    { table: 'ability_block', id: 20599 },
    { table: 'ability_block', id: 46748 },
    { table: 'trait', id: 1348 },
    { table: 'trait', id: 2399 },
    { table: 'language', id: 81 },
    { table: 'language', id: 84 },
  ]);
  engine.setFixtures(rows);
  const ofType = (table) => rows.filter((entry) => entry.table === table).map((entry) => entry.row);
  const packageContent = {
    ...content,
    ancestries: ofType('ancestry'),
    backgrounds: ofType('background'),
    abilityBlocks: ofType('ability_block'),
    traits: ofType('trait'),
    languages: ofType('language'),
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
  };
  for (const background of packageContent.backgrounds) {
    const data = {
      character: { ...character(), details: { ancestry: { id: 3 }, background: { id: background.id } } },
      content: packageContent,
      context: 'CHARACTER-BUILDER',
    };
    const packet = await engine._executeCharacterOperations(data);
    const generated = packet.ors.ancestrySectionResults.find((section) => section.baseSource.name === 'Elf Feat');
    assert.ok(generated);
    assert.equal(generated.baseSource.frequency, undefined, 'Generated sections are not full database rows');
    const pending = engine.executeOperations({ type: 'CHARACTER', data });
    workers.at(-1).reply(packet);
    const result = await pending;
    assert.deepEqual(
      result.ancestrySectionResults.find((section) => section.baseSource.name === 'Elf Feat'),
      generated
    );
  }
});

test('computed descriptor support still rejects malformed variable stores and operation result trees', async () => {
  const invalidStore = structuredClone(results[0]);
  invalidStore.store.variables.LEVEL.value = 'not a number';
  const invalidTree = structuredClone(results[0]);
  invalidTree.ors.characterResults = [{ selection: { id: 'invalid', options: 'not an array' } }];
  for (const packet of [invalidStore, invalidTree]) {
    const pending = engine.executeOperations(execution(9));
    const rejected = assert.rejects(pending, /Invalid calculation response/);
    workers.at(-1).reply(packet);
    await rejected;
    assert.equal(level(), 1);
  }
});

test('parent retries share the original companion deadline', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const companion = engine.executeOperations(creature('a'));
  const rejected = assert.rejects(companion, /too long/);
  t.mock.timers.tick(40_000);
  const current = engine.executeOperations(execution(9));
  workers.at(-1).reply(results[1]);
  await current;
  await flush();
  t.mock.timers.tick(20_000);
  await rejected;
  assert.equal(workers.at(-1).terminated, true);
});

test('workerless execution serializes and commits only the newest result', async () => {
  const old = engine.executeOperations(execution(), { directExecution: true });
  const rejected = assert.rejects(old, { name: 'AbortError' });
  const current = engine.executeOperations(execution(9), { directExecution: true });
  await Promise.all([rejected, current]);
  assert.equal(level(), 9);
  const controller = new AbortController();
  const aborted = engine.executeOperations(execution(), { directExecution: true, signal: controller.signal });
  const abortRejected = assert.rejects(aborted, { name: 'AbortError' });
  controller.abort();
  await abortRejected;
  assert.equal(level(), 9);
});

test('a direct companion cannot restore over a newer worker character commit', async () => {
  const companion = engine.executeOperations(creature('direct-companion'), { directExecution: true });
  await flush();
  const current = engine.executeOperations(execution(9));
  workers.at(-1).reply(results[1]);
  await Promise.all([companion, current]);
  assert.equal(level(), 9);
});
