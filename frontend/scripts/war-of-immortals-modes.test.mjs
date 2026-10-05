import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const sourceIds = [1, 3, 256, 400];
const tables = {
  abilityBlocks: 'ability_block',
  classes: 'class',
  traits: 'trait',
  ancestries: 'ancestry',
  backgrounds: 'background',
  languages: 'language',
  items: 'item',
  spells: 'spell',
  archetypes: 'archetype',
  versatileHeritages: 'versatile_heritage',
};

let engine;
let content;
let firstMode;
let secondMode;
let selections;

before(async () => {
  const rows = await readContentRows(Object.values(tables).map((table) => ({ table, sourceIds })));
  content = Object.fromEntries(
    Object.entries(tables).map(([key, table]) => [
      key,
      rows.filter((entry) => entry.table === table).map((entry) => entry.row),
    ])
  );
  content.sources = (await readContentRows(sourceIds.map((id) => ({ table: 'content_source', id })))).map(
    (entry) => entry.row
  );
  content.classArchetypes = [];
  content.defaultSources = { PAGE: sourceIds, INFO: sourceIds };

  engine = await createOperationEngine();
  engine.setFixtures(rows);
  firstMode = content.abilityBlocks.find((row) => row.id === 39036);
  secondMode = content.abilityBlocks.find((row) => row.id === 39037);
  const apparitionAttunement = content.abilityBlocks.find((row) => row.id === 38684);
  const [first, second] = apparitionAttunement.operations;
  selections = {
    [`class-feature-${apparitionAttunement.id}_${first.id}`]: '38707',
    [`class-feature-${apparitionAttunement.id}_${second.id}`]: '38708',
  };
});

after(async () => {
  await engine?.cleanup();
});

function animist(activeModes, choices = selections) {
  return {
    id: 1,
    level: 1,
    hp_current: 20,
    details: { class: content.classes.find((row) => row.id === 148), conditions: [] },
    inventory: { items: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
    content_sources: { enabled: sourceIds },
    meta_data: { reset_hp: false, active_modes: activeModes },
    operation_data: { selections: choices },
    options: { custom_operations: true, ignore_bulk_limit: true },
    custom_operations: [],
  };
}

async function focusSpells(activeModes, choices = selections) {
  const result = await engine._executeCharacterOperations({
    character: animist(activeModes, choices),
    content,
    context: 'CHARACTER-SHEET',
  });
  assert.deepEqual(result.errors, []);
  return {
    granted: result.store.variables.MODE_IDS.value,
    spells: (result.store.variables.SPELL_DATA?.value ?? [])
      .map((entry) => JSON.parse(entry))
      .filter((entry) => entry.type === 'FOCUS')
      .map((entry) => entry.spellId),
  };
}

test('switching primary apparition preserves unrelated active modes', () => {
  const first = engine.labelToVariable(firstMode.name);
  const second = engine.labelToVariable(secondMode.name);
  const rage = content.abilityBlocks.find((row) => row.id === 31008);
  const rageName = engine.labelToVariable(rage.name);
  assert.deepEqual(engine.toggleActiveMode(content.abilityBlocks, [rageName, first], secondMode), [rageName, second]);
  assert.deepEqual(engine.toggleActiveMode(content.abilityBlocks, [rageName, second], secondMode), [rageName]);
  assert.deepEqual(engine.toggleActiveMode(content.abilityBlocks, [rageName], firstMode), [rageName, first]);
});

test('numbered modes toggle and execute independently while saved word-based modes retain their keys', () => {
  const modes = [1, 2, 3, 4].map((number) => ({
    ...firstMode,
    id: 90000 + number,
    name: `Cursebound ${number}`,
    traits: [],
  }));
  const active = engine.toggleActiveMode(modes, ['RAGE'], modes[1]);
  assert.deepEqual(active, ['RAGE', 'CURSEBOUND_2']);
  assert.deepEqual(
    engine
      .getExecutableModes(
        modes,
        active,
        modes.map((mode) => String(mode.id))
      )
      .map((mode) => mode.id),
    [90002]
  );
  const twoActive = engine.toggleActiveMode(modes, active, modes[3]);
  assert.deepEqual(twoActive, ['RAGE', 'CURSEBOUND_2', 'CURSEBOUND_4']);
  assert.deepEqual(engine.toggleActiveMode(modes, twoActive, modes[1]), ['RAGE', 'CURSEBOUND_4']);
  assert.deepEqual(
    engine.toggleActiveMode([{ ...modes[0], name: 'Cursebound One' }], ['CURSEBOUND_ONE'], {
      ...modes[0],
      name: 'Cursebound One',
    }),
    []
  );
});

test('legacy numbered mode keys preserve the formerly active set, then allow individual toggles', () => {
  const modes = [1, 2, 3, 4].map((number) => ({
    ...firstMode,
    id: 90000 + number,
    name: `Cursebound ${number}`,
    traits: [],
  }));
  const active = engine.toggleActiveMode(modes, ['RAGE', 'CURSEBOUND_'], modes[1]);
  assert.deepEqual(active, ['RAGE', 'CURSEBOUND_1', 'CURSEBOUND_3', 'CURSEBOUND_4']);
  assert.deepEqual(
    engine.getExecutableModes(modes, active, ['90001', '90003']).map((mode) => mode.id),
    [90001, 90003]
  );
});

test('only one granted primary apparition contributes a vessel spell', async () => {
  const first = engine.labelToVariable(firstMode.name);
  const second = engine.labelToVariable(secondMode.name);
  const result = await focusSpells([first, second]);
  assert.deepEqual(
    result.granted.filter((id) => ['39036', '39037'].includes(id)),
    ['39036', '39037']
  );
  assert.deepEqual(result.spells, [7268]);
  assert.deepEqual((await focusSpells([second, first])).spells, [7269]);
});

test('stale ungranted apparition mode contributes no vessel spell', async () => {
  const first = engine.labelToVariable(firstMode.name);
  const second = engine.labelToVariable(secondMode.name);
  const attunement = content.abilityBlocks.find((row) => row.id === 38684);
  const choices = { [`class-feature-${attunement.id}_${attunement.operations[0].id}`]: '38707' };
  const result = await focusSpells([second], choices);
  assert.deepEqual(
    result.granted.filter((id) => ['39036', '39037'].includes(id)),
    ['39036']
  );
  assert.deepEqual(result.spells, []);
  assert.deepEqual((await focusSpells([first], choices)).spells, [7268]);
});

test('non-apparition modes can still coexist', () => {
  const rage = content.abilityBlocks.find((row) => row.id === 31008);
  const first = engine.labelToVariable(firstMode.name);
  const rageName = engine.labelToVariable(rage.name);
  assert.deepEqual(
    engine
      .getExecutableModes([rage, firstMode], [rageName, first], [String(rage.id), String(firstMode.id)])
      .map((mode) => mode.id),
    [rage.id, firstMode.id]
  );
});
