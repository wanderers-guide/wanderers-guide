import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { OperationGiveSpellSchema, OperationGiveSpellSlotSchema } from '../src/schemas/operations.ts';
import { SpellSlotSchema } from '../src/schemas/content.ts';
import { groupBy } from 'lodash-es';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = 'PREPARED';
const cache = 'RESTRICTED_LIST';
const otherCache = 'OTHER_LIST';
const op = (id, type, data) => ({ id, type, data });
const grant = (id, spell, listSources, castingSource = source) =>
  op(id, 'giveSpell', {
    spellId: spell.id,
    type: 'NORMAL',
    rank: spell.rank,
    castingSource,
    ...(listSources ? { listSources } : {}),
  });
const slot = (id, rank, amt = 1, spellListSource, castingSource = source, lvl = 14) =>
  op(id, 'giveSpellSlot', {
    castingSource,
    slots: [{ lvl, rank, amt }],
    ...(spellListSource ? { spellListSource } : {}),
  });
const character = (operations, spells, level = 14) => ({
  id: 990870,
  level,
  details: {},
  inventory: { items: [] },
  operation_data: { selections: {} },
  options: { custom_operations: true },
  custom_operations: operations,
  ...(spells ? { spells } : {}),
});
const savedSpells = (slots = [], list = []) => ({
  slots,
  list,
  innate_casts: [],
  focus_point_current: 0,
});
let engine;
let rows;
let fireball;
let heal;
let content;
let modal;

before(async () => {
  rows = await readContentRows([
    { table: 'spell', id: 4623 },
    { table: 'spell', id: 4656 },
    { table: 'trait', id: 1856 },
    { table: 'trait', id: 1858 },
  ]);
  fireball = rows.find(({ table, row }) => table === 'spell' && row.id === 4623).row;
  heal = rows.find(({ table, row }) => table === 'spell' && row.id === 4656).row;
  engine = await createOperationEngine();
  engine.setFixtures(rows);
  content = {
    abilityBlocks: [],
    items: [],
    classes: [],
    ancestries: [],
    backgrounds: [],
    languages: [],
    spells: [fireball, heal],
    traits: rows.filter(({ table }) => table === 'trait').map(({ row }) => row),
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    defaultSources: { PAGE: [fireball.content_source_id, heal.content_source_id], INFO: [] },
  };
  const text = await readFile(new URL('../src/modals/ManageSpellsModal.tsx', import.meta.url), 'utf8');
  const file = ts.createSourceFile('ManageSpellsModal.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes = [];
  const visit = (node) => {
    nodes.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  modal = { file, nodes };
});
after(async () => engine?.cleanup());

/** Evaluate only the real selector's callback, leaving all spell predicates and collection real. */
function preparationFilter(currentSlot, list) {
  const filters = modal.nodes.filter(
    (node) =>
      ts.isPropertyAssignment(node) &&
      node.name.getText(modal.file) === 'filterFn' &&
      ts.isArrowFunction(node.initializer) &&
      node.initializer.parameters[0]?.name.getText(modal.file) === 'spell'
  );
  assert.equal(filters.length, 1, 'One actual preparation filter');
  const printed = ts.createPrinter().printNode(ts.EmitHint.Unspecified, filters[0].initializer, modal.file);
  const javascript = ts.transpileModule(`const filter = ${printed};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  const bindings = {
    rank: String(currentSlot.rank),
    slot: currentSlot,
    props: { spellList: list },
    isNormalSpell: engine.isNormalSpell,
    isCantrip: engine.isCantrip,
    isSpellInSlotList: (...args) => engine.isSpellInSlotList(...args),
  };
  return new Function(...Object.keys(bindings), `${javascript}\nreturn filter;`)(...Object.values(bindings));
}

function evaluateCallback(node, file, bindings) {
  const printed = ts.createPrinter().printNode(ts.EmitHint.Unspecified, node, file);
  const javascript = ts.transpileModule(`const callback = ${printed};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return new Function(...Object.keys(bindings), `${javascript}\nreturn callback;`)(...Object.values(bindings));
}

function preparationCallback(attribute, currentSlot, state) {
  const buttons = modal.nodes.filter(
    (node) =>
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(modal.file) === 'SelectContentButton'
  );
  const callbacks = buttons.flatMap((node) =>
    node.attributes.properties.filter((prop) => ts.isJsxAttribute(prop) && prop.name.getText(modal.file) === attribute)
  );
  assert.equal(callbacks.length, 1, `One actual preparation ${attribute}`);
  return evaluateCallback(callbacks[0].initializer.expression, modal.file, {
    slot: currentSlot,
    props: { id: 'CHARACTER', setEntity: (update) => (state.value = update(state.value)) },
    collectEntitySpellcasting: engine.collectEntitySpellcasting,
    isSpellInSlotList: engine.isSpellInSlotList,
    getSpellSlotGroupKey: engine.getSpellSlotGroupKey,
    retainRestrictedPreparations: engine.retainRestrictedPreparations,
  });
}

async function sourceAst(relative) {
  const text = await readFile(new URL(relative, import.meta.url), 'utf8');
  const file = ts.createSourceFile(relative, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes = [];
  const visit = (node) => {
    nodes.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { file, nodes };
}

/** Use the public controller entry point and retain the complete saved input unchanged. */
async function calculate(input, overrideContent = content) {
  const before = structuredClone(input);
  const result = await engine.executeOperations(
    { type: 'CHARACTER', data: { character: input, content: overrideContent, context: 'CHARACTER-SHEET' } },
    { directExecution: true }
  );
  assert.deepEqual(result.errors ?? [], []);
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  assert.deepEqual(input, before);
  return engine.collectEntitySpellcasting('CHARACTER', input);
}

test('schemas retain explicit spell-list and restricted-slot metadata while ordinary shapes stay identical', () => {
  const normal = grant('normal', fireball);
  const restricted = slot('restricted', 7, 1, cache);
  assert.deepEqual(OperationGiveSpellSchema.parse(normal), normal);
  const member = grant('member', fireball, [cache]);
  assert.deepEqual(OperationGiveSpellSchema.parse(member), member);
  assert.deepEqual(OperationGiveSpellSlotSchema.parse(restricted), restricted);
  const ordinarySaved = { rank: 7, source, spell_id: fireball.id, exhausted: true, color: 'blue' };
  assert.deepEqual(SpellSlotSchema.parse(ordinarySaved), ordinarySaved);
  const restrictedSaved = { ...ordinarySaved, spell_list_source: cache };
  assert.deepEqual(SpellSlotSchema.parse(restrictedSaved), restrictedSaved);
});

test('a NORMAL grant teaches its normal source and each explicit spell list without duplicate grants', async () => {
  const input = character([grant('member', fireball, [cache, cache, otherCache])]);
  const data = await calculate(input);
  assert.deepEqual(data.list.map((entry) => entry.source).sort(), [cache, otherCache, source].sort());
  for (const entry of data.list)
    assert.deepEqual(entry, { spell_id: fireball.id, rank: fireball.rank, source: entry.source });
  assert.equal(engine.getVariable('CHARACTER', 'SPELL_IDS').value.length, 1);
  assert.equal(engine.getVariable('CHARACTER', 'SPELL_DATA').value.length, 1);
});

test('the actual preparation selector rejects a learned nonmember but keeps lower-rank cache members', async () => {
  const data = await calculate(
    character([grant('cache-member', fireball, [cache]), grant('database-only', heal), slot('restricted', 7, 1, cache)])
  );
  assert.equal(data.slots[0].spell_list_source, cache);
  const filter = preparationFilter(data.slots[0], data.list);
  assert.equal(filter(fireball), true);
  assert.equal(filter(heal), false);
  assert.equal(preparationFilter({ rank: 7, source }, data.list)(heal), true);
});

test('the selector fails closed for an empty list, a different list and a too-high saved member rank', () => {
  const restricted = { rank: 7, source, spell_list_source: cache };
  assert.equal(preparationFilter(restricted, [])(fireball), false);
  assert.equal(
    preparationFilter(restricted, [{ spell_id: fireball.id, rank: 3, source: otherCache }])(fireball),
    false
  );
  assert.equal(preparationFilter(restricted, [{ spell_id: fireball.id, rank: 8, source: cache }])(fireball), false);
  assert.equal(preparationFilter(restricted, [{ spell_id: fireball.id, rank: 3, source: cache }])(fireball), true);
});

test('adding a restricted slot before ordinary operations does not steal an ordinary saved preparation', async () => {
  const existing = { rank: 7, source, spell_id: heal.id, exhausted: true, color: 'green' };
  const input = character(
    [slot('restricted-first', 7, 1, cache), slot('ordinary-after', 7), grant('member', fireball, [cache])],
    savedSpells([existing])
  );
  const data = await calculate(input);
  assert.equal(data.slots[0].spell_id, undefined);
  assert.deepEqual(data.slots[1], { id: 'CHARACTER-spell-slot-1', ...existing });
});

test('save/load restores ordinary and restricted colors, exhaustion and members independently', async () => {
  const ordinary = { rank: 7, source, spell_id: heal.id, exhausted: true, color: 'green' };
  const restricted = {
    rank: 7,
    source,
    spell_id: fireball.id,
    exhausted: false,
    color: 'blue',
    spell_list_source: cache,
  };
  const input = character(
    [slot('restricted-first', 7, 1, cache), slot('ordinary-after', 7), grant('member', fireball, [cache])],
    savedSpells([ordinary, restricted])
  );
  const loaded = JSON.parse(JSON.stringify(input));
  const data = await calculate(loaded);
  assert.deepEqual(data.slots[0], { id: 'CHARACTER-spell-slot-0', ...restricted });
  assert.deepEqual(data.slots[1], { id: 'CHARACTER-spell-slot-1', ...ordinary });
  assert.deepEqual(loaded, input);
});

test('removing the cache grant makes the derived restricted slot empty without rewriting saved preparation', async () => {
  const restricted = { rank: 7, source, spell_id: fireball.id, exhausted: true, spell_list_source: cache };
  const input = character(
    [slot('restricted', 7, 1, cache), grant('member', fireball, [cache])],
    savedSpells([restricted])
  );
  assert.equal((await calculate(input)).slots[0].spell_id, fireball.id);
  input.custom_operations.pop();
  assert.equal((await calculate(input)).slots[0].spell_id, undefined);
  assert.deepEqual(input.spells.slots, [restricted]);
  input.custom_operations.push(grant('member', fireball, [cache]));
  assert.equal((await calculate(input)).slots[0].spell_id, fireball.id);
});

test('removing restricted slots cannot reassign their preparations to surviving ordinary slots', async () => {
  const restricted = { rank: 7, source, spell_id: fireball.id, exhausted: true, spell_list_source: cache };
  const ordinary = { rank: 7, source, spell_id: heal.id, color: 'green' };
  const input = character(
    [slot('ordinary', 7), grant('member', fireball, [cache])],
    savedSpells([restricted, ordinary])
  );
  const data = await calculate(input);
  assert.deepEqual(data.slots, [{ id: 'CHARACTER-spell-slot-0', exhausted: undefined, ...ordinary }]);
  assert.deepEqual(input.spells.slots, [restricted, ordinary]);
});

test('normal cantrip/focus/innate/spontaneous grants preserve their existing behavior without list metadata', async () => {
  const input = character([
    grant('prepared', fireball),
    grant('spontaneous', heal, undefined, 'SPONTANEOUS'),
    op('focus', 'giveSpell', { spellId: heal.id, type: 'FOCUS', castingSource: 'FOCUS' }),
    op('innate', 'giveSpell', { spellId: fireball.id, type: 'INNATE', tradition: 'ARCANE', rank: 3, casts: 1 }),
    slot('ordinary', 7),
    slot('spontaneous-slot', 7, 2, undefined, 'SPONTANEOUS'),
    slot('cantrip', 0),
  ]);
  const data = await calculate(input);
  assert.deepEqual(
    data.list.map((entry) => entry.source),
    [source, 'SPONTANEOUS']
  );
  assert.deepEqual(data.focus, [{ spell_id: heal.id, source: 'FOCUS', rank: undefined }]);
  assert.equal(data.innate[0].spell_id, fireball.id);
  assert.equal(data.innate[0].casts_max, 1);
  assert.equal(data.slots.length, 4);
  for (const current of data.slots) assert.equal(Object.hasOwn(current, 'spell_list_source'), false);
});

test('rest resets exhaustion but keeps the exact restricted-slot identity and prepared member', async () => {
  const restricted = {
    rank: 7,
    source,
    spell_id: fireball.id,
    exhausted: true,
    color: 'blue',
    spell_list_source: cache,
  };
  const input = character(
    [slot('restricted', 7, 1, cache), grant('member', fireball, [cache])],
    savedSpells([restricted])
  );
  await calculate(input);
  let rested;
  engine.handleRest('CHARACTER', input, (value) => {
    rested = value;
  });
  assert.ok(rested);
  assert.deepEqual(rested.spells.slots, [{ ...restricted, exhausted: false }]);
  assert.equal((await calculate(rested)).slots[0].spell_id, fireball.id);
  assert.equal(input.spells.slots[0].exhausted, true);
});

test('the normal selector retains cantrip/focus/rank rules for unrestricted and restricted slots', () => {
  const cantrip = { ...heal, rank: 0, traits: [1858] };
  const focus = { ...heal, rank: 1, traits: [1856] };
  const list = [{ spell_id: cantrip.id, rank: 0, source: cache }];
  for (const spellListSource of [undefined, cache]) {
    const current = { rank: 0, source, ...(spellListSource ? { spell_list_source: spellListSource } : {}) };
    const filter = preparationFilter(current, list);
    assert.equal(filter(cantrip), true);
    assert.equal(filter(fireball), false);
    assert.equal(filter(focus), false);
  }
  assert.equal(preparationFilter({ rank: 1, source }, [])(fireball), false);
});

test('a cache source toggle rebuilds membership and restricted slots without modifying saved slots', async () => {
  const cacheSource = {
    id: 990870,
    name: 'Synthetic restricted-list source',
    operations: [grant('source-member', fireball, [cache])],
  };
  const input = character(
    [slot('restricted', 7, 1, cache)],
    savedSpells([{ rank: 7, source, spell_id: fireball.id, exhausted: true, spell_list_source: cache }])
  );
  const enabled = { ...content, sources: [cacheSource] };
  assert.equal((await calculate(input, enabled)).slots[0].spell_id, fireball.id);
  assert.equal((await calculate(input)).slots[0].spell_id, undefined);
  assert.equal(input.spells.slots[0].spell_id, fireball.id);
  assert.equal((await calculate(JSON.parse(JSON.stringify(input)), enabled)).slots[0].spell_id, fireball.id);
});

test('explicit removeSpell revokes membership, while ordinary slots and unrelated lists survive', async () => {
  const input = character([
    slot('restricted', 7, 1, cache),
    slot('ordinary', 7),
    grant('member', fireball, [cache]),
    grant('other-member', heal, [otherCache]),
    op('remove-member', 'removeSpell', { spellId: fireball.id }),
  ]);
  const data = await calculate(input);
  assert.equal(
    data.list.some((entry) => entry.source === cache),
    false
  );
  assert.equal(
    data.list.some((entry) => entry.source === otherCache && entry.spell_id === heal.id),
    true
  );
  assert.equal(data.slots[1].spell_list_source, undefined);
  assert.equal(preparationFilter(data.slots[0], data.list)(fireball), false);
});

test('the actual preparation callbacks save and clear valid members, rejecting nonmembers', async () => {
  const ordinary = { rank: 7, source, spell_id: heal.id, exhausted: true, color: 'green' };
  const state = {
    value: character(
      [slot('restricted', 7, 1, cache), slot('ordinary', 7), grant('member', fireball, [cache])],
      savedSpells([ordinary])
    ),
  };
  const current = (await calculate(state.value)).slots[0];
  const prepare = preparationCallback('onClick', current, state);
  const before = state.value;
  prepare(heal);
  assert.equal(state.value, before, 'Nonmember cannot be saved through a bypassed selector');
  prepare(fireball);
  assert.equal(state.value.spells.slots[0].spell_id, fireball.id);
  assert.equal(state.value.spells.slots[0].spell_list_source, cache);
  assert.deepEqual(state.value.spells.slots[1], { id: 'CHARACTER-spell-slot-1', ...ordinary });
  preparationCallback('onClear', current, state)();
  assert.equal(state.value.spells.slots[0].spell_id, undefined);
  assert.deepEqual(state.value.spells.slots[1], { id: 'CHARACTER-spell-slot-1', ...ordinary });
});

test('a stale member choice cannot prepare after retraining and cannot alter ordinary preparations', async () => {
  const ordinary = { rank: 7, source, spell_id: heal.id, exhausted: true, color: 'green' };
  const state = {
    value: character(
      [slot('restricted', 7, 1, cache), slot('ordinary', 7), grant('member', fireball, [cache])],
      savedSpells([ordinary])
    ),
  };
  const current = (await calculate(state.value)).slots[0];
  const prepare = preparationCallback('onClick', current, state);
  state.value.custom_operations.pop();
  await calculate(state.value);
  const before = structuredClone(state.value);
  prepare(fireball);
  assert.deepEqual(state.value, before);
  assert.equal(state.value.spells.slots[0].spell_id, heal.id);
});

for (const [oldRestriction, newRestriction] of [
  [cache, undefined],
  [undefined, cache],
  [cache, otherCache],
]) {
  test(`stale slot callbacks cannot mutate a replacement pool (${oldRestriction ?? 'ordinary'} to ${newRestriction ?? 'ordinary'})`, async () => {
    const state = {
      value: character(
        [slot('old', 7, 1, oldRestriction), grant('member', fireball, [cache, otherCache])],
        savedSpells([
          { rank: 7, source, spell_id: fireball.id, ...(oldRestriction ? { spell_list_source: oldRestriction } : {}) },
        ])
      ),
    };
    const oldSlot = (await calculate(state.value)).slots[0];
    const prepare = preparationCallback('onClick', oldSlot, state);
    const clear = preparationCallback('onClear', oldSlot, state);
    state.value = character(
      [slot('replacement', 7, 1, newRestriction), grant('member', fireball, [cache, otherCache])],
      savedSpells([
        {
          rank: 7,
          source,
          spell_id: fireball.id,
          color: 'green',
          ...(newRestriction ? { spell_list_source: newRestriction } : {}),
        },
      ])
    );
    await calculate(state.value);
    const before = structuredClone(state.value);
    prepare(fireball);
    clear();
    assert.deepEqual(state.value, before);
  });
}

test('ordinary preparation callbacks retain unrestricted selection and clearing', async () => {
  const state = { value: character([slot('ordinary', 7)]) };
  const current = (await calculate(state.value)).slots[0];
  preparationCallback('onClick', current, state)(heal);
  assert.equal(state.value.spells.slots[0].spell_id, heal.id);
  assert.equal(Object.hasOwn(state.value.spells.slots[0], 'spell_list_source'), false);
  preparationCallback('onClear', current, state)();
  assert.equal(state.value.spells.slots[0].spell_id, undefined);
});

test('editing a direct spell grant preserves authored named-list metadata through the actual editor callback', async () => {
  const { file, nodes } = await sourceAst('../src/common/operations/spell/GiveSpellOperation.tsx');
  const calls = nodes.filter((node) => ts.isCallExpression(node) && node.expression.getText(file) === 'useDidUpdate');
  assert.equal(calls.length, 1);
  for (const listSources of [undefined, [cache, otherCache]]) {
    const data = grant('grant', fireball, listSources).data;
    let selected;
    evaluateCallback(calls[0].arguments[0], file, {
      props: { data, onSelect: (value) => (selected = value) },
      spellId: fireball.id,
      type: 'NORMAL',
      castingSource: source,
      rank: 7,
      defaultRank: 3,
      tradition: undefined,
      casts: undefined,
      attribute: undefined,
    })();
    assert.equal(selected.rank, 7);
    assert.deepEqual(selected.listSources, listSources);
    assert.equal(Object.hasOwn(selected, 'listSources'), listSources !== undefined);
    assert.equal(data.rank, fireball.rank);
  }
});

for (const modeType of ['FILTERED', 'PREDEFINED']) {
  test(`${modeType} spell selection retains named-list membership with normal grant ownership`, async () => {
    const data = grant('member', fireball, [cache]).data;
    const selection = op('select-member', 'select', {
      title: 'Spell',
      optionType: 'SPELL',
      modeType,
      ...(modeType === 'FILTERED'
        ? { optionsFilters: { id: 'member-filter', type: 'SPELL', level: { min: 0, max: 10 }, spellData: data } }
        : {
            optionsPredefined: [
              { id: 'member-choice', type: 'SPELL', operation: grant('predefined-member', fireball, [cache]) },
            ],
          }),
    });
    const input = character([selection, slot('restricted', 7, 1, cache)]);
    // Selection keys retain authored operation IDs, including their hyphen.
    input.operation_data.selections = {
      'character_select-member': modeType === 'FILTERED' ? String(fireball.id) : 'member-choice',
    };
    const collected = await calculate(input);
    assert.deepEqual(collected.list.map((entry) => entry.source).sort(), [cache, source].sort());
    assert.equal(engine.getVariable('CHARACTER', 'SPELL_DATA').value.length, 1);
    assert.equal(preparationFilter(collected.slots[0], collected.list)(fireball), true);
  });
}

test('staff sacrifice and spontaneous staff slot selectors exclude restricted pools, leaving ordinary slots available', async () => {
  const restricted = { rank: 7, source, spell_list_source: cache };
  const ordinary = { rank: 7, source };
  for (const fileName of ['SelectSpellSlotModal', 'SelectStaffCastingModal']) {
    const { file, nodes } = await sourceAst(`../src/modals/${fileName}.tsx`);
    const filters = nodes.filter(
      (node) =>
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'filter' &&
        ts.isArrowFunction(node.arguments[0]) &&
        node.arguments[0].parameters[0]?.name.getText(file) === 'slot'
    );
    const sourceFilter = filters.find((node) => node.arguments[0].getText(file).includes('props.source'));
    assert.ok(sourceFilter, 'Actual slot source filter');
    const filter = evaluateCallback(sourceFilter.arguments[0], file, { props: { source } });
    assert.equal(filter(restricted), false);
    assert.equal(filter(ordinary), true);
    assert.equal(filter({ ...ordinary, source: 'OTHER_SOURCE' }), false);
  }
});

const staff = {
  id: 'synthetic-staff',
  item: { id: 990871, meta_data: { charges: { max: 7, current: 2, keep: 'metadata' } } },
};
function withStaff(input) {
  return { ...input, inventory: { items: [structuredClone(staff)], keep: 'inventory metadata' } };
}
async function staffCallback(mode, state) {
  const { file, nodes } = await sourceAst('../src/pages/character_sheet/panels/spells_list/StaffSpellsList.tsx');
  const callbacks = nodes.filter((node) => ts.isPropertyAssignment(node) && node.name.getText(file) === 'onSelect');
  const found = callbacks.filter(
    (node) =>
      ts.isArrowFunction(node.initializer) &&
      node.initializer.parameters[0]?.name.getText(file) === (mode === 'prepared' ? 'slot' : 'option')
  );
  assert.equal(found.length, 1, 'One actual staff expenditure callback');
  const scheduled = [];
  const setter = (update) => (state.value = update(state.value));
  const callback = evaluateCallback(found[0].initializer, file, {
    props: { id: 'CHARACTER', staff, setEntity: setter },
    collectEntitySpellcasting: engine.collectEntitySpellcasting,
    getSpellSlotGroupKey: engine.getSpellSlotGroupKey,
    updateItemCharges: engine.updateItemCharges,
    retainRestrictedPreparations: engine.retainRestrictedPreparations,
    handleUpdateItemCharges: (_set, item, charges) =>
      setter((current) => engine.updateItemCharges(current, item, charges)),
    cloneDeep: structuredClone,
    setTimeout: (fn) => scheduled.push(fn),
    castingSource: { name: source },
    currentCharges: 2,
    maxCharges: 7,
    castWithCharges: () => assert.fail('Not a normal staff cast'),
  });
  return (...args) => {
    callback(...args);
    for (const fn of scheduled.splice(0)) fn();
  };
}

test('ordinary prepared staff sacrifice atomically spends its slot and increases only its staff maximum', async () => {
  const state = {
    value: withStaff(
      character([slot('ordinary', 7)], savedSpells([{ rank: 7, source, spell_id: heal.id, color: 'green' }]))
    ),
  };
  const current = (await calculate(state.value)).slots[0];
  await (
    await staffCallback('prepared', state)
  )(current);
  assert.equal(state.value.spells.slots[0].exhausted, true);
  assert.equal(state.value.spells.slots[0].spell_id, heal.id);
  assert.equal(state.value.spells.slots[0].color, 'green');
  assert.deepEqual(state.value.inventory.items[0].item.meta_data.charges, { max: 14, current: 2, keep: 'metadata' });
  assert.equal(state.value.inventory.keep, 'inventory metadata');
});

for (const kind of ['restricted', 'removed', 'replaced-by-restricted', 'exhausted', 'staff-already-charged']) {
  test(`a ${kind} prepared staff slot cannot grant charges or spend another slot`, async () => {
    const oldRestriction = kind === 'restricted' ? cache : undefined;
    const state = {
      value: withStaff(
        character(
          [slot('original', 7, 1, oldRestriction), grant('member', fireball, [cache])],
          savedSpells([
            {
              rank: 7,
              source,
              spell_id: fireball.id,
              ...(oldRestriction ? { spell_list_source: oldRestriction } : {}),
            },
          ])
        )
      ),
    };
    const current = (await calculate(state.value)).slots[0];
    const sacrifice = await staffCallback('prepared', state);
    if (kind === 'removed') state.value.custom_operations = [];
    if (kind === 'replaced-by-restricted') {
      state.value.custom_operations[0] = slot('replacement', 7, 1, cache);
      state.value.spells.slots = [{ rank: 7, source, spell_id: fireball.id, spell_list_source: cache }];
    }
    if (kind === 'exhausted') state.value.spells.slots[0].exhausted = true;
    if (kind === 'staff-already-charged') state.value.inventory.items[0].item.meta_data.charges.max = 14;
    await calculate(state.value);
    const before = structuredClone(state.value);
    sacrifice(current);
    assert.deepEqual(state.value, before);
  });
}

test('spontaneous staff expenditure skips a restricted first slot and spends one ordinary slot plus one charge', async () => {
  const state = { value: withStaff(character([slot('restricted-first', 7, 1, cache), slot('ordinary-after', 7)])) };
  await calculate(state.value);
  (await staffCallback('spontaneous', state))('SLOT-CONSUME', 7);
  assert.equal(state.value.spells.slots[0].exhausted, undefined);
  assert.equal(state.value.spells.slots[1].exhausted, true);
  assert.equal(state.value.inventory.items[0].item.meta_data.charges.current, 3);
  assert.equal(state.value.inventory.items[0].item.meta_data.charges.max, 7);
});

for (const kind of ['restricted-only', 'exhausted', 'removed', 'staff-exhausted']) {
  test(`spontaneous staff choice with ${kind} slots cannot consume a charge`, async () => {
    const state = {
      value: withStaff(
        character(
          kind === 'removed' ? [] : [slot('available', 7, 1, kind === 'restricted-only' ? cache : undefined)],
          kind === 'exhausted' ? savedSpells([{ rank: 7, source, exhausted: true }]) : undefined
        )
      ),
    };
    await calculate(state.value);
    if (kind === 'staff-exhausted') state.value.inventory.items[0].item.meta_data.charges.current = 7;
    const before = structuredClone(state.value);
    (await staffCallback('spontaneous', state))('SLOT-CONSUME', 7);
    assert.deepEqual(state.value, before);
  });
}

test('actual spontaneous casting spends and restores only its ordinary pool', async () => {
  const { file, nodes } = await sourceAst('../src/pages/character_sheet/panels/SpellsPanel.tsx');
  const callbacks = nodes.filter((node) => ts.isVariableDeclaration(node) && node.name.getText(file) === 'castSpell');
  assert.equal(callbacks.length, 1);
  const restricted = { rank: 7, source, spell_list_source: cache, exhausted: false };
  const ordinary = { rank: 7, source, exhausted: false };
  const state = {
    value: character(
      [slot('restricted-first', 7, 1, cache), slot('ordinary-after', 7)],
      savedSpells([restricted, ordinary])
    ),
  };
  await calculate(state.value);
  const cast = evaluateCallback(callbacks[0].initializer, file, {
    props: {
      id: 'CHARACTER',
      entity: state.value,
      type: 'SPONTANEOUS',
      source: { name: source },
      setEntity: (update) => (state.value = update(state.value)),
    },
    collectEntitySpellcasting: engine.collectEntitySpellcasting,
    isCantrip: engine.isCantrip,
    retainRestrictedPreparations: engine.retainRestrictedPreparations,
  });
  cast(true, { ...fireball, rank: 7 });
  assert.equal(state.value.spells.slots[0].exhausted, false);
  assert.equal(state.value.spells.slots[1].exhausted, true);
  cast(false, { ...fireball, rank: 7 });
  assert.equal(state.value.spells.slots[0].exhausted, false);
  assert.equal(state.value.spells.slots[1].exhausted, false);
});

test('actual spontaneous slot counter leaves restricted preparations and their exhaustion unchanged', async () => {
  const { file, nodes } = await sourceAst('../src/pages/character_sheet/panels/spells_list/SpontaneousSpellsList.tsx');
  const callbacks = nodes.filter((node) => ts.isJsxAttribute(node) && node.name.getText(file) === 'onChange');
  assert.equal(callbacks.length, 1);
  const state = {
    value: character(
      [slot('restricted-first', 7, 1, cache), slot('ordinary-after', 7)],
      savedSpells([
        { rank: 7, source, spell_list_source: cache, exhausted: false, color: 'blue' },
        { rank: 7, source, exhausted: false, color: 'green' },
      ])
    ),
  };
  await calculate(state.value);
  const change = evaluateCallback(callbacks[0].initializer.expression, file, {
    props: { id: 'CHARACTER', source: { name: source }, setEntity: (update) => (state.value = update(state.value)) },
    rank: '7',
    collectEntitySpellcasting: engine.collectEntitySpellcasting,
    retainRestrictedPreparations: engine.retainRestrictedPreparations,
  });
  change(1);
  assert.equal(state.value.spells.slots[0].exhausted, false);
  assert.equal(state.value.spells.slots[0].color, 'blue');
  assert.equal(state.value.spells.slots[1].exhausted, true);
  change(0);
  assert.equal(state.value.spells.slots[0].exhausted, false);
  assert.equal(state.value.spells.slots[1].exhausted, false);
});

test('actual spontaneous display excludes restricted pools while prepared display retains them', async () => {
  const { file, nodes } = await sourceAst('../src/pages/character_sheet/panels/SpellsPanel.tsx');
  const declarations = nodes.filter(
    (node) =>
      ts.isVariableDeclaration(node) &&
      node.name.getText(file) === 'slots' &&
      ts.isCallExpression(node.initializer) &&
      node.initializer.expression.getText(file) === 'useMemo'
  );
  assert.equal(declarations.length, 1);
  const slots = [
    { rank: 7, source, spell_list_source: cache },
    { rank: 7, source },
  ];
  for (const type of ['PREPARED', 'SPONTANEOUS']) {
    const displayed = evaluateCallback(declarations[0].initializer.arguments[0], file, {
      props: { type, extra: { slots }, allSpells: [] },
      groupBy,
    })();
    assert.equal(displayed[7].length, type === 'PREPARED' ? 2 : 1);
    assert.equal(displayed[7].at(-1).spell_list_source, undefined);
  }
});

for (const kind of ['removed-member', 'removed-slot']) {
  test(`an intervening ordinary preparation preserves a held ${kind} restricted preparation for regrant`, async () => {
    const restricted = {
      rank: 7,
      source,
      spell_id: fireball.id,
      spell_list_source: cache,
      exhausted: true,
      color: 'blue',
    };
    const original = [
      slot('restricted-first', 7, 1, cache),
      slot('ordinary-after', 7),
      grant('member', fireball, [cache]),
    ];
    const state = { value: character(structuredClone(original), savedSpells([restricted])) };
    if (kind === 'removed-member') state.value.custom_operations.pop();
    if (kind === 'removed-slot') state.value.custom_operations.shift();
    const collected = await calculate(state.value);
    const ordinary = collected.slots.find((slot) => slot.spell_list_source === undefined);
    preparationCallback('onClick', ordinary, state)(heal);
    assert.deepEqual(
      state.value.spells.slots.find((slot) => slot.spell_list_source === cache),
      { ...restricted, ...(kind === 'removed-member' ? { id: 'CHARACTER-spell-slot-0' } : {}) }
    );
    state.value.custom_operations = structuredClone(original);
    const regranted = await calculate(JSON.parse(JSON.stringify(state.value)));
    assert.equal(regranted.slots.find((slot) => slot.spell_list_source === cache).spell_id, fireball.id);
    assert.equal(regranted.slots.find((slot) => slot.spell_list_source === undefined).spell_id, heal.id);
  });
}

test('explicitly clearing an invalid restricted preparation removes its held saved spell', async () => {
  const state = {
    value: character(
      [slot('restricted', 7, 1, cache)],
      savedSpells([
        { rank: 7, source, spell_id: fireball.id, spell_list_source: cache, exhausted: true, color: 'blue' },
      ])
    ),
  };
  const current = (await calculate(state.value)).slots[0];
  assert.equal(current.spell_id, undefined);
  preparationCallback('onClear', current, state)();
  assert.equal(state.value.spells.slots[0].spell_id, undefined);
  state.value.custom_operations.push(grant('member', fireball, [cache]));
  assert.equal((await calculate(state.value)).slots[0].spell_id, undefined);
});

test('the actual filtered spell editor retains authored named-list metadata through unrelated edits', async () => {
  const { file, nodes } = await sourceAst('../src/common/operations/selection/SelectionOperation.tsx');
  const component = nodes.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'SelectionFilteredSpell'
  );
  assert.ok(component);
  const calls = nodes.filter(
    (node) =>
      ts.isCallExpression(node) &&
      node.expression.getText(file) === 'useDidUpdate' &&
      node.pos >= component.pos &&
      node.end <= component.end
  );
  assert.equal(calls.length, 1);
  for (const listSources of [undefined, [cache, otherCache]]) {
    const filters = {
      id: 'original-filter',
      type: 'SPELL',
      level: { min: 0, max: 10 },
      spellData: grant('member', fireball, listSources).data,
    };
    let edited;
    evaluateCallback(calls[0].arguments[0], file, {
      props: { filters, onChange: (value) => (edited = value) },
      minLevel: 1,
      maxLevel: 8,
      traits: [],
      traditions: ['arcane'],
      type: 'NORMAL',
      castingSource: source,
      rank: 7,
      tradition: undefined,
      casts: undefined,
      attribute: undefined,
    })();
    assert.equal(edited.id, filters.id);
    assert.deepEqual(edited.spellData.listSources, listSources);
    assert.equal(Object.hasOwn(edited.spellData, 'listSources'), listSources !== undefined);
    assert.deepEqual(edited.level, { min: 1, max: 8 });
    assert.deepEqual(filters.level, { min: 0, max: 10 });
  }
});

test('multiple slots in the same restricted pool restore by ordinal, and clearing one never resurrects it or alters its neighbor', async () => {
  const original = [
    slot('cache-first', 7, 1, cache),
    slot('cache-second', 7, 1, cache),
    slot('ordinary', 7),
    grant('member-one', fireball, [cache]),
    grant('member-duplicate', fireball, [cache]),
    grant('member-two', heal, [cache]),
  ];
  const first = { rank: 7, source, spell_list_source: cache, spell_id: fireball.id, exhausted: true, color: 'blue' };
  const second = { rank: 7, source, spell_list_source: cache, spell_id: heal.id, exhausted: false, color: 'green' };
  const state = { value: character(structuredClone(original), savedSpells([first, second])) };
  assert.equal((await calculate(state.value)).list.filter((entry) => entry.source === cache).length, 2);
  state.value.custom_operations = state.value.custom_operations.filter(
    (operation) => !['member-one', 'member-duplicate'].includes(operation.id)
  );
  const current = await calculate(state.value);
  preparationCallback('onClick', current.slots[2], state)(heal);
  assert.deepEqual(state.value.spells.slots.slice(0, 2), [
    { id: 'CHARACTER-spell-slot-0', ...first },
    { id: 'CHARACTER-spell-slot-1', ...second },
  ]);
  preparationCallback('onClear', current.slots[0], state)();
  assert.equal(state.value.spells.slots[0].spell_id, undefined);
  assert.deepEqual(state.value.spells.slots[1], { id: 'CHARACTER-spell-slot-1', ...second });
  state.value.custom_operations = structuredClone(original);
  const restored = await calculate(JSON.parse(JSON.stringify(state.value)));
  assert.equal(restored.slots[0].spell_id, undefined);
  assert.equal(restored.slots[1].spell_id, heal.id);
  assert.equal(restored.slots[2].spell_id, heal.id);
});

test('ordinary staff expenditure preserves held restricted preparations across regrant', async () => {
  const held = { rank: 7, source, spell_list_source: cache, spell_id: fireball.id, exhausted: true, color: 'blue' };
  const state = { value: withStaff(character([slot('cache', 7, 1, cache), slot('ordinary', 7)], savedSpells([held]))) };
  const current = await calculate(state.value);
  (await staffCallback('prepared', state))(current.slots[1]);
  assert.equal(state.value.spells.slots[0].spell_id, fireball.id);
  assert.equal(state.value.spells.slots[0].exhausted, true);
  assert.equal(state.value.spells.slots[0].color, 'blue');
  state.value.custom_operations.push(grant('regrant', fireball, [cache]));
  assert.equal((await calculate(state.value)).slots[0].spell_id, fireball.id);
});

test('an ordinary prepared cast preserves a suppressed restricted spell across save/load and regrant', async () => {
  const { file, nodes } = await sourceAst('../src/pages/character_sheet/panels/SpellsPanel.tsx');
  const callback = nodes.find((node) => ts.isVariableDeclaration(node) && node.name.getText(file) === 'castSpell');
  assert.ok(callback);
  const state = {
    value: character(
      [slot('cache', 7, 1, cache), slot('ordinary', 7)],
      savedSpells([
        { rank: 7, source, spell_list_source: cache, spell_id: fireball.id, color: 'blue', exhausted: true },
        { rank: 7, source, spell_id: heal.id, color: 'green', exhausted: false },
      ])
    ),
  };
  await calculate(state.value);
  const cast = evaluateCallback(callback.initializer, file, {
    props: {
      id: 'CHARACTER',
      entity: state.value,
      type: 'PREPARED',
      source: { name: source },
      setEntity: (update) => (state.value = update(state.value)),
    },
    collectEntitySpellcasting: engine.collectEntitySpellcasting,
    isCantrip: engine.isCantrip,
    retainRestrictedPreparations: engine.retainRestrictedPreparations,
  });
  cast(true, { ...heal, rank: 7 });
  assert.equal(state.value.spells.slots[0].spell_id, fireball.id);
  assert.equal(state.value.spells.slots[0].color, 'blue');
  assert.equal(state.value.spells.slots[0].exhausted, true);
  assert.equal(state.value.spells.slots[1].exhausted, true);
  state.value = JSON.parse(JSON.stringify(state.value));
  state.value.custom_operations.push(grant('member', fireball, [cache]));
  assert.equal((await calculate(state.value)).slots[0].spell_id, fireball.id);
});

test('rest retains removed restricted pools and suppressed members, resetting only their exhaustion', async () => {
  const saved = [
    { rank: 7, source, spell_list_source: cache, spell_id: fireball.id, exhausted: true, color: 'blue' },
    { rank: 8, source, spell_list_source: otherCache, spell_id: heal.id, exhausted: true, color: 'green' },
  ];
  const input = character([slot('cache', 7, 1, cache)], savedSpells(saved));
  await calculate(input);
  let rested;
  engine.handleRest('CHARACTER', input, (value) => (rested = value));
  assert.deepEqual(
    rested.spells.slots,
    saved.map((slot) => ({ ...slot, exhausted: false }))
  );
  assert.deepEqual(input.spells.slots, saved);
});
