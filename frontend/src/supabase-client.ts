import { createClient } from '@supabase/supabase-js';

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
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);
