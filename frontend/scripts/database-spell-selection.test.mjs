import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { OperationSelectFiltersSpellSchema, OperationSchema } from '../src/schemas/operations.ts';
import {
  AbilityBlockSchema,
  CharacterSchema,
  ClassSchema,
  ContentSourceSchema,
  SpellSchema,
  TraitSchema,
} from '../src/schemas/content.ts';

const ts = createRequire(import.meta.url)('typescript');

const source = 'TECHNOMANCER';
const cache = 'TECHNOMANCER_CACHE';
const first = '6082549e-6035-451d-a2dd-f90766e54d55';
const second = '5a22ab22-74b9-4658-b194-558c386668d4';
let engine;
let spells;
let content;

/** Authored selectors add membership without changing the database's casting source. */
function selection(id, distinct = [], overrides = {}) {
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
        level: {},
        knownSpellSource: source,
        ...(distinct.length ? { distinctRankFromSelections: distinct } : {}),
        spellData: { type: 'NORMAL', castingSource: source, listSources: [cache] },
        ...overrides,
      },
    },
  };
}

const entry = (spell, rank = spell.rank, castingSource = source) => ({
  spell_id: spell.id,
  rank,
  source: castingSource,
});
const choice = (spell, rank = spell.rank) => `${spell.id}:${rank}`;

/** Keep input and saved selection identity unchanged across real controller execution. */
function character(operations, list, selections = {}) {
  return {
    id: 9919000,
    level: 8,
    details: {},
    inventory: { items: [] },
    companions: { list: [] },
    options: { custom_operations: true },
    custom_operations: operations,
    operation_data: { selections },
    spells: { slots: [], list, innate_casts: [], focus_point_current: 0 },
  };
}

before(async () => {
  const rows = await readContentRows([{ table: 'spell', id: 4656 }]);
  const original = rows[0].row;
  spells = [1, 2, 1, 3].map((rank, index) => ({
    ...structuredClone(original),
    id: 9919010 + index,
    name: `Fixture Spell ${index}`,
    rank,
  }));
  engine = await createOperationEngine({ renderSelectionEditor: true });
  engine.setFixtures(spells.map((row) => ({ table: 'spell', row })));
  content = {
    abilityBlocks: [],
    items: [],
    classes: [],
    ancestries: [],
    backgrounds: [],
    languages: [],
    spells,
    traits: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    defaultSources: { PAGE: [original.content_source_id], INFO: [] },
  };
});
after(async () => engine?.cleanup());

/** Locate a resolved selector without depending on its nesting inside a feature. */
function selectors(tree, id) {
  const results = [];
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    if (value.selection?.id === id) results.push(value);
    for (const child of Object.values(value)) visit(child);
  };
  visit(tree);
  return results;
}

async function calculate(input, packageOverride = content, context = 'CHARACTER-SHEET') {
  const saved = structuredClone(input);
  const results = await engine.executeOperations(
    {
      type: 'CHARACTER',
      data: { character: input, content: packageOverride, context },
    },
    { directExecution: true }
  );
  assert.deepEqual(input, saved);
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  return { results, casting: engine.collectEntitySpellcasting('CHARACTER', input) };
}

test('source-owned selector exposes only its database entries and adds exact Cache membership', async () => {
  const [a, b, other] = spells;
  const input = character([selection(first)], [entry(a), entry(b), entry(other, 1, 'OTHER')], {
    [`character_${first}`]: choice(a),
  });
  const { results, casting } = await calculate(input);
  const selected = selectors(results, first)[0];
  assert.deepEqual(
    selected.selection.options.map((option) => option._select_uuid).sort(),
    [choice(a), choice(b)].sort()
  );
  assert.deepEqual(
    casting.list.filter((item) => item.source === cache),
    [entry(a, 1, cache)]
  );
  assert.equal(
    casting.list.some((item) => item.spell_id === spells[3].id),
    false
  );
});

test('second choice excludes the first rank, and conflicts preserve the raw saved second choice', async () => {
  const [a, b, sameRank] = spells;
  const ops = [selection(first), selection(second, [first])];
  const input = character(ops, [entry(a), entry(b), entry(sameRank)], {
    [`character_${first}`]: choice(a),
    [`character_${second}`]: choice(b),
  });
  const valid = await calculate(input);
  assert.deepEqual(
    selectors(valid.results, second)[0].selection.options.map((option) => option._select_uuid),
    [choice(b)]
  );
  assert.equal(valid.casting.list.filter((item) => item.source === cache).length, 2);
  input.operation_data.selections[`character_${second}`] = choice(sameRank);
  const conflict = await calculate(input);
  assert.deepEqual(
    conflict.casting.list.filter((item) => item.source === cache),
    [entry(a, 1, cache)]
  );
  assert.equal(input.operation_data.selections[`character_${second}`], choice(sameRank));
});

test('removing database membership cannot self-authorize the saved Cache choice, and regrant restores it', async () => {
  const [a] = spells;
  const input = character([selection(first)], [entry(a)], { [`character_${first}`]: choice(a) });
  assert.equal((await calculate(input)).casting.list.filter((item) => item.source === cache).length, 1);
  input.spells.list = [];
  const removed = await calculate(input);
  assert.deepEqual(removed.casting.list, []);
  assert.equal(input.operation_data.selections[`character_${first}`], choice(a));
  input.spells.list = [entry(a)];
  assert.equal(
    (await calculate(JSON.parse(JSON.stringify(input)))).casting.list.filter((item) => item.source === cache).length,
    1
  );
});

test('heightened database versions keep separate identity and grant the selected saved rank', async () => {
  const [a] = spells;
  const input = character([selection(first)], [entry(a, 1), entry(a, 3)], { [`character_${first}`]: choice(a, 3) });
  const { results, casting } = await calculate(input);
  assert.deepEqual(
    selectors(results, first)[0]
      .selection.options.map((option) => option._select_uuid)
      .sort(),
    [choice(a, 1), choice(a, 3)]
  );
  assert.deepEqual(
    casting.list.filter((item) => item.source === cache),
    [entry(a, 3, cache)]
  );
});

test('independent spell grants later in operation order qualify without teaching arbitrary catalog spells', async () => {
  const [a] = spells;
  const input = character(
    [
      selection(first),
      {
        id: 'f21576d4-1a14-41a3-88d8-3d9c609ba1c0',
        type: 'giveSpell',
        data: { spellId: a.id, type: 'NORMAL', castingSource: source, rank: 1 },
      },
    ],
    [],
    { [`character_${first}`]: choice(a) }
  );
  assert.deepEqual(
    (await calculate(input)).casting.list.filter((item) => item.source === cache),
    [entry(a, 1, cache)]
  );
});

test('database filter fails closed without execution context; ordinary catalog selectors are unchanged', async () => {
  engine.resetVariables('CHARACTER');
  const filtered = selection(first).data.optionsFilters;
  assert.deepEqual(await engine.determineFilteredSelectionList('CHARACTER', first, filtered), []);
  const ordinary = { id: filtered.id, type: 'SPELL', level: {}, spellData: { type: 'NORMAL', castingSource: source } };
  const options = await engine.determineFilteredSelectionList('CHARACTER', first, ordinary);
  assert.deepEqual(options.map((option) => option._select_uuid).sort(), spells.map((spell) => String(spell.id)).sort());
  assert.deepEqual(OperationSelectFiltersSpellSchema.parse(ordinary), ordinary);
});

test('actual schemas retain opt-in fields and reject unsupported source or sibling metadata', () => {
  const authored = selection(second, [first]);
  assert.deepEqual(OperationSchema.parse(authored), authored);
  for (const overrides of [
    { knownSpellSource: '' },
    { knownSpellSource: 1 },
    { distinctRankFromSelections: [first, first] },
    { distinctRankFromSelections: ['not-a-uuid'] },
    { knownSpellSource: undefined, distinctRankFromSelections: [first] },
    { spellData: { type: 'FOCUS', castingSource: source } },
    { spellData: { type: 'NORMAL', castingSource: 'OTHER' } },
  ])
    assert.equal(
      OperationSelectFiltersSpellSchema.safeParse(selection(second, [], overrides).data.optionsFilters).success,
      false
    );
});

test('the same selector UUID under another ability owner cannot constrain or replace this pair', async () => {
  const [a, b, c, d] = spells;
  const giveOne = '7eddf44b-7139-4a9c-8511-e17cfe7a158b';
  const giveTwo = 'c492a37b-1de3-45ac-aa8d-e57a34ee1440';
  const abilities = [9919041, 9919042].map((id) => ({
    id,
    name: `Fixture Ability ${id}`,
    type: 'feat',
    level: 4,
    traits: [],
    content_source_id: a.content_source_id,
    operations: [selection(first), selection(second, [first])],
  }));
  engine.setFixtures([
    ...spells.map((row) => ({ table: 'spell', row })),
    ...abilities.map((row) => ({ table: 'ability_block', row })),
  ]);
  try {
    const input = character(
      [
        { id: giveOne, type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: abilities[0].id } },
        { id: giveTwo, type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: abilities[1].id } },
      ],
      spells.map((spell) => entry(spell)),
      {
        [`character_${giveOne}_${first}`]: choice(a),
        [`character_${giveOne}_${second}`]: choice(b),
        [`character_${giveTwo}_${first}`]: choice(b),
        [`character_${giveTwo}_${second}`]: choice(c),
      }
    );
    const { results } = await calculate(input, { ...content, abilityBlocks: abilities });
    const choices = selectors(results, second);
    assert.equal(choices.length, 2);
    assert.deepEqual(
      choices[0].selection.options.map((option) => option._select_uuid).sort(),
      [choice(b), choice(d)].sort()
    );
    assert.deepEqual(
      choices[1].selection.options.map((option) => option._select_uuid).sort(),
      [choice(a), choice(c), choice(d)].sort()
    );
    assert.equal(choices[0].result.source.id, b.id);
    assert.equal(choices[1].result.source.id, c.id);
  } finally {
    engine.setFixtures(spells.map((row) => ({ table: 'spell', row })));
  }
});

test('an invalid first choice excludes no rank; stale sibling paths absent from current operations do not qualify', async () => {
  const [a, b] = spells;
  const selections = { [`character_${first}`]: choice(b), [`character_${second}`]: choice(a) };
  const input = character([selection(first), selection(second, [first])], [entry(a)], selections);
  const validSecond = await calculate(input);
  assert.deepEqual(
    validSecond.casting.list.filter((item) => item.source === cache),
    [entry(a, 1, cache)]
  );
  input.custom_operations = [selection(second, [first])];
  assert.deepEqual(
    (await calculate(input)).casting.list.filter((item) => item.source === cache),
    []
  );
  assert.deepEqual(input.operation_data.selections, selections);
});

test('removing and restoring the feat preserves exact serialized choices and restricted preparations', async () => {
  const [a, b] = spells;
  const ops = [selection(first), selection(second, [first])];
  const input = character(ops, [entry(a), entry(b)], {
    [`character_${first}`]: choice(a),
    [`character_${second}`]: choice(b),
    unrelated: 'retained',
  });
  input.spells.slots = [{ rank: 2, source, spell_list_source: cache, spell_id: b.id, exhausted: true, color: 'green' }];
  const saved = JSON.stringify(input.spells);
  assert.equal((await calculate(input)).casting.list.filter((item) => item.source === cache).length, 2);
  input.custom_operations = [];
  assert.equal((await calculate(input)).casting.list.filter((item) => item.source === cache).length, 0);
  assert.equal(JSON.stringify(input.spells), saved);
  input.custom_operations = ops;
  assert.equal(
    (await calculate(JSON.parse(JSON.stringify(input)))).casting.list.filter((item) => item.source === cache).length,
    2
  );
  assert.equal(JSON.stringify(input.spells), saved);
});

test('validated spell rows cannot inject operations that self-authorize a later Cache choice', async () => {
  const [a, b] = spells;
  const altered = structuredClone(spells);
  altered[0].operations = [
    {
      id: 'f9809cb1-f963-4511-96d6-aa150879678b',
      type: 'giveSpell',
      data: { spellId: b.id, rank: 2, type: 'NORMAL', castingSource: source },
    },
  ];
  const parsed = altered.map((row) => SpellSchema.parse(row));
  assert.equal(Object.hasOwn(parsed[0], 'operations'), false);
  engine.setFixtures(parsed.map((row) => ({ table: 'spell', row })));
  try {
    const input = character([selection(first), selection(second, [first])], [entry(a)], {
      [`character_${first}`]: choice(a),
      [`character_${second}`]: choice(b),
    });
    for (let index = 0; index < 2; index++) {
      const calculated = await calculate(input, { ...content, spells: parsed });
      assert.deepEqual(
        calculated.casting.list.filter((item) => item.source === cache),
        [entry(a, 1, cache)]
      );
      assert.equal(selectors(calculated.results, second)[0].selection.options.length, 0);
    }
    input.spells.list = [];
    assert.deepEqual((await calculate(input, { ...content, spells: parsed })).casting.list, []);
  } finally {
    engine.setFixtures(spells.map((row) => ({ table: 'spell', row })));
  }
});

test('later independent conditional grants qualify before the frozen database snapshot', async () => {
  const [a] = spells;
  const input = character(
    [
      selection(first),
      {
        id: '8a0b5187-b4b0-44b9-a6be-f85bd5187615',
        type: 'conditional',
        data: {
          conditions: [{ id: 'level', name: 'LEVEL', type: 'num', operator: 'GREATER_THAN', value: 5 }],
          trueOperations: [
            {
              id: '1c7fb623-f055-4a9d-9b5d-0ffaf0a3e3a1',
              type: 'giveSpell',
              data: { spellId: a.id, type: 'NORMAL', castingSource: source, rank: 1 },
            },
          ],
        },
      },
    ],
    [],
    { [`character_${first}`]: choice(a) }
  );
  assert.deepEqual(
    (await calculate(input)).casting.list.filter((item) => item.source === cache),
    [entry(a, 1, cache)]
  );
});

test('ordinary selected spell identity and invalid-choice diagnostics retain their previous behavior', async () => {
  const [a] = spells;
  const ordinary = selection(first);
  delete ordinary.data.optionsFilters.knownSpellSource;
  const input = character([ordinary], [], { [`character_${first}`]: String(a.id) });
  const calculated = await calculate(input);
  assert.equal(selectors(calculated.results, first)[0].result.source.id, a.id);
  assert.deepEqual(
    selectors(calculated.results, first)[0]
      .selection.options.map((option) => option._select_uuid)
      .sort(),
    spells.map((spell) => String(spell.id)).sort()
  );
  const log = console.log;
  const messages = [];
  console.log = (...args) => messages.push(args.join(' '));
  try {
    input.operation_data.selections[`character_${first}`] = '9919999';
    await calculate(input);
    assert.ok(messages.some((message) => message.includes('Selected node') && message.includes('not found')));
    messages.length = 0;
    input.custom_operations = [selection(first)];
    await calculate(input);
    assert.deepEqual(messages, []);
  } finally {
    console.log = log;
  }
});

test('the actual filtered editor retains database and paired-rank metadata during unrelated edits', async () => {
  const text = await readFile(
    new URL('../src/common/operations/selection/SelectionOperation.tsx', import.meta.url),
    'utf8'
  );
  const file = ts.createSourceFile('SelectionOperation.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes = [];
  const visit = (node) => {
    nodes.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  const component = nodes.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'SelectionFilteredSpell'
  );
  const calls = nodes.filter(
    (node) =>
      ts.isCallExpression(node) &&
      node.expression.getText(file) === 'useDidUpdate' &&
      node.pos >= component.pos &&
      node.end <= component.end
  );
  assert.equal(calls.length, 1);
  const callback = ts.createPrinter().printNode(ts.EmitHint.Unspecified, calls[0].arguments[0], file);
  const javascript = ts.transpileModule(`const callback = ${callback};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  const filters = selection(second, [first]).data.optionsFilters;
  let edited;
  const bindings = {
    props: {
      filters,
      onChange: (value) => {
        edited = value;
      },
    },
    minLevel: 1,
    maxLevel: 8,
    traits: [],
    traditions: ['arcane'],
    type: 'NORMAL',
    castingSource: source,
    rank: undefined,
    tradition: undefined,
    casts: undefined,
    attribute: undefined,
  };
  new Function(...Object.keys(bindings), `${javascript}\nreturn callback;`)(...Object.values(bindings))();
  assert.equal(edited.knownSpellSource, source);
  assert.deepEqual(edited.distinctRankFromSelections, [first]);
  assert.deepEqual(edited.spellData.listSources, [cache]);
  assert.equal(OperationSelectFiltersSpellSchema.safeParse(edited).success, true);
  assert.deepEqual(filters.level, {});
  assert.match(
    engine.renderSelectionEditor({ ...selection(second, [first]).data, optionsFilters: edited }),
    /Casting Source/
  );
});

test('no-feature calculations preserve legacy saved fields without imposing database-view validation', async () => {
  const [a] = spells;
  const legacy = [
    { ...entry(a), note: 'retained', nested: { unrecognized: true } },
    { spell_id: a.id, source: 'OLD' },
  ];
  const input = character([], legacy);
  const calculated = await calculate(input);
  assert.deepEqual(calculated.casting.list, legacy);
  input.custom_operations = [selection(first)];
  const opted = await calculate(input);
  assert.deepEqual(
    selectors(opted.results, first)[0].selection.options.map((option) => option._select_uuid),
    [choice(a)]
  );
  assert.deepEqual(input.spells.list, legacy);
});

test('each execution uses its own database and releases it before direct selector reads', async () => {
  const [a, b] = spells;
  for (const spell of [a, b, a]) {
    const input = character([selection(first)], [entry(spell)], { [`character_${first}`]: choice(spell) });
    input.id = 9919050 + spell.id;
    const calculated = await calculate(input);
    assert.deepEqual(
      calculated.casting.list.filter((item) => item.source === cache),
      [entry(spell, spell.rank, cache)]
    );
    assert.deepEqual(
      await engine.determineFilteredSelectionList('CHARACTER', first, selection(first).data.optionsFilters),
      []
    );
  }
  assert.deepEqual(
    (await calculate(character([selection(first)], [], { [`character_${first}`]: choice(a) }))).casting.list,
    []
  );
});

test('a creature database stays isolated from its parent character and is released after execution', async () => {
  const [a, b] = spells;
  await calculate(character([selection(first)], [entry(a)], { [`character_${first}`]: choice(a) }));
  const creature = {
    id: 9919051,
    name: 'Database fixture',
    level: 8,
    operations: [selection(first)],
    abilities_base: [],
    inventory: { items: [] },
    spells: { slots: [], list: [entry(b)], innate_casts: [], focus_point_current: 0 },
    operation_data: { selections: { [`creature_${first}`]: choice(b) } },
  };
  const saved = structuredClone(creature);
  const calculated = await engine._executeCreatureOperations({
    id: 'CREATURE',
    creature,
    content,
    charStore: engine.exportVariableStore('CHARACTER'),
  });
  assert.deepEqual(calculated.errors, []);
  assert.deepEqual(creature, saved);
  assert.deepEqual(
    selectors(calculated.ors, first)[0].selection.options.map((option) => option._select_uuid),
    [choice(b)]
  );
  assert.deepEqual(
    engine.collectEntitySpellcasting('CREATURE', creature).list.filter((item) => item.source === cache),
    [entry(b, 2, cache)]
  );
  assert.deepEqual(
    await engine.determineFilteredSelectionList('CREATURE', first, selection(first).data.optionsFilters),
    []
  );
});

test('ambiguous, forward, self-referential and cross-source rank pairs fail closed', async () => {
  const [a, b] = spells;
  const paired = selection(second, [first]);
  for (const operations of [
    [selection(first), selection(first), paired],
    [paired, selection(first)],
    [selection(first), selection(second, [second])],
    [
      selection(first, [], { knownSpellSource: 'OTHER', spellData: { type: 'NORMAL', castingSource: 'OTHER' } }),
      paired,
    ],
  ]) {
    const input = character(operations, [entry(a), entry(b)], {
      [`character_${first}`]: choice(a),
      [`character_${second}`]: choice(b),
    });
    const calculated = await calculate(input);
    assert.equal(selectors(calculated.results, second)[0].selection.options.length, 0);
    assert.equal(
      calculated.casting.list.some((item) => item.source === cache && item.spell_id === b.id),
      false
    );
  }
  const aliased = selection(first);
  const alias = 'de88ef69-cb75-403a-b066-0a1d8d975173';
  aliased.data.selectionAliases = [alias];
  const input = character([aliased, paired], [entry(a), entry(b)], {
    [`character_${alias}`]: choice(a),
    [`character_${second}`]: choice(b),
  });
  const saved = structuredClone(input);
  await assert.rejects(
    engine.executeOperations(
      { type: 'CHARACTER', data: { character: input, content, context: 'CHARACTER-SHEET' } },
      { directExecution: true }
    ),
    /selectionAliases|Lore/
  );
  assert.deepEqual(input, saved);
  assert.deepEqual(
    await engine.determineFilteredSelectionList('CHARACTER', first, selection(first).data.optionsFilters),
    []
  );
});

test('opt-in runtime metadata also fails closed when raw custom operations bypass schema parsing', async () => {
  const [a] = spells;
  for (const spellData of [
    { type: 'FOCUS', castingSource: source },
    { type: 'NORMAL', castingSource: 'OTHER', listSources: [cache] },
    { type: 'NORMAL', castingSource: source, listSources: [cache], rank: 4 },
  ]) {
    const calculated = await calculate(
      character([selection(first, [], { spellData })], [entry(a)], {
        [`character_${first}`]: choice(a),
      })
    );
    assert.equal(selectors(calculated.results, first)[0].selection.options.length, 0);
    assert.deepEqual(
      calculated.casting.list.filter((item) => item.source === cache),
      []
    );
  }
});

test('the rendered editor keeps compatible edits but clears opt-in rules for explicit incompatible changes', async () => {
  const text = await readFile(
    new URL('../src/common/operations/selection/SelectionOperation.tsx', import.meta.url),
    'utf8'
  );
  const file = ts.createSourceFile('SelectionOperation.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes = [];
  const visit = (node) => {
    nodes.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  const component = nodes.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'SelectionFilteredSpell'
  );
  const call = nodes.find(
    (node) =>
      ts.isCallExpression(node) &&
      node.expression.getText(file) === 'useDidUpdate' &&
      node.pos >= component.pos &&
      node.end <= component.end
  );
  const callback = ts.createPrinter().printNode(ts.EmitHint.Unspecified, call.arguments[0], file);
  const javascript = ts.transpileModule(`const callback = ${callback};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  for (const changes of [{ type: 'FOCUS' }, { castingSource: 'OTHER' }, { rank: 3 }]) {
    const filters = selection(second, [first]).data.optionsFilters;
    let edited;
    const bindings = {
      props: {
        filters,
        onChange: (value) => {
          edited = value;
        },
      },
      minLevel: 1,
      maxLevel: 8,
      traits: [],
      traditions: ['arcane'],
      type: 'NORMAL',
      castingSource: source,
      rank: undefined,
      tradition: undefined,
      casts: undefined,
      attribute: undefined,
      ...changes,
    };
    new Function(...Object.keys(bindings), `${javascript}\nreturn callback;`)(...Object.values(bindings))();
    assert.equal(edited.knownSpellSource, undefined);
    assert.equal(edited.distinctRankFromSelections, undefined);
    assert.equal(OperationSelectFiltersSpellSchema.safeParse(edited).success, true);
    assert.match(
      engine.renderSelectionEditor({ ...selection(second, [first]).data, optionsFilters: edited }),
      /Spell Data/
    );
    assert.equal(filters.knownSpellSource, source);
  }
});

test('the actual editor clears database metadata only when leaving filtered spell mode', async () => {
  const text = await readFile(
    new URL('../src/common/operations/selection/SelectionOperation.tsx', import.meta.url),
    'utf8'
  );
  const file = ts.createSourceFile('SelectionOperation.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes = [];
  const visit = (node) => {
    nodes.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  const route = nodes.find((node) => ts.isVariableDeclaration(node) && node.name.getText(file) === 'routeChange');
  const callback = ts.createPrinter().printNode(ts.EmitHint.Unspecified, route.initializer, file);
  const javascript = ts.transpileModule(`const callback = ${callback};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  for (const changes of [{ title: 'Another Title' }, { modeType: 'PREDEFINED' }, { optionType: 'ABILITY_BLOCK' }]) {
    const operation = selection(second, [first]);
    let edited;
    const props = {
      data: operation.data,
      onChange: (value) => {
        edited = value;
      },
    };
    new Function('props', `${javascript}\nreturn callback;`)(props)(changes);
    assert.equal(OperationSchema.safeParse({ ...operation, data: edited }).success, true);
    assert.equal(edited.optionsFilters.knownSpellSource, changes.title ? source : undefined);
    assert.deepEqual(edited.optionsFilters.distinctRankFromSelections, changes.title ? [first] : undefined);
    assert.equal(operation.data.optionsFilters.knownSpellSource, source);
  }
});

test('the actual builder provides exact spell option identity without changing ordinary numeric selections', async () => {
  const text = await readFile(
    new URL('../src/pages/character_builder/CharBuilderCreation.tsx', import.meta.url),
    'utf8'
  );
  const file = ts.createSourceFile('CharBuilderCreation.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes = [];
  const visit = (node) => {
    nodes.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  const component = nodes.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'OperationResultSelector'
  );
  const attribute = nodes.find(
    (node) =>
      ts.isJsxAttribute(node) &&
      node.name.getText(file) === 'selectedOptionUUID' &&
      node.pos >= component.pos &&
      node.end <= component.end
  );
  assert.ok(attribute);
  const expression = ts.createPrinter().printNode(ts.EmitHint.Expression, attribute.initializer.expression, file);
  const javascript = ts.transpileModule(`const identity = ${expression};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  const identity = (result) => new Function('props', `${javascript}\nreturn identity;`)({ result });
  const [a] = spells;
  const input = character([selection(first)], [entry(a, 1), entry(a, 3)], { [`character_${first}`]: choice(a, 3) });
  const selected = selectors((await calculate(input)).results, first)[0];
  assert.equal(identity(selected), choice(a, 3));
  input.operation_data.selections[`character_${first}`] = selected.selection.options.find(
    (option) => option.rank === 1
  )._select_uuid;
  assert.equal(identity(selectors((await calculate(input)).results, first)[0]), choice(a, 1));
  assert.equal(
    identity({ result: { source: { id: a.id, _content_type: 'spell', _select_uuid: String(a.id) } } }),
    undefined
  );
  assert.equal(
    identity({ result: { source: { id: a.id, rank: 1, _content_type: 'spell', _select_uuid: first } } }),
    undefined,
    'PREDEFINED spell choices retain their existing numeric picker identity'
  );
  assert.equal(
    identity({ result: { source: { id: a.id, _content_type: 'ability-block', _select_uuid: 'feature' } } }),
    undefined
  );
});

async function readBrowserFixture() {
  const text = await readFile(
    new URL('../cypress/e2e/characters/databaseSpellSelections.cy.ts', import.meta.url),
    'utf8'
  );
  const prefix = text.slice(0, text.indexOf('type WorkerControl'));
  const file = ts.createSourceFile('fixture.ts', prefix, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const declarations = file.statements
    .filter((statement) => !ts.isImportDeclaration(statement))
    .map((statement) => statement.getText(file))
    .join('\n');
  const javascript = ts.transpileModule(declarations, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return new Function(
    'AbilityBlockSchema',
    'CharacterSchema',
    'ClassSchema',
    'ContentSourceSchema',
    'SpellSchema',
    'TraitSchema',
    'OperationSchema',
    `${javascript}\nreturn { original, pulse, wave, spark, daily, source, fixtureClass, classTrait, classFeature, first, second, predefined, predefinedChoice };`
  )(AbilityBlockSchema, CharacterSchema, ClassSchema, ContentSourceSchema, SpellSchema, TraitSchema, OperationSchema);
}

test('the isolated browser fixture uses valid saved data and actual source-owned selection schemas', async () => {
  const fixture = await readBrowserFixture();
  assert.equal(fixture.original.spells.list.filter((entry) => entry.spell_id === fixture.pulse.id).length, 2);
  const operations = fixture.original.custom_operations;
  assert.equal(
    operations.find((operation) => operation.id === fixture.second).data.optionsFilters.distinctRankFromSelections[0],
    fixture.first
  );
  assert.equal(fixture.original.operation_data.selections[`character_${fixture.predefined}`], fixture.predefinedChoice);
  assert.equal(fixture.original.operation_data.selections[`character_${fixture.first}`], undefined);
  assert.deepEqual(
    fixture.original.spells.list.map((entry) => entry.rank),
    [1, 3, 2, 1]
  );
  assert.equal(
    operations.find((operation) => operation.id === fixture.predefined).data.optionsPredefined[0].operation.data.rank,
    1
  );
  const daily = operations.find((operation) => operation.id === fixture.daily);
  assert.equal(daily.data.optionsFilters.dailyPreparation, true);
  assert.deepEqual(daily.data.optionsFilters.level, { min: 1, max: 1 });
  assert.deepEqual(fixture.original.details.class, fixture.fixtureClass);
  assert.equal(fixture.fixtureClass.trait_id, fixture.classTrait.id);
  assert.deepEqual(fixture.classFeature.traits, [fixture.classTrait.id]);
  assert.deepEqual(fixture.classFeature.operations, []);
  assert.equal(fixture.classFeature.level, 1);
  assert.equal(fixture.classTrait.meta_data.class_trait, true);
  for (const row of [fixture.fixtureClass, fixture.classTrait, fixture.classFeature])
    assert.equal(row.content_source_id, fixture.source.id);
});

test('the browser fixture reaches Initial Stats through a real selected class feature without extra choices', async () => {
  const fixture = await readBrowserFixture();
  const fixtureContent = {
    ...content,
    abilityBlocks: [fixture.classFeature],
    classes: [fixture.fixtureClass],
    traits: [fixture.classTrait],
    sources: [fixture.source],
    spells: [fixture.pulse, fixture.wave, fixture.spark],
    defaultSources: { PAGE: [fixture.source.id], INFO: [] },
  };
  engine.setFixtures([
    { table: 'class', row: fixture.fixtureClass },
    { table: 'trait', row: fixture.classTrait },
    { table: 'ability_block', row: fixture.classFeature },
    { table: 'spell', row: fixture.pulse },
    { table: 'spell', row: fixture.wave },
    { table: 'spell', row: fixture.spark },
    { table: 'content_source', row: fixture.source },
  ]);
  try {
    const missingFeature = await calculate(
      fixture.original,
      { ...fixtureContent, abilityBlocks: [] },
      'CHARACTER-BUILDER'
    );
    assert.equal(missingFeature.results.ancestrySectionResults.length, 0);
    assert.equal(missingFeature.results.classFeatureResults.length, 0);
    const { results } = await calculate(fixture.original, fixtureContent, 'CHARACTER-BUILDER');
    assert.equal(results.ancestrySectionResults.length, 0);
    assert.equal(results.classFeatureResults.length, 1);
    assert.equal(results.classFeatureResults[0].baseSource.id, fixture.classFeature.id);
    assert.deepEqual(results.classFeatureResults[0].baseResults, []);
    assert.equal(results.characterResults.length, 4);
    assert.deepEqual(
      selectors(results, fixture.daily)[0]
        .selection.options.map((option) => option.id)
        .sort(),
      [fixture.pulse.id, fixture.spark.id].sort()
    );
    assert.deepEqual(
      selectors(results, fixture.first)[0]
        .selection.options.filter((option) => option.id === fixture.pulse.id)
        .map((option) => option.rank)
        .sort((a, b) => a - b),
      [1, 3]
    );
  } finally {
    engine.setFixtures(spells.map((row) => ({ table: 'spell', row })));
  }
});

test('the actual browser storage guard replies only to the exact public background GET', async () => {
  const text = await readFile(
    new URL('../cypress/e2e/characters/databaseSpellSelections.cy.ts', import.meta.url),
    'utf8'
  );
  const file = ts.createSourceFile(
    'databaseSpellSelections.cy.ts',
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  let handler;
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(file) === 'cy.intercept' &&
      ts.isStringLiteral(node.arguments[0]) &&
      node.arguments[0].text === '**/storage/v1/**'
    )
      handler = node.arguments[1];
    ts.forEachChild(node, visit);
  };
  visit(file);
  assert.ok(handler);
  const expression = ts.createPrinter().printNode(ts.EmitHint.Expression, handler, file);
  const javascript = ts.transpileModule(`const handle = ${expression};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  const handle = new Function(`${javascript}\nreturn handle;`)();
  const url = 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/backgrounds/default/4.webp';
  let reply;
  handle({
    method: 'GET',
    url,
    reply: (value) => {
      reply = value;
    },
  });
  assert.equal(reply.statusCode, 200);
  assert.equal(reply.headers['content-type'], 'image/svg+xml');
  assert.match(reply.body, /^<svg /);
  for (const request of [
    { method: 'POST', url },
    { method: 'DELETE', url },
    { method: 'GET', url: url.replace('4.webp', '1.png') },
    { method: 'GET', url: `${url}?unexpected=true` },
    { method: 'GET', url: url.replace('https://fdrjqcyjklatdrmjdnys.supabase.co', 'http://127.0.0.1:54321') },
  ])
    assert.throws(
      () => handle({ ...request, reply: () => assert.fail('Unexpected storage request was replied to') }),
      /Unexpected database fixture storage request/
    );
});
