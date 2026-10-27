import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase-client';

const SESSION_READ_TIMEOUT_MS = 5000;
let pendingSession: Promise<Session | null> | undefined;
let sessionRevision = 0;
let currentActor: string | null | undefined;

/** Account supersession is an expected cancellation, not an authentication outage. */
export class SessionChangedError extends Error {
  constructor() {
    super('Current account changed while reading session.');
    this.name = 'SessionChangedError';
  }
}

/** An Auth event supersedes any older read still waiting on storage or refresh. */
export function invalidateSessionRead(actorId?: string | null): void {
  sessionRevision += 1;
  currentActor = actorId;
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
    const actorAtStart = currentActor;
    const pending = withinSessionBudget(supabase.auth.getSession()).then(({ data, error }) => {
      if (error) throw error;
      // INITIAL_SESSION can establish this very read's account before getSession resolves.
      // A different account, sign-out or unscoped reset still cancels the old identity.
      const establishedInitialActor =
        actorAtStart === undefined && typeof currentActor === 'string' && data.session?.user.id === currentActor;
      if (revision !== sessionRevision && !establishedInitialActor) throw new SessionChangedError();
      return data.session;
    });
    const shared = pending.finally(() => {
      if (pendingSession === shared) pendingSession = undefined;
    });
    pendingSession = shared;
  }
  return pendingSession;
}
