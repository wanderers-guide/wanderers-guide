/** Exercise hazard encounter snapshots and state through the actual TypeScript helpers and Zod schemas. */
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { build } = createRequire(`${root}/package.json`)('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-encounter-hazards-'));
const outfile = join(directory, 'encounter-hazards.mjs');
after(() => rm(directory, { recursive: true, force: true }));

await build({
  absWorkingDir: root,
  stdin: {
    contents: `export * from './src/utils/encounter-hazard'; export { CombatantSchema, EncounterSchema, HazardSchema, CreatureSchema, LivingEntitySchema } from './src/schemas/content';`,
    resolveDir: root,
    loader: 'ts',
  },
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  tsconfig: `${root}/tsconfig.json`,
});

const {
  CombatantSchema,
  EncounterSchema,
  HazardSchema,
  CreatureSchema,
  LivingEntitySchema,
  createHazardCombatant,
  isHazardCombatant,
  getHazardCurrentHp,
  updateHazardHp,
  getHazardInitiativeModifier,
  getHazardXpMultiplier,
} = await import(pathToFileURL(outfile));

const migration = await readFile(
  new URL('../../supabase/migrations/20260928020000_war_of_immortals_hazards.sql', import.meta.url),
  'utf8'
);
const hazards = JSON.parse(migration.split('$entries$')[1]).map((entry, index) =>
  HazardSchema.parse({
    id: index + 1,
    uuid: entry.uuid,
    created_at: '2026-09-28T00:00:00.000Z',
    type: 'hazard',
    name: entry.name,
    level: entry.level,
    rarity: 'RARE',
    details: entry.details,
    content_source_id: 400,
    deprecated: false,
    version: '1.0',
    meta_data: { source: { book: 'War of Immortals', page: entry.page, url: entry.url } },
  })
);

/** Keep each test's catalog and instance mutations independent. */
function hazardByName(name) {
  const hazard = hazards.find((entry) => entry.name === name);
  assert.ok(hazard, `missing official hazard fixture ${name}`);
  return structuredClone(hazard);
}

/** Match the existing encounter JSON shape passed to create/update encounter. */
function encounterWith(combatants) {
  return {
    id: 1,
    created_at: '2026-09-30T00:00:00.000Z',
    user_id: 'gm',
    name: 'Hazard encounter',
    icon: 'hazard',
    color: 'red',
    campaign_id: null,
    combatants: { list: combatants },
    meta_data: { party_level: 7, party_size: 4 },
  };
}

test('all five official hazards create valid encounter instances without living-entity fields', () => {
  assert.equal(hazards.length, 5);
  for (const hazard of hazards) {
    const combatant = createHazardCombatant(hazard, `hazard-${hazard.id}`);
    assert.deepEqual(CombatantSchema.parse(combatant), combatant);
    assert.equal(isHazardCombatant(combatant), true);
    assert.equal(combatant._id, `hazard-${hazard.id}`);
    assert.equal(combatant.ally, false);
    assert.equal(combatant.hazard_state.disabled, false);
    assert.equal(combatant.initiative, undefined);
    assert.equal(combatant.data, undefined);
    assert.equal(combatant.creature, undefined);
    assert.equal(combatant.character, undefined);
    assert.deepEqual(combatant.hazard, hazard);
    assert.equal(combatant.hazard_state.hp_current, hazard.details.defenses?.hp);
    assert.equal('hp_current' in combatant.hazard_state, hazard.name === 'Boneburst');
  }
});

test('each instance has its own ID, snapshot, and state without changing catalog rows', () => {
  const catalog = hazardByName('Boneburst');
  const original = structuredClone(catalog);
  const first = createHazardCombatant(catalog, 'first-boneburst');
  const second = createHazardCombatant(catalog, 'second-boneburst');
  assert.notEqual(first._id, second._id);
  assert.notEqual(first.hazard, catalog);
  assert.notEqual(first.hazard, second.hazard);
  assert.notEqual(first.hazard.details, second.hazard.details);
  assert.notEqual(first.hazard_state, second.hazard_state);
  const damaged = updateHazardHp(first, 40);
  assert.equal(getHazardCurrentHp(damaged), 40);
  assert.equal(getHazardCurrentHp(first), 90);
  assert.equal(getHazardCurrentHp(second), 90);
  assert.notEqual(damaged.hazard_state, first.hazard_state);
  assert.equal(damaged.hazard, first.hazard);
  first.hazard.details.trait_ids.push(999);
  first.hazard.meta_data.source.page = '999';
  assert.deepEqual(catalog, original);
  assert.deepEqual(second.hazard, original);
});

test('listed HP clamps independently and never disables at the broken threshold or zero HP', () => {
  const combatant = createHazardCombatant(hazardByName('Boneburst'), 'boneburst');
  assert.equal(getHazardCurrentHp(combatant), 90);
  assert.equal(combatant.hazard.details.defenses.bt, 45);
  for (const [input, expected] of [
    [999, 90],
    [45, 45],
    [44, 44],
    [0, 0],
    [-20, 0],
  ]) {
    const updated = updateHazardHp(combatant, input);
    assert.equal(getHazardCurrentHp(updated), expected);
    assert.equal(updated.hazard_state.disabled, false);
    assert.equal(updated.hazard.details.defenses.hp, 90);
    assert.equal(updated.hazard.details.defenses.bt, 45);
  }
  const disabled = { ...combatant, hazard_state: { ...combatant.hazard_state, disabled: true } };
  assert.equal(updateHazardHp(disabled, 90).hazard_state.disabled, true);
  for (const invalid of [NaN, Infinity, -Infinity]) assert.equal(updateHazardHp(combatant, invalid), combatant);
  assert.equal(getHazardCurrentHp({ ...combatant, hazard_state: { disabled: false } }), 90);
});

test('hazards without listed HP never acquire HP from damage or healing controls', () => {
  for (const hazard of hazards.filter((entry) => entry.name !== 'Boneburst')) {
    const combatant = createHazardCombatant(hazard, `no-hp-${hazard.id}`);
    assert.equal(getHazardCurrentHp(combatant), undefined);
    assert.equal(updateHazardHp(combatant, 10), combatant);
    assert.equal('hp_current' in combatant.hazard_state, false);
    assert.equal(getHazardCurrentHp({ ...combatant, hazard_state: { hp_current: 50 } }), undefined);
  }
  const withoutHp = hazardByName('Boneburst');
  delete withoutHp.details.defenses.hp;
  const combatant = createHazardCombatant(withoutHp, 'defenses-without-hp');
  assert.equal(getHazardCurrentHp(combatant), undefined);
  assert.equal(updateHazardHp(combatant, 10), combatant);
});

test('only complex hazards use their explicitly listed leading signed initiative modifier', () => {
  const modifiers = new Map([
    ['Boneburst', 38],
    ["Lightning's Dance", 20],
    ['Primal Chaos Aura', 11],
    ['Trump of the Oliphaunt', 25],
    ['Wind Surge', undefined],
  ]);
  for (const hazard of hazards) assert.equal(getHazardInitiativeModifier(hazard), modifiers.get(hazard.name));
  const complex = hazardByName('Primal Chaos Aura');
  for (const [stealth, expected] of [
    ['  -4 (trained) to notice', -4],
    ['+0', 0],
    ['+17 (expert) or DC 40 (master)', 17],
    ['DC 27 (expert)', undefined],
    ['DC 27 or +17', undefined],
    ['17', undefined],
    ['', undefined],
    ['+17.5', undefined],
    ['+17unknown', undefined],
  ]) {
    assert.equal(getHazardInitiativeModifier({ ...complex, details: { ...complex.details, stealth } }), expected);
  }
  const simple = hazardByName('Wind Surge');
  assert.equal(getHazardInitiativeModifier({ ...simple, details: { ...simple.details, stealth: '+17' } }), undefined);
});

test('simple hazard XP is one fifth and complex hazard XP equals creature XP', () => {
  for (const hazard of hazards) {
    const multiplier = getHazardXpMultiplier(hazard);
    assert.equal(multiplier, hazard.name === 'Wind Surge' ? 0.2 : 1);
    assert.equal(40 * multiplier, hazard.name === 'Wind Surge' ? 8 : 40);
  }
});

test('save and reload retain all hazard snapshots, independent state, and initiative', () => {
  const catalog = structuredClone(hazards);
  const instances = catalog.map((hazard) => createHazardCombatant(hazard, `saved-${hazard.id}`));
  instances[0] = {
    ...updateHazardHp(instances[0], 34),
    initiative: 48,
    hazard_state: { hp_current: 34, disabled: true },
  };
  instances.push(createHazardCombatant(catalog[0], 'another-boneburst'));
  const before = EncounterSchema.parse(encounterWith(instances));
  const savedJson = JSON.stringify(before);
  catalog[0].name = 'Updated catalog name';
  catalog[0].details.defenses.hp = 999;
  const reloaded = EncounterSchema.parse(JSON.parse(savedJson));
  assert.deepEqual(reloaded, before);
  assert.equal(reloaded.combatants.list[0].hazard.name, 'Boneburst');
  assert.equal(reloaded.combatants.list[0].hazard.details.defenses.hp, 90);
  assert.equal(getHazardCurrentHp(reloaded.combatants.list[0]), 34);
  assert.equal(reloaded.combatants.list[0].hazard_state.disabled, true);
  assert.equal(reloaded.combatants.list[0].initiative, 48);
  assert.equal(getHazardCurrentHp(reloaded.combatants.list.at(-1)), 90);
  assert.equal(new Set(reloaded.combatants.list.map(({ _id }) => _id)).size, instances.length);
});

test('hazard encounter validation requires a valid stat block and preserves optional state', () => {
  const combatant = createHazardCombatant(hazardByName('Wind Surge'), 'wind-surge');
  assert.equal(CombatantSchema.safeParse({ ...combatant, hazard: undefined }).success, false);
  assert.equal(
    CombatantSchema.safeParse({ ...combatant, hazard: { ...combatant.hazard, type: 'creature' } }).success,
    false
  );
  assert.equal(
    CombatantSchema.safeParse({
      ...combatant,
      hazard: { ...combatant.hazard, details: { ...combatant.hazard.details, activation: undefined } },
    }).success,
    false
  );
  const { hazard_state, ...withoutState } = combatant;
  assert.deepEqual(CombatantSchema.parse(withoutState), withoutState);
  assert.deepEqual(CombatantSchema.parse({ ...combatant, hazard_state: { disabled: true } }).hazard_state, {
    disabled: true,
  });
  assert.equal(CombatantSchema.safeParse({ ...combatant, hazard_state: { hp_current: -1 } }).success, false);
});

test('existing creature and character combatants retain optional fields and JSON round trips', () => {
  // The legacy encounter shape matches the existing creature-stat-block schema fixture.
  const creature = CreatureSchema.parse({
    id: 1,
    created_at: '2026-09-29T00:00:00.000Z',
    name: 'Creature',
    level: 4,
    experience: 0,
    rarity: 'UNIQUE',
    inventory: null,
    hp_current: 60,
    hp_temp: 0,
    stamina_current: 0,
    resolve_current: 0,
    details: { description: '' },
    notes: null,
    roll_history: null,
    spells: null,
    operation_data: null,
    operations: null,
    abilities_base: null,
    abilities_added: null,
    meta_data: null,
    content_source_id: 400,
    deprecated: false,
    version: '1.0',
  });
  const data = LivingEntitySchema.parse(creature);
  const legacy = [
    { _id: 'minimal-creature', type: 'CREATURE', ally: false },
    { _id: 'minimal-character', type: 'CHARACTER', ally: true },
    { _id: 'creature', type: 'CREATURE', ally: false, initiative: 12, creature, data },
    { _id: 'character', type: 'CHARACTER', ally: true, initiative: 18, character: 142809, data },
  ];
  for (const combatant of legacy) {
    assert.deepEqual(CombatantSchema.parse(combatant), combatant);
    assert.equal(isHazardCombatant(combatant), false);
    assert.equal(getHazardCurrentHp(combatant), undefined);
    assert.equal(updateHazardHp(combatant, 0), combatant);
  }
  const mixed = EncounterSchema.parse(
    encounterWith([...legacy, createHazardCombatant(hazardByName('Boneburst'), 'mixed-boneburst')])
  );
  const reloaded = EncounterSchema.parse(JSON.parse(JSON.stringify(mixed)));
  assert.deepEqual(reloaded.combatants.list.slice(0, legacy.length), legacy);
  assert.equal(reloaded.combatants.list.at(-1).type, 'HAZARD');
});
