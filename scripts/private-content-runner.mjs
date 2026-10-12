/** Hosted-only transport for an encrypted, unpublished content test packet. */
import assert from 'node:assert/strict';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { z } = createRequire(resolve(root, 'frontend/package.json'))('zod');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const packetSchema = z.object({ schema: z.literal('wg-private-content-run-v1'), head: z.string().regex(/^[a-f0-9]{40}$/),
  entry: z.string(), files: z.array(z.object({ path: z.string(), bytes: z.number().int().nonnegative().max(16 * 1024 ** 2),
    sha256: z.string().regex(/^[a-f0-9]{64}$/), data: z.string() }).strict()).min(1).max(100) }).strict();

/** Authenticate input and evidence with distinct purpose strings and fresh nonces. */
export function encryptPacket(bytes, key, purpose) {
  assert.equal(key.length, 32);
  const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(Buffer.from(purpose));
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]);
}

export function decryptPacket(bytes, key, purpose) {
  assert.equal(key.length, 32); assert(bytes.length >= 28);
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(purpose)); decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]);
}

/** Unpublished files may be staged only in this checkout's ignored private directory. */
export function privatePath(checkout, path) {
  assert.match(path, /^\.agents\/legacy\/[A-Za-z0-9_./-]+$/);
  assert(!path.split('/').some(part => part === '..' || part === '.' || part === ''));
  const absolute = resolve(checkout, path);
  assert(absolute.startsWith(resolve(checkout, '.agents/legacy') + sep));
  return absolute;
}

export function validatePacket(value, head) {
  const packet = packetSchema.parse(value);
  assert.equal(packet.head, head);
  assert.equal(new Set(packet.files.map(file => file.path)).size, packet.files.length);
  assert(packet.files.some(file => file.path === packet.entry));
  for (const file of packet.files) {
    privatePath(root, file.path);
    const bytes = Buffer.from(file.data, 'base64');
    assert.equal(bytes.toString('base64'), file.data);
    assert.equal(bytes.length, file.bytes); assert.equal(sha(bytes), file.sha256);
  }
  return packet;
}

/** Copy runner configuration without application or private transport credentials. */
export function privateChildEnvironment(environment) {
  const child = { ...environment };
  for (const name of Object.keys(child)) if (/^(WG_PRIVATE_CONTENT_|SUPABASE_|DB_URI$|WG_RELEASE_DATABASE_URL$)/.test(name)) delete child[name];
  return child;
}

/** This entry cannot start a local fixture or inherit application credentials. */
async function runHosted() {
  assert.equal(process.env.GITHUB_ACTIONS, 'true');
  assert.equal(process.env.GITHUB_EVENT_NAME, 'workflow_dispatch');
  assert.equal(process.env.RUNNER_OS, 'Linux');
  assert.equal(await realpath(process.env.GITHUB_WORKSPACE), await realpath(root));
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  assert.equal(head.status, 0); assert.equal(head.stdout.trim(), process.env.GITHUB_SHA);
  const key = Buffer.from(process.env.WG_PRIVATE_CONTENT_KEY ?? '', 'hex'); assert.equal(key.length, 32);
  const output = resolve(process.env.RUNNER_TEMP, 'wg-private-content-evidence');
  await mkdir(output, { recursive: true, mode: 0o700 });
  let passed = false, failure;
  try {
    const chunks = Array.from({ length: 32 }, (_, index) => process.env[`WG_PRIVATE_CONTENT_${String(index).padStart(2, '0')}`] ?? '');
    const wire = Buffer.from(chunks.join(''), 'base64'); assert(wire.length <= 1024 ** 2);
    assert.equal(sha(wire), process.env.WG_PRIVATE_CONTENT_SHA256);
    const bytes = gunzipSync(decryptPacket(wire, key, 'wg-private-content-input-v1'), { maxOutputLength: 16 * 1024 ** 2 });
    const packet = validatePacket(JSON.parse(bytes.toString('utf8')), head.stdout.trim());
    const privateRoot = resolve(root, '.agents/legacy'); await mkdir(privateRoot, { recursive: true, mode: 0o700 });
    for (const file of packet.files) {
      const path = privatePath(root, file.path); await mkdir(dirname(path), { recursive: true, mode: 0o700 });
      assert((await realpath(dirname(path))).startsWith((await realpath(privateRoot)) + sep));
      await writeFile(path, Buffer.from(file.data, 'base64'), { flag: 'wx', mode: 0o600 });
    }
    const childEnv = privateChildEnvironment(process.env);
    const result = spawnSync(process.execPath, ['--max-old-space-size=512', privatePath(root, packet.entry)], {
      cwd: root, env: childEnv, encoding: 'utf8', timeout: 45 * 60 * 1000, maxBuffer: 16 * 1024 ** 2,
    });
    await writeFile(resolve(privateRoot, 'hosted-execution.log'), String(result.stdout ?? '') + String(result.stderr ?? ''), { flag: 'wx', mode: 0o600 });
    assert.equal(result.error == null, true); assert.equal(result.signal, null); assert.equal(result.status, 0);
    passed = true;
  } catch (error) { failure = { name: error.name, message: error.message }; }
  finally {
    const files = [];
    async function collect(directory) {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) await collect(path);
        else if (entry.isFile()) { const bytes = await readFile(path); files.push({ path: path.slice(root.length + 1), sha256: sha(bytes), bytes: bytes.length, data: bytes.toString('base64') }); }
      }
    }
    const privateRoot = resolve(root, '.agents/legacy'); await mkdir(privateRoot, { recursive: true, mode: 0o700 });
    await collect(privateRoot);
    const evidence = { schema: 'wg-private-content-evidence-v1', head: head.stdout.trim(), run_id: process.env.GITHUB_RUN_ID,
      input_sha256: process.env.WG_PRIVATE_CONTENT_SHA256, passed, failure, files };
    await writeFile(resolve(output, 'evidence.enc'), encryptPacket(gzipSync(Buffer.from(JSON.stringify(evidence))), key, 'wg-private-content-evidence-v1'), { flag: 'wx', mode: 0o600 });
    key.fill(0);
  }
  process.stdout.write(passed ? 'Private content checks passed. Evidence is encrypted.\n' : 'Private content checks failed. Details are in encrypted evidence.\n');
  if (!passed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runHosted().catch(() => { process.stderr.write('Private content runner refused before execution.\n'); process.exitCode = 1; });
}
