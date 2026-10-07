import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createReviewedHistoricalSqlReader, readReviewedHistoricalSql } from './treasure-vault-historical-test-support.mjs';
import { TERMINAL_HELPER, extractReviewedTerminalHelper } from '../../scripts/treasure-vault-native-inputs.mjs';

const repository = new URL('../../', import.meta.url);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const texts = new Map();
const raw = async (path) => {
  if (!texts.has(path)) texts.set(path, await readFile(new URL(path, repository), 'utf8'));
  return texts.get(path);
};
const helper = extractReviewedTerminalHelper({
  migrationSql: await raw(`supabase/migrations/${TERMINAL_HELPER.migration}`),
  releaseSql: await raw(`supabase/release/${TERMINAL_HELPER.release}`),
});
for (const manifest of helper.proof.historical_files) {
  await raw(`supabase/migrations/${manifest.migration}`);
  await raw(`supabase/release/${manifest.release}`);
}
const url = (path) => new URL(path, repository);
const reader = (changes = new Map()) => createReviewedHistoricalSqlReader(async (path) => {
  assert.ok(texts.has(path), `No unknown source fallback: ${path}`);
  return changes.get(path) ?? texts.get(path);
});
const rejection = async (path, transform, pattern) => {
  const changed = transform(texts.get(path));
  assert.notEqual(changed, texts.get(path), `Mutation actually changed ${path}`);
  const read = reader(new Map([[path, changed]]));
  const owner = path.includes('/release/') ? path : `supabase/migrations/${helper.proof.historical_files[1].migration}`;
  await assert.rejects(read(url(owner)), pattern);
};

test('every historical migration and shared release keeps its exact immutable original while validating the complete current wrapper', async () => {
  assert.equal(helper.proof.historical_files.length, 39);
  for (const manifest of helper.proof.historical_files) {
    const migration = await readReviewedHistoricalSql(url(`supabase/migrations/${manifest.migration}`));
    const release = await readReviewedHistoricalSql(url(`supabase/release/${manifest.release}`));
    assert.equal(sha(migration), manifest.migration_sha256);
    assert.equal(sha(release), manifest.release_sha256);
    assert.ok(!migration.startsWith('-- Preserve the original repair;'));
    assert.ok(!release.startsWith('-- Preserve original check IDs'));
  }
});

test('wrapper/source/count-table locks and helper fingerprint cannot change unnoticed', async () => {
  const path = `supabase/migrations/${helper.proof.historical_files[1].migration}`;
  for (const transform of [
    (sql) => sql.replace('lock table public.creature in share row exclusive mode;', ''),
    (sql) => sql.replace('lock table public.content_update in share mode;', 'lock table public.content_update in access share mode;'),
    (sql) => sql.replace('perform s.id from public.content_source s where s.id in(', 'perform s.id from public.content_source s where s.id not in('),
    (sql) => sql.replace(helper.bodySha256, '0'.repeat(64)),
    (sql) => sql.replace('if completion_passed is not true then', 'if completion_passed is false then'),
    (sql) => sql.replace('if completion_recognized is null or completion_passed is null then', 'if false then'),
  ]) await rejection(path, transform, /Exact wrapper body/);
});

test('changing any original repair bytes or dollar-tag multiplicity fails before original assertions can run', async () => {
  const path = `supabase/migrations/${helper.proof.historical_files[1].migration}`;
  await rejection(path, (sql) => sql.replace('execute $historical_original_dual$', 'execute $historical_original_dual$\n'), /Exact original migration body/);
  await rejection(path, (sql) => sql + '\n-- $historical_original_dual$\n', /Exactly one/);
});

test('the full shared helper body, installer ACLs and read-only metadata release remain pinned', async () => {
  const migration = `supabase/migrations/${TERMINAL_HELPER.migration}`;
  await rejection(migration, (sql) => sql.replace('parallel unsafe cost 100 rows 1', 'parallel safe cost 100 rows 1'), /Exact qualified STABLE INVOKER/);
  await rejection(migration, (sql) => sql.replace('from public,anon,authenticated;', 'from public,anon;'), /No installer body, grant or readback mutation/);
  await rejection(migration, (sql) => sql.replace('select phase.recognized,guard.passed', 'select phase.recognized,true'), /Exact root-reviewed native helper body/);
  const release = `supabase/release/${TERMINAL_HELPER.release}`;
  const read = reader(new Map([[release, texts.get(release) + '\n-- extra\n']]));
  await assert.rejects(read(url(`supabase/migrations/${helper.proof.historical_files[1].migration}`)), /Exact SELECT-only helper metadata release/);
});

test('original release queries and the War shared-release single-check boundary cannot be broadened', async () => {
  const dragon = helper.proof.historical_files[0];
  assert.deepEqual(dragon.release_scope, { mode: 'check-id', id: 'treasure-vault-dragonprism-links' });
  const path = `supabase/release/${dragon.release}`;
  await rejection(path, (sql) => sql.replace("original_checks.id='treasure-vault-dragonprism-links' and ", ''), /Strict helper release and original scoped CASE/);
  await rejection(path, (sql) => sql.replace('original_checks.passed end as passed', 'true end as passed'), /Strict helper release/);
  await rejection(path, (sql) => sql.replace('original_checks as(\n', 'original_checks as(\n-- changed original query\n'), /Exact original query/);
  const original = await reader()(url(path));
  const ids = [...original.matchAll(/^select[ \t]+'([^']+)'(?:[ \t]+as[ \t]+id)?[ \t]*,/gim)].map((match) => match[1]);
  assert.equal(ids.length, 35);
  assert.equal(ids.filter((id) => id === dragon.release_scope.id).length, 1);
});

test('unknown files, encodings and path escapes never get an unvalidated original-source fallback', async () => {
  const read = reader();
  await assert.rejects(read(url('supabase/migrations/20260928000000_war_of_immortals_armor_reprints.sql')), /not an explicitly reviewed/);
  await assert.rejects(read(url('supabase/release/requirements.json')), /Only direct repository SQL sources/);
  await assert.rejects(read(url('supabase/../data/data.sql')), /Only direct repository SQL sources/);
  await assert.rejects(read(url('supabase/release/war-of-immortals.sql'), 'ascii'), /complete UTF-8/);
  await assert.rejects(read(new URL('https://example.test/war-of-immortals.sql')), /repository file URL/);
  await assert.rejects(read(new URL('supabase/release/war-of-immortals.sql?ignore=true', repository)), /no query or fragment/);
});
