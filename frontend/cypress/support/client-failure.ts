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
