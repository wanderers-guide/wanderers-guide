// Local-only audit: real request wrapper, limiter and handlers; stub DB/auth/upstream.
// This never loads credentials or contacts production/paid services.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(`${repo}/frontend/package.json`);
const { build } = require('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-api-audit-'));
let authChecks = 0;
const upstream = [];
globalThis.Deno = { env: { get: key => key === 'AI_FUNCTION_URL' ? 'https://audit.invalid/ai' : 'audit-placeholder' } };
globalThis.fetch = async (url, options) => {
  upstream.push({ url, body: JSON.parse(options.body), hasDeadline: !!options.signal });
  return new Response('local upstream stub', { status: 200 });
};
const fixtureRows = [1, 2].map(id => ({ id, uuid: `fixture-${id}`, name: `Fixture ${id}` }));
globalThis.__auditClient = {
  auth: { getUser: async () => { authChecks++; return { data: { user: null } }; } },
  from() {
    const query = { select() { return this; }, order() { return this; }, limit() { return Promise.resolve({ data: fixtureRows, error: null }); } };
    return query;
  },
};
const plugins = [{ name: 'local-boundaries', setup(b) {
  b.onResolve({ filter: /^(std\/server|@supabase\/supabase-js|npm:jose@5\.9\.6|\.\/upload-utils\.ts)$/ }, args => ({ path: args.path, namespace: 'audit' }));
  b.onLoad({ filter: /.*/, namespace: 'audit' }, args => ({ contents:
    args.path === 'std/server' ? 'export const serve = fn => { globalThis.__auditHandler = fn; };' :
    args.path.includes('supabase-js') ? 'export const createClient = () => globalThis.__auditClient;' :
    args.path.includes('jose') ? 'export class SignJWT { constructor() { throw new Error("Unexpected signing"); } }' :
    'export const uniqueId = () => "audit-id";', loader: 'js' }));
  b.onResolve({ filter: /^lodash$/ }, () => ({ path: require.resolve('lodash') }));
} }];
async function bundle(name, contents) {
  const outfile = join(directory, `${name}.mjs`);
  await build({ stdin: { contents, resolveDir: repo, loader: 'ts' }, outfile, bundle: true, platform: 'node', format: 'esm', plugins });
  return import(pathToFileURL(outfile).href);
}
const request = (token, body = {}, ip = '192.0.2.1') => new Request('https://audit.invalid/functions/v1/test', {
  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(body),
});
try {
  const api = await bundle('helpers', `export { connect } from './supabase/functions/_shared/helpers.ts'; export * from './supabase/functions/_shared/rate-limit.ts';`);
  const publicToken = 'synthetic.anon.signature';
  const first = api.bucketFor({ token: publicToken, is36: false, ip: '192.0.2.1' });
  const second = api.bucketFor({ token: publicToken, is36: false, ip: '192.0.2.2' });
  assert.equal(first.bucket, second.bucket);
  for (let i = 0; i < first.limit; i++) api.checkRateLimit(first.bucket, first.limit);
  let parsed = false;
  const limited = request(publicToken);
  limited.json = async () => { parsed = true; return {}; };
  const response = await api.connect(limited, async () => { throw new Error('Must be limited'); });
  assert.equal(response.status, 429);
  assert.equal(parsed, true);
  console.log(JSON.stringify({ probe: 'anonymous admission', visitorsShareBucket: true, limit: first.limit, limitedRequestStillParsed: parsed }));
  api._resetRateLimits();
  let admitted = 0;
  for (let i = 0; i < 300; i++) {
    const response = await api.connect(request(`invalid.${i}.signature`), async () => { admitted++; return { status: 'success', data: null }; });
    assert.equal(response.status, 200);
  }
  console.log(JSON.stringify({ probe: 'raw token churn at wrapper', admitted, authChecks, scope: 'gateway-disabled handler boundary; database RLS still applies' }));
  await bundle('ai', `import './supabase/functions/open-ai-request/index.ts';`);
  const ai = await globalThis.__auditHandler(request(publicToken, { content: 'fixture', model: 'arbitrary-model' }));
  assert.equal((await ai.json()).status, 'success');
  assert.equal(upstream.length, 1);
  assert.equal(authChecks, 0);
  console.log(JSON.stringify({ probe: 'AI anonymous handler', upstreamCalls: upstream.length, authChecks, modelForwarded: upstream[0].body.model, hasDeadline: upstream[0].hasDeadline }));
  await bundle('vector', `import './supabase/functions/vector-db-populate-collection/index.ts';`);
  const vector = await globalThis.__auditHandler(request(publicToken, { collection: 'content', type: 'spell', ids: [] }));
  assert.equal((await vector.json()).status, 'success');
  assert.equal(upstream.length, 2);
  assert.equal(authChecks, 0);
  assert.equal(upstream[1].body.ids.length, fixtureRows.length);
  console.log(JSON.stringify({ probe: 'vector population anonymous handler', authChecks, emptyIdsForwardedAllFixtureRows: true, hasDeadline: upstream[1].hasDeadline }));
} finally { await rm(directory, { recursive: true, force: true }); }
