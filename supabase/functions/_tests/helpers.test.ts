// Auth-routing tests for connect() in _shared/helpers.ts.
// Hits live functions through the local Supabase stack, since connect() is
// only exercised when an actual Request flows through it.

import { assertEquals, assert } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { callFunction, seed, stackUnavailable } from './seed.ts';

const skip = stackUnavailable();

Deno.test({
  name: 'connect: rejects empty Authorization on a user-bound endpoint',
  ignore: skip,
  async fn() {
    // get-user requires a real auth context. With no Authorization header
    // Supabase falls back to anon, which has no public_user row.
    const result = await callFunction('get-user', {});
    // Either a 200 with status:fail/error OR a 4xx — both indicate the
    // endpoint refused to act. We just want to confirm it didn't return data.
    if (result.status === 200) {
      assert(
        result.body?.status !== 'success' || result.body?.data == null,
        'expected unauthenticated get-user to not return user data'
      );
    } else {
      assert(result.status >= 400 && result.status < 500);
    }
  },
});

Deno.test({
  name: 'connect: accepts a JWT and routes to the JWT branch',
  ignore: skip,
  async fn() {
    const { jwt } = await seed();
    // find-spell with no body should succeed (it returns all official spells).
    const result = await callFunction('find-spell', {}, { token: jwt });
    assertEquals(result.status, 200);
    assertEquals(result.body?.status, 'success');
    assert(Array.isArray(result.body?.data), 'expected an array of spells');
  },
});

Deno.test({
  name: 'connect: accepts a 36-char API key and routes through handleApiRouting',
  ignore: skip,
  async fn() {
    const { apiKey } = await seed();
    assertEquals(apiKey.length, 36, 'API key UUID should be 36 chars');
    const result = await callFunction('find-spell', {}, { token: apiKey });
    assertEquals(result.status, 200);
    assertEquals(result.body?.status, 'success');
  },
});

Deno.test({
  name: 'connect: rejects an unregistered API key with 401',
  ignore: skip,
  async fn() {
    const fakeKey = '00000000-0000-0000-0000-000000000000';
    assertEquals(fakeKey.length, 36);
    const result = await callFunction('find-spell', {}, { token: fakeKey });
    assertEquals(result.status, 401);
    assertEquals(result.body?.status, 'fail');
  },
});

Deno.test({
  name: 'connect: bypassAuth path accepts the shared-secret token in Authorization',
  ignore: skip || !Deno.env.get('CONTENT_UPDATE_KEY'),
  async fn() {
    // Hit update-content-update with a wrong secret; expect JSend fail (not a
    // crash from token-as-JWT validation). This proves bypassAuth wired up.
    const result = await callFunction(
      'update-content-update',
      {
        discord_msg_id: 'test-msg-id-does-not-exist',
        discord_user_id: 'test-user',
        discord_user_name: 'Test',
        state: 'UPVOTE',
      },
      { token: 'definitely-wrong-secret-that-is-not-a-jwt' }
    );
    assertEquals(result.status, 200);
    assertEquals(result.body?.status, 'fail');
    assert(/auth token/i.test(result.body?.data?.message ?? ''));
  },
});
