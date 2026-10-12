import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { build } = createRequire(`${root}/package.json`)('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-hazard-schema-'));
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

const { HazardSchema } = await import(pathToFileURL(outfile));

const hazard = {
  id: 1,
  uuid: 1465735844144675,
  created_at: '2026-09-28T00:00:00Z',
  type: 'hazard',
  name: 'A Simple Hazard',
  level: 12,
  rarity: 'COMMON',
  details: {
    complexity: 'SIMPLE',
    trait_ids: [],
    trait_labels: ['Environmental'],
    stealth: 'DC 30',
    description: 'The ground shifts.',
    disable: 'Survival DC 30',
    activation: {
      name: 'Sudden Collapse',
      actions: 'REACTION',
      trigger: 'A creature enters the area.',
      effect: 'The ground collapses.',
    },
  },
  content_source_id: 400,
  deprecated: false,
  version: '1.0',
  meta_data: { source: { book: 'War of Immortals', page: '200' } },
};

test('hazard stat blocks need no living-entity fields or defenses', () => {
  const parsed = HazardSchema.parse(hazard);
  assert.deepEqual(parsed, hazard);
  assert.equal(JSON.stringify(parsed), JSON.stringify(hazard));
  assert.equal(parsed.details.defenses, undefined);
  assert.equal(parsed.details.activation.actions, 'REACTION');
  assert.equal('hp_current' in parsed, false);
});

/** Optional manual rules retain source order without inferring combat state. */
function extendedHazard() {
  return {
    ...structuredClone(hazard),
    details: {
      ...structuredClone(hazard.details),
      defenses: {
        hp_note: '6 per 5-foot cube',
        weaknesses: 'fire 5',
        resistances: 'physical 5',
      },
      activation: { ...hazard.details.activation, requirements: 'The chamber is open.' },
      passive_abilities: [
        { name: 'Colony', text: 'The colony covers multiple cubes.' },
        { name: 'Colony', text: 'A second source entry remains independent.' },
      ],
      secondary_activities: [
        { name: 'Grow', actions: 'ONE-ACTION', traits: ['Acid'], effect: 'The colony grows.' },
        {
          name: 'Burst',
          actions: 'FREE-ACTION',
          trigger: 'The colony is disturbed.',
          requirements: 'The colony occupies the chamber.',
          effect: 'The colony bursts.',
        },
      ],
    },
  };
}

test('all optional hazard rules round-trip exactly with independent ordered entries', () => {
  const extended = extendedHazard();
  const parsed = HazardSchema.parse(extended);
  assert.deepEqual(parsed, extended);
  assert.equal('hp' in parsed.details.defenses, false);
  assert.equal('trigger' in parsed.details.secondary_activities[0], false);
  assert.equal('requirements' in parsed.details.secondary_activities[0], false);
  assert.equal('passive_abilities' in HazardSchema.parse(hazard).details, false);
  assert.equal('secondary_activities' in HazardSchema.parse(hazard).details, false);
  assert.equal('requirements' in HazardSchema.parse(hazard).details.activation, false);
});

test('explicit empty optional arrays and absent action costs are retained, not defaulted', () => {
  const extended = extendedHazard();
  extended.details.passive_abilities = [];
  extended.details.secondary_activities = [{ name: 'Wait', effect: 'Nothing happens yet.' }];
  assert.deepEqual(HazardSchema.parse(extended), extended);
  extended.details.secondary_activities = [];
  assert.deepEqual(HazardSchema.parse(extended), extended);
});

const malformedOptionalRules = [
  ['HP note number', (details) => (details.defenses.hp_note = 6)],
  ['HP note null', (details) => (details.defenses.hp_note = null)],
  ['weaknesses array', (details) => (details.defenses.weaknesses = ['fire 5'])],
  ['resistances object', (details) => (details.defenses.resistances = { fire: 5 })],
  ['requirements number', (details) => (details.activation.requirements = 1)],
  ['passives null', (details) => (details.passive_abilities = null)],
  ['passives object', (details) => (details.passive_abilities = { name: 'Colony', text: 'Rules.' })],
  ['passive name missing', (details) => delete details.passive_abilities[0].name],
  ['passive text missing', (details) => delete details.passive_abilities[0].text],
  ['passive text number', (details) => (details.passive_abilities[0].text = 6)],
  ['activities null', (details) => (details.secondary_activities = null)],
  ['activity name missing', (details) => delete details.secondary_activities[0].name],
  ['activity effect missing', (details) => delete details.secondary_activities[0].effect],
  ['activity effect null', (details) => (details.secondary_activities[0].effect = null)],
  ['activity invalid cost', (details) => (details.secondary_activities[0].actions = 'FOUR-ACTIONS')],
  ['activity traits scalar', (details) => (details.secondary_activities[0].traits = 'Acid')],
  ['activity traits nonstring', (details) => (details.secondary_activities[0].traits = [1])],
  ['activity trigger number', (details) => (details.secondary_activities[0].trigger = 1)],
  ['activity requirements number', (details) => (details.secondary_activities[0].requirements = 1)],
];
for (const [name, change] of malformedOptionalRules) {
  test(`hazards reject malformed optional rules: ${name}`, () => {
    const extended = extendedHazard();
    change(extended.details);
    assert.equal(HazardSchema.safeParse(extended).success, false);
  });
}

for (const field of ['trigger', 'effect']) {
  test(`primary activation still requires ${field} when secondary activities are present`, () => {
    const extended = extendedHazard();
    delete extended.details.activation[field];
    assert.equal(HazardSchema.safeParse(extended).success, false);
  });
}

test('hazard defenses and routine remain structured when present', () => {
  const parsed = HazardSchema.parse({
    ...hazard,
    details: {
      ...hazard.details,
      complexity: 'COMPLEX',
      defenses: { ac: 36, hp: 120, bt: 60, immunities: 'critical hits' },
      routine: { actions: 3, text: 'The hazard acts three times.' },
      reset: 'The hazard resets after 1 hour.',
    },
  });
  assert.equal(parsed.details.defenses?.bt, 60);
  assert.equal(parsed.details.routine?.actions, 3);
});

test('hazards reject incomplete rules and creature rows', () => {
  assert.equal(HazardSchema.safeParse({ ...hazard, type: 'creature' }).success, false);
  assert.equal(
    HazardSchema.safeParse({ ...hazard, details: { ...hazard.details, activation: undefined } }).success,
    false
  );
  assert.equal(
    HazardSchema.safeParse({ ...hazard, details: { ...hazard.details, disable: undefined } }).success,
    false
  );
});

test('all five existing official hazard details remain exact without newly optional defaults', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20260928020000_war_of_immortals_hazards.sql', import.meta.url),
    'utf8'
  );
  const entries = JSON.parse(migration.split('$entries$')[1]);
  assert.equal(entries.length, 5);
  for (const entry of entries) {
    const parsed = HazardSchema.parse({ ...hazard, name: entry.name, details: entry.details });
    assert.deepEqual(parsed.details, entry.details, entry.name);
    assert.equal('passive_abilities' in parsed.details, false, entry.name);
    assert.equal('secondary_activities' in parsed.details, false, entry.name);
    assert.equal('requirements' in parsed.details.activation, false, entry.name);
    if (parsed.details.defenses) {
      for (const field of ['hp_note', 'weaknesses', 'resistances']) {
        assert.equal(field in parsed.details.defenses, false, `${entry.name}: ${field}`);
      }
    }
  }
});

test('the public API documents optional hazard fields without weakening the primary activation', async () => {
  const spec = JSON.parse(await readFile(new URL('../../docs/api-reference/openapi.json', import.meta.url), 'utf8'));
  const details = spec.components.schemas.Hazard.properties.details;
  assert.deepEqual(details.required, ['complexity', 'trait_labels', 'stealth', 'description', 'disable', 'activation']);
  assert.deepEqual(details.properties.activation.required, ['name', 'trigger', 'effect']);
  for (const field of ['hp_note', 'weaknesses', 'resistances']) {
    assert.deepEqual(details.properties.defenses.properties[field].type, 'string');
  }
  assert.equal(details.properties.activation.properties.requirements.type, 'string');
  assert.deepEqual(details.properties.passive_abilities.items.required, ['name', 'text']);
  const secondary = details.properties.secondary_activities.items;
  assert.deepEqual(secondary.required, ['name', 'effect']);
  assert.deepEqual(secondary.properties.actions, { $ref: '#/components/schemas/ActionCost' });
  assert.equal(secondary.properties.trigger.type, 'string');
  assert.equal(secondary.properties.requirements.type, 'string');
  assert.equal('default' in details.properties.passive_abilities, false);
  assert.equal('default' in details.properties.secondary_activities, false);
});
