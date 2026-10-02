import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createOperationEngine } from './operation-test-harness.mjs';

// Official identities and structured equipment fields only. Descriptions are not fixtures.
const armorFields = [
  { id: 12000, name: "Faerie Queen's Bower", category: 'light', dex_cap: 4, ac_bonus: 1 },
  { id: 12147, name: 'Leaf Weave', category: 'light', dex_cap: 4, ac_bonus: 1 },
  { id: 12175, name: 'Living Leaf Weave', category: 'light', dex_cap: 4, ac_bonus: 1 },
  { id: 12399, name: 'Shared-Pain Sankeit', category: 'light', dex_cap: 3, ac_bonus: 2 },
  { id: 12732, name: 'Wooden Breastplate', category: 'medium', dex_cap: 2, ac_bonus: 3 },
];
let engine;
let sequence = 0;

/** Construct a synthetic inventory occurrence without changing its official content identity. */
function inventoryItem(item, flags = {}, suffix = '') {
  return {
    id: `equipment-${item.id}${suffix}`,
    item,
    is_equipped: true,
    is_invested: true,
    is_implanted: false,
    is_formula: false,
    container_contents: [],
    ...flags,
  };
}

/** Run the actual controller with only the small explicit official-content fixture boundary. */
async function calculate(items) {
  const content = {
    classes: [],
    ancestries: [],
    backgrounds: [],
    abilityBlocks: [],
    languages: [],
    spells: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    traits: [],
    items: items.map((entry) => entry.item),
    defaultSources: { PAGE: [16], INFO: [16] },
  };
  engine.setFixtures(content.items.map((row) => ({ table: 'item', row })));
  const character = {
    id: 990016,
    name: 'Equipment fixture',
    level: 6,
    hp_current: 1,
    details: { conditions: [] },
    inventory: { items },
    operation_data: { selections: {} },
    content_sources: { enabled: [16] },
    meta_data: { reset_hp: false },
    options: { custom_operations: true, ignore_bulk_limit: true },
    custom_operations: [
      { id: `light-${++sequence}`, type: 'setValue', data: { variable: 'LIGHT_ARMOR', value: { value: 'T' } } },
      { id: `dex-${++sequence}`, type: 'setValue', data: { variable: 'ATTRIBUTE_DEX', value: { value: 3 } } },
    ],
  };
  const result = await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-SHEET' });
  assert.deepEqual(result.errors, []);
  engine.importVariableStore('CHARACTER', result.store);
  return result;
}

/** Minimal official Devil's Bargain armor with its reviewed remaster trait set. */
function devilsBargain() {
  return {
    id: 11925,
    name: "Devil's Bargain",
    content_source_id: 16,
    group: 'ARMOR',
    traits: [1527, 1504, 1846],
    operations: null,
    meta_data: {
      category: 'light',
      group: 'leather',
      dex_cap: 3,
      ac_bonus: 2,
      strength: 1,
      check_penalty: -1,
      speed_penalty: 0,
      runes: { potency: 1, resilient: 0, property: [] },
    },
  };
}

before(async () => {
  engine = await createOperationEngine();
});
after(async () => engine?.cleanup());

test('armor classifications expose all five entries only in armor-specific proficiency choices', async () => {
  const items = armorFields.map(({ id, name, ...meta_data }) => ({
    id,
    name,
    content_source_id: 16,
    group: 'ARMOR',
    traits: [],
    operations: [],
    meta_data,
  }));
  engine.setFixtures(items.map((row) => ({ table: 'item', row })));
  const original = structuredClone(items);
  const filter = (group) => ({ id: 'equipment-filter', type: 'ADJ_VALUE', group, value: { value: 'T' } });
  const armorOptions = await engine.determineFilteredSelectionList('CHARACTER', 'armor-options', filter('ARMOR'));
  const weaponOptions = await engine.determineFilteredSelectionList('CHARACTER', 'weapon-options', filter('WEAPON'));
  assert.deepEqual(new Set(armorOptions.map((entry) => entry.name)), new Set(items.map((item) => item.name)));
  assert.deepEqual(weaponOptions, []);
  assert.deepEqual(items, original);
});

test('Devils Bargain investment gates magical potency but preserves the physical armor', async () => {
  const item = devilsBargain();
  const original = structuredClone(item);
  await calculate([inventoryItem(item, { is_invested: false })]);
  assert.equal(engine.isItemInvestable(item), true);
  assert.equal(engine.getAcParts('CHARACTER', item).armorBonus, 2);
  await calculate([inventoryItem(item)]);
  assert.equal(engine.getAcParts('CHARACTER', item).armorBonus, 3);
  await calculate([inventoryItem(item, { is_equipped: false })]);
  assert.equal(engine.getAcParts('CHARACTER', item).armorBonus, 2);
  assert.deepEqual(item, original);
});

test('multiple armor occurrences cannot stack potency or activate an uninvested copy', async () => {
  const item = devilsBargain();
  await calculate([inventoryItem(item), inventoryItem(structuredClone(item), {}, '-second')]);
  assert.equal(engine.getAcParts('CHARACTER', item).armorBonus, 3);
  await calculate([
    inventoryItem(item, { is_invested: false }),
    inventoryItem(structuredClone(item), { is_invested: false }, '-second'),
  ]);
  assert.equal(engine.getAcParts('CHARACTER', item).armorBonus, 2);
});

test('Faerie Queens Bower keeps inherited Laminar while investment gates fundamental runes', async () => {
  const item = {
    id: 12000,
    name: "Faerie Queen's Bower",
    content_source_id: 16,
    group: 'ARMOR',
    traits: [1475, 1630, 1613, 2860, 1527],
    operations: null,
    meta_data: {
      category: 'light',
      group: 'wood',
      dex_cap: 4,
      ac_bonus: 1,
      strength: 0,
      check_penalty: -1,
      speed_penalty: 0,
      runes: { potency: 2, resilient: 1, property: [] },
    },
  };
  const original = structuredClone(item);
  await calculate([inventoryItem(item, { is_invested: false })]);
  assert.equal(engine.getAcParts('CHARACTER', item).armorBonus, 1);
  assert.equal(engine.getVariableBonuses('CHARACTER', 'SAVE_FORT').length, 0);
  await calculate([inventoryItem(item)]);
  assert.equal(engine.getAcParts('CHARACTER', item).armorBonus, 3);
  assert.equal(engine.getVariableBonuses('CHARACTER', 'SAVE_FORT').filter((bonus) => bonus.value === 1).length, 1);
  assert.ok(item.traits.includes(2860));
  assert.deepEqual(item, original);
});

test('Shared Pain Sankeit has its canonical +2 potency without stacking resilience or altering base defenses', async () => {
  const item = {
    ...devilsBargain(),
    id: 12399,
    name: 'Shared-Pain Sankeit',
    traits: [1558, 1527, 2860, 1504],
    meta_data: {
      ...devilsBargain().meta_data,
      group: 'wood',
      runes: { potency: 2, resilient: 1, property: [] },
    },
  };
  const original = structuredClone(item);
  await calculate([inventoryItem(item)]);
  assert.equal(engine.getAcParts('CHARACTER', item).armorBonus, 4);
  assert.equal(engine.getVariableBonuses('CHARACTER', 'SAVE_FORT').filter((bonus) => bonus.value === 1).length, 1);
  await calculate([inventoryItem(item, { is_invested: false })]);
  assert.equal(engine.getAcParts('CHARACTER', item).armorBonus, 2);
  assert.equal(engine.getVariableBonuses('CHARACTER', 'SAVE_FORT').length, 0);
  assert.deepEqual(item, original);
});
