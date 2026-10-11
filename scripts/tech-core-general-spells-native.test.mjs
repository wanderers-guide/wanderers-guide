import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const runner = resolve(root, 'scripts/tech-core-general-spells-native.mjs');
const output = await mkdtemp(resolve(tmpdir(), 'wg-tech-core-general-plan-contract-'));
after(async () => {
  await rm(output, { recursive: true, force: true });
});
const plans = new Map();
for (const matrix of ['focused', 'exhaustive']) {
  const result = spawnSync(process.execPath, [runner, '--output=' + resolve(output, matrix), '--matrix=' + matrix], {
    encoding: 'utf8',
    timeout: 30000,
  });
  assert.equal(result.error == null, true);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.plan_only, true);
  assert.equal(summary.native_started, false);
  plans.set(matrix, JSON.parse(await readFile(resolve(output, matrix, 'plan.json'), 'utf8')));
}

test('focused native plan is inert and retains the exact representative failure families', () => {
  const plan = plans.get('focused');
  assert.equal(plan.native_execution_requested, false);
  assert.equal(plan.executed_native, false);
  assert.deepEqual(plan.counts, {
    new_spells: 76,
    prior_spells: 6,
    references: 92,
    sources: 7,
    reviewed_bindings: 8,
    binding_occurrences: 9,
    rejection_controls: 86,
    accepted_queue_controls: 2,
    before_prerequisite: 1,
    before_import: 72,
    after_import: 15,
  });
  const names = plan.controls.map((control) => control.name);
  assert.equal(names.length, 88);
  assert.equal(new Set(names).size, 88);
  for (const name of [
    'requires-six-introductory-spells',
    'partial-exact-row',
    'partial-edited-row',
    'uuid-alias-other-source',
    'normalized-name-alias',
    'global-normalized-citation-alias',
    'duplicate-identity-aliases',
    'source-900-null-dependency-not-relaxed',
    'tech-4506-creature-flag-not-relaxed',
    'allocation-nonpositive',
    'allocation-occupied',
    'allocation-duplicate',
    'binding-missing-path',
    'binding-zero-occurrence',
    'binding-too-many-occurrences',
    'binding-duplicate-binding',
    'binding-target-outside-allocation-map',
    'binding-unresolved-token',
    'closed-curator-approved-does-not-block',
    'closed-curator-rejected-does-not-block',
  ])
    assert.ok(names.includes(name), name);
  for (const control of plan.controls.filter((control) => control.expected_sequence_advances))
    assert.equal(control.expected_sequence_advances, 76);
});

test('exhaustive native matrix is explicit, finite, and includes every reviewed dependency and spell identity', async () => {
  const plan = plans.get('exhaustive');
  assert.equal(plan.native_execution_requested, false);
  assert.equal(plan.executed_native, false);
  assert.equal(plan.counts.rejection_controls, 1555);
  assert.equal(plan.counts.accepted_queue_controls, 2);
  assert.equal(plan.controls.length, 1557);
  assert.equal(new Set(plan.controls.map((control) => control.name)).size, 1557);
  const migration = await readFile(
    resolve(root, 'supabase/migrations/20261008190000_tech_core_general_spells.sql'),
    'utf8'
  );
  const spec = JSON.parse(migration.split('$tech_core_general$')[1]);
  const names = new Set(plan.controls.map((control) => control.name));
  for (const { table, row } of spec.references) {
    assert.ok(names.has('changed-reference-' + table + '-' + row.id));
    assert.ok(names.has('missing-reference-' + table + '-' + row.id));
    assert.ok(names.has('pending-reference-refid-' + table + '-' + row.id));
  }
  for (const [label, rows] of [
    ['new', spec.rows],
    ['prior', spec.prior_rows],
  ]) {
    for (const row of rows) {
      assert.ok(names.has('pending-uuid-' + label + '-' + row.name));
      assert.ok(names.has('pending-actual-refid-' + row.name));
      assert.ok(names.has('pending-actual-dataid-' + row.name));
    }
  }
});

test('native inputs pin canonical JSON separately from physical SQL and retain access boundaries', async () => {
  const plan = plans.get('focused');
  assert.deepEqual(plan.guards, { source900_required_content_sources: null, tech4506_creature_trait: false });
  assert.equal(
    plan.spec_hashes.canonical_compact_json_sha256,
    '625934ee9794b965d104ce5bfd740ee65167cb462638ef60c75b02808981b6e1'
  );
  assert.equal(plan.spec_hashes.embedded_literal_sha256, plan.spec_hashes.canonical_compact_json_sha256);
  assert.equal(plan.shared_validator_sha256, '012b3cf842038fed5366ad475de75e72444f743f997cdd1e1c1343bedd67aa95');
  assert.equal(plan.inputs.length, 11);
  for (const input of plan.inputs) {
    const bytes = await readFile(input.path);
    assert.equal(bytes.length, input.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), input.sha256);
  }
  assert.equal(plan.access_review.shared_persisted_database_function, false);
  assert.equal(plan.access_review.security_definer, false);
  assert.equal(plan.access_review.roles_grants_policies_or_rls_changes, false);
  assert.equal(plan.access_review.write_target, 'public.spell INSERT only');
  assert.doesNotMatch(
    await readFile(runner, 'utf8'),
    /\/private\/tmp|\/Users\/|PREPARATION-REPORT|general-spells\.spec\.json/
  );
});

test('CI retains six-spell checks and runs focused general safety sequentially without broad timeout changes', async () => {
  const workflow = await readFile(resolve(root, '.github/workflows/e2e.yml'), 'utf8');
  const job = workflow.slice(workflow.indexOf('  tech-core-content:'));
  assert.ok(job.includes('timeout-minutes: 20'));
  const first = job.indexOf('node scripts/tech-core-spells-native.mjs');
  const second = job.indexOf('node scripts/tech-core-general-spells-native.mjs');
  assert.ok(first >= 0 && second > first);
  assert.ok(job.includes('--matrix=focused --execute-owned-native'));
  assert.equal(job.includes('--matrix=exhaustive'), false);
  assert.ok(job.includes('path: ${{ runner.temp }}/tech-core-spells/receipt.json'));
  assert.ok(job.includes('path: ${{ runner.temp }}/tech-core-general-spells/receipt.json'));
  const frontend = await readFile(resolve(root, '.github/workflows/ci.yml'), 'utf8');
  assert.ok(
    frontend.includes('scripts/tech-core-introductory-spells.test.mjs scripts/tech-core-general-spells.test.mjs')
  );
});

test("additional Incarnate matrix checks both complete catalog states without replacing original coverage", () => {
  const focused = plans.get("focused").incarnate_compatibility;
  assert.deepEqual(plans.get("exhaustive").incarnate_compatibility, focused);
  assert.deepEqual(focused.states, [15, 3]);
  assert.deepEqual(focused.source_only_successor, {
    id: 2584,
    uuid: 3690091311596588,
    from: 15,
    to: 3,
  });
  assert.equal(
    focused.guard_only_migration_sha256,
    "f4c2eeb9a230f14f96bef05f2278bf2bfa8cb3a4856147f1893e3a25481bd2a7",
  );
  const names = focused.per_state_controls.map(({ name }) => name);
  assert.equal(names.length, 40);
  assert.equal(new Set(names).size, names.length);
  for (const source of [15, 3]) {
    assert.ok(names.includes("normalized-name-alias-source-" + source));
    assert.ok(names.includes("pending-name-source-" + source));
    for (const route of [
      "content_source_id",
      "source_id",
      "source-content_source_id",
      "source-source_id",
      "source-id",
      "meta_data-content_source_id",
      "meta_data-source-content_source_id",
      "meta_data-source-source_id",
    ])
      assert.ok(names.includes("pending-name-" + route + "-" + source));
  }
  for (const name of [
    "missing-incarnate",
    "global-uuid-alias",
    "pending-incarnate-refid",
    "pending-incarnate-dataid",
    "pending-incarnate-uuid",
    "changed-incarnate-created_at",
    "unpublished-common-core",
  ]) {
    assert.equal(
      focused.per_state_controls.find((control) => control.name === name)
        .guardRejects,
      true,
    );
  }
  assert.equal(
    focused.per_state_controls.filter(({ accepted }) => accepted).length,
    3,
  );
  for (const name of [
    "changed-unrelated-reference",
    "changed-unrelated-source",
    "changed-general-spell",
    "changed-bound-link",
    "pending-general-spell",
  ]) {
    assert.deepEqual(
      focused.per_state_controls.find((control) => control.name === name),
      { name, accepted: false, guardRejects: false },
    );
  }
});
