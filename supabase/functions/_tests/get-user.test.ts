// Guards the public_user secret-exposure fix (migration 20260717000000 +
// service-role reads in get-user / getPublicUser). Three properties must all hold:
//   1. A user reading THEIR OWN profile (get-user, no id) still receives their real
//      api key — the account page depends on this.
//   2. Looking up ANOTHER user by id returns public fields but strips every secret.
//   3. The anon key (which ships in the frontend bundle) cannot read the api/patreon
//      columns over PostgREST directly, but can still read public columns.
//
// This is the regression guard we were missing on the content-update fix: it fails
// loudly if a future change either re-exposes secrets or breaks the account page.

import { assert, assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { ANON_KEY, callFunction, seed, stackUnavailable } from './seed.ts';

const SUPABASE_URL =
  Deno.env.get('PUBLIC_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321';

const skip = stackUnavailable();

Deno.test({
  name: 'get-user: self path (no id) returns the caller’s own api key, unstripped',
  ignore: skip,
  async fn() {
    const { apiKey, jwt } = await seed();

    const res = await callFunction('get-user', {}, { token: jwt });
    assertEquals(res.status, 200);
    assertEquals(res.body?.status, 'success');

    const clients = res.body?.data?.api?.clients ?? [];
    const found = clients.find((c: { api_key: string }) => c.api_key === apiKey);
    assert(found, 'self path must return the real api_key (account page reads it here), not <SECRET>');
  },
});

Deno.test({
  name: 'get-user: lookup by id strips every api/patreon secret',
  ignore: skip,
  async fn() {
    const { userId, jwt } = await seed();

    // The `id` branch is the "view another user" path (here we look up our own id, which
    // still exercises the stripping branch). Nothing secret may come back.
    const res = await callFunction('get-user', { id: userId }, { token: jwt });
    assertEquals(res.status, 200);
    assertEquals(res.body?.status, 'success');

    const clients = res.body?.data?.api?.clients ?? [];
    for (const c of clients) {
      assertEquals(c.api_key, '<SECRET>', 'by-id lookup must blank api_key');
    }
    const patreon = res.body?.data?.patreon;
    if (patreon) {
      assertEquals(patreon.access_token, '<SECRET>', 'by-id lookup must blank patreon access_token');
      assertEquals(patreon.refresh_token, '<SECRET>', 'by-id lookup must blank patreon refresh_token');
    }
  },
});

Deno.test({
  name: 'get-user: anon REST cannot read public_user secret columns, but can read public ones',
  ignore: skip,
  async fn() {
    await seed(); // ensure a populated api row exists

    const restHeaders = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };

    // Secret columns must be refused (permission denied for column → 4xx).
    for (const col of ['api', 'patreon']) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/public_user?select=${col}&limit=1`, {
        headers: restHeaders,
      });
      const body = await res.text();
      assert(
        res.status >= 400,
        `anon select of "${col}" must be refused, got HTTP ${res.status}: ${body}`
      );
    }

    // Public columns must still be readable (the site relies on this).
    const ok = await fetch(`${SUPABASE_URL}/rest/v1/public_user?select=display_name&limit=1`, {
      headers: restHeaders,
    });
    const okBody = await ok.text();
    assertEquals(ok.status, 200, `anon select of display_name must still work: ${okBody}`);
  },
});
