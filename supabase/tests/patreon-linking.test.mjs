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
const service = {
  from(table) {
    assert.equal(table, 'public_user');
    return {
      select(columns, options) {
        assert.equal(columns, 'user_id');
        assert.equal(options.count, 'exact');
        assert.equal(options.head, true);
        return { eq: async () => ({ count: 0, error: null }) };
      },
      update(body) {
        let guard;
        const query = {
          eq(column, value) {
            if (column === 'id') assert.equal(value, original.id);
            else if (column === 'user_id') assert.equal(value, original.user_id);
            else guard = { column, value };
            return query;
          },
          is(column, value) {
            guard = { column, value };
            return query;
          },
          async select(columns) {
            assert.equal(columns, 'id');
            writes.push(structuredClone(body));
            writeGuards.push(guard);
            if (status === 'ERROR_UNKNOWN')
              return { data: null, error: { message: 'private database failure' } };
            return { data: status === 'SUCCESS' && !emptyWrite ? [{ id: original.id }] : [], error: null };
          },
        };
        return query;
      },
    };
  },
};
let gmProfiles = [];
let gmProfileResolver;
let writeGuards = [];
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
  fetchData: async () => (gmProfileResolver ? gmProfileResolver() : gmProfiles),
};
const outfile = join(directory, 'patreon.mjs');
await build({
  stdin: {
    contents: `export * from './supabase/functions/_shared/patreon.ts'; export * from './supabase/functions/_shared/patreon-api.ts'; export * from './supabase/functions/_shared/patreon-store.ts';`,
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
  scope: 'identity identity[email]',
  oauth_client_id: 'v2-client',
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
  gmProfileResolver = undefined;
  writes = [];
  writeGuards = [];
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
    let result = responses.shift();
    if (typeof result === 'function') result = await result();
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
      'https://wanderersguide.app/auth/patreon/redirect',
    ),
    true,
  );
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url.pathname, '/api/oauth2/token');
  const body = new URLSearchParams(requests[0].init.body);
  assert.equal(body.get('client_id'), 'v2-client');
  assert.equal(body.get('code'), 'one-use-code');
  assert.equal(requests[1].url.pathname, '/api/oauth2/v2/identity');
  assert.equal(
    requests[1].url.searchParams.get('include'),
    'memberships.currently_entitled_tiers,memberships.campaign',
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
  await api.handlePatreonRedirect(
    service,
    original,
    'code',
    'https://wanderersguide.app/auth/patreon/redirect',
  );
  assert.equal(writes[0].patreon.patreon_user_id, 'correct-patron');
  assert.equal(writes[0].patreon.tier, undefined);
});
test('a new GM receives an access code in the same successful account write', async () => {
  setup(tokens, identity(['22622808']));
  await api.handlePatreonRedirect(
    service,
    original,
    'code',
    'https://wanderersguide.app/auth/patreon/redirect',
  );
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
    'https://wanderersguide.app/auth/patreon/redirect',
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
      api.handlePatreonRedirect(
        service,
        original,
        'code',
        'https://wanderersguide.app/auth/patreon/redirect',
      ),
      /Patreon connection could not be completed/,
    );
    assert.equal(writes.length, 0);
    assert.equal(requests.length, 2);
  });
}
test('failed persistence cannot claim a connected account or expose database details', async () => {
  setup(tokens, identity());
  status = 'ERROR_UNKNOWN';
  await assert.rejects(
    api.handlePatreonRedirect(service, original, 'code', 'https://wanderersguide.app/auth/patreon/redirect'),
    (error) => error.message === 'Patreon connection persistence failed.',
  );
});
test('an account row that disappeared cannot claim a successful write', async () => {
  setup(tokens, identity());
  emptyWrite = true;
  assert.equal(
    await api.handlePatreonRedirect(
      service,
      original,
      'code',
      'https://wanderersguide.app/auth/patreon/redirect',
    ),
    false,
  );
});
test('refresh rejects legacy clients before provider I/O and new grants require v2 configuration', async () => {
  setup();
  await assert.rejects(api.refreshPatreonToken('old-refresh', ''), (error) => error.stage === 'migration');
  assert.equal(requests.length, 0);
  setup(tokens);
  await api.refreshPatreonToken('new-refresh', 'v2-client');
  assert.equal(new URLSearchParams(requests[0].init.body).get('client_id'), 'v2-client');
  const saved = environment.PATREON_V2_CLIENT_ID;
  delete environment.PATREON_V2_CLIENT_ID;
  try {
    assert.throws(
      () => api.patreonClient(),
      (error) => error.stage === 'configuration',
    );
  } finally {
    environment.PATREON_V2_CLIENT_ID = saved;
  }
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
      oauth_client_id: 'v2-client',
      tier: 'WANDERER',
    },
  };
  assert.equal(await api.hasPatreonAccess(user, 2), true);
  assert.equal(requests.length, 3);
  assert.equal(writes[0].patreon.refresh_token, 'fixture-refresh');
  assert.equal(new URLSearchParams(requests[1].init.body).get('client_id'), 'v2-client');
});
test('rotated tokens survive a subsequent identity outage', async () => {
  setup(new Response('{}', { status: 401 }), tokens, new Response('{}', { status: 503 }));
  const user = {
    ...original,
    patreon: {
      access_token: 'expired',
      refresh_token: 'original-refresh',
      oauth_client_id: 'v2-client',
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
  assert.equal(
    await api.hasPatreonAccess({ ...original, patreon: { ...tokens, tier: 'WANDERER' } }, 2),
    false,
  );
  assert.equal(writes[0].patreon.tier, undefined);
  setup();
  assert.equal(await api.hasPatreonAccess({ ...original, patreon: { tier: 'WANDERER' } }, 2), false);
  assert.equal(writes.length, 0);
});
test('token exchange failure never proceeds to identity or persistence', async () => {
  setup(
    new Response('{"error":"invalid_grant","private":"secret"}', {
      status: 400,
    }),
  );
  await assert.rejects(
    api.handlePatreonRedirect(service, original, 'code', 'https://wanderersguide.app/auth/patreon/redirect'),
    (e) => e.stage === 'token' && !JSON.stringify(e).includes('secret'),
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
    }),
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
      'error',
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
test('a lapsed GM group cannot revoke a paragon’s or developer’s own access', async () => {
  for (const flag of ['is_community_paragon', 'is_developer']) {
    setup();
    gmProfiles = [{ id: 18, user_id: 'fixture-gm', patreon: { tier: 'GAME-MASTER' } }];
    const user = { ...original, [flag]: true };
    assert.equal(await api.hasPatreonAccess(user, 2), true, flag);
    assert.equal(await api.hasPatreonAccess(user, 3), false, flag);
    assert.equal(writes.length, 0);
    assert.equal(requests.length, 0);
  }
});
test('a broken Patreon link cannot revoke a paragon’s or developer’s own access', async () => {
  for (const flag of ['is_community_paragon', 'is_developer']) {
    setup(new Response('{}', { status: 503 }));
    const user = { ...original, patreon: { ...tokens, tier: 'WANDERER' }, [flag]: true };
    assert.equal(await api.hasPatreonAccess(user, 2), true, flag);
    assert.equal(requests.length, 0);
    assert.equal(await api.hasPatreonAccess(user, 3), false, flag);
    assert.equal(requests.length, 1);
    assert.equal(writes.length, 0);
  }
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
    new Promise((resolve, reject) =>
      signal.addEventListener('abort', () => reject(Error('private timeout body'))),
    );
  try {
    const promise = api.fetchPatreonIdentity('fixture-access');
    deadline();
    await assert.rejects(
      promise,
      (e) => e.stage === 'identity' && e.message === 'Patreon connection could not be completed.',
    );
  } finally {
    globalThis.setTimeout = realSet;
    globalThis.clearTimeout = realClear;
  }
});

test('creation distinguishes a rejected Patreon link from a missing membership', async () => {
  setup(new Response('{}', { status: 401 }), tokens, new Response('{}', { status: 401 }));
  const user = { ...original, patreon: { ...tokens, tier: 'WANDERER' } };
  await assert.rejects(api.hasPatreonAccess(user, 2, { throwOnFailure: true }), (error) => {
    assert.equal(error.code, 'PATREON_RECONNECT_REQUIRED');
    assert.match(error.message, /Reconnect Patreon in Account/);
    assert.equal(error.status, 503);
    return true;
  });
  assert.equal(user.patreon.tier, 'WANDERER');
});

test('creation distinguishes a provider outage from a missing membership', async () => {
  setup(new Response('{}', { status: 503 }));
  const user = { ...original, patreon: { ...tokens, tier: 'WANDERER' } };
  await assert.rejects(api.hasPatreonAccess(user, 2, { throwOnFailure: true }), (error) => {
    assert.equal(error.code, 'PATREON_UNAVAILABLE');
    assert.match(error.message, /temporarily unavailable/);
    return true;
  });
  assert.equal(writes.length, 0);
});

test('legacy grants request migration without trying a retired API or rotating their token', async () => {
  setup();
  const user = {
    ...original,
    patreon: { ...tokens, tier: 'WANDERER', oauth_scopes: ['users', 'pledges-to-me'] },
  };
  delete user.patreon.oauth_client_id;
  await assert.rejects(
    api.hasPatreonAccess(user, 2, { throwOnFailure: true }),
    (error) => error.code === 'PATREON_RECONNECT_REQUIRED',
  );
  assert.equal(requests.length, 0);
  assert.equal(writes.length, 0);
});

test('new authorization cannot save v1 scopes as a v2 connection', async () => {
  setup({ ...tokens, scope: 'users pledges-to-me my-campaign' }, identity());
  await assert.rejects(
    api.handlePatreonRedirect(service, original, 'code', 'https://wanderersguide.app/auth/patreon/redirect'),
    (error) => error.stage === 'scope',
  );
  assert.equal(writes.length, 0);
  assert.equal(requests.length, 1);
});

test('a downgraded sponsor cannot grant virtual Game Master benefits', async () => {
  setup(identity(['5628112']));
  gmProfiles = [
    { id: 18, user_id: 'fixture-gm', patreon: { ...tokens, oauth_client_id: 'v2-client', tier: 'WANDERER' } },
  ];
  assert.equal(await api.hasPatreonAccess(original, 2), false);
});

test('Game Master member summaries never return account credentials', async () => {
  setup(identity(['22622808']));
  const secret = {
    user_id: 'fixture-member',
    display_name: 'Member',
    patreon: {
      access_token: 'PRIVATE_ACCESS',
      refresh_token: 'PRIVATE_REFRESH',
      patreon_email: 'PRIVATE_EMAIL',
    },
    api: { clients: [{ api_key: 'PRIVATE_KEY' }] },
  };
  const originalFrom = service.from;
  service.from = () => ({ select: () => ({ eq: async () => ({ data: [secret], error: null }) }) });
  try {
    const members = await api.getAllUsersInGameMasterGroup({
      ...original,
      patreon: { ...tokens, oauth_client_id: 'v2-client', tier: 'GAME-MASTER' },
    });
    assert.deepEqual(members, [{ user_id: 'fixture-member', display_name: 'Member' }]);
    assert(!JSON.stringify(members).includes('PRIVATE_'));
  } finally {
    service.from = originalFrom;
  }
});

test('rotated v2 credentials are saved before rejecting an invalid scope response', async () => {
  setup(new Response('{}', { status: 401 }), { ...tokens, scope: 'users pledges-to-me' });
  const user = { ...original, patreon: { ...tokens, tier: 'WANDERER' } };
  await assert.rejects(
    api.hasPatreonAccess(user, 2, { throwOnFailure: true }),
    (error) => error.code === 'PATREON_RECONNECT_REQUIRED',
  );
  assert.equal(requests.length, 2);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].patreon.refresh_token, tokens.refresh_token);
  assert.deepEqual(writes[0].patreon.oauth_scopes, ['users', 'pledges-to-me']);
});

test('a healthy v2 sponsor benefits a virtual-only player and a player with a legacy personal link', async () => {
  for (const linked of [false, true]) {
    setup(identity(['22622808']));
    gmProfiles = [{ id: 18, user_id: 'fixture-gm', patreon: { ...tokens, tier: 'GAME-MASTER' } }];
    const player = {
      ...original,
      patreon: {
        ...original.patreon,
        ...(linked
          ? {
              access_token: 'legacy-access',
              refresh_token: 'legacy-refresh',
              tier: 'WANDERER',
              oauth_scopes: ['users', 'pledges-to-me'],
            }
          : {}),
      },
    };
    assert.equal(await api.hasPatreonAccess(player, 2, { throwOnFailure: true }), true);
    assert.equal(requests.length, 1);
    assert.equal(writes.length, 0);
  }
});

test('a virtual-only player is directed to their sponsor for migration', async () => {
  setup(new Response('{}', { status: 401 }));
  gmProfiles = [{ id: 18, user_id: 'fixture-gm', patreon: { access_token: 'legacy', tier: 'GAME-MASTER' } }];
  await assert.rejects(
    api.hasPatreonAccess(original, 2, { throwOnFailure: true }),
    (error) => error.code === 'PATREON_SPONSOR_RECONNECT_REQUIRED',
  );
  assert.equal(requests.length, 1);
});

test('a concurrent reconnect cannot be overwritten by an older refresh result', async () => {
  setup(new Response('{}', { status: 401 }), tokens);
  status = 'CONFLICT';
  const user = {
    ...original,
    patreon: { ...tokens, access_token: 'older-access', refresh_token: 'older-refresh', tier: 'WANDERER' },
  };
  const before = structuredClone(user.patreon);
  await assert.rejects(
    api.hasPatreonAccess(user, 2, { throwOnFailure: true }),
    (error) => error.code === 'PATREON_UNAVAILABLE',
  );
  assert.deepEqual(writeGuards, [{ column: 'patreon->>revision', value: null }]);
  assert.equal(requests.length, 2, 'never use a refresh result after a failed guarded save');
  assert.deepEqual(user.patreon, before);
});

test('failed scope authorization retains the previous connection and group code', async () => {
  for (const scope of [undefined, 'users pledges-to-me']) {
    setup({ ...tokens, scope });
    const before = structuredClone(original);
    await assert.rejects(
      api.handlePatreonRedirect(
        service,
        original,
        'code',
        'https://wanderersguide.app/auth/patreon/redirect',
      ),
      (error) => error.stage === 'scope',
    );
    assert.equal(writes.length, 0);
    assert.deepEqual(original, before);
  }
});

test('legacy Game Masters retain read-only member cleanup without provider requests', async () => {
  setup();
  const originalFrom = service.from;
  service.from = () => ({
    select: (columns) => {
      assert.equal(columns, 'user_id,display_name');
      return { eq: async () => ({ data: [{ user_id: 'member', display_name: 'Member' }], error: null }) };
    },
  });
  try {
    assert.deepEqual(
      await api.getAllUsersInGameMasterGroup({
        ...original,
        patreon: { tier: 'GAME-MASTER', access_token: 'legacy' },
      }),
      [{ user_id: 'member', display_name: 'Member' }],
    );
    assert.equal(requests.length, 0);
    assert.equal(writes.length, 0);
  } finally {
    service.from = originalFrom;
  }
});

test('a missing server configuration never instructs an already connected patron to reconnect', async () => {
  setup();
  const saved = environment.PATREON_V2_CLIENT_ID;
  delete environment.PATREON_V2_CLIENT_ID;
  try {
    await assert.rejects(
      api.hasPatreonAccess({ ...original, patreon: { ...tokens, tier: 'WANDERER' } }, 2, {
        throwOnFailure: true,
      }),
      (error) => error.code === 'PATREON_UNAVAILABLE',
    );
    assert.equal(writes.length, 0);
    assert.equal(requests.length, 0);
  } finally {
    environment.PATREON_V2_CLIENT_ID = saved;
  }
});

test('an unmarked record with a working v2 token keeps its connection and benefits', async () => {
  setup(identity(['5628112']));
  const user = {
    ...original,
    patreon: { access_token: 'unmarked-v2-access', refresh_token: 'unmarked-refresh', tier: 'WANDERER' },
  };
  const before = structuredClone(user);
  assert.equal(await api.hasPatreonAccess(user, 2, { throwOnFailure: true }), true);
  assert.equal(requests.length, 1);
  assert.equal(writes.length, 0);
  assert.deepEqual(user, before);
});

test('a different Patreon identity cannot change the saved membership', async () => {
  setup(identity(['22622808']));
  const user = {
    ...original,
    patreon: { ...tokens, patreon_user_id: 'different-stored-patron', tier: 'WANDERER' },
  };
  const before = structuredClone(user);
  await assert.rejects(
    api.hasPatreonAccess(user, 2, { throwOnFailure: true }),
    (error) => error.code === 'PATREON_RECONNECT_REQUIRED',
  );
  assert.equal(writes.length, 0);
  assert.deepEqual(user, before);
});

/** Real PostgREST SDK transport with an isolated atomic row fixture and no production I/O. */
function storeSandbox(initial, beforePatch) {
  const { createClient } = require('@supabase/supabase-js');
  let row = { id: original.id, user_id: original.user_id, patreon: structuredClone(initial) };
  const ledger = [];
  const client = createClient('https://store-fixture.invalid', 'fixture-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init = {}) => {
        const url = new URL(input instanceof Request ? input.url : input);
        assert.equal(url.origin, 'https://store-fixture.invalid');
        assert.equal(url.pathname, '/rest/v1/public_user');
        assert.equal(url.searchParams.get('id'), `eq.${original.id}`);
        assert.equal(url.searchParams.get('user_id'), `eq.${original.user_id}`);
        assert(!url.href.includes('secret-access'));
        assert(!url.href.includes('secret-refresh'));
        ledger.push({ method: init.method ?? 'GET', url: url.href });
        if (init.method === 'PATCH') {
          beforePatch?.(row, ledger.filter((x) => x.method === 'PATCH').length);
          const expected = url.searchParams.get('patreon->>revision');
          const actual = row.patreon?.revision;
          if (expected !== (actual ? `eq.${actual}` : 'is.null')) return Response.json([]);
          row.patreon = JSON.parse(init.body).patreon;
          return Response.json([{ id: row.id }]);
        }
        assert.equal(init.method, 'GET');
        assert.equal(url.searchParams.get('select'), 'patreon');
        return Response.json({ patreon: row.patreon });
      },
    },
  });
  return { client, ledger, row: () => row };
}

for (const previous of [null, {}, { revision: null }]) {
  test(`first Patreon write safely guards ${JSON.stringify(previous)}`, async () => {
    const sandbox = storeSandbox(previous);
    const next = {
      access_token: 'secret-access-first',
      refresh_token: 'secret-refresh-first',
      oauth_client_id: 'v2-client',
    };
    const saved = await api.savePatreonConnection(sandbox.client, original, previous, next);
    assert(saved?.revision);
    assert.equal(sandbox.row().patreon.access_token, next.access_token);
    assert.equal(new URL(sandbox.ledger[0].url).searchParams.get('patreon->>revision'), 'is.null');
  });
}

test('two first links cannot overwrite one another and use no credential-bearing URL filters', async () => {
  const sandbox = storeSandbox(null);
  const links = [
    { access_token: 'secret-access-A', refresh_token: 'secret-refresh-A' },
    { access_token: 'secret-access-B', refresh_token: 'secret-refresh-B' },
  ];
  const results = await Promise.all(
    links.map((link) => api.savePatreonConnection(sandbox.client, original, null, link)),
  );
  assert.equal(results.filter(Boolean).length, 1);
  assert.deepEqual(sandbox.row().patreon, results.find(Boolean));
});

test('a metadata-only race retains group edits and saves the rotated pair without another refresh', async () => {
  const previous = {
    access_token: 'secret-access-old',
    refresh_token: 'secret-refresh-old',
    oauth_client_id: 'v2-client',
    patreon_user_id: 'correct-patron',
    revision: crypto.randomUUID(),
    game_master: { access_code: 'old-code' },
  };
  const sandbox = storeSandbox(previous, (row, attempt) => {
    if (attempt === 1)
      row.patreon = {
        ...row.patreon,
        revision: crypto.randomUUID(),
        game_master: { access_code: 'concurrent-code' },
      };
  });
  const saved = await api.saveRefreshedPatreonConnection(sandbox.client, original, previous, {
    access_token: 'secret-access-new',
    refresh_token: 'secret-refresh-new',
    oauth_scopes: ['identity'],
  });
  assert.equal(saved.access_token, 'secret-access-new');
  assert.equal(saved.refresh_token, 'secret-refresh-new');
  assert.equal(saved.game_master.access_code, 'concurrent-code');
  assert.equal(sandbox.ledger.filter((x) => x.method === 'PATCH').length, 2);
  assert.equal(sandbox.ledger.filter((x) => x.method === 'GET').length, 1);
});

test('a newer OAuth grant wins against an older rotated response', async () => {
  const previous = {
    access_token: 'secret-access-old',
    refresh_token: 'secret-refresh-old',
    oauth_client_id: 'v2-client',
    revision: crypto.randomUUID(),
  };
  const newer = {
    ...previous,
    access_token: 'secret-access-reconnected',
    refresh_token: 'secret-refresh-reconnected',
    revision: crypto.randomUUID(),
  };
  const sandbox = storeSandbox(previous, (row, attempt) => {
    if (attempt === 1) row.patreon = structuredClone(newer);
  });
  assert.equal(
    await api.saveRefreshedPatreonConnection(sandbox.client, original, previous, {
      access_token: 'secret-access-late',
      refresh_token: 'secret-refresh-late',
    }),
    null,
  );
  assert.deepEqual(sandbox.row().patreon, newer);
  assert.equal(sandbox.ledger.filter((x) => x.method === 'PATCH').length, 1);
});

for (const scope of [undefined, null, { unexpected: 'metadata' }, ['identity', 17]]) {
  test(`refresh retains the rotated pair when scope metadata is unknown: ${JSON.stringify(scope)}`, async () => {
    setup(new Response('{}', { status: 401 }), { ...tokens, scope }, identity());
    const user = { ...original, patreon: { ...tokens, oauth_scopes: ['identity'], tier: 'WANDERER' } };
    assert.equal(await api.hasPatreonAccess(user, 2, { throwOnFailure: true }), true);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].patreon.refresh_token, tokens.refresh_token);
    assert.deepEqual(writes[0].patreon.oauth_scopes, ['identity']);
    assert.equal(requests.length, 3);
  });
}

test('a revoked GM code cannot enroll a player after a slow membership verification', async () => {
  const gm = {
    id: 18,
    user_id: 'fixture-gm',
    display_name: 'Sponsor',
    patreon: { ...tokens, tier: 'GAME-MASTER', game_master: { access_code: 'old-code' } },
  };
  setup(() => {
    gmProfiles = [{ ...gm, patreon: { ...gm.patreon, game_master: { access_code: 'new-code' } } }];
    return identity(['22622808']);
  });
  gmProfiles = [gm];
  const result = await api.addToGameMasterGroup(service, original, 'fixture-gm', 'old-code');
  assert.equal(result.status, 'ERROR_UNKNOWN');
  assert.equal(writes.length, 0);
});

test('group code regeneration retains the freshly rotated credential pair and revision', async () => {
  setup(new Response('{}', { status: 401 }), tokens, identity(['22622808']));
  const user = {
    ...original,
    patreon: {
      ...tokens,
      access_token: 'expired',
      refresh_token: 'old-refresh',
      tier: 'GAME-MASTER',
      game_master: { access_code: 'old-code' },
    },
  };
  gmProfileResolver = () => [{ ...user, patreon: writes[0].patreon }];
  const result = await api.regenerateGameMasterAccessCode(service, user);
  assert.equal(result.status, 'SUCCESS');
  assert.equal(writes.length, 2);
  assert.equal(writes[1].patreon.access_token, tokens.access_token);
  assert.equal(writes[1].patreon.refresh_token, tokens.refresh_token);
  assert.equal(writeGuards[1].value, writes[0].patreon.revision);
});

test('a freshly downgraded sponsor cannot regenerate a GM group code', async () => {
  setup(identity(['22622808']));
  const user = {
    ...original,
    patreon: { ...tokens, tier: 'GAME-MASTER', game_master: { access_code: 'old-code' } },
  };
  gmProfileResolver = () => [{ ...user, patreon: { ...user.patreon, tier: 'WANDERER' } }];
  assert.equal((await api.regenerateGameMasterAccessCode(service, user)).status, 'ERROR_UNKNOWN');
  assert.equal(writes.length, 0);
});
