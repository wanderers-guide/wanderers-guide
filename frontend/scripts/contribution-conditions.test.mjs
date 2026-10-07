import assert from 'node:assert/strict';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { OperationSchema } from '../src/schemas/operations.ts';
import { AbilityBlockSchema, OperationCharacterResultPackageSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const published = await readContentRows([
  ...[51111, 29500, 20730].map((id) => ({ table: 'ability_block', id })),
  ...[3295, 3460, 3487, 3479, 1468, 1542, 1346].map((id) => ({ table: 'trait', id })),
  { table: 'item', id: 12068 },
]);
const winterMigration = await readFile(
  new URL('../../supabase/migrations/20261001220000_treasure_vault_winter_resistance.sql', import.meta.url),
  'utf8'
);
const winterSpec = JSON.parse(winterMigration.split('$winter$')[1]);
const publishedWinter = published.find(({ table, row }) => table === 'ability_block' && row.id === 51111).row;
const publishedState = assertReviewedTransition(
  { operations: publishedWinter.operations, source: publishedWinter.meta_data.source },
  winterSpec.owner.before,
  winterSpec.owner.after,
  'Unreviewed Winter state'
);
const engine = await createOperationEngine();
test.after(async () => engine.cleanup());
const block = (rows, id) => rows.find(({ table, row }) => table === 'ability_block' && row.id === id).row;
const winterGrant = {
  id: 'ba7dd003-3d72-43c7-a9c5-3e4a249a1ba8',
  type: 'giveAbilityBlock',
  data: { type: 'feat', abilityBlockId: 51111 },
};
const relicGrant = {
  id: 'e2950000-4024-4cae-82f2-35a654a8a821',
  type: 'giveAbilityBlock',
  data: { type: 'feat', abilityBlockId: 29500 },
};
const heritageGrant = {
  id: 'c2073000-285d-4318-9ad0-e5fbc67b2d20',
  type: 'giveAbilityBlock',
  data: { type: 'heritage', abilityBlockId: 20730 },
};
const selector = block(published, 29500).operations.find((op) => op.type === 'select');
const fireSelection = {
  [`character_${relicGrant.id}_${selector.id}`]: selector.data.optionsPredefined.find(
    (option) => option.title === 'Fire'
  ).id,
};
function optedRows() {
  const rows = structuredClone(published);
  const conditional = block(rows, 51111).operations.find((op) => op.type === 'conditional');
  conditional.data.contributionChecks = {
    [conditional.data.conditions[0].id]: {
      categories: ['heritage', 'ancestry-feat', 'class-feat', 'archetype-feat'],
      excludeCurrentContent: true,
      match: 'typed-amount',
    },
  };
  assert.deepEqual(OperationSchema.parse(conditional), conditional, 'opt-in survives actual recursive public schema');
  AbilityBlockSchema.parse(block(rows, 51111));
  return rows;
}
const contentFor = (rows) => ({
  abilityBlocks: rows.filter((x) => x.table === 'ability_block').map((x) => x.row),
  traits: rows.filter((x) => x.table === 'trait').map((x) => x.row),
  sources: [],
  items: rows.filter((x) => x.table === 'item').map((x) => x.row),
  classes: [],
  ancestries: [],
  backgrounds: [],
  languages: [],
  spells: [],
  archetypes: [],
  versatileHeritages: [],
  classArchetypes: [],
  defaultSources: { PAGE: [1, 3, 13, 16], INFO: [1, 3, 13, 16] },
});
async function calculate(operations, selections = {}, rows = optedRows(), overrides = {}) {
  engine.setFixtures(rows);
  const character = {
    id: 990111,
    name: 'Contribution condition regression',
    level: 14,
    details: { conditions: [] },
    inventory: { items: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
    operation_data: { selections },
    content_sources: { enabled: [1, 3, 13, 16] },
    meta_data: { reset_hp: false },
    options: { custom_operations: true, ignore_bulk_limit: true },
    custom_operations: operations,
    companions: { list: [] },
    ...overrides,
  };
  const saved = structuredClone(character),
    snapshot = structuredClone(rows);
  const result = await engine._executeCharacterOperations({
    character,
    content: contentFor(rows),
    context: 'CHARACTER-SHEET',
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(character, saved);
  assert.deepEqual(rows, snapshot);
  engine.importVariableStore('CHARACTER', result.store);
  const fire = result.store.variables.RESISTANCES.value
    .map((value) => engine.compileExpressions('CHARACTER', value, true))
    .filter((value) => value.startsWith('fire,'))
    .map((value) => Number(value.split(',')[1].trim()));
  return { result, fire: Math.max(0, ...fire.filter(Number.isFinite)) };
}
test('published relic is excluded by cloned opt-in while heritage remains eligible and original content stays unchanged', async () => {
  const legacy = structuredClone(published);
  const legacyWinter = block(legacy, 51111);
  legacyWinter.operations = structuredClone(winterSpec.owner.before.operations);
  legacyWinter.meta_data.source = structuredClone(winterSpec.owner.before.source);
  assert.equal((await calculate([relicGrant, winterGrant], fireSelection)).fire, 7);
  assert.equal((await calculate([heritageGrant, winterGrant])).fire, 14);
  assert.equal(
    (await calculate([relicGrant, winterGrant], fireSelection, legacy)).fire,
    14,
    'unopted legacy comparison remains unchanged'
  );
  assert.equal(
    (await calculate([relicGrant, winterGrant], fireSelection, structuredClone(published))).fire,
    publishedState === 'before' ? 14 : 7,
    'the current published snapshot uses its reviewed contribution rules'
  );
});

for (const id of ['constructor', 'toString']) {
  test(`own ${id} qualifiers roundtrip while inherited names keep ordinary comparison timing`, async () => {
    const ordinary = optedRows();
    const ordinaryConditional = winterConditional(ordinary);
    ordinaryConditional.data.conditions[0].id = id;
    ordinaryConditional.data.contributionChecks = {};
    assert.deepEqual(OperationSchema.parse(ordinaryConditional), ordinaryConditional);
    assert.equal((await calculate([winterGrant], {}, ordinary)).fire, 7, 'no own key means ordinary false');

    const qualified = optedRows();
    const qualifiedConditional = winterConditional(qualified);
    const qualifier = Object.values(qualifiedConditional.data.contributionChecks)[0];
    qualifiedConditional.data.conditions[0].id = id;
    qualifiedConditional.data.contributionChecks = { [id]: qualifier };
    const parsed = OperationSchema.parse(JSON.parse(JSON.stringify(qualifiedConditional)));
    assert.equal(Object.hasOwn(parsed.data.contributionChecks, id), true);
    assert.deepEqual(parsed, qualifiedConditional);
    assert.equal((await calculate([relicGrant, winterGrant], fireSelection, qualified)).fire, 7);
    assert.equal((await calculate([heritageGrant, winterGrant], {}, qualified)).fire, 14);

    const mixed = optedRows();
    winterConditional(mixed).data.conditions.push({ id, name: 'LEVEL', type: 'num', operator: 'EQUALS', value: 14 });
    assert.deepEqual(OperationSchema.parse(winterConditional(mixed)), winterConditional(mixed));
    assert.equal(
      (await calculate([heritageGrant, winterGrant], {}, mixed)).fire,
      14,
      'unowned numeric check stays ordinary'
    );
  });
}

test('reserved __proto__ qualifier rejects before parsing while its unopted ID remains ordinary', async () => {
  const ordinary = optedRows();
  const conditional = winterConditional(ordinary);
  conditional.data.conditions[0].id = '__proto__';
  conditional.data.contributionChecks = {};
  assert.deepEqual(OperationSchema.parse(conditional), conditional);
  const reserved = optedRows();
  const reservedConditional = winterConditional(reserved);
  const qualifier = Object.values(reservedConditional.data.contributionChecks)[0];
  reservedConditional.data.conditions[0].id = '__proto__';
  reservedConditional.data.contributionChecks = { ['__proto__']: qualifier };
  const serialized = JSON.parse(JSON.stringify(reservedConditional));
  assert.equal(Object.hasOwn(serialized.data.contributionChecks, '__proto__'), true);
  assert.equal(OperationSchema.safeParse(serialized).success, false, 'reserved authored key cannot silently disappear');
  assert.equal((await calculate([winterGrant], {}, ordinary)).fire, 7);
  await publicRejectPreserving(reserved, [winterGrant], /__proto__/);
});

const customHalf = {
  id: 'cb0d3c46-d9f9-4302-b3d3-d0b4751f1f84',
  type: 'adjValue',
  data: { variable: 'RESISTANCES', value: 'fire, {{level/2}}' },
};
const removeRelic = {
  id: '3cabed64-fd0f-4842-813e-9377fa3650e3',
  type: 'removeAbilityBlock',
  data: { type: 'feat', abilityBlockId: 29500 },
};
const removeHeritage = {
  id: 'ed5da6fa-6479-41b0-a0da-16447870b6cb',
  type: 'removeAbilityBlock',
  data: { type: 'heritage', abilityBlockId: 20730 },
};
const featGrant = { ...heritageGrant, data: { type: 'feat', abilityBlockId: 20730 } };
const mutateHeritage = (change) => {
  const rows = optedRows();
  change(block(rows, 20730));
  return rows;
};
const heritageValue = (value) =>
  mutateHeritage((row) => {
    row.operations[0].data.value = value;
  });
const heritageCategory = (traits) =>
  mutateHeritage((row) => {
    row.type = 'feat';
    row.traits = traits;
  });
const conditionalHeritage = () =>
  mutateHeritage((row) => {
    row.operations = [
      {
        id: 'ab2c8863-6618-4494-a640-d2532a5331c3',
        type: 'conditional',
        data: { conditions: [], trueOperations: row.operations },
      },
    ];
  });
const contract = [
  ['published excluded relic remains half', 7, [relicGrant, winterGrant], fireSelection],
  ['published eligible heritage upgrades', 14, [heritageGrant, winterGrant]],
  ['eligible heritage reversed grant order', 14, [winterGrant, heritageGrant]],
  ['custom contribution excluded', 7, [customHalf, winterGrant]],
  [
    'physical item contribution excluded',
    7,
    [winterGrant],
    {},
    () => {
      const rows = optedRows();
      rows.find((x) => x.table === 'item').row.operations = [customHalf];
      return rows;
    },
    (rows) => ({
      inventory: {
        items: [
          {
            id: 'synthetic-physical-occurrence',
            item: rows.find((x) => x.table === 'item').row,
            is_equipped: true,
            is_invested: true,
            is_implanted: false,
            is_formula: false,
            container_contents: [],
          },
        ],
        coins: { cp: 0, sp: 0, gp: 0, pp: 0 },
      },
    }),
  ],
  ['ancestry feat uses actual ancestry trait', 14, [featGrant, winterGrant], {}, () => heritageCategory([1468])],
  ['class feat uses actual class trait', 14, [featGrant, winterGrant], {}, () => heritageCategory([1346])],
  ['archetype feat uses actual archetype trait', 14, [featGrant, winterGrant], {}, () => heritageCategory([3295])],
  ['uncategorized feat excluded', 7, [featGrant, winterGrant], {}, () => heritageCategory([])],
  ['eligible literal equals evaluated half', 14, [heritageGrant, winterGrant], {}, () => heritageValue('fire, 7')],
  [
    'eligible equivalent expression',
    14,
    [heritageGrant, winterGrant],
    {},
    () => heritageValue('fire, {{floor(level * 0.5)}}'),
  ],
  ['eligible unequal amount excluded', 7, [heritageGrant, winterGrant], {}, () => heritageValue('fire, 6')],
  [
    'eligible other damage type excluded',
    7,
    [heritageGrant, winterGrant],
    {},
    () => heritageValue('cold, {{level/2}}'),
  ],
  ['saved Fire option removed', 7, [relicGrant, winterGrant]],
  ['relic removed before conditionals', 7, [relicGrant, winterGrant, removeRelic], fireSelection],
  ['heritage removed before conditionals', 7, [heritageGrant, winterGrant, removeHeritage]],
  [
    'duplicate amount heritage removed relic retained',
    7,
    [relicGrant, heritageGrant, winterGrant, removeHeritage],
    fireSelection,
  ],
  [
    'duplicate amount relic removed heritage retained',
    14,
    [relicGrant, heritageGrant, winterGrant, removeRelic],
    fireSelection,
  ],
  [
    'heritage regrant after removal',
    14,
    [heritageGrant, removeHeritage, { ...heritageGrant, id: '10c9cf62-888b-401d-8f5b-a3d63c229e51' }, winterGrant],
  ],
  [
    'assignment replaces eligible ownership',
    7,
    [
      heritageGrant,
      { id: '764cfc72-8406-49e3-9259-b6a3f8b79a0c', type: 'setValue', data: { variable: 'RESISTANCES', value: [] } },
      customHalf,
      winterGrant,
    ],
  ],
  [
    'duplicate Winter occurrences self-excluded',
    7,
    [winterGrant, { ...winterGrant, id: 'bc1b3eed-f707-4a8b-90ca-a77e5804b70a' }],
  ],
  ['heritage odd level', 15, [heritageGrant, winterGrant], {}, optedRows, { level: 15 }],
  ['relic odd level', 7, [relicGrant, winterGrant], fireSelection, optedRows, { level: 15 }],
  [
    'literal equals floor-half odd level',
    15,
    [heritageGrant, winterGrant],
    {},
    () => heritageValue('fire, 7'),
    { level: 15 },
  ],
  [
    'literal unequal next even level',
    8,
    [heritageGrant, winterGrant],
    {},
    () => heritageValue('fire, 7'),
    { level: 16 },
  ],
  ['downlevel fresh calculation', 14, [heritageGrant, winterGrant]],
  ['ordinary conditional heritage before Winter', 14, [heritageGrant, winterGrant], {}, conditionalHeritage],
  ['ordinary conditional heritage after Winter', 14, [winterGrant, heritageGrant], {}, conditionalHeritage],
];
for (const [name, expected, operations, selections = {}, fixture = optedRows, overrides = {}] of contract)
  test(name, async () => {
    const rows = fixture();
    assert.equal(
      (await calculate(operations, selections, rows, typeof overrides === 'function' ? overrides(rows) : overrides))
        .fire,
      expected
    );
  });
test('companion cannot see owner contributions, own heritage qualifies, and later owner remains isolated', async () => {
  const owner = await calculate([heritageGrant]);
  const rows = optedRows();
  for (const [operations, expected] of [
    [[winterGrant], 7],
    [[heritageGrant, winterGrant], 14],
  ]) {
    engine.setFixtures(rows);
    const creature = {
      id: 990112,
      name: 'Contribution companion',
      level: 14,
      operations,
      abilities_base: [],
      abilities_added: [],
      details: { conditions: [], description: '' },
      inventory: { items: [] },
      operation_data: { selections: {} },
      meta_data: { reset_hp: false },
    };
    const saved = structuredClone(creature);
    const result = await engine._executeCreatureOperations({
      id: 'COMPANION-A',
      creature,
      content: contentFor(rows),
      charStore: owner.result.store,
    });
    assert.deepEqual(result.errors, []);
    assert.deepEqual(creature, saved);
    engine.importVariableStore('COMPANION-A', result.store);
    assert.equal(
      Math.max(
        0,
        ...result.store.variables.RESISTANCES.value
          .map((value) => engine.compileExpressions('COMPANION-A', value, true))
          .filter((value) => value.startsWith('fire,'))
          .map((value) => Number(value.split(',')[1]))
      ),
      expected
    );
  }
  assert.equal((await calculate([winterGrant])).fire, 7);
});

const winterConditional = (rows) => block(rows, 51111).operations.find((op) => op.type === 'conditional');
test('actual returned controller tree reconciles a nested chosen branch through cloneDeep, without leaking handles', async () => {
  const rows = optedRows(),
    conditional = winterConditional(rows);
  const selection = {
    id: 'qualified-choice',
    type: 'select',
    data: {
      modeType: 'PREDEFINED',
      optionType: 'CUSTOM',
      optionsPredefined: [
        {
          id: 'chosen-option',
          type: 'CUSTOM',
          title: 'Selected conditional option',
          description: '',
          operations: [{ id: 'choice-marker', type: 'adjValue', data: { variable: 'MAX_HEALTH_BONUS', value: 2 } }],
        },
      ],
    },
  };
  conditional.data.trueOperations.push(selection);
  const selections = { [`character_${winterGrant.id}_${selection.id}`]: 'chosen-option' };
  const { result, fire } = await calculate([heritageGrant, winterGrant], selections, rows);
  OperationCharacterResultPackageSchema.parse(result.ors);
  assert.equal(fire, 14);
  assert.equal(result.store.variables.MAX_HEALTH_BONUS.value, 2);
  const returned = result.ors.characterResults[1].result.results.find((value) => value?.result?.source === undefined)
    ?.result.results;
  const choice = returned?.find((value) => value?.selection?.id === selection.id);
  assert.equal(choice?.result?.source?.name, 'Selected conditional option');
  assert.equal(choice?.result?.source?._select_uuid, 'chosen-option');
  assert.deepEqual(choice?.result?.results, [null]);
  const check = (value) => {
    if (!value || typeof value !== 'object') return;
    assert.equal(Object.getOwnPropertySymbols(value).length, 0);
    for (const child of Object.values(value)) check(child);
  };
  check(result);
  const falseResult = await calculate([winterGrant], selections, rows);
  assert.equal(falseResult.fire, 7);
  assert.equal(falseResult.result.store.variables.MAX_HEALTH_BONUS.value, 0);
});

test('nearest separately granted row owns contributions; an eligible ancestor cannot launder a relic', async () => {
  const rows = optedRows();
  block(rows, 20730).operations = [relicGrant];
  const selection = {
    [`character_${heritageGrant.id}_${relicGrant.id}_${selector.id}`]: selector.data.optionsPredefined.find(
      (option) => option.title === 'Fire'
    ).id,
  };
  assert.equal((await calculate([heritageGrant, winterGrant], selection, rows)).fire, 7);
  assert.equal(
    (await calculate([relicGrant, winterGrant], fireSelection)).fire,
    7,
    'CUSTOM selection inherits its real relic owner'
  );
});

test('category sets, All Ancestries, known excluded and unresolved traits are distinct', async () => {
  engine.setFixtures(published);
  assert.deepEqual(
    new Set(await engine.getContributionCategories({ type: 'feat', traits: [1468, 1346, 3295] })),
    new Set(['ancestry-feat', 'class-feat', 'archetype-feat'])
  );
  assert.deepEqual(await engine.getContributionCategories({ type: 'feat', traits: [3460, 3487, 3479] }), []);
  assert.deepEqual(await engine.getContributionCategories({ type: 'heritage', traits: [999999] }), ['heritage']);
  const rows = await readContentRows([{ table: 'trait', id: engine.getTraitIdByType('ALL-ANCESTRIES') }]);
  engine.setFixtures(rows);
  assert.ok(
    (await engine.getContributionCategories({ type: 'feat', traits: [rows[0].row.id] })).includes('ancestry-feat')
  );
  const missing = heritageCategory([999999]);
  await assert.rejects(
    calculate([featGrant, winterGrant], {}, missing),
    /Unresolved contribution classification trait 999999/
  );
  assert.equal(
    (await calculate([heritageGrant, winterGrant])).fire,
    14,
    'failed classification cannot poison following run'
  );
  const unopted = structuredClone(missing);
  delete winterConditional(unopted).data.contributionChecks;
  assert.equal(
    (await calculate([featGrant, winterGrant], {}, unopted)).fire,
    14,
    'legacy calculations do not newly require classification'
  );
});

test('strict typed amounts reject malformed or nonfinite pairs without numeric coercion', async () => {
  for (const value of [
    'fire,',
    'fire, ',
    'fire, NaN',
    'fire, Infinity',
    'fire, 7, rider',
    'fire, 7 damage',
    'fire, {{missing}}',
    ', 7',
    null,
    7,
  ])
    assert.equal(engine.parseContributionAmount(value), undefined);
  assert.deepEqual(engine.parseContributionAmount(' FiRe , 7.0 '), { type: 'FIRE', amount: 7 });
  for (const value of ['fire,', 'fire, NaN', 'fire, Infinity', 'fire, 7, rider', 'fire, {{missing}}']) {
    const { result } = await calculate([heritageGrant, winterGrant], {}, heritageValue(value));
    assert.ok(result.store.variables.RESISTANCES.value.includes('fire, {{level/2}}'));
    assert.ok(!result.store.variables.RESISTANCES.value.includes('fire, {{level}}'));
  }
  const bad = optedRows();
  winterConditional(bad).data.conditions[0].value = 'fire, {{unknown}}';
  await assert.rejects(calculate([winterGrant], {}, bad), /Malformed typed-amount contribution check/);
});

test('list intentions preserve duplicates/filters and replace assignments/create/delete across real replay', async () => {
  const store = 'JOURNAL';
  engine.resetVariables(store);
  engine.beginVariableEffects(store);
  const scope = (key, content, run, type = 'heritage') =>
    engine.withVariableEffectScope(store, key, content, true, run, { type, traits: [] });
  await scope('eligible', 'ability-block:20730', async () => {
    engine.adjVariable(store, 'RESISTANCES', 'fire, 7');
    engine.adjVariable(store, 'RESISTANCES', 'cold, 3');
  });
  await scope(
    'excluded',
    'ability-block:29500',
    async () => engine.adjVariable(store, 'RESISTANCES', 'fire, 7'),
    'feat'
  );
  assert.deepEqual(engine.getVariable(store, 'RESISTANCES').value, ['fire, 7', 'cold, 3']);
  assert.equal(engine.getListContributions(store, 'RESISTANCES').length, 3);
  const snapshot = engine.getListContributions(store, 'RESISTANCES');
  snapshot[0].origin.type = 'spoof';
  snapshot.pop();
  assert.equal(engine.getListContributions(store, 'RESISTANCES')[0].origin.type, 'heritage');
  await scope('filter', 'ability-block:900', async () =>
    engine.filterVariableList(store, 'RESISTANCES', (value) => value !== 'cold, 3')
  );
  assert.deepEqual(
    engine.getListContributions(store, 'RESISTANCES').map((entry) => entry.content),
    ['ability-block:20730', 'ability-block:29500']
  );
  engine.removeVariableEffects(store, 'ability-block:20730');
  assert.deepEqual(
    engine.getListContributions(store, 'RESISTANCES').map((entry) => entry.content),
    ['ability-block:29500']
  );
  await scope('assignment', 'ability-block:901', async () => engine.setVariable(store, 'RESISTANCES', ['fire, 7']));
  assert.deepEqual(
    engine.getListContributions(store, 'RESISTANCES').map((entry) => entry.content),
    ['ability-block:901']
  );
  await scope('noop-create', 'ability-block:902', async () =>
    engine.addVariable(store, 'list-str', 'RESISTANCES', ['fire, 7'])
  );
  assert.equal(engine.getListContributions(store, 'RESISTANCES')[0].content, 'ability-block:901');
  await scope('recreate', 'ability-block:903', async () => {
    engine.removeVariable(store, 'RESISTANCES');
    engine.addVariable(store, 'list-str', 'RESISTANCES', ['fire, 7']);
  });
  assert.equal(engine.getListContributions(store, 'RESISTANCES')[0].content, 'ability-block:903');
  engine.removeVariableEffects(store, 'ability-block:903');
  assert.equal(engine.getListContributions(store, 'RESISTANCES')[0].content, 'ability-block:901');
  engine.finishVariableEffects(store);
  assert.deepEqual(engine.getListContributions(store, 'RESISTANCES'), []);
  engine.resetVariables(store);
  engine.setVariable(store, 'RESISTANCES', ['fire, 7']);
  engine.beginVariableEffects(store);
  assert.equal(
    engine.getListContributions(store, 'RESISTANCES')[0].content,
    undefined,
    'imported/baseline entries have no invented owner'
  );
  engine.resetVariables(store);
  assert.deepEqual(engine.getListContributions(store, 'RESISTANCES'), []);
});

test('invalid opt-in keys/operators/categories fail rather than silently falling back', async () => {
  const mutations = [
    (data) => {
      data.contributionChecks.orphan = Object.values(data.contributionChecks)[0];
    },
    (data) => {
      data.conditions[0].operator = 'EQUALS';
    },
    (data) => {
      data.conditions[0].type = 'str';
    },
    (data) => {
      Object.values(data.contributionChecks)[0].categories = [];
    },
    (data) => {
      Object.values(data.contributionChecks)[0].categories = ['item'];
    },
    (data) => {
      Object.values(data.contributionChecks)[0].match = 'raw-text';
    },
    (data) => {
      Object.values(data.contributionChecks)[0].excludeCurrentContent = false;
    },
    (data) => {
      Object.values(data.contributionChecks)[0].extra = true;
    },
    (data) => {
      data.conditions.push(structuredClone(data.conditions[0]));
    },
  ];
  for (const mutate of mutations) {
    const rows = optedRows(),
      conditional = winterConditional(rows);
    mutate(conditional.data);
    assert.equal(OperationSchema.safeParse(conditional).success, false);
    await assert.rejects(calculate([winterGrant], {}, rows));
    assert.equal((await calculate([winterGrant])).fire, 7);
  }
});

test('dependent writers, replacements, removals and newly discovered qualified work are explicitly rejected', async () => {
  const branchCases = [
    [{ id: 'change-level', type: 'adjValue', data: { variable: 'LEVEL', value: 1 } }],
    [{ id: 'replace-query', type: 'setValue', data: { variable: 'RESISTANCES', value: ['fire, 7'] } }],
    [
      {
        id: 'bind-query',
        type: 'bindValue',
        data: { variable: 'RESISTANCES', value: { storeId: 'CHARACTER', variable: 'RESISTANCES' } },
      },
    ],
    [removeHeritage],
    [heritageGrant],
    [structuredClone(winterConditional(optedRows()))],
  ];
  for (const branch of branchCases) {
    const rows = optedRows();
    winterConditional(rows).data.trueOperations.push(...branch);
    await assert.rejects(calculate([heritageGrant, winterGrant], {}, rows), /Unsupported contribution dependency/);
    assert.equal((await calculate([heritageGrant, winterGrant])).fire, 14);
  }
  const rows = optedRows(),
    second = structuredClone(block(rows, 51111));
  second.id = 990113;
  second.name = 'Other qualified writer';
  rows.push({ table: 'ability_block', row: second });
  const otherGrant = { ...winterGrant, id: 'other-qualified-grant', data: { type: 'feat', abilityBlockId: second.id } };
  await assert.rejects(calculate([winterGrant, otherGrant], {}, rows), /Unsupported contribution dependency/);
});

test('mixed ordinary checks keep their original traversal-time verdict, not a later reevaluation', async () => {
  const rows = optedRows();
  winterConditional(rows).data.conditions.push({
    id: 'ordinary-gate',
    type: 'num',
    name: 'ORDINARY_GATE',
    operator: 'EQUALS',
    value: '1',
  });
  const creation = {
    id: 'create-gate',
    type: 'createValue',
    data: { type: 'num', variable: 'ORDINARY_GATE', value: 1 },
  };
  const lateChange = {
    id: 'late-gate-change',
    type: 'conditional',
    data: {
      conditions: [],
      trueOperations: [{ id: 'gate-off', type: 'setValue', data: { variable: 'ORDINARY_GATE', value: 0 } }],
    },
  };
  const { result, fire } = await calculate([creation, heritageGrant, winterGrant, lateChange], {}, rows);
  assert.equal(result.store.variables.ORDINARY_GATE.value, 0);
  assert.equal(fire, 14);
  assert.equal((await calculate([creation, heritageGrant, lateChange, winterGrant], {}, rows)).fire, 7);
});

test('ordinary-final bindings attribute their destination to binding author, not source-list owner', async () => {
  const rows = optedRows();
  const binding = {
    id: 'ordinary-bind',
    type: 'bindValue',
    data: { variable: 'RESISTANCES', value: { storeId: 'CHARACTER', variable: 'ELIGIBLE_COPY' } },
  };
  block(rows, 20730).operations.push({
    id: 'source-list',
    type: 'createValue',
    data: { type: 'list-str', variable: 'ELIGIBLE_COPY', value: ['fire, {{level/2}}'] },
  });
  const { fire } = await calculate([heritageGrant, binding, winterGrant], {}, rows);
  assert.equal(fire, 7, 'unowned/custom binding replacement cannot borrow heritage provenance');
});

test('transitive bonus expression and derived-proficiency input writes are detected', async () => {
  const rows = optedRows();
  const creation = {
    id: 'create-input',
    type: 'createValue',
    data: { type: 'num', variable: 'QUALIFICATION_INPUT', value: 7 },
  };
  winterConditional(rows).data.conditions[0].value = 'fire, {{QUALIFICATION_INPUT}}';
  winterConditional(rows).data.trueOperations.push({
    id: 'bonus-source-write',
    type: 'adjValue',
    data: { variable: 'LEVEL', value: 1 },
  });
  const bonus = {
    id: 'input-bonus',
    type: 'addBonusToValue',
    data: { variable: 'QUALIFICATION_INPUT', value: '{{level}}', type: '', text: '' },
  };
  await assert.rejects(
    calculate([creation, bonus, heritageGrant, winterGrant], {}, rows),
    /Unsupported contribution dependency.*LEVEL/
  );
  const prof = optedRows();
  winterConditional(prof).data.conditions[0].value = 'fire, {{SKILL_CRAFTING}}';
  winterConditional(prof).data.trueOperations.push({
    id: 'attribute-write',
    type: 'adjValue',
    data: { variable: 'ATTRIBUTE_INT', value: { value: 1, partial: false } },
  });
  await assert.rejects(calculate([heritageGrant, winterGrant], {}, prof), /Unsupported contribution dependency/);
  const attribute = optedRows();
  winterConditional(attribute).data.conditions[0].value = 'fire, {{ATTRIBUTE_INT}}';
  winterConditional(attribute).data.trueOperations.push({
    id: 'direct-attribute-write',
    type: 'adjValue',
    data: { variable: 'ATTRIBUTE_INT', value: { value: 1, partial: false } },
  });
  await assert.rejects(
    calculate([heritageGrant, winterGrant], {}, attribute),
    /Unsupported contribution dependency.*ATTRIBUTE_INT/
  );
});

test('injected CUSTOM options are inspected before any qualified branch can apply', async () => {
  const rows = optedRows();
  winterConditional(rows).data.trueOperations.push({
    id: 'injected-choice',
    type: 'select',
    data: { modeType: 'PREDEFINED', optionType: 'CUSTOM', optionsPredefined: [] },
  });
  const injection = {
    opId: 'injected-choice',
    option: {
      id: 'dependent-option',
      type: 'CUSTOM',
      title: 'Dependency fixture',
      description: '',
      operations: [{ id: 'injected-level-write', type: 'adjValue', data: { variable: 'LEVEL', value: 1 } }],
    },
  };
  const inject = {
    id: 'inject-option-data',
    type: 'adjValue',
    data: { variable: 'INJECT_SELECT_OPTIONS', value: JSON.stringify(injection) },
  };
  await assert.rejects(
    calculate(
      [inject, heritageGrant, winterGrant],
      { [`character_${winterGrant.id}_injected-choice`]: 'dependent-option' },
      rows
    ),
    /Unsupported contribution dependency.*LEVEL/
  );
  const mutation = optedRows();
  winterConditional(mutation).data.trueOperations.push(inject);
  await assert.rejects(
    calculate([heritageGrant, winterGrant], {}, mutation),
    /Unsupported contribution dependency.*selection discovery/
  );
});

test('a query-list reference inside an amount expression cannot use the self-exclusion exception', async () => {
  const rows = optedRows();
  winterConditional(rows).data.conditions[0].value = 'fire, {{INCLUDES(RESISTANCES, "fire, 7")}}';
  await assert.rejects(
    calculate([heritageGrant, winterGrant], {}, rows),
    /Unsupported contribution dependency.*RESISTANCES/
  );
});

test('public direct calculation protocol validates the result and rejects invalid opt-in without publishing a store', async () => {
  const rows = optedRows();
  engine.setFixtures(rows);
  const character = {
    id: 990114,
    name: 'Public contribution protocol',
    level: 14,
    details: { conditions: [] },
    inventory: { items: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
    operation_data: { selections: {} },
    content_sources: { enabled: [1, 3, 13, 16] },
    meta_data: { reset_hp: false },
    options: { custom_operations: true, ignore_bulk_limit: true },
    custom_operations: [heritageGrant, winterGrant],
    companions: { list: [] },
  };
  const saved = structuredClone(character);
  const execution = { type: 'CHARACTER', data: { character, content: contentFor(rows), context: 'CHARACTER-SHEET' } };
  const result = await engine.executeOperations(execution, { directExecution: true });
  OperationCharacterResultPackageSchema.parse(result);
  assert.deepEqual(character, saved);
  assert.ok(engine.getVariable('CHARACTER', 'RESISTANCES').value.includes('fire, {{level}}'));
  const before = engine.exportVariableStore('CHARACTER');
  const invalid = optedRows();
  winterConditional(invalid).data.trueOperations.push({
    id: 'invalid-level-write',
    type: 'adjValue',
    data: { variable: 'LEVEL', value: 1 },
  });
  engine.setFixtures(invalid);
  await assert.rejects(
    engine.executeOperations(
      { ...execution, data: { ...execution.data, content: contentFor(invalid) } },
      { directExecution: true }
    ),
    /Unsupported contribution dependency/
  );
  assert.deepEqual(engine.exportVariableStore('CHARACTER'), before);
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  assert.deepEqual(Object.keys(before).sort(), ['bonuses', 'history', 'variables']);
});

function publicExecution(rows, operations = [heritageGrant, winterGrant]) {
  return {
    type: 'CHARACTER',
    data: {
      character: {
        id: 990114,
        name: 'Implicit handler boundary',
        level: 14,
        details: { conditions: [] },
        inventory: { items: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
        operation_data: { selections: {} },
        content_sources: { enabled: [1, 3, 13, 16] },
        meta_data: { reset_hp: false },
        options: { custom_operations: true, ignore_bulk_limit: true },
        custom_operations: operations,
        companions: { list: [] },
      },
      content: contentFor(rows),
      context: 'CHARACTER-SHEET',
    },
  };
}
async function publicRejectPreserving(rows, operations, pattern) {
  engine.setFixtures(rows);
  const before = engine.exportVariableStore('CHARACTER');
  const execution = publicExecution(rows, operations),
    saved = structuredClone(execution);
  await assert.rejects(engine.executeOperations(execution, { directExecution: true }), pattern);
  assert.deepEqual(engine.exportVariableStore('CHARACTER'), before);
  assert.deepEqual(execution, saved);
  assert.deepEqual(engine.getListContributions('CHARACTER', 'RESISTANCES'), []);
}
function selectionsIn(tree) {
  const found = [];
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    if (value.selection) found.push(value.selection);
    for (const child of Object.values(value)) visit(child);
  };
  visit(tree);
  return found;
}

test('qualified language overrides reject both paired setters before effects; unopted overrides still replace both lists', async () => {
  const languages = await readContentRows([{ table: 'language', id: 81 }]);
  for (const target of ['LANGUAGE_IDS', 'LANGUAGE_NAMES']) {
    const rows = optedRows();
    rows.push(...structuredClone(languages));
    const conditional = winterConditional(rows);
    conditional.data.trueOperations.push(
      { id: 'before-language-marker', type: 'adjValue', data: { variable: 'MAX_HEALTH_BONUS', value: 1 } },
      { id: 'paired-language-write', type: 'setValue', data: { variable: target, value: [] } },
      { id: 'after-language-marker', type: 'adjValue', data: { variable: 'MAX_HEALTH_BONUS', value: 2 } }
    );
    const operations = [
      { id: 'known-language', type: 'giveLanguage', data: { languageId: 81 } },
      heritageGrant,
      winterGrant,
    ];
    await publicRejectPreserving(
      rows,
      operations,
      /Unsupported contribution dependency.*language overrides replace paired lists/
    );
    const legacy = structuredClone(rows);
    delete winterConditional(legacy).data.contributionChecks;
    engine.setFixtures(legacy);
    await engine.executeOperations(publicExecution(legacy, operations), { directExecution: true });
    assert.deepEqual(engine.getVariable('CHARACTER', 'LANGUAGE_IDS').value, []);
    assert.deepEqual(engine.getVariable('CHARACTER', 'LANGUAGE_NAMES').value, []);
    assert.equal(engine.getVariable('CHARACTER', 'MAX_HEALTH_BONUS').value, 3);
  }
});

test('qualified skill training rejects implicit discovery; unopted training still returns the real replacement selection', async () => {
  const rows = optedRows();
  winterConditional(rows).data.trueOperations.push({
    id: 'implicit-training',
    type: 'adjValue',
    data: { variable: 'SKILL_CRAFTING', value: { value: 'T', increases: 0 } },
  });
  const trained = {
    id: 'already-trained',
    type: 'setValue',
    data: { variable: 'SKILL_CRAFTING', value: { value: 'T', increases: 0 } },
  };
  await publicRejectPreserving(
    rows,
    [trained, heritageGrant, winterGrant],
    /Unsupported contribution dependency.*skill training can discover a replacement selection/
  );
  const legacy = structuredClone(rows);
  delete winterConditional(legacy).data.contributionChecks;
  engine.setFixtures(legacy);
  const result = await engine.executeOperations(publicExecution(legacy, [trained, heritageGrant, winterGrant]), {
    directExecution: true,
  });
  const training = selectionsIn(result).find((selection) => selection.id === 'implicit-training');
  assert.equal(training?.title, 'Select a Skill to be Trained');
  assert.ok(training?.options.length > 0);
  assert.equal(engine.getVariable('CHARACTER', 'SKILL_CRAFTING').value.value, 'T');
  await publicRejectPreserving(
    rows,
    [heritageGrant, winterGrant],
    /Unsupported contribution dependency.*skill training/
  );
});

test('nested ordinary reads reject cross-qualified dependence; unopted nested conditions retain their original timing', async () => {
  const rows = optedRows(),
    reader = structuredClone(block(rows, 51111));
  reader.id = 990116;
  reader.name = 'Synthetic nested reader';
  rows.push({ table: 'ability_block', row: reader });
  const writer = winterConditional(rows),
    readConditional = reader.operations.find((op) => op.type === 'conditional');
  writer.data.trueOperations = [
    { id: 'qualified-writer-value', type: 'setValue', data: { variable: 'NESTED_INPUT', value: 1 } },
  ];
  writer.data.falseOperations = [];
  readConditional.data.trueOperations = [
    {
      id: 'nested-reader',
      type: 'conditional',
      data: {
        conditions: [{ id: 'nested-input-check', type: 'num', name: 'NESTED_INPUT', operator: 'EQUALS', value: '1' }],
        trueOperations: [{ id: 'nested-marker', type: 'adjValue', data: { variable: 'MAX_HEALTH_BONUS', value: 5 } }],
        falseOperations: [],
      },
    },
  ];
  readConditional.data.falseOperations = [];
  const create = {
    id: 'nested-input-creation',
    type: 'createValue',
    data: { type: 'num', variable: 'NESTED_INPUT', value: 0 },
  };
  const readerGrant = {
    id: 'nested-reader-grant',
    type: 'giveAbilityBlock',
    data: { type: 'feat', abilityBlockId: reader.id },
  };
  for (const grants of [
    [winterGrant, readerGrant],
    [readerGrant, winterGrant],
  ])
    await publicRejectPreserving(
      rows,
      [create, heritageGrant, ...grants],
      /Unsupported contribution dependency.*nested conditional branch reads/
    );
  const legacy = structuredClone(rows);
  delete winterConditional(legacy).data.contributionChecks;
  delete block(legacy, reader.id).operations.find((op) => op.type === 'conditional').data.contributionChecks;
  for (const [grants, expected] of [
    [[winterGrant, readerGrant], 5],
    [[readerGrant, winterGrant], 0],
  ]) {
    engine.setFixtures(legacy);
    await engine.executeOperations(publicExecution(legacy, [create, heritageGrant, ...grants]), {
      directExecution: true,
    });
    assert.equal(engine.getVariable('CHARACTER', 'MAX_HEALTH_BONUS').value, expected);
  }
});

test('a separate qualified author cannot resolve a future amount after the snapshot; an ordinary earlier creation can', async () => {
  const rows = heritageValue('fire, {{future_amount}}');
  const writer = structuredClone(block(rows, 51111));
  writer.id = 990115;
  writer.name = 'Synthetic future amount writer';
  rows.push({ table: 'ability_block', row: writer });
  const check = writer.operations.find((op) => op.type === 'conditional');
  check.data.conditions[0].name = 'WEAKNESSES';
  check.data.conditions[0].value = 'fire, 7';
  check.data.trueOperations = [];
  const creation = {
    id: 'create-future',
    type: 'createValue',
    data: { type: 'num', variable: 'FUTURE_AMOUNT', value: 7 },
  };
  check.data.falseOperations = [creation];
  const writerGrant = {
    id: 'grant-future-writer',
    type: 'giveAbilityBlock',
    data: { type: 'feat', abilityBlockId: writer.id },
  };
  for (const grants of [
    [writerGrant, winterGrant],
    [winterGrant, writerGrant],
  ])
    await publicRejectPreserving(
      rows,
      [heritageGrant, ...grants],
      /Unsupported contribution dependency.*FUTURE_AMOUNT/
    );
  const lowercase = structuredClone(rows);
  block(lowercase, writer.id).operations.find((op) => op.type === 'conditional').data.falseOperations[0].data.variable =
    'future_amount';
  await publicRejectPreserving(
    lowercase,
    [heritageGrant, writerGrant, winterGrant],
    /Unsupported contribution dependency.*FUTURE_AMOUNT/
  );
  const malformedName = structuredClone(rows);
  block(malformedName, writer.id).operations.find(
    (op) => op.type === 'conditional'
  ).data.falseOperations[0].data.variable = 'future.amount';
  await publicRejectPreserving(
    malformedName,
    [heritageGrant, writerGrant, winterGrant],
    /Unsupported contribution dependency.*identifier variable name/
  );
  const legacyName = heritageValue('fire, {{future_amount}}');
  delete winterConditional(legacyName).data.contributionChecks;
  const legacy = await calculate(
    [{ ...creation, data: { ...creation.data, variable: 'future.amount' } }, heritageGrant, winterGrant],
    {},
    legacyName
  );
  assert.equal(
    legacy.result.store.variables['future.amount'].value,
    7,
    'unopted persisted names are neither normalized nor newly rejected'
  );
  const derived = structuredClone(rows);
  block(derived, 20730).operations[0].data.value = 'fire, {{future_amount + SKILL_CRAFTING}}';
  await publicRejectPreserving(
    derived,
    [heritageGrant, writerGrant, winterGrant],
    /Unsupported contribution dependency.*FUTURE_AMOUNT/
  );
  for (const [name, expression] of [
    ['FLOOR', 'floor(level * 0.5)'],
    ['E', 'e'],
  ]) {
    const shadowed = structuredClone(rows);
    block(shadowed, 20730).operations[0].data.value = `fire, {{${expression}}}`;
    block(shadowed, writer.id).operations.find(
      (op) => op.type === 'conditional'
    ).data.falseOperations[0].data.variable = name;
    await publicRejectPreserving(
      shadowed,
      [heritageGrant, writerGrant, winterGrant],
      new RegExp(`Unsupported contribution dependency.*${name}`)
    );
  }
  const ordinary = heritageValue('fire, {{future_amount}}');
  assert.equal((await calculate([creation, heritageGrant, winterGrant], {}, ordinary)).fire, 14);
  const beforeFinal = mutateHeritage((row) => {
    row.operations = [
      {
        id: 'ordinary-future-creation',
        type: 'conditional',
        data: {
          conditions: [],
          trueOperations: [
            creation,
            {
              id: 'future-append',
              type: 'adjValue',
              data: { variable: 'RESISTANCES', value: 'fire, {{future_amount}}' },
            },
          ],
        },
      },
    ];
  });
  assert.equal(
    (await calculate([winterGrant, heritageGrant], {}, beforeFinal)).fire,
    14,
    'ordinary conditional creation settles before the immutable qualified phase'
  );
});

test('320 no-write qualified conditions stay within the normal work budget and all returned grants settle', async () => {
  const rows = optedRows();
  const operations = [];
  for (let index = 0; index < 320; index++) {
    const row = structuredClone(block(rows, 51111));
    row.id = 991000 + index;
    row.name = `Synthetic no-write ${index}`;
    const conditional = row.operations.find((op) => op.type === 'conditional');
    conditional.data.trueOperations = [];
    conditional.data.falseOperations = [];
    row.operations = [conditional];
    rows.push({ table: 'ability_block', row });
    operations.push({
      id: `no-write-grant-${index}`,
      type: 'giveAbilityBlock',
      data: { type: 'feat', abilityBlockId: row.id },
    });
  }
  const { result, fire } = await calculate(operations, {}, rows);
  assert.equal(fire, 0);
  assert.equal(result.ors.characterResults.length, 320);
  assert.equal(result.store.variables.FEAT_IDS.value.length, 320);
  for (const grant of result.ors.characterResults) assert.deepEqual(grant.result.results[0].result.results, []);
});
