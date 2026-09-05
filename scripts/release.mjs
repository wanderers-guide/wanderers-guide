#!/usr/bin/env node
/** Read-only release inventory and compatibility checks. This tool never deploys. */
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, readdir, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs, promisify } from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { z } = require('zod');
const ts = require('typescript');
const run = promisify(execFile);
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
// An explicitly named digest separates schema identifiers (including secret-column
// names) from credential assignments. These values are SHA-256 fingerprints only.
const digestSchema = z.object({ sha256: hashSchema }).strict();
const baselineSchema = z.object({
  version: z.literal(2),
  project_ref: z.string(),
  reconciled_at: z.string(),
  ledger: z.literal('absent'),
  description: z.string(),
  migrations: z.record(z.string(), digestSchema),
  schema: z.record(z.string(), digestSchema),
});
const inventorySchema = z.array(
  z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    verify_jwt: z.boolean(),
    status: z.string(),
    version: z.number(),
  })
);
const stateSchema = z.array(z.object({ id: z.string(), definition: z.string() }));
const requirementsSchema = z.record(
  z.string().regex(/^\d{14}_.+\.sql$/),
  z.object({
    check: z.string().regex(/^[a-z0-9-]+\.sql$/),
    order: z.enum(['before-functions', 'after-compatible-functions']),
    function_signature: z
      .string()
      .regex(/^public\.[a-z_]+\([a-z, ]+\)$/)
      .optional(),
  })
);

/** Hash bytes, including original formatting, so every deployed source change counts. */
export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function jsonFile(filename, schema) {
  return schema.parse(JSON.parse(await readFile(filename, 'utf8')));
}

/** Walk only regular source files; following symlinks could include files outside the repo. */
async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(async (entry) => {
        const filename = path.join(directory, entry.name);
        if (entry.isSymbolicLink()) throw new Error(`Release sources cannot be symlinks: ${filename}`);
        if (entry.isDirectory()) return filesIn(filename);
        return entry.isFile() ? [filename] : [];
      })
  );
  return files.flat();
}

/** Parse just the explicit function policy blocks; reject ambiguous or missing policies. */
export function functionPolicies(config) {
  const result = {};
  let current;
  for (const rawLine of config.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (line.startsWith('[')) {
      current = /^\[functions\.([a-z0-9-]+)\]$/.exec(line)?.[1];
      if (current) {
        if (result[current]) throw new Error(`Duplicate function config: ${current}`);
        result[current] = {};
      }
    } else if (current && line) {
      const match = /^(verify_jwt|enabled)\s*=\s*(true|false)$/.exec(line);
      if (match) {
        if (Object.hasOwn(result[current], match[1])) throw new Error(`Duplicate ${match[1]}: ${current}`);
        result[current][match[1]] = match[2] === 'true';
      }
    }
  }
  return result;
}

/** Resolve the runtime graph after TypeScript removes type-only imports. */
async function runtimeFiles(entry, sourceRoot, importMap) {
  const seen = new Set();
  async function visit(filename) {
    if (seen.has(filename)) return;
    if (!filename.startsWith(sourceRoot + path.sep)) throw new Error('Runtime import escapes functions directory');
    seen.add(filename);
    if (filename.endsWith('.json')) return;
    const source = await readFile(filename, 'utf8');
    const javascript = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
      },
      fileName: filename,
    }).outputText;
    const syntax = ts.createSourceFile(filename, javascript, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS);
    function checkImports(node) {
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        (node.arguments.length !== 1 || !ts.isStringLiteral(node.arguments[0]))
      ) {
        throw new Error(`Dynamic runtime imports must use literal paths for release verification: ${filename}`);
      }
      ts.forEachChild(node, checkImports);
    }
    checkImports(syntax);
    const imports = ts.preProcessFile(javascript, true, true).importedFiles;
    for (const dependency of imports) {
      const specifier = importMap[dependency.fileName] ?? dependency.fileName;
      if (!specifier.startsWith('.')) continue;
      const resolved = path.resolve(
        Object.hasOwn(importMap, dependency.fileName) ? sourceRoot : path.dirname(filename),
        specifier
      );
      await visit(resolved);
    }
  }
  await visit(entry);
  return [...seen].sort();
}

/** Build the deployable inventory and pin all source, migration, and configuration bytes. */
export async function createManifest(repository = root) {
  const sourceRoot = path.join(repository, 'supabase/functions');
  const config = await readFile(path.join(repository, 'supabase/config.toml'), 'utf8');
  const policies = functionPolicies(config);
  const baseline = await jsonFile(path.join(repository, 'supabase/release/baseline.json'), baselineSchema);
  const requirements = await jsonFile(path.join(repository, 'supabase/release/requirements.json'), requirementsSchema);
  const imports = await jsonFile(
    path.join(sourceRoot, 'import_map.json'),
    z.object({ imports: z.record(z.string(), z.string()) })
  );
  const sources = (await filesIn(sourceRoot)).filter((file) => {
    const relative = path.relative(sourceRoot, file);
    return !relative.startsWith('_tests/') && !relative.startsWith('main/');
  });
  const sourceHashes = {};
  for (const file of sources) sourceHashes[path.relative(repository, file)] = sha256(await readFile(file));
  const functions = {};
  for (const entry of sources.filter((file) => /^[^_/][^/]*\/index\.ts$/.test(path.relative(sourceRoot, file)))) {
    const name = path.basename(path.dirname(entry));
    if (typeof policies[name]?.verify_jwt !== 'boolean' || policies[name].enabled === false) {
      throw new Error(`Cloud function needs an explicit enabled gateway policy: ${name}`);
    }
    const runtime = await runtimeFiles(entry, sourceRoot, imports.imports);
    functions[name] = {
      verify_jwt: policies[name].verify_jwt,
      files: Object.fromEntries(
        [...runtime, path.join(sourceRoot, 'import_map.json')].map((file) => [
          path.relative(repository, file),
          sourceHashes[path.relative(repository, file)],
        ])
      ),
    };
  }
  if (policies.main?.enabled !== false || typeof policies.main?.verify_jwt !== 'boolean') {
    throw new Error('The self-host main router must explicitly be disabled for cloud deployment');
  }
  for (const name of Object.keys(policies)) {
    if (name !== 'main' && !functions[name]) throw new Error(`Config names an unknown cloud function: ${name}`);
  }
  const migrations = {};
  for (const file of (await filesIn(path.join(repository, 'supabase/migrations'))).filter((file) =>
    file.endsWith('.sql')
  )) {
    const name = path.basename(file);
    migrations[name] = sha256(await readFile(file));
    if (baseline.migrations[name] && baseline.migrations[name].sha256 !== migrations[name]) {
      throw new Error(`Historical migration changed: ${name}; use a new additive migration`);
    }
    if (!baseline.migrations[name] && !requirements[name])
      throw new Error(`Migration has no release compatibility check: ${name}`);
  }
  for (const name of Object.keys(baseline.migrations)) {
    if (!migrations[name]) throw new Error(`Historical migration removed: ${name}`);
  }
  for (const [name, requirement] of Object.entries(requirements)) {
    if (!migrations[name] || baseline.migrations[name])
      throw new Error(`Invalid post-baseline migration requirement: ${name}`);
    await readFile(path.join(repository, 'supabase/release', requirement.check));
    if (requirement.function_signature) {
      const migration = await readFile(path.join(repository, 'supabase/migrations', name), 'utf8');
      const bodies = [...migration.matchAll(/\bAS\s+\$\$([\s\S]*?)\$\$/gi)];
      if (bodies.length !== 1) throw new Error(`Expected one RPC body for release verification: ${name}`);
      requirement.function_body_sha256 = sha256(bodies[0][1]);
    }
  }
  const configHashes = {};
  for (const file of [
    'supabase/config.toml',
    'supabase/deno.lock',
    ...(await filesIn(path.join(repository, 'supabase/release'))).map((file) => path.relative(repository, file)),
  ]) {
    configHashes[file] = sha256(await readFile(path.join(repository, file)));
  }
  const { stdout: commit } = await run('git', ['rev-parse', 'HEAD'], {
    cwd: repository,
  });
  const { stdout: status } = await run('git', ['status', '--porcelain'], {
    cwd: repository,
  });
  return {
    version: 1,
    commit: commit.trim(),
    dirty: Boolean(status.trim()),
    functions,
    sources: sourceHashes,
    config: configHashes,
    migrations,
    requirements,
  };
}

/** Compare all runtime modules per function; a shared change invalidates every dependent. */
export async function compareFunctions(manifest, inventory, downloadedRoot) {
  const issues = [];
  const names = new Set();
  for (const remote of inventorySchema.parse(inventory)) {
    if (names.has(remote.slug)) issues.push(`Duplicate deployed function: ${remote.slug}`);
    names.add(remote.slug);
    const expected = manifest.functions[remote.slug];
    if (!expected) {
      issues.push(`Unexpected deployed endpoint: ${remote.slug}`);
      continue;
    }
    if (remote.status !== 'ACTIVE') issues.push(`Inactive function: ${remote.slug}`);
    if (remote.verify_jwt !== expected.verify_jwt) issues.push(`Gateway policy drift: ${remote.slug}`);
    const directory = path.join(downloadedRoot, remote.slug);
    for (const [file, hash] of Object.entries(expected.files)) {
      try {
        if (sha256(await readFile(path.join(directory, file))) !== hash)
          issues.push(`Source drift: ${remote.slug}/${file}`);
      } catch {
        issues.push(`Missing deployed module: ${remote.slug}/${file}`);
      }
    }
    try {
      for (const file of await filesIn(path.join(directory, 'supabase/functions'))) {
        const relative = path.relative(directory, file);
        if (!Object.hasOwn(expected.files, relative))
          issues.push(`Unexpected deployed module: ${remote.slug}/${relative}`);
      }
    } catch {
      issues.push(`Missing downloaded bundle: ${remote.slug}`);
    }
  }
  for (const name of Object.keys(manifest.functions))
    if (!names.has(name)) issues.push(`Missing deployed endpoint: ${name}`);
  return issues;
}

/** The baseline records effects, not migration history. Missing or changed effects fail closed. */
export function compareSchema(baseline, state) {
  const rows = stateSchema.parse(state);
  const actual = new Map(rows.map((row) => [row.id, sha256(row.definition)]));
  const issues = [];
  if (actual.size !== rows.length) issues.push('Schema inventory contains duplicate object identifiers');
  for (const [id, digest] of Object.entries(baseline.schema)) {
    if (actual.get(id) !== digestSchema.parse(digest).sha256) issues.push(`Schema baseline drift: ${id}`);
  }
  return issues;
}

/** Use the existing Supabase credential only for the official management API. */
async function accessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  if (process.platform === 'darwin') {
    try {
      const { stdout } = await run('security', ['find-generic-password', '-s', 'Supabase CLI', '-a', 'supabase', '-w']);
      const raw = stdout.trim();
      if (raw.startsWith('go-keyring-base64:')) return Buffer.from(raw.split(':')[1], 'base64').toString();
      if (raw.startsWith('go-keyring-encoded:')) return Buffer.from(raw.split(':')[1], 'hex').toString();
      return raw;
    } catch {
      /* A missing native credential is reported without secret-bearing tool output. */
    }
  }
  throw new Error('Set SUPABASE_ACCESS_TOKEN or sign in with Supabase CLI on macOS');
}

/** Permit only inventory GETs and the provider-enforced read-only SQL endpoint. */
async function managementRead(project, endpoint, query) {
  if (!/^[a-z0-9]{20}$/.test(project)) throw new Error('Invalid Supabase project reference');
  if (!['/functions', '/database/query/read-only'].includes(endpoint))
    throw new Error('Unsupported read-only endpoint');
  const token = await accessToken();
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}${endpoint}`, {
    method: query ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(query ? { body: JSON.stringify({ query }) } : {}),
    signal: AbortSignal.timeout(45000),
    redirect: 'error',
  });
  if (!response.ok) throw new Error(`Management read failed (${response.status})`);
  return response.json();
}

/** Capture fresh deployed bytes in isolated directories; never overwrite the checkout. */
async function checkRemote(manifest, project) {
  const baseline = await jsonFile(path.join(root, 'supabase/release/baseline.json'), baselineSchema);
  if (project !== baseline.project_ref) throw new Error('This schema baseline belongs to a different project');
  const inventory = inventorySchema.parse(await managementRead(project, '/functions'));
  const directory = await mkdtemp(path.join(tmpdir(), 'wg-release-'));
  try {
    // Two downloads at a time bounds provider load and keeps the snapshot easy to inspect.
    const queue = inventory.filter((entry) => manifest.functions[entry.slug]);
    const downloads = await Promise.allSettled(
      [0, 1].map(async () => {
        while (queue.length) {
          const entry = queue.shift();
          const workdir = path.join(directory, entry.slug);
          await mkdir(workdir, { recursive: true });
          try {
            await run(
              'supabase',
              ['functions', 'download', entry.slug, '--project-ref', project, '--use-api', '--workdir', workdir],
              { timeout: 120000, maxBuffer: 2 * 1024 * 1024 }
            );
          } catch {
            throw new Error(`Could not download deployed function: ${entry.slug}`);
          }
        }
      })
    );
    const failed = downloads.find((download) => download.status === 'rejected');
    if (failed) throw failed.reason;
    const issues = await compareFunctions(manifest, inventory, directory);
    const state = stateSchema.parse(
      await managementRead(
        project,
        '/database/query/read-only',
        await readFile(path.join(root, 'supabase/release/schema-state.sql'), 'utf8')
      )
    );
    issues.push(...compareSchema(baseline, state));
    const ledgerState = z
      .array(z.object({ present: z.boolean() }))
      .parse(
        await managementRead(
          project,
          '/database/query/read-only',
          "select to_regclass('supabase_migrations.schema_migrations') is not null as present"
        )
      );
    const ledgerPresent = ledgerState[0]?.present;
    let ledger = [];
    if (ledgerPresent) {
      ledger = z
        .array(z.object({ version: z.string() }))
        .parse(
          await managementRead(
            project,
            '/database/query/read-only',
            'select version from supabase_migrations.schema_migrations order by version'
          )
        );
      const known = new Set(Object.keys(manifest.migrations).map((name) => name.split('_')[0]));
      for (const row of ledger) if (!known.has(row.version)) issues.push(`Unknown remote migration: ${row.version}`);
    }
    const migrationChecks = {};
    for (const [name, requirement] of Object.entries(manifest.requirements)) {
      const result = z
        .array(z.object({ id: z.string(), passed: z.boolean() }))
        .parse(
          await managementRead(
            project,
            '/database/query/read-only',
            await readFile(path.join(root, 'supabase/release', requirement.check), 'utf8')
          )
        );
      migrationChecks[name] = result;
      if (requirement.function_signature) {
        const functionState = z
          .array(z.object({ body: z.string() }))
          .parse(
            await managementRead(
              project,
              '/database/query/read-only',
              `select prosrc as body from pg_proc where oid = to_regprocedure('${requirement.function_signature}')`
            )
          );
        if (functionState.length !== 1 || sha256(functionState[0].body) !== requirement.function_body_sha256) {
          issues.push(`Required RPC body differs from reviewed migration: ${name}`);
        }
      }
      if (!result.length || result.some((row) => !row.passed))
        issues.push(`Required migration effects missing: ${name}`);
      if (ledgerPresent && !ledger.some((row) => row.version === name.split('_')[0]))
        issues.push(`Required migration not recorded: ${name}`);
    }
    // A deployment during the download window would otherwise produce a mixed release snapshot.
    const after = inventorySchema.parse(await managementRead(project, '/functions'));
    const fingerprint = (items) => JSON.stringify([...items].sort((a, b) => a.slug.localeCompare(b.slug)));
    if (fingerprint(inventory) !== fingerprint(after))
      issues.push('Deployment changed during audit; retry on a stable release');
    if (manifest.dirty)
      issues.push('Working tree is dirty; a releasable artifact must identify one committed revision');
    return {
      checked_at: new Date().toISOString(),
      project_ref: project,
      commit: manifest.commit,
      manifest_sha256: sha256(JSON.stringify(manifest)),
      passed: issues.length === 0,
      issues,
      functions: inventory,
      schema_objects_checked: state.length,
      migration_ledger: ledgerPresent ? ledger : 'absent; verified effects only',
      migration_checks: migrationChecks,
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      output: { type: 'string' },
      'project-ref': { type: 'string' },
    },
  });
  const command = positionals[0];
  if (!['check-local', 'manifest', 'check-remote', 'function-names'].includes(command)) {
    throw new Error(
      'Usage: release.mjs check-local|manifest|function-names|check-remote [--project-ref REF] [--output FILE]'
    );
  }
  const manifest = await createManifest();
  let result;
  if (command === 'manifest') result = manifest;
  else if (command === 'function-names') {
    process.stdout.write(Object.keys(manifest.functions).sort().join('\n') + '\n');
    return;
  } else if (command === 'check-local')
    result = {
      passed: true,
      cloud_functions: Object.keys(manifest.functions).length,
      runtime_modules: Object.keys(manifest.sources).length,
      migrations: Object.keys(manifest.migrations).length,
    };
  else {
    if (!values['project-ref']) throw new Error('check-remote requires --project-ref');
    result = await checkRemote(manifest, values['project-ref']);
    if (!result.passed) process.exitCode = 1;
  }
  const output = JSON.stringify(result, null, 2) + '\n';
  if (values.output) await writeFile(values.output, output);
  else process.stdout.write(output);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`Release check failed: ${error.message}`);
    process.exitCode = 1;
  });
}
