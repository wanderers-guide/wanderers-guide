/** Real entry points with explicit Auth, database and delivery fixtures; no outbound messages. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(`${repo}/frontend/package.json`);
const { build } = require('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-account-handlers-'));
const writes = [];
const member = { id: 17, user_id: 'fixture-owner', is_admin: false };
let user = member;
let profileRows = [member];
let messages = 0;
let creatorEnabled = false;
let creatorObservation;
const service = {
  rpc: async (name) => {
    assert.equal(name, 'patreon_creator_membership');
    return { data: creatorObservation, error: null };
  },
  from(table) {
    assert.equal(table, 'content_update', 'submission cannot write content counters');
    return {
      insert(body) {
        writes.push({ table, body });
        return { select: () => ({ single: async () => ({ data: { id: 99, ...body }, error: null }) }) };
      },
    };
  },
};
globalThis.Deno = { env: { get: (key) => key === 'PATREON_CREATOR_ENABLED' ? String(creatorEnabled) : 'fixture-only' } };
globalThis.fetch = async (url) => {
  assert.equal(url, 'https://content-updates-bot.onrender.com/update');
  messages++;
  return Response.json({ message_id: 'fixture-message' });
};
globalThis.__accountFixture = {
  logEvent: () => {},
  connect: async (request, fn) => fn({}, await request.json(), 'fixture'),
  createServiceClient: () => {
    assert(user, 'must authenticate before service access');
    return service;
  },
  getPublicUser: async (_client, _token, options) => {
    if (options) assert.equal(options.rejectAnonymous, true);
    return user;
  },
  fetchData: async (_client, table) =>
    table === 'public_user' ? profileRows : [{ id: 3, name: 'Fixture source' }],
  updateData: async (client, table, id, body) => {
    assert.equal(client, service);
    writes.push({ table, id, body });
    return { status: 'SUCCESS' };
  },
  upsertResponseWrapper: (_action, data) => ({ status: 'success', data }),
  addToGameMasterGroup: async (client, actor) => {
    assert.equal(client, service);
    assert.equal(actor, member);
    return { status: 'SUCCESS' };
  },
  regenerateGameMasterAccessCode: async (client, actor) => {
    assert.equal(client, service);
    assert.equal(actor, member);
    return { status: 'SUCCESS' };
  },
};
const plugins = [
  {
    name: 'explicit-boundaries',
    setup(b) {
      b.onResolve({filter:/^https:\/\/esm.sh\/zod@3/},()=>({path:require.resolve('zod/v3')}));
      b.onResolve({ filter: /^(std\/server|\.\.\/_shared\/(helpers|patreon)\.ts)$/ }, (a) => ({
        path: a.path,
        namespace: 'fixture',
      }));
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, (a) => ({
        contents:
          a.path === 'std/server'
            ? 'export const serve = fn => { globalThis.__accountHandler = fn; };'
            : `export const { ${Object.keys(globalThis.__accountFixture).join(', ')} } = globalThis.__accountFixture;`,
        loader: 'js',
      }));
    },
  },
];
const request = (body) =>
  new Request('https://fixture.invalid', { method: 'POST', body: JSON.stringify(body) });
async function handler(name) {
  const outfile = join(directory, `${name}.mjs`);
  await build({
    stdin: { contents: `import './supabase/functions/${name}/index.ts';`, resolveDir: repo },
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    plugins,
  });
  await import(pathToFileURL(outfile).href);
  return globalThis.__accountHandler;
}
try {
  const submit = await handler('create-content-update');
  const input = {
    type: 'spell',
    ref_id: 1,
    action: 'UPDATE',
    data: { name: 'Proposal' },
    content_source_id: 3,
    user_id: 'someone-else',
    status: { state: 'APPROVED' },
    upvotes: ['forged'],
    discord_msg_id: 'forged',
  };
  user = null;
  assert.equal((await submit(request(input))).status, 'fail');
  user = { ...member, deactivated: true };
  assert.equal((await submit(request(input))).status, 'fail');
  assert.equal(writes.length, 0);
  assert.equal(messages, 0);
  user = member;
  assert.equal((await submit(request(input))).status, 'success');
  assert.equal(writes[0].body.user_id, member.user_id);
  assert.equal(writes[0].body.status.state, 'PENDING');
  assert.deepEqual(writes[0].body.upvotes, []);
  assert.equal(writes[0].body.discord_msg_id, undefined);
  assert.deepEqual(writes[1], {
    table: 'content_update',
    id: 99,
    body: { discord_msg_id: 'fixture-message' },
  });
  assert.equal(messages, 1);
  for (const name of ['gm-add-to-group', 'gm-regenerate-code']) {
    const run = await handler(name);
    assert.equal(
      (await run(request({ gm_user_id: 'fixture-gm', access_code: 'fixture' }))).status,
      'success',
    );
    user = null;
    assert.equal((await run(request({}))).status, 'error');
    user = member;
  }
  const getProfile = await handler('get-user');
  const beforeProfileWrites = writes.length;
  for (const [patreon, expected] of [
    [
      {
        patreon_user_id: 'patron',
        access_token: 'private-access',
        refresh_token: 'private-refresh',
        oauth_client_id: 'fixture-only',
        tier: 'WANDERER',
      },
      'connected',
    ],
    [
      {
        patreon_user_id: 'patron',
        access_token: 'private-access',
        refresh_token: 'private-refresh',
        tier: 'WANDERER',
      },
      'migration_required',
    ],
    [
      {
        patreon_user_id: 'patron',
        access_token: 'private-access',
        oauth_scopes: ['users'],
        tier: 'WANDERER',
      },
      'reconnect_required',
    ],
  ]) {
    user = { ...member, patreon: structuredClone(patreon) };
    const result = await getProfile(request({}));
    assert.equal(result.data.patreon.connection_status, expected);
    for (const key of ['access_token', 'refresh_token', 'oauth_client_id', 'tier'])
      assert.equal(result.data.patreon[key], patreon[key]);
  }
  for (const [sponsor, expected] of [
    [{ access_token: 'private-sponsor', oauth_client_id: 'fixture-only', tier: 'GAME-MASTER' }, 'connected'],
    [{ access_token: 'private-sponsor', tier: 'GAME-MASTER' }, 'migration_required'],
    [{ access_token: 'private-sponsor', oauth_client_id: 'fixture-only', tier: 'WANDERER' }, 'not_connected'],
  ]) {
    user = {
      ...member,
      patreon: {
        game_master: {
          virtual_tier: { game_master_user_id: 'sponsor', game_master_name: 'Sponsor', added_at: 'fixture' },
        },
      },
    };
    profileRows = [{ user_id: 'sponsor', patreon: sponsor }];
    const result = await getProfile(request({}));
    assert.equal(result.data.patreon.connection_status, 'not_connected');
    assert.equal(result.data.patreon.game_master.virtual_tier.access_status, expected);
    assert.equal(result.data.patreon.access_token, undefined);
    assert.equal(result.data.patreon.game_master.virtual_tier.access_token, undefined);
  }
  creatorEnabled = true;
  for (const [observation, expected] of [
    [{ enabled: true, available: true, tier: 'WANDERER', observed_at: new Date().toISOString() }, 'connected'],
    [{ enabled: true, available: false }, 'verification_unavailable'],
  ]) {
    creatorObservation = observation;
    user = { ...member, patreon: { patreon_user_id: 'legacy-patron', access_token: 'legacy-access', refresh_token: 'legacy-refresh', oauth_scopes: ['users'], tier: 'ADVOCATE' } };
    const result = await getProfile(request({}));
    assert.equal(result.data.patreon.connection_status, expected);
    assert.equal(result.data.patreon.access_token, 'legacy-access');
    assert.equal(result.data.patreon.refresh_token, 'legacy-refresh');
    assert.equal(result.data.patreon.tier, observation.available ? 'WANDERER' : 'ADVOCATE');
  }
  assert.equal(writes.length, beforeProfileWrites, 'profile reads never rewrite connections');
  console.log(
    'PASS account authentication, moderation ownership, GM write clients and read-only Patreon migration profiles; delivery mocked',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
