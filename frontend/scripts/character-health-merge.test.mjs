/** Exercise coupled HP/condition transitions through the real shared save merge. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(`${root}/package.json`);
const { build } = require('esbuild');
const bundled = await build({
  absWorkingDir: root,
  entryPoints: ['src/utils/character-merge.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
const { mergeCharacterSave } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);

const condition = (name, value = 1) => ({ name, value, description: 'Fixture', for_creature: true, for_object: false });
const row = (hp = 30, conditions = [], level = 5) => ({
  id: 1,
  name: 'Character',
  level,
  hp_current: hp,
  details: { conditions },
  updated_at: 'version-1',
});
const drainedConflict = (result) => result.conflicts.some((path) => path.includes('Drained'));
const healthConflict = (result) => result.conflicts.some((path) => path.includes('Dying/Wounded'));

test('equal numeric HP from separate Drained and damage actions is not a convergent transition', () => {
  const base = row();
  const drained = row(25, [condition('Drained')]);
  const damaged = row(25);
  assert.ok(drainedConflict(mergeCharacterSave(base, drained, damaged)));
  assert.ok(drainedConflict(mergeCharacterSave(base, damaged, drained)));
  assert.deepEqual(damaged, row(25), 'the merge cannot mutate the authoritative row');
});

test('a Drained increase clamped at zero cannot be split from concurrent healing', () => {
  const base = row(0);
  const drained = row(0, [condition('Drained')]);
  assert.ok(drainedConflict(mergeCharacterSave(base, drained, row(5))));
  assert.ok(drainedConflict(mergeCharacterSave(base, row(5), drained)));
});

test('Keep my edits retains the zero-clamped local Drained event with independent remote fields', () => {
  const base = { ...row(0), meta_data: { reset_hp: false } };
  const local = { ...base, details: { conditions: [condition('Drained')] } };
  const remote = {
    ...base,
    hp_current: 5,
    name: 'Remote name',
    notes: 'Remote notes',
    details: { conditions: [], background: 'Remote background' },
    meta_data: { reset_hp: true, extension: 'Remote metadata' },
  };
  const result = mergeCharacterSave(base, local, remote);
  assert.ok(drainedConflict(result));
  assert.equal(result.character.hp_current, 0);
  assert.deepEqual(result.character.details.conditions, local.details.conditions);
  assert.equal(result.character.meta_data.reset_hp, false);
  assert.equal(result.character.name, 'Remote name');
  assert.equal(result.character.notes, 'Remote notes');
  assert.equal(result.character.details.background, 'Remote background');
  assert.equal(result.character.meta_data.extension, 'Remote metadata');
});

test('Keep my edits retains a local heal without adopting the competing remote Drained event', () => {
  const base = row(0);
  const local = row(5);
  const remote = { ...row(0, [condition('Drained'), condition('Frightened')]), name: 'Remote name' };
  const result = mergeCharacterSave(base, local, remote);
  assert.ok(drainedConflict(result));
  assert.equal(result.character.hp_current, 5);
  assert.deepEqual(result.character.details.conditions, [condition('Frightened')]);
  assert.equal(result.character.name, 'Remote name');
});

test('a concurrent level change conflicts with the level used for the Drained HP transition', () => {
  const base = row();
  const drained = row(25, [condition('Drained')]);
  const result = mergeCharacterSave(base, drained, row(30, [], 6));
  assert.ok(drainedConflict(result));
  assert.equal(result.character.level, 5);
  const inverse = mergeCharacterSave(base, row(30, [], 6), drained);
  assert.ok(drainedConflict(inverse));
  assert.equal(inverse.character.hp_current, 30);
  assert.deepEqual(inverse.character.details.conditions, []);
});

test('convergent HP, level and Drained values remain safe even with unrelated name edits', () => {
  const base = row();
  const submitted = row(25, [condition('Drained')]);
  const remote = { ...submitted, updated_at: 'version-2' };
  const local = { ...submitted, name: 'Latest name' };
  const result = mergeCharacterSave(base, local, remote);
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.character.hp_current, 25);
  assert.equal(result.character.name, 'Latest name');
});

test('an exact accepted response loss never replays the Drained HP reduction', () => {
  const base = row();
  const submitted = row(25, [condition('Drained')]);
  const result = mergeCharacterSave(base, submitted, { ...submitted, updated_at: 'version-2' }, submitted);
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.character.hp_current, 25);
});

test('JSON-omitted condition properties do not conflict with an accepted save or independent remote edits', () => {
  const base = row();
  const submitted = row(25, [{ ...condition('Drained'), source: undefined }]);
  const remote = JSON.parse(JSON.stringify({ ...submitted, updated_at: 'version-2' }));
  remote.details.appearance = 'Remote edit';
  const local = { ...submitted, name: 'Later local name' };
  const result = mergeCharacterSave(base, local, remote, submitted);
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.character.hp_current, 25);
  assert.equal(result.character.details.conditions.length, 1);
  assert.equal(result.character.details.appearance, 'Remote edit');
  assert.equal(result.character.name, 'Later local name');
});

test('an explicit null and a deleted nested value remain distinct competing edits', () => {
  const base = { ...row(), details: { conditions: [], extension: 'Original' } };
  const local = { ...base, details: { conditions: [] } };
  const remote = { ...base, details: { conditions: [], extension: null } };
  const result = mergeCharacterSave(base, local, remote);
  assert.deepEqual(result.conflicts, ['details.extension']);
});

test('an uncertain submitted transition preserves later deliberate healing when committed or uncommitted', () => {
  const base = row();
  const submitted = row(25, [condition('Drained')]);
  const latest = { ...submitted, hp_current: 30, notes: 'Latest notes' };
  for (const remote of [base, { ...submitted, updated_at: 'version-2' }]) {
    const result = mergeCharacterSave(base, latest, remote, submitted);
    assert.deepEqual(result.conflicts, []);
    assert.equal(result.character.hp_current, 30);
    assert.equal(result.character.notes, 'Latest notes');
  }
});

test('a lost response followed by another HP edit retains a coupled conflict instead of guessing', () => {
  const base = row();
  const submitted = row(25, [condition('Drained')]);
  for (const remote of [row(25), row(22, [condition('Drained')])]) {
    const result = mergeCharacterSave(base, submitted, remote, submitted);
    assert.ok(drainedConflict(result));
  }
});

test('a conflicting uncertain submission retains the latest local health action and remote notes', () => {
  const base = row(0);
  const submitted = row(0, [condition('Drained')]);
  const latest = { ...submitted, hp_current: 5 };
  const result = mergeCharacterSave(base, latest, { ...row(10), notes: 'Remote notes' }, submitted);
  assert.ok(drainedConflict(result));
  assert.equal(result.character.hp_current, 5);
  assert.deepEqual(result.character.details.conditions, latest.details.conditions);
  assert.equal(result.character.notes, 'Remote notes');
});

test('existing Drained does not create a new transition during read, reload, or unrelated edits', () => {
  const base = row(25, [condition('Drained')]);
  const local = { ...base, name: 'Latest name' };
  const remote = { ...base, hp_current: 20, updated_at: 'version-2' };
  const result = mergeCharacterSave(base, local, remote);
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.character.hp_current, 20);
  assert.equal(result.character.name, 'Latest name');
  assert.deepEqual(mergeCharacterSave(remote, remote, remote).conflicts, []);
});

test('Drained changes still merge with unrelated names and keep existing condition-array conflict rules', () => {
  const base = row();
  const local = row(25, [condition('Drained')]);
  const named = mergeCharacterSave(base, local, { ...base, name: 'Remote name' });
  assert.deepEqual(named.conflicts, []);
  assert.equal(named.character.hp_current, 25);
  assert.equal(named.character.name, 'Remote name');
  const conditions = mergeCharacterSave(base, local, row(30, [condition('Frightened')]));
  assert.deepEqual(conditions.conflicts, ['details.conditions']);
});

test('reducing Drained introduces no healing transition or extra HP conflict', () => {
  const base = row(20, [condition('Drained', 2)]);
  const local = row(20, [condition('Drained', 1)]);
  const result = mergeCharacterSave(base, local, row(17, [condition('Drained', 2)]));
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.character.hp_current, 17);
  assert.equal(result.character.details.conditions[0].value, 1);
});

test('companion transitions receive the same coupling guard at their stable entry path', () => {
  const companion = { ...row(), id: 21 };
  const base = { ...row(), companions: { list: [companion] } };
  const local = {
    ...base,
    companions: { list: [{ ...companion, hp_current: 25, details: { conditions: [condition('Drained')] } }] },
  };
  const remote = { ...base, companions: { list: [{ ...companion, hp_current: 25 }] } };
  const result = mergeCharacterSave(base, local, remote);
  assert.ok(result.conflicts.some((path) => path.startsWith('companions.list[21]') && path.includes('Drained')));
});

test('a companion Drained transition cannot silently adopt a changed inherited owner level', () => {
  const companion = { ...row(), id: 21, level: -100 };
  const base = { ...row(), companions: { list: [companion] } };
  const local = {
    ...base,
    companions: { list: [{ ...companion, hp_current: 25, details: { conditions: [condition('Drained')] } }] },
  };
  const result = mergeCharacterSave(base, local, { ...base, level: 6 });
  assert.ok(result.conflicts.some((path) => path.startsWith('companions.list[21]') && path.includes('Drained')));
  assert.equal(result.character.level, 5);
  assert.equal(result.character.companions.list[0].hp_current, 25);
});

test('choosing an inherited companion transition keeps competing companion events at the same owner level', () => {
  const companion = { ...row(), id: 21, level: -100 };
  const second = { ...companion, id: 22 };
  const base = { ...row(), companions: { list: [companion, second] } };
  const local = {
    ...base,
    companions: { list: [{ ...companion, hp_current: 25, details: { conditions: [condition('Drained')] } }, second] },
  };
  const remote = {
    ...base,
    hp_current: 24,
    details: { conditions: [condition('Drained')] },
    level: 6,
    companions: {
      list: [
        companion,
        { ...second, hp_current: 24, name: 'Remote companion', details: { conditions: [condition('Drained')] } },
      ],
    },
  };
  const result = mergeCharacterSave(base, local, remote);
  assert.equal(result.character.level, 5);
  assert.equal(result.character.hp_current, 30);
  assert.deepEqual(result.character.details.conditions, []);
  assert.equal(result.character.companions.list[0].hp_current, 25);
  assert.equal(result.character.companions.list[1].hp_current, 30);
  assert.deepEqual(result.character.companions.list[1].details.conditions, []);
  assert.equal(result.character.companions.list[1].name, 'Remote companion');
  assert.ok(result.conflicts.some((path) => path.startsWith('companions.list[22]') && path.includes('Drained')));
});

test('effective Drained rank ignores duplicate lower entries when deciding whether HP loss is new', () => {
  const base = row(20, [condition('Drained', 2)]);
  const local = row(20, [condition('Drained', 1), condition('Drained', 2)]);
  const result = mergeCharacterSave(base, local, row(18, [condition('Drained', 2)]));
  assert.equal(drainedConflict(result), false);
  assert.equal(result.character.hp_current, 18);
});

test('Dying removal and its zero-to-positive HP change cannot split from another HP edit', () => {
  const base = row(0, [condition('Dying')]);
  const recovered = row(1, [condition('Wounded')]);
  const otherHealing = row(1, [condition('Dying')]);
  assert.ok(healthConflict(mergeCharacterSave(base, recovered, otherHealing)));
  assert.ok(healthConflict(mergeCharacterSave(base, otherHealing, recovered)));
  assert.deepEqual(mergeCharacterSave(base, recovered, { ...recovered, updated_at: 'version-2' }).conflicts, []);
});

test('stabilizing at zero keeps Dying and Wounded changes coupled against a concurrent heal', () => {
  const base = row(0, [condition('Dying')]);
  const stabilized = row(0, [condition('Wounded'), condition('Unconscious')]);
  const result = mergeCharacterSave(base, stabilized, row(5, [condition('Dying')]));
  assert.ok(healthConflict(result));
  assert.equal(result.character.hp_current, 0);
  assert.deepEqual(result.character.details.conditions, stabilized.details.conditions);
  assert.deepEqual(mergeCharacterSave(base, stabilized, { ...stabilized, updated_at: 'version-2' }).conflicts, []);
});

test('a local heal does not retain an explicit remote unconscious condition from competing stabilization', () => {
  const base = row(0, [condition('Dying')]);
  const local = row(5, [condition('Wounded')]);
  const remote = { ...row(0, [condition('Wounded'), condition('Unconscious')]), level: 6 };
  const result = mergeCharacterSave(base, local, remote);
  assert.ok(healthConflict(result));
  assert.equal(result.character.hp_current, 5);
  assert.deepEqual(result.character.details.conditions, local.details.conditions);
  assert.equal(result.character.level, 6, 'recovery has no level dependency');
});

test('standalone Wounded edits away from zero HP remain independent of HP changes', () => {
  const base = row(10);
  const local = row(10, [condition('Wounded')]);
  const result = mergeCharacterSave(base, local, row(7));
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.character.hp_current, 7);
  assert.equal(result.character.details.conditions[0].name, 'Wounded');
});
