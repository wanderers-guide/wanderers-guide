import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
let engine, rows, entries, content;
before(async () => {
  engine = await createOperationEngine();
  const sql = await readFile(
    new URL('../../supabase/migrations/20261026000000_mine_mod_rules.sql', import.meta.url),
    'utf8'
  );
  entries = JSON.parse(sql.split('$entries$')[1]);
  rows = await readContentRows(entries.map((e) => ({ table: 'ability_block', id: e.id })));
  for (const { row } of rows) row.operations = entries.find((e) => e.id === row.id).operations;
  engine.setFixtures(rows);
  content = {
    abilityBlocks: rows.map((r) => r.row),
    items: [],
    classes: [],
    traits: [],
    ancestries: [],
    backgrounds: [],
    languages: [],
    spells: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    defaultSources: { PAGE: [900], INFO: [900] },
  };
});
after(async () => engine?.cleanup());
const set = (variable, value) => ({ id: `set-${variable}`, type: 'setValue', data: { variable, value } });
const grant = (id) => ({ id: `grant-${id}`, type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: id } });
const createComputers = {
  id: 'computers',
  type: 'createValue',
  data: { variable: 'SKILL_COMPUTERS', type: 'prof', value: { value: 'U', attribute: 'ATTRIBUTE_INT' } },
};
const actor = (operations, selections = {}) => ({
  id: 1,
  level: 12,
  details: {},
  inventory: { items: [] },
  operation_data: { selections },
  options: { custom_operations: true },
  custom_operations: operations,
});
async function calculate(character) {
  return engine._executeCharacterOperations({ character, content, context: 'CHARACTER-BUILDER' });
}
function selection(packet, id) {
  const stack = [packet.ors];
  while (stack.length) {
    const value = stack.pop();
    if (!value || typeof value !== 'object') continue;
    if (value.selection?.id === id) return value.selection;
    stack.push(...Object.values(value));
  }
  throw Error('Selection missing ' + id);
}
for (const [computers, crafting, expected] of [
  ['T', 'T', ['SKILL_COMPUTERS', 'SKILL_CRAFTING']],
  ['E', 'T', ['SKILL_CRAFTING']],
  ['T', 'M', ['SKILL_COMPUTERS']],
  ['E', 'E', ['SKILL_ATHLETICS', 'SKILL_LORE_TEST']],
  ['M', 'L', ['SKILL_ATHLETICS', 'SKILL_LORE_TEST']],
])
  test(`Expert Mechanic ${computers}/${crafting} offers exactly eligible ranks before its grant`, async () => {
    const choice = entries.find((e) => e.id === 59595).operations.find((op) => op.type === 'select');
    const initial = [
      createComputers,
      set('SKILL_COMPUTERS', { value: computers }),
      set('SKILL_CRAFTING', { value: crafting }),
      set('SKILL_ATHLETICS', { value: 'T' }),
      {
        id: 'lore',
        type: 'createValue',
        data: { variable: 'SKILL_LORE_TEST', type: 'prof', value: { value: 'T', attribute: 'ATTRIBUTE_INT' } },
      },
      grant(59595),
    ];
    for (const saved of [undefined, expected[0], 'SKILL_STEALTH', expected[0]]) {
      const character = actor(
        initial,
        saved ? { ['character_grant-59595']: '59595', [`character_grant-59595_${choice.id}`]: saved } : {}
      );
      const packet = await calculate(character);
      assert.deepEqual(
        selection(packet, choice.id)
          .options.map((o) => o.variable)
          .sort(),
        [...expected].sort()
      );
      assert.equal(packet.store.variables.CLASS_DC.value.value, 'E');
      assert.equal(engine.compileProficiencyType(packet.store.variables.SKILL_STEALTH.value), 'U');
      if (saved === expected[0]) assert.equal(engine.compileProficiencyType(packet.store.variables[saved].value), 'E');
    }
  });
for (const [hover, existingFly, expected] of [
  [false, 0, 25],
  [true, 0, 35],
  [false, 40, 40],
  [true, 40, 40],
])
  test(`Aerial Hologram hover=${hover} preserves fly ${existingFly} -> ${expected}`, async () => {
    for (const owned of [true, false, true]) {
      const packet = await calculate(
        actor([
          set('SPEED', 25),
          set('SPEED_FLY', existingFly),
          ...(hover ? [{ id: 'hover', type: 'adjValue', data: { variable: 'HERITAGE_IDS', value: '59401' } }] : []),
          ...(owned ? [grant(59452)] : []),
        ])
      );
      assert.equal(packet.store.variables.SPEED_FLY.value, owned ? expected : existingFly);
    }
  });
test('Tech Core rule text and conditional Acrobatics bonus appear only with the granting feats', async () => {
  const ids = [59681, 58881, 59248, 59685];
  for (const owned of [ids, [], ids]) {
    const packet = await calculate(actor(owned.map(grant)));
    const injected = packet.store.variables.INJECT_TEXT.value.map((text) => JSON.parse(text));
    for (const id of ids) {
      const entry = entries.find((e) => e.id === id);
      for (const op of entry.operations.filter((op) => op.type === 'injectText'))
        assert.equal(
          injected.some((text) => text.id === op.data.id && text.text === op.data.text),
          owned.includes(id)
        );
    }
    const bonuses = packet.store.bonuses.SKILL_ACROBATICS ?? [];
    if (owned.length) assert.ok(JSON.stringify(bonuses).includes('to Maneuver in Flight'));
  }
});

test('Expert Mechanic preferred choices survive old-client predefined and new-client filtered replay', async () => {
  const row = rows.find((r) => r.row.id === 59595).row;
  const updated = structuredClone(row.operations),
    choice = updated.find((op) => op.type === 'select');
  const saved = { 'character_grant-59595': '59595', [`character_grant-59595_${choice.id}`]: 'SKILL_CRAFTING' };
  for (const oldClient of [true, false, true, false]) {
    row.operations = structuredClone(updated);
    if (oldClient) delete row.operations.find((op) => op.type === 'select').data.optionsFilters.skillRules;
    const packet = await calculate(
      actor(
        [createComputers, set('SKILL_COMPUTERS', { value: 'T' }), set('SKILL_CRAFTING', { value: 'T' }), grant(59595)],
        saved
      )
    );
    assert.equal(engine.compileProficiencyType(packet.store.variables.SKILL_CRAFTING.value), 'E');
    assert.equal(
      selection(packet, choice.id).options.find((option) => option.variable === 'SKILL_CRAFTING')._select_uuid,
      'SKILL_CRAFTING'
    );
  }
  row.operations = updated;
});

test('Aerial copies equipped Boots of Bounding and status Speed bonuses without lowering another fly grant', async () => {
  const [{ row: boots }] = await readContentRows([{ table: 'item', id: 6755 }]);
  engine.setFixtures([...rows, { table: 'item', row: boots }]);
  content.items = [boots];
  for (const hover of [false, true])
    for (const fly of [0, 60]) {
      const character = actor([
        set('SPEED', 25),
        set('SPEED_FLY', fly),
        {
          id: 'status-speed',
          type: 'addBonusToValue',
          data: { variable: 'SPEED', value: 10, type: 'status', text: '' },
        },
        ...(hover ? [{ id: 'hover', type: 'adjValue', data: { variable: 'HERITAGE_IDS', value: '59401' } }] : []),
        grant(59452),
      ]);
      character.inventory.items = [{ id: 'boots-fixture', item: boots, is_equipped: true, is_invested: true }];
      const packet = await calculate(character);
      assert.equal(engine.getFinalVariableValue('CHARACTER', 'SPEED').total, 40);
      assert.equal(packet.store.variables.SPEED_FLY.value, Math.max(fly, 40 + (hover ? 10 : 0)));
    }
  engine.setFixtures(rows);
  content.items = [];
});
