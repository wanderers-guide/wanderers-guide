import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkProduction } from './production-health.mjs';

test('semantic health rejects an HTTP 200 error envelope and never issues writes', async () => {
  const requests = [];
  const result = await checkProduction({ anonKey: 'fixture', request: async (url, options) => {
    requests.push(url);
    assert(options.signal);
    if (url.includes('/auth/')) return Response.json({ version: 'fixture' });
    if (url.endsWith('find-content-source')) return Response.json({ status: 'error', message: 'private diagnostic' });
    if (url.endsWith('get-content-versions')) return Response.json({ status: 'success', data: [{ id: 3, updated_at: 'fixture' }] });
    return new Response('<div id="root"></div><script type="module" src="/assets/test.js"></script>');
  } });
  assert.equal(result.passed, false);
  assert.equal(result.checks.filter(check => !check.passed)[0].name, 'content-source');
  assert(!JSON.stringify(result).includes('private diagnostic'));
  assert.equal(requests.length, 4);
});
