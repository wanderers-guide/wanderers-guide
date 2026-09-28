import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260927050000_war_of_immortals_humble_strikes.sql', import.meta.url),
  'utf8'
);
const patches = JSON.parse(migration.split('$patches$')[1]);
const itemIds = [6820, 6854, 7090, 9252, 7724];
let engine;
let originals;
let content;
let items;

before(async () => {
  engine = await createOperationEngine();
  const rows = await readContentRows([
    ...patches.map(({ id }) => ({ table: 'ability_block', id })),
    ...itemIds.map((id) => ({ table: 'item', id })),
  ]);
  originals = structuredClone(rows);
  for (const patch of patches) {
    const feature = rows.find(({ table, row }) => table === 'ability_block' && row.id === patch.id).row;
    assert.equal(feature.name, patch.name);
    assert.equal(feature.type, 'class-feature');
    assert.equal(feature.content_source_id, patch.source);
    assert.equal(feature.operations.length, patch.before_count);
    assert.ok(feature.meta_data.source.url.startsWith('https://2e.aonprd.com/Classes.aspx?ID=65'));
    feature.operations.push(structuredClone(patch.after));
  }
  items = Object.fromEntries(rows.filter(({ table }) => table === 'item').map(({ row }) => [row.name, row]));
  engine.setFixtures(rows);
  content = {
    abilityBlocks: rows.filter(({ table }) => table === 'ability_block').map(({ row }) => row),
    items: Object.values(items),
    classes: [],
    ancestries: [],
    backgrounds: [],
    languages: [],
    traits: [],
    spells: [],
    sources: [],
    defaultSources: { PAGE: [1, 400], INFO: [1, 400] },
  };
});
after(async () => engine?.cleanup());

/** Calculate the real class-feature grant with a representative weapon proficiency baseline. */
async function calculateFeatures(featureIds = []) {
  const operations = Object.entries({
    SIMPLE_WEAPONS: 'T',
    MARTIAL_WEAPONS: 'T',
    UNARMED_ATTACKS: 'T',
    ADVANCED_WEAPONS: 'U',
  }).map(([variable, value]) => ({
    id: `rank-${variable}`,
    type: 'setValue',
    data: { variable, value: { value } },
  }));
  const character = {
    id: 1,
    level: 1,
    details: {},
    inventory: { items: [] },
    operation_data: { selections: {} },
    options: { custom_operations: true },
    custom_operations: [
      ...operations,
      { id: 'strength', type: 'setValue', data: { variable: 'ATTRIBUTE_STR', value: { value: 0 } } },
      ...featureIds.map((abilityBlockId) => ({
        id: `grant-${abilityBlockId}`,
        type: 'giveAbilityBlock',
        data: { type: 'class-feature', abilityBlockId },
      })),
    ],
  };
  const { errors } = await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-SHEET' });
  assert.deepEqual(errors, []);
}

test('the migration appends one flag without changing any existing class-feature operation', () => {
  for (const patch of patches) {
    const original = originals.find(({ table, row }) => table === 'ability_block' && row.id === patch.id).row;
    const updated = content.abilityBlocks.find(({ id }) => id === patch.id);
    assert.deepEqual(updated.operations.slice(0, -1), original.operations);
    assert.deepEqual(updated.operations.at(-1), patch.after);
    assert.equal(patch.after.type, 'setValue');
    assert.equal(patch.after.data.value, true);
  }
});

test('Humble Strikes increases simple damage dice only and never mutates the source weapons', async () => {
  const originalItems = structuredClone(items);
  await calculateFeatures();
  assert.deepEqual(
    ['Club', 'Dagger', 'Longsword', 'Fist', 'Sawtooth Saber'].map(
      (name) => engine.getWeaponStats('CHARACTER', items[name]).damage.die
    ),
    ['d6', 'd4', 'd8', 'd4', 'd6']
  );
  await calculateFeatures([38635]);
  assert.deepEqual(
    ['Club', 'Dagger', 'Longsword', 'Fist', 'Sawtooth Saber'].map(
      (name) => engine.getWeaponStats('CHARACTER', items[name]).damage.die
    ),
    ['d8', 'd6', 'd8', 'd4', 'd6']
  );
  const capped = structuredClone(items.Club);
  capped.meta_data.damage.die = 'd12';
  assert.equal(engine.getWeaponStats('CHARACTER', capped).damage.die, 'd12');
  const striking = structuredClone(items.Club);
  striking.meta_data.runes.striking = 1;
  assert.deepEqual(
    [engine.getWeaponStats('CHARACTER', striking).damage.dice, engine.getWeaponStats('CHARACTER', striking).damage.die],
    [2, 'd8']
  );
  assert.deepEqual(items, originalItems);
  await calculateFeatures();
  assert.equal(engine.getWeaponStats('CHARACTER', items.Club).damage.die, 'd6');
});
