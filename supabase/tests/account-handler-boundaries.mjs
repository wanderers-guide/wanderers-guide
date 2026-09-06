/** Real entry points with explicit Auth, database and delivery fixtures; no outbound messages. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = fileURLToPath(new URL('../../', import.meta.url));
const { build } = createRequire(`${repo}/frontend/package.json`)('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-account-handlers-'));
const writes = [];
const member = { id: 17, user_id: 'fixture-owner', is_admin: false };
let user = member;
let messages = 0;
const service = { from(table) {
  assert.equal(table, 'content_update', 'submission cannot write content counters');
  return { insert(body) {
    writes.push({ table, body });
    return { select: () => ({ single: async () => ({ data: { id: 99, ...body }, error: null }) }) };
  } };
} };
globalThis.Deno = { env: { get: () => 'fixture-only' } };
globalThis.fetch = async url => {
  assert.equal(url, 'https://content-updates-bot.onrender.com/update');
  messages++;
  return Response.json({ message_id: 'fixture-message' });
};
globalThis.__accountFixture = {
  connect: async (request, fn) => fn({}, await request.json(), 'fixture'),
  createServiceClient: () => { assert(user, 'must authenticate before service access'); return service; },
  getPublicUser: async (_client, _token, options) => {
    if (options) assert.equal(options.rejectAnonymous, true);
    return user;
  },
  fetchData: async (_client, table) => table === 'public_user' ? [member] : [{ id: 3, name: 'Fixture source' }],
  updateData: async (client, table, id, body) => {
    assert.equal(client, service);
    writes.push({ table, id, body });
    return { status: 'SUCCESS' };
  },
  upsertResponseWrapper: (_action, data) => ({ status: 'success', data }),
  addToGameMasterGroup: async (client, actor) => { assert.equal(client, service); assert.equal(actor, member); return { status: 'SUCCESS' }; },
  regenerateGameMasterAccessCode: async (client, actor) => { assert.equal(client, service); assert.equal(actor, member); return { status: 'SUCCESS' }; },
};
const plugins = [{ name: 'explicit-boundaries', setup(b) {
  b.onResolve({ filter: /^(std\/server|\.\.\/_shared\/(helpers|patreon)\.ts)$/ }, a => ({ path: a.path, namespace: 'fixture' }));
  b.onLoad({ filter: /.*/, namespace: 'fixture' }, a => ({ contents: a.path === 'std/server'
    ? 'export const serve = fn => { globalThis.__accountHandler = fn; };'
    : `export const { ${Object.keys(globalThis.__accountFixture).join(', ')} } = globalThis.__accountFixture;`, loader: 'js' }));
} }];
const request = body => new Request('https://fixture.invalid', { method: 'POST', body: JSON.stringify(body) });
async function handler(name) {
  const outfile = join(directory, `${name}.mjs`);
  await build({ stdin: { contents: `import './supabase/functions/${name}/index.ts';`, resolveDir: repo }, outfile,
    bundle: true, platform: 'node', format: 'esm', plugins });
  await import(pathToFileURL(outfile).href);
  return globalThis.__accountHandler;
}
try {
  const submit = await handler('create-content-update');
  const input = { type: 'spell', ref_id: 1, action: 'UPDATE', data: { name: 'Proposal' }, content_source_id: 3,
    user_id: 'someone-else', status: { state: 'APPROVED' }, upvotes: ['forged'], discord_msg_id: 'forged' };
  user = null;
  assert.equal((await submit(request(input))).status, 'fail');
  user = { ...member, deactivated: true };
  assert.equal((await submit(request(input))).status, 'fail');
  assert.equal(writes.length, 0); assert.equal(messages, 0);
  user = member;
  assert.equal((await submit(request(input))).status, 'success');
  assert.equal(writes[0].body.user_id, member.user_id);
  assert.equal(writes[0].body.status.state, 'PENDING');
  assert.deepEqual(writes[0].body.upvotes, []);
  assert.equal(writes[0].body.discord_msg_id, undefined);
  assert.deepEqual(writes[1], { table: 'content_update', id: 99, body: { discord_msg_id: 'fixture-message' } });
  assert.equal(messages, 1);
  for (const name of ['gm-add-to-group', 'gm-regenerate-code']) {
    const run = await handler(name);
    assert.equal((await run(request({ gm_user_id: 'fixture-gm', access_code: 'fixture' }))).status, 'success');
    user = null;
    assert.equal((await run(request({}))).status, 'error');
    user = member;
  }
  console.log('PASS account authentication, trusted moderation ownership/state, isolated counters and GM write clients; delivery mocked');
} finally { await rm(directory, { recursive: true, force: true }); }
