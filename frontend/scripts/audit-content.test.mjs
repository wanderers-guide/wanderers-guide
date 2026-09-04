import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

// Exercise the real CLI over HTTP, including auth, paging and its process exit status.
async function audit(t, handle, args = []) {
  const directory = await mkdtemp(join(tmpdir(), 'wg-content-audit-'));
  const requests = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    requests.push({ method: request.method, url });
    assert.equal(request.method, 'GET');
    assert.equal(request.headers.apikey, 'test-only-key');
    assert.equal(request.headers.authorization, 'Bearer test-only-key');
    const [status, body] = handle(url);
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(body));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  const output = join(directory, 'report.json');
  await writeFile(output, 'previous report');
  await chmod(output, 0o644);
  const child = spawn(process.execPath, ['scripts/.dist/audit.mjs', '--tables', 'trait', '--out', output, ...args], {
    env: {
      ...process.env,
      SUPABASE_URL: `http://127.0.0.1:${server.address().port}`,
      SUPABASE_SERVICE_ROLE_KEY: 'test-only-key',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (data) => (logs += data));
  child.stderr.on('data', (data) => (logs += data));
  const code = await new Promise((resolve) => child.on('close', resolve));
  const report = await readFile(output, 'utf8').then(JSON.parse).catch(() => undefined);
  if (report) assert.equal((await stat(output)).mode & 0o777, 0o600);
  assert.ok(!logs.includes('test-only-key'));
  return { code, report, requests, logs };
}

const trait = (id) => ({ id, created_at: '2026-09-04T00:00:00Z', name: 'Test trait', description: '', meta_data: null, content_source_id: 1 });

test('continues past server-capped short pages and bounds new inserts', async (t) => {
  const result = await audit(t, (url) => {
    if (url.searchParams.get('select') === 'id') return [200, [{ id: 2 }]];
    assert.equal(url.searchParams.get('id'), 'lte.2');
    const cursor = url.searchParams.get('and');
    return [200, cursor === '(id.gt.2)' ? [] : [trait(cursor ? 2 : 1)]];
  });
  assert.equal(result.code, 0, result.logs);
  assert.equal(result.report.complete, true);
  assert.equal(result.report.tables[0].scanned, 2);
  assert.equal(result.requests.length, 4);
});

test('later HTTP failures preserve counts but fail the audit', async (t) => {
  const result = await audit(t, (url) => {
    if (url.searchParams.get('select') === 'id') return [200, [{ id: 2 }]];
    return url.searchParams.has('and') ? [503, { message: 'unavailable' }] : [200, [trait(1)]];
  });
  assert.equal(result.code, 2);
  assert.equal(result.report.complete, false);
  assert.equal(result.report.tables[0].complete, false);
  assert.equal(result.report.tables[0].scanned, 1);
  assert.match(result.report.error, /HTTP 503/);
});

test('invalid content is reported without changing it', async (t) => {
  const result = await audit(t, (url) => {
    if (url.searchParams.get('select') === 'id') return [200, [{ id: 1 }]];
    return [200, url.searchParams.has('and') ? [] : [{ ...trait(1), name: 123 }]];
  });
  assert.equal(result.code, 1);
  assert.equal(result.report.complete, true);
  assert.equal(result.report.tables[0].invalid, 1);
  assert.ok(result.report.issues.some((issue) => issue.id === 1 && issue.path === 'name'));
});

test('non-advancing pages fail rather than looping or claiming completeness', async (t) => {
  const result = await audit(t, () => [200, [trait(1)]]);
  assert.equal(result.code, 2);
  assert.match(result.report.error, /pagination did not advance/);
});

test('malformed responses fail rather than looking like an empty table', async (t) => {
  const result = await audit(t, () => [200, { message: 'not a row array' }]);
  assert.equal(result.code, 2);
  assert.equal(result.report.complete, false);
});

test('write flags are rejected before any network request', async (t) => {
  const result = await audit(t, () => assert.fail('must not contact server'), ['--write']);
  assert.equal(result.code, 2);
  assert.equal(result.requests.length, 0);
});

test('unknown table names are rejected before any network request', async (t) => {
  const result = await audit(t, () => assert.fail('must not contact server'), ['--tables', 'constructor']);
  assert.equal(result.code, 2);
  assert.equal(result.requests.length, 0);
});
