import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { build } = createRequire(`${root}/package.json`)('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-creature-stat-block-'));
const outfile = join(directory, 'content.mjs');

after(() => rm(directory, { recursive: true, force: true }));

await build({
  entryPoints: [`${root}/src/schemas/content.ts`],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  tsconfig: `${root}/tsconfig.json`,
});

const { CreatureSchema, ItemSchema } = await import(pathToFileURL(outfile));

const creature = {
  id: 1,
  created_at: '2026-09-29T00:00:00Z',
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
};

test('existing creatures need no stat-block annotations', () => {
  assert.equal(CreatureSchema.safeParse(creature).success, true);
});

test('creature stat-line annotations retain source details', () => {
  const parsed = CreatureSchema.parse({
    ...creature,
    meta_data: {
      stat_block: {
        languages_note: 'cannot speak',
        listed_senses: ['darkvision', 'scent'],
        trait_labels: { 4214: 'Unholy' },
        listed_skills: ['SKILL_ACROBATICS'],
        defenses_note: 'mythic resilience',
        hp_note: 'regeneration 30',
        immunities_note: 'mythic immunity',
        resistances_note: 'mythic resistance 15',
        recall_knowledge: 'beast (Nature), humanoid (Society)',
        omit_innate_attack: true,
        innate_spell_frequencies: { '5:sending': 'AT-WILL', '7:truespeech': 'CONSTANT' },
      },
    },
  });

  assert.equal(parsed.meta_data?.stat_block?.listed_skills?.[0], 'SKILL_ACROBATICS');
  assert.deepEqual(parsed.meta_data?.stat_block?.listed_senses, ['darkvision', 'scent']);
  assert.equal(parsed.meta_data?.stat_block?.trait_labels?.['4214'], 'Unholy');
  assert.equal(parsed.meta_data?.stat_block?.recall_knowledge, 'beast (Nature), humanoid (Society)');
  assert.equal(parsed.meta_data?.stat_block?.immunities_note, 'mythic immunity');
  assert.equal(parsed.meta_data?.stat_block?.innate_spell_frequencies?.['7:truespeech'], 'CONSTANT');
  assert.equal(
    CreatureSchema.safeParse({
      ...creature,
      meta_data: { stat_block: { innate_spell_frequencies: { '5:sending': 'SOMETIMES' } } },
    }).success,
    false
  );
});

test('embedded attacks retain display-only trait text', () => {
  const item = ItemSchema.parse({
    id: 2,
    created_at: '2026-09-29T00:00:00Z',
    name: 'Debris Toss',
    price: null,
    bulk: null,
    level: 0,
    rarity: 'COMMON',
    traits: [],
    description: '',
    group: 'WEAPON',
    hands: null,
    size: 'MEDIUM',
    craft_requirements: null,
    usage: null,
    meta_data: { bulk: {}, display_traits: ['deadly 2d8'], inventory_label: '+1 debris toss' },
    operations: null,
    content_source_id: 400,
    version: '1.0',
  });

  assert.deepEqual(item.meta_data?.display_traits, ['deadly 2d8']);
  assert.equal(item.meta_data?.inventory_label, '+1 debris toss');
});
