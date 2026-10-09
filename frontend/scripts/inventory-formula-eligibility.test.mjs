import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { InventorySchema, ItemSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const rows = await readContentRows([
  ...[11744, 11745, 11746, 6724, 16929, 22344, 7068, 12605].map((id) => ({ table: 'item', id })),
  ...[19894, 20319, 20270].map((id) => ({ table: 'ability_block', id })),
  ...[1546, 1527, 4550, 4002, 1665, 2570].map((id) => ({ table: 'trait', id })),
]);
const row = (table, id) => structuredClone(rows.find((entry) => entry.table === table && entry.row.id === id).row);
const bonus = (variable, value, text = '', type = 'item') => ({
  id: crypto.randomUUID(),
  type: 'addBonusToValue',
  data: { variable, value, text, type },
});
const setAttribute = (variable, value) => ({
  id: crypto.randomUUID(),
  type: 'setValue',
  data: { variable, value: { value } },
});
const staff = row('item', 11746);
const toolkit = row('item', 6724);
const cloak = row('item', 16929);
const plushie = row('item', 22344);
const armor = row('item', 7068);
const wand = row('item', 12605);
// Exercise the actual current staff rows, including the later complete-book prose repair.
const beastMigration = await readFile(
  new URL('../../supabase/migrations/20261001110000_treasure_vault_beast_staff_repairs.sql', import.meta.url),
  'utf8'
);
const beastSpec = JSON.parse(beastMigration.split('$beast$')[1]);
const displayMigration = await readFile(
  new URL('../../supabase/migrations/20261002101000_treasure_vault_complete_display.sql', import.meta.url),
  'utf8'
);
const displaySpec = JSON.parse(displayMigration.split('$display101$')[1]);
const upgradedStaves = beastSpec.items.map((patch) => {
  const item = row('item', patch.id);
  const expected = displaySpec.catalog.find((entry) => entry.table === 'item' && entry.id === item.id)?.after;
  assert.ok(expected, `Current Beast Staff ${item.id} has a complete reviewed book tuple`);
  const { updated_at, search_tsv, ...actual } = item;
  actual.uuid = String(actual.uuid);
  actual.created_at = actual.created_at.replace(' ', 'T').replace(/\+00$/, '+00:00');
  assert.deepEqual(actual, expected, `Current Beast Staff ${item.id} remains exactly reviewed`);
  assert.deepEqual(item.operations, patch.operations.after, 'Later prose edits preserve the passive operation');
  return item;
});

// Full local homebrew clones exercise equipment/grant shapes, not new published rules.
const homebrew = {
  ...toolkit,
  id: 990046,
  name: 'Homebrew crafting tool',
  content_source_id: 990046,
  operations: [bonus('SKILL_CRAFTING', 2, '', 'circumstance')],
};
const propertyRune = { ...toolkit, id: 990044, name: 'Local property rune', operations: [bonus('SKILL_ATHLETICS', 3)] };
const upgrade = { ...toolkit, id: 990045, name: 'Local armor upgrade', operations: [bonus('SKILL_STEALTH', 2)] };
const implant = {
  ...toolkit,
  id: 990047,
  name: 'Local augmentation',
  traits: [4550],
  operations: [bonus('SKILL_ACROBATICS', 2)],
};
const weapon = {
  ...toolkit,
  id: 990048,
  name: 'Local spear',
  group: 'WEAPON',
  traits: [],
  meta_data: { bulk: {}, category: 'simple', group: 'spear', damage: { dice: 1, die: 'd6', damageType: 'piercing' } },
  operations: [bonus('SKILL_ATHLETICS', 1)],
};
const shield = {
  ...toolkit,
  id: 990049,
  name: 'Local shield',
  group: 'SHIELD',
  traits: [],
  meta_data: { bulk: {}, ac_bonus: 2 },
  operations: [bonus('SKILL_ATHLETICS', 1)],
};
const pack = {
  ...toolkit,
  id: 990050,
  name: 'Local pack',
  operations: [],
  traits: [],
  meta_data: { bulk: { capacity: 4 } },
};
const dynamicArmors = [
  { ...armor, operations: [], meta_data: { ...armor.meta_data, runes: { potency: 2, resilient: 1, property: [] } } },
  {
    ...armor,
    operations: [],
    meta_data: {
      ...armor.meta_data,
      runes: { potency: 1, property: [{ id: propertyRune.id, name: propertyRune.name }] },
    },
  },
  {
    ...armor,
    operations: [],
    meta_data: {
      ...armor.meta_data,
      starfinder: { grade: 'ADVANCED', slots: [{ id: upgrade.id, name: upgrade.name }] },
    },
  },
  { ...armor, operations: [], traits: [4002], meta_data: { ...armor.meta_data, runes: {} } },
];
const content = {
  defaultSources: { PAGE: [], INFO: [] },
  classes: [],
  ancestries: [],
  backgrounds: [],
  abilityBlocks: rows.filter((entry) => entry.table === 'ability_block').map((entry) => entry.row),
  items: [
    staff,
    ...upgradedStaves,
    toolkit,
    cloak,
    plushie,
    armor,
    wand,
    homebrew,
    propertyRune,
    upgrade,
    implant,
    weapon,
    shield,
    pack,
  ],
  traits: rows.filter((entry) => entry.table === 'trait').map((entry) => entry.row),
  sources: [],
  languages: [],
  spells: [],
  archetypes: [],
  versatileHeritages: [],
  classArchetypes: [],
};
const entry = (item, flags = {}) => ({
  id: crypto.randomUUID(),
  item: structuredClone(item),
  is_formula: false,
  is_equipped: false,
  is_invested: false,
  is_implanted: false,
  container_contents: [],
  ...flags,
});
const inventory = (items) => ({ coins: { cp: 0, sp: 0, gp: 0, pp: 0 }, items });
const actor = (items, operations = []) => ({
  id: 990033,
  name: 'Inventory eligibility',
  level: 5,
  details: {},
  inventory: inventory(items),
  operation_data: {},
  meta_data: {},
  variants: {},
  options: { custom_operations: true, ignore_bulk_limit: true },
  custom_operations: operations,
});
const creature = (items, operations = []) => ({
  id: 990034,
  name: 'Inventory companion',
  level: 5,
  details: {},
  inventory: inventory(items),
  operation_data: {},
  meta_data: {},
  operations,
  abilities_base: [],
  abilities_added: [],
});
const contexts = ['CHARACTER-SHEET', 'CHARACTER-BUILDER', 'CREATURE'];
const storeId = (context) => (context === 'CREATURE' ? 'inventory-companion' : 'CHARACTER');
let engine;
before(async () => {
  for (const item of [...content.items, ...dynamicArmors]) ItemSchema.parse(item);
  engine = await createOperationEngine();
  engine.setFixtures([
    ...rows,
    ...content.items.filter((item) => item.id >= 990000).map((item) => ({ table: 'item', row: item })),
  ]);
});
after(async () => engine?.cleanup());

async function calculate(context, items = [], operations = []) {
  const entity = context === 'CREATURE' ? creature(items, operations) : actor(items, operations);
  InventorySchema.parse(entity.inventory);
  const saved = structuredClone(entity);
  engine.clearOperationErrorNotifications();
  const ors = await engine.executeOperations(
    context === 'CREATURE'
      ? { type: 'CREATURE', data: { id: storeId(context), creature: entity, content } }
      : { type: 'CHARACTER', data: { character: entity, content, context } },
    { directExecution: true }
  );
  assert.deepEqual(entity, saved, 'calculation must not rewrite any saved formula or physical child');
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  return { ors, store: engine.exportVariableStore(storeId(context)), entity };
}
const benefits = ({ ors, store }) => ({
  items: ors.itemResults.map((result) => result.baseSource.id),
  bonuses: Object.fromEntries(
    Object.entries(store.bonuses)
      .filter(([, bonuses]) => bonuses.length)
      .map(([name, bonuses]) => [name, bonuses.map(({ timestamp, ...bonus }) => bonus)])
  ),
  resistances: store.variables.RESISTANCES.value,
  immunities: store.variables.IMMUNITIES.value,
  fly: store.variables.SPEED_FLY.value,
});

test('public character sheet, builder and creature controllers exclude formula passives, including all Beast Staff tiers', async () => {
  await calculate('CHARACTER-SHEET'); // Establish the public parent store before a companion executes.
  for (const context of contexts) {
    const baseline = benefits(await calculate(context));
    for (const item of [staff, ...upgradedStaves]) {
      const physical = entry(item, { is_equipped: true });
      const result = await calculate(context, [physical]);
      assert.deepEqual(
        result.ors.itemResults.map((result) => result.baseSource.id),
        [item.id]
      );
      assert.deepEqual(engine.getVariableBreakdown(storeId(context), 'SKILL_DIPLOMACY').conditionals, [
        {
          text: `+${item.id === 11746 ? 1 : 2} circumstance bonus to checks using Animal Empathy`,
          source: item.name,
        },
      ]);
      assert.deepEqual(benefits(await calculate(context, [{ ...physical, is_formula: true }])), baseline);
      assert.deepEqual(engine.getVariableBreakdown(storeId(context), 'SKILL_DIPLOMACY').conditionals, []);
      assert.deepEqual(benefits(await calculate(context, [entry(item)])), baseline);
      assert.deepEqual(benefits(await calculate(context)), baseline);
    }
  }
});

test('formula exclusion applies before equipment-group, investment, implantation and dynamic rune/upgrade grants', async () => {
  const physicalCases = [
    entry(toolkit),
    entry(homebrew),
    entry(cloak, { is_invested: true }),
    entry(plushie, { is_invested: true }),
    entry(implant, { is_implanted: true }),
    entry(weapon, { is_equipped: true }),
    entry(shield, { is_equipped: true }),
    ...dynamicArmors.map((item) => entry(item, { is_equipped: true })),
  ];
  for (const context of contexts) {
    const baseline = benefits(await calculate(context));
    for (const physical of physicalCases) {
      const result = await calculate(context, [physical]);
      assert.deepEqual(
        result.ors.itemResults.map((result) => result.baseSource.id),
        [physical.item.id]
      );
      assert.notDeepEqual(benefits(result), baseline);
      assert.deepEqual(benefits(await calculate(context, [{ ...physical, is_formula: true }])), baseline);
      // Formula status wins even if a saved record has every physical flag enabled.
      assert.deepEqual(
        benefits(
          await calculate(context, [
            { ...physical, is_formula: true, is_equipped: true, is_invested: true, is_implanted: true },
          ])
        ),
        baseline
      );
    }
    await calculate(context, [entry(dynamicArmors[0], { is_equipped: true })]);
    assert.equal(engine.getFinalVariableValue(storeId(context), 'AC_BONUS').total, 2);
    for (const save of ['SAVE_FORT', 'SAVE_REFLEX', 'SAVE_WILL'])
      assert.equal(Number(engine.getVariableBonuses(storeId(context), save)[0].value), 1);
    await calculate(context, [entry(dynamicArmors[1], { is_equipped: true })]);
    assert.equal(engine.getVariableBreakdown(storeId(context), 'SKILL_ATHLETICS').bonusValue, 3);
    await calculate(context, [entry(dynamicArmors[2], { is_equipped: true })]);
    assert.equal(engine.getVariableBreakdown(storeId(context), 'SKILL_STEALTH').bonusValue, 2);
    assert.equal(engine.getFinalVariableValue(storeId(context), 'AC_BONUS').total, 1);
    await calculate(context, [entry(dynamicArmors[3], { is_equipped: true })]);
    assert.equal(Number(engine.getVariableBonuses(storeId(context), 'SAVE_FORT')[0].value), 1);
  }
});

test('saved physical children survive formula containers; contained formulas are inert and held-location rules stay unchanged', async () => {
  for (const context of contexts) {
    const baseline = benefits(await calculate(context));
    const physicalChild = entry(toolkit);
    const formulaParent = entry(pack, { is_formula: true, container_contents: [physicalChild] });
    const saved = structuredClone(formulaParent);
    assert.deepEqual(
      benefits(await calculate(context, [formulaParent])),
      benefits(await calculate(context, [physicalChild]))
    );
    assert.deepEqual(formulaParent, saved);
    for (const child of [
      entry(toolkit, { is_formula: true }),
      entry(plushie, { is_formula: true, is_invested: true }),
      entry(staff, { is_formula: true, is_equipped: true }),
    ])
      assert.deepEqual(benefits(await calculate(context, [entry(pack, { container_contents: [child] })])), baseline);
    assert.deepEqual(
      (
        await calculate(context, [entry(pack, { container_contents: [entry(plushie, { is_invested: true })] })])
      ).ors.itemResults.map((result) => result.baseSource.id),
      [plushie.id]
    );
    assert.deepEqual(
      benefits(await calculate(context, [entry(pack, { container_contents: [entry(staff, { is_equipped: true })] })])),
      baseline
    );
  }
});

test('physical/formula duplicate order, item removal and explicit typed bonuses remain source- and entity-local', async () => {
  const explicit = bonus('SKILL_CRAFTING', 4, '', 'status');
  for (const context of contexts) {
    const physical = entry(homebrew);
    const formula = entry(homebrew, { is_formula: true });
    const expected = benefits(await calculate(context, [physical], [explicit]));
    assert.equal(engine.getVariableBreakdown(storeId(context), 'SKILL_CRAFTING').bonusValue, 6);
    for (const items of [
      [formula, physical],
      [physical, formula],
    ]) {
      assert.deepEqual(benefits(await calculate(context, items, [explicit])), expected);
      assert.deepEqual(
        engine.getVariableBonuses(storeId(context), 'SKILL_CRAFTING').map((bonus) => bonus.source),
        [context === 'CREATURE' ? 'Inventory companion' : 'Custom', homebrew.name]
      );
    }
    const remaining = await calculate(context, [formula], [explicit]);
    assert.deepEqual(remaining.ors.itemResults, []);
    assert.equal(engine.getVariableBreakdown(storeId(context), 'SKILL_CRAFTING').bonusValue, 4);
    assert.deepEqual(benefits(await calculate(context, [], [explicit])), benefits(remaining));
  }
  await calculate('CHARACTER-SHEET', [entry(homebrew)]);
  const parent = structuredClone(engine.exportVariableStore('CHARACTER'));
  await calculate('CREATURE', [entry(homebrew, { is_formula: true })]);
  assert.deepEqual(engine.exportVariableStore('CHARACTER'), parent);
  assert.equal(engine.getVariableBreakdown('inventory-companion', 'SKILL_CRAFTING').bonusValue, 0);
});

test('formula crafting knowledge feats and explicit companion ability grants remain executable', async () => {
  for (const id of [19894, 20319, 20270]) {
    const ability = row('ability_block', id);
    const entity = creature([entry(toolkit, { is_formula: true })]);
    entity.abilities_base = [ability];
    const saved = structuredClone(entity);
    const result = await engine.executeOperations(
      { type: 'CREATURE', data: { id: 'formula-knowledge', creature: entity, content } },
      { directExecution: true }
    );
    assert.equal(result.abilityResults[0].baseSource.id, id);
    assert.deepEqual(result.itemResults, []);
    assert.deepEqual(entity, saved);
  }
  const ability = {
    ...row('ability_block', 19894),
    id: 990052,
    name: 'Local companion ability',
    operations: [bonus('SKILL_CRAFTING', 3, '', 'status')],
  };
  const entity = creature([entry(homebrew, { is_formula: true })]);
  entity.abilities_added = [ability.id];
  const result = await engine.executeOperations(
    {
      type: 'CREATURE',
      data: {
        id: 'formula-ability',
        creature: entity,
        content: { ...content, abilityBlocks: [...content.abilityBlocks, ability] },
      },
    },
    { directExecution: true }
  );
  assert.equal(result.abilityResults[0].baseSource.id, ability.id);
  assert.deepEqual(result.itemResults, []);
  assert.equal(engine.getVariableBreakdown('formula-ability', 'SKILL_CRAFTING').bonusValue, 3);
  assert.equal(engine.getVariableBonuses('formula-ability', 'SKILL_CRAFTING')[0].source, ability.name);
});

test('new formula packs have no default physical contents, while physical insertion and giveItem still materialize healthy independent contents', async () => {
  const child = { ...toolkit, meta_data: { ...toolkit.meta_data, hp: 0, hp_max: 40, quantity: 1 } };
  const kit = {
    ...pack,
    meta_data: { ...pack.meta_data, container_default_items: [{ id: child.id, name: child.name, quantity: 3 }] },
  };
  const savedKit = structuredClone(kit);
  const savedChild = structuredClone(child);
  engine.setFixtures([
    ...rows.filter((entry) => !(entry.table === 'item' && entry.row.id === child.id)),
    ...content.items.filter((item) => item.id >= 990000).map((item) => ({ table: 'item', row: item })),
    { table: 'item', row: child },
  ]);
  try {
    for (const makeActor of [actor, creature]) {
      let entity = makeActor([]);
      const setter = (update) => {
        entity = typeof update === 'function' ? update(entity) : update;
      };
      await engine.handleAddItem(setter, kit, true);
      const learned = entity.inventory.items[0];
      assert.equal(learned.is_formula, true);
      assert.equal(learned.is_equipped, false);
      assert.equal(learned.is_invested, false);
      assert.equal(learned.is_implanted, false);
      assert.deepEqual(learned.container_contents, []);
      await engine.handleAddItem(setter, kit, false);
      await engine.handleAddItem(setter, kit, false);
      const physical = entity.inventory.items.filter((entry) => !entry.is_formula);
      assert.equal(physical.length, 2);
      for (const item of physical) {
        assert.equal(item.container_contents[0].is_formula, false);
        assert.equal(item.container_contents[0].item.meta_data.hp, 40);
        assert.equal(item.container_contents[0].item.meta_data.quantity, 3);
      }
      assert.notEqual(physical[0].id, physical[1].id);
      assert.notEqual(physical[0].container_contents[0].id, physical[1].container_contents[0].id);
      InventorySchema.parse(entity.inventory);
    }
    assert.deepEqual(kit, savedKit);
    assert.deepEqual(child, savedChild);
    // giveItem has an item ID, not a learned-formula discriminator; its materialization remains physical.
    for (const context of contexts) {
      const give = { id: crypto.randomUUID(), type: 'giveItem', data: { itemId: kit.id } };
      let { entity } = await calculate(context, [entry(kit, { is_formula: true })], [give]);
      assert.ok(engine.getVariable(storeId(context), 'EXTRA_ITEM_IDS').value.includes(String(kit.id)));
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Physical grant did not materialize')), 3000);
        engine.addExtraItems(storeId(context), [kit, child], entity, (update) => {
          entity = typeof update === 'function' ? update(entity) : update;
          clearTimeout(timeout);
          resolve();
        });
      });
      const granted = entity.inventory.items.find((entry) => entry.id === `extra-item-${kit.id}`);
      assert.equal(granted.is_formula, false);
      assert.equal(granted.container_contents[0].is_formula, false);
      assert.equal(granted.container_contents[0].item.meta_data.hp, 40);
      assert.equal(granted.container_contents[0].item.meta_data.quantity, 3);
      assert.deepEqual(
        (await calculate(context, entity.inventory.items, [give])).ors.itemResults.map(
          (result) => result.baseSource.id
        ),
        [child.id]
      );
      InventorySchema.parse(entity.inventory);
    }
  } finally {
    engine.setFixtures([
      ...rows,
      ...content.items.filter((item) => item.id >= 990000).map((item) => ({ table: 'item', row: item })),
    ]);
  }
});

test('best armor/shield, actual AC and equipment penalties ignore formulas while preserving physical selection', async () => {
  const penaltyArmor = {
    ...armor,
    operations: [],
    meta_data: { ...armor.meta_data, ac_bonus: 5, dex_cap: 0, strength: 3, speed_penalty: -10, check_penalty: -2 },
  };
  const penaltyShield = {
    ...shield,
    operations: [],
    meta_data: { ...shield.meta_data, ac_bonus: 5, strength: 3, speed_penalty: -10, check_penalty: -2 },
  };
  const attributes = [setAttribute('ATTRIBUTE_STR', 0), setAttribute('ATTRIBUTE_DEX', 4)];
  for (const context of contexts) {
    const id = storeId(context);
    const baseline = await calculate(context, [], attributes);
    const unarmored = engine.getFinalAcValue(id);
    const formulas = [
      entry(penaltyArmor, { is_formula: true, is_equipped: true }),
      entry(penaltyShield, { is_formula: true, is_equipped: true }),
    ];
    const { entity } = await calculate(context, formulas, attributes);
    assert.equal(engine.getBestArmor(id, entity.inventory), null);
    assert.equal(engine.getBestShield(id, entity.inventory), null);
    assert.equal(engine.getFinalAcValue(id, engine.getBestArmor(id, entity.inventory)?.item), unarmored);
    engine.applyEquipmentPenalties(id, entity);
    assert.deepEqual(engine.exportVariableStore(id).bonuses, baseline.store.bonuses);
    const physicalArmor = entry(penaltyArmor, { is_equipped: true });
    const physicalShield = entry(penaltyShield, { is_equipped: true });
    const physical = await calculate(context, [...formulas, physicalArmor, physicalShield], attributes);
    assert.equal(engine.getBestArmor(id, physical.entity.inventory).id, physicalArmor.id);
    assert.equal(engine.getBestShield(id, physical.entity.inventory).id, physicalShield.id);
    assert.equal(engine.getAcParts(id, physicalArmor.item).armorBonus, 5);
    engine.applyEquipmentPenalties(id, physical.entity);
    assert.ok(engine.getVariableBonuses(id, 'SPEED').some((bonus) => Number(bonus.value) === -10));
    assert.equal(engine.getBestArmor(id), null);
    assert.equal(engine.getBestShield(id), null);
  }
});

test('actual calculated AC snapshots ignore formula armor and preserve full saved inventory and unrelated metadata', async (t) => {
  t.mock.method(console, 'log', () => {});
  const defensiveArmor = {
    ...armor,
    operations: [],
    meta_data: { ...armor.meta_data, ac_bonus: 5, dex_cap: 0 },
  };
  const attributes = [setAttribute('ATTRIBUTE_STR', 0), setAttribute('ATTRIBUTE_DEX', 4)];
  for (const context of contexts) {
    await calculate(context, [], attributes);
    const unarmored = engine.getFinalAcValue(storeId(context));
    for (const is_formula of [true, false]) {
      const items = [entry(defensiveArmor, { is_equipped: true, is_formula })];
      const { entity: original } = await calculate(context, items, attributes);
      original.meta_data = { saved_choice: 'retained', nested_future_metadata: { tags: ['local'] } };
      const saved = structuredClone(original);
      let entity = original;
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Calculated snapshot was not emitted')), 3000);
        engine.saveCalculatedStats(storeId(context), entity, (update) => {
          entity = typeof update === 'function' ? update(entity) : update;
          clearTimeout(timeout);
          resolve();
        });
      });
      assert.equal(entity.meta_data.calculated_stats.ac, is_formula ? unarmored : 15);
      assert.deepEqual(entity.inventory, saved.inventory);
      assert.deepEqual(entity.details, saved.details);
      assert.deepEqual(entity.operation_data, saved.operation_data);
      const { calculated_stats, ...metadata } = entity.meta_data;
      assert.deepEqual(metadata, saved.meta_data);
      assert.deepEqual(original, saved);
      InventorySchema.parse(entity.inventory);
    }
  }
});

test('investment and implant limits count physical children and copies, not formula flags', async () => {
  for (const context of contexts) {
    await calculate(context, [], [setAttribute('ATTRIBUTE_CON', 2)]);
    const id = storeId(context);
    assert.equal(engine.reachedInvestedLimit(id), false);
    assert.equal(engine.reachedImplantLimit(id), false);
    const invested = Array.from({ length: 9 }, () => entry(cloak, { is_invested: true }));
    const implanted = Array.from({ length: 2 }, () => entry(implant, { is_implanted: true }));
    const formulas = [
      entry(cloak, { is_formula: true, is_invested: true }),
      entry(implant, { is_formula: true, is_implanted: true }),
    ];
    assert.equal(engine.reachedInvestedLimit(id, inventory([...invested, ...formulas])), false);
    assert.equal(engine.reachedImplantLimit(id, inventory([...implanted, ...formulas])), false);
    const savedPhysicalChildren = entry(pack, {
      is_formula: true,
      container_contents: [entry(cloak, { is_invested: true }), entry(implant, { is_implanted: true })],
    });
    const inv = inventory([...invested, ...implanted, ...formulas, savedPhysicalChildren]);
    const saved = structuredClone(inv);
    assert.equal(engine.reachedInvestedLimit(id, inv), true);
    assert.equal(engine.reachedImplantLimit(id, inv), true);
    assert.deepEqual(inv, saved);
  }
});

test('actual rest resets only physical STAFF/WAND charges, keeping formula references and saved copies', async () => {
  const spellSlot = {
    id: crypto.randomUUID(),
    type: 'giveSpellSlot',
    data: { castingSource: 'local-caster', slots: [{ lvl: 5, rank: 3, amt: 1 }] },
  };
  for (const context of contexts) {
    const chargedStaff = {
      ...staff,
      description: '[local spell](link_spell_8867)',
      meta_data: { ...staff.meta_data, charges: { current: 7, max: 9 } },
    };
    const chargedWand = {
      ...wand,
      description: '[local spell](link_spell_8999)',
      meta_data: { ...wand.meta_data, charges: { current: 7, max: 9 } },
    };
    const items = [
      entry(chargedStaff, { is_equipped: true }),
      entry(chargedStaff, { is_formula: true, is_equipped: true }),
      entry(chargedStaff),
      entry(chargedWand),
      entry(chargedWand, { is_formula: true }),
    ];
    const { entity } = await calculate(context, items, [spellSlot]);
    const saved = structuredClone(entity);
    const references = engine.getInventorySpellIds(items);
    const rested = engine.handleRest(storeId(context), entity);
    assert.deepEqual(
      rested.inventory.items.map((entry) => entry.item.meta_data.charges),
      [
        { current: 0, max: 3 },
        { current: 7, max: 9 },
        { current: 7, max: 9 },
        { current: 0, max: 1 },
        { current: 7, max: 9 },
      ]
    );
    assert.deepEqual(engine.getInventorySpellIds(rested.inventory.items), references);
    assert.deepEqual(entity, saved);
    InventorySchema.parse(rested.inventory);
  }
});

test('shared equipped-weapon selector preserves absence, stable order, duplicates and input without formula attacks', async () => {
  assert.equal(engine.getEquippedWeapons(undefined), undefined);
  assert.deepEqual(engine.getEquippedWeapons([]), []);
  const a = entry({ ...weapon, name: 'A spear' }, { is_equipped: true });
  const b1 = entry({ ...weapon, name: 'B spear' }, { is_equipped: true });
  const b2 = entry({ ...weapon, name: 'B spear' }, { is_equipped: true });
  const formula = entry({ ...weapon, name: '0 formula spear' }, { is_formula: true, is_equipped: true });
  const items = [b1, formula, entry(weapon), a, entry(shield, { is_equipped: true }), b2];
  const saved = structuredClone(items);
  assert.deepEqual(
    engine.getEquippedWeapons(items).map((entry) => entry.id),
    [a.id, b1.id, b2.id]
  );
  assert.deepEqual(items, saved);
  assert.equal(engine.getEquippedWeapons(items)[0], a);
});

test('actual default dice presets exclude formula attacks/damage but keep physical weapon calculations', async () => {
  await calculate('CHARACTER-SHEET', [], [setAttribute('ATTRIBUTE_STR', 3)]);
  const physical = entry(weapon, { is_equipped: true });
  const formula = entry({ ...weapon, name: 'Formula spear' }, { is_formula: true, is_equipped: true });
  const stats = engine.getWeaponStats('CHARACTER', weapon);
  const presets = engine.findDefaultPresets('CHARACTER', actor([formula, physical]));
  const attack = presets.find((preset) => preset.name === `${weapon.name} (1st attack)`);
  const damage = presets.find((preset) => preset.name === `${weapon.name} (damage)`);
  assert.equal(attack.dice[0].bonus, stats.attack_bonus.total[0]);
  assert.equal(damage.dice.length, stats.damage.dice);
  assert.equal(damage.dice[0].type, stats.damage.die);
  assert.equal(damage.dice.at(-1).bonus, stats.damage.bonus.total);
  assert.equal(
    presets.some((preset) => preset.name.includes('Formula spear')),
    false
  );
  assert.equal(
    engine.findDefaultPresets('CHARACTER', actor([formula])).some((preset) => preset.name.includes('spear')),
    false
  );
  assert.ok(engine.findDefaultPresets('CHARACTER', null).some((preset) => preset.name === 'Perception check'));
});

test('formula STAFF/WAND/SPELLHEART reference visibility and inherited traits are unchanged', () => {
  const entries = [
    entry({ ...staff, description: '[first spell](link_spell_8867)' }, { is_formula: true, is_equipped: true }),
    entry({ ...wand, description: '[second spell](link_spell_8999)' }, { is_formula: true }),
    entry({ ...toolkit, traits: [2570], description: '[third spell](link_spell_7001)' }, { is_formula: true }),
    entry(
      {
        ...wand,
        traits: [],
        meta_data: { ...wand.meta_data, base_item_content: wand },
        description: '[fourth spell](link_spell_7002)',
      },
      { is_formula: true }
    ),
  ];
  assert.deepEqual(engine.getInventorySpellIds(entries), [7001, 7002, 8867, 8999]);
  assert.equal(engine.filterByTraitType(entries, 'STAFF').length, 1);
  assert.equal(engine.filterByTraitType(entries, 'WAND').length, 2);
  assert.equal(engine.filterByTraitType(entries, 'SPELLHEART').length, 1);
  assert.deepEqual(engine.getInventorySpellIds([{ ...entries[0], is_equipped: false }]), []);
  assert.deepEqual(engine.getInventorySpellIds([entry(pack, { container_contents: entries })]), []);
});

test('all five weapon consumers call the tested selector; component/PDF/JSON verification here is wiring-only', async () => {
  for (const path of [
    '../src/pages/character_sheet/panels/SkillsActionsPanel.tsx',
    '../src/common/dice/dice-utils.ts',
    '../src/process/export/json/json-v4.ts',
    '../src/process/export/pdf/pdf-v1.ts',
    '../src/process/export/pdf/pdf-v2.ts',
  ]) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    assert.match(source, /import\s*\{[^}]*\bgetEquippedWeapons\b[^}]*\}\s*from\s*['"]@items\/inv-utils['"]/);
    assert.match(
      source,
      /const weapons = getEquippedWeapons\((?:props\.entity|character\??|entity)\??\.inventory\?\.items\)/
    );
    assert.doesNotMatch(source, /\.filter\(\(i\) => i\.is_equipped && isItemWeapon\(i\.item\)\)/);
  }
});
