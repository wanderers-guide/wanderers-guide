import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError, type Session } from '@supabase/supabase-js';
import { JSendResponse, RequestType } from '@schemas/requests';
import { logError, throwError } from '@utils/error-handling';
import { hideNotification, showNotification } from '@mantine/notifications';
import { supabase } from '../supabase-client';

const MAX_TRANSIENT_RETRIES = 1;
// A lost response can follow a committed write. Only explicitly read-only handlers
// may be retried after an ambiguous network or gateway failure.
const RETRYABLE_READS = new Set<RequestType>([
  'search-data',
  'gm-users-in-group',
  'get-user',
  'get-content-source-stats',
  'get-content-versions',
  'find-content-source',
  'find-trait',
  'find-ability-block',
  'find-ancestry',
  'find-background',
  'find-class',
  'find-archetype',
  'find-versatile-heritage',
  'find-class-archetype',
  'find-item',
  'find-language',
  'find-creature',
  'find-spell',
  'find-character',
  'find-content-update',
  'find-encounter',
  'find-campaign',
]);
const DEFAULT_TIMEOUT_MS = 30000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let notifiedSessionExpired = false;
let refreshingSession: Promise<Session | null> | null = null;

/** Share the persistent notice between auth events and failed requests without dropping drafts. */
export function notifySessionExpired(): void {
  if (notifiedSessionExpired) return;
  notifiedSessionExpired = true;
  localStorage.removeItem('user-data');
  showNotification({
    id: 'session-expired',
    title: 'Session expired',
    message: 'Please sign in again to save your changes.',
    color: 'yellow',
    autoClose: false,
  });
}

/** A recovered or newly authenticated session can save again. */
export function resetSessionExpiredNotice(): void {
  notifiedSessionExpired = false;
  hideNotification('session-expired');
}

/** Read authentication without allowing a storage/refresh failure to discard the pending request. */
async function getSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    return error ? null : data.session;
  } catch (error) {
    console.error('Could not read the current session:', error);
    return null;
  }
}

/** Only these responses prove JWT validation failed before the handler could write. */
function isRejectedJwt(status: number, body: unknown): boolean {
  if (status !== 400 && status !== 401) return false;
  if (!body || typeof body !== 'object') return false;
  const error = body as Record<string, unknown>;
  if (error.code === 'PGRST301' || (status === 401 && error.code === 'AUTH_REQUIRED')) return true;
  if (
    status === 401 &&
    typeof error.message === 'string' &&
    /^(invalid jwt|jwt (?:expired|is expired))\.?$/i.test(error.message)
  ) {
    return true;
  }
  return isRejectedJwt(status, error.data) || isRejectedJwt(status, error.error);
}

/** Refresh once for concurrent failures, and never replay a request as a different account. */
async function recoverSession(failedSession: Session | null): Promise<Session | null> {
  const current = await getSession();
  if (!failedSession || !current || current.user.id !== failedSession.user.id) return null;
  if (current.access_token !== failedSession.access_token) return current;
  if (!refreshingSession) {
    refreshingSession = (async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        return error ? null : data.session;
      } catch (error) {
        console.error('Could not refresh the session:', error);
        return null;
      } finally {
        refreshingSession = null;
      }
    })();
  }
  const refreshed = await refreshingSession;
  const latest = await getSession();
  return refreshed && latest?.user.id === failedSession.user.id && latest.access_token === refreshed.access_token
    ? refreshed
    : null;
}

/** Invoke a JSend endpoint with bounded retries and one recovery for proven JWT rejection. */
export async function makeRequest<T = Record<string, any>>(
  type: RequestType,
  body: Record<string, any>,
  notifyFailure = true,
  options?: { expectedActorId: string }
): Promise<T | null> {
  let lastError: any = null;
  let lastErrorBody: unknown = null;
  let transientRetries = 0;
  let retriedAuthentication = false;
  let requestSession = await getSession();
  if (options && requestSession?.user.id !== options.expectedActorId) return null;

  while (true) {
    const { data, error } = await invokeWithTimeout(type, body, DEFAULT_TIMEOUT_MS, requestSession?.access_token);
    if (!error) {
      if (!data) return null;
      const response = data as JSendResponse;
      if (response.status === 'error') {
        if (notifyFailure) throwError(response.message);
        return null;
      }
      if (response.status !== 'success') {
        if (notifyFailure) logError('Failed to make request');
        return null;
      }
      return response.data as T;
    }

    lastError = error;
    lastErrorBody = null;
    if (error instanceof FunctionsHttpError) {
      try {
        lastErrorBody = await error.context.clone().json();
      } catch {
        // Some gateway failures have no JSON body. They are not authentication failures.
      }
      if (isRejectedJwt(error.context.status, lastErrorBody)) {
        if (!retriedAuthentication) {
          retriedAuthentication = true;
          const recovered = await recoverSession(requestSession);
          if (recovered) {
            requestSession = recovered;
            resetSessionExpiredNotice();
            continue;
          }
        }
        const current = await getSession();
        // A request from a previous account must not sign out or warn the new account.
        if (
          (!current || current.user.id === requestSession?.user.id) &&
          (requestSession || localStorage.getItem('user-data'))
        )
          notifySessionExpired();
        break;
      }
    }

    const isTransientNetwork = error instanceof FunctionsFetchError || error instanceof FunctionsRelayError;
    const isGatewayError = error instanceof FunctionsHttpError && [502, 503, 504].includes(error.context?.status);
    if (
      RETRYABLE_READS.has(type) &&
      transientRetries < MAX_TRANSIENT_RETRIES &&
      (isTransientNetwork || isGatewayError)
    ) {
      transientRetries++;
      await sleep(250 + Math.random() * 250);
      // Keep the original identity on retries. An account switch cannot replay its write.
      const current = await getSession();
      if (current?.user.id !== requestSession?.user.id) break;
      requestSession = current;
      continue;
    }
    break;
  }

  if (lastError instanceof FunctionsHttpError) {
    console.error(`Request to '${type}' failed (HTTP ${lastError.context?.status})`, lastErrorBody);
  } else if (lastError) {
    console.error(`Request to '${type}' failed:`, lastError?.message ?? lastError);
  }
  return null;
}

/** Suppress redundant save-error notices while authentication recovery requires user action. */
export function hasSessionExpiredNotice(): boolean {
  return notifiedSessionExpired;
}

/** Stop waiting on a slow request without duplicating its possibly committed write. */
async function invokeWithTimeout(
  type: RequestType,
  body: Record<string, any>,
  timeout = DEFAULT_TIMEOUT_MS,
  accessToken?: string
): Promise<{ data: any; error: any }> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ data: null, error: new Error('Timeout') });
    }, timeout);

    supabase.functions
      .invoke(type, { body, headers: { Authorization: `Bearer ${accessToken ?? import.meta.env.VITE_SUPABASE_KEY}` } })
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
