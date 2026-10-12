/** Real Patreon adapter and persistence logic, with provider/Auth/database fixtures only. */
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(`${repo}/frontend/package.json`);
const { build } = require('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-patreon-tests-'));
after(() => rm(directory, { recursive: true, force: true }));
const service = {};
let gmProfiles = [];
let writes = [],
  requests = [],
  responses = [],
  status = 'SUCCESS',
  emptyWrite = false,
  actor,
  logs = [];
const original = {
  id: 17,
  user_id: 'fixture-actor',
  patreon: {
    game_master: { virtual_tier: { game_master_user_id: 'fixture-gm' } },
  },
};
const environment = {
  PATREON_CLIENT_ID: 'legacy-client',
  PATREON_CLIENT_SECRET: 'legacy-secret',
  PATREON_V2_CLIENT_ID: 'v2-client',
  PATREON_V2_CLIENT_SECRET: 'v2-secret',
};
globalThis.Deno = { env: { get: (key) => environment[key] } };
globalThis.__patreonFixture = {
  createClient: () => service,
  createServiceClient: () => {
    assert(actor && !actor.deactivated);
    return service;
  },
  getPublicUser: async (_client, _token, options) => {
    assert.equal(options.rejectAnonymous, true);
    return actor;
  },
  connect: async (req, fn) => fn({}, await req.json(), 'fixture-session'),
  logEvent: (...args) => logs.push(args),
  fetchData: async () => gmProfiles,
  updateData: async (client, table, id, body, returnData) => {
    assert.equal(client, service);
    assert.equal(table, 'public_user');
    assert.equal(id, original.id);
    writes.push(structuredClone(body));
    return {
      status,
      data: returnData ? (status === 'SUCCESS' && !emptyWrite ? [{ id }] : []) : null,
    };
  },
};
const outfile = join(directory, 'patreon.mjs');
await build({
  stdin: {
    contents: `export * from './supabase/functions/_shared/patreon.ts'; export * from './supabase/functions/_shared/patreon-api.ts';`,
    resolveDir: repo,
  },
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  plugins: [
    {
      name: 'external-boundaries',
      setup(b) {
        b.onResolve({ filter: /^https:\/\/esm.sh\/zod/ }, () => ({
          path: require.resolve('zod'),
        }));
        b.onResolve({ filter: /^lodash$/ }, () => ({
          path: require.resolve('lodash-es'),
        }));
        b.onResolve({ filter: /^(\.\/helpers.ts|@supabase\/supabase-js)$/ }, (a) => ({
          path: a.path,
          namespace: 'fixture',
        }));
        b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
          contents: `export const {createClient,fetchData,updateData,logEvent} = globalThis.__patreonFixture;`,
          loader: 'js',
        }));
      },
    },
  ],
});
const api = await import(pathToFileURL(outfile).href);
const tokens = {
  access_token: 'fixture-access',
  refresh_token: 'fixture-refresh',
};
function identity(tierIds = ['5628112'], campaign = '4805226') {
  return {
    data: {
      id: 'correct-patron',
      type: 'user',
      attributes: {
        full_name: 'Fixture patron',
        email: 'patron@example.invalid',
      },
      relationships: {
        memberships: { data: [{ id: 'membership', type: 'member' }] },
      },
    },
    included: [
      {
        id: 'creator',
        type: 'user',
        attributes: { full_name: 'Wrong identity' },
      },
      {
        id: 'membership',
        type: 'member',
        relationships: {
          campaign: { data: { id: campaign, type: 'campaign' } },
          currently_entitled_tiers: {
            data: tierIds.map((id) => ({ id, type: 'tier' })),
          },
        },
      },
    ],
  };
}
function setup(...values) {
  gmProfiles = [];
  writes = [];
  requests = [];
  responses = values;
  status = 'SUCCESS';
  emptyWrite = false;
  logs = [];
  actor = original;
  globalThis.fetch = async (url, init) => {
    requests.push({ url: new URL(url), init });
    assert.equal(new URL(url).origin, 'https://www.patreon.com');
    assert(init.headers['User-Agent']);
    assert(init.signal instanceof AbortSignal);
    const result = responses.shift();
    if (result instanceof Error) throw result;
    assert(result !== undefined, 'Unexpected extra provider request');
    return result instanceof Response ? result : Response.json(result);
  };
}
test('native link exchanges once, reads v2 identity and persists the authenticated patron', async () => {
  setup(tokens, identity());
  assert.equal(
    await api.handlePatreonRedirect(
      service,
      original,
      'one-use-code',
      'https://wanderersguide.app/auth/patreon/redirect'
    ),
    true
  );
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url.pathname, '/api/oauth2/token');
  const body = new URLSearchParams(requests[0].init.body);
  assert.equal(body.get('client_id'), 'v2-client');
  assert.equal(body.get('code'), 'one-use-code');
  assert.equal(requests[1].url.pathname, '/api/oauth2/v2/identity');
  assert.equal(
    requests[1].url.searchParams.get('include'),
    'memberships.currently_entitled_tiers,memberships.campaign'
  );
  assert.equal(writes[0].patreon.patreon_user_id, 'correct-patron');
  assert.equal(writes[0].patreon.tier, 'WANDERER');
  assert.equal(writes[0].patreon.oauth_client_id, 'v2-client');
  assert.deepEqual(writes[0].patreon.game_master, original.patreon.game_master);
  assert.equal(original.patreon.access_token, undefined, 'input remains unchanged');
});
for (const [ids, expected] of [
  [['5612688'], 'ADVOCATE'],
  [['6299276'], 'LEGEND'],
  [['22622808'], 'GAME-MASTER'],
  [['5612688', '5628112', '22622808'], 'GAME-MASTER'],
  [[], undefined],
  [['unknown'], undefined],
]) {
  test(`current entitled tiers map to ${expected ?? 'no paid access'}: ${ids}`, async () => {
    setup(identity(ids));
    assert.equal((await api.fetchPatreonIdentity('fixture-access')).tier, expected);
  });
}
test('other campaigns and unrelated included members cannot grant WG access', async () => {
  const value = identity(['22622808'], 'other-campaign');
  value.included.push({
    ...identity(['22622808']).included[1],
    id: 'unrelated',
  });
  setup(value);
  assert.equal((await api.fetchPatreonIdentity('fixture-access')).tier, undefined);
});
test('hidden Patreon names/email and free members still link', async () => {
  const value = identity([]);
  value.data.attributes = { full_name: null, email: null };
  setup(tokens, value);
  await api.handlePatreonRedirect(service, original, 'code', 'https://wanderersguide.app/auth/patreon/redirect');
  assert.equal(writes[0].patreon.patreon_user_id, 'correct-patron');
  assert.equal(writes[0].patreon.tier, undefined);
});
test('a new GM receives an access code in the same successful account write', async () => {
  setup(tokens, identity(['22622808']));
  await api.handlePatreonRedirect(service, original, 'code', 'https://wanderersguide.app/auth/patreon/redirect');
  assert.equal(writes.length, 1);
  assert(writes[0].patreon.game_master.access_code?.length >= 12);
});
test('reconnecting a GM preserves their existing group code', async () => {
  setup(tokens, identity(['22622808']));
  await api.handlePatreonRedirect(
    service,
    {
      ...original,
      patreon: {
        tier: 'GAME-MASTER',
        game_master: { access_code: 'existing-group-code' },
      },
    },
    'code',
    'https://wanderersguide.app/auth/patreon/redirect'
  );
  assert.equal(writes[0].patreon.game_master.access_code, 'existing-group-code');
});
for (const failure of [
  new Error('private-provider-error'),
  new Response('{"errors":[{"detail":"private"}]}', { status: 410 }),
  new Response('{}', { status: 429 }),
  new Response('{}', { status: 503 }),
  { data: { type: 'user', id: 'broken' } },
  { ...identity(), included: [] },
]) {
  test(`provider failure does not save, expose credentials, or replay the authorization: ${failure.status ?? failure.message ?? 'malformed'}`, async () => {
    setup(tokens, failure);
    await assert.rejects(
      api.handlePatreonRedirect(service, original, 'code', 'https://wanderersguide.app/auth/patreon/redirect'),
      /Patreon connection could not be completed/
    );
    assert.equal(writes.length, 0);
    assert.equal(requests.length, 2);
  });
}
test('failed persistence cannot claim a connected account', async () => {
  setup(tokens, identity());
  status = 'ERROR_UNKNOWN';
  assert.equal(
    await api.handlePatreonRedirect(service, original, 'code', 'https://wanderersguide.app/auth/patreon/redirect'),
    false
  );
});
test('an account row that disappeared cannot claim a successful write', async () => {
  setup(tokens, identity());
  emptyWrite = true;
  assert.equal(
    await api.handlePatreonRedirect(service, original, 'code', 'https://wanderersguide.app/auth/patreon/redirect'),
    false
  );
});
test('legacy refresh retains its issuing client while new grants use v2 credentials', async () => {
  setup(tokens);
  await api.refreshPatreonToken('old-refresh', '');
  assert.equal(new URLSearchParams(requests[0].init.body).get('client_id'), 'legacy-client');
  setup(tokens);
  await api.refreshPatreonToken('new-refresh', 'v2-client');
  assert.equal(new URLSearchParams(requests[0].init.body).get('client_id'), 'v2-client');
});
test('identity outages fail paid checks quietly and preserve all linked account data', async () => {
  setup(new Response('{}', { status: 503 }));
  const user = { ...original, patreon: { ...tokens, tier: 'WANDERER' } };
  assert.equal(await api.hasPatreonAccess(user, 2), false);
  assert.equal(writes.length, 0);
  assert.equal(requests.length, 1);
  assert.equal(user.patreon.tier, 'WANDERER');
});
test('expired access refreshes once and saves rotated tokens before checking membership', async () => {
  setup(new Response('{}', { status: 401 }), tokens, identity());
  const user = {
    ...original,
    patreon: {
      access_token: 'expired',
      refresh_token: 'original-refresh',
      tier: 'WANDERER',
    },
  };
  assert.equal(await api.hasPatreonAccess(user, 2), true);
  assert.equal(requests.length, 3);
  assert.equal(writes[0].patreon.refresh_token, 'fixture-refresh');
  assert.equal(new URLSearchParams(requests[1].init.body).get('client_id'), 'legacy-client');
});
test('rotated tokens survive a subsequent identity outage', async () => {
  setup(new Response('{}', { status: 401 }), tokens, new Response('{}', { status: 503 }));
  const user = {
    ...original,
    patreon: {
      access_token: 'expired',
      refresh_token: 'original-refresh',
      tier: 'WANDERER',
    },
  };
  assert.equal(await api.hasPatreonAccess(user, 2), false);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].patreon.refresh_token, 'fixture-refresh');
  assert.equal(writes[0].patreon.tier, 'WANDERER');
});
test('verified empty entitlement removes paid access, while an absent token cannot grant a cached paid tier', async () => {
  setup(identity([]));
  assert.equal(await api.hasPatreonAccess({ ...original, patreon: { ...tokens, tier: 'WANDERER' } }, 2), false);
  assert.equal(writes[0].patreon.tier, undefined);
  setup();
  assert.equal(await api.hasPatreonAccess({ ...original, patreon: { tier: 'WANDERER' } }, 2), false);
  assert.equal(writes.length, 0);
});
test('token exchange failure never proceeds to identity or persistence', async () => {
  setup(
    new Response('{"error":"invalid_grant","private":"secret"}', {
      status: 400,
    })
  );
  await assert.rejects(
    api.handlePatreonRedirect(service, original, 'code', 'https://wanderersguide.app/auth/patreon/redirect'),
    (e) => e.stage === 'token' && !JSON.stringify(e).includes('secret')
  );
  assert.equal(requests.length, 1);
  assert.equal(writes.length, 0);
});
const entry = join(directory, 'entry.mjs');
await build({
  stdin: {
    contents: `import './supabase/functions/handle-patreon-redirect/index.ts';`,
    resolveDir: repo,
  },
  outfile: entry,
  bundle: true,
  platform: 'node',
  format: 'esm',
  plugins: [
    {
      name: 'entry-boundaries',
      setup(b) {
        b.onResolve({ filter: /^https:\/\/esm.sh\/zod/ }, () => ({
          path: require.resolve('zod'),
        }));
        b.onResolve({ filter: /^lodash$/ }, () => ({
          path: require.resolve('lodash-es'),
        }));
        b.onResolve({ filter: /^(std\/server|.*\/helpers.ts|@supabase\/supabase-js)$/ }, (a) => ({
          path: a.path,
          namespace: 'fixture',
        }));
        b.onLoad({ filter: /.*/, namespace: 'fixture' }, (a) => ({
          contents:
            a.path === 'std/server'
              ? `export const serve=fn=>globalThis.__patreonEntry=fn;`
              : `export const {${Object.keys(globalThis.__patreonFixture).join(',')}}=globalThis.__patreonFixture;`,
          loader: 'js',
        }));
      },
    },
  ],
});
await import(pathToFileURL(entry).href);
const invoke = (body) =>
  globalThis.__patreonEntry(
    new Request('https://fixture.invalid', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  );
test('entry point rejects missing/deactivated actors before provider or service access', async () => {
  for (const user of [null, { ...original, deactivated: true }]) {
    setup();
    actor = user;
    assert.equal(
      (
        await invoke({
          code: 'code',
          redirectOrigin: 'https://wanderersguide.app',
        })
      ).status,
      'error'
    );
    assert.equal(requests.length, 0);
    assert.equal(writes.length, 0);
  }
});
test('entry point validates callback code and origin before exchanging', async () => {
  for (const body of [
    {},
    { code: '', redirectOrigin: 'https://wanderersguide.app' },
    { code: 'x', redirectOrigin: 'https://user:pass@evil.invalid/path' },
    { code: 'x', redirectOrigin: 'http://evil.invalid' },
  ]) {
    setup();
    assert.equal((await invoke(body)).status, 'fail');
    assert.equal(requests.length, 0);
  }
});
test('entry point returns success only after a stored link and keeps provider/DB errors private', async () => {
  const body = { code: 'code', redirectOrigin: 'https://wanderersguide.app' };
  setup(tokens, identity());
  assert.deepEqual(await invoke(body), {
    status: 'success',
    data: 'Patreon connected',
  });
  setup(tokens, identity());
  status = 'ERROR_UNKNOWN';
  assert.equal((await invoke(body)).status, 'error');
  assert.equal(logs[0][3].stage, 'persistence');
  setup(new Response('{"private":"fixture-secret"}', { status: 403 }));
  const response = await invoke(body);
  assert.equal(response.status, 'error');
  assert(!JSON.stringify([response, logs]).includes('fixture-secret'));
  assert.equal(logs[0][3].stage, 'token');
  assert.equal(logs[0][3].status, 403);
});
test('a GM provider outage cannot erase a player’s own Patreon link or virtual group', async () => {
  setup(identity(['5612688']), new Response('{}', { status: 503 }));
  gmProfiles = [{ id: 18, user_id: 'fixture-gm', patreon: { ...tokens, tier: 'GAME-MASTER' } }];
  const player = { ...original, patreon: { ...original.patreon, ...tokens, tier: 'ADVOCATE' } };
  assert.equal(await api.hasPatreonAccess(player, 2), false);
  assert.equal(writes.length, 0);
  assert.equal(player.patreon.access_token, tokens.access_token);
  assert.equal(player.patreon.game_master.virtual_tier.game_master_user_id, 'fixture-gm');
});
test('a refused refresh preserves the existing account and never retries a grant', async () => {
  setup(new Response('{}', { status: 401 }), new Response('{"error":"invalid_grant"}', { status: 400 }));
  const user = { ...original, patreon: { ...tokens, tier: 'WANDERER' } };
  assert.equal(await api.hasPatreonAccess(user, 2), false);
  assert.equal(writes.length, 0);
  assert.equal(requests.length, 2);
  assert.equal(user.patreon.refresh_token, tokens.refresh_token);
});
test('provider timeout aborts the request and returns only a safe stage', async () => {
  const realSet = globalThis.setTimeout,
    realClear = globalThis.clearTimeout;
  let deadline;
  globalThis.setTimeout = (fn, ms) => {
    assert.equal(ms, 10000);
    deadline = fn;
    return 123;
  };
  globalThis.clearTimeout = (id) => assert.equal(id, 123);
  globalThis.fetch = async (_url, { signal }) =>
    new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Error('private timeout body'))));
  try {
    const promise = api.fetchPatreonIdentity('fixture-access');
    deadline();
    await assert.rejects(
      promise,
      (e) => e.stage === 'identity' && e.message === 'Patreon connection could not be completed.'
    );
  } finally {
    globalThis.setTimeout = realSet;
    globalThis.clearTimeout = realClear;
  }
});
