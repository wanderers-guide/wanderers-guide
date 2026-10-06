import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(`${frontend}/package.json`);
const ts = require('typescript');
const React = require('react');
const { default: cloneDeep } = await import(require.resolve('lodash-es/cloneDeep.js'));
let engine;
let disintegrate;
let heal;

before(async () => {
  engine = await createOperationEngine({ renderCastSpellDrawer: true });
  const fixtures = await readContentRows([
    { table: 'spell', id: 4571 },
    { table: 'spell', id: 4656 },
  ]);
  engine.setFixtures(fixtures);
  disintegrate = fixtures.find(({ row }) => row.id === 4571).row;
  heal = fixtures.find(({ row }) => row.id === 4656).row;
});
after(async () => engine?.cleanup());

async function source(path) {
  const text = await readFile(`${frontend}/src/${path}`, 'utf8');
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes = [];
  const visit = (node) => {
    nodes.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { file, nodes };
}

function evaluate(file, expression, bindings) {
  if (ts.isFunctionDeclaration(expression)) {
    expression = ts.factory.createFunctionExpression(
      undefined,
      expression.asteriskToken,
      expression.name,
      expression.typeParameters,
      expression.parameters,
      expression.type,
      expression.body
    );
  }
  const printed = ts.createPrinter().printNode(ts.EmitHint.Unspecified, expression, file);
  const javascript = ts.transpileModule(`const value = ${printed};`, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;
  return new Function(...Object.keys(bindings), `${javascript}\nreturn value;`)(...Object.values(bindings));
}

/** Exercise the real list JSX, entry click request and cast drawer; only chrome is omitted. */
async function itemOffering(spell, entity, kind, options = {}) {
  const charData = engine.collectEntitySpellcasting('CHARACTER', entity);
  const list = await source(`pages/character_sheet/panels/spells_list/${kind}SpellsList.tsx`);
  const entries = list.nodes.filter(
    (node) => ts.isJsxSelfClosingElement(node) && node.tagName.getText(list.file) === 'SpellListEntrySection'
  );
  assert.equal(entries.length, 1, `${kind} must have one actual item-spell entry renderer`);
  let mapCallback = entries[0].parent;
  while (mapCallback && !ts.isArrowFunction(mapCallback)) mapCallback = mapCallback.parent;
  assert.ok(mapCallback && ts.isCallExpression(mapCallback.parent));
  assert.equal(mapCallback.parent.expression.name.getText(list.file), 'map');
  const item = options.item ?? entity.inventory.items[0];
  assert.ok(item, 'use the actual saved inventory entry');
  const props = {
    id: 'CHARACTER',
    entity,
    extra: { charData },
    staff: item,
    setEntity: options.setEntity ?? (() => assert.fail('reading or opening a cast must not write the saved character')),
  };
  const callback = evaluate(list.file, mapCallback, {
    React,
    props,
    SpellListEntrySection: () => null,
    SpellSlotSelect: () => null,
    getItemCastingSource: engine.getItemCastingSource,
    isItemBroken: engine.isItemBroken,
    handleUpdateItemCharges: engine.handleUpdateItemCharges,
    collectEntitySpellcasting: engine.collectEntitySpellcasting,
    castingType: options.castingType ?? 'PREPARED',
    currentCharges: item.item.meta_data.charges.current,
    maxCharges: item.item.meta_data.charges.max,
    modals: options.modals ?? { openConfirmModal: () => assert.fail('opening must not overcharge') },
    openContextModal:
      options.openContextModal ?? (() => assert.fail('opening must not choose staff charge conversion')),
    Title: () => null,
  });
  const rendered = callback(
    kind === 'Wand' ? { item, spell: { spell }, charges: { ...item.item.meta_data.charges } } : { spell },
    0
  );
  assert.equal(rendered.type.name, 'SpellListEntrySection');
  assert.equal(rendered.props.spell, spell);
  return { rendered, props, item, charData };
}

async function itemDrawerData(spell, entity, kind, options) {
  const { rendered } = await itemOffering(spell, entity, kind, options);
  const entry = await source('pages/character_sheet/panels/spells_list/SpellListEntrySection.tsx');
  const handlers = entry.nodes.filter((node) => ts.isJsxAttribute(node) && node.name.getText(entry.file) === 'onClick');
  assert.equal(handlers.length, 2);
  const utils = await source('process/spells/spell-utils.ts');
  const ritual = utils.nodes.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'isRitual');
  assert.ok(ritual, 'use the actual ritual predicate, not a replacement constant');
  const isRitual = evaluate(utils.file, ritual, {});
  let opened;
  evaluate(entry.file, handlers[0].initializer.expression, {
    props: rendered.props,
    exhausted: rendered.props.exhausted,
    isRitual,
    openDrawer: (request) => {
      opened = request;
    },
  })();
  assert.equal(opened.type, 'cast-spell');
  assert.equal(opened.data.entity, entity);
  return opened.data;
}

function caster({ attributes = { INT: 4 }, sources = [], list = [], spellData = [], slots = [] } = {}) {
  engine.resetVariables('CHARACTER');
  engine.setVariable('CHARACTER', 'LEVEL', 12);
  engine.setVariable('CHARACTER', 'SPELL_ATTACK', { value: 'E' });
  engine.setVariable('CHARACTER', 'SPELL_DC', { value: 'E' });
  for (const name of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']) {
    engine.setVariable('CHARACTER', `ATTRIBUTE_${name}`, { value: attributes[name] ?? 0, partial: false });
  }
  engine.setVariable('CHARACTER', 'CASTING_SOURCES', sources);
  engine.setVariable(
    'CHARACTER',
    'SPELL_DATA',
    spellData.map((entry) => JSON.stringify(entry))
  );
  engine.setVariable(
    'CHARACTER',
    'SPELL_SLOTS',
    slots.map((entry) => JSON.stringify(entry))
  );
  return {
    level: 12,
    spells: { slots: [], list, innate_casts: [] },
    inventory: {
      items: [
        {
          id: 'saved-item',
          item: {
            id: 12695,
            name: 'Saved casting item',
            description: 'Saved printing and settings must remain unchanged.',
            operations: [],
            meta_data: { hp: 2, broken_threshold: 1, charges: { current: 0, max: 6 }, saved: true },
          },
        },
      ],
    },
    unchanged: { saved: true },
  };
}

function expertCaster(attribute, castingSource) {
  return caster({ attributes: { [attribute.replace('ATTRIBUTE_', '')]: 4 }, sources: [castingSource] });
}

function drawerText(data) {
  const text = engine
    .renderCastSpellDrawer(data)
    .replace(/<[^>]*>/g, '')
    .replaceAll('<!-- -->', '');
  return text.slice(text.indexOf('Attack'), text.indexOf('Traditions'));
}

function displaySpell(spell, overrides = {}) {
  return { ...spell, ...overrides, meta_data: { ...spell.meta_data, image_url: 'unused|||unused|||unused|||unused' } };
}

async function expectContext(spell, entity, kind, expected, options) {
  const before = structuredClone({ entity, spell, variables: engine.getVariables('CHARACTER') });
  const data = await itemDrawerData(spell, entity, kind, options);
  assert.equal(data.tradition, expected.tradition);
  assert.equal(data.attribute, expected.attribute);
  assert.equal(drawerText(data).replace(/\s+/g, ''), expected.math);
  assert.deepEqual({ entity, spell, variables: engine.getVariables('CHARACTER') }, before);
  return data;
}

test('a legal level-12 INT4 expert Wizard wand uses its real source through the actual cast drawer', async () => {
  const entity = expertCaster('ATTRIBUTE_INT', 'WIZARD:::PREPARED-LIST:::ARCANE:::ATTRIBUTE_INT');
  const before = structuredClone(entity);
  const spell = {
    ...disintegrate,
    meta_data: { ...disintegrate.meta_data, image_url: 'unused|||unused|||unused|||unused' },
  };
  const data = await itemDrawerData(spell, entity, 'Wand');
  // Level 12 + expert 4 + Intelligence 4; DC adds 10, MAP subtracts 5/10.
  assert.match(drawerText(data), /Attack\+20 \/ \+15 \/\s*\+10DC30/);
  assert.equal(data.tradition, 'ARCANE');
  assert.equal(data.attribute, 'ATTRIBUTE_INT');
  assert.deepEqual(entity, before);
});

test('a legal level-12 WIS4 expert Cleric staff uses its real source through the actual cast drawer', async () => {
  const entity = expertCaster('ATTRIBUTE_WIS', 'CLERIC:::PREPARED-TRADITION:::DIVINE:::ATTRIBUTE_WIS');
  const before = structuredClone(entity);
  const spell = { ...heal, meta_data: { ...heal.meta_data, image_url: 'unused|||unused|||unused|||unused' } };
  const data = await itemDrawerData(spell, entity, 'Staff');
  // Level 12 + expert 4 + Wisdom 4; staff charge/rank behavior is not replaced.
  assert.match(drawerText(data), /Attack\+20 \/ \+15 \/\s*\+10DC30/);
  assert.equal(data.tradition, 'DIVINE');
  assert.equal(data.attribute, 'ATTRIBUTE_WIS');
  assert.deepEqual(entity, before);
});

test('both item lists select the strongest eligible source, not a stronger irrelevant caster', async () => {
  for (const kind of ['Wand', 'Staff']) {
    const entity = caster({
      attributes: { INT: 3, WIS: 4, CHA: 6 },
      sources: [
        'SORCERER:::SPONTANEOUS-REPERTOIRE:::OCCULT:::ATTRIBUTE_CHA',
        'CLERIC:::PREPARED-TRADITION:::DIVINE:::ATTRIBUTE_INT',
        'DRUID:::PREPARED-TRADITION:::PRIMAL:::ATTRIBUTE_WIS',
      ],
    });
    // Heal is on divine and primal lists, not occult. WIS4 gives 20/30, not CHA6's 22/32.
    await expectContext(displaySpell(heal), entity, kind, {
      tradition: 'PRIMAL',
      attribute: 'ATTRIBUTE_WIS',
      math: 'Attack+20/+15/+10DC30',
    });
  }
});

test('ordinary tradition-list spells need not be learned or in the repertoire, and wands add no rank limit', async () => {
  for (const type of ['PREPARED-LIST', 'SPONTANEOUS-REPERTOIRE']) {
    const entity = caster({
      sources: [`ARCANE_CASTER:::${type}:::ARCANE:::ATTRIBUTE_INT`],
      slots: [{ lvl: 12, rank: 1, amt: 1, source: 'ARCANE_CASTER', opId: 'low-slot' }],
    });
    assert.deepEqual(engine.collectEntitySpellcasting('CHARACTER', entity).list, []);
    // A rank-6 wand can be cast from the arcane list despite only rank-1 slots and no learned entry.
    await expectContext(displaySpell(disintegrate), entity, 'Wand', {
      tradition: 'ARCANE',
      attribute: 'ATTRIBUTE_INT',
      math: 'Attack+20/+15/+10DC30',
    });
  }
});

test('only an exact source-bound NORMAL grant expands an off-tradition spell list', async () => {
  for (const kind of ['Wand', 'Staff']) {
    for (const [grant, expected] of [
      [{ type: 'NORMAL', spellId: 4571, castingSource: 'CLERIC' }, true],
      [{ type: 'NORMAL', spellId: 4571, castingSource: 'FOREIGN' }, false],
      [{ type: 'NORMAL', spellId: 4656, castingSource: 'CLERIC' }, false],
      [{ type: 'NORMAL', spellId: 4571 }, false],
      [{ type: 'FOCUS', spellId: 4571, castingSource: 'CLERIC' }, false],
      [{ type: 'INNATE', spellId: 4571, tradition: 'ARCANE', casts: 1 }, false],
    ]) {
      const entity = caster({
        attributes: { WIS: 4 },
        sources: ['CLERIC:::PREPARED-TRADITION:::DIVINE:::ATTRIBUTE_WIS'],
        spellData: [grant],
      });
      const collected = engine.collectEntitySpellcasting('CHARACTER', entity);
      assert.equal(collected.list.length, grant.type === 'NORMAL' ? 1 : 0);
      assert.equal(collected.focus.length, grant.type === 'FOCUS' ? 1 : 0);
      assert.equal(collected.innate.length, grant.type === 'INNATE' ? 1 : 0);
      // A deity/bloodline's explicit normal grant can expand a list; innate/focus do not.
      await expectContext(
        displaySpell(disintegrate),
        entity,
        kind,
        expected
          ? {
              tradition: 'DIVINE',
              attribute: 'ATTRIBUTE_WIS',
              math: 'Attack+20/+15/+10DC30',
            }
          : { tradition: 'NONE', attribute: 'ATTRIBUTE_CHA', math: 'Attack+16/+11/+6DC26' }
      );
    }
  }
});

test('malformed, focus-only, innate-only and removed sources retain the compatible fallback', async () => {
  for (const kind of ['Wand', 'Staff']) {
    for (const source of [
      'BROKEN',
      ' :::PREPARED-LIST:::ARCANE:::ATTRIBUTE_INT',
      'FOCUS:::FOCUS:::ARCANE:::ATTRIBUTE_INT',
      'INNATE:::-:::ARCANE:::ATTRIBUTE_INT',
      'NONE:::PREPARED-LIST:::NONE:::ATTRIBUTE_INT',
      'BAD_ATTRIBUTE:::PREPARED-LIST:::ARCANE:::LEVEL',
      'MISSING_ATTRIBUTE:::PREPARED-LIST:::ARCANE:::ATTRIBUTE_MISSING',
    ]) {
      const entity = caster({ sources: [source] });
      await expectContext(displaySpell(disintegrate), entity, kind, {
        tradition: 'NONE',
        attribute: 'ATTRIBUTE_CHA',
        math: 'Attack+16/+11/+6DC26',
      });
    }
    const entity = expertCaster('ATTRIBUTE_INT', 'WIZARD:::PREPARED-LIST:::ARCANE:::ATTRIBUTE_INT');
    await expectContext(displaySpell(disintegrate), entity, kind, {
      tradition: 'ARCANE',
      attribute: 'ATTRIBUTE_INT',
      math: 'Attack+20/+15/+10DC30',
    });
    engine.setVariable('CHARACTER', 'CASTING_SOURCES', []);
    await expectContext(displaySpell(disintegrate), entity, kind, {
      tradition: 'NONE',
      attribute: 'ATTRIBUTE_CHA',
      math: 'Attack+16/+11/+6DC26',
    });
  }
});

test('one source supplies both numbers, with existing modifier stacking and MAP unchanged', async () => {
  for (const kind of ['Wand', 'Staff']) {
    for (const [dexterity, attribute, math] of [
      [3, 'ATTRIBUTE_INT', 'Attack+23/+18/+13DC32'],
      [4, 'ATTRIBUTE_DEX', 'Attack+27/+22/+17DC32'],
    ]) {
      const entity = caster({
        attributes: { INT: 4, DEX: dexterity },
        sources: [
          'INT_CASTER:::PREPARED-LIST:::ARCANE:::ATTRIBUTE_INT',
          'DEX_CASTER:::PREPARED-LIST:::ARCANE:::ATTRIBUTE_DEX',
        ],
      });
      // Attribute-specific custom sources are supported by existing source definitions.
      // INT's higher DC wins at DEX3 even though DEX has the stronger attack; no mixed pair.
      engine.addVariableBonus('CHARACTER', 'DEX_ATTACK_ROLLS_BONUS', 4, 'item', '', 'Dex item');
      engine.addVariableBonus('CHARACTER', 'RANGED_ATTACK_ROLLS_BONUS', 1, 'circumstance', '', 'Range bonus');
      engine.addVariableBonus('CHARACTER', 'ATTACK_ROLLS_BONUS', 2, 'status', '', 'Strong status');
      engine.addVariableBonus('CHARACTER', 'ATTACK_ROLLS_BONUS', 1, 'status', '', 'Weak status');
      engine.addVariableBonus('CHARACTER', 'SPELL_DC', 2, 'status', '', 'DC status');
      await expectContext(displaySpell(disintegrate), entity, kind, { tradition: 'ARCANE', attribute, math });
    }
  }
});

test('equal attack and DC keep the first actual collected source deterministically', async () => {
  const sources = [
    'Z_CASTER:::PREPARED-LIST:::ARCANE:::ATTRIBUTE_INT',
    'A_CASTER:::PREPARED-LIST:::ARCANE:::ATTRIBUTE_WIS',
  ];
  for (const kind of ['Wand', 'Staff']) {
    for (const input of [sources, [...sources].reverse()]) {
      const entity = caster({ attributes: { INT: 4, WIS: 4 }, sources: input });
      assert.equal(engine.collectEntitySpellcasting('CHARACTER', entity).sources[0].name, 'A_CASTER');
      await expectContext(displaySpell(disintegrate), entity, kind, {
        tradition: 'ARCANE',
        attribute: 'ATTRIBUTE_WIS',
        math: 'Attack+20/+15/+10DC30',
      });
    }
  }
});

test('reading and opening does not write items; real wand and prepared staff casts only spend their existing charges', async () => {
  for (const [kind, initialMax, spent] of [
    ['Wand', 1, 1],
    ['Staff', 6, 3],
  ]) {
    const entity = expertCaster('ATTRIBUTE_WIS', 'CLERIC:::PREPARED-TRADITION:::DIVINE:::ATTRIBUTE_WIS');
    entity.inventory.items[0].item.meta_data.charges.max = initialMax;
    const before = structuredClone(entity);
    let state = entity;
    let writes = 0;
    const setEntity = (update) => {
      writes++;
      state = update(state);
    };
    const data = await itemDrawerData(displaySpell(heal, { rank: 3 }), entity, kind, { setEntity });
    assert.equal(writes, 0);
    assert.deepEqual(state, before);
    assert.equal(drawerText(data).replace(/\s+/g, ''), 'Attack+20/+15/+10DC30');
    data.onCastSpell(true);
    assert.equal(writes, 1);
    const expected = structuredClone(before);
    expected.inventory.items[0].item.meta_data.charges.current = spent;
    assert.deepEqual(state, expected);
    assert.deepEqual(entity, before, 'immutable saved input is not changed');
  }
});

test('spontaneous staff choices retain rank-charge and one-charge-plus-slot conversion', async () => {
  for (const option of ['NORMAL', 'SLOT-CONSUME']) {
    const entity = caster({
      attributes: { CHA: 4 },
      sources: ['SORCERER:::SPONTANEOUS-REPERTOIRE:::DIVINE:::ATTRIBUTE_CHA'],
      slots: [{ lvl: 12, rank: 3, amt: 1, source: 'SORCERER', opId: 'staff-slot' }],
    });
    const before = structuredClone(entity);
    const collected = engine.collectEntitySpellcasting('CHARACTER', entity);
    assert.equal(collected.slots.length, 1);
    let state = entity;
    let writes = 0;
    let modal;
    const data = await itemDrawerData(displaySpell(heal, { rank: 3 }), entity, 'Staff', {
      castingType: 'SPONTANEOUS',
      setEntity: (update) => {
        writes++;
        state = update(state);
      },
      openContextModal: (request) => {
        assert.equal(modal, undefined);
        modal = request;
      },
    });
    assert.equal(writes, 0);
    data.onCastSpell(true);
    assert.equal(writes, 0, 'no charge or slot is spent before choosing');
    assert.equal(modal.modal, 'selectStaffCasting');
    assert.equal(modal.innerProps.canCastNormally, true);
    modal.innerProps.onSelect(option, 3);
    const expected = structuredClone(before);
    expected.inventory.items[0].item.meta_data.charges.current = option === 'NORMAL' ? 3 : 1;
    if (option === 'SLOT-CONSUME') expected.spells.slots = [{ ...collected.slots[0], exhausted: true }];
    assert.equal(writes, option === 'NORMAL' ? 1 : 2);
    assert.deepEqual(state, expected);
    assert.deepEqual(entity, before);
  }
});

test('the actual staff mount effect retains its existing greatest-slot charge initialization', async () => {
  const staff = await source('pages/character_sheet/panels/spells_list/StaffSpellsList.tsx');
  const effects = staff.nodes.filter(
    (node) => ts.isCallExpression(node) && node.expression.getText(staff.file) === 'useEffect'
  );
  assert.equal(effects.length, 1);
  for (const [initialMax, expectedWrites] of [
    [3, 0],
    [2, 1],
  ]) {
    const entity = caster({
      attributes: { WIS: 4 },
      sources: ['CLERIC:::PREPARED-TRADITION:::DIVINE:::ATTRIBUTE_WIS'],
      slots: [{ lvl: 12, rank: 3, amt: 1, source: 'CLERIC', opId: 'prepared-slot' }],
    });
    entity.inventory.items[0].item.meta_data.charges.max = initialMax;
    const before = structuredClone(entity);
    let state = entity;
    let writes = 0;
    const { props } = await itemOffering(displaySpell(heal), entity, 'Staff', {
      setEntity: (update) => {
        writes++;
        state = update(state);
      },
    });
    assert.equal(writes, 0, 'source selection does not initialize charges');
    assert.deepEqual(
      engine.collectEntitySpellcasting('CHARACTER', entity).slots.map((slot) => slot.rank),
      [3]
    );
    evaluate(staff.file, effects[0], {
      props,
      greatestSlotRank: 3,
      maxCharges: initialMax,
      handleUpdateItemCharges: engine.handleUpdateItemCharges,
      useEffect: (callback) => callback(),
    });
    const expected = structuredClone(before);
    expected.inventory.items[0].item.meta_data.charges.max = 3;
    assert.equal(writes, expectedWrites);
    assert.deepEqual(state, expected);
    assert.deepEqual(entity, before);
  }
});

test('the actual prepared-staff extra-charge choice preserves slot use and delayed charge write', async () => {
  const entity = caster({
    attributes: { WIS: 4 },
    sources: ['CLERIC:::PREPARED-TRADITION:::DIVINE:::ATTRIBUTE_WIS'],
    slots: [{ lvl: 12, rank: 3, amt: 1, source: 'CLERIC', opId: 'prepared-slot' }],
  });
  entity.inventory.items[0].item.meta_data.charges.max = 3;
  const before = structuredClone(entity);
  const collected = engine.collectEntitySpellcasting('CHARACTER', entity);
  assert.deepEqual(
    collected.slots.map(({ id, rank, source }) => ({ id, rank, source })),
    [{ id: 'CHARACTER-spell-slot-0', rank: 3, source: 'CLERIC' }]
  );
  let state = entity;
  let writes = 0;
  let modal;
  const scheduled = [];
  const { props } = await itemOffering(displaySpell(heal), entity, 'Staff', {
    setEntity: (update) => {
      writes++;
      state = update(state);
    },
  });
  const staff = await source('pages/character_sheet/panels/spells_list/StaffSpellsList.tsx');
  const clicks = staff.nodes.filter((node) => ts.isJsxAttribute(node) && node.name.getText(staff.file) === 'onClick');
  assert.equal(clicks.length, 1, 'the real Add Charges handler');
  evaluate(staff.file, clicks[0].initializer.expression, {
    props,
    React,
    Title: () => null,
    cloneDeep,
    collectEntitySpellcasting: engine.collectEntitySpellcasting,
    handleUpdateItemCharges: engine.handleUpdateItemCharges,
    openContextModal: (request) => {
      modal = request;
    },
    // Time is the boundary: inspect the exact delayed callback before advancing it.
    setTimeout: (callback, delay) => {
      scheduled.push({ callback, delay });
    },
  })({ stopPropagation() {}, preventDefault() {} });
  assert.equal(modal.modal, 'selectSpellSlot');
  assert.equal(writes, 0);
  modal.innerProps.onSelect(collected.slots[0]);
  assert.equal(writes, 1);
  assert.deepEqual(
    scheduled.map(({ delay }) => delay),
    [250]
  );
  const slotExpected = structuredClone(before);
  slotExpected.spells.slots = [{ ...collected.slots[0], exhausted: true }];
  assert.deepEqual(state, slotExpected);
  scheduled[0].callback();
  slotExpected.inventory.items[0].item.meta_data.charges.max = 6;
  assert.equal(writes, 2);
  assert.deepEqual(state, slotExpected);
  assert.deepEqual(entity, before);
});
