import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { sha256 } from './release.mjs';
import { HISTORICAL_CONTENT_FIXTURE, TECH_CORE_CONTENT_FIXTURE } from './historical-content-fixture.mjs';
import { createNativeRegisteredCiReplayControls } from './treasure-vault-native-registered-ci-replays.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const literal = (sql, tag) => {
  const parts = sql.split(`$${tag}$`);
  assert.equal(parts.length, 3, `One complete ${tag} literal`);
  return JSON.parse(parts[1]);
};

test('Heal Companion recovery keeps its original native identity and exact repaired row', async () => {
  assert.equal(
    sha256(await read('supabase/release/heal-companion.sql')),
    '16d34462bb0c85a58fd01736a8b9dc540be0fe7d19631b16b518086a38b7b017'
  );
  assert.equal(
    sha256(await read('supabase/migrations/20261001000000_repair_heal_companion.sql')),
    '01895552d73558ec1f0f36158a659de208396390b4b182a1213487c47e08ea12'
  );
  const sql = await read('supabase/migrations/20261011000000_restore_heal_companion.sql');
  const spec = literal(sql, 'heal_recovery_spec');
  assert.equal(spec.row.id, 22108);
  assert.equal(spec.row.uuid, 7476666523704164);
  assert.equal(spec.row.content_source_id, 14);
  assert.equal(spec.row.meta_data.deprecated, true);
  assert.equal(sha256(JSON.stringify(spec.row)), 'b9e67cbf59807c6c82e052af295055d5f2812f4928bf2815b09180b703863d5d');
  assert.deepEqual(literal(await read('supabase/release/heal-companion-recovery.sql'), 'heal_recovery_spec'), spec);
  assert.doesNotMatch(
    sql,
    /\b(nextval|setval|alter\s+sequence|update\s+public\.(?:content_update|character)|delete\s+from)\b/i
  );
  assert.match(sql, /Heal Companion recovery cache token did not refresh/);
  assert.match(sql, /Heal Companion recovery identity is no longer absent/);
  assert.match(sql, /Heal Companion recovery readback differs/);
});

test('Incarnate compatibility retains the complete original and only a source-only successor', async () => {
  assert.equal(
    sha256(await read('supabase/migrations/20261008190000_tech_core_general_spells.sql')),
    '5bd0c1ab04ddef5dff562eb1e9b52be6092b88e8c127cabfa27760908020f485'
  );
  const original = await read('supabase/release/tech-core-general-spells.sql');
  assert.equal(sha256(original), '97c50a7cf4a529219ff96d86c755dc24c7aa9b287b15db8107bce3e681f3102e');
  const wrapper = await read('supabase/release/tech-core-general-spells-incarnate-compatibility.sql');
  assert.ok(wrapper.includes('original_checks as materialized(\n' + original.trimEnd().slice(0, -1) + '\n)'));
  const [before, after] = [...wrapper.matchAll(/\$tech_core_general\$([\s\S]*?)\$tech_core_general\$/g)].map((match) =>
    JSON.parse(match[1])
  );
  const expected = structuredClone(before);
  expected.references.find(({ table, row }) => table === 'trait' && row.id === 2584).row.content_source_id = 3;
  assert.deepEqual(after, expected);
  const literals = [...original.matchAll(/\$tech_core_general\$([\s\S]*?)\$tech_core_general\$/g)];
  assert.equal(literals.length, 1);
  const successor = original.replace(literals[0][1], () => JSON.stringify(expected));
  assert.ok(wrapper.includes('successor_checks as materialized(\n' + successor.trimEnd().slice(0, -1) + '\n)'));
  assert.equal(before.rows.length, 76);
  assert.equal(before.prior_rows.length, 6);
  assert.equal(before.references.length, 92);
  assert.equal(before.sources.length, 7);
  assert.equal(before.bindings.length, 8);
  assert.equal(
    (await read('supabase/migrations/20261011000100_incarnate_release_compatibility.sql')).includes('insert into'),
    false
  );
  for (const path of [
    '{source,content_source_id}',
    '{source,source_id}',
    '{source,id}',
    '{meta_data,source,content_source_id}',
    '{meta_data,source,source_id}',
  ])
    assert.ok(
      wrapper.slice(wrapper.lastIndexOf('\nselect o.id,')).includes(path),
      path + ': outer pending guard covers nested aliases on both branches'
    );
});

test('normal release wiring preserves legacy requirements and uses the complete compatibility check', async () => {
  const requirements = JSON.parse(await read('supabase/release/requirements.json'));
  assert.equal(requirements['20261001000000_repair_heal_companion.sql'].check, 'heal-companion.sql');
  assert.equal(requirements['20261011000000_restore_heal_companion.sql'].check, 'heal-companion-recovery.sql');
  const check = 'tech-core-general-spells-citation-compatibility.sql';
  assert.equal(requirements['20261008190000_tech_core_general_spells.sql'].check, check);
  assert.equal(requirements['20261011000100_incarnate_release_compatibility.sql'].check, check);
  for (const name of [
    '20261011000000_restore_heal_companion.sql',
    '20261011000100_incarnate_release_compatibility.sql',
  ])
    assert.equal(requirements[name].order, 'before-functions');
});

test('Incarnate alias uniqueness gates both complete compatibility branches', async () => {
  const wrapper = await read('supabase/release/tech-core-general-spells-incarnate-compatibility.sql');
  const aliasGuard = "and not exists(select 1 from public.trait t where t.id<>2584 and (t.uuid=3690091311596588 or (t.content_source_id in(3,15) and lower(pg_catalog.regexp_replace(coalesce(t.name,''),'^[[:space:]]+|[[:space:]]+$','','g'))='incarnate')))";
  const footer = wrapper.slice(wrapper.lastIndexOf('\nselect o.id,'));
  assert.ok(footer.includes(aliasGuard), 'The shared outer alias guard must reject duplicates even when original_checks passes');
  assert.ok(footer.indexOf(aliasGuard) < footer.indexOf('and not exists(select 1 from public.content_update'), 'Alias and pending checks both gate the accepted original-or-successor state');
  const migration = await read('supabase/migrations/20261011000100_incarnate_release_compatibility.sql');
  assert.equal(sha256(migration), 'f4c2eeb9a230f14f96bef05f2278bf2bfa8cb3a4856147f1893e3a25481bd2a7');
  assert.equal(migration.split(aliasGuard).length - 1, 2, 'The guard-only migration already rejects aliases in each exact state');
});

test('bounded construction model retains all original replay groups and adds exactly the recovery pair', async () => {
  // This finite registry model never reads the catalog/bootstrap dump or executes
  // SQL. It does not substitute for the complete native input-manifest gate.
  const files = new Map();
  const capture = async (path) => {
    if (!files.has(path)) files.set(path, await read(path));
    return files.get(path);
  };
  const requirements = JSON.parse(await capture('supabase/release/requirements.json'));
  for (const path of [
    '.github/workflows/e2e.yml',
    'supabase/release/war-of-immortals-index.sql',
    'supabase/release/war-of-immortals-index-regression.sql',
    'supabase/release/tech-core-introductory-spells.sql',
    'supabase/release/tech-core-general-spells.sql',
    'supabase/release/tech-core-general-spells-incarnate-compatibility.sql',
    ...new Set(Object.values(requirements).map(({ check }) => 'supabase/release/' + check)),
  ])
    await capture(path);
  const migrations = [];
  for (const path of (await readdir(new URL('supabase/migrations/', root)))
    .filter((path) => /^\d{14}_[a-z0-9_]+\.sql$/.test(path))
    .sort()) {
    const sql = await capture('supabase/migrations/' + path);
    migrations.push({ path, sql, sha256: sha256(sql) });
  }
  const forbidden = () => {
    throw new Error('Construction model cannot execute SQL or create resources');
  };
  const inputManifest = {
    migrations,
    readRelative: (path) => {
      assert.ok(files.has(path));
      return files.get(path);
    },
    verify: forbidden,
    manifest: {
      schema: 'wg-tv-native-checked-in-input-manifest-v2',
      entries: [...files].map(([path, sql]) => ({ path, bytes: Buffer.byteLength(sql), sha256: sha256(sql) })),
      historical_git_inputs: [HISTORICAL_CONTENT_FIXTURE, TECH_CORE_CONTENT_FIXTURE],
      current_catalog_path: 'data/data.sql',
      historical_bootstrap_mode: 'pinned-git-predecessor',
      external_private_inputs: [],
    },
  };
  const context = {
    inputManifest,
    fixture: { assertOwned: forbidden, snapshot: forbidden },
    stage: forbidden,
    checkpoint: forbidden,
    receipt: {},
  };
  const { plan } = createNativeRegisteredCiReplayControls(context);
  assert.equal(migrations.length, 118);
  assert.equal(plan.schema, 'wg-tv-native-registered-ci-replays-v4');
  assert.equal(plan.registered_requirements, 111);
  assert.equal(plan.checks.length, 71);
  assert.equal(plan.replays.length, 91);
  assert.equal(plan.expected_native_statements, 396);
  assert.equal(plan.passed, false);
  assert.deepEqual(
    ['20260927', '20260928', '20260929', '20260930', '20261001', '20261002'].map(
      (prefix) => plan.replays.filter(({ path }) => path.startsWith(prefix)).length
    ),
    [25, 3, 15, 3, 27, 16]
  );
  assert.deepEqual(
    plan.replays.slice(-2).map(({ path }) => path),
    ['20261011000000_restore_heal_companion.sql', '20261011000100_incarnate_release_compatibility.sql']
  );
  for (const path of [
    'supabase/release/heal-companion.sql',
    'supabase/release/heal-companion-recovery.sql',
    'supabase/release/tech-core-general-spells-citation-compatibility.sql',
  ])
    assert.equal(plan.checks.filter((check) => check.path === path).length, 1);
  for (const path of ['supabase/release/heal-companion.sql', 'supabase/release/heal-companion-recovery.sql']) {
    assert.throws(
      () =>
        createNativeRegisteredCiReplayControls({
          ...context,
          inputManifest: {
            ...inputManifest,
            manifest: {
              ...inputManifest.manifest,
              entries: inputManifest.manifest.entries.filter((entry) => entry.path !== path),
            },
          },
        }),
      /must be captured/
    );
    assert.throws(() =>
      createNativeRegisteredCiReplayControls({
        ...context,
        inputManifest: {
          ...inputManifest,
          readRelative: (requested) =>
            inputManifest.readRelative(requested) + (requested === path ? '\n-- drift\n' : ''),
        },
      })
    );
  }
});
