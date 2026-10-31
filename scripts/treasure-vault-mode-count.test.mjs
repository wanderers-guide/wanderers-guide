/** Integrity checks supplement the real PostgreSQL mode compatibility controls. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  modeCountSpec,
  MODE_COUNT_TERMINAL_SHA256,
  PREVIOUS_MODE_TERMINAL_SHA256,
  MODE_COUNT_NATIVE_CONTROLS,
  originalModeCountBody,
  upgradeModeCountBody,
  modeCountReplacement,
} from './treasure-vault-native-book-count.mjs';

const migration = readFileSync(new URL('../supabase/migrations/20260927245900_treasure_vault_terminal_status.sql', import.meta.url), 'utf8');
const definition = migration.split('$terminal_definition$')[1];
const body = definition.split('$$')[1];
const sha = value => createHash('sha256').update(value).digest('hex');

test('the complete prior helper is recovered byte for byte', () => {
  assert.equal(sha(body), MODE_COUNT_TERMINAL_SHA256);
  const before = originalModeCountBody(body);
  assert.equal(sha(before), PREVIOUS_MODE_TERMINAL_SHA256);
  assert.equal(upgradeModeCountBody(before), body);
  const [oldProjection, newProjection] = modeCountReplacement(before);
  assert.equal(before.replace(oldProjection, () => newProjection), body);
  assert.equal(body.replace(newProjection, () => oldProjection), before);
});

test('source normalization changes only the reviewed mode counter', () => {
  const before = structuredClone(modeCountSpec.before);
  before.meta_data.counts.mode = 2;
  assert.deepEqual(before, modeCountSpec.after);
  assert.equal(modeCountSpec.mode.id, 60082);
  assert.equal(modeCountSpec.mode.type, 'mode');
  assert.equal(modeCountSpec.mode.content_source_id, 842);
  assert.ok(modeCountSpec.mode.description.includes('15th level'));
});

test('a changed predecessor or successor cannot be reconstructed as reviewed', () => {
  assert.throws(() => upgradeModeCountBody(originalModeCountBody(body) + '\n'));
  assert.throws(() => originalModeCountBody(body.replace("and exists(select 1 from public.ability_block a where a.id=60082", "and exists(select 1 from public.ability_block a where a.id=60083")));
});

test('native mode cases retain each separate drift and replay obligation', () => {
  assert.equal(MODE_COUNT_NATIVE_CONTROLS.length, 22);
  assert.equal(new Set(MODE_COUNT_NATIVE_CONTROLS).size, 22);
  for (const suffix of ['operation-drift', 'description-drift', 'uuid-alias', 'name-alias', 'pending-ref', 'pending-id', 'pending-name', 'pending-uuid', 'historical-replays']) {
    assert.ok(MODE_COUNT_NATIVE_CONTROLS.includes('mode-count-' + suffix));
  }
});
