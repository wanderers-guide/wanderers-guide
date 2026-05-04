// Verifies the per-token rate limiter in _shared/rate-limit.ts.
// We exercise it through the live function endpoint rather than calling the
// helper directly — the in-memory state lives inside the Edge Runtime worker,
// not the test process.

import { assertEquals, assert } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { FUNCTIONS_URL, seed, stackUnavailable } from './seed.ts';

const skip = stackUnavailable();

Deno.test({
  name: 'rate-limit: every response carries X-RateLimit-* headers',
  ignore: skip,
  async fn() {
    const { apiKey } = await seed();
    // The plain fetch (not callFunction) lets us read the headers.
    const res = await fetch(`${FUNCTIONS_URL}/find-spell`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    await res.body?.cancel();
    assertEquals(res.status, 200);
    assert(res.headers.get('X-RateLimit-Limit'), 'expected X-RateLimit-Limit header');
    const remaining = res.headers.get('X-RateLimit-Remaining');
    assert(remaining !== null && Number(remaining) >= 0, 'expected a numeric Remaining');
    const reset = res.headers.get('X-RateLimit-Reset');
    assert(reset !== null && Number(reset) > 0, 'expected a positive Reset');
  },
});

Deno.test({
  name: 'rate-limit: 401 from unregistered API key still includes rate-limit headers',
  ignore: skip,
  async fn() {
    const fakeKey = '00000000-0000-0000-0000-000000000001';
    const res = await fetch(`${FUNCTIONS_URL}/find-spell`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${fakeKey}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    await res.body?.cancel();
    assertEquals(res.status, 401);
    // Even rejected requests count against the bucket so dictionary attacks
    // burn budget too.
    assert(res.headers.get('X-RateLimit-Limit'));
  },
});
