import { Session } from "@supabase/supabase-js";
import { atom } from "recoil";

const sessionState = atom({
  key: "supabase-session",
  default: null as Session | null,
});

export { sessionState };
