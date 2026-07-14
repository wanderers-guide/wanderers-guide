import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';
import { JSendResponse, RequestType } from '@schemas/requests';
import { logError, throwError } from '@utils/error-handling';
import { showNotification } from '@mantine/notifications';
import { supabase } from '../supabase-client';

// A single logical request makes at most MAX_ATTEMPTS network calls, and we retry
// ONLY genuine transient network failures — never timeouts or HTTP errors. This is
// deliberate: the previous implementation re-fired every timed-out request 3x plus an
// un-timed fallback, AND makeRequest recursed again on fetch errors, fanning one
// logical call out to as many as ~16 concurrent in-flight requests. Under peak load
// (when responses are already slow) that turned a transient slowdown into a
// self-sustaining retry storm that saturated the edge functions and DB pool — the
// builder/sheet (which fire ~12 heavy content requests each) never recovered.
const MAX_ATTEMPTS = 2;
// Heavy content fetches legitimately take several seconds under load. A short timeout
// just produces false failures (and previously, a retry storm). Wait generously; the
// important property is that we never DUPLICATE a slow-but-still-running request.
const DEFAULT_TIMEOUT_MS = 30000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Only surface the "session expired" notification once per page load; a dead
// session makes MANY concurrent requests fail and each would otherwise toast.
let notifiedSessionExpired = false;

/**
 * After a request fails with an auth-shaped error, check whether the underlying
 * session is actually gone (e.g. expired from inactivity while the tab was open).
 * The auth listener in App.tsx handles the common case; this is the safety net for
 * requests that raced the sign-out event. Tells the user instead of failing silently.
 */
async function checkForExpiredSession() {
  if (notifiedSessionExpired) return;
  const hadUser = !!localStorage.getItem('user-data');
  if (!hadUser) return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return;
  notifiedSessionExpired = true;
  localStorage.removeItem('user-data');
  showNotification({
    id: 'session-expired',
    title: 'Session expired',
    message: 'You have been signed out due to inactivity. Please sign in again to save your changes.',
    color: 'yellow',
    autoClose: false,
  });
}

export async function makeRequest<T = Record<string, any>>(
  type: RequestType,
  body: Record<string, any>,
  notifyFailure = true
): Promise<T | null> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data, error } = await invokeWithTimeout(type, body, DEFAULT_TIMEOUT_MS);

    if (!error) {
      if (!data) {
        return null;
      }
      const response = data as JSendResponse;
      if (response.status === 'error') {
        if (notifyFailure) {
          throwError(response.message);
        }
        return null;
      } else if (response.status === 'fail') {
        if (notifyFailure) {
          logError('Failed to make request');
        }
        return null;
      }
      return response.data as T;
    }

    lastError = error;

    // Retry genuine transients only:
    //  - network-level failures (fetch/relay errors), and
    //  - gateway errors (502/503/504), which in practice are edge-function cold
    //    starts or worker restarts — the request FAILED COMPLETELY and a single
    //    spaced retry is safe and usually succeeds.
    // Timeouts and other HTTP errors (4xx incl. 429 rate limits, and 500s, which
    // mean the function itself errored) are NOT retried — retrying those amplifies
    // load exactly when the backend is already struggling.
    const isTransientNetwork =
      error instanceof FunctionsFetchError || error instanceof FunctionsRelayError;
    const isGatewayError =
      error instanceof FunctionsHttpError && [502, 503, 504].includes(error.context?.status);
    if (attempt < MAX_ATTEMPTS && (isTransientNetwork || isGatewayError)) {
      // Backoff with jitter so many clients don't retry in lockstep.
      await sleep(250 * attempt + Math.random() * 250);
      continue;
    }
    break;
  }

  if (lastError instanceof FunctionsHttpError) {
    // 401/403 with a missing session = the user's session silently expired.
    if (lastError.context?.status === 401 || lastError.context?.status === 403) {
      await checkForExpiredSession();
    }
    try {
      const errorMessage = await lastError.context.json();
      console.error(`Request to '${type}' failed (HTTP ${lastError.context?.status})`, errorMessage);
    } catch {
      console.error(`Request to '${type}' failed (HTTP ${lastError.context?.status})`);
    }
  } else if (lastError instanceof FunctionsRelayError) {
    console.error(`Request to '${type}' relay error:`, lastError.message);
  } else if (lastError instanceof FunctionsFetchError) {
    console.error(`Request to '${type}' fetch error:`, lastError.message);
  } else if (lastError) {
    console.error(`Request to '${type}' error:`, lastError?.message ?? lastError);
  }

  return null;
}

/**
 * Whether the one-per-page-load "session expired" notification has been shown.
 * Callers can use this to skip their own generic failure toasts when the real
 * cause (a dead session) has already been communicated.
 */
export function hasSessionExpiredNotice() {
  return notifiedSessionExpired;
}

/**
 * Invoke an edge function, giving up (with a 'Timeout' error) if it takes too long.
 *
 * IMPORTANT: supabase-js's functions.invoke() cannot be aborted, so on timeout we
 * stop waiting and surface an error — we deliberately do NOT fire a replacement
 * request. Duplicating a slow-but-still-running request is what caused the retry
 * storm. Always resolves to a normalized { data, error } shape (never rejects).
 */
async function invokeWithTimeout(
  type: RequestType,
  body: Record<string, any>,
  timeout = DEFAULT_TIMEOUT_MS
): Promise<{ data: any; error: any }> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ data: null, error: new Error('Timeout') });
    }, timeout);

    supabase.functions
      .invoke(type, { body })
      .then((res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ data: null, error: err });
      });
  });
}
