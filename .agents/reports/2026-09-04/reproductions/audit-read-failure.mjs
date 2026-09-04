/**
 * Exercises the exact readTable implementation pinned at 54d42dd7.
 * Also inherited by 197c790b. All fetch calls are mocked; no secrets or network.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const repo = '/Users/quzzar/Projects/wanderers-guide';
const require = createRequire(`${repo}/frontend/package.json`);
const { transformSync } = require('esbuild');
const source = execFileSync(
  'git',
  ['show', '54d42dd71307e004200ba552e34eb7dcbacff756:frontend/scripts/audit-content/audit-content.ts'],
  { cwd: repo, encoding: 'utf8' }
);
const start = source.indexOf('async function* readTable');
const end = source.indexOf('/** PATCH', start);
assert.ok(start >= 0 && end > start);
const compiled = transformSync(`const PAGE_SIZE = 1000; export ${source.slice(start, end)}`, {
  loader: 'ts',
  format: 'esm',
}).code;
const { readTable } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

let fetchCount = 0;
globalThis.fetch = async () => {
  fetchCount++;
  return new Response('mock unavailable', { status: 503 });
};
let count = 0;
for await (const row of readTable({ restUrl: 'https://example.invalid', serviceKey: 'mock-only' }, 'item')) {
  count++;
}
assert.equal(fetchCount, 1);
assert.equal(count, 0);
console.log('PASS: exact branch generator completes normally after mocked HTTP 503, yielding zero rows.');
console.log('Consequence: main records this table as OK 0/0 and exits 0 if no other invalid rows are counted.');
