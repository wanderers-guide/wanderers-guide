type FailureCode =
  | 'content_load_failed'
  | 'calculation_failed'
  | 'save_failed'
  | 'auth_failed'
  | 'update_failed'
  | 'chunk_failed'
  | 'unhandled_error'
  | 'unhandled_rejection';
const reported = new Set<FailureCode>();

/** Send at most one report per failure category per page, without user data or raw errors. */
export function reportClientFailure(code: FailureCode): void {
  if (!import.meta.env.PROD || reported.has(code) || typeof window === 'undefined') return;
  reported.add(code);
  const firstSegment = window.location.pathname.split('/')[1];
  const surface = ['sheet', 'builder', 'account', 'homebrew', 'campaign'].includes(firstSegment)
    ? firstSegment
    : 'other';
  try {
    void fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/report-client-error`, {
      method: 'POST',
      keepalive: true,
      signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_KEY },
      body: JSON.stringify({ code, surface, release: __WG_RELEASE__, trace_id: crypto.randomUUID() }),
    }).catch(() => {
      /* Diagnostics must never interrupt editing or report their own failure. */
    });
  } catch {
    /* Older browsers may not support timeout signals or UUID generation. */
  }
}

/** Install bounded fallback reporting. Raw messages, stacks, URLs and payloads stay local. */
export function installClientErrorReporting(): void {
  window.addEventListener('error', () => reportClientFailure('unhandled_error'));
  window.addEventListener('unhandledrejection', () => reportClientFailure('unhandled_rejection'));
  window.addEventListener('vite:preloadError', () => reportClientFailure('chunk_failed'));
}
