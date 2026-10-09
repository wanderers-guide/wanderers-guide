import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

/** Exact reviewed predecessor for migration-stage tests, never the current catalog. */
export const HISTORICAL_CONTENT_FIXTURE = Object.freeze({
  commit: 'b5dd54c018ecd414be4dc5659a7c28e7ad4633b7',
  path: 'data/data.sql',
  blob: 'be12a8b06c9ea1d3ed68613b0c9004bca8d25f8a',
  bytes: 54853752,
  sha256: '90f71cdffc3be23d45526b6d29e2fc7cfb3e4fb9f5f717dbeed443a598cc9dbb',
});

const execFileAsync = promisify(execFile);
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Read and verify the pinned Git blob without replacing the working-tree dump.
 * Missing history is an error; CI must fetch the declared commit explicitly.
 */
export async function readHistoricalContentDump({ repositoryRoot = defaultRoot } = {}) {
  assert.equal(typeof repositoryRoot, 'string', 'Historical content fixture needs a repository path');
  const root = resolve(repositoryRoot);
  const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')));
  environment.GIT_NO_REPLACE_OBJECTS = '1';
  environment.GIT_NO_LAZY_FETCH = '1';
  environment.GIT_TERMINAL_PROMPT = '0';
  async function git(arguments_, maxBuffer) {
    try {
      const result = await execFileAsync('git', ['-C', root, ...arguments_], {
        encoding: 'buffer',
        maxBuffer,
        timeout: 60000,
        env: environment,
      });
      return result.stdout;
    } catch (cause) {
      throw new Error('Historical content fixture Git input is unavailable or unreadable. Fetch its pinned commit before running historical tests.', { cause });
    }
  }
  const binding = await git(['rev-parse', '--verify', HISTORICAL_CONTENT_FIXTURE.commit + ':' + HISTORICAL_CONTENT_FIXTURE.path], 1024);
  assert.equal(binding.toString('utf8'), HISTORICAL_CONTENT_FIXTURE.blob + '\n', 'Historical content fixture commit/path must resolve to its exact reviewed blob');
  const bytes = await git(['cat-file', 'blob', HISTORICAL_CONTENT_FIXTURE.blob], HISTORICAL_CONTENT_FIXTURE.bytes + 1024);
  assert.equal(bytes.length, HISTORICAL_CONTENT_FIXTURE.bytes, 'Historical content fixture exact byte length');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), HISTORICAL_CONTENT_FIXTURE.sha256, 'Historical content fixture exact SHA-256');
  const text = bytes.toString('utf8');
  assert.ok(Buffer.from(text, 'utf8').equals(bytes), 'Historical content fixture must be lossless UTF-8');
  return text;
}
