import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createOperationEngine } from './operation-test-harness.mjs';

let engine;
let sequence = 0;
const set = (variable, value) => ({ id: `armor-set-${++sequence}`, type: 'setValue', data: { variable, value } });
const grades = ['COMMERCIAL', 'TACTICAL', 'ADVANCED', 'SUPERIOR', 'ELITE', 'ULTIMATE', 'PARAGON'];
const traits = [1, 2, 3].map((tier) => ({ id: 991000 + tier, name: `Resilient +${tier}`, content_source_id: 579 }));
const noSaves = { SAVE_FORT: [], SAVE_REFLEX: [], SAVE_WILL: [] };
const saves = (value) => Object.fromEntries(Object.keys(noSaves).map((name) => [name, value ? [value] : []]));

function armor({ base = 'COMMERCIAL', grade = base, ac = 2, level = 1, price = 50, slots = 0, ...metadata } = {}) {
  return {
    id: 990701,
    created_at: '2026-01-01T00:00:00Z',
    name: 'Synthetic final armor',
    price: { sp: price },
    bulk: '1',
    level,
    rarity: 'COMMON',
    traits: [],
    description: '',
    group: 'ARMOR',
    hands: null,
    size: 'MEDIUM',
    craft_requirements: null,
    usage: null,
    meta_data: {
      category: 'light',
      group: 'ceramic',
      ac_bonus: ac,
      dex_cap: 3,
      strength: 2,
      check_penalty: -1,
      bulk: {},
      starfinder: { base_grade: base, base_upgrade_slots: slots, grade },
      ...metadata,
    },
    operations: [],
    content_source_id: 900,
    version: '0.0.0',
  };
}

const owned = (item, overrides = {}) => ({
  id: `synthetic-entry-${item.id}`,
  item,
  is_formula: false,
  is_equipped: true,
  is_invested: false,
  is_implanted: false,
  container_contents: [],
  ...overrides,
});

async function calculate(entries, { context = 'CHARACTER-SHEET', external = [], fixtureItems = [] } = {}) {
  const character = {
    id: 990700,
    level: 5,
    hp_current: 40,
    details: { conditions: [] },
    inventory: { coins: { cp: 11, sp: 22, gp: 33, pp: 44 }, items: entries },
    operation_data: { selections: {} },
    variants: {},
    content_sources: { enabled: [579, 900] },
    meta_data: { reset_hp: false },
    options: { custom_operations: true, ignore_bulk_limit: true },
    custom_operations: [
      ...Object.entries({ STR: 3, DEX: 3, CON: 2, INT: 0, WIS: 1, CHA: 0 }).map(([name, value]) =>
        set(`ATTRIBUTE_${name}`, { value })
      ),
      ...['LIGHT_ARMOR', 'MEDIUM_ARMOR', 'HEAVY_ARMOR', 'UNARMORED_DEFENSE'].map((name) => set(name, { value: 'T' })),
      set('SPEED', 25),
      ...external,
    ],
  };
  const items = [...entries.map((entry) => entry.item), ...fixtureItems];
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
    traits,
    items,
    defaultSources: { PAGE: [579, 900], INFO: [579, 900] },
  };
  const original = JSON.stringify({ character, content });
  engine.setFixtures([
    ...items.map((row) => ({ table: 'item', row })),
    ...traits.map((row) => ({ table: 'trait', row })),
  ]);
  engine.clearOperationErrorNotifications();
  await engine.executeOperations(
    { type: 'CHARACTER', data: { character, content, context } },
    { directExecution: true }
  );
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  assert.equal(JSON.stringify({ character, content }), original, 'calculation preserves every input and coin');
  return character;
}

function inspect(item) {
  const parts = engine.getAcParts('CHARACTER', item);
  const finalAc = engine.getFinalAcValue('CHARACTER', item);
  assert.equal(finalAc, 10 + parts.profBonus + parts.dexBonus + parts.armorBonus + parts.bonusAc);
  const itemSaves = Object.fromEntries(
    Object.keys(noSaves).map((name) => [
      name,
      engine
        .getVariableBonuses('CHARACTER', name)
        .filter((bonus) => bonus.type === 'item' && !bonus.text)
        .map((bonus) => bonus.value),
    ])
  );
  return { parts, finalAc, itemSaves };
}

before(async () => {
  engine = await createOperationEngine();
});
after(async () => {
  await engine?.cleanup();
});

const commercial = [
  [2, 50, 0, 0, 1],
  [3, 1650, 1, 0, 5],
  [3, 5050, 1, 1, 8],
  [4, 14050, 2, 1, 11],
  [4, 45050, 2, 2, 14],
  [5, 240050, 3, 2, 18],
  [5, 700050, 3, 3, 20],
];
for (const context of ['CHARACTER-SHEET', 'CHARACTER-BUILDER']) {
  for (const [index, grade] of grades.entries()) {
    test(`${context}: Commercial baseline at ${grade}`, async () => {
      const item = armor({ grade });
      const [ac, price, slots, resilient, level] = commercial[index];
      await calculate([owned(item)], { context });
      const view = engine.getArmorGradeView(item);
      assert.equal(view.kind, 'final');
      assert.deepEqual(
        [view.acBonus, view.price.sp, view.upgradeSlots, view.resilience, view.level],
        [ac, price, slots, resilient, level]
      );
      const result = inspect(item);
      assert.equal(result.parts.armorBonus, ac);
      assert.equal(result.finalAc, 20 + ac);
      assert.deepEqual(result.itemSaves, saves(resilient));
      assert.deepEqual(engine.compileTraits(item), resilient ? [991000 + resilient] : []);
      assert.equal(item.meta_data.ac_bonus, 2);
      assert.equal(item.price.sp, 50);
      assert.equal(item.level, 1);
    });
  }
}

const advanced = [
  ['ADVANCED', 4, 6500, 0, 1, 9],
  ['SUPERIOR', 5, 15500, 1, 1, 11],
  ['ELITE', 5, 46500, 1, 2, 14],
  ['ULTIMATE', 6, 241500, 2, 2, 18],
  ['PARAGON', 6, 701500, 2, 3, 20],
];
for (const context of ['CHARACTER-SHEET', 'CHARACTER-BUILDER']) {
  for (const [grade, ac, price, slots, resilient, level] of advanced) {
    test(`${context}: Advanced printing at ${grade} subtracts its starting improvements`, async () => {
      const item = armor({ base: 'ADVANCED', grade, ac: 4, level: 9, price: 6500 });
      item.traits = [991001];
      await calculate([owned(item)], { context });
      const view = engine.getArmorGradeView(item);
      assert.deepEqual(
        [view.acBonus, view.price.sp, view.upgradeSlots, view.resilience, view.level],
        [ac, price, slots, resilient, level]
      );
      assert.equal(inspect(item).parts.armorBonus, ac);
      assert.deepEqual(inspect(item).itemSaves, saves(resilient));
      assert.deepEqual(engine.compileTraits(item), [991000 + resilient]);
      assert.equal(item.traits[0], 991001, 'printed resilience remains in saved data');
    });
  }
}

test('missing selected grade uses the authored base without adding a field or price', async () => {
  const item = armor({ base: 'ADVANCED', ac: 4, level: 9, price: 6500 });
  delete item.meta_data.starfinder.grade;
  const original = JSON.stringify(item);
  await calculate([owned(item)]);
  assert.equal(inspect(item).parts.armorBonus, 4);
  assert.equal(engine.getEffectiveItemPrice(item).sp, 6500);
  assert.equal(JSON.stringify(item), original);
});

test('final resilience replaces inherited starting-printing traits without modifying the base snapshot', async () => {
  const item = armor({ base: 'ADVANCED', grade: 'PARAGON', ac: 4, price: 6500, level: 9 });
  const base = armor({ base: 'ADVANCED', ac: 4, price: 6500, level: 9 });
  base.traits = [991001, 4506];
  item.meta_data.base_item_content = base;
  const original = JSON.stringify(item);
  await calculate([owned(item)]);
  assert.deepEqual(engine.compileTraits(item), [4506, 991003]);
  assert.deepEqual(inspect(item).itemSaves, saves(3));
  assert.equal(JSON.stringify(item), original);
});

test('unequipped, formula, nested, uninvested and removed final armor do not activate grade effects', async () => {
  const item = armor({ grade: 'PARAGON' });
  for (const entry of [owned(item, { is_equipped: false }), owned(item, { is_formula: true })]) {
    await calculate([entry]);
    assert.equal(inspect(item).parts.armorBonus, 2);
    assert.deepEqual(inspect(item).itemSaves, noSaves);
  }
  const container = { ...armor(), id: 990710, group: 'GENERAL', meta_data: { bulk: { capacity: 10 } } };
  await calculate([owned(container, { container_contents: [owned(item)] })]);
  assert.equal(inspect(item).parts.armorBonus, 2);
  assert.deepEqual(inspect(item).itemSaves, noSaves);
  item.traits = [1527];
  await calculate([owned(item)]);
  assert.equal(inspect(item).parts.armorBonus, 2);
  await calculate([owned(item, { is_invested: true })]);
  assert.equal(inspect(item).parts.armorBonus, 5);
  await calculate([]);
  assert.deepEqual(inspect(item).itemSaves, noSaves);
});

test('same-label or equal-value external bonuses cannot activate an inactive armor grade', async () => {
  const item = armor({ grade: 'TACTICAL' });
  await calculate([owned(item, { is_equipped: false })], {
    external: [
      { id: 'equal-label', type: 'addBonusToValue', data: { variable: 'AC_BONUS', value: 1, type: 'item', text: '' } },
    ],
  });
  engine.addVariableBonus('CHARACTER', 'AC_BONUS', 1, 'item', '', item.name);
  assert.equal(inspect(item).parts.armorBonus, 2);
  assert.equal(inspect(item).finalAc, 22);
});

test('different-grade copies and other worn armor never leak a grade into the selected armor', async () => {
  const tactical = armor({ grade: 'TACTICAL' });
  const paragon = armor({ grade: 'PARAGON' });
  const character = await calculate([owned(tactical), owned(paragon, { id: 'other-copy', is_equipped: false })]);
  assert.equal(inspect(tactical).parts.armorBonus, 3);
  assert.equal(inspect(paragon).parts.armorBonus, 2);
  assert.equal(engine.getBestArmor('CHARACTER', character.inventory).item.meta_data.starfinder.grade, 'TACTICAL');
  const secondPrinting = { ...armor({ grade: 'PARAGON', ac: 1 }), id: 990709 };
  await calculate([owned(tactical), owned(secondPrinting)]);
  assert.equal(inspect(tactical).parts.armorBonus, 3);
  assert.equal(inspect(secondPrinting).parts.armorBonus, 4);
});

test('complete final armor competes once with item bonuses and retains other modifier types', async () => {
  const item = armor({ base: 'ADVANCED', grade: 'ELITE', ac: 4, price: 6500, level: 9 });
  await calculate([owned(item)]);
  engine.addVariableBonus('CHARACTER', 'AC_BONUS', 4, 'item', '', 'weaker external');
  engine.addVariableBonus('CHARACTER', 'AC_BONUS', 2, 'status', '', 'status');
  engine.addVariableBonus('CHARACTER', 'AC_BONUS', -1, 'circumstance', '', 'penalty');
  assert.equal(inspect(item).parts.armorBonus, 5);
  assert.equal(inspect(item).finalAc, 26);
  engine.addVariableBonus('CHARACTER', 'AC_BONUS', 7, 'item', '', 'stronger external');
  assert.equal(inspect(item).parts.armorBonus, 0);
  assert.equal(inspect(item).finalAc, 28);
  const bonuses = engine.getVariableBonuses('CHARACTER', 'AC_BONUS');
  inspect(item);
  inspect(item);
  assert.deepEqual(engine.getVariableBonuses('CHARACTER', 'AC_BONUS'), bonuses, 'reads do not consume active grants');
});

test('Commercial fixed and ordinary upgrades use existing operations exactly once and never increase host level', async () => {
  const upgrade = {
    ...armor(),
    id: 990720,
    name: 'Synthetic fixed upgrade',
    group: 'GENERAL',
    level: 20,
    meta_data: { bulk: {} },
    operations: [
      { id: 'fixed-speed', type: 'addBonusToValue', data: { variable: 'SPEED', value: 5, text: '', type: 'item' } },
    ],
  };
  const item = armor({ slots: 1 });
  item.meta_data.starfinder.built_in_upgrades = [{ id: upgrade.id, name: upgrade.name, upgrade }];
  await calculate([owned(item)], { fixtureItems: [upgrade] });
  assert.equal(engine.getFinalVariableValue('CHARACTER', 'SPEED').total, 30);
  assert.equal(engine.getVariableBonuses('CHARACTER', 'SPEED').length, 1);
  assert.equal(engine.getArmorGradeView(item).upgradeSlots, 1);
  assert.equal(engine.getEffectiveItemLevel(item), 1);
  assert.equal(
    engine.getItemOperations(item, { items: [upgrade] }).filter((operation) => operation.id === 'fixed-speed').length,
    1
  );
  item.meta_data.starfinder.slots = item.meta_data.starfinder.built_in_upgrades;
  delete item.meta_data.starfinder.built_in_upgrades;
  await calculate([owned(item)], { fixtureItems: [upgrade] });
  assert.equal(engine.getVariableBonuses('CHARACTER', 'SPEED').length, 1);
  await calculate([owned(item, { is_equipped: false })], { fixtureItems: [upgrade] });
  assert.equal(engine.getFinalVariableValue('CHARACTER', 'SPEED').total, 25);
});

test('strict authoring rejects partial, negative, lower-grade, wrong-kind and mismatched fixed references', () => {
  assert.equal(engine.ItemSchema.safeParse(armor()).success, true);
  const malformed = [
    (item) => {
      delete item.meta_data.starfinder.base_grade;
    },
    (item) => {
      delete item.meta_data.starfinder.base_upgrade_slots;
    },
    (item) => {
      item.meta_data.starfinder.base_upgrade_slots = -1;
    },
    (item) => {
      item.meta_data.starfinder.base_upgrade_slots = 0.5;
    },
    (item) => {
      item.meta_data.starfinder.base_grade = 'ADVANCED';
      item.meta_data.starfinder.grade = 'TACTICAL';
    },
    (item) => {
      item.group = 'WEAPON';
    },
    (item) => {
      item.meta_data.starfinder.built_in_upgrades = [{ id: 990721, name: 'wrong', upgrade: armor() }];
    },
  ];
  for (const change of malformed) {
    const item = armor();
    change(item);
    const original = JSON.stringify(item);
    assert.equal(engine.ItemSchema.safeParse(item).success, false);
    assert.equal(JSON.stringify(item), original);
  }
});

test('invalid saved baseline retains printed data and never falls back to legacy grade bonuses', async () => {
  const item = armor({ grade: 'PARAGON' });
  delete item.meta_data.starfinder.base_upgrade_slots;
  await calculate([owned(item)]);
  assert.equal(engine.getArmorGradeView(item).kind, 'invalid');
  assert.equal(inspect(item).parts.armorBonus, 2);
  assert.deepEqual(inspect(item).itemSaves, noSaves);
  assert.deepEqual(engine.getEffectiveItemPrice(item), item.price);
});

test('active grade ownership survives worker-style store serialization and repeated calculation', async () => {
  const item = armor({ base: 'ADVANCED', grade: 'ELITE', ac: 4, price: 6500, level: 9 });
  await calculate([owned(item)]);
  const store = JSON.parse(JSON.stringify(engine.exportVariableStore('CHARACTER')));
  assert.equal(store.bonuses.AC_BONUS.filter((bonus) => bonus.armor_grade_key).length, 1);
  engine.resetVariables('CHARACTER');
  engine.importVariableStore('CHARACTER', store);
  assert.equal(inspect(item).parts.armorBonus, 5);
  await calculate([owned(item)]);
  assert.equal(engine.getVariableBonuses('CHARACTER', 'AC_BONUS').filter((bonus) => bonus.armor_grade_key).length, 1);
  assert.deepEqual(inspect(item).itemSaves, saves(2));
});

test('the actual worker-response validator retains grade ownership and accepts preserved invalid saved items', async () => {
  const originalWindow = globalThis.window;
  const originalWorker = globalThis.Worker;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const workers = [];
  class FixtureWorker {
    requests = [];
    constructor() {
      workers.push(this);
    }
    postMessage(request) {
      this.requests.push(request);
    }
    terminate() {}
    reply(data) {
      this.onmessage({ data: { id: this.requests.at(-1).id, status: 'success', data } });
    }
  }
  globalThis.window = { Worker: FixtureWorker };
  globalThis.Worker = FixtureWorker;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { hardwareConcurrency: 1 } });
  try {
    for (const valid of [true, false]) {
      const item = armor({ base: 'ADVANCED', grade: 'ELITE', ac: 4, price: 6500, level: 9 });
      if (!valid) delete item.meta_data.starfinder.base_upgrade_slots;
      // Keep an item result in both packets so its saved metadata crosses the real result boundary.
      item.operations = [
        {
          id: 'saved-passive-speed',
          type: 'addBonusToValue',
          data: { variable: 'SPEED', value: 5, type: 'item', text: '' },
        },
      ];
      const character = await calculate([owned(item)]);
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
        traits,
        items: [item],
        defaultSources: { PAGE: [579, 900], INFO: [579, 900] },
      };
      const data = { character, content, context: 'CHARACTER-SHEET' };
      const packet = await engine._executeCharacterOperations(data);
      const wire = JSON.parse(JSON.stringify(packet));
      const original = JSON.stringify(data);
      const resultPromise = engine.executeOperations({ type: 'CHARACTER', data });
      workers.at(-1).reply(wire);
      const result = await resultPromise;
      assert.equal(inspect(item).parts.armorBonus, valid ? 5 : 4);
      assert.deepEqual(inspect(item).itemSaves, valid ? saves(2) : noSaves);
      assert.equal(engine.getFinalVariableValue('CHARACTER', 'SPEED').total, 30);
      assert.deepEqual(result.itemResults.find((entry) => entry.baseSource.id === item.id).baseSource, item);
      assert.equal(JSON.stringify(data), original);
    }
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = originalWorker;
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
  }
});

test('unknown baseline/grade and orphaned built-ins stay invalid rather than activating legacy improvements', async () => {
  for (const change of [
    (item) => {
      item.meta_data.starfinder.base_grade = 'UNKNOWN';
    },
    (item) => {
      item.meta_data.starfinder.grade = 'UNKNOWN';
    },
    (item) => {
      delete item.meta_data.starfinder.base_grade;
      delete item.meta_data.starfinder.base_upgrade_slots;
      item.meta_data.starfinder.built_in_upgrades = [];
    },
  ]) {
    const item = armor({ grade: 'PARAGON' });
    change(item);
    assert.equal(engine.getArmorGradeView(item).kind, 'invalid');
    assert.equal(engine.ItemSchema.safeParse(item).success, false);
    await calculate([owned(item)]);
    assert.deepEqual(inspect(item).itemSaves, noSaves);
    assert.equal(inspect(item).parts.armorBonus, 2);
  }
});

test('configured built-ins retain exact passive effects, without granting activation-only spells or host traits', async () => {
  const item = armor();
  const configured = {
    ...armor(),
    id: 990722,
    group: 'UPGRADE',
    traits: [4506],
    description: 'Synthetic activation-only text',
    meta_data: { bulk: {} },
    operations: [
      { id: 'electricity-resistance', type: 'adjValue', data: { variable: 'RESISTANCES', value: 'electricity,5' } },
    ],
  };
  item.meta_data.starfinder.built_in_upgrades = [
    { id: configured.id, name: 'Synthetic configured upgrade', upgrade: configured },
  ];
  await calculate([owned(item)], { fixtureItems: [{ ...configured, operations: [] }] });
  assert.deepEqual(engine.getVariable('CHARACTER', 'RESISTANCES').value, ['electricity,5']);
  assert(!engine.compileTraits(item).includes(1576), 'resistance is not an Electricity trait on the host');
  item.meta_data.starfinder.slots = [
    {
      id: configured.id,
      name: 'Second configured copy of the same upgrade',
      upgrade: {
        ...configured,
        operations: [{ ...configured.operations[0], data: { variable: 'RESISTANCES', value: 'acid,5' } }],
      },
    },
  ];
  await calculate([owned(item)], { fixtureItems: [{ ...configured, operations: [] }] });
  assert.deepEqual(
    engine.getVariable('CHARACTER', 'RESISTANCES').value.toSorted(),
    ['acid,5', 'electricity,5'],
    'different configured copies with the same catalog ID retain both passive resistances'
  );
  await calculate([owned(item, { is_equipped: false })], { fixtureItems: [configured] });
  assert.deepEqual(engine.getVariable('CHARACTER', 'RESISTANCES').value, []);
});

test('editing upgrade selections preserves surviving owned snapshots and only creates newly selected references', () => {
  const catalogA = { ...armor(), id: 990731, group: 'UPGRADE' };
  const catalogB = { ...armor(), id: 990732, group: 'UPGRADE' };
  const catalogC = { ...armor(), id: 990733, group: 'UPGRADE' };
  const savedB = {
    name: 'Saved configured upgrade',
    id: catalogB.id,
    upgrade: {
      ...catalogB,
      uuid: 'owned-upgrade-uuid',
      description: 'Saved configuration, not the catalog description',
      price: { sp: 44000 },
      level: 14,
      meta_data: { bulk: {}, starfinder: { grade: 'ELITE' } },
    },
  };
  const current = [{ name: catalogA.name, id: catalogA.id, upgrade: catalogA }, savedB];
  const selected = [catalogC, catalogB];
  const original = structuredClone({ current, selected });
  const result = engine.preserveItemUpgradeSelections(
    [`catalog:${catalogC.id}`, `owned:1:${catalogB.id}`],
    current,
    selected
  );
  assert.deepEqual(result, [{ name: catalogC.name, id: catalogC.id, upgrade: catalogC }, savedB]);
  assert.equal(result[1], savedB, 'the whole surviving reference, including its saved snapshot, is retained');
  assert.notEqual(result, current);
  assert.deepEqual({ current, selected }, original, 'neither selection input is modified');
  assert.deepEqual(engine.preserveItemUpgradeSelections(undefined, current, selected), []);
  assert.deepEqual(engine.preserveItemUpgradeSelections([`catalog:${catalogC.id}`], undefined, selected), [result[0]]);
});

test('ID-based upgrade selection preserves renamed, same-name and catalog-unavailable references', () => {
  const first = { ...armor(), id: 990741, name: 'Same catalog name', group: 'UPGRADE' };
  const second = { ...first, id: 990742, content_source_id: 579 };
  const newItem = { ...first, id: 990743 };
  const renamed = { name: 'Custom owned label', id: second.id, upgrade: { ...second, description: 'Owned version' } };
  const unavailable = { name: 'Saved upgrade from an unloaded source', id: 990744 };
  const current = [{ name: first.name, id: first.id, upgrade: first }, renamed, unavailable];
  const catalog = [first, second, newItem];
  const original = structuredClone({ current, catalog });
  const result = engine.preserveItemUpgradeSelections(
    [`owned:2:${unavailable.id}`, `owned:1:${second.id}`, `catalog:${newItem.id}`, 'unknown', 'catalog:990745'],
    current,
    catalog
  );
  assert.deepEqual(result, [unavailable, renamed, { name: newItem.name, id: newItem.id, upgrade: newItem }]);
  assert.equal(result[0], unavailable, 'an unloaded saved reference does not require a fabricated Item');
  assert.equal(result[1], renamed, 'same-name rows resolve by ID, never catalog order or renamed label');
  assert.deepEqual({ current, catalog }, original);
  assert.deepEqual(engine.preserveItemUpgradeSelections([], current, catalog), []);
});

test('occurrence keys retain the intended configured copy when installed upgrades share a catalog ID', () => {
  const item = { ...armor(), id: 990751, group: 'UPGRADE' };
  const first = { name: 'Energy Shielding', id: item.id, upgrade: { ...item, description: 'Configured acid' } };
  const second = { name: 'Energy Shielding', id: item.id, upgrade: { ...item, description: 'Configured electricity' } };
  const current = [first, second];
  const original = structuredClone(current);
  const keepSecond = engine.preserveItemUpgradeSelections([`owned:1:${item.id}`], current, [item]);
  assert.deepEqual(keepSecond, [second]);
  assert.equal(keepSecond[0], second);
  const keepFirst = engine.preserveItemUpgradeSelections([`owned:0:${item.id}`], current, [item]);
  assert.equal(keepFirst[0], first);
  assert.deepEqual(engine.preserveItemUpgradeSelections([`owned:2:${item.id}`, 'owned:0:990752'], current, [item]), []);
  const fresh = engine.preserveItemUpgradeSelections([`catalog:${item.id}`], current, [item]);
  assert.deepEqual(fresh, [{ name: item.name, id: item.id, upgrade: item }]);
  assert.notEqual(fresh[0], first, 'a catalog installation is new even when its destination ID is already installed');
  assert.notEqual(fresh[0], second);
  assert.deepEqual(current, original);
});

test('creature armor effects remain isolated from the character and other creature stores', async () => {
  await calculate([]);
  const charStore = engine.exportVariableStore('CHARACTER');
  const item = armor({ grade: 'PARAGON' });
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
    traits,
    items: [item],
    defaultSources: { PAGE: [579, 900], INFO: [579, 900] },
  };
  engine.setFixtures([{ table: 'item', row: item }, ...traits.map((row) => ({ table: 'trait', row }))]);
  for (const [id, equipped] of [
    ['armor-companion', true],
    ['armor-other-creature', false],
  ]) {
    const creature = {
      name: 'Synthetic armored creature',
      level: 5,
      operations: [set('ATTRIBUTE_DEX', { value: 3 }), set('LIGHT_ARMOR', { value: 'T' })],
      inventory: { coins: { cp: 11, sp: 22, gp: 33, pp: 44 }, items: [owned(item, { is_equipped: equipped })] },
    };
    const original = JSON.stringify({ creature, content, charStore });
    const packet = await engine._executeCreatureOperations({ id, creature, content, charStore });
    assert.deepEqual(packet.errors, []);
    assert.equal(JSON.stringify({ creature, content, charStore }), original);
    assert.equal(engine.getAcParts(id, item).armorBonus, equipped ? 5 : 2);
    for (const name of Object.keys(noSaves)) {
      assert.deepEqual(
        (packet.store.bonuses[name] ?? [])
          .filter((bonus) => bonus.type === 'item' && !bonus.text)
          .map((bonus) => bonus.value),
        equipped ? [3] : []
      );
    }
  }
  assert.deepEqual(engine.exportVariableStore('CHARACTER'), charStore);
  assert.equal(engine.getAcParts('armor-companion', item).armorBonus, 5);
  assert.equal(engine.getAcParts('armor-other-creature', item).armorBonus, 2);
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
});

test('unmarked Tactical playtest and Pathfinder potency/resilience retain existing behavior', async () => {
  const legacy = armor({ grade: 'TACTICAL' });
  delete legacy.meta_data.starfinder.base_grade;
  delete legacy.meta_data.starfinder.base_upgrade_slots;
  await calculate([owned(legacy)]);
  assert.equal(inspect(legacy).parts.armorBonus, 2);
  assert.deepEqual(inspect(legacy).itemSaves, saves(1));
  assert.deepEqual(engine.compileTraits(legacy), [4002]);
  assert.equal(engine.getGradeImprovements(legacy).upgrade_slots, 0);
  const pathfinder = armor({ ac: 4 });
  delete pathfinder.meta_data.starfinder;
  pathfinder.traits = [1504, 1527];
  pathfinder.meta_data.runes = { potency: 2, resilient: 1, property: [] };
  await calculate([owned(pathfinder, { is_invested: true })]);
  assert.equal(inspect(pathfinder).parts.armorBonus, 6);
  assert.deepEqual(inspect(pathfinder).itemSaves, saves(1));
  await calculate([owned(pathfinder)]);
  assert.equal(inspect(pathfinder).parts.armorBonus, 4);
  assert.deepEqual(inspect(pathfinder).itemSaves, noSaves);
});
