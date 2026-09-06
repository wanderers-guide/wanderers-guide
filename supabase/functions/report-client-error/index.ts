import { serve } from 'std/server';
import { z } from 'https://esm.sh/zod@3.24.2';
import { connect, logEvent } from '../_shared/helpers.ts';

const reportSchema = z.object({
  code: z.enum(['content_load_failed', 'calculation_failed', 'save_failed', 'auth_failed',
    'update_failed', 'chunk_failed', 'unhandled_error', 'unhandled_rejection']),
  surface: z.enum(['sheet', 'builder', 'account', 'homebrew', 'campaign', 'other']),
  release: z.string().regex(/^(?:[a-f0-9]{7,40}|local)$/),
  trace_id: z.string().uuid(),
}).strict();
let windowStarted = Date.now();
let reportsInWindow = 0;

/** Public diagnostic intake: fixed categories only, bounded body/admission and log volume. */
serve(async (req: Request) => connect(req, async (_client, body) => {
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) return { status: 'fail', data: { message: 'Invalid diagnostic report' } };
  if (Date.now() - windowStarted >= 60_000) {
    windowStarted = Date.now();
    reportsInWindow = 0;
  }
  // Per-isolate backstop. No database writes or paid upstream services are involved.
  if (reportsInWindow++ < 60) logEvent('warn', 'report-client-error', 'browser_failure', parsed.data);
  return { status: 'success', data: true };
}, { bypassAuth: true, maxBodyBytes: 512 }));
