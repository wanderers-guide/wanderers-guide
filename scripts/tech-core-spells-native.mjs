import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOwnedNativeFixture } from './treasure-vault-native-fixture.mjs';
import { createNativeStopController, finalizeNativeStopReceipt } from './treasure-vault-native-stop.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const outputArgument = process.argv.find((argument) => argument.startsWith('--output='));
assert.ok(outputArgument, 'An explicit private evidence directory is required');
const output = resolve(outputArgument.slice('--output='.length));
assert.notEqual(output, resolve(root));
await mkdir(output, { recursive: true });
const paths = [
  'data/schema.sql',
  'data/data.sql',
  'data/auth-trigger.sql',
  'supabase/seed.sql',
  'docker/db-init/zzz-passwords.sh',
];
const bootstrap = new Map(
  await Promise.all(paths.map(async (path) => [path, await readFile(resolve(root, path), 'utf8')]))
);
const migrationPath = 'supabase/migrations/20261008160000_tech_core_introductory_spells.sql';
const releasePath = 'supabase/release/tech-core-introductory-spells.sql';
const migration = await readFile(resolve(root, migrationPath), 'utf8');
const release = await readFile(resolve(root, releasePath), 'utf8');
const parts = migration.split('$tech_core_spells$');
assert.equal(parts.length, 3);
const spec = JSON.parse(parts[1]);
assert.equal(spec.rows.length, 6);
const hash = (text) => createHash('sha256').update(text).digest('hex');
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const receipt = {
  schema: 'wg-tech-core-spells-native-v1',
  passed: false,
  controls: [],
  inputs: {
    migration: { path: migrationPath, sha256: hash(migration) },
    release: { path: releasePath, sha256: hash(release) },
  },
};
const stop = createNativeStopController({ receipt });
const log = async (value) => {
  if (value.kind === 'owned-container-final-logs') {
    (receipt.owned_container_final_logs ??= []).push(value);
  }
  process.stdout.write(JSON.stringify(value) + '\n');
};
const fixture = createOwnedNativeFixture({
  root,
  receipt,
  log,
  throwIfRequested: stop.throwIfRequested,
  bootstrapRead: (path) => {
    assert.ok(bootstrap.has(path), 'Only captured bootstrap inputs');
    return bootstrap.get(path);
  },
});
const stage = async (name, sql) => {
  await stop.checkpoint(name);
  const result = fixture.sql(sql, true);
  assert.equal(result.error == null, true, name + ': no transport error');
  assert.equal(result.signal, null, name + ': no signal');
  assert.equal(result.status, 0, name + ': ' + fixture.redact(result.stderr));
  process.stdout.write(JSON.stringify({ stage: name, passed: true }) + '\n');
  return result.stdout;
};
const sameExceptSpellSequence = (actual, expected, advances) => {
  const expectedSequence = expected.sequences['public.spell_id_seq'];
  const actualSequence = actual.sequences['public.spell_id_seq'];
  assert.equal(BigInt(actualSequence.last_value), BigInt(expectedSequence.last_value) + BigInt(advances));
  assert.deepEqual({ ...actualSequence, last_value: expectedSequence.last_value }, expectedSequence);
  const normalize = (snapshot) => ({
    ...snapshot,
    sequences: {
      ...snapshot.sequences,
      'public.spell_id_seq': expectedSequence,
    },
    sha256: undefined,
  });
  assert.deepEqual(
    normalize(actual),
    normalize(expected),
    'Every other full tuple, sequence, schema and role stays unchanged'
  );
};

try {
  await fixture.initialize(stage);
  const userId = fixture.signup();
  fixture.savedCopyFixture(userId);
  await fixture.enableEngineTransport();
  const proposalId = fixture.reserveProposalId();
  const ownerUuid = spec.rows[0].uuid;
  const absent = fixture.query(
    `select count(*) from public.spell where uuid in(${spec.rows.map((row) => row.uuid).join(',')});`
  );
  assert.equal(absent, '0', 'The import control starts with genuinely absent final spells');
  const pending = (type, refId, data, source = 900, state = 'PENDING') =>
    `insert into public.content_update(id,user_id,type,ref_id,content_source_id,action,data,upvotes,downvotes,status) values(${proposalId},${quote(userId)}::uuid,${quote(type)},${refId},${source},'CREATE',${quote(JSON.stringify(data))}::jsonb,'{}','{}',${quote(JSON.stringify({ state }))}::jsonb);`;
  async function reject(
    name,
    setup,
    pattern = /Tech Core spell prerequisites differ|Tech Core spells are partially present/
  ) {
    await stop.checkpoint(name);
    fixture.assertOwned();
    const before = fixture.snapshot();
    const result = fixture.sql('BEGIN;\n' + setup + '\n' + migration + '\nROLLBACK;\n', true);
    assert.equal(result.error == null, true, name + ': no transport error');
    assert.equal(result.signal, null, name + ': no signal');
    assert.equal(result.status, 3, name + ': psql stopped on the expected database exception');
    assert.match(result.stderr, pattern);
    assert.deepEqual(fixture.snapshot(), before, name + ': rejected transaction preserves the full fixture');
    receipt.controls.push({
      name,
      passed: true,
      rejected: true,
      status: result.status,
      whole_state_preserved: true,
    });
  }
  const temporaryId = Number(fixture.query('select max(id)+1000000 from public.spell;'));
  assert.ok(Number.isSafeInteger(temporaryId));
  assert.equal(fixture.query(`select exists(select 1 from public.spell where id=${temporaryId});`), 'f');
  const columns = Object.keys(spec.rows[0]);
  const insertProposal = (row) =>
    `insert into public.spell(id,${columns.map((column) => '"' + column + '"').join(',')}) select ${temporaryId},${columns.map((column) => 'r."' + column + '"').join(',')} from jsonb_populate_record(null::public.spell,${quote(JSON.stringify(row))}::jsonb) r;`;
  await reject('partial-insert', insertProposal(spec.rows[0]));
  await reject('same-final-name-conflict', insertProposal({ ...spec.rows[0], uuid: spec.rows[0].uuid + 1 }));
  await reject(
    'same-citation-conflict',
    insertProposal({
      ...spec.rows[0],
      name: 'Conflicting spell',
      uuid: spec.rows[0].uuid + 1,
    })
  );
  await reject('unpublished-source', 'update public.content_source set is_published=false where id=900;');
  await reject('changed-source-identity', "update public.content_source set name='Unexpected book' where id=900;");
  await reject(
    'changed-action-dependency',
    "update public.ability_block set description=description||' changed' where id=19611;"
  );
  await reject(
    'changed-trait-dependency',
    "update public.trait set description=description||' changed' where id=5225;"
  );
  await reject('pending-spell-uuid', pending('spell', 0, { uuid: ownerUuid }));
  await reject('pending-spell-name-top-source', pending('spell', 0, { name: '  bUgFiX  ' }));
  await reject('pending-spell-name-nested-source', pending('spell', 0, { name: 'Bugfix', content_source_id: 900 }, 3));
  await reject(
    'pending-spell-citation',
    pending(
      'spell',
      0,
      {
        meta_data: {
          source: { url: '  HTTPS://2E.AONSRD.COM/SPELLS/507-BUGFIX  ' },
        },
      },
      3
    )
  );
  await reject('unknown-queue-state', pending('spell', 0, { uuid: ownerUuid }, 900, 'UNREVIEWED'));
  await reject('pending-action-subtype', pending('action', 19611, {}, 3));
  await reject(
    'pending-action-generic-type',
    pending('ability-block', 0, { uuid: spec.references.find(({ row }) => row.id === 19611).row.uuid }, 3)
  );
  await reject('pending-junk-trait', pending('trait', 5225, {}));
  await reject('pending-source-header', pending('content-source', 900, {}));
  const beforeRollback = fixture.snapshot();
  const rollback = fixture.sql(
    'BEGIN;\n' + migration + "\ndo $$ begin raise exception 'Tech Core deliberate late failure'; end $$;\nCOMMIT;\n",
    true
  );
  assert.equal(rollback.error == null, true);
  assert.equal(rollback.signal, null);
  assert.equal(rollback.status, 3);
  assert.match(rollback.stderr, /Tech Core deliberate late failure/);
  sameExceptSpellSequence(fixture.snapshot(), beforeRollback, 6);
  receipt.controls.push({
    name: 'late-failure-atomic-rollback',
    passed: true,
    all_tuples_preserved: true,
    expected_spell_sequence_consumption: 6,
  });
  const before = fixture.snapshot();
  const existingSpellsQuery = `select count(*)||':'||md5(coalesce(string_agg(md5(pg_catalog.record_send(r)),'' order by md5(pg_catalog.record_send(r))),'')) from public.spell r where uuid is null or uuid not in(${spec.rows.map((row) => row.uuid).join(',')});`;
  const existingSpellsBefore = fixture.query(existingSpellsQuery);
  assert.equal(
    existingSpellsBefore,
    before.tuples['public.spell'],
    'All six proposed UUIDs are absent before the import'
  );
  await stage('six-spell-import', migration);
  const after = fixture.snapshot();
  assert.equal(
    fixture.query(existingSpellsQuery),
    existingSpellsBefore,
    'Every pre-existing typed spell row is unchanged'
  );
  assert.equal(
    Number(after.tuples['public.spell'].split(':')[0]),
    Number(before.tuples['public.spell'].split(':')[0]) + 6,
    'Exactly six spell rows are added'
  );
  const beforeOther = {
    ...before,
    tuples: { ...before.tuples, 'public.spell': after.tuples['public.spell'] },
    sequences: {
      ...before.sequences,
      'public.spell_id_seq': after.sequences['public.spell_id_seq'],
    },
    sha256: undefined,
  };
  assert.deepEqual(
    { ...after, sha256: undefined },
    beforeOther,
    'Only six new spell tuples and six spell identities change in the trigger-disabled fixture'
  );
  assert.equal(
    BigInt(after.sequences['public.spell_id_seq'].last_value),
    BigInt(before.sequences['public.spell_id_seq'].last_value) + 6n
  );
  receipt.controls.push({
    name: 'actual-six-spell-import-preserves-everything-else',
    passed: true,
    existing_spell_binary_rows_preserved: true,
    exact_spell_row_count_increase: 6,
    saved_auth_queue_schema_roles_preserved: true,
    fixture_triggers:
      'Repository native bootstrap disables content triggers; actual trigger behavior is covered by the ordinary E2E database.',
  });
  const identities = fixture.queryJson(
    `select jsonb_agg(jsonb_build_object('id',id,'uuid',uuid,'name',name,'description',description) order by id) from public.spell where uuid in(${spec.rows.map((row) => row.uuid).join(',')});`
  );
  assert.equal(identities.length, 6);
  assert.equal(new Set(identities.map((row) => row.id)).size, 6);
  const bugfix = identities.find((row) => row.name === 'Bugfix');
  assert.ok(bugfix.id > 0);
  const binding = spec.bindings[0];
  assert.ok(bugfix.description.includes('(' + binding.template.replace('{{allocated_id}}', String(bugfix.id)) + ')'));
  assert.equal(bugfix.description.includes(binding.href), false);
  receipt.controls.push({
    name: 'actual-allocated-self-reference',
    passed: true,
    row_id: bugfix.id,
  });
  assert.equal(
    (await stage('read-only-release-check', 'BEGIN READ ONLY;\n' + release + '\nROLLBACK;')).trim(),
    'tech-core-introductory-spells|t'
  );
  assert.deepEqual(fixture.snapshot(), after);
  await stage('exact-replay', migration);
  assert.deepEqual(fixture.snapshot(), after, 'Exact replay consumes no identities and changes no row');
  receipt.controls.push({
    name: 'read-only-check-and-exact-replay',
    passed: true,
    full_state_preserved: true,
  });
  await reject('pending-existing-ref-id', pending('spell', bugfix.id, {}));
  await reject('pending-existing-data-id', pending('spell', 0, { id: bugfix.id }));
  await reject(
    'changed-imported-prose',
    `update public.spell set description=description||' changed' where id=${bugfix.id};`
  );
  await reject(
    'changed-imported-metadata',
    `update public.spell set meta_data=jsonb_set(meta_data,'{focus}','true',true) where id=${bugfix.id};`
  );
  await reject('missing-imported-row', `delete from public.spell where id=${bugfix.id};`);
  for (const path of paths)
    assert.equal(
      await readFile(resolve(root, path), 'utf8'),
      bootstrap.get(path),
      'Captured bootstrap bytes remain unchanged'
    );
  assert.equal(await readFile(resolve(root, migrationPath), 'utf8'), migration);
  assert.equal(await readFile(resolve(root, releasePath), 'utf8'), release);
  receipt.passed = true;
} catch (error) {
  receipt.failure = {
    name: error.name,
    message: fixture.redact(error.message),
  };
  process.exitCode = error.exitCode ?? 1;
} finally {
  try {
    await fixture.cleanup();
  } catch (error) {
    receipt.cleanup_failure = fixture.redact(error.message);
    receipt.passed = false;
    process.exitCode = 1;
  }
  try {
    const stopExitCode = await finalizeNativeStopReceipt({ receipt, stop });
    if (stopExitCode !== null) process.exitCode = stopExitCode;
    await writeFile(resolve(output, 'receipt.json'), JSON.stringify(receipt, null, 2));
    process.stdout.write(
      JSON.stringify({
        passed: receipt.passed,
        controls: receipt.controls.length,
        evidence: resolve(output, 'receipt.json'),
      }) + '\n'
    );
  } finally {
    stop.close();
  }
}
