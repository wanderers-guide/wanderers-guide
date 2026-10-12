import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { OperationSelectFiltersSpellSchema, OperationSchema } from '../src/schemas/operations.ts';
import { AbilityBlockSchema } from '../src/schemas/content.ts';
import { VariableStoreSchema } from '../src/schemas/variables.ts';
import { spellLibraryDraft } from './fixtures/tech-core-spell-library.mjs';

const source = 'TECHNOMANCER';
const cache = 'TECHNOMANCER_CACHE';
const dailyId = '6082549e-6035-451d-a2dd-f90766e54d55';
const expandedId = '5a22ab22-74b9-4658-b194-558c386668d4';
let engine;
let spells;
let content;
let cantripRow;

function selector(id = dailyId, dailyPreparation = true, rank = 1) {
  return {
    id,
    type: 'select',
    data: {
      title: 'Select a Spell',
      modeType: 'FILTERED',
      optionType: 'SPELL',
      optionsFilters: {
        id: 'dafc677e-8404-4a32-b15a-2400618034b1',
        type: 'SPELL',
        level: { min: rank, max: rank },
        knownSpellSource: source,
        ...(dailyPreparation ? { dailyPreparation: true } : {}),
        spellData: { type: 'NORMAL', castingSource: source, listSources: [cache] },
      },
    },
  };
}

function character(operations = []) {
  return {
    id: 9919500,
    level: 8,
    hp_current: 10,
    hp_temp: 0,
    details: {},
    inventory: { items: [] },
    companions: { list: [] },
    options: { custom_operations: true },
    custom_operations: [
      {
        id: 'fixture-casting',
        type: 'defineCastingSource',
        data: { variable: 'CASTING_SOURCES', value: `${source}:::PREPARED-LIST:::ARCANE:::ATTRIBUTE_INT` },
      },
      {
        id: 'fixture-slots',
        type: 'giveSpellSlot',
        data: { castingSource: source, spellListSource: cache, slots: [{ lvl: 8, rank: 1, amt: 1 }] },
      },
      ...operations,
    ],
    operation_data: { selections: {} },
    spells: {
      slots: [],
      list: spells.map((spell) => ({ spell_id: spell.id, rank: spell.rank, source })),
      innate_casts: [],
      focus_point_current: 0,
    },
  };
}

function findSelection(tree, id = dailyId) {
  if (!tree || typeof tree !== 'object') return undefined;
  if (tree.selection?.id === id) return tree;
  for (const child of Object.values(tree)) {
    const found = findSelection(child, id);
    if (found) return found;
  }
}

async function calculate(input) {
  const before = structuredClone(input);
  const results = await engine.executeOperations(
    { type: 'CHARACTER', data: { character: input, content, context: 'CHARACTER-SHEET' } },
    { directExecution: true }
  );
  assert.deepEqual(input, before);
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  return { results, casting: engine.collectEntitySpellcasting('CHARACTER', input) };
}

/** Exercise the existing Rest mutation without rewriting the caller's saved entity. */
function rest(input, id = 'CHARACTER') {
  const before = structuredClone(input);
  let rested;
  engine.handleRest(id, input, (next) => {
    rested = next;
  });
  assert.deepEqual(input, before);
  assert.ok(rested);
  return rested;
}

before(async () => {
  const rows = await readContentRows([
    { table: 'spell', id: 4656 },
    { table: 'trait', id: 1858 },
  ]);
  const original = rows.find(({ table }) => table === 'spell');
  const cantripTrait = rows.find(({ table }) => table === 'trait');
  cantripRow = cantripTrait;
  spells = [1, 1, 2, 0].map((rank, index) => ({
    ...structuredClone(original.row),
    id: 9919510 + index,
    name: `Daily Fixture Spell ${index}`,
    rank,
    ...(rank === 0 ? { traits: [cantripTrait.row.id] } : {}),
  }));
  engine = await createOperationEngine();
  engine.setFixtures([...spells.map((row) => ({ table: 'spell', row })), cantripTrait]);
  content = {
    abilityBlocks: [],
    items: [],
    classes: [],
    ancestries: [],
    backgrounds: [],
    languages: [],
    spells,
    traits: [cantripTrait.row],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    defaultSources: { PAGE: [original.row.content_source_id], INFO: [] },
  };
});
after(async () => engine?.cleanup());

test('daily Cache membership survives reload and expires on Rest without changing Expanded Cache', async () => {
  const input = character([selector(), selector(expandedId, false)]);
  const offered = await calculate(input);
  const daily = findSelection(offered.results).selection.options.find((option) => option.id === spells[0].id);
  input.operation_data.selections[`character_${dailyId}`] = daily._select_uuid;
  input.operation_data.selections[`character_${expandedId}`] = `${spells[1].id}:1`;
  input.spells.slots = [{ source, rank: 1, spell_list_source: cache, spell_id: spells[0].id, exhausted: true }];
  const loaded = JSON.parse(JSON.stringify(input));
  const current = await calculate(loaded);
  assert.deepEqual(
    current.casting.list
      .filter((entry) => entry.source === cache)
      .map((entry) => entry.spell_id)
      .sort(),
    [spells[0].id, spells[1].id]
  );
  assert.equal(current.casting.slots[0].spell_id, spells[0].id);
  let rested;
  engine.handleRest('CHARACTER', loaded, (next) => {
    rested = next;
  });
  const nextDay = await calculate(JSON.parse(JSON.stringify(rested)));
  assert.deepEqual(
    nextDay.casting.list.filter((entry) => entry.source === cache).map((entry) => entry.spell_id),
    [spells[1].id]
  );
  assert.equal(nextDay.casting.slots[0].spell_id, undefined);
  assert.equal(rested.spells.slots[0].spell_id, spells[0].id);
  assert.equal(rested.spells.slots[0].exhausted, false);
  assert.deepEqual(rested.spells.list, input.spells.list);
});

test('daily choices use castable ranks from their own casting source, not another caster', async () => {
  const input = character([
    selector(dailyId, true, 2),
    {
      id: 'other-slots',
      type: 'giveSpellSlot',
      data: { castingSource: 'OTHER', slots: [{ lvl: 8, rank: 2, amt: 1 }] },
    },
  ]);
  const unrelated = await calculate(input);
  assert.equal(findSelection(unrelated.results), undefined);
  input.custom_operations.push({
    id: 'own-slots',
    type: 'giveSpellSlot',
    data: { castingSource: source, slots: [{ lvl: 8, rank: 2, amt: 1 }] },
  });
  const own = await calculate(input);
  assert.deepEqual(
    findSelection(own.results).selection.options.map((option) => option.id),
    [spells[2].id]
  );
});

test('daily choices reject malformed and nonpositive slot amounts authored through adjValue', async () => {
  for (const amount of ['1', true, null, 0, -1]) {
    const slot = OperationSchema.parse({
      id: '1568d50d-691a-4a6d-9312-36adf375910b',
      type: 'adjValue',
      data: { variable: 'SPELL_SLOTS', value: JSON.stringify({ source, lvl: 8, rank: 1, amt: amount }) },
    });
    const input = character([slot, selector()]);
    input.custom_operations = input.custom_operations.filter((operation) => operation.type !== 'giveSpellSlot');
    assert.equal(findSelection((await calculate(input)).results), undefined, `slot amount ${JSON.stringify(amount)}`);
  }
});

test('daily choices accept positive finite numeric slot amounts authored through adjValue', async () => {
  for (const amount of [1, 1.5]) {
    const slot = OperationSchema.parse({
      id: '1568d50d-691a-4a6d-9312-36adf375910b',
      type: 'adjValue',
      data: { variable: 'SPELL_SLOTS', value: JSON.stringify({ source, lvl: 8, rank: 1, amt: amount }) },
    });
    const input = character([slot, selector()]);
    input.custom_operations = input.custom_operations.filter((operation) => operation.type !== 'giveSpellSlot');
    const options = findSelection((await calculate(input)).results).selection.options;
    assert.deepEqual(
      options.map((option) => option.id),
      [spells[0].id, spells[1].id]
    );
    input.operation_data.selections[`character_${dailyId}`] = options[0]._select_uuid;
    assert.deepEqual(
      (await calculate(input)).casting.list.filter((entry) => entry.source === cache),
      [{ spell_id: spells[0].id, rank: 1, source: cache }]
    );
  }
});

test('Rest invalidates daily membership immediately, before a stale calculation or picker can renew it', async () => {
  const input = character([selector()]);
  const offered = await calculate(input);
  const choice = findSelection(offered.results).selection.options[0]._select_uuid;
  input.operation_data.selections[`character_${dailyId}`] = choice;
  await calculate(input);
  let rested;
  engine.handleRest('CHARACTER', input, (next) => {
    rested = next;
  });
  assert.equal(
    engine.collectEntitySpellcasting('CHARACTER', rested).list.filter((entry) => entry.source === cache).length,
    0
  );
  rested.operation_data.selections[`character_${dailyId}`] = choice;
  assert.equal((await calculate(rested)).casting.list.filter((entry) => entry.source === cache).length, 0);
  const newOption = findSelection((await calculate(rested)).results).selection.options[0];
  assert.notEqual(newOption._select_uuid, choice);
  rested.operation_data.selections[`character_${dailyId}`] = newOption._select_uuid;
  assert.equal((await calculate(rested)).casting.list.filter((entry) => entry.source === cache).length, 1);
});

test('cantrips use their automatically heightened rank for the one-per-rank choice, retaining saved rank zero', async () => {
  const input = character([
    selector(dailyId, true, 4),
    {
      id: 'cantrip-slots',
      type: 'giveSpellSlot',
      data: { castingSource: source, slots: [{ lvl: 8, rank: 0, amt: 5 }] },
    },
  ]);
  const offered = await calculate(input);
  const options = findSelection(offered.results).selection.options;
  assert.deepEqual(
    options.map((option) => option.id),
    [spells[3].id]
  );
  input.operation_data.selections[`character_${dailyId}`] = options[0]._select_uuid;
  const selected = await calculate(input);
  assert.deepEqual(
    selected.casting.list.filter((entry) => entry.source === cache),
    [{ spell_id: spells[3].id, rank: 0, source: cache }]
  );
});

test('selected daily cantrips remain in Cache after leveling until Rest, without authorizing another owner', async () => {
  const nextRankId = '1e362173-7cf2-444d-adcc-50419329caf0';
  const input = character([
    selector(dailyId, true, 4),
    selector(nextRankId, true, 5),
    {
      id: 'cantrip-slots',
      type: 'giveSpellSlot',
      data: { castingSource: source, slots: [{ lvl: 8, rank: 0, amt: 5 }] },
    },
  ]);
  const choice = findSelection((await calculate(input)).results).selection.options[0]._select_uuid;
  input.operation_data.selections[`character_${dailyId}`] = choice;
  input.level = 9;
  for (const operation of input.custom_operations) {
    if (operation.type === 'giveSpellSlot') operation.data.slots.forEach((slot) => (slot.lvl = 9));
  }
  const saved = JSON.parse(JSON.stringify(input));
  assert.deepEqual(
    (await calculate(saved)).casting.list.filter((entry) => entry.source === cache),
    [{ spell_id: spells[3].id, rank: 0, source: cache }]
  );
  const copied = structuredClone(saved);
  copied.custom_operations = copied.custom_operations.filter((operation) => operation.id !== dailyId);
  copied.operation_data.selections[`character_${nextRankId}`] = choice;
  assert.equal((await calculate(copied)).casting.list.filter((entry) => entry.source === cache).length, 0);

  const unknown = structuredClone(saved);
  unknown.spells.list = unknown.spells.list.filter((entry) => entry.spell_id !== spells[3].id);
  assert.equal((await calculate(unknown)).casting.list.filter((entry) => entry.source === cache).length, 0);
  const unavailable = structuredClone(saved);
  unavailable.custom_operations = unavailable.custom_operations.filter((operation) => operation.id !== 'cantrip-slots');
  assert.equal((await calculate(unavailable)).casting.list.filter((entry) => entry.source === cache).length, 0);

  let rested;
  engine.handleRest('CHARACTER', saved, (next) => {
    rested = next;
  });
  const nextDay = await calculate(rested);
  assert.equal(nextDay.casting.list.filter((entry) => entry.source === cache).length, 0);
  assert.equal(findSelection(nextDay.results), undefined);
  assert.equal(findSelection(nextDay.results, nextRankId).selection.options[0].id, spells[3].id);
});

test('editing the same daily selector rank cannot reuse its previous cantrip choice', async () => {
  const input = character([
    selector(dailyId, true, 4),
    {
      id: 'cantrip-slots',
      type: 'giveSpellSlot',
      data: { castingSource: source, slots: [{ lvl: 8, rank: 0, amt: 5 }] },
    },
  ]);
  const choice = findSelection((await calculate(input)).results).selection.options[0]._select_uuid;
  input.operation_data.selections[`character_${dailyId}`] = choice;
  const daily = input.custom_operations.find((operation) => operation.id === dailyId);
  daily.data.optionsFilters.level = { min: 1, max: 1 };
  OperationSchema.parse(daily);
  const changed = await calculate(JSON.parse(JSON.stringify(input)));
  assert.equal(changed.casting.list.filter((entry) => entry.source === cache).length, 0);
  assert.equal(
    findSelection(changed.results).selection.options.some((option) => option.id === spells[3].id),
    false
  );
  assert.notEqual(findSelection(changed.results).selection.options[0]._select_uuid, choice);
});

test('an initial daily choice belongs to its actual entity and casting source', async () => {
  const input = character([selector()]);
  const choice = findSelection((await calculate(input)).results).selection.options[0]._select_uuid;
  const other = structuredClone(input);
  other.id += 1;
  other.operation_data.selections[`character_${dailyId}`] = choice;
  const otherResult = await calculate(other);
  assert.equal(otherResult.casting.list.filter((entry) => entry.source === cache).length, 0);
  assert.notEqual(findSelection(otherResult.results).selection.options[0]._select_uuid, choice);
  const changed = structuredClone(input);
  changed.spells.list.forEach((entry) => {
    entry.source = 'OTHER';
  });
  changed.custom_operations[0].data.value = 'OTHER:::PREPARED-LIST:::ARCANE:::ATTRIBUTE_INT';
  changed.custom_operations[1].data.castingSource = 'OTHER';
  changed.custom_operations[2].data.optionsFilters.knownSpellSource = 'OTHER';
  changed.custom_operations[2].data.optionsFilters.spellData.castingSource = 'OTHER';
  changed.operation_data.selections[`character_${dailyId}`] = choice;
  const changedResult = await calculate(changed);
  assert.equal(changedResult.casting.list.filter((entry) => entry.source === cache).length, 0);
  assert.notEqual(findSelection(changedResult.results).selection.options[0]._select_uuid, choice);
});

test('daily authoring requires a single actual rank and a named normal-spell database list', async () => {
  assert.deepEqual(OperationSchema.parse(selector()), selector());
  for (const changes of [
    { level: {} },
    { level: { min: 0, max: 0 } },
    { level: { min: 1, max: 2 } },
    { level: { min: 1.5, max: 1.5 } },
    { level: { min: 11, max: 11 } },
    { knownSpellSource: undefined },
    { distinctRankFromSelections: [expandedId] },
    { spellData: { type: 'NORMAL', castingSource: source } },
    { spellData: { type: 'NORMAL', castingSource: source, listSources: [] } },
    { spellData: { type: 'NORMAL', castingSource: source, listSources: [''] } },
    { dailyPreparation: false },
  ]) {
    assert.equal(
      OperationSelectFiltersSpellSchema.safeParse({
        ...selector().data.optionsFilters,
        ...changes,
      }).success,
      false,
      JSON.stringify(changes)
    );
  }
});

test('unavailable daily ranks do not render empty future pickers; ordinary empty selectors remain visible', async () => {
  const unavailable = character([selector(dailyId, true, 10), selector(expandedId, false, 10)]);
  const result = await calculate(unavailable);
  assert.equal(findSelection(result.results), undefined);
  assert.equal(findSelection(result.results, expandedId).selection.options.length, 0);
});

test('the authored feat retains its source and offers one choice per available rank, not ten blank controls', async () => {
  const feat = AbilityBlockSchema.parse({ ...spellLibraryDraft, id: 9919590, created_at: '' });
  assert.equal(spellLibraryDraft.id, undefined, 'the draft does not allocate a native ID');
  assert.deepEqual(feat.meta_data.source, {
    book: 'Tech Core',
    page: '59',
    url: 'https://2e.aonsrd.com/feats/2897-spell-library',
  });
  const selectors = feat.operations[0].data.trueOperations;
  assert.equal(selectors.length, 10);
  assert.equal(new Set(selectors.map((operation) => operation.id)).size, 10);
  engine.setFixtures([
    ...spells.map((row) => ({ table: 'spell', row })),
    cantripRow,
    { table: 'ability_block', row: feat },
  ]);
  try {
    const grant = '32dbd8c6-0ce4-4603-9203-e4362f7049c8';
    const input = character([{ id: grant, type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: feat.id } }]);
    input.custom_operations.push({
      id: 'rank-two',
      type: 'giveSpellSlot',
      data: {
        castingSource: source,
        slots: [{ lvl: 8, rank: 2, amt: 1 }],
      },
    });
    const offered = await calculate(input);
    assert.ok(findSelection(offered.results, selectors[0].id));
    assert.ok(findSelection(offered.results, selectors[1].id));
    for (const selector of selectors.slice(2)) assert.equal(findSelection(offered.results, selector.id), undefined);
    const option = findSelection(offered.results, selectors[0].id).selection.options[0];
    input.operation_data.selections[`character_${grant}_${selectors[0].id}`] = option._select_uuid;
    assert.equal((await calculate(input)).casting.list.filter((entry) => entry.source === cache).length, 1);
    const saved = structuredClone(input.operation_data);
    input.custom_operations = input.custom_operations.filter((operation) => operation.id !== grant);
    assert.equal((await calculate(input)).casting.list.filter((entry) => entry.source === cache).length, 0);
    assert.deepEqual(input.operation_data, saved);
    input.custom_operations.push({
      id: grant,
      type: 'giveAbilityBlock',
      data: { type: 'feat', abilityBlockId: feat.id },
    });
    assert.equal((await calculate(input)).casting.list.filter((entry) => entry.source === cache).length, 1);
    input.level = 7;
    assert.equal(findSelection((await calculate(input)).results, selectors[0].id), undefined);
  } finally {
    engine.setFixtures([...spells.map((row) => ({ table: 'spell', row })), cantripRow]);
  }
});

test('two owners of the same daily selector cannot accept each other’s saved choice', async () => {
  const feat = AbilityBlockSchema.parse({
    ...spellLibraryDraft,
    id: 9919591,
    created_at: '',
    operations: [selector()],
  });
  engine.setFixtures([
    ...spells.map((row) => ({ table: 'spell', row })),
    cantripRow,
    { table: 'ability_block', row: feat },
  ]);
  try {
    const first = '81edb0df-4b5d-437a-b0cd-e3d00c7da2f5';
    const second = '8ba2698f-80cd-44f1-b405-de0598bf24af';
    const input = character(
      [first, second].map((id) => ({ id, type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: feat.id } }))
    );
    const choice = findSelection((await calculate(input)).results).selection.options[0]._select_uuid;
    input.operation_data.selections[`character_${second}_${dailyId}`] = choice;
    assert.equal((await calculate(input)).casting.list.filter((entry) => entry.source === cache).length, 0);
    input.operation_data.selections[`character_${first}_${dailyId}`] = choice;
    assert.equal((await calculate(input)).casting.list.filter((entry) => entry.source === cache).length, 1);
  } finally {
    engine.setFixtures([...spells.map((row) => ({ table: 'spell', row })), cantripRow]);
  }
});

test('rank-ten daily choices require their own actual slot and never grant extra high-rank slots', async () => {
  const rankTen = { ...spells[0], id: 9919599, rank: 10 };
  const catalog = [...spells, rankTen];
  engine.setFixtures([...catalog.map((row) => ({ table: 'spell', row })), cantripRow]);
  try {
    for (const level of [19, 20]) {
      const input = character([selector(dailyId, true, 10)]);
      input.level = level;
      input.spells.list.push({ spell_id: rankTen.id, rank: 10, source });
      input.custom_operations[1].data.slots = [{ lvl: level, rank: 9, amt: 1 }];
      assert.equal(findSelection((await calculate(input)).results), undefined);
      input.custom_operations.push({
        id: 'admin-slot',
        type: 'giveSpellSlot',
        data: {
          castingSource: source,
          slots: [{ lvl: level, rank: 10, amt: 1 }],
        },
      });
      const offered = await calculate(input);
      const choice = findSelection(offered.results).selection.options[0];
      input.operation_data.selections[`character_${dailyId}`] = choice._select_uuid;
      const selected = await calculate(input);
      assert.equal(selected.casting.slots.filter((slot) => slot.rank === 10).length, 1);
      assert.equal(
        selected.casting.slots.filter((slot) => slot.spell_list_source === cache).every((slot) => slot.rank <= 9),
        true
      );
      input.custom_operations.at(-1).data.slots[0].amt = 2;
      assert.equal(findSelection((await calculate(input)).results).selection.options.length, 1);
    }
  } finally {
    engine.setFixtures([...spells.map((row) => ({ table: 'spell', row })), cantripRow]);
  }
});

test('expiration retains independently granted base Cache membership for the same spell', async () => {
  const input = character([
    selector(),
    {
      id: 'base-cache-member',
      type: 'giveSpell',
      data: {
        spellId: spells[0].id,
        rank: 1,
        type: 'NORMAL',
        castingSource: source,
        listSources: [cache],
      },
    },
  ]);
  const offered = await calculate(input);
  input.operation_data.selections[`character_${dailyId}`] = findSelection(
    offered.results
  ).selection.options[0]._select_uuid;
  await calculate(input);
  let rested;
  engine.handleRest('CHARACTER', input, (next) => {
    rested = next;
  });
  for (const casting of [engine.collectEntitySpellcasting('CHARACTER', rested), (await calculate(rested)).casting]) {
    assert.deepEqual(
      casting.list.filter((entry) => entry.source === cache),
      [{ spell_id: spells[0].id, rank: 1, source: cache }]
    );
  }
});

test('ordinary Rest preserves absent and unrelated operation metadata without adding a daily field', async () => {
  for (const operationData of [undefined, { selections: {} }, { selections: { ordinary: 'saved-choice' } }]) {
    const input = character();
    input.operation_data = operationData;
    input.spells.slots = [{ source, rank: 1, spell_list_source: cache, exhausted: true }];
    await calculate(input);
    assert.equal(Object.hasOwn(engine.exportVariableStore('CHARACTER'), 'dailySpellPreparation'), false);
    const rested = rest(input);
    assert.deepEqual(rested.operation_data, operationData);
    assert.equal(rested.spells.slots[0].exhausted, false);
    assert.deepEqual(rested.spells.list, input.spells.list);
  }
});

test('an unselected active daily selector opts Rest in without granting a spell', async () => {
  const input = character([selector()]);
  const current = await calculate(input);
  const oldChoice = findSelection(current.results).selection.options[0]._select_uuid;
  assert.deepEqual(engine.exportVariableStore('CHARACTER').dailySpellPreparation, {
    entityId: input.id,
    preparation: 'initial',
  });
  assert.equal(current.casting.list.filter((entry) => entry.source === cache).length, 0);
  const rested = rest(input);
  assert.match(rested.operation_data.daily_preparation, /^[0-9a-f-]{36}$/);
  rested.operation_data.selections[`character_${dailyId}`] = oldChoice;
  const nextDay = await calculate(rested);
  assert.equal(nextDay.casting.list.filter((entry) => entry.source === cache).length, 0);
  assert.notEqual(findSelection(nextDay.results).selection.options[0]._select_uuid, oldChoice);
});

test('an empty daily database still expires a late initial choice before spells become available again', async () => {
  const input = character([selector()]);
  const oldChoice = findSelection((await calculate(input)).results).selection.options[0]._select_uuid;
  const empty = structuredClone(input);
  empty.spells.list = [];
  const current = await calculate(empty);
  assert.equal(findSelection(current.results), undefined);
  assert.equal(engine.exportVariableStore('CHARACTER').dailySpellPreparation.entityId, empty.id);
  const rested = rest(empty);
  rested.spells.list = structuredClone(input.spells.list);
  rested.operation_data.selections[`character_${dailyId}`] = oldChoice;
  assert.equal((await calculate(rested)).casting.list.filter((entry) => entry.source === cache).length, 0);
});

test('inactive, malformed and foreign-source daily selectors cannot opt ordinary Rest in', async () => {
  const inactive = character([
    {
      id: 'df447cdd-8cde-4627-ad71-b3b224377cf8',
      type: 'conditional',
      data: {
        conditions: [
          { id: 'a12dd612-15fc-49f9-aa66-88e0a41091e3', name: 'LEVEL', operator: 'GREATER_THAN', value: '20' },
        ],
        trueOperations: [selector()],
        falseOperations: [],
      },
    },
  ]);
  const wrongSource = character([selector()]);
  wrongSource.custom_operations[0].data.value = 'OTHER:::PREPARED-LIST:::ARCANE:::ATTRIBUTE_INT';
  const malformed = [
    { level: { min: 0, max: 0 } },
    { level: { min: 1, max: 2 } },
    { knownSpellSource: undefined },
    { spellData: { type: 'FOCUS', castingSource: source, listSources: [cache] } },
    { spellData: { type: 'NORMAL', castingSource: source, listSources: [''] } },
    { dailyPreparation: false },
  ].map((changes) => {
    const operation = selector();
    Object.assign(operation.data.optionsFilters, changes);
    return character([operation]);
  });
  for (const input of [inactive, wrongSource, ...malformed]) {
    await calculate(input);
    assert.equal(Object.hasOwn(engine.exportVariableStore('CHARACTER'), 'dailySpellPreparation'), false);
    assert.deepEqual(rest(input).operation_data, input.operation_data);
  }
});

test('daily runtime ownership survives the validated export/import boundary without opting another entity in', async () => {
  const input = character([selector()]);
  await calculate(input);
  const snapshot = VariableStoreSchema.parse(JSON.parse(JSON.stringify(engine.exportVariableStore('CHARACTER'))));
  engine.resetVariables('CHARACTER');
  engine.importVariableStore('CHARACTER', snapshot);
  const other = { ...structuredClone(input), id: input.id + 1 };
  assert.deepEqual(rest(other).operation_data, other.operation_data);
  assert.ok(rest(input).operation_data.daily_preparation);
  await calculate(character());
  assert.equal(Object.hasOwn(engine.exportVariableStore('CHARACTER'), 'dailySpellPreparation'), false);
});

test('initial daily choices expire after removing the feature, resting and regranting it', async () => {
  const input = character([selector()]);
  input.operation_data.selections[`character_${dailyId}`] = findSelection(
    (await calculate(input)).results
  ).selection.options[0]._select_uuid;
  const choice = input.operation_data.selections[`character_${dailyId}`];
  const removed = character();
  removed.operation_data = structuredClone(input.operation_data);
  await calculate(removed);
  assert.equal(Object.hasOwn(engine.exportVariableStore('CHARACTER'), 'dailySpellPreparation'), false);
  const regranted = structuredClone(removed);
  regranted.custom_operations.push(selector());
  assert.equal((await calculate(regranted)).casting.list.filter((entry) => entry.source === cache).length, 1);
  await calculate(removed);
  const rested = rest(removed);
  assert.equal(rested.operation_data.selections[`character_${dailyId}`], choice);
  rested.custom_operations.push(selector());
  assert.equal((await calculate(rested)).casting.list.filter((entry) => entry.source === cache).length, 0);
});

test('an established preparation expires across a removed feature even after clearing its saved choice', async () => {
  const input = character([selector()]);
  await calculate(input);
  const prepared = rest(input);
  const current = await calculate(prepared);
  prepared.operation_data.selections[`character_${dailyId}`] = findSelection(
    current.results
  ).selection.options[0]._select_uuid;
  const choice = prepared.operation_data.selections[`character_${dailyId}`];
  const removed = structuredClone(prepared);
  removed.custom_operations = removed.custom_operations.filter((operation) => operation.id !== dailyId);
  removed.operation_data.selections = {};
  await calculate(removed);
  const rested = rest(removed);
  assert.notEqual(rested.operation_data.daily_preparation, prepared.operation_data.daily_preparation);
  rested.custom_operations.push(selector());
  rested.operation_data.selections[`character_${dailyId}`] = choice;
  assert.equal((await calculate(rested)).casting.list.filter((entry) => entry.source === cache).length, 0);
});

test('malformed, foreign-entity, foreign-store and foreign-preparation saved text cannot opt ordinary Rest in', async () => {
  const input = character([selector()]);
  const valid = JSON.parse(findSelection((await calculate(input)).results).selection.options[0]._select_uuid);
  const variants = [
    'DAILY',
    JSON.stringify(['DAILY']),
    JSON.stringify([...valid, 'extra']),
    JSON.stringify(valid.map((value, index) => (index === 3 ? input.id + 1 : value))),
    JSON.stringify(valid.map((value, index) => (index === 2 ? 'OTHER-STORE' : value))),
    JSON.stringify(valid.map((value, index) => (index === 1 ? crypto.randomUUID() : value))),
    JSON.stringify(valid.map((value, index) => (index === 4 ? '' : value))),
    JSON.stringify(valid.map((value, index) => (index === 7 ? -1 : value))),
    JSON.stringify(valid.map((value, index) => (index === 8 ? 0 : value))),
  ];
  for (const saved of variants) {
    const ordinary = character();
    ordinary.operation_data.selections = { obsolete: saved };
    await calculate(ordinary);
    assert.deepEqual(rest(ordinary).operation_data, ordinary.operation_data);
  }
});

test('failed and superseded direct calculations cannot publish daily ownership into an ordinary store', async () => {
  const ordinary = character();
  await calculate(ordinary);
  const committed = engine.exportVariableStore('CHARACTER');
  const cyclicId = 9919591;
  const cyclic = AbilityBlockSchema.parse({
    ...spellLibraryDraft,
    id: cyclicId,
    created_at: '',
    operations: [{ id: 'bad-cycle', type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: cyclicId } }],
  });
  engine.setFixtures([
    ...spells.map((row) => ({ table: 'spell', row })),
    cantripRow,
    { table: 'ability_block', row: cyclic },
  ]);
  try {
    const broken = character([
      { id: 'bad-grant', type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: cyclicId } },
      selector(),
    ]);
    await assert.rejects(calculate(broken), /Cyclic content grant/);
    assert.deepEqual(engine.exportVariableStore('CHARACTER'), committed);
    const abandoned = engine.executeOperations(
      { type: 'CHARACTER', data: { character: character([selector()]), content, context: 'CHARACTER-SHEET' } },
      { directExecution: true }
    );
    const rejected = assert.rejects(abandoned, { name: 'AbortError' });
    const latest = calculate(ordinary);
    await Promise.all([rejected, latest]);
    assert.equal(Object.hasOwn(engine.exportVariableStore('CHARACTER'), 'dailySpellPreparation'), false);
    assert.deepEqual(rest(ordinary).operation_data, ordinary.operation_data);
  } finally {
    engine.setFixtures([...spells.map((row) => ({ table: 'spell', row })), cantripRow]);
  }
});
