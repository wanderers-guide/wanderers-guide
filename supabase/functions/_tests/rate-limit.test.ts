// Verifies the per-token rate limiter in _shared/rate-limit.ts.
// We exercise it through the live function endpoint rather than calling the
// helper directly — the in-memory state lives inside the Edge Runtime worker,
// not the test process.

import { assertEquals, assert } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { FUNCTIONS_URL, seed, stackUnavailable } from './seed.ts';

const skip = stackUnavailable();

/**
 * Raw fetch with the same cold-worker retry as callFunction in seed.ts. These
 * tests can't use callFunction (it consumes the body and discards the Response,
 * and the headers are the whole point here), so they need their own guard: a
 * booting edge worker can 5xx or cut the connection before the limiter runs.
 * Retries boot 5xxs and thrown network errors; returns the first real reply.
 */
async function rawFetchWithRetry(init: RequestInit): Promise<Response> {
  const MAX_TRIES = 3;
  let res: Response | null = null;
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      res = await fetch(`${FUNCTIONS_URL}/find-spell`, init);
      if (res.status < 500 || attempt === MAX_TRIES) return res;
      await res.body?.cancel();
    } catch (err) {
      if (attempt === MAX_TRIES) throw err;
    }
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
  return res!;
}

Deno.test({
  name: 'rate-limit: every response carries X-RateLimit-* headers',
  ignore: skip,
  async fn() {
    const { apiKey } = await seed();
    // The plain fetch (not callFunction) lets us read the headers.
    const res = await rawFetchWithRetry({
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
    const res = await rawFetchWithRetry({
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
