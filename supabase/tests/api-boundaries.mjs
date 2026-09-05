/** Local-only regression tests: actual handlers; auth, DB and paid HTTP are explicit fixtures. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(`${repo}/frontend/package.json`);
const { build } = require('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-api-boundaries-'));
let actor = null;
let profile = { id: 1, user_id: 'fixture-user', is_admin: false };
let budget = true;
let budgetError = null;
let statsError = null;
let lastMembership;
let upstreamBody;
let upstreamCalls = 0;
let reserved = [];
let fetchMode = 'success';
const rows = [{ id: 1, uuid: 'fixture-one', name: 'Fixture', content_source_id: 1 }];
globalThis.Deno = { env: { get: key => key === 'AI_FUNCTION_URL' ? 'https://fixture.invalid/ai' : 'fixture-placeholder' } };
globalThis.fetch = async (url, options) => {
  upstreamCalls++;
  upstreamBody = JSON.parse(options.body);
  assert(options.signal, 'every paid call has an abort deadline');
  if (fetchMode === 'timeout') return await new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  if (fetchMode === 'failure') return new Response('private upstream details', { status: 500 });
  if (String(url).endsWith('/query')) return Response.json({ ids: [['fixture-one']], metadatas: [[{ name: 'Fixture' }]], distances: [[0.2]] });
  return new Response('Fixture completion');
};
globalThis.__client = {
  auth: { getUser: async () => ({ data: { user: actor }, error: null }) },
  rpc: async (_name, params) => { reserved.push(params); return { data: budget, error: budgetError }; },
  from(table) {
    let head = false;
    const q = {
      select(_columns, options) { head = !!options?.head; return this; },
      order() { return this; }, eq() { return this; }, in() { return this; }, gt() { return this; },
      contains(column, value) {
        lastMembership = { column, value, head };
        return head ? Promise.resolve({ count: statsError ? null : 7, error: statsError }) : this;
      },
      limit: async () => ({ data: table === 'public_user' ? [profile] : rows, error: null }),
    };
    return q;
  },
};
const plugins = [{ name: 'explicit-test-boundaries', setup(b) {
  b.onResolve({ filter: /^(std\/server|@supabase\/supabase-js|npm:jose@5\.9\.6|\.\/upload-utils\.ts)$/ }, a => ({ path: a.path, namespace: 'test' }));
  b.onLoad({ filter: /.*/, namespace: 'test' }, a => ({ contents:
    a.path === 'std/server' ? 'export const serve = fn => { globalThis.__handler = fn; };' :
    a.path.includes('supabase-js') ? 'export const createClient = () => globalThis.__client;' :
    a.path.includes('jose') ? 'export class SignJWT { constructor() { throw new Error("Unexpected signing"); } }' : 'export const uniqueId = () => "fixture";', loader: 'js' }));
  b.onResolve({ filter: /^lodash$/ }, () => ({ path: require.resolve('lodash') }));
  b.onResolve({ filter: /^https:\/\/esm.sh\/zod@3/ }, () => ({ path: require.resolve('zod/v3') }));
} }];
async function bundle(name, contents) {
  const outfile = join(directory, `${name}.mjs`);
  await build({ stdin: { contents, resolveDir: repo, loader: 'ts' }, outfile, bundle: true, platform: 'node', format: 'esm', plugins });
  return import(pathToFileURL(outfile).href);
}
const request = (body = {}, token = 'fixture.user.signature', extra = {}) => new Request('https://fixture.invalid/test', {
  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'cf-connecting-ip': '192.0.2.1', ...extra }, body: JSON.stringify(body),
});
async function handler(name) {
  await bundle(name, `import './supabase/functions/${name}/index.ts';`);
  return globalThis.__handler;
}
try {
  const api = await bundle('shared', `export { connect } from './supabase/functions/_shared/helpers.ts'; export * from './supabase/functions/_shared/rate-limit.ts'; export { fetchWorkText } from './supabase/functions/_shared/costly-requests.ts';`);
  assert.notEqual(api.bucketFor({ token: 'anon.public.jwt', ip: 'one' }).bucket, api.bucketFor({ token: 'anon.public.jwt', ip: 'two' }).bucket);
  let called = 0;
  for (let i = 0; i < 240; i++) assert.equal((await api.connect(request({}, `rotate.${i}.jwt`), async () => { called++; return { status: 'success', data: true }; })).status, 200);
  const rejected = request();
  rejected.body.getReader = () => { throw new Error('Rejected body must not be read'); };
  assert.equal((await api.connect(rejected, async () => { called++; })).status, 429);
  assert.equal(called, 240);
  api._resetRateLimits();
  for (let i = 0; i < api.MAX_RATE_LIMIT_BUCKETS; i++) assert(api.checkRateLimit(`ip:${i}`, 1).allowed);
  assert.equal(api.checkRateLimit('new-address', 1).allowed, false);
  const realNow = Date.now;
  Date.now = () => realNow() + 61_000;
  assert(api.checkRateLimit('new-address', 1).allowed, 'expired addresses are globally evicted');
  Date.now = realNow;
  api._resetRateLimits();
  assert.equal((await api.connect(request({ long: 'body' }), async () => { throw new Error('Must not run'); }, { maxBodyBytes: 5 })).status, 413);
  assert.equal((await api.connect(request({}, undefined, { 'content-length': '999' }), async () => { throw new Error('Must not run'); }, { maxBodyBytes: 5 })).status, 413);
  const expired = await api.connect(request(), async () => { throw { code: 'PGRST301', message: 'JWT expired' }; });
  assert.equal(expired.status, 401);
  assert.equal((await expired.json()).data.code, 'AUTH_REQUIRED');
  console.log('PASS admission, streamed body bounds, bucket retention and expired JWT normalization');

  const ai = await handler('open-ai-request');
  assert.equal((await ai(request({ content: 'hello' }))).status, 401);
  actor = { id: 'fixture-user', is_anonymous: true };
  assert.equal((await ai(request({ content: 'hello' }))).status, 401);
  actor = { id: 'fixture-user', is_anonymous: false };
  assert.equal((await ai(request({ content: 'hello', model: 'unapproved' }))).status, 400);
  assert.equal((await ai(request({ content: 'x'.repeat(64001) }))).status, 400);
  assert.equal(upstreamCalls, 0);
  assert.equal((await ai(request({ content: 'hello', model: 'gpt-4o-mini' }))).status, 200);
  assert.equal(reserved.at(-1).p_units, 1);
  assert.equal(upstreamBody.model, 'gpt-4o-mini');
  budget = false;
  const limited = await ai(request({ content: 'hello' }));
  assert.equal(limited.status, 429);
  assert(limited.headers.get('retry-after'));
  assert.equal(upstreamCalls, 1);
  budget = true; budgetError = { code: '42883' };
  assert.equal((await ai(request({ content: 'hello' }))).status, 503);
  assert.equal(upstreamCalls, 1);
  budgetError = null;
  fetchMode = 'timeout';
  await assert.rejects(api.fetchWorkText('https://fixture.invalid/ai', { body: '{}' }, 15), e => e.status === 504);
  fetchMode = 'failure';
  const failed = await ai(request({ content: 'hello' }));
  assert.equal(failed.status, 502);
  assert(!(await failed.text()).includes('private upstream'));
  fetchMode = 'success';
  console.log('PASS AI auth, model/input bounds, shared quota denial, fail-closed behavior and upstream recovery');

  const populate = await handler('vector-db-populate-collection');
  const batch = { collection: 'name', type: 'spell', ids: [1] };
  assert.equal((await populate(request(batch))).status, 403);
  profile.is_admin = true;
  assert.equal((await populate(request({ ...batch, ids: [] }))).status, 400);
  assert.equal((await populate(request({ ...batch, ids: Array(501).fill(1) }))).status, 400);
  assert.equal((await populate(request(batch))).status, 200);
  assert.deepEqual(upstreamBody.ids, ['fixture-one']);
  const query = await handler('vector-db-query-collection');
  assert.equal((await query(request({ collection: 'name', query: 'hello', nResults: 51 }))).status, 400);
  assert.equal((await query(request({ collection: 'name', query: 'hello', where: { other: 'unbounded' } }))).status, 400);
  assert.equal((await query(request({ collection: 'name', query: 'hello', nResults: 11, where: { _type: 'spell' } }))).status, 200);
  actor = null;
  assert.equal((await query(request({ collection: 'name', query: 'hello' }))).status, 401);
  console.log('PASS vector admin population, nonempty batch bounds, user query authorization and result bounds');

  const stats = await handler('get-content-source-stats');
  const result = await stats(request({ content_source_id: 1 }));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).data.count, 7);
  assert.deepEqual(lastMembership, { column: 'subscribed_content_sources', value: JSON.stringify([{ source_id: 1 }]), head: true });
  statsError = { code: '42883' };
  assert.equal((await stats(request({ content_source_id: 1 }))).status, 503);
  assert.equal((await stats(request({ content_source_id: -1 }))).status, 400);
  console.log('PASS exact JSONB membership, HEAD count, and semantic count failures');
} finally { await rm(directory, { recursive: true, force: true }); }
