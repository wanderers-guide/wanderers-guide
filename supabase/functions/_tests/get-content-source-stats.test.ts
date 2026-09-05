import { assert, assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { ANON_KEY, callFunction, stackUnavailable } from './seed.ts';
const skip = stackUnavailable();

Deno.test({
  name: 'content source stats: JSONB subscriber count succeeds and invalid IDs are rejected',
  ignore: skip,
  async fn() {
    const result = await callFunction('get-content-source-stats', { content_source_id: 1 }, { token: ANON_KEY });
    assertEquals(result.status, 200);
    assertEquals(result.body?.status, 'success');
    assert(Number.isInteger(result.body?.data?.count));
    assert(result.body.data.count >= 0);
    for (const content_source_id of [-1, 1.1, '1', null]) {
      const invalid = await callFunction('get-content-source-stats', { content_source_id }, { token: ANON_KEY });
      assertEquals(invalid.status, 400);
      assertEquals(invalid.body?.status, 'fail');
    }
  },
});

Deno.test({
  name: 'connect: invalid signed JWTs return 401 instead of an opaque HTTP 400',
  ignore: skip,
  async fn() {
    const parts = ANON_KEY.split('.');
    parts[2] = 'invalid-signature';
    const result = await callFunction('get-user', {}, { token: parts.join('.') });
    assertEquals(result.status, 401);
    assertEquals(result.body?.status, 'fail');
    assertEquals(result.body?.data?.code, 'AUTH_REQUIRED');
  },
});
