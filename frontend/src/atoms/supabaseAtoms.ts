import { Session } from "@supabase/supabase-js";
import { atom } from "jotai";

const sessionState = atom(null as Session | null);

export { sessionState };
