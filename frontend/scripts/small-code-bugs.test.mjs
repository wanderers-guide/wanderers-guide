import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

let engine;
let mysticArmor;
const op = (id, type, data) => ({ id, type, data });
const content = {
  abilityBlocks: [],
  classes: [],
  ancestries: [],
  backgrounds: [],
  spells: [],
  items: [],
  traits: [],
  languages: [],
  archetypes: [],
  versatileHeritages: [],
  classArchetypes: [],
  sources: [],
  defaultSources: { INFO: [], PAGE: [] },
};
const condition = (id, name, value, operator = 'INCLUDES') => ({ id, type: 'list-str', name, value, operator });
const conditional = (id, check, bonus) =>
  op(id, 'conditional', {
    conditions: [check],
    trueOperations: [op(`${id}-hp`, 'adjValue', { variable: 'MAX_HEALTH_BONUS', value: bonus })],
  });
const numberedModes = [2, 3].map((number) => ({
  id: 90000 + number,
  name: `Cursebound ${number}`,
  type: 'mode',
  level: 1,
  traits: [],
  operations: [op(`mode-${number}-hp`, 'adjValue', { variable: 'MAX_HEALTH_BONUS', value: number })],
}));

before(async () => {
  engine = await createOperationEngine({ renderBindingEditor: true });
  mysticArmor = (await readContentRows([{ table: 'spell', sourceIds: [1, 3] }])).find(
    (entry) => entry.row.name === 'Mystic Armor'
  )?.row;
  assert.ok(mysticArmor, 'official Mystic Armor fixture exists');
});
after(async () => {
  await engine?.cleanup();
});
beforeEach(() => {
  engine.resetVariables();
  engine.clearDeferredOperations();
  engine.setFixtures([]);
});

async function calculateModes(activeModes, extra = []) {
  engine.setFixtures(numberedModes.map((row) => ({ table: 'ability_block', row })));
  return engine._executeCharacterOperations({
    character: {
      id: 1,
      level: 17,
      details: {},
      inventory: { items: [] },
      operation_data: { selections: {} },
      meta_data: { active_modes: activeModes },
      options: { custom_operations: true },
      custom_operations: [
        ...numberedModes.map((mode) =>
          op(`grant-${mode.id}`, 'giveAbilityBlock', { type: 'mode', abilityBlockId: mode.id })
        ),
        ...extra,
      ],
    },
    content: { ...content, abilityBlocks: numberedModes },
    context: 'CHARACTER-SHEET',
  });
}

test('saved numbered modes apply only their own effects and match numeric conditions precisely', async () => {
  const result = await calculateModes(
    ['CURSEBOUND_2'],
    [
      conditional('two-active', condition('two', 'ACTIVE_MODES', 'Cursebound 2'), 10),
      conditional('three-active', condition('three', 'ACTIVE_MODES', 'Cursebound 3'), 100),
      conditional('three-inactive', condition('not-three', 'ACTIVE_MODES', 'Cursebound 3', 'NOT_INCLUDES'), 20),
    ]
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.store.variables.MAX_HEALTH_BONUS.value, 32);
  assert.deepEqual(result.store.variables.ACTIVE_MODES.value, ['CURSEBOUND_2']);
});

test('legacy shared numeric keys retain prior active effects and removal leaves other numbered modes active', async () => {
  const legacy = await calculateModes(['CURSEBOUND_']);
  assert.deepEqual(legacy.errors, []);
  assert.equal(legacy.store.variables.MAX_HEALTH_BONUS.value, 5);
  assert.deepEqual(legacy.store.variables.ACTIVE_MODES.value, ['CURSEBOUND_2', 'CURSEBOUND_3']);
  const removed = await calculateModes(
    ['CURSEBOUND_2', 'CURSEBOUND_3'],
    [op('remove-two', 'removeAbilityBlock', { type: 'mode', abilityBlockId: 90002 })]
  );
  assert.deepEqual(removed.errors, []);
  assert.equal(removed.store.variables.MAX_HEALTH_BONUS.value, 3);
  assert.deepEqual(removed.store.variables.ACTIVE_MODES.value, ['CURSEBOUND_3']);
});

test('reopened companion bindings show every saved field without a character destination variable', () => {
  assert.ok(!engine.getVariable('CHARACTER', 'CHARACTER_FEAT_NAMES'));
  const saved = JSON.parse(
    JSON.stringify({ variable: 'CHARACTER_FEAT_NAMES', value: { storeId: 'CHARACTER', variable: 'FEAT_NAMES' } })
  );
  const html = engine.renderBindingEditor(saved.variable, saved.value);
  assert.match(html, /value="CHARACTER_FEAT_NAMES"/);
  assert.match(html, /value="CHARACTER"/);
  assert.match(html, /value="FEAT_NAMES"/);
});

test('a saved companion binding mirrors parent feats and its conditional responds after reload', async () => {
  const creature = JSON.parse(
    JSON.stringify({
      id: 123,
      name: 'Companion',
      level: 1,
      inventory: { items: [] },
      abilities_base: [],
      operations: [
        op('create', 'createValue', { variable: 'CHARACTER_FEAT_NAMES', type: 'list-str', value: [] }),
        op('bind', 'bindValue', {
          variable: 'CHARACTER_FEAT_NAMES',
          value: { storeId: 'CHARACTER', variable: 'FEAT_NAMES' },
        }),
        conditional('evolution', condition('has-evolution', 'CHARACTER_FEAT_NAMES', 'Advanced Weaponry'), 5),
      ],
    })
  );
  for (const [feats, expected] of [
    [['ADVANCED WEAPONRY'], 5],
    [[], 0],
  ]) {
    engine.setVariable('CHARACTER', 'FEAT_NAMES', feats);
    const result = await engine._executeCreatureOperations({
      id: 'COMPANION',
      creature,
      content,
      charStore: engine.exportVariableStore('CHARACTER'),
    });
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.store.variables.CHARACTER_FEAT_NAMES.value, feats);
    assert.equal(result.store.variables.MAX_HEALTH_BONUS.value, expected);
  }
});

test('a shared spell appears once per casting source and other sources cannot change its rank', () => {
  const id = mysticArmor.id;
  const entries = [
    { spell_id: id, source: 'Sorcerer', rank: 1 },
    { spell_id: id, source: 'Bard', rank: 1 },
    { spell_id: id, source: 'Bard', rank: 4 },
  ];
  assert.deepEqual(Object.keys(engine.getKnownSpellsByRank([id], [mysticArmor], entries, 'Sorcerer', 'SPONTANEOUS')), [
    '1',
  ]);
  const bard = engine.getKnownSpellsByRank([id], [mysticArmor], entries, 'Bard', 'SPONTANEOUS');
  assert.equal(bard['1'].length, 1);
  assert.equal(bard['4'].length, 1);
  assert.deepEqual(Object.keys(engine.getKnownSpellsByRank([id], [mysticArmor], entries, 'Sorcerer', 'PREPARED')), [
    '1',
  ]);
  const duplicate = engine.getKnownSpellsByRank(
    [id, id],
    [mysticArmor],
    [...entries, entries[0]],
    'Sorcerer',
    'SPONTANEOUS'
  );
  assert.equal(duplicate['1'].length, 1);
});

test('focus and ritual lists remain visible when the same spell is saved in a different source', () => {
  const entries = [{ spell_id: mysticArmor.id, source: 'Sorcerer', rank: 4 }];
  for (const type of ['FOCUS', 'RITUAL']) {
    const result = engine.getKnownSpellsByRank([mysticArmor.id], [mysticArmor], entries, undefined, type);
    assert.equal(result[mysticArmor.rank].length, 1);
  }
});
