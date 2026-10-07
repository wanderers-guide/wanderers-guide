import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

let engine;
let fixtureRows;
let base;

/** Exercise the actual character operations and weapon attack consumers without updating saved content. */
async function calculate(item, { division = true, ordinaryProficiency = null, gunProficiency = null } = {}) {
  const character = {
    id: 990098,
    name: 'Weapon division fixture',
    level: 7,
    hp_current: 1,
    details: { conditions: [] },
    inventory: { items: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
    operation_data: { selections: {} },
    content_sources: { enabled: [3, 16] },
    meta_data: { reset_hp: false },
    options: { custom_operations: true, ignore_bulk_limit: true },
    custom_operations: [
      { id: 'dex', type: 'setValue', data: { variable: 'ATTRIBUTE_DEX', value: { value: 4 } } },
      { id: 'str', type: 'setValue', data: { variable: 'ATTRIBUTE_STR', value: { value: 3 } } },
      ...(ordinaryProficiency
        ? [
            {
              id: 'ordinary',
              type: 'adjValue',
              data: { variable: 'MARTIAL_WEAPONS', value: { value: ordinaryProficiency } },
            },
          ]
        : []),
      ...(gunProficiency
        ? [
            {
              id: 'gun',
              type: 'adjValue',
              data: { variable: 'WEAPON_DIVISION_GUN_MARTIAL', value: { value: gunProficiency } },
            },
          ]
        : []),
      ...(division
        ? [
            {
              id: 'division',
              type: 'adjValue',
              data: { variable: 'WEAPON_DIVISION_ONE_HANDED_AGILE_FINESSE', value: { value: 'E' } },
            },
          ]
        : []),
    ],
  };
  const content = {
    classes: [],
    ancestries: [],
    backgrounds: [],
    languages: [],
    spells: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    abilityBlocks: [],
    items: fixtureRows.filter((x) => x.table === 'item').map((x) => x.row),
    traits: fixtureRows.filter((x) => x.table === 'trait').map((x) => x.row),
    defaultSources: { PAGE: [3, 16], INFO: [3] },
  };
  const saved = structuredClone(character),
    savedItem = structuredClone(item);
  const result = await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-BUILDER' });
  assert.deepEqual(result.errors, []);
  engine.importVariableStore('CHARACTER', result.store);
  const stats = engine.getWeaponStats('CHARACTER', item);
  assert.deepEqual(character, saved);
  assert.deepEqual(item, savedItem);
  return stats;
}

before(async () => {
  fixtureRows = await readContentRows([
    { table: 'item', sourceIds: [16] },
    { table: 'trait', sourceIds: Array.from({ length: 10000 }, (_, i) => i) },
  ]);
  engine = await createOperationEngine();
  engine.setFixtures(fixtureRows);
  const agile = fixtureRows.find((x) => x.table === 'trait' && x.row.name === 'Agile').row.id;
  base = {
    id: 990098,
    name: 'Agile weapon fixture',
    group: 'WEAPON',
    hands: null,
    usage: 'held in 1 hand',
    traits: [agile],
    operations: [],
    meta_data: {
      category: 'martial',
      group: 'sling',
      range: 50,
      damage: { dice: 1, die: 'd6', damageType: 'piercing' },
      runes: { potency: 0, striking: 0, property: [] },
    },
  };
});
after(async () => engine?.cleanup());

test('printed one-handed Usage participates in the existing division only when Hands is absent', async () => {
  for (const usage of ['held in 1 hand', 'held in one hand', 'held-in-one-hand', ' HELD IN 1 HAND ']) {
    const stats = await calculate({ ...structuredClone(base), usage });
    assert.deepEqual(stats.attack_bonus.total, [15, 11, 7]);
  }
});

test('explicit Hands takes precedence and existing flexible grips retain their behavior', async () => {
  for (const hands of ['1', '1+', '1 or 2']) {
    const stats = await calculate({ ...structuredClone(base), hands, usage: 'held in 2 hands' });
    assert.deepEqual(stats.attack_bonus.total, [15, 11, 7]);
  }
  for (const hands of ['', '2', '0']) {
    const stats = await calculate({ ...structuredClone(base), hands });
    assert.deepEqual(stats.attack_bonus.total, [4, 0, -4]);
  }
});

test('two-handed, worn, unarmed, empty and ambiguous Usage do not acquire the one-handed division', async () => {
  for (const usage of [
    '',
    'held in 2 hands',
    'held-in-two-hands',
    'worn on 1 hand',
    'worn gloves',
    'held in 1 or 2 hands',
    'held in 1+ hands',
    'held in 1 hand while activated',
  ]) {
    assert.deepEqual((await calculate({ ...structuredClone(base), usage })).attack_bonus.total, [4, 0, -4]);
  }
  const unarmed = { ...structuredClone(base), meta_data: { ...base.meta_data, category: 'unarmed_attack' } };
  assert.deepEqual((await calculate(unarmed)).attack_bonus.total, [4, 0, -4]);
  const unarmedTrait = fixtureRows.find((x) => x.table === 'trait' && x.row.name === 'Unarmed').row.id;
  assert.equal(unarmedTrait, 2398);
  for (const category of [undefined, 'martial']) {
    const traitOnly = {
      ...structuredClone(base),
      traits: [...base.traits, unarmedTrait],
      meta_data: { ...base.meta_data, category },
    };
    assert.deepEqual((await calculate(traitOnly)).attack_bonus.total, [4, 0, -4]);
    assert.deepEqual((await calculate({ ...traitOnly, hands: '1' })).attack_bonus.total, [15, 11, 7]);
  }
  const inheritedUnarmed = {
    ...structuredClone(base),
    meta_data: { ...base.meta_data, base_item_content: { traits: [unarmedTrait] } },
  };
  assert.deepEqual((await calculate(inheritedUnarmed)).attack_bonus.total, [4, 0, -4]);
});

test('ordinary proficiency, non-Agile/Finesse weapons and unrelated catalog fields remain unchanged', async () => {
  const noDivision = await calculate(base, { division: false });
  const explicitNoDivision = await calculate({ ...structuredClone(base), hands: '1' }, { division: false });
  assert.deepEqual(noDivision, explicitNoDivision);
  assert.deepEqual((await calculate({ ...structuredClone(base), traits: [] })).attack_bonus.total, [4, -1, -6]);
  const ordinary = await calculate(base, { ordinaryProficiency: 'L' });
  assert.deepEqual(ordinary.attack_bonus.total, [19, 15, 11]);
  assert.deepEqual(ordinary, await calculate({ ...structuredClone(base), hands: '1' }, { ordinaryProficiency: 'L' }));
  const analog = fixtureRows.find((x) => x.table === 'trait' && x.row.name === 'Analog').row.id;
  const gun = { ...structuredClone(base), traits: [...base.traits, analog] };
  const gunStats = await calculate(gun, { gunProficiency: 'L' });
  assert.deepEqual(gunStats.attack_bonus.total, [19, 15, 11]);
  assert.deepEqual(gunStats, await calculate({ ...structuredClone(gun), hands: '1' }, { gunProficiency: 'L' }));
});

test('the complete dumped Treasure Vault weapon universe equals its explicit recognized-grip controls without saved-item writes', async () => {
  const weapons = fixtureRows
    .filter((x) => x.table === 'item' && (x.row.group === 'WEAPON' || [15900, 15901].includes(x.row.id)))
    .map((x) => ([15900, 15901].includes(x.row.id) ? { ...structuredClone(x.row), group: 'WEAPON' } : x.row));
  const weaponProfiles = weapons.filter(
    (item) => !['light', 'medium', 'heavy', 'unarmored_defense'].includes(item.meta_data?.category)
  );
  assert.equal(weaponProfiles.length, 164);
  for (const item of weapons) {
    const usage = String(item.usage ?? '')
      .trim()
      .toLowerCase()
      .replaceAll('-', ' ');
    const explicit = structuredClone(item);
    const unarmed = engine
      .compileTraits(item)
      .some((id) => fixtureRows.find((x) => x.table === 'trait' && x.row.id === id)?.row.name === 'Unarmed');
    if (
      item.hands == null &&
      /^held in (?:1|one) hand$/.test(usage) &&
      item.meta_data?.category !== 'unarmed_attack' &&
      !unarmed
    )
      explicit.hands = '1';
    assert.deepEqual(await calculate(item), await calculate(explicit), `${item.id}/${item.name}`);
  }
});
