// Per-token sliding-window rate limiter for the public API.
//
// State lives in-process. Edge Function workers stay warm for the bulk of a
// burst, so this catches obvious abuse from a single client; cold-starts will
// reset the window. We can promote to a shared store (Postgres or Redis) later
// if abuse patterns warrant it. For v1 this is enough to refuse a runaway
// loop without standing up new infra.

const WINDOW_MS = 60_000;

const HISTORY = new Map<string, number[]>();

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
 * Pick the bucket key + limit for a request. The bucket is namespaced so a key
 * leaked across multiple flows can't quietly compound limits across them.
 */
export function bucketFor(opts: {
  token: string;
  is36: boolean;
  bypassAuth?: boolean;
  ip?: string;
}): { bucket: string; limit: number } {
  if (opts.bypassAuth) return { bucket: `service:${opts.token}`, limit: LIMITS.bypassAuth };
  if (opts.is36) return { bucket: `apiKey:${opts.token}`, limit: LIMITS.apiKey };
  if (opts.token) return { bucket: `jwt:${opts.token}`, limit: LIMITS.jwt };
  return { bucket: `anon:${opts.ip ?? 'unknown'}`, limit: LIMITS.anon };
}

/** Test-only: clear the in-memory state. */
export function _resetRateLimits() {
  HISTORY.clear();
}
