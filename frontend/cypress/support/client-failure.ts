const FAILURE_CODES: ReadonlySet<string> = new Set([
  'content_load_failed',
  'calculation_failed',
  'save_failed',
  'auth_failed',
  'update_failed',
  'chunk_failed',
  'unhandled_error',
  'unhandled_rejection',
]);

/** Describe an unexpected diagnostic without exposing arbitrary request fields. */
export function describeClientFailure(body: unknown): string {
  if (!body || typeof body !== 'object' || Array.isArray(body) || !('code' in body)) return 'unknown';
  const code = body.code;
  return typeof code === 'string' && FAILURE_CODES.has(code) ? code : 'unknown';
}

/** Keep bounded, credential-redacted browser messages beside strict fixture failures. */
export function captureClientDiagnostics(win: Cypress.AUTWindow, messages: string[]): (value: unknown) => void {
  const record = (value: unknown): void => {
    let message: string = typeof value === 'string' ? value : typeof value;
    if (value && typeof value === 'object' && 'message' in value && typeof value.message === 'string') {
      message = value.message;
      if ('context' in value && value.context && typeof value.context === 'object' && 'message' in value.context)
        message += `: ${String(value.context.message)}`;
    }
    message = message
      .replace(/Bearer\s+\S+/gi, 'Bearer <redacted>')
      .replace(/[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}/g, '<redacted JWT>')
      .slice(0, 500);
    if (messages.at(-1) !== message) messages.push(message);
    if (messages.length > 12) messages.shift();
  };
  win.addEventListener('error', (event) => record(event.message));
  win.addEventListener('unhandledrejection', (event) => record(event.reason));
  const original = win.console.error;
  win.console.error = (...values: unknown[]): void => {
    values.forEach(record);
    original.apply(win.console, values);
  };
  const fetch = win.fetch.bind(win);
  win.fetch = async (...args: Parameters<typeof win.fetch>) => {
    try {
      return await fetch(...args);
    } catch (error) {
      const input = args[0];
      const url = new URL(
        typeof input === 'string' || input instanceof URL ? input.toString() : input.url,
        win.location.href
      );
      if (url.pathname.startsWith('/functions/v1/') || url.pathname === '/auth/v1/token') {
        record(`Fetch rejected for ${url.pathname.split('/').pop()}`);
        record(error);
      }
      throw error;
    }
  };
  return record;
}
