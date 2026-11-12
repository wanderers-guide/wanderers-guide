/**
 * Network layer for Pathbuilder share links.
 *
 * The share endpoint is the source of truth because it carries the raw editor
 * state and the Custom Files attached to the character.
 *
 * json.php is only queried when a caller supplies a separate, known export ID.
 * A share ID is not assumed to be a JSON ID: export IDs may be reused, and a
 * mismatched response would corrupt a strict 1:1 import.
 *
 * Browser reads are relayed through the authenticated WG Edge Function rather
 * than called cross-origin. Pathbuilder can rate-limit OPTIONS preflights and
 * omit CORS headers, which makes its response unreadable to the browser.
 */

import {
  PathbuilderDerivedBuild,
  PathbuilderDerivedResponseSchema,
  PathbuilderShareBuild,
  PathbuilderShareBuildSchema,
  PathbuilderShareResponseSchema,
} from '@schemas/pathbuilder';

export const PATHBUILDER_SHARE_ENDPOINT = 'https://pathbuilder2e.com/app/fetch_emailed.php';
export const PATHBUILDER_DERIVED_ENDPOINT = 'https://pathbuilder2e.com/json.php';

export type PathbuilderShareResult =
  | { ok: true; build: PathbuilderShareBuild; formatVersion?: string }
  | { ok: false; error: string };

type ProxyPayloadResult =
  | { ok: true; status: number; payload: unknown }
  | { ok: false; status: number; error: string; retryAfterSeconds?: number };

type PayloadResult = { ok: true; payload: unknown } | { ok: false; error: string; status?: number };

const SUCCESS_CACHE_MS = 5 * 60_000;
const FAILURE_CACHE_MS = 10_000;
const RATE_LIMIT_CACHE_MS = 60_000;
const responseCache = new Map<string, { expiresAt: number; value: unknown }>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const derivedFetchErrors = new Map<string, { expiresAt: number; error: string }>();

export function getPathbuilderDerivedFetchError(buildId: string): string | null {
  const stored = derivedFetchErrors.get(buildId);
  if (!stored) return null;
  if (stored.expiresAt <= Date.now()) {
    derivedFetchErrors.delete(buildId);
    return null;
  }
  return stored.error;
}

function recordDerivedFetchError(buildId: string, error: string) {
  derivedFetchErrors.set(buildId, {
    error,
    expiresAt: Date.now() + RATE_LIMIT_CACHE_MS,
  });
}

async function withRequestCache<T>(
  key: string,
  load: () => Promise<T>,
  cacheDuration: (value: T) => number
): Promise<T> {
  const now = Date.now();
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value as T;
  if (cached) responseCache.delete(key);

  const pending = inFlightRequests.get(key);
  if (pending) return pending as Promise<T>;

  const request = load()
    .then((value) => {
      const duration = cacheDuration(value);
      if (duration > 0) {
        responseCache.set(key, { expiresAt: Date.now() + duration, value });
      }
      return value;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, request);
  return request;
}

function cacheDurationForShare(result: PathbuilderShareResult): number {
  if (result.ok) return SUCCESS_CACHE_MS;
  return /HTTP 429|rate-limit/i.test(result.error) ? RATE_LIMIT_CACHE_MS : FAILURE_CACHE_MS;
}

/**
 * Pull a numeric Pathbuilder id out of a pasted id or share URL.
 *
 * Accepted examples include a bare numeric id, the Pathbuilder emailedBuildID
 * query parameter, and URLs whose last path segment is numeric.
 */
export function extractBuildId(input: string | number | undefined | null): string | null {
  if (typeof input === 'number') {
    return Number.isFinite(input) && Number.isInteger(input) && input >= 0 ? String(input) : null;
  }
  if (typeof input !== 'string') return null;

  const text = input.trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return text;

  try {
    const url = new URL(text);
    for (const param of ['emailedBuildID', 'emailedBuildId', 'buildID', 'buildId', 'build', 'jsonID', 'jsonId', 'id']) {
      const value = url.searchParams.get(param);
      if (value && /^\d+$/.test(value)) return value;
    }
    const segments = url.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && /^\d+$/.test(last)) return last;
    return null;
  } catch {
    return null;
  }
}

async function requestPayload(
  mode: 'share' | 'derived',
  id: string,
  options: { fetchImpl?: typeof fetch; signal?: AbortSignal }
): Promise<PayloadResult> {
  if (!options.fetchImpl) {
    try {
      // Load the authenticated relay only for production calls. Keeping this
      // import lazy lets deterministic payload tests inject fetchImpl without
      // evaluating the browser-only Supabase client (import.meta.env) in Node.
      const { makeRequest } = await import('@requests/request-manager');
      const response = await makeRequest<ProxyPayloadResult>(
        'fetch-pathbuilder',
        { mode, id },
        false
      );
      if (!response) {
        return {
          ok: false,
          error: 'The WG Pathbuilder relay did not respond. Check that the fetch-pathbuilder function is installed and retry after the rate limit clears.',
        };
      }
      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: response.error || `Pathbuilder returned HTTP ${response.status}.`,
        };
      }
      return { ok: true, payload: response.payload };
    } catch (error) {
      console.warn(`WG Pathbuilder relay request failed for ${mode} id ${id}:`, error);
      return { ok: false, error: 'Could not reach the WG Pathbuilder relay.' };
    }
  }

  const doFetch = options.fetchImpl;
  const signal = options.signal ?? AbortSignal.timeout(15_000);
  const url = mode === 'share'
    ? PATHBUILDER_SHARE_ENDPOINT
    : `${PATHBUILDER_DERIVED_ENDPOINT}?id=${encodeURIComponent(id)}`;

  let response: Response;
  try {
    response = await doFetch(url, {
      ...(mode === 'share'
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }
        : {}),
      signal,
    });
  } catch (error) {
    console.warn(`Pathbuilder ${mode} request failed for id ${id}:`, error);
    return { ok: false, error: 'Could not reach Pathbuilder' };
  }

  if (!response.ok) {
    const retryAfter = response.headers.get('retry-after');
    const suffix = response.status === 429
      ? ` Wait ${retryAfter && /^\d+$/.test(retryAfter) ? retryAfter : 'about 60'} seconds before retrying.`
      : '';
    return {
      ok: false,
      status: response.status,
      error: `Pathbuilder returned HTTP ${response.status} for ${mode} id ${id}.${suffix}`,
    };
  }

  try {
    return { ok: true, payload: await response.json() };
  } catch (error) {
    console.warn(`Pathbuilder ${mode} response was not valid JSON for id ${id}:`, error);
    return { ok: false, error: 'Pathbuilder returned a non-JSON response' };
  }
}

async function fetchPathbuilderShareUncached(
  buildId: string,
  options: { fetchImpl?: typeof fetch; signal?: AbortSignal }
): Promise<PathbuilderShareResult> {
  const payload = await requestPayload('share', buildId, options);
  if (!payload.ok) return { ok: false, error: payload.error };

  const envelope = PathbuilderShareResponseSchema.safeParse(payload.payload);
  if (!envelope.success) {
    const details = envelope.error.issues
      .map((issue) => `${issue.path.join('.')} ${issue.message}`)
      .join('; ');
    console.warn(`Pathbuilder envelope did not match the schema for build ${buildId}:`, envelope.error.issues);
    return { ok: false, error: `Pathbuilder responded in an unexpected format${details ? ` (${details})` : ''}` };
  }

  if (!envelope.data.success || typeof envelope.data.build !== 'string') {
    return {
      ok: false,
      error: envelope.data.error || `Pathbuilder has no shared build with id ${buildId}`,
    };
  }

  let innerJson: unknown;
  try {
    innerJson = JSON.parse(envelope.data.build);
  } catch (error) {
    console.warn(`Pathbuilder build string was not valid JSON for build ${buildId}:`, error);
    return { ok: false, error: 'Pathbuilder build payload was not valid JSON' };
  }

  const parsed = PathbuilderShareBuildSchema.safeParse(innerJson);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')} ${issue.message}`)
      .join('; ');
    console.warn(`Pathbuilder build did not match the schema for build ${buildId}:`, parsed.error.issues);
    return {
      ok: false,
      error: `Pathbuilder build payload did not match the expected shape${details ? ` (${details})` : ''}`,
    };
  }

  return { ok: true, build: parsed.data, formatVersion: envelope.data.version ?? undefined };
}

/**
 * Fetch and validate the share payload. Successful server-relayed responses are
 * cached for five minutes so every missing-choice selection does not hit Pathbuilder
 * again. Concurrent callers for the same ID share a single request as well.
 */
export async function fetchPathbuilderShare(
  buildId: string,
  options: { fetchImpl?: typeof fetch; signal?: AbortSignal } = {}
): Promise<PathbuilderShareResult> {
  const load = () => fetchPathbuilderShareUncached(buildId, options);
  return options.fetchImpl
    ? load()
    : withRequestCache(`share:${buildId}`, load, cacheDurationForShare);
}

async function fetchPathbuilderDerivedUncached(
  buildId: string,
  options: { fetchImpl?: typeof fetch; signal?: AbortSignal }
): Promise<PathbuilderDerivedBuild | null> {
  const payload = await requestPayload('derived', buildId, options);
  if (!payload.ok) {
    recordDerivedFetchError(buildId, payload.error);
    console.info(`Pathbuilder json.php unavailable for build ${buildId}: ${payload.error}`);
    return null;
  }

  const parsed = PathbuilderDerivedResponseSchema.safeParse(payload.payload);
  if (!parsed.success || !parsed.data.success || !parsed.data.build) {
    const error = !parsed.success
      ? 'Pathbuilder returned an unexpected JSON export format.'
      : 'Pathbuilder did not return a usable calculated build for this export ID.';
    recordDerivedFetchError(buildId, error);
    console.info(`Pathbuilder json.php returned no usable derived build for id ${buildId}`);
    return null;
  }
  derivedFetchErrors.delete(buildId);
  return parsed.data.build;
}

/**
 * Best-effort fetch of a known JSON export. The caller must supply the ID from
 * the export flow; never pass a share ID merely because it exists. Server-relayed
 * responses are cached between preflight selections and the final import.
 */
export async function fetchPathbuilderDerived(
  buildId: string,
  options: { fetchImpl?: typeof fetch; signal?: AbortSignal } = {}
): Promise<PathbuilderDerivedBuild | null> {
  const load = () => fetchPathbuilderDerivedUncached(buildId, options);
  return options.fetchImpl
    ? load()
    : withRequestCache(`derived:${buildId}`, load, (value) =>
        value ? SUCCESS_CACHE_MS : RATE_LIMIT_CACHE_MS
      );
}
