/** An intentional, safe HTTP failure handled by the shared request wrapper. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string,
    public headers: Record<string, string> = {}
  ) {
    super(message);
  }
}

/** PostgREST/Auth errors that require the client to obtain a new session. */
export function isAuthenticationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, status, message } = error as {
    code?: string;
    status?: number;
    message?: string;
  };
  return (
    status === 401 ||
    ['PGRST301', 'PGRST302', 'PGRST303', 'bad_jwt', 'session_not_found'].includes(code ?? '') ||
    /^(jwt expired|invalid jwt|invalid claim: missing sub claim)$/i.test(message ?? '')
  );
}

/** Read incrementally: Content-Length alone does not bound a chunked request. */
export async function readJsonBody(req: Request, maxBytes: number): Promise<unknown> {
  const declaredSize = Number(req.headers.get('content-length'));
  if (declaredSize > maxBytes) throw new HttpError(413, 'Request body is too large.', 'BODY_TOO_LARGE');
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, 'A JSON request body is required.', 'INVALID_JSON');
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new HttpError(408, 'Request body timed out.', 'BODY_TIMEOUT'));
      void reader.cancel().catch(() => undefined);
    }, 10_000);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new HttpError(413, 'Request body is too large.', 'BODY_TOO_LARGE');
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new HttpError(400, 'Request body must be valid JSON.', 'INVALID_JSON');
    }
  } finally {
    clearTimeout(timer);
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
