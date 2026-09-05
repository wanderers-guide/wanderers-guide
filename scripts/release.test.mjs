import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { compareFunctions, compareSchema, createManifest, functionPolicies, sha256 } from './release.mjs';

async function write(root, name, content) {
  await mkdir(path.dirname(path.join(root, name)), { recursive: true });
  await writeFile(path.join(root, name), content);
}

/** Two endpoints share runtime code; declaration-only imports must not become bundle requirements. */
async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'wg-release-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', root]);
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '--allow-empty',
      '-qm',
      'fixture',
    ],
    { cwd: root }
  );
  await write(
    root,
    'supabase/config.toml',
    '[functions.one]\nverify_jwt = false\n[functions.two]\nverify_jwt = true\n[functions.main]\nenabled = false\nverify_jwt = true\n'
  );
  await write(root, 'supabase/functions/import_map.json', '{"imports":{}}');
  await write(root, 'supabase/functions/_shared/helpers.ts', 'export const value = 1;');
  await write(root, 'supabase/functions/_shared/content.d.ts', 'export type Content = string;');
  for (const name of ['one', 'two'])
    await write(
      root,
      `supabase/functions/${name}/index.ts`,
      "import { value } from '../_shared/helpers.ts';\nimport type { Content } from '../_shared/content';\nconsole.log(value);\n"
    );
  await write(root, 'supabase/functions/main/index.ts', 'throw new Error("self-host only");');
  await write(root, 'supabase/deno.lock', '{}');
  await write(
    root,
    'supabase/release/baseline.json',
    JSON.stringify({
      version: 2,
      project_ref: 'fdrjqcyjklatdrmjdnys',
      reconciled_at: '2026-09-05T00:00:00Z',
      ledger: 'absent',
      description: 'Synthetic test fixture',
      migrations: {},
      schema: {},
    })
  );
  await write(root, 'supabase/release/requirements.json', '{}');
  await mkdir(path.join(root, 'supabase/migrations'));
  return root;
}

async function downloaded(t, repository, manifest) {
  const root = await mkdtemp(path.join(tmpdir(), 'wg-deployed-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [name, fn] of Object.entries(manifest.functions)) {
    for (const file of Object.keys(fn.files))
      await write(root, `${name}/${file}`, await readFile(path.join(repository, file)));
  }
  return root;
}

const inventory = [
  { slug: 'one', verify_jwt: false, status: 'ACTIVE', version: 1 },
  { slug: 'two', verify_jwt: true, status: 'ACTIVE', version: 1 },
];

test('cloud inventory excludes main and records every shared runtime dependent', async (t) => {
  const repo = await fixture(t);
  const first = await createManifest(repo);
  assert.deepEqual(Object.keys(first.functions).sort(), ['one', 'two']);
  assert.ok(first.sources['supabase/functions/_shared/content.d.ts']);
  assert.equal(first.functions.one.files['supabase/functions/_shared/content.d.ts'], undefined);
  assert.equal(first.functions.one.files['supabase/functions/_shared/helpers.ts'], sha256('export const value = 1;'));
  await write(repo, 'supabase/functions/_shared/helpers.ts', 'export const value = 2;');
  const next = await createManifest(repo);
  for (const name of ['one', 'two'])
    assert.notEqual(
      first.functions[name].files['supabase/functions/_shared/helpers.ts'],
      next.functions[name].files['supabase/functions/_shared/helpers.ts']
    );
});

test('matching release passes; shared drift, missing modules, legacy routes and gateway changes fail', async (t) => {
  const repo = await fixture(t);
  const manifest = await createManifest(repo);
  const remote = await downloaded(t, repo, manifest);
  assert.deepEqual(await compareFunctions(manifest, inventory, remote), []);
  await write(remote, 'one/supabase/functions/_shared/helpers.ts', 'export const value = 0;');
  await rm(path.join(remote, 'two/supabase/functions/two/index.ts'));
  const issues = await compareFunctions(
    manifest,
    [
      { ...inventory[0], verify_jwt: true },
      inventory[1],
      { slug: 'main', verify_jwt: true, status: 'ACTIVE', version: 1 },
      {
        slug: 'find-characters',
        verify_jwt: true,
        status: 'ACTIVE',
        version: 1,
      },
    ],
    remote
  );
  assert.ok(issues.some((issue) => issue.startsWith('Source drift: one/')));
  assert.ok(issues.some((issue) => issue.startsWith('Missing deployed module: two/')));
  assert.ok(issues.includes('Gateway policy drift: one'));
  assert.ok(issues.includes('Unexpected deployed endpoint: main'));
  assert.ok(issues.includes('Unexpected deployed endpoint: find-characters'));
});

test('missing and duplicate gateway declarations cannot silently default on next deploy', async (t) => {
  const repo = await fixture(t);
  await write(repo, 'supabase/config.toml', '[functions.one]\nenabled = true\n[functions.main]\nenabled = false\n');
  await assert.rejects(createManifest(repo), /explicit enabled gateway policy/);
  assert.throws(() => functionPolicies('[functions.one]\nverify_jwt = true\nverify_jwt = false'), /Duplicate/);
});

test('runtime import maps resolve from their own directory and computed imports fail closed', async (t) => {
  const repo = await fixture(t);
  await write(repo, 'supabase/functions/import_map.json', '{"imports":{"shared":"./_shared/helpers.ts"}}');
  await write(repo, 'supabase/functions/one/index.ts', "import { value } from 'shared'; console.log(value);");
  const manifest = await createManifest(repo);
  assert.ok(manifest.functions.one.files['supabase/functions/_shared/helpers.ts']);
  await write(repo, 'supabase/functions/one/index.ts', "const name = 'helpers.ts'; import('../_shared/' + name);");
  await assert.rejects(createManifest(repo), /literal paths/);
});

test('new migrations need compatibility checks; historical migrations cannot be silently replayed or edited', async (t) => {
  const repo = await fixture(t);
  const name = '20260905000000_example.sql';
  await write(repo, `supabase/migrations/${name}`, 'select 1;');
  await assert.rejects(createManifest(repo), /no release compatibility check/);
  const baselinePath = path.join(repo, 'supabase/release/baseline.json');
  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  baseline.migrations[name] = { sha256: sha256('select 1;') };
  await writeFile(baselinePath, JSON.stringify(baseline));
  await createManifest(repo);
  await write(repo, `supabase/migrations/${name}`, 'select 2;');
  await assert.rejects(createManifest(repo), /Historical migration changed/);
});

test('schema effects are required without a migration ledger, including secret-column grants and trigger definitions', () => {
  const state = [
    { id: 'grant:anon.public_user.api', definition: 'false' },
    {
      id: 'trigger:character.character_set_updated_at',
      definition: 'enabled trigger definition',
    },
  ];
  const baseline = {
    schema: Object.fromEntries(state.map((row) => [row.id, { sha256: sha256(row.definition) }])),
  };
  assert.deepEqual(compareSchema(baseline, state), []);
  const issues = compareSchema(baseline, [{ ...state[0], definition: 'true' }]);
  assert.equal(issues.length, 2);
  assert.ok(issues.some((issue) => issue.includes('public_user.api')));
  assert.ok(issues.some((issue) => issue.includes('character_set_updated_at')));
});

test('baseline digest records require an explicit supported algorithm and preserve grant drift detection', async (t) => {
  const repo = await fixture(t);
  const baselinePath = path.join(repo, 'supabase/release/baseline.json');
  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  const id = 'grant:authenticated.campaign.join_key';
  baseline.schema[id] = { sha256: sha256('false') };
  await writeFile(baselinePath, JSON.stringify(baseline));
  await createManifest(repo);
  assert.deepEqual(compareSchema(baseline, [{ id, definition: 'false' }]), []);
  assert.deepEqual(compareSchema(baseline, [{ id, definition: 'true' }]), [`Schema baseline drift: ${id}`]);
  for (const invalid of [sha256('false'), { md5: sha256('false') }, { sha256: 'not a digest' }]) {
    baseline.schema[id] = invalid;
    await writeFile(baselinePath, JSON.stringify(baseline));
    await assert.rejects(createManifest(repo));
    assert.throws(() => compareSchema(baseline, [{ id, definition: 'false' }]));
  }
});
