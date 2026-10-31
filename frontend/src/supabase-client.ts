import { createClient } from '@supabase/supabase-js';
import { FunctionsClient } from '@supabase/functions-js';
import { isCatalogRead, RETRYABLE_READS } from '@requests/request-policy';

const READ_RESPONSE_START_TIMEOUT_MS = 8000;

/** Bound unanswered reads while preserving the caller's longer response-body deadline. */
async function fetchFunction(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const type = new URL(url).pathname.split('/').pop() ?? '';
  if (!RETRYABLE_READS.has(type)) return fetch(input, init);
  let body: unknown;
  try {
    body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
  } catch {
    // An opaque body cannot prove that a catalog endpoint is a small record read.
  }
  if (isCatalogRead(type, body)) return fetch(input, init);

  const controller = new AbortController();
  const source = init?.signal ?? (input instanceof Request ? input.signal : undefined);
  const abort = (): void => controller.abort();
  if (source?.aborted) abort();
  else source?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, READ_RESPONSE_START_TIMEOUT_MS);
  try {
    // Keep forwarding caller cancellation after headers: the SDK still has to read the body.
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    source?.removeEventListener('abort', abort);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The single shared Supabase client for the entire app.
 *
 * There must be exactly ONE client: each `createClient()` runs its own token
 * auto-refresh loop and keeps its own in-memory session. When the app had two
 * (main.tsx and request-manager.ts), the second client could hold a stale
 * access token after the first refreshed (or vice versa), and auth events from
 * one never reached listeners on the other — so a session that died from
 * inactivity was noticed by one client while the rest of the app kept acting
 * logged in with dead credentials.
 */
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY);

/** Stateless transport uses the request's captured JWT without re-entering the Auth lock. */
export const functions = new FunctionsClient(
  new URL('functions/v1', `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/, '')}/`).href,
  { headers: { apikey: import.meta.env.VITE_SUPABASE_KEY }, customFetch: fetchFunction }
);
