import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

// Exercise the real CLI over HTTP, including auth, paging and its process exit status.
async function audit(t, handle, args = [], table = 'trait') {
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
  const child = spawn(
    process.execPath,
    ['scripts/.dist/audit.mjs', ...(table ? ['--tables', table] : []), '--out', output, ...args],
    {
      env: {
        ...process.env,
        SUPABASE_URL: `http://127.0.0.1:${server.address().port}`,
        SUPABASE_SERVICE_ROLE_KEY: 'test-only-key',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  let logs = '';
  child.stdout.on('data', (data) => (logs += data));
  child.stderr.on('data', (data) => (logs += data));
  const code = await new Promise((resolve) => child.on('close', resolve));
  const report = await readFile(output, 'utf8')
    .then(JSON.parse)
    .catch(() => undefined);
  if (report) assert.equal((await stat(output)).mode & 0o777, 0o600);
  assert.ok(!logs.includes('test-only-key'));
  return { code, report, requests, logs };
}

const trait = (id, sourceId = 1) => ({
  id,
  created_at: '2026-09-04T00:00:00Z',
  name: 'Test trait',
  description: '',
  meta_data: null,
  content_source_id: sourceId,
});
const source = (id) => ({
  id,
  created_at: '2026-09-04T00:00:00Z',
  name: 'Test book',
  foundry_id: null,
  url: null,
  description: '',
  operations: [],
  user_id: null,
  contact_info: null,
  require_key: false,
  keys: null,
  is_published: true,
  deprecated: false,
  required_content_sources: [],
  group: 'pathfinder-core',
  artwork_url: null,
  meta_data: {},
});

const creature = (id) => ({
  id,
  created_at: '2026-09-28T00:00:00Z',
  type: 'creature',
  name: 'Test creature',
  level: 1,
  experience: 0,
  inventory: null,
  hp_current: 10,
  hp_temp: 0,
  stamina_current: 0,
  resolve_current: 0,
  details: { description: 'A creature.' },
  notes: null,
  roll_history: null,
  spells: null,
  operation_data: null,
  rarity: 'COMMON',
  operations: null,
  abilities_base: null,
  abilities_added: null,
  content_source_id: 400,
  deprecated: false,
  version: '1.0',
  meta_data: null,
});

const hazard = (id) => ({
  id,
  uuid: 1465735844144675,
  created_at: '2026-09-28T00:00:00Z',
  type: 'hazard',
  name: 'Test hazard',
  level: 5,
  rarity: 'RARE',
  details: {
    complexity: 'SIMPLE',
    trait_ids: [],
    trait_labels: [],
    stealth: 'DC 25',
    description: 'A hazard.',
    disable: 'DC 25 Nature',
    activation: { name: 'Sudden Gust', actions: 'REACTION', trigger: 'A creature approaches.', effect: 'Wind blows.' },
  },
  content_source_id: 400,
  deprecated: false,
  version: '1.0',
  meta_data: { source: { book: 'War of Immortals', page: '191' } },
});

test('full audit validates creature and hazard rows from their shared table once', async (t) => {
  const result = await audit(
    t,
    (url) => {
      if (url.pathname !== '/rest/v1/creature') return [200, []];
      if (url.searchParams.get('select') === 'id') return [200, [{ id: 2 }]];
      return [200, url.searchParams.has('and') ? [] : [creature(1), hazard(2)]];
    },
    [],
    null
  );
  assert.equal(result.code, 0, result.logs);
  assert.equal(result.report.complete, true);
  assert.equal(result.report.tables.find((table) => table.type === 'creature').scanned, 2);
  assert.equal(
    result.report.tables.some((table) => table.type === 'hazard'),
    false
  );
  assert.deepEqual(result.report.issues, []);
});

test('full audit identifies invalid hazard rules by hazard type', async (t) => {
  const invalidHazard = hazard(2);
  delete invalidHazard.details.disable;
  const result = await audit(
    t,
    (url) => {
      if (url.pathname !== '/rest/v1/creature') return [200, []];
      if (url.searchParams.get('select') === 'id') return [200, [{ id: 2 }]];
      return [200, url.searchParams.has('and') ? [] : [creature(1), invalidHazard]];
    },
    [],
    null
  );
  assert.equal(result.code, 1, result.logs);
  assert.equal(result.report.tables.find((table) => table.type === 'creature').invalid, 1);
  assert.ok(
    result.report.issues.some((issue) => issue.type === 'hazard' && issue.id === 2 && issue.path === 'details.disable')
  );
});

test('hazard-only audit filters shared storage and reports invalid hazard fields', async (t) => {
  const result = await audit(
    t,
    (url) => {
      assert.equal(url.pathname, '/rest/v1/creature');
      assert.equal(url.searchParams.get('type'), 'eq.hazard');
      if (url.searchParams.get('select') === 'id') return [200, [{ id: 2 }]];
      return [
        200,
        url.searchParams.has('and') ? [] : [{ ...hazard(2), details: { ...hazard(2).details, disable: undefined } }],
      ];
    },
    [],
    'hazard'
  );
  assert.equal(result.code, 1, result.logs);
  assert.equal(result.report.complete, true);
  assert.equal(result.report.tables[0].type, 'hazard');
  assert.equal(result.report.tables[0].invalid, 1);
  assert.ok(
    result.report.issues.some((issue) => issue.type === 'hazard' && issue.id === 2 && issue.path === 'details.disable')
  );
});

test('source-scoped hazard audit filters every page by type and source', async (t) => {
  const result = await audit(
    t,
    (url) => {
      if (url.pathname.endsWith('/content_source')) return [200, [source(400)]];
      assert.equal(url.pathname, '/rest/v1/creature');
      assert.equal(url.searchParams.get('type'), 'eq.hazard');
      assert.equal(url.searchParams.get('content_source_id'), 'eq.400');
      if (url.searchParams.get('select') === 'id') return [200, [{ id: 3 }]];
      assert.equal(url.searchParams.get('id'), 'lte.3');
      const cursor = url.searchParams.get('and');
      return [200, cursor === '(id.gt.3)' ? [] : [hazard(cursor ? 3 : 2)]];
    },
    ['--source-id', '400'],
    'hazard'
  );
  assert.equal(result.code, 0, result.logs);
  assert.equal(result.report.sourceId, 400);
  assert.equal(result.report.tables[0].scanned, 2);
  assert.equal(result.requests.length, 5);
});

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
  assert.equal(Object.hasOwn(result.report, 'sourceId'), false);
  assert.equal(result.requests.length, 4);
});

test('source-scoped scans filter every page and identify the book in the report', async (t) => {
  const result = await audit(
    t,
    (url) => {
      if (url.pathname.endsWith('/content_source')) {
        assert.equal(url.searchParams.get('id'), 'eq.400');
        return [200, [source(400)]];
      }
      assert.equal(url.searchParams.get('content_source_id'), 'eq.400');
      if (url.searchParams.get('select') === 'id') return [200, [{ id: 3 }]];
      assert.equal(url.searchParams.get('id'), 'lte.3');
      const cursor = url.searchParams.get('and');
      return [200, cursor === '(id.gt.3)' ? [] : [trait(cursor ? 3 : 1, 400)]];
    },
    ['--source-id', '400']
  );
  assert.equal(result.code, 0, result.logs);
  assert.equal(result.report.sourceId, 400);
  assert.equal(result.report.complete, true);
  assert.equal(result.report.tables[0].scanned, 2);
  assert.equal(result.requests.length, 5);
  assert.match(result.logs, /Complete report for source 400/);
});

test('a scoped all-table scan validates the book record itself', async (t) => {
  const result = await audit(
    t,
    (url) => {
      assert.equal(url.pathname, '/rest/v1/content_source');
      assert.equal(url.searchParams.get('id'), 'eq.400');
      return [200, [source(400)]];
    },
    ['--source-id', '400'],
    'content-source'
  );
  assert.equal(result.code, 0, result.logs);
  assert.equal(result.report.sourceId, 400);
  assert.deepEqual(result.report.tables, [{ type: 'content-source', scanned: 1, invalid: 0, complete: true }]);
  assert.equal(result.requests.length, 1);
});

test('an unknown source fails rather than reporting an empty book', async (t) => {
  const result = await audit(
    t,
    (url) => {
      assert.equal(url.pathname, '/rest/v1/content_source');
      return [200, []];
    },
    ['--source-id', '400']
  );
  assert.equal(result.code, 2);
  assert.equal(result.report.sourceId, 400);
  assert.equal(result.report.complete, false);
  assert.match(result.report.error, /not found/);
  assert.equal(result.requests.length, 1);
});

test('a server response outside the selected source fails the scan', async (t) => {
  const result = await audit(
    t,
    (url) => {
      if (url.pathname.endsWith('/content_source')) return [200, [source(400)]];
      if (url.searchParams.get('select') === 'id') return [200, [{ id: 2 }]];
      return [200, [trait(2, 1)]];
    },
    ['--source-id', '400']
  );
  assert.equal(result.code, 2);
  assert.equal(result.report.complete, false);
  assert.match(result.report.error, /outside content source 400/);
});

for (const value of ['0', '1.5', '9007199254740992']) {
  test(`rejects invalid source ID ${value} before any request`, async (t) => {
    const result = await audit(t, () => assert.fail('must not contact server'), ['--source-id', value]);
    assert.equal(result.code, 2);
    assert.equal(result.requests.length, 0);
  });
}

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
