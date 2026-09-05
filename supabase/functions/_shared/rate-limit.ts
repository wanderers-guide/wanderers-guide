// Bounded per-isolate IP admission protects parsing and auth lookups. It is a
// burst guard, not a distributed entitlement or spend quota. Costly routes also
// consume the shared Postgres budget after authenticating the caller.

const WINDOW_MS = 60_000;

const HISTORY = new Map<string, number[]>();
export const MAX_RATE_LIMIT_BUCKETS = 2048;
let nextSweep = 0;

// Tunable per-bucket limits. Numbers chosen to be generous for legitimate
// integrations (cache aggressively + batch where you can) while still cutting
// off runaway scripts.
export const LIMITS = {
  apiKey: 120, // /functions/v1/* with a registered API key
  jwt: 240, // signed-in user from the WG web app — chattier UI usage
  bypassAuth: 600, // service-to-service webhook secrets
  anon: 30, // no Authorization header, falls back to IP
};

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  bucket: string;
}

/**
 * Check + record one request against the bucket. Idempotent within a window:
 * call this once per request at the very top of the handler. Returns the
 * window state so the caller can both branch on `allowed` and surface the
 * rate-limit headers in the response.
 */
export function checkRateLimit(bucket: string, limit: number): RateLimitResult {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  if (now >= nextSweep) {
    for (const [key, timestamps] of HISTORY) {
      if (timestamps[timestamps.length - 1] <= cutoff) HISTORY.delete(key);
    }
    nextSweep = now + 1000;
  }
  // Refuse new keys under pressure; evicting active keys would reopen their budgets.
  if (!HISTORY.has(bucket) && HISTORY.size >= MAX_RATE_LIMIT_BUCKETS) {
    return { allowed: false, limit, remaining: 0, resetSeconds: 60, bucket };
  }

  let history = HISTORY.get(bucket);
  if (!history) {
    history = [];
  } else if (history.length > 0 && history[0] <= cutoff) {
    // Drop expired entries. Linear scan from the front is fine — entries are
    // appended in time order so the prefix that's expired is contiguous.
    let drop = 0;
    while (drop < history.length && history[drop] <= cutoff) drop++;
    history = drop === history.length ? [] : history.slice(drop);
  }

  if (history.length >= limit) {
    const oldest = history[0];
    HISTORY.set(bucket, history);
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetSeconds: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
      bucket,
    };
  }

  history.push(now);
  HISTORY.set(bucket, history);

  return {
    allowed: true,
    limit,
    remaining: limit - history.length,
    resetSeconds: Math.ceil(WINDOW_MS / 1000),
    bucket,
  };
}

/** Headers to echo back to the client for visibility into the budget. */
export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(r.limit),
    'X-RateLimit-Remaining': String(r.remaining),
    'X-RateLimit-Reset': String(r.resetSeconds),
  };
  if (!r.allowed) headers['Retry-After'] = String(r.resetSeconds);
  return headers;
}

/**
 * Pick the pre-auth admission bucket. Changing an unverified token never gives
 * an IP a fresh budget, and the public anon JWT no longer groups all visitors.
 */
export function bucketFor(opts: { token: string; is36: boolean; bypassAuth?: boolean; ip?: string }): {
  bucket: string;
  limit: number;
} {
  const ip = opts.ip?.slice(0, 128) || 'unknown';
  if (opts.bypassAuth) return { bucket: `service:${ip}`, limit: LIMITS.bypassAuth };
  if (opts.is36) return { bucket: `apiKey:${ip}`, limit: LIMITS.apiKey };
  if (opts.token) return { bucket: `jwt:${ip}`, limit: LIMITS.jwt };
  return { bucket: `anon:${ip}`, limit: LIMITS.anon };
}

/** Test-only: clear the in-memory state. */
export function _resetRateLimits() {
  HISTORY.clear();
  nextSweep = 0;
}
