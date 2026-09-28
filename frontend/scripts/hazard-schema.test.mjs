import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
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
  assert.equal(parsed.details.defenses, undefined);
  assert.equal(parsed.details.activation.actions, 'REACTION');
  assert.equal('hp_current' in parsed, false);
});

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
