import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

let engine;
let mysticArmor;
let sweepRows;
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
  engine = await createOperationEngine({ renderBindingEditor: true, inspectInitialStats: true });
  mysticArmor = (await readContentRows([{ table: 'spell', sourceIds: [1, 3] }])).find(
    (entry) => entry.row.name === 'Mystic Armor'
  )?.row;
  assert.ok(mysticArmor, 'official Mystic Armor fixture exists');
  sweepRows = await readContentRows([
    { table: 'ability_block', sourceIds: [1, 3, 611] },
    { table: 'trait', sourceIds: [1, 3] },
    { table: 'class', id: 26 },
    { table: 'class_archetype', id: 23 },
    { table: 'ancestry', id: 8 },
  ]);
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

test('numeric conditions read the highest active mode bonus instead of the counter base', async () => {
  const modes = [1, 2, 3, 4].map((value) => ({
    id: 99000 + value,
    name: `Custom Curse ${value}`,
    type: 'mode',
    level: 1,
    traits: [],
    operations: [op(`counter-${value}`, 'addBonusToValue', { variable: 'CURSEBOUND', value, type: 'status' })],
  }));
  engine.setFixtures(modes.map((row) => ({ table: 'ability_block', row })));
  for (const [active, expected] of [
    [[], 0],
    [['CUSTOM_CURSE_1'], 0],
    [['CUSTOM_CURSE_2'], 5],
    [['CUSTOM_CURSE_1', 'CUSTOM_CURSE_3'], 5],
    [['CUSTOM_CURSE_4'], 5],
  ]) {
    const result = await engine._executeCharacterOperations({
      character: {
        id: 1,
        level: 17,
        details: {},
        inventory: { items: [] },
        operation_data: { selections: {} },
        meta_data: { active_modes: active },
        options: { custom_operations: true },
        custom_operations: [
          op('counter', 'createValue', { variable: 'CURSEBOUND', type: 'num', value: 0 }),
          op('dependent', 'conditional', {
            conditions: [
              { id: 'threshold', name: 'CURSEBOUND', type: 'num', operator: 'GREATER_THAN_OR_EQUALS', value: 2 },
            ],
            trueOperations: [op('bonus', 'adjValue', { variable: 'MAX_HEALTH_BONUS', value: 5 })],
          }),
          ...modes.map((mode) => op(`grant-${mode.id}`, 'giveAbilityBlock', { type: 'mode', abilityBlockId: mode.id })),
        ],
      },
      content: { ...content, abilityBlocks: modes },
      context: 'CHARACTER-SHEET',
    });
    assert.deepEqual(result.errors, []);
    assert.equal(result.store.variables.MAX_HEALTH_BONUS.value, expected);
  }
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

/** Walk rendered operation results, without treating catalog options as selected results. */
function collectSelections(value, selections = []) {
  if (!value || typeof value !== 'object') return selections;
  if (value.selection) selections.push(value.selection);
  for (const [key, child] of Object.entries(value)) {
    if (key !== 'selection' && key !== 'source' && key !== 'baseSource') collectSelections(child, selections);
  }
  return selections;
}

for (const name of ['Captain Dedication', 'Rogue Dedication', 'Fighter Dedication']) {
  test(`${name} retains conditional choices inside a Free Archetype selection`, async () => {
    engine.setFixtures(sweepRows);
    const feat = sweepRows.find((entry) => entry.table === 'ability_block' && entry.row.name === name)?.row;
    assert.ok(feat);
    const packageData = {
      ...content,
      abilityBlocks: sweepRows.filter((entry) => entry.table === 'ability_block').map((entry) => entry.row),
      traits: sweepRows.filter((entry) => entry.table === 'trait').map((entry) => entry.row),
    };
    const character = {
      id: 1,
      level: 2,
      details: {},
      inventory: { items: [] },
      variants: { free_archetype: true },
      operation_data: { selections: {} },
    };
    const calculate = () =>
      engine._executeCharacterOperations({ character, content: packageData, context: 'CHARACTER-BUILDER' });
    const first = await calculate();
    const feature = first.ors.classFeatureResults.find((entry) => entry.baseSource.name === 'Archetype Feat');
    assert.ok(feature);
    const outer = '9594307d-b111-437f-a55a-de101e8d46b1-2';
    const dedication = 'a525eb70-e18f-4a95-80d9-29f6aaee0d3e-2';
    const inner = '1c575456-4cb7-44eb-a153-9d6884b272a8-2';
    const prefix = `class-feature-${feature.baseSource.id}_${outer}`;
    character.operation_data.selections = {
      [prefix]: dedication,
      [`${prefix}_${dedication}_${inner}`]: String(feat.id),
    };
    const result = await calculate();
    assert.deepEqual(result.errors, []);
    assert.ok(result.store.variables.FEAT_NAMES.value.includes(name.toUpperCase()));
    const choices = collectSelections(result.ors);
    const skillChoices = choices.filter((selection) =>
      selection.options.some((option) => option.variable?.startsWith('SKILL_'))
    );
    assert.ok(
      skillChoices.some((selection) => selection.options.length === 2),
      'restricted skill choices are rendered'
    );
    if (name === 'Captain Dedication') {
      assert.ok(
        choices.some((selection) => selection.id === '3377df8d-5ddf-4d7c-9ff8-1d4fcdb2eb83'),
        'the conditional feat choice is also rendered'
      );
      assert.ok(
        result.store.variables.FEAT_NAMES.value.includes('DIRECT FOLLOWER'),
        'ordinary sibling grant still applies'
      );
    }
  });
}

test('Runelord replacement features appear in sheet and export collections', async () => {
  engine.setFixtures(sweepRows);
  const wizard = sweepRows.find((entry) => entry.table === 'class').row;
  const runelord = sweepRows.find((entry) => entry.table === 'class_archetype').row;
  const blocks = sweepRows.filter((entry) => entry.table === 'ability_block').map((entry) => entry.row);
  const character = {
    id: 1,
    hero_points: 1,
    level: 1,
    details: { class: wizard, class_archetype: runelord },
    inventory: { items: [] },
    operation_data: { selections: {} },
  };
  const result = await engine._executeCharacterOperations({
    character,
    content: { ...content, classes: [wizard], classArchetypes: [runelord], abilityBlocks: blocks },
    context: 'CHARACTER-SHEET',
  });
  assert.deepEqual(result.errors, []);
  const features = engine.collectEntityAbilityBlocks('CHARACTER', character, blocks).classFeatures;
  for (const adjustment of runelord.feature_adjustments) {
    assert.ok(features.some((feature) => feature.id === adjustment.data.id));
    assert.ok(!features.some((feature) => feature.id === adjustment.prev_id));
  }
  assert.equal(features.filter((feature) => feature.name === 'Arcane School').length, 1);
  assert.ok(features.some((feature) => feature.name === 'Personal Rune'));
});

test('Divine Breadth applies its conditional spell slot through Free Archetype', async () => {
  engine.setFixtures(sweepRows);
  const blocks = sweepRows.filter((entry) => entry.table === 'ability_block').map((entry) => entry.row);
  const feats = ['Cleric Dedication', 'Basic Cleric Spellcasting', 'Divine Breadth'].map((name) => {
    const feat = blocks.find((block) => block.name === name);
    assert.ok(feat);
    return feat;
  });
  const character = {
    id: 1,
    level: 8,
    details: {},
    inventory: { items: [] },
    variants: { free_archetype: true },
    operation_data: { selections: {} },
  };
  const calculate = () =>
    engine._executeCharacterOperations({
      character,
      content: { ...content, abilityBlocks: blocks },
      context: 'CHARACTER-SHEET',
    });
  const first = await calculate();
  for (const [index, level] of [2, 4, 8].entries()) {
    const feature = first.ors.classFeatureResults.find(
      (entry) => entry.baseSource.name === 'Archetype Feat' && entry.baseSource.level === level
    ).baseSource;
    const outer = feature.operations[0];
    const option = outer.data.optionsPredefined.find((entry) =>
      entry.title.includes(level === 2 ? 'Dedication' : 'Archetype')
    );
    const inner = option.operations.find((entry) => entry.type === 'select');
    const prefix = `class-feature-${feature.id}_${outer.id}`;
    character.operation_data.selections[prefix] = option.id;
    character.operation_data.selections[`${prefix}_${option.id}_${inner.id}`] = String(feats[index].id);
  }
  const result = await calculate();
  assert.deepEqual(result.errors, []);
  for (const feat of feats) assert.ok(result.store.variables.FEAT_IDS.value.includes(String(feat.id)));
  const slots = result.store.variables.SPELL_SLOTS.value.map((slot) => JSON.parse(slot));
  assert.equal(
    slots
      .filter((slot) => slot.lvl === 8 && slot.rank === 1 && slot.source === 'CLERIC')
      .reduce((sum, slot) => sum + slot.amt, 0),
    2
  );
});

test('inline class DC and feat names display their calculated values', () => {
  engine.setVariable('CHARACTER', 'LEVEL', 8);
  engine.setVariable('CHARACTER', 'ATTRIBUTE_STR', { value: 3, partial: false });
  engine.setVariable('CHARACTER', 'CLASS_DC', { value: 'T', attribute: 'ATTRIBUTE_STR', increases: 0 });
  engine.setVariable('CHARACTER', 'FEAT_NAMES', ['BATTLE MEDICINE', 'TOUGHNESS']);
  assert.equal(engine.compileExpressions('CHARACTER', '{{CLASS_DC}}'), '23');
  assert.equal(engine.compileExpressions('CHARACTER', '{{FEAT_NAMES}}'), 'BATTLE MEDICINE, TOUGHNESS');
  assert.equal(engine.compileExpressions('CHARACTER', "{{INCLUDES(FEAT_NAMES, 'Toughness') + 2}}"), '3');
  engine.setVariable('CHARACTER', 'FEAT_NAMES', []);
  assert.equal(engine.compileExpressions('CHARACTER', '{{FEAT_NAMES}}'), '');
});

test('explicit companion abilities appear once and separately granted feats remain visible', () => {
  const feats = sweepRows
    .filter((entry) => entry.table === 'ability_block' && entry.row.type === 'feat')
    .slice(0, 3)
    .map((entry) => entry.row);
  assert.equal(feats.length, 3);
  const creature = { id: 1, rarity: 'COMMON', abilities_base: [feats[0]], abilities_added: [feats[1].id] };
  engine.setVariable(
    'COMPANION',
    'FEAT_IDS',
    feats.map((feat) => String(feat.id))
  );
  const collected = Object.values(engine.collectEntityAbilityBlocks('COMPANION', creature, feats)).flat();
  for (const feat of feats) assert.equal(collected.filter((ability) => ability.id === feat.id).length, 1);
});

test('every Human free boost is grouped in the editable starting stats', () => {
  const human = sweepRows.find((entry) => entry.table === 'ancestry').row;
  const names = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map((name) => `ATTRIBUTE_${name}`);
  const details = { operationResults: [], characterState: [null, () => {}], primarySource: 'ancestry' };
  const boosts = engine.getStatBlockDisplay('CHARACTER', names, human.operations, 'READ/WRITE', details);
  const expected = human.operations.filter(
    (operation) => operation.type === 'select' && operation.data.optionsFilters?.group === 'ATTRIBUTE'
  );
  assert.equal(expected.length, 2);
  assert.deepEqual(new Set(boosts.map((boost) => boost.operation?.id)), new Set(expected.map((boost) => boost.id)));
  assert.equal(engine.getStatBlockDisplay('CHARACTER', names, human.operations, 'READ').length, 1);
  assert.equal(
    engine.getStatBlockDisplay('CHARACTER', names, human.operations, 'READ/WRITE', details, { onlyNegatives: true })
      .length,
    0
  );
});

test('same-named granted and base ancestry traits both retain their feats and heritages', async () => {
  const human = sweepRows.find((entry) => entry.table === 'ancestry').row;
  const secondaryTrait = {
    id: 90050,
    name: human.name,
    content_source_id: 3,
    meta_data: { ancestry_trait: true },
  };
  const ancestry = {
    ...human,
    operations: [op('additional-ancestry', 'giveTrait', { traitId: secondaryTrait.id })],
  };
  const blocks = [human.trait_id, secondaryTrait.id].flatMap((trait, index) =>
    ['feat', 'heritage'].map((type, offset) => ({
      id: 90100 + index * 2 + offset,
      name: `${type} for trait ${trait}`,
      type,
      level: 1,
      traits: [trait],
      operations: [],
      content_source_id: 3,
    }))
  );
  engine.setFixtures([
    { table: 'trait', row: secondaryTrait },
    ...blocks.map((row) => ({ table: 'ability_block', row })),
  ]);
  const result = await engine._executeCharacterOperations({
    character: { id: 1, level: 1, details: { ancestry }, inventory: { items: [] }, operation_data: { selections: {} } },
    content: { ...content, ancestries: [ancestry], abilityBlocks: blocks, traits: [secondaryTrait] },
    context: 'CHARACTER-BUILDER',
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(
    new Set(engine.getAllAncestryTraitVariables('CHARACTER').map((variable) => variable.value)),
    new Set([human.trait_id, secondaryTrait.id])
  );
  const options = collectSelections(result.ors).flatMap((selection) => selection.options);
  for (const block of blocks)
    assert.ok(options.some((option) => option.content?.id === block.id || option.id === block.id));
});
