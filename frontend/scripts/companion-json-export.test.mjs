import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { AbilityBlockSchema, CreatureSchema, SpellSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const op = (id, type, data) => ({ id, type, data });
const set = (variable, value) => op(`set-${variable}`, 'setValue', { variable, value });
let engine;
let fixtures;
let sources;
let baseAbility;
let addedAbility;
const originalWindow = globalThis.window;

const companion = (overrides = {}) =>
  CreatureSchema.parse({
    id: 990225,
    name: 'Export companion',
    level: 2,
    rarity: 'COMMON',
    created_at: '',
    version: '1.0',
    content_source_id: 990225,
    deprecated: false,
    details: { description: '', conditions: [] },
    experience: 0,
    hp_current: 3,
    hp_temp: 0,
    stamina_current: 0,
    resolve_current: 0,
    notes: null,
    roll_history: null,
    spells: null,
    meta_data: {},
    operation_data: { selections: {} },
    inventory: { items: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
    abilities_base: [],
    abilities_added: [],
    operations: [],
    ...overrides,
  });
const character = (list = []) => ({
  id: 990224,
  name: 'Export owner',
  level: 5,
  hero_points: 1,
  details: {},
  inventory: { items: [] },
  operation_data: { selections: {} },
  content_sources: { enabled: sources },
  companions: { list },
  options: { custom_operations: true },
  custom_operations: [set('SPEED', 35)],
});
const download = async (entity) => {
  const saved = structuredClone(entity);
  await engine.jsonV4(entity);
  assert.deepEqual(entity, saved, 'export does not rewrite saved character or companion records');
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  return engine.getJsonDownload().value;
};

before(async () => {
  globalThis.window = {};
  engine = await createOperationEngine({ exportJson: true });
  fixtures = await readContentRows([
    { table: 'ability_block', id: 19330 },
    { table: 'ability_block', id: 21493 },
    { table: 'trait', id: 1654 },
    { table: 'language', id: 81 },
    { table: 'spell', id: 4623 },
  ]);
  const feat = fixtures.find(({ row }) => row.id === 21493).row;
  baseAbility = AbilityBlockSchema.parse({
    ...feat,
    id: 990225,
    name: 'Export base ability',
    type: 'action',
    operations: [],
  });
  addedAbility = AbilityBlockSchema.parse({
    ...feat,
    id: 990226,
    name: 'Export added ability',
    content_source_id: 990225,
    operations: [],
  });
  const spell = SpellSchema.parse(fixtures.find(({ table }) => table === 'spell').row);
  sources = [...new Set([...fixtures.map(({ row }) => row.content_source_id), 990225])];
  fixtures.push(
    { table: 'ability_block', row: addedAbility },
    {
      table: 'spell',
      row: SpellSchema.parse({ ...spell, id: 990225, name: 'Disabled source spell', content_source_id: 990226 }),
    }
  );
});
after(async () => {
  globalThis.window = originalWindow;
  await engine?.cleanup();
});
beforeEach(() => {
  engine.resetVariables();
  engine.clearDeferredOperations();
  engine.clearJsonDownload();
  engine.clearOperationErrorNotifications();
  engine.setFixtures(fixtures);
});

test('exports calculated companion stats, named content, abilities, spells and defenses in version 4', async () => {
  const child = companion({
    abilities_base: [baseAbility],
    abilities_added: [addedAbility.id],
    operations: [
      set('ATTRIBUTE_STR', { value: 4 }),
      set('ATTRIBUTE_DEX', { value: 3 }),
      set('ATTRIBUTE_CON', { value: 2 }),
      set('ATTRIBUTE_WIS', { value: 1 }),
      set('ATTRIBUTE_INT', { value: 2 }),
      set('MAX_HEALTH_ANCESTRY', 20),
      set('UNARMORED_DEFENSE', { value: 'T' }),
      set('PERCEPTION', { value: 'E' }),
      set('SKILL_ATHLETICS', { value: 'T' }),
      set('SAVE_FORT', { value: 'T' }),
      set('SPELL_ATTACK', { value: 'T' }),
      set('SPELL_DC', { value: 'T' }),
      set('SPEED', 25),
      set('SPEED_FLY', 40),
      set('SIZE', 'SMALL'),
      set('RESISTANCES', ['fire,5']),
      set('WEAKNESSES', ['cold,3']),
      set('IMMUNITIES', ['sleep']),
      op('plant', 'giveTrait', { traitId: 1654 }),
      op('common', 'giveLanguage', { languageId: 81 }),
      op('vision', 'giveAbilityBlock', { type: 'sense', abilityBlockId: 19330 }),
      op('casting', 'defineCastingSource', {
        variable: 'CASTING_SOURCES',
        value: 'Companion Magic:::PREPARED:::ARCANE:::ATTRIBUTE_INT',
      }),
      op('spell', 'giveSpell', { spellId: 4623, type: 'NORMAL', rank: 3, castingSource: 'Companion Magic' }),
      op('focus', 'giveSpell', { spellId: 4623, type: 'FOCUS', rank: 3, castingSource: 'Companion Magic' }),
      op('innate', 'giveSpell', { spellId: 4623, type: 'INNATE', rank: 3, tradition: 'ARCANE', casts: 2 }),
      op('slots', 'giveSpellSlot', { castingSource: 'Companion Magic', slots: [{ lvl: 2, rank: 3, amt: 2 }] }),
    ],
  });
  const result = await download(character([child]));
  assert.equal(result.version, 4);
  assert.deepEqual(Object.keys(result).sort(), ['character', 'content', 'version']);
  const entry = result.content.companions[0];
  assert.deepEqual([entry.index, entry.id, entry.name], [0, child.id, child.name]);
  const compiled = entry.content;
  assert.equal(compiled.max_hp, 24);
  assert.equal(compiled.ac, 17);
  assert.equal(compiled.attributes.ATTRIBUTE_STR.value, 4);
  assert.equal(compiled.proficiencies.SKILL_ATHLETICS.total, '+8');
  assert.equal(compiled.proficiencies.PERCEPTION.total, '+7');
  assert.equal(compiled.proficiencies.SAVE_FORT.total, '+6');
  assert.equal(compiled.size, 'Small');
  assert.equal(compiled.speeds.find(({ name }) => name === 'SPEED_FLY').value.total, 40);
  assert.deepEqual(compiled.languages, ['COMMON']);
  assert.equal(compiled.senses.precise[0].sense.name, 'Low-Light Vision');
  assert.equal(compiled.character_traits[0].id, 1654);
  assert.equal(compiled.feats_features.baseAbilities[0].name, baseAbility.name);
  assert.equal(compiled.feats_features.addedAbilities[0].name, addedAbility.name);
  assert.equal(compiled.spells.normal[0].name, 'Fireball');
  assert.equal(compiled.focus_spells[0].name, 'Fireball');
  assert.equal(compiled.innate_spells[0].spell.name, 'Fireball');
  assert.equal(compiled.spell_slots.length, 2);
  assert.equal(compiled.spell_sources[0].stats.spell_attack.total[0], 6);
  assert.deepEqual(compiled.resist_weaks, { resists: ['Fire 5'], weaks: ['Cold 3'], immunes: ['Sleep'] });
  assert.ok(!compiled.all_spells.some(({ name }) => name === 'Disabled source spell'));
  assert.deepEqual(result.character.companions.list, [child]);
});

test('duplicate catalog IDs retain separate calculations and current owner and self bindings', async () => {
  engine.setVariable('COMPANION_6', 'SPEED', 77);
  engine.setVariable('CREATURE_990225', 'SPEED', 66);
  const first = companion({
    level: -100,
    operations: [
      set('MAX_HEALTH_ANCESTRY', 20),
      set('ATTRIBUTE_CON', { value: 2 }),
      op('owner-speed', 'bindValue', { variable: 'SPEED', value: { storeId: 'CHARACTER', variable: 'SPEED' } }),
      op('temporary', 'createValue', { variable: 'EXPORT_ONLY', type: 'num', value: 99 }),
      op('self-speed', 'bindValue', { variable: 'SPEED_CLIMB', value: { storeId: 'COMPANION_0', variable: 'SPEED' } }),
    ],
  });
  const second = companion({
    name: 'Second companion',
    operations: [set('SPEED', 15), set('MAX_HEALTH_ANCESTRY', 10)],
  });
  const result = await download(character([first, second]));
  assert.deepEqual(
    result.content.companions.map(({ index, id, content }) => [index, id, content.max_hp]),
    [
      [0, first.id, 30],
      [1, second.id, 10],
    ]
  );
  assert.equal(result.content.companions[0].content.speeds.find(({ name }) => name === 'SPEED').value.total, 35);
  assert.equal(result.content.companions[0].content.speeds.find(({ name }) => name === 'SPEED_CLIMB').value.total, 35);
  assert.equal(result.content.companions[1].content.speeds.find(({ name }) => name === 'SPEED').value.total, 15);
  assert.equal(engine.getVariable('CHARACTER', 'SPEED').value, 35);
  assert.equal(engine.getVariable('COMPANION_6', 'SPEED').value, 77);
  assert.equal(engine.getVariable('CREATURE_990225', 'SPEED').value, 66);
});

test('applies saved companion conditions to exported totals', async () => {
  const child = companion({
    operations: [set('UNARMORED_DEFENSE', { value: 'T' }), set('ATTRIBUTE_DEX', { value: 3 })],
    details: {
      description: '',
      conditions: [{ name: 'Frightened', value: 1, description: '', for_creature: true, for_object: false }],
    },
  });
  const compiled = (await download(character([child]))).content.companions[0].content;
  assert.equal(compiled.ac, 16);
});

test('characters without companions keep all existing compiled fields and export an empty companion list', async () => {
  const result = await download(character());
  assert.deepEqual(result.content.companions, []);
  assert.equal(result.content.speeds.find(({ name }) => name === 'SPEED').value.total, 35);
});

test('standalone creature exports retain their existing version 4 shape', async () => {
  const result = await download(companion({ operations: [set('MAX_HEALTH_ANCESTRY', 12)] }));
  assert.equal(result.content.max_hp, 12);
  assert.equal(result.content.companions, undefined);
});
