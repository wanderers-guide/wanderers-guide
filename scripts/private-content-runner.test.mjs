import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { encryptPacket, decryptPacket, privatePath, privateChildEnvironment, validatePacket } from './private-content-runner.mjs';

test('private child environment removes application and transport credentials without mutating runner inputs', () => {
  const environment = { PATH: '/runner/bin', RUNNER_TEMP: '/runner/temp', GITHUB_WORKSPACE: '/runner/checkout',
    GITHUB_ACTIONS: 'true', GITHUB_SHA: 'a'.repeat(40), WG_PRIVATE_CONTENT_KEY: 'synthetic-key',
    WG_PRIVATE_CONTENT_SHA256: 'synthetic-sha', WG_PRIVATE_CONTENT_00: 'synthetic-packet',
    SUPABASE_URL: 'synthetic-url', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-role',
    DB_URI: 'synthetic-database', WG_RELEASE_DATABASE_URL: 'synthetic-release' };
  const original = { ...environment };
  const child = privateChildEnvironment(environment);
  assert.deepEqual(child, { PATH: '/runner/bin', RUNNER_TEMP: '/runner/temp', GITHUB_WORKSPACE: '/runner/checkout',
    GITHUB_ACTIONS: 'true', GITHUB_SHA: 'a'.repeat(40) });
  assert.notEqual(child, environment); assert.deepEqual(environment, original);
});

test('non-hosted entry refuses generically before private staging or Docker dispatch', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'wg-private-refusal-'));
  const marker = resolve(directory, 'unexpected-side-effect');
  // Child-only barriers observe current staging/dispatch seams without starting services.
  const barrier = `import fs from 'node:fs'; import promises from 'node:fs/promises';
    import child from 'node:child_process'; import { syncBuiltinESMExports } from 'node:module';
    const write = fs.writeFileSync;
    const blocked = kind => { write(${JSON.stringify(marker)}, kind); throw new Error('synthetic-private-detail'); };
    promises.mkdir = () => blocked('mkdir'); promises.writeFile = () => blocked('writeFile');
    child.spawnSync = () => blocked('spawnSync'); syncBuiltinESMExports();`;
  try {
    const result = spawnSync(process.execPath, ['--import', 'data:text/javascript,' + encodeURIComponent(barrier),
      fileURLToPath(new URL('./private-content-runner.mjs', import.meta.url))], {
      env: { PATH: '', GITHUB_ACTIONS: 'false', RUNNER_TEMP: resolve(directory, 'output') },
      encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024,
    });
    assert.equal(result.error == null, true); assert.equal(result.signal, null); assert.equal(result.status, 1);
    assert.equal(result.stdout, ''); assert.equal(result.stderr, 'Private content runner refused before execution.\n');
    assert.equal(existsSync(marker), false); assert.deepEqual(readdirSync(directory), []);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('private packets authenticate both purpose and ciphertext', () => {
  const key = randomBytes(32), bytes = Buffer.from('synthetic transport fixture');
  const wire = encryptPacket(bytes, key, 'input');
  assert.deepEqual(decryptPacket(wire, key, 'input'), bytes);
  assert.throws(() => decryptPacket(wire, key, 'evidence'));
  assert.throws(() => decryptPacket(wire, randomBytes(32), 'input'));
  wire[wire.length - 1] ^= 1; assert.throws(() => decryptPacket(wire, key, 'input'));
});

test('private transport rejects application paths and directory traversal', () => {
  assert.equal(privatePath('/checkout', '.agents/legacy/batch/fixture.json'), '/checkout/.agents/legacy/batch/fixture.json');
  for (const path of ['/tmp/input', 'scripts/test.mjs', '.agents/legacy/../secret', '.agents/legacy/./batch', '.agents/legacy//batch']) assert.throws(() => privatePath('/checkout', path));
});

test('private packet pins exact bytes, entry, unique paths and checkout head', () => {
  const bytes = Buffer.from('synthetic fixture only'), head = 'a'.repeat(40);
  const file = { path: '.agents/legacy/batch/run.mjs', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), data: bytes.toString('base64') };
  const value = { schema: 'wg-private-content-run-v1', head, entry: file.path, files: [file] };
  assert.deepEqual(validatePacket(value, head), value);
  assert.throws(() => validatePacket(value, 'b'.repeat(40)));
  assert.throws(() => validatePacket({ ...value, entry: '.agents/legacy/missing.mjs' }, head));
  assert.throws(() => validatePacket({ ...value, files: [file, file] }, head));
  assert.throws(() => validatePacket({ ...value, files: [{ ...file, bytes: 0 }] }, head));
  assert.throws(() => validatePacket({ ...value, files: [{ ...file, sha256: 'c'.repeat(64) }] }, head));
  assert.throws(() => validatePacket({ ...value, files: [{ ...file, path: 'frontend/package.json' }] }, head));
});
