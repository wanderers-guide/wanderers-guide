import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { ItemSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260929080000_war_of_immortals_holy_rune.sql', import.meta.url),
  'utf8'
);
const rows = await readContentRows([
  { table: 'item', id: 17101 },
  { table: 'item', id: 17102 },
  { table: 'item', id: 7040 },
]);
const weapon = rows.find(({ row }) => row.id === 17101).row;
const shadowpiercer = rows.find(({ row }) => row.id === 17102).row;
const holy = rows.find(({ row }) => row.id === 7040).row;
const patched = structuredClone(weapon);
const runeSnapshot = structuredClone(holy);
delete runeSnapshot.updated_at;
delete runeSnapshot.search_tsv;
runeSnapshot.description = runeSnapshot.description.replace('[**Holy Healing**](link_spell_3371)', '**Holy Healing**');
patched.meta_data.runes.property = [{ id: holy.id, name: holy.name, rune: runeSnapshot }];

let engine;
before(async () => {
  engine = await createOperationEngine();
});
after(async () => engine?.cleanup());

test('Freedom’s Flame gains the complete corrected Holy rune', () => {
  assert.equal(weapon.content_source_id, 400);
  assert.equal(weapon.name, "Freedom's Flame");
  assert.equal(weapon.level, 21);
  assert.equal(weapon.meta_data.source.url, 'https://2e.aonprd.com/Equipment.aspx?ID=3509');
  assert.deepEqual(weapon.meta_data.runes.property, []);
  assert.equal(holy.id, 7040);
  assert.equal(holy.content_source_id, 7);
  assert.equal(holy.meta_data.source.url, 'https://2e.aonprd.com/Equipment.aspx?ID=2842');
  assert.deepEqual(holy.traits, [1504, 1630]);
  assert.deepEqual(holy.meta_data.damage, { die: 'd4', dice: 1, extra: '', damageType: 'spirit' });
  assert.match(holy.description, /\[\*\*Holy Healing\*\*\]\(link_spell_3371\)/);
  assert.doesNotMatch(runeSnapshot.description, /link_spell_3371/);
  assert.equal(shadowpiercer.meta_data.runes.property[0].rune.id, 6992);
  assert.deepEqual(
    Object.keys(runeSnapshot).sort(),
    Object.keys(shadowpiercer.meta_data.runes.property[0].rune).sort()
  );
  assert.equal(ItemSchema.safeParse(patched).success, true);
  const expected = structuredClone(weapon);
  expected.meta_data.runes.property = [{ id: 7040, name: 'Holy', rune: runeSnapshot }];
  assert.deepEqual(patched, expected);
  assert.deepEqual(weapon.meta_data.runes.property, [], 'saved and source item snapshots are not mutated');
  assert.match(migration, /to_jsonb\(holy\) - 'updated_at' - 'search_tsv'/);
  assert.match(migration, /update public\.item set description = holy\.description where id = holy\.id/);
  assert.equal('search_tsv' in runeSnapshot, false);
  assert.match(migration, /property_runes is distinct from '\[\]'::jsonb/);
  assert.match(migration, /status->>'state' = 'PENDING'/);
});

test('Holy damage and trait work with War enabled and GM Core disabled', async () => {
  const savedItem = structuredClone(weapon);
  const character = {
    id: 1,
    level: 20,
    details: { conditions: [] },
    inventory: {
      items: [{ id: 'saved-weapon', item: savedItem, is_equipped: true, is_invested: false, container_contents: [] }],
    },
    operation_data: { selections: {} },
    content_sources: { enabled: [400] },
    options: { custom_operations: true, ignore_bulk_limit: true },
    custom_operations: [
      { id: 'str', type: 'setValue', data: { variable: 'ATTRIBUTE_STR', value: { value: 4 } } },
      { id: 'simple', type: 'setValue', data: { variable: 'SIMPLE_WEAPONS', value: { value: 'T' } } },
    ],
  };
  const saved = structuredClone(character);
  const content = {
    abilityBlocks: [],
    classes: [],
    ancestries: [],
    backgrounds: [],
    items: [patched],
    traits: [],
    languages: [],
    spells: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    defaultSources: { PAGE: [400], INFO: [400] },
  };
  engine.setFixtures([{ table: 'item', row: patched }]);
  const result = await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-SHEET' });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(character, saved);
  assert.ok(!content.items.some(({ id }) => id === 7040), 'GM Core rune is not a separately enabled item');
  assert.ok(!engine.compileTraits(weapon).includes(1630));
  assert.ok(engine.compileTraits(patched).includes(1630));
  const oldDamage = engine.getWeaponStats('CHARACTER', weapon).damage.other;
  const holyDamage = engine.getWeaponStats('CHARACTER', patched).damage.other;
  assert.deepEqual(oldDamage, []);
  assert.deepEqual(
    holyDamage.map(({ dice, die, damageType }) => ({ dice, die, damageType })),
    [{ dice: 1, die: 'd4', damageType: 'spirit' }]
  );
});
