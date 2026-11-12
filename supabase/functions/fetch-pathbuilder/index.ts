// @ts-ignore
import { serve } from 'std/server';
import { connect, getPublicUser } from '../_shared/helpers.ts';

type FetchPathbuilderBody = {
  mode?: unknown;
  id?: unknown;
};

type FetchPathbuilderResult =
  | { ok: true; status: number; payload: unknown }
  | { ok: false; status: number; error: string; retryAfterSeconds?: number };

const BUILD_ID_RE = /^\d{1,12}$/;
const SHARE_ENDPOINT = 'https://pathbuilder2e.com/app/fetch_emailed.php';
const JSON_ENDPOINT = 'https://pathbuilder2e.com/json.php';

function failure(status: number, error: string, retryAfterSeconds?: number): { status: 'success'; data: FetchPathbuilderResult } {
  return {
    status: 'success',
    data: { ok: false, status, error, ...(retryAfterSeconds ? { retryAfterSeconds } : {}) } satisfies FetchPathbuilderResult,
  };
}

/**
 * Server-side relay for Pathbuilder's two fixed read-only endpoints.
 *
 * A browser request to fetch_emailed.php uses application/json, which requires
 * a cross-origin OPTIONS preflight. Pathbuilder may reject that preflight or its
 * response may omit CORS headers, making a valid share unreadable to the browser.
 * This function fetches from the server so the browser only talks to WG's API.
 *
 * The endpoint is intentionally allow-listed: callers cannot supply a URL or
 * arbitrary path. No upstream retries are performed because Pathbuilder returns
 * HTTP 429 during bursts and retries would prolong the rate limit.
 */
serve((req: Request) =>
  connect<FetchPathbuilderBody>(
    req,
    async (client, body, token) => {
      const user = await getPublicUser(client, token, { rejectAnonymous: true });
      if (!user) {
        return { status: 'fail', data: { message: 'Sign in before fetching Pathbuilder data.' } };
      }

      const mode = body.mode;
      const id = typeof body.id === 'number' ? String(body.id) : typeof body.id === 'string' ? body.id.trim() : '';
      if (mode !== 'share' && mode !== 'derived') {
        return { status: 'fail', data: { message: 'mode must be "share" or "derived".' } };
      }
      if (!BUILD_ID_RE.test(id)) {
        return { status: 'fail', data: { message: 'A numeric Pathbuilder ID is required.' } };
      }

      const url = mode === 'share' ? SHARE_ENDPOINT : `${JSON_ENDPOINT}?id=${encodeURIComponent(id)}`;
      let response: Response;
      try {
        response = await fetch(url, {
          method: mode === 'share' ? 'POST' : 'GET',
          headers: mode === 'share'
            ? { Accept: 'application/json', 'Content-Type': 'application/json' }
            : { Accept: 'application/json' },
          ...(mode === 'share' ? { body: JSON.stringify({ id }) } : {}),
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        return failure(0, 'Could not connect to Pathbuilder from the WG server. No automatic retry was made.');
      }

      const retryHeader = Number(response.headers.get('retry-after'));
      const retryAfterSeconds =
        Number.isFinite(retryHeader) && retryHeader > 0
          ? Math.min(600, Math.floor(retryHeader))
          : response.status === 429
            ? 60
            : undefined;

      if (!response.ok) {
        const message = response.status === 429
          ? `Pathbuilder rate-limited this request (HTTP 429). Wait about ${retryAfterSeconds ?? 60}s before retrying.`
          : `Pathbuilder returned HTTP ${response.status}.`;
        return failure(response.status, message, retryAfterSeconds);
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        return failure(response.status, 'Pathbuilder returned a non-JSON response.');
      }

      return {
        status: 'success',
        data: { ok: true, status: response.status, payload } satisfies FetchPathbuilderResult,
      };
    },
    { maxBodyBytes: 1024 }
  )
);
