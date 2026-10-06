import assert from 'node:assert/strict';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const weaponIds = [7797, 6995, 14894, 14896];
const migration = await readFile(
  new URL('../../supabase/migrations/20260927230000_war_of_immortals_warrior_ranks.sql', import.meta.url),
  'utf8'
);
const repairs = JSON.parse(migration.split('$scoped$')[1]);
let engine;
let content;
let warrior;
let savedWarrior;

before(async () => {
  engine = await createOperationEngine();
  const rows = await readContentRows([
    { table: 'class', id: 20 },
    { table: 'class_archetype', id: 36 },
    { table: 'ability_block', id: 20051 },
    { table: 'ability_block', id: 20764 },
    { table: 'ability_block', id: 19270 },
    ...weaponIds.map((id) => ({ table: 'item', id })),
  ]);
  warrior = rows.find(({ table }) => table === 'class_archetype').row;
  savedWarrior = structuredClone(warrior);
  for (const repair of repairs) {
    const adjustment = warrior.feature_adjustments.find(({ prev_id }) => prev_id === repair.prev_id);
    assert.equal(adjustment.type, 'REPLACE');
    assert.equal(adjustment.data.name, repair.name);
    assertReviewedTransition(
      adjustment.data.operations.filter(({ data }) => data.variable.startsWith('WEAPON_GROUP_')),
      repair.old_group_operations,
      repair.scoped_operations,
      `${repair.name} group ranks`
    );
    const savedAdjustment = savedWarrior.feature_adjustments.find(({ prev_id }) => prev_id === repair.prev_id);
    savedAdjustment.data.operations = [
      ...savedAdjustment.data.operations.filter(({ data }) => !data.variable.startsWith('WEAPON_GROUP_')),
      ...structuredClone(repair.old_group_operations),
    ];
    adjustment.data.operations = [
      ...adjustment.data.operations.filter(({ data }) => !data.variable.startsWith('WEAPON_GROUP_')),
      ...repair.scoped_operations,
    ];
  }
  content = {
    abilityBlocks: rows.filter(({ table }) => table === 'ability_block').map(({ row }) => row),
    classes: rows.filter(({ table }) => table === 'class').map(({ row }) => row),
    classArchetypes: [warrior],
    items: rows.filter(({ table }) => table === 'item').map(({ row }) => row),
    traits: [],
    ancestries: [],
    backgrounds: [],
    languages: [],
    spells: [],
    archetypes: [],
    versatileHeritages: [],
    sources: [],
    defaultSources: { PAGE: [1, 24, 400], INFO: [1, 24, 400] },
  };
  engine.setFixtures(rows);
});

after(async () => engine?.cleanup());

async function weaponAttack(
  item,
  level,
  customOperations = [],
  archetype = warrior,
  contentPackage = content,
  classSlot = '1'
) {
  const character = {
    id: 1,
    level,
    details: {
      [classSlot === '1' ? 'class' : 'class_2']: { id: 20 },
      [classSlot === '1' ? 'class_archetype' : 'class_archetype_2']: archetype,
      conditions: [],
    },
    inventory: { items: [] },
    operation_data: { selections: {} },
    content_sources: { enabled: [1, 24, 400] },
    options: { custom_operations: true, ignore_bulk_limit: true },
    custom_operations: [
      { id: 'test-strength', type: 'setValue', data: { variable: 'ATTRIBUTE_STR', value: { value: 0 } } },
      ...customOperations,
    ],
  };
  const { errors, store } = await engine._executeCharacterOperations({
    character,
    content: contentPackage,
    context: 'CHARACTER-SHEET',
  });
  assert.deepEqual(errors, []);
  return { attack: engine.getWeaponStats('CHARACTER', item).attack_bonus.total[0], store };
}

test('Warrior of Legend spear and polearm ranks respect weapon category at levels 5 and 13', async () => {
  for (const level of [5, 13]) {
    for (const item of content.items) {
      const expectedRank = item.meta_data.category === 'advanced' ? (level === 5 ? 4 : 6) : level === 5 ? 6 : 8;
      const { attack } = await weaponAttack(item, level);
      assert.equal(attack, level + expectedRank, `${item.name} at level ${level}`);
    }
    const unarmedSpear = structuredClone(content.items.find(({ id }) => id === 7797));
    unarmedSpear.name = 'Spear Unarmed Test Attack';
    unarmedSpear.meta_data.category = 'unarmed_attack';
    const { attack: unarmedAttack } = await weaponAttack(unarmedSpear, level);
    assert.equal(unarmedAttack, level + (level === 5 ? 6 : 8), `unarmed spear at level ${level}`);
  }
});

test('saved Warrior archetypes calculate from current content without changing saved snapshots', async () => {
  const advancedSpear = content.items.find(({ id }) => id === 14894);
  const savedSnapshot = structuredClone(savedWarrior);
  for (const classSlot of ['1', '2']) {
    for (const level of [5, 13]) {
      const { attack } = await weaponAttack(advancedSpear, level, [], savedSnapshot, content, classSlot);
      assert.equal(attack, level + (level === 5 ? 4 : 6), `saved class slot ${classSlot} at level ${level}`);
    }
  }
  assert.deepEqual(savedSnapshot, savedWarrior, 'calculation must not rewrite the saved class archetype');

  const unavailableSource = { ...content, classArchetypes: [] };
  const { attack: fallback } = await weaponAttack(advancedSpear, 5, [], warrior, unavailableSource);
  assert.equal(fallback, 9, 'a saved homebrew archetype still calculates when its source is unavailable');
});

test('broad group rank increases and later assignments retain their existing precedence', async () => {
  const advancedSpear = content.items.find(({ id }) => id === 14894);
  const increase = [
    {
      id: 'test-group-increase',
      type: 'adjValue',
      data: { variable: 'WEAPON_GROUP_SPEAR', value: { value: '1' } },
    },
  ];
  const { attack: increased } = await weaponAttack(advancedSpear, 5, increase);
  assert.equal(increased, 11, 'the broad group increase advances the Warrior advanced rank from E to M');

  const broadGrant = [
    {
      id: 'test-broad-grant',
      type: 'adjValue',
      data: { variable: 'WEAPON_GROUP_SPEAR', value: { value: 'M' } },
    },
  ];
  const { attack: granted } = await weaponAttack(advancedSpear, 5, broadGrant);
  assert.equal(granted, 11, 'an independent broad group grant still applies to advanced spears');

  const earlySet = [
    {
      id: 'test-early-assignment',
      type: 'setValue',
      data: { variable: 'WEAPON_GROUP_SPEAR', value: { value: 'U' } },
    },
  ];
  const { attack: assigned } = await weaponAttack(advancedSpear, 5, earlySet);
  assert.equal(assigned, 9, 'the Warrior grant still applies after an earlier broad assignment');

  const simpleSpear = content.items.find(({ id }) => id === 7797);
  const broadBinding = [
    {
      id: 'test-broad-binding',
      type: 'bindValue',
      data: {
        variable: 'WEAPON_GROUP_SPEAR',
        value: { storeId: 'CHARACTER', variable: 'MARTIAL_WEAPONS' },
      },
    },
  ];
  const { attack: bound } = await weaponAttack(simpleSpear, 5, broadBinding);
  assert.equal(bound, 9, 'a deferred broad group binding replaces the Warrior simple spear rank');

  const { attack: ordinaryFighter } = await weaponAttack(advancedSpear, 5, broadGrant, null);
  assert.equal(ordinaryFighter, 11, 'an ordinary fighter broad group grant is unchanged');
  assert.deepEqual(
    engine
      .getAllWeaponGroupVariables('CHARACTER')
      .filter(({ name }) => name.startsWith('WEAPON_GROUP_SPEAR'))
      .map(({ name }) => name),
    ['WEAPON_GROUP_SPEAR'],
    'a broad group grant does not create duplicate proficiency display rows'
  );

  await weaponAttack(advancedSpear, 5);
  engine.setVariable('CHARACTER', 'WEAPON_GROUP_SPEAR', { value: 'U' });
  assert.equal(
    engine.getWeaponStats('CHARACTER', advancedSpear).attack_bonus.total[0],
    7,
    'a later broad group assignment replaces the scoped rank'
  );
  await weaponAttack(advancedSpear, 5);
  engine.removeVariable('CHARACTER', 'WEAPON_GROUP_SPEAR');
  assert.equal(
    engine.getWeaponStats('CHARACTER', advancedSpear).attack_bonus.total[0],
    7,
    'removing the broad group also removes its category-scoped grant'
  );
});

test('scoped group ranks are absent from weapon-group choice options', async () => {
  await weaponAttack(
    content.items.find(({ id }) => id === 7797),
    5
  );
  const choices = await engine.determineFilteredSelectionList('CHARACTER', 'test-group-choice', {
    id: 'test-group-choice',
    type: 'ADJ_VALUE',
    group: 'WEAPON-GROUP',
    value: { value: 'T' },
  });
  assert.ok(choices.some(({ variable }) => variable === 'WEAPON_GROUP_SPEAR'));
  assert.ok(!choices.some(({ variable }) => variable.startsWith('WEAPON_GROUP_SPEAR_')));
  assert.ok(!choices.some(({ variable }) => variable.startsWith('WEAPON_GROUP_POLEARM_')));

  assert.match(migration, /status->>'state' = 'PENDING'/);
  assert.equal(repairs.length, 2);
  for (const repair of repairs) {
    assert.equal(repair.scoped_operations.length, 8);
    assert.deepEqual(
      new Set(repair.scoped_operations.map(({ data }) => data.variable)),
      new Set([
        'WEAPON_GROUP_SPEAR_SIMPLE',
        'WEAPON_GROUP_SPEAR_MARTIAL',
        'WEAPON_GROUP_SPEAR_ADVANCED',
        'WEAPON_GROUP_SPEAR_UNARMED_ATTACK',
        'WEAPON_GROUP_POLEARM_SIMPLE',
        'WEAPON_GROUP_POLEARM_MARTIAL',
        'WEAPON_GROUP_POLEARM_ADVANCED',
        'WEAPON_GROUP_POLEARM_UNARMED_ATTACK',
      ])
    );
  }
});
