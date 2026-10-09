import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { HISTORICAL_CONTENT_FIXTURE, readHistoricalContentDump } from './historical-content-fixture.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const git = promisify(execFile);

test('the explicitly selected historical catalog has its reviewed immutable identity without changing current content', async () => {
  const currentBefore = sha256(await readFile(join(root, 'data/data.sql')));
  const text = await readHistoricalContentDump({ repositoryRoot: root });
  assert.equal(Buffer.byteLength(text), 54853752);
  assert.equal(sha256(text), '90f71cdffc3be23d45526b6d29e2fc7cfb3e4fb9f5f717dbeed443a598cc9dbb');
  assert.deepEqual(HISTORICAL_CONTENT_FIXTURE, {
    commit: 'b5dd54c018ecd414be4dc5659a7c28e7ad4633b7',
    path: 'data/data.sql',
    blob: 'be12a8b06c9ea1d3ed68613b0c9004bca8d25f8a',
    bytes: 54853752,
    sha256: '90f71cdffc3be23d45526b6d29e2fc7cfb3e4fb9f5f717dbeed443a598cc9dbb',
  });
  assert.equal(Object.isFrozen(HISTORICAL_CONTENT_FIXTURE), true);
  assert.equal(sha256(await readFile(join(root, 'data/data.sql'))), currentBefore);
});

test('a checkout without the pinned Git object fails instead of using current or private data', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'wg-historical-missing-'));
  try {
    await git('git', ['init', '--quiet', temporaryRoot]);
    await assert.rejects(readHistoricalContentDump({ repositoryRoot: temporaryRoot }), /historical content fixture/i);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

/** A separate Git object namespace can shadow objects without changing this checkout. */
async function withHistoricalObjects(run) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'wg-historical-objects-'));
  try {
    await git('git', ['init', '--quiet', temporaryRoot]);
    const { stdout } = await git('git', ['-C', root, 'rev-parse', '--path-format=absolute', '--git-path', 'objects']);
    await writeFile(join(temporaryRoot, '.git/objects/info/alternates'), stdout);
    await run(temporaryRoot);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

test('Git replacement refs cannot redirect the declared historical commit to current content', async () => {
  await withHistoricalObjects(async temporaryRoot => {
    const { stdout } = await git('git', ['-C', root, 'rev-parse', 'HEAD']);
    await git('git', ['-C', temporaryRoot, 'update-ref', 'refs/replace/' + HISTORICAL_CONTENT_FIXTURE.commit, stdout.trim()]);
    const replaced = await git('git', ['-C', temporaryRoot, 'rev-parse', HISTORICAL_CONTENT_FIXTURE.commit + ':data/data.sql']);
    assert.notEqual(replaced.stdout.trim(), HISTORICAL_CONTENT_FIXTURE.blob);
    assert.equal(sha256(await readHistoricalContentDump({ repositoryRoot: temporaryRoot })), '90f71cdffc3be23d45526b6d29e2fc7cfb3e4fb9f5f717dbeed443a598cc9dbb');
  });
});

test('a same-length corrupted Git blob cannot masquerade as the reviewed historical content', async () => {
  await withHistoricalObjects(async temporaryRoot => {
    const bytes = Buffer.from(await readHistoricalContentDump({ repositoryRoot: root }));
    bytes[0] = bytes[0] === 45 ? 46 : 45;
    const objectDirectory = join(temporaryRoot, '.git/objects', HISTORICAL_CONTENT_FIXTURE.blob.slice(0, 2));
    await mkdir(objectDirectory);
    await writeFile(join(objectDirectory, HISTORICAL_CONTENT_FIXTURE.blob.slice(2)), deflateSync(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes])));
    await assert.rejects(readHistoricalContentDump({ repositoryRoot: temporaryRoot }), /historical content fixture/i);
  });
});
