import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { build } = createRequire(`${root}/package.json`)('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-innate-stat-block-'));
const outfile = join(directory, 'innate-stat-block.mjs');

after(() => rm(directory, { recursive: true, force: true }));

await build({
  entryPoints: [`${root}/src/process/spells/innate-stat-block.ts`],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  tsconfig: `${root}/tsconfig.json`,
});

const { getInnateStatBlockGroups } = await import(pathToFileURL(outfile));
const spell = (name, rank, cantrip = false) => ({ rank, spell: { name, traits: cantrip ? [1858] : [] } });
const summary = (groups) => groups.map(({ kind, rank, spells }) => [kind, rank, spells.map(({ spell }) => spell.name)]);

test('heightened cantrips and constant spells retain separate source headings', () => {
  const groups = getInnateStatBlockGroups(
    [
      spell('Daze', 10, true),
      spell('Truesight', 6),
      spell('Shadow Blast', 10),
      spell('Translocate', 5),
      spell('Figment', 10, true),
      spell('Dominate', 10),
    ],
    21,
    { '6:truesight': 'CONSTANT', '5:translocate': 'AT-WILL' }
  );

  assert.deepEqual(summary(groups), [
    ['rank', 10, ['Shadow Blast', 'Dominate']],
    ['rank', 5, ['Translocate']],
    ['cantrip', 10, ['Daze', 'Figment']],
    ['constant', 6, ['Truesight']],
  ]);
});

test('Trickster and Weaver keep their source-specific cantrip and constant ranks', () => {
  const trickster = getInnateStatBlockGroups(
    [spell('Detect Magic', 6, true), spell('Cursed Metamorphosis', 6), spell('Truespeech', 5)],
    11,
    { '5:truespeech': 'CONSTANT' }
  );
  const weaver = getInnateStatBlockGroups([spell('Truespeech', 7), spell('Sending', 5), spell('Web', 2)], 15, {
    '7:truespeech': 'CONSTANT',
    '5:sending': 'AT-WILL',
    '2:web': 'AT-WILL',
  });

  assert.deepEqual(summary(trickster), [
    ['rank', 6, ['Cursed Metamorphosis']],
    ['cantrip', 6, ['Detect Magic']],
    ['constant', 5, ['Truespeech']],
  ]);
  assert.deepEqual(summary(weaver), [
    ['rank', 5, ['Sending']],
    ['rank', 2, ['Web']],
    ['constant', 7, ['Truespeech']],
  ]);
});

test('legacy rank-zero cantrips use the creature level without changing spells', () => {
  const entries = [spell('Light', 0, true), spell('Heal', 3)];
  const groups = getInnateStatBlockGroups(entries, 7);

  assert.deepEqual(summary(groups), [
    ['rank', 3, ['Heal']],
    ['cantrip', 4, ['Light']],
  ]);
  assert.equal(groups[1].spells[0], entries[0]);
});
