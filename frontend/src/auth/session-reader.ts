import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase-client';

const SESSION_READ_TIMEOUT_MS = 5000;
let pendingSession: Promise<Session | null> | undefined;
let sessionRevision = 0;

/** An Auth event supersedes any older read still waiting on storage or refresh. */
export function invalidateSessionRead(): void {
  sessionRevision += 1;
  pendingSession = undefined;
}

/** An unavailable Auth lock is unknown, never a confirmed signed-out session. */
export async function withinSessionBudget<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Session lookup timed out. Retry the request.')),
          SESSION_READ_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Share concurrent reads without caching an identity after the read has completed. */
export function readSession(): Promise<Session | null> {
  if (!pendingSession) {
    const revision = sessionRevision;
    const pending = withinSessionBudget(supabase.auth.getSession()).then(({ data, error }) => {
      if (revision !== sessionRevision) throw new Error('Current account changed while reading session.');
      if (error) throw error;
      return data.session;
    });
    const shared = pending.finally(() => {
      if (pendingSession === shared) pendingSession = undefined;
    });
    pendingSession = shared;
  }
  return pendingSession;
}
