import { Session } from '@supabase/supabase-js';
import { atom } from 'jotai';

// undefined means Auth is still initializing; null means confirmed signed out.
const sessionState = atom<Session | null | undefined>(undefined);

export { sessionState };
